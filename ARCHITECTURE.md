# Architecture

## What it is built with, and why

**An offline Python pipeline, a static React frontend, and no server.**

The whole dataset is 89,104 rows, small enough to process once and ship as
static files. That removes the backend entirely: no API, no database, no query
latency, and a deploy that is a folder upload. Python does the pipeline because
parquet is a Python-first format and it runs once, offline. React, TypeScript
and Vite build the frontend. Zustand holds the one selection that four panels
and the canvas all read. Vercel hosts it. Versions are in the
[README](README.md).

The choice that mattered is **PixiJS 8**. SVG or DOM means one element per trail
point, and 73,059 nodes stall on the first pan. Pixi draws all human trails from
one `Graphics` object and all bot trails from another, so a full redraw is a
handful of draw calls rather than thousands.

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

Filtering happens once, in `selectData`, and that one result feeds the canvas
and the numbers beside it, so the two cannot disagree. Each map is fetched whole
rather than per match: 1.7 MB at worst, 391 KB over the wire with Brotli, which
buys instant match switching and cross-match heatmaps.

## Mapping game coordinates onto the minimap

Each map ships a `scale` and an origin that together bound the playable area.
World `x` and `z` normalise against them into a 0 to 1 square. The `y` column is
elevation and is discarded.

```
u = (x - origin_x) / scale
v = (z - origin_z) / scale

pixel_x =      u  * size
pixel_y = (1 - v) * size     V is flipped: image Y grows down, world Z grows north
```

**Worked example**, Ambrose Valley, scale 900, origin (-370, -473), using the
sample row from the dataset README:

```
world (x, z)  = (-301.45, -355.55)

u = (-301.45 + 370) / 900 =  68.55 / 900 = 0.0762
v = (-355.55 + 473) / 900 = 117.45 / 900 = 0.1305

pixel_x =      0.0762  * 1024 =  78
pixel_y = (1 - 0.1305) * 1024 = 890
```

That reproduces the README's expected `(78, 890)` exactly.

`size` is not the image resolution. Every layer draws into a fixed logical
square of 1024 units (`MAP_SIZE`) that the viewport scales to fit the window,
with the minimap stretched to match. So the numbers above are literally the
coordinates the app plots at, and pan and zoom stay one transform on one
container rather than a recalculation of every point.

**Verified three ways.** All 89,104 points on all three maps fall inside the
unit square, 100.00% on each, where a wrong origin or a swapped axis would put
thousands outside it. The worked example reproduces the documented pixel
exactly. And plotted trails follow roads, cluster on buildings and stop at
coastlines rather than floating in the sea.

## Assumptions

Four places where the dataset README and the data disagree. The data won each
time.

**Timestamps are epoch seconds, not milliseconds into the match.** The `ts`
column is typed as millisecond datetimes and documented as match-relative
elapsed time. Read that way every row lands in January 1970 and matches compress
to under a second. Read as epoch seconds they resolve to February 2026, matching
the folder names, with match lengths of 13 to 890 seconds sampled every 5
seconds. Each event is stored as an offset from its match start.

**Bots are identified by user id, not by event name.** The README says bots
generate `BotPosition`, `BotKill` and `BotKilled`. In the data, 2,232 `BotKill`
and 403 `BotKilled` rows belong to human UUIDs, and 636 `Position` plus 115
`Loot` rows belong to bot ids. The `Bot` prefix names who was on the *other*
end, not who recorded it. A `user_id` with a hyphen is a human UUID; anything
else is a bot.

**Minimaps are not 1024 by 1024.** They are 4320, 2160 by 2158, and 9000
square. The projection works in UV so the arithmetic is unaffected, but all
three are resampled to a uniform 2048px WebP rather than asking a browser to
decode a 9000px JPEG. Grand Rift is two pixels off square and squashed to fit, a
0.09% distortion invisible at any usable zoom.

**Matches are dated by when they started, not by their folder.** One match began
at 23:58:55 and ran into the next day. Trusting the folder name would have filed
it under the wrong date and quietly corrupted the date filter.

One judgement call, where nothing was wrong and only unstated: **position
gaps**. Samples normally arrive every 5 seconds, but some journeys drop out for
minutes. Joining across one invents a path, so trails are cut at any gap over 30
seconds. Jitter reaches 25 seconds at the 99th percentile, so the threshold
catches only real dropouts. Distance statistics skip those gaps too.

## Tradeoffs

| Decision | Alternative | Why |
| --- | --- | --- |
| Precompute to static JSON | DuckDB WASM in the browser | 89k rows does not need a query engine |
| One file per map, fetched whole | One file per match | 391 KB compressed, and it enables cross-match heatmaps |
| Columnar `t`/`x`/`z` arrays | Array of point objects | Halves the JSON and loads straight into the render loop |
| WebGL canvas | SVG or DOM | 73k points. SVG stalls on the first pan |
| Trails weighted by count and zoom | One fixed stroke weight | Faint enough for 836 trails leaves 20 invisible |
| Heatmap on a blurred 256 grid | One sprite per sample | One draw call, and the GPU upscale smooths the field |
| 99th percentile normalisation | Scale to the true maximum | One camped doorway would flatten the rest of the map to black |
| Single hue sequential ramp | Rainbow ramp | A rainbow invents category boundaries in a smooth quantity |
| Shape *and* colour per event | Colour only | Survives overlap, screenshots and colour blindness |
| Repair malformed trails | Drop them | Events address players by index; dropping one repoints every later event |
| Client-side only | API with server-side aggregation | Nothing here needs a server; one adds a failure mode and a bill |
