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

## Walkthrough

The screen has four areas: the **query control** on the left, the **map** in the
middle, the **detail rail** on the right, and the **timeline** underneath. Both
rails collapse to a labelled strip if you want the map wider, and on a narrow
window they open over the map instead of beside it.

### Choosing what to look at

The query control is ordered the way you narrow down, and every control shows
the count behind it so you always know the size of what you are looking at.

- **Map sector** picks one of the three maps. Dates and matches reset with it,
  since they mean nothing on a different map.
- **Date** limits to one of the five days, or all of them.
- **Match** opens a searchable picker. Match ids are opaque UUIDs, so each row
  shows when the match ran, how long it lasted, and how many humans, bots and
  kills it held. Search by time or by id.
- **Player class** toggles humans and bots independently. At least one stays on.
- **Event signals** toggles kills, deaths, loot and storm deaths individually.

Leaving map, date and match unfiltered draws every journey on the map at once,
which is the view to use for map-wide questions. Narrowing to a single match is
what unlocks playback.

### Reading the map

Journeys are drawn as paths, with **humans in solid cyan** and **bots in dashed
amber** beneath them. The two differ in colour, weight and line style, so they
stay distinguishable where routes pile up or for a colour blind reader. Stroke
weight adapts to how much is on screen: a single match draws boldly, a whole
map's worth draws faintly so the routes do not merge into one mass.

Events use a different shape as well as a different colour, so they survive
overlapping:

| Event | Marker |
| --- | --- |
| Kill | Red four-pointed burst |
| Death | White diagonal cross |
| Loot | Purple diamond |
| Storm death | Yellow triangle |

Where a trail breaks, position recording dropped out for more than 30 seconds.
The gap is deliberate: the player's real route through it is unknown.

- **Pan** by dragging, **zoom** with the wheel or a trackpad pinch. Zoom holds
  the point under the cursor, and a two-finger sideways swipe pans.
- **Reset view** returns to fit-to-screen.
- **Hover** an event for a tooltip naming the type, the player and the time.
- **Click** a trail or an event to select that journey. Everything else fades
  back, and the detail rail fills with that player's numbers. Clicking a kill
  marker selects the player who made it. Click empty ground or press `Esc` to
  clear.

### Watching a match unfold

Select a single match and the timeline becomes active. The track is marked with
every event in that match, coloured by type, so bursts of combat and looting are
visible before you scrub to them. If you see a cluster at 4:20, jump there.

Play, pause, and scrub with the handle. Speed runs from 0.5x to 8x. During
playback, trails grow from their start, event markers appear as they happen, a
dot rides the head of every journey to show where each player is right now, and
the heatmap builds from only what has happened so far, so nothing on screen is
ever ahead of anything else.

### Heatmaps

Four modes, one at a time, because two overlaid density fields sum into a colour
that means nothing:

- **Off**
- **Kills** shows where players take kills from, for reading sightlines
- **Deaths** shows where players go down, storm deaths included
- **Traffic** shows where players spend their time

The field follows every filter you have set, so a kill map for one day, one
match, or humans only is just a matter of narrowing first. **Intensity** pulls
quieter areas up out of the floor, and **trails can be hidden** to read a
density field on its own. The key under the control shows the ramp, which is one
hue rising in lightness so it reads as a quantity rather than as categories.

### The detail rail

With a journey selected it shows distance travelled, time on the map, pace,
kills, loot and outcome. Below that sits a summary of the match itself, and a
**survival curve** showing how many players were still alive over time, drawn as
a step because the count holds flat and then drops the instant someone dies. The
playhead is drawn over the curve, so during playback you can see where you are
against the match emptying out. The legend sits at the bottom of the rail.

### Keyboard

| Key | Does |
| --- | --- |
| `Space` | Play or pause. At the end, replays from the start |
| `Left` / `Right` | Step 5 seconds |
| `Esc` | Clear the selected journey |

### A two minute tour

1. Open the live URL. Ambrose Valley loads with every journey drawn.
2. Set the heatmap to **Traffic**. Most of the map is dark. That is finding 1 in
   [INSIGHTS.md](INSIGHTS.md).
3. Turn **bots off**. Watch the hotspots move. That is finding 3.
4. Switch the heatmap to **Kills** and turn loot markers on. The kills sit on
   the loot. That is finding 2.
5. Pick any single match, press **Space**, and watch it play out with the
   survival curve tracking alongside.

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
