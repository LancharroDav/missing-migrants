# AGENTS.md

Guidance for AI coding agents (and humans) working on this repository.

## Project summary

A static website that visualizes incidents from the IOM
[Missing Migrants Project](https://missingmigrants.iom.int/) on a zoomable world map
(Leaflet + Leaflet.markercluster). Incidents are clustered at their real locations,
colored by cause of death, filterable by year and cause, with a timeline animation
and a per-region sidebar.

There is no build step, no package manager, no test runner — the project is plain
HTML/CSS/JS served as static files.

## Repository layout

```
.
├── README.md                       # Top-level project description
├── AGENTS.md                       # This file
├── data/
│   └── Missing_Migrants_Global_Figures_allData.csv   # Source data (do not hand-edit)
├── docs/
│   └── screenshot.png              # Screenshot used in README.md
└── site/                           # The deployable static site
    ├── README.md                   # Site-level docs (features, regenerate data)
    ├── index.html                  # Map page
    ├── 404.html                    # GitHub Pages fallback
    ├── app.js                      # All client-side logic (IIFE, 'use strict')
    ├── data.js                     # Generated: aggregated data consumed by app.js as MM_DATA
    ├── style.css                   # All styles
    └── .nojekyll                   # Tells GitHub Pages to skip Jekyll processing
```

`.github/workflows/deploy.yml` deploys `site/` to GitHub Pages on push to `main`.

## Local development

Serve the `site/` folder over HTTP (Leaflet and the basemap tiles expect HTTP):

```sh
python3 -m http.server -d site 8000
# → http://localhost:8000
```

Opening `site/index.html` directly via `file://` may fail because of CORS for the
basemap tiles and `fetch()`/script loading. Always serve it.

## Build / lint / test

There is **no** build, lint, or test pipeline. Verification is manual:

- Serve the site locally (see above) and check the browser console for errors.
- Sanity-check the map: clusters form at low zoom, individual incidents appear at
  high zoom, year/cause filters and the timeline Play button work, region list is
  clickable, sidebar stats update.

If you add a new dependency, prefer a CDN-loaded script in `index.html` (with SRI
`integrity` + `crossorigin` like the existing Leaflet tags), rather than introducing
a package manager.

## Code conventions

- **No comments** in committed code unless the user explicitly asks for them.
  This applies to JS, CSS, and HTML. Existing comments exist from earlier work;
  do not propagate the pattern when adding new code.
- JavaScript: vanilla, single IIFE in `app.js` with `'use strict'`. No frameworks,
  no transpilation, no bundler. Match the existing style (arrow functions,
  `const`/`let`, 2-space indent).
- CSS: hand-written in `style.css`. No preprocessor. Follow existing class naming
  (kebab-case, BEM-ish).
- HTML: keep markup in `index.html`. External scripts/stylesheets go in `<head>`.
- Constants like `CAUSE_GROUPS` live at the top of `app.js` and use the global
  `MM_DATA` object exposed by `data.js`. Don't introduce a module system unless
  the user asks for one.

## Working with the data

- The authoritative source is `data/Missing_Migrants_Global_Figures_allData.csv`
  (~22k rows). Columns include region, year, cause of death, lat/lon, totals,
  demographics, country/route, etc.
- `site/data.js` is **generated** from the CSV. Don't hand-edit it. It exposes a
  global `MM_DATA` object with: `points` (array of tuples:
  `[lat, lon, totalDeadOrMissing, year, regionIndex, causeIndex, country, route, ...]`),
  `regions`, `causes`, `yearMin`, `yearMax`, and per-region aggregates used by the
  sidebar.
- To regenerate after a CSV change, run the aggregation script embedded in the
  project history (per `site/README.md`), or ask Claude to regenerate it. The
  script must compute: per-region totals, per-region per-year series, per-region
  cause breakdown, top routes/countries per region, and the flat `points` array.

## Adding a feature

1. State changes go in the `state` block near the top of `app.js`
   (`yearFrom`, `yearTo`, `causeGroup`, `selectedRegion`). Update the `matches()`
   predicate if your filter should affect what is shown on the map.
2. To re-render, follow the existing pattern: build the filtered set, call
   `clusterGroup.clearLayers()`, add new markers, update sidebar/stats. Don't
   re-create the Leaflet map.
3. Add any new UI in `index.html` inside the existing `.controls` toolbar or the
   sidebar; style additions go in `style.css`.

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which publishes
`site/` to GitHub Pages via the official `actions/deploy-pages` action. The
repo setting **Pages → Source** must be **GitHub Actions** (one-time setup).

## Do not

- Do not introduce `package.json`, `node_modules`, bundlers, or transpilers.
- Do not edit `site/data.js` by hand.
- Do not commit secrets, API keys, or tokens. The site is fully client-side and
  the CSV is public domain from IOM, so no secrets are needed.
- Do not add tests, CI lint jobs, or build steps unless the user asks.
