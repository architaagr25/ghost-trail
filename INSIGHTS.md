# Three things the data says

Findings from 796 matches, 1,242 journeys and 73,059 position samples across
five days of LILA BLACK. All figures are reproducible from the committed data.
Space is measured on a 32 by 32 grid over each map's playable bounds, which puts
one cell at roughly 28m on Ambrose Valley, 18m on Grand Rift and 31m on Lockdown.

---

## 1. Players use about a third of each map, and half their time in six percent of it

**What caught my eye.** Turning on the traffic heatmap with no filters, the map
is mostly dark. A few corridors glow and everything around them is empty.

**The evidence.**

| Map | Cells ever visited | Never visited | Cells holding 50% of traffic | Cells holding 80% |
| --- | ---: | ---: | ---: | ---: |
| Ambrose Valley | 43.3% | **56.7%** | 65 (6.3%) | 180 (17.6%) |
| Grand Rift | 36.7% | **63.3%** | 67 (6.5%) | 167 (16.3%) |
| Lockdown | 32.5% | **67.5%** | 54 (5.3%) | 134 (13.1%) |

The obvious objection is sample size, so I tested for it. Taking a random 10% of
Ambrose Valley's journeys already covers 37.2% of the map. All 836 journeys,
ten times the data, reach only 43.3%. The curve is flat long before the data
runs out, so the empty area is genuinely unused rather than unsampled.

| Share of journeys sampled | 10% | 25% | 50% | 75% | 100% |
| --- | ---: | ---: | ---: | ---: | ---: |
| Ambrose Valley coverage | 37.2% | 40.6% | 42.0% | 42.7% | 43.3% |
| Lockdown coverage | 22.8% | 28.7% | 30.9% | 32.0% | 32.5% |

**Caveat, stated plainly.** Some of that unvisited area is water, cliff face and
out-of-play terrain inside the coordinate bounds. The number is not "57% of
Ambrose Valley is wasted level". It is "57% of the bounded area gets no traffic,
and nobody currently knows which part of that is deliberate".

**What to do with it.** Overlay the traffic field on the greybox and sort dead
cells into intended (terrain, boundary) and unintended (a building nobody
enters, a route nobody takes). The unintended ones are the list. For each,
either give players a reason to go there, usually loot or a traversal shortcut,
or reclaim the art and streaming budget spent on it.

**Metrics affected.** Map coverage percentage, traffic Gini across cells,
average unique cells visited per journey. Second order: match duration and
encounter rate, since spreading players out lengthens the hunt.

**Why a Level Designer cares.** Every cell costs art time, streaming budget and
playtest attention. Two thirds of Lockdown is currently paid for and not played.
This turns "I think nobody goes up there" into a ranked list with counts.

---

## 2. Combat is loot placement, not cover placement

**What caught my eye.** Switching between the kill-zone and traffic heatmaps,
the hotspots do not sit where I expected. They sit on top of the loot markers.

**The evidence.** Between 91% and 98% of all kills happen in a cell that also
contains loot, even though only 32% to 58% of visited cells have any loot in
them at all.

That alone could just mean loot is where people are, so I normalised by traffic.
Kills per 1,000 position samples, which controls for how busy a cell is:

| Map | Loot-heavy cells (10+) | Light loot (1 to 9) | No loot | Ratio |
| --- | ---: | ---: | ---: | ---: |
| Ambrose Valley | 45.6 | 29.4 | 4.8 | **9.5x** |
| Grand Rift | 61.2 | 43.2 | 7.4 | **8.3x** |
| Lockdown | 26.4 | 29.2 | 8.4 | **3.1x** |

Standing in a loot-heavy cell on Ambrose Valley is nine and a half times more
likely to produce a kill than standing in an empty one for the same length of
time. The effect holds on all three maps and rises with loot density on two of
them. Lockdown is the weak case: its heavy and light bands are level, so there
density matters less than presence.

**What to do with it.** Treat the loot table as the encounter pacing tool it
actually is. To raise engagement rate, tighten loot into fewer, richer clusters.
To lower it, thin and scatter. Every loot cluster placed without a sightline and
a cover read is an unintentional arena. Grand Rift is the one to look at first:
at 61 kills per 1,000 samples it is the deadliest per unit of presence, on the
smallest map.

**Metrics affected.** Engagements per match, time to first contact, kill
distribution across the map, and the share of matches ending in combat rather
than extraction.

**Why a Level Designer cares.** It moves the lever. If fights follow loot rather
than geometry, then rebalancing an over-hot area is a loot table edit, which is
cheap, before it is a geometry edit, which is not.

---

## 3. Bots are a third of the position data and they do not walk where humans walk

**What caught my eye.** Toggling bots off visibly moved the traffic hotspots,
which should not happen if bots are background noise.

**The evidence.** Bots produce 27% to 39% of all position samples. Compared cell
by cell, the human and bot traffic fields have a cosine similarity of only 0.61
to 0.73. The clearest number: on Ambrose Valley the ten busiest human cells and
the ten busiest bot cells **share none of the same cells**.

| Map | Bot share of samples | Human vs bot field similarity | Shared top-10 cells |
| --- | ---: | ---: | ---: |
| Ambrose Valley | 27% | 0.614 | **0 of 10** |
| Grand Rift | 35% | 0.627 | 2 of 10 |
| Lockdown | 39% | 0.727 | 2 of 10 |

Humans also reach places bots never do: 41 cells on Ambrose Valley are
human-only against 5 bot-only.

An unfiltered traffic heatmap is therefore roughly a third bot pathing, and on
Ambrose Valley its brightest points are not where a single one of the top human
destinations is. Any conclusion drawn from that map would be about the AI's
navmesh, not about player intent.

**What to do with it.** Filter to humans before reading traffic, which the tool
defaults to offering. Then read the bot field separately and deliberately: where
bots cluster and humans never go is a navmesh artefact worth fixing, and where
humans go and bots never follow is where AI opposition silently disappears.

**Metrics affected.** Every spatial metric derived from unfiltered telemetry,
including traffic heat, area coverage and hotspot ranking. Also bot encounter
rate and the share of engagements that are PvE rather than PvP.

**Why a Level Designer cares.** This one is about trusting the instrument. A
designer who greyboxes against an unfiltered heatmap is designing for the bots.
It is also why the human and bot toggles in this tool are two separate switches
rather than one combined view.
