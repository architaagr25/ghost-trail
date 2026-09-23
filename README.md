# Ghost Trail

A player journey visualization tool for LILA BLACK telemetry. It plots movement
paths, combat and loot events, and density overlays on the in-game minimaps, and
plays a match back over its own clock.

**Live: https://ghost-trail-kappa.vercel.app/**

Built for Level Designers rather than analysts: every control is a question
about the map ("where do fights start", "which corner does nobody visit"), and
the numbers on screen always describe exactly what the map is showing.

## What is in the data

Five days of production matches across the game's three maps, February 9 to 14, 2026.

| Map | Matches | Journeys | Events | Position samples |
| --- | ---: | ---: | ---: | ---: |
| Ambrose Valley | 566 | 836 | 12,259 | 48,754 |
| Grand Rift | 59 | 111 | 1,125 | 5,728 |
| Lockdown | 171 | 295 | 2,661 | 18,577 |
| **Total** | **796** | **1,242** | **16,045** | **73,059** |

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Build | Vite 8 + TypeScript 6 | Fast dev server, and a static `dist/` that hosts anywhere |
| UI | React 19 | Panels are ordinary component state; the map is not |
| Canvas | PixiJS 8 (WebGL) | 73k trail points at 60fps while panning. DOM and SVG both fall over well before that |
| State | Zustand | Filters are read by four panels and the canvas; prop drilling would thread them through every layer |
| Styling | Tailwind CSS 4 | Theme tokens in one file, no stylesheet to keep in sync |
| Components | Radix UI | Accessible select, slider, popover and toggle primitives, unstyled |
| Icons | Lucide | |
| Pipeline | Python 3 + pandas + pyarrow + Pillow | Parquet reading and image resizing, run once offline |
| Hosting | Vercel | Static hosting with edge caching, free tier, deploys from a push |

Reasoning in more depth, plus the tradeoffs considered, is in
[ARCHITECTURE.md](ARCHITECTURE.md).

## Environment variables

**None.** The tool has no backend, no API keys and no runtime configuration. All
telemetry is served as static JSON from `public/data/`, so a clone builds and
runs with nothing else set up.

## Running it

Prerequisites: **Node 20 or newer** (built on 22.21) and npm.

```bash
git clone https://github.com/architaagr25/ghost-trail.git
cd ghost-trail
npm install
npm run dev
```

Open the URL Vite prints, usually http://localhost:5173.

The processed data is committed under `public/`, so this is all that is needed.
You do not have to run the pipeline to use the tool.

### Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the built output locally |
| `npm run lint` | oxlint over the source |

## Regenerating the data

Only needed if you want to rebuild from the raw parquet, for example to point
the tool at a newer telemetry drop.

Prerequisites: **Python 3.10 or newer** (built on 3.14).

```bash
# Unzip player_data.zip so the dated folders sit under data_raw/player_data/
pip install -r pipeline/requirements.txt
python pipeline/build.py --raw data_raw/player_data
```

This writes `public/data/index.json` plus one file per map, and converts the
source minimaps into web-sized WebP under `public/maps/`.

`data_raw/` is gitignored, so the raw telemetry stays out of the repo and only
the processed output is committed.

## Layout

```
pipeline/          Offline parquet to JSON build
  maps.py          Per-map world-to-minimap constants
  load.py          Parquet reading, event categories, bot detection
  build.py         Payload assembly and minimap conversion
public/
  data/            Generated per-map telemetry
  maps/            Generated minimap images
src/
  lib/             Loading, validation, filtering, statistics
  map/             Projection, viewport, and the Pixi canvas layers
  panels/          Filters, timeline, detail, legend, survival curve
  state/           Zustand store, playback loop, keyboard shortcuts
  ui/              Shared primitives and status screens
```

## Deployment

Vercel builds from `main` on every push. Configuration lives in
[vercel.json](vercel.json): framework preset, build command, and cache headers
for `/data` and `/maps` so the largest payload is served from the edge rather
than rebuilt on each request.

To deploy a fork: import the repo at [vercel.com/new](https://vercel.com/new),
accept the detected settings, and deploy. No environment variables to set.
