# Missing Migrants — Interactive World Map

Every year, thousands of people die or disappear while migrating across borders — in
deserts, at sea, in detention, and along countless other routes. This project maps those
lives.

Using data from the International Organization for Migration's Missing Migrants Project,
the site plots reported incidents on an interactive world map. Each point represents a
documented event, colored by cause of death. Zoom in to break clusters into individual
incidents, filter the timeline by year or by cause of death, and explore per-region
stories — who was traveling, where they came from, where they were going, and what
happened.

Figures are minimum estimates; many deaths go unrecorded.

## Data source

The data in `data/Missing_Migrants_Global_Figures_allData.csv` is obtained from the
[Missing Migrants Project](https://missingmigrants.iom.int/) by the International
Organization for Migration (IOM). Figures are minimum estimates; many deaths go
unrecorded.

## Run

Open `site/index.html` in a browser (internet access is needed for the Leaflet library
and basemap tiles), or serve it locally:

```sh
python3 -m http.server -d site 8000
# → http://localhost:8000
```

See [`site/README.md`](site/README.md) for details on features and how the data file is
generated from the CSV.

## Deploy to GitHub Pages

Pushing to `main` runs `.github/workflows/deploy.yml`, which publishes the contents of
`site/` to GitHub Pages. In the repository settings, set **Pages → Source** to
**GitHub Actions** (one-time). The site will be served at
`https://<owner>.github.io/missing-migrants/`.

## View of the page

![Missing Migrants interactive world map: clustered incident markers by region, cause-of-death legend, and a side panel with per-year and per-region totals](docs/screenshot.png)
