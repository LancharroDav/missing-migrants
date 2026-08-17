/* Missing Migrants — zoomable world map with incident clustering */
(function () {
  'use strict';

  const D = MM_DATA;
  const fmt = n => n.toLocaleString('en-US');
  const fmtShort = n => n >= 10000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : fmt(n);

  // ---------- cause groups ----------
  // Raw causes are comma-joined combinations; classify by dominant keyword, in priority order.
  const CAUSE_GROUPS = [
    { id: 'drowning',    label: 'Drowning',                 color: '#4dabf7', match: 'Drowning' },
    { id: 'violence',    label: 'Violence',                 color: '#e64980', match: 'Violence' },
    { id: 'vehicle',     label: 'Vehicle / transport',      color: '#f59f00', match: 'Vehicle accident' },
    { id: 'environment', label: 'Harsh environment',        color: '#94d82d', match: 'Harsh environmental' },
    { id: 'sickness',    label: 'Sickness / healthcare',    color: '#b197fc', match: 'Sickness' },
    { id: 'accident',    label: 'Accidental death',         color: '#ffd43b', match: 'Accidental' },
    { id: 'unknown',     label: 'Mixed or unknown',         color: '#868e96', match: '' },
  ];
  const groupOf = D.causes.map(raw => {
    const i = CAUSE_GROUPS.findIndex(g => g.match && raw.includes(g.match));
    return i === -1 ? CAUSE_GROUPS.length - 1 : i;
  });
  const groupOfPoint = p => groupOf[p[5]];

  // ---------- state ----------
  let yearFrom = D.yearMin;
  let yearTo = D.yearMax;
  let causeGroup = -1; // -1 = all
  let selectedRegion = null;

  const matches = p =>
    p[3] >= yearFrom && p[3] <= yearTo &&
    (causeGroup === -1 || groupOfPoint(p) === causeGroup);

  const regionPoints = i => D.points.filter(p => p[4] === i && matches(p));

  // ---------- map ----------
  const map = L.map('map', { worldCopyJump: true, minZoom: 2 }).setView([22, 10], 2);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 18
  }).addTo(map);

  const clusterGroup = L.markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 60,
    disableClusteringAtZoom: 11,
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    iconCreateFunction(cluster) {
      let sum = 0;
      for (const m of cluster.getAllChildMarkers()) sum += m.options.mm.tot;
      cluster.mmSum = sum;
      const size = sum >= 5000 ? 58 : sum >= 500 ? 46 : sum >= 50 ? 38 : 30;
      const bucket = sum >= 5000 ? 'xl' : sum >= 500 ? 'lg' : sum >= 50 ? 'md' : 'sm';
      return L.divIcon({
        html: `<span>${fmtShort(sum)}</span>`,
        className: `mm-cluster mm-cluster-${bucket}`,
        iconSize: [size, size]
      });
    }
  }).addTo(map);

  clusterGroup.on('clustermouseover', e => {
    const cluster = e.propagatedFrom || e.layer;
    const children = cluster.getAllChildMarkers();
    const perRegion = new Map();
    for (const m of children) {
      const r = m.options.mm.region;
      perRegion.set(r, (perRegion.get(r) || 0) + m.options.mm.tot);
    }
    const top = [...perRegion.entries()].sort((a, b) => b[1] - a[1])[0];
    cluster.bindTooltip(
      `<b>${fmt(cluster.mmSum || 0)} dead &amp; missing</b><br>` +
      `${fmt(children.length)} incidents<br>` +
      `Mostly ${D.regions[top[0]].name}`,
      { className: 'region-tooltip', direction: 'top' }
    ).openTooltip();
  });

  // Create every incident marker once; filters just choose which are on the map.
  const allMarkers = D.points.map(p => {
    const [lat, lng, tot, year, regionIdx, causeIdx, loc] = p;
    const g = CAUSE_GROUPS[groupOf[causeIdx]];
    const size = Math.round(Math.min(18, 8 + 2 * Math.sqrt(tot)));
    const m = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'mm-dot',
        html: `<span style="background:${g.color};width:${size}px;height:${size}px"></span>`,
        iconSize: [size, size]
      }),
      mm: { tot, year, region: regionIdx, group: groupOf[causeIdx], point: p }
    });
    m.bindPopup(
      `<b>${fmt(tot)} dead &amp; missing</b> · ${year}<br>` +
      `<span style="color:${g.color}">●</span> ${D.causes[causeIdx]}<br>` +
      `<span style="color:#9aa7b5">${loc || 'Location unspecified'}</span>`
    );
    return m;
  });

  function rebuildMap() {
    clusterGroup.clearLayers();
    clusterGroup.addLayers(allMarkers.filter(m => {
      const mm = m.options.mm;
      return mm.year >= yearFrom && mm.year <= yearTo &&
        (causeGroup === -1 || mm.group === causeGroup);
    }));
  }

  // ---------- side panel ----------
  const panel = document.getElementById('panel');

  function barRows(rows, maxRows) { // rows: [label, value, color?]
    const shown = rows.slice(0, maxRows);
    const max = Math.max(1, ...shown.map(r => r[1]));
    return shown.map(([label, val, color]) => `
      <div class="bar-row">
        <span class="lbl" title="${label}">${label}</span>
        <span class="bar-track"><span class="bar" style="width:${(100 * val / max).toFixed(1)}%${color ? ';background:' + color : ''}"></span></span>
        <span class="val">${fmt(val)}</span>
      </div>`).join('');
  }

  // Per-year totals from points, honoring the cause filter (not the year filter).
  function yearSeries(regionIdx) {
    const vals = {};
    for (const p of D.points) {
      if (regionIdx !== null && p[4] !== regionIdx) continue;
      if (causeGroup !== -1 && groupOfPoint(p) !== causeGroup) continue;
      vals[p[3]] = (vals[p[3]] || 0) + p[2];
    }
    return vals;
  }

  function yearChart(vals) {
    const years = [];
    for (let y = D.yearMin; y <= D.yearMax; y++) years.push(y);
    const max = Math.max(1, ...years.map(y => vals[y] || 0));
    const bars = years.map(y => {
      const v = vals[y] || 0;
      const inRange = y >= yearFrom && y <= yearTo;
      return `<div class="ybar" style="height:${Math.max(2, 100 * v / max)}%;${inRange ? '' : 'opacity:0.25'}">
        <span class="tip">${y}: ${fmt(v)}</span></div>`;
    }).join('');
    const labels = years.map(y => `<span>${String(y).slice(2)}</span>`).join('');
    return `<div class="year-chart">${bars}</div><div class="year-labels">${labels}</div>`;
  }

  function causeRows(points) {
    const acc = new Map();
    for (const p of points) {
      const g = groupOfPoint(p);
      acc.set(g, (acc.get(g) || 0) + p[2]);
    }
    return [...acc.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([g, tot]) => [CAUSE_GROUPS[g].label, tot, CAUSE_GROUPS[g].color]);
  }

  function filterLabel() {
    const years = yearFrom === yearTo ? String(yearFrom) : `${yearFrom}–${yearTo}`;
    return causeGroup === -1 ? years : `${years} · ${CAUSE_GROUPS[causeGroup].label}`;
  }

  function renderWorldPanel() {
    const rows = D.regions
      .map((r, i) => {
        const pts = regionPoints(i);
        return { i, name: r.name, total: pts.reduce((s, p) => s + p[2], 0) };
      })
      .filter(r => r.total > 0)
      .sort((a, b) => b.total - a.total);

    panel.innerHTML = `
      <h2>World overview</h2>
      <p class="panel-sub">${filterLabel()} · click a region to explore</p>
      <h3>Dead &amp; missing per year</h3>
      ${yearChart(yearSeries(null))}
      <h3>Cause of death</h3>
      ${barRows(causeRows(D.points.filter(matches)), 7)}
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
    const pts = regionPoints(i);
    const total = pts.reduce((s, p) => s + p[2], 0);
    const noFilter = yearFrom === D.yearMin && yearTo === D.yearMax && causeGroup === -1;

    panel.innerHTML = `
      <h2>${r.name}</h2>
      <p class="panel-sub">${filterLabel()}</p>
      <div class="stat-grid">
        <div class="cell big"><b>${fmt(total)}</b><span>Dead &amp; missing</span></div>
        <div class="cell"><b>${fmt(pts.length)}</b><span>Incidents</span></div>
      </div>
      <h3>Dead &amp; missing per year</h3>
      ${yearChart(yearSeries(i))}
      <h3>Cause of death${pts.length ? '' : ' — no data'}</h3>
      ${barRows(causeRows(pts), 7)}
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
      ${noFilter ? '' : '<p class="panel-sub">Sections marked “all years” ignore the filters.</p>'}
    `;
  }

  // ---------- global header stats ----------
  function renderGlobalStats() {
    let total = 0, incidents = 0;
    const regions = new Set();
    for (const p of D.points) {
      if (!matches(p)) continue;
      total += p[2]; incidents++; regions.add(p[4]);
    }
    document.getElementById('global-stats').innerHTML = `
      <div class="stat"><b>${fmt(total)}</b><span>Dead &amp; missing</span></div>
      <div class="stat"><b>${fmt(incidents)}</b><span>Incidents</span></div>
      <div class="stat"><b>${fmt(regions.size)}</b><span>Regions</span></div>
    `;
  }

  // ---------- navigation ----------
  const resetBtn = document.getElementById('reset-view');

  function selectRegion(i) {
    selectedRegion = i;
    const r = D.regions[i];
    if (r.bounds) map.flyToBounds(r.bounds, { padding: [30, 30], maxZoom: 7, duration: 0.8 });
    renderRegionPanel(i);
    resetBtn.hidden = false;
  }

  function resetView() {
    selectedRegion = null;
    map.flyTo([22, 10], 2, { duration: 0.8 });
    renderWorldPanel();
    resetBtn.hidden = true;
  }
  resetBtn.addEventListener('click', resetView);

  // ---------- refresh on filter change ----------
  function refresh() {
    renderGlobalStats();
    rebuildMap();
    if (selectedRegion !== null) renderRegionPanel(selectedRegion);
    else renderWorldPanel();
  }

  // ---------- year filter ----------
  const fromSel = document.getElementById('year-from');
  const toSel = document.getElementById('year-to');
  for (let y = D.yearMin; y <= D.yearMax; y++) {
    fromSel.add(new Option(y, y));
    toSel.add(new Option(y, y));
  }
  fromSel.value = yearFrom;
  toSel.value = yearTo;

  function onYearChange(fromUser) {
    if (fromUser) stopTimeline();
    yearFrom = Number(fromSel.value);
    yearTo = Number(toSel.value);
    if (yearFrom > yearTo) {
      [yearFrom, yearTo] = [yearTo, yearFrom];
      fromSel.value = yearFrom;
      toSel.value = yearTo;
    }
    refresh();
  }
  fromSel.addEventListener('change', () => onYearChange(true));
  toSel.addEventListener('change', () => onYearChange(true));

  // ---------- cause filter + legend ----------
  const causeSel = document.getElementById('cause-filter');
  causeSel.add(new Option('All causes', -1));
  CAUSE_GROUPS.forEach((g, i) => causeSel.add(new Option(g.label, i)));
  causeSel.value = causeGroup;
  causeSel.addEventListener('change', () => {
    stopTimeline();
    causeGroup = Number(causeSel.value);
    renderLegend();
    refresh();
  });

  const legend = document.getElementById('legend');
  function renderLegend() {
    legend.innerHTML = '<h4>Cause of death</h4>' + CAUSE_GROUPS.map((g, i) => `
      <div class="legend-row${causeGroup === i ? ' active' : ''}" data-group="${i}">
        <span class="swatch" style="background:${g.color}"></span>${g.label}
      </div>`).join('');
    legend.querySelectorAll('.legend-row').forEach(el =>
      el.addEventListener('click', () => {
        const g = Number(el.dataset.group);
        causeGroup = causeGroup === g ? -1 : g; // click again to clear
        causeSel.value = causeGroup;
        stopTimeline();
        renderLegend();
        refresh();
      }));
  }

  // ---------- timeline animation ----------
  const playBtn = document.getElementById('play-timeline');
  const yearLabel = document.getElementById('timeline-year');
  let timer = null;
  let savedRange = null;

  function stopTimeline() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
    playBtn.textContent = '▶ Play';
    yearLabel.hidden = true;
    if (savedRange) {
      [yearFrom, yearTo] = savedRange;
      savedRange = null;
      fromSel.value = yearFrom;
      toSel.value = yearTo;
      refresh();
    }
  }

  playBtn.addEventListener('click', () => {
    if (timer) { stopTimeline(); return; }
    savedRange = [yearFrom, yearTo];
    playBtn.textContent = '⏸ Pause';
    yearLabel.hidden = false;
    let y = D.yearMin;
    const step = () => {
      yearFrom = yearTo = y;
      fromSel.value = y;
      toSel.value = y;
      yearLabel.textContent = y;
      refresh();
      if (y >= D.yearMax) { stopTimeline(); return; }
      y++;
    };
    step();
    timer = setInterval(step, 1200);
  });

  // ---------- init ----------
  renderLegend();
  renderGlobalStats();
  rebuildMap();
  renderWorldPanel();
})();
