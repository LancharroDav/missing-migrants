/* Missing Migrants — zoomable world map grouped by region */
(function () {
  'use strict';

  const D = MM_DATA;
  const fmt = n => n.toLocaleString('en-US');

  // ---------- state ----------
  let yearFrom = D.yearMin;
  let yearTo = D.yearMax;
  let selectedRegion = null; // index into D.regions, or null for world view

  // ---------- map ----------
  const map = L.map('map', { worldCopyJump: true, minZoom: 2 }).setView([22, 10], 2);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 18
  }).addTo(map);

  const bubbleLayer = L.layerGroup().addTo(map);
  const pointRenderer = L.canvas({ padding: 0.4 });
  const pointLayer = L.layerGroup().addTo(map);

  // ---------- helpers ----------
  function regionTotals(i) {
    const r = D.regions[i];
    let total = 0, incidents = 0;
    for (let y = yearFrom; y <= yearTo; y++) {
      const v = r.years[String(y)];
      if (v) { total += v[0]; incidents += v[1]; }
    }
    return { total, incidents };
  }

  function filteredPoints(regionIdx) {
    return D.points.filter(p =>
      p[4] === regionIdx && p[3] >= yearFrom && p[3] <= yearTo
    );
  }

  function causeBreakdown(points) {
    const acc = new Map();
    for (const p of points) acc.set(p[5], (acc.get(p[5]) || 0) + p[2]);
    return [...acc.entries()]
      .map(([ci, tot]) => [D.causes[ci], tot])
      .sort((a, b) => b[1] - a[1]);
  }

  // ---------- region bubbles (world view) ----------
  function drawBubbles() {
    bubbleLayer.clearLayers();
    const totals = D.regions.map((_, i) => regionTotals(i));
    const max = Math.max(1, ...totals.map(t => t.total));

    D.regions.forEach((r, i) => {
      const t = totals[i];
      if (!t.total || !r.bounds) return;
      const radius = 8 + 42 * Math.sqrt(t.total / max);

      const bubble = L.circleMarker(r.center, {
        radius,
        color: '#e2574c',
        weight: 1.5,
        fillColor: '#e2574c',
        fillOpacity: 0.35
      });
      bubble.bindTooltip(
        `<b>${r.name}</b><br>${fmt(t.total)} dead &amp; missing<br>${fmt(t.incidents)} incidents`,
        { className: 'region-tooltip', direction: 'top' }
      );
      bubble.on('click', () => selectRegion(i));
      bubbleLayer.addLayer(bubble);

      if (radius > 16) {
        bubbleLayer.addLayer(L.marker(r.center, {
          interactive: false,
          icon: L.divIcon({
            className: 'bubble-label',
            html: fmt(t.total),
            iconSize: [80, 14],
            iconAnchor: [40, 7]
          })
        }));
      }
    });
  }

  // ---------- incident points (region view) ----------
  function drawPoints(regionIdx) {
    pointLayer.clearLayers();
    for (const p of filteredPoints(regionIdx)) {
      const [lat, lng, tot, year, , causeIdx, loc] = p;
      const m = L.circleMarker([lat, lng], {
        renderer: pointRenderer,
        radius: Math.min(14, 2.5 + 1.6 * Math.sqrt(tot)),
        color: '#e2574c',
        weight: 0.8,
        opacity: 0.8,
        fillColor: '#e2574c',
        fillOpacity: 0.45
      });
      m.bindPopup(
        `<b>${fmt(tot)} dead &amp; missing</b> · ${year}<br>` +
        `${D.causes[causeIdx]}<br>` +
        `<span style="color:#9aa7b5">${loc || 'Location unspecified'}</span>`
      );
      pointLayer.addLayer(m);
    }
  }

  // ---------- side panel ----------
  const panel = document.getElementById('panel');

  function barRows(pairs, maxRows) {
    const shown = pairs.slice(0, maxRows);
    const max = Math.max(1, ...shown.map(p => p[1]));
    return shown.map(([label, val]) => `
      <div class="bar-row">
        <span class="lbl" title="${label}">${label}</span>
        <span class="bar-track"><span class="bar" style="width:${(100 * val / max).toFixed(1)}%"></span></span>
        <span class="val">${fmt(val)}</span>
      </div>`).join('');
  }

  function yearChart(yearsObj) {
    const years = [];
    for (let y = D.yearMin; y <= D.yearMax; y++) years.push(y);
    const vals = years.map(y => (yearsObj[String(y)] || [0])[0]);
    const max = Math.max(1, ...vals);
    const bars = years.map((y, i) => {
      const inRange = y >= yearFrom && y <= yearTo;
      return `<div class="ybar" style="height:${Math.max(2, 100 * vals[i] / max)}%;${inRange ? '' : 'opacity:0.25'}">
        <span class="tip">${y}: ${fmt(vals[i])}</span></div>`;
    }).join('');
    const labels = years.map(y => `<span>${String(y).slice(2)}</span>`).join('');
    return `<div class="year-chart">${bars}</div><div class="year-labels">${labels}</div>`;
  }

  function renderWorldPanel() {
    const rows = D.regions
      .map((r, i) => ({ i, name: r.name, ...regionTotals(i) }))
      .filter(r => r.total > 0)
      .sort((a, b) => b.total - a.total);

    const worldYears = {};
    for (let y = D.yearMin; y <= D.yearMax; y++) {
      let tot = 0;
      for (const r of D.regions) { const v = r.years[String(y)]; if (v) tot += v[0]; }
      worldYears[String(y)] = [tot];
    }

    panel.innerHTML = `
      <h2>World overview</h2>
      <p class="panel-sub">${yearFrom === yearTo ? yearFrom : yearFrom + '–' + yearTo} · click a region to explore</p>
      <h3>Dead &amp; missing per year</h3>
      ${yearChart(worldYears)}
      <h3>Regions</h3>
      ${rows.map(r => `
        <div class="region-list-item" data-region="${r.i}">
          <span>${r.name}</span><span class="n">${fmt(r.total)}</span>
        </div>`).join('')}
    `;
    panel.querySelectorAll('.region-list-item').forEach(el =>
      el.addEventListener('click', () => selectRegion(Number(el.dataset.region))));
  }

  function renderRegionPanel(i) {
    const r = D.regions[i];
    const t = regionTotals(i);
    const pts = filteredPoints(i);
    const causes = causeBreakdown(pts);
    const allYears = yearFrom === D.yearMin && yearTo === D.yearMax;

    panel.innerHTML = `
      <h2>${r.name}</h2>
      <p class="panel-sub">${yearFrom === yearTo ? yearFrom : yearFrom + '–' + yearTo}</p>
      <div class="stat-grid">
        <div class="cell big"><b>${fmt(t.total)}</b><span>Dead &amp; missing</span></div>
        <div class="cell"><b>${fmt(t.incidents)}</b><span>Incidents</span></div>
      </div>
      <h3>Dead &amp; missing per year</h3>
      ${yearChart(r.years)}
      <h3>Cause of death${causes.length ? '' : ' — no data'}</h3>
      ${barRows(causes, 6)}
      ${r.routes.length ? `<h3>Top migration routes (all years)</h3>${barRows(r.routes, 5)}` : ''}
      ${r.countries.length ? `<h3>Countries of incident (all years)</h3>${barRows(r.countries, 5)}` : ''}
      <h3>Recorded demographics (all years)</h3>
      <div class="stat-grid">
        <div class="cell"><b>${fmt(r.dead)}</b><span>Confirmed dead</span></div>
        <div class="cell"><b>${fmt(r.missing)}</b><span>Missing</span></div>
        <div class="cell"><b>${fmt(r.survivors)}</b><span>Survivors</span></div>
        <div class="cell"><b>${fmt(r.children)}</b><span>Children</span></div>
        <div class="cell"><b>${fmt(r.females)}</b><span>Females</span></div>
        <div class="cell"><b>${fmt(r.males)}</b><span>Males</span></div>
      </div>
      ${allYears ? '' : '<p class="panel-sub">Sections marked “all years” ignore the year filter.</p>'}
    `;
  }

  // ---------- global header stats ----------
  function renderGlobalStats() {
    let total = 0, incidents = 0;
    D.regions.forEach((_, i) => { const t = regionTotals(i); total += t.total; incidents += t.incidents; });
    document.getElementById('global-stats').innerHTML = `
      <div class="stat"><b>${fmt(total)}</b><span>Dead &amp; missing</span></div>
      <div class="stat"><b>${fmt(incidents)}</b><span>Incidents</span></div>
      <div class="stat"><b>${fmt(D.regions.filter((_, i) => regionTotals(i).total > 0).length)}</b><span>Regions</span></div>
    `;
  }

  // ---------- navigation ----------
  const resetBtn = document.getElementById('reset-view');
  const hint = document.getElementById('hint');

  function selectRegion(i) {
    selectedRegion = i;
    const r = D.regions[i];
    if (r.bounds) map.flyToBounds(r.bounds, { padding: [30, 30], maxZoom: 7, duration: 0.8 });
    drawPoints(i);
    renderRegionPanel(i);
    resetBtn.hidden = false;
    hint.textContent = 'Each dot is one incident — click for details';
  }

  function resetView() {
    selectedRegion = null;
    pointLayer.clearLayers();
    map.flyTo([22, 10], 2, { duration: 0.8 });
    renderWorldPanel();
    resetBtn.hidden = true;
    hint.textContent = 'Click a region bubble to zoom in and see individual incidents';
  }
  resetBtn.addEventListener('click', resetView);

  // ---------- year filter ----------
  const fromSel = document.getElementById('year-from');
  const toSel = document.getElementById('year-to');
  for (let y = D.yearMin; y <= D.yearMax; y++) {
    fromSel.add(new Option(y, y));
    toSel.add(new Option(y, y));
  }
  fromSel.value = yearFrom;
  toSel.value = yearTo;

  function onYearChange() {
    yearFrom = Number(fromSel.value);
    yearTo = Number(toSel.value);
    if (yearFrom > yearTo) { // keep the range valid
      [yearFrom, yearTo] = [yearTo, yearFrom];
      fromSel.value = yearFrom;
      toSel.value = yearTo;
    }
    renderGlobalStats();
    drawBubbles();
    if (selectedRegion !== null) {
      drawPoints(selectedRegion);
      renderRegionPanel(selectedRegion);
    } else {
      renderWorldPanel();
    }
  }
  fromSel.addEventListener('change', onYearChange);
  toSel.addEventListener('change', onYearChange);

  // ---------- init ----------
  renderGlobalStats();
  drawBubbles();
  renderWorldPanel();
})();
