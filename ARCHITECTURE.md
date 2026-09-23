# Architecture

## What it is built with, and why

**Offline Python pipeline, static React frontend, no server.**

The whole dataset is 89,104 rows. That is small enough to process once and ship
as static files, which removes the entire backend: no API, no database, no
query latency, no deploy story beyond uploading a folder. A Level Designer opens
a URL and the tool works.

| Layer | Choice | Reason |
| --- | --- | --- |
| Pipeline | Python, pandas, pyarrow, Pillow | Parquet is a Python-first format, and this runs once offline |
| Frontend | React 19 + TypeScript + Vite | Panels are ordinary component state, and the build is a static folder |
| Canvas | PixiJS 8 (WebGL) | 73,059 trail points redrawn on every pan, zoom and playback frame |
| State | Zustand | One selection read by four panels and the canvas |
| Hosting | Vercel | Static, free, edge-cached, deploys on push |

The canvas choice is the one that mattered. SVG or DOM nodes would mean one
element per trail point, and 73k nodes stall on the first pan. Pixi draws all
human trails from a single `Graphics` object and all bot trails from another,
so a full map redraw is a handful of draw calls rather than thousands.

## Data flow

```
data_raw/player_data/<date>/*.nakama-0     one parquet file per player per match
        |
        |  load.py      decode bytes, fix timestamps, categorise events,
        |               detect bots, strip server suffix from match ids
        v
   one pandas frame (89,104 rows)
        |
        |  build.py     group by match then player, emit columnar t/x/z arrays,
        |               find recording gaps, round coordinates, resize minimaps
        v
public/data/index.json          map list, dates, counts
public/data/<Map>.json          matches, players, events for one map
public/maps/<Map>.webp          2048px minimap
        |
        |  fetch, cached per map      lib/data.ts
        |  validate before rendering  lib/validate.ts
        v
   filters applied in one pass        lib/filters.ts
        |
        +--> Pixi layers: heatmap under trails under event markers
        +--> panels: timeline, detail, survival curve, legend
```

Filtering happens once, in `selectData`, and the same result feeds both the
canvas and the numbers beside it. They cannot disagree about what is on screen.

Each map is fetched whole rather than per match. The largest is 1.7 MB of JSON,
391 KB over the wire with Brotli, which buys instant match switching and lets a
heatmap aggregate across every match on the map.

## Mapping game coordinates onto the minimap

The dataset gives each map a `scale` and an origin that together bound the
playable area. World `x` and `z` normalise against them into a 0 to 1 square,
and `y` is discarded because it is elevation and means nothing top down.

```
u = (x - origin_x) / scale
v = (z - origin_z) / scale

pixel_x =      u  * size
pixel_y = (1 - v) * size     V is flipped: image Y grows down, world Z grows north
```

**Worked example**, Ambrose Valley, scale 900, origin (-370, -473), the sample
row from the dataset README:

```
world (x, z)  = (-301.45, -355.55)

u = (-301.45 + 370) / 900 =  68.55 / 900 = 0.0762
v = (-355.55 + 473) / 900 = 117.45 / 900 = 0.1305

pixel_x =      0.0762  * 1024 =  78
pixel_y = (1 - 0.1305) * 1024 = 890
```

That reproduces the README's expected answer of `(78, 890)` exactly.

**The size is not hardcoded.** `MAP_SIZE` is a fixed logical square of 1024
units that every layer draws into, and the viewport scales that square to fit
the window. The minimap image is stretched to the same square whatever its own
resolution, so the numbers above are literally the coordinates the app plots at.
Trails, markers, heatmap and hit testing all work in those units, which makes
pan and zoom a single transform on one container rather than a recalculation of
every point.

**Verified three ways**, because a coordinate bug looks plausible until it does
not:

1. **Bounds.** All 89,104 points on all three maps land inside the unit square,
   100.00% on each. A wrong origin or a swapped axis puts thousands outside it.
2. **Numeric.** The worked example above reproduces the documented pixel exactly.
3. **Visual.** Plotted trails follow roads, cluster on buildings and compounds,
   and stop at coastlines. None float in the sea.

## Assumptions

Four places where the dataset README and the actual data disagree. In each case
the data won.

**Timestamps are epoch seconds, not milliseconds into the match.** The `ts`
column is typed as millisecond datetimes and documented as match-relative
elapsed time. Read that way, every row lands in January 1970 and matches
compress to under a second. Read as epoch seconds, they resolve to February 2026
which matches the folder names, and give match lengths of 13 to 890 seconds with
position samples every 5 seconds. That is what a match should look like, so the
pipeline reads them as seconds and stores each event as an offset from its
match's start.

**Bots are identified by user id, not by event name.** The README says bots
generate `BotPosition`, `BotKill` and `BotKilled`. The data disagrees: 2,232
`BotKill` and 403 `BotKilled` rows belong to human UUIDs, and 636 `Position`
plus 115 `Loot` rows belong to numeric bot ids. The `Bot` prefix describes who
was on the *other* end of the event, not who recorded it. The reliable signal is
the id itself, so a `user_id` containing a hyphen is a human UUID and anything
else is a bot.

**Minimaps are not 1024 by 1024.** The README states they are. They are 4320,
2160 by 2158, and 9000 square. Because the projection works in UV the arithmetic
is unaffected, but all three are resampled to a uniform 2048px WebP so the
browser is not decoding a 9000px JPEG. Grand Rift is two pixels off square and
is squashed to fit, a 0.09% distortion that is invisible at any usable zoom.

**Matches are dated by when they started, not by their folder.** A handful run
across midnight and would otherwise be filed under the wrong day, which would
quietly corrupt the date filter.

One judgement call, where nothing was wrong, only unstated: **position gaps**.
Samples normally arrive every 5 seconds, but some journeys drop out for minutes
at a time. Joining across one draws a straight line through terrain the player
may never have crossed, so trails are cut at any gap over 30 seconds. Ordinary
jitter reaches 25 seconds at the 99th percentile, so the threshold only catches
real dropouts. Distance statistics skip those gaps for the same reason.

## Tradeoffs

| Decision | Alternative | Why this way |
| --- | --- | --- |
| Precompute to static JSON | Query parquet in browser via DuckDB WASM | 89k rows does not need a query engine. Static files add nothing to load and nothing to host |
| One file per map, fetched whole | One file per match | 1.7 MB worst case, 391 KB compressed. Buys instant match switching and cross-match heatmaps, which per-match files make impossible |
| Columnar `t`/`x`/`z` arrays | Array of point objects | Roughly halves the JSON and drops straight into the render loop |
| WebGL canvas | SVG or DOM | 73k points. SVG stalls on the first pan |
| Trails weighted by count and zoom | One fixed stroke weight | One weight cannot serve 20 trails and 836. Faint enough for a whole map leaves a single match invisible |
| Heatmap on a 256 grid, blurred and upscaled | One sprite per sample | One draw call instead of tens of thousands, and the GPU upscale is what makes the field continuous |
| 99th percentile normalisation | Scale to the true maximum | One camped doorway holds an order of magnitude more samples than anywhere else and would flatten the rest of the map to black |
| Single hue sequential ramp | Rainbow ramp | A rainbow invents category boundaries in a smooth quantity |
| Shape *and* colour per event type | Colour only | Markers stay distinguishable when they overlap, in a screenshot, and for a colour blind reader |
| Repair malformed trails | Drop them | Events address players by array index, so dropping one silently repoints every event after it |
| Client-side only, no backend | API with server-side aggregation | Nothing here needs a server. Adding one adds a failure mode and a bill |
