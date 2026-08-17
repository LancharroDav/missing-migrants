# Missing Migrants — Interactive Map

A static website (plain HTML/CSS/JS) visualizing data from the IOM
[Missing Migrants Project](https://missingmigrants.iom.int/)
(`../data/Missing_Migrants_Global_Figures_allData.csv`), grouped by world region on a
zoomable map (Leaflet).

## Run

Just open `index.html` in a browser (an internet connection is needed for the Leaflet
library and the basemap tiles), or serve the folder:

```sh
python3 -m http.server -d site 8000
# → http://localhost:8000
```

## Features

- **Zoom-tiered clustering**: all ~22,000 incidents are on the map at once, grouped into
  clusters positioned where the incidents actually occurred (Leaflet.markercluster).
  Cluster badges show the summed number of dead & missing, and clusters split apart as
  you zoom until each dot is a single incident with a detail popup (year, cause,
  location). Hovering a cluster shows its total, incident count, and dominant region.
- **Cause-of-death colors + filter**: dots are colored by cause group (drowning,
  violence, vehicle/transport, harsh environment, sickness, accidental, mixed/unknown).
  Filter by cause via the toolbar dropdown or by clicking the on-map legend.
- **Year filter**: restrict the map and statistics to a range of years (2014–2026).
- **Timeline animation**: the ▶ Play button steps through the years one by one,
  animating how incidents evolve over time.
- **Sidebar**: world overview with a ranked, clickable region list, plus per-region
  per-year chart, cause-of-death breakdown, top routes/countries, and recorded
  demographics. Clicking a region zooms the map to its bounds.

## Regenerating the data

`data.js` is generated from the CSV. If the CSV is updated, rerun the aggregation
script embedded in the project history, or ask Claude to regenerate it — it aggregates
per-region totals, yearly series, top causes/routes/countries, and per-incident points.
