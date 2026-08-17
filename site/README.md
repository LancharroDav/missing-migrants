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

- **World view**: one bubble per region of incident, sized by total dead & missing.
- **Region view**: click a bubble (or a region in the sidebar) to zoom in and see every
  recorded incident as an individual dot with a detail popup (year, cause, location).
- **Year filter**: restrict the map and statistics to a range of years (2014–2026).
- **Sidebar**: per-year chart, cause-of-death breakdown, top routes/countries, and
  recorded demographics for the selected region.

## Regenerating the data

`data.js` is generated from the CSV. If the CSV is updated, rerun the aggregation
script embedded in the project history, or ask Claude to regenerate it — it aggregates
per-region totals, yearly series, top causes/routes/countries, and per-incident points.
