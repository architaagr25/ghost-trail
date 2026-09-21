"""Turn the raw parquet journeys into the JSON the web app loads.

Run from the repo root:

    python pipeline/build.py --raw data_raw/player_data

Writes `public/data/index.json` plus one file per map, and converts the
minimaps into web-sized WebP images under `public/maps/`.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd
from PIL import Image

from load import read_journeys
from maps import MAPS

# The source minimaps run up to 9000px square, which is far more than a browser
# needs and slow to decode. 2048 keeps detail sharp at full zoom on the canvas.
MINIMAP_SIZE = 2048
MINIMAP_QUALITY = 88

# World coordinates are metres. One decimal is sub-pixel at every zoom level the
# tool offers, and dropping the rest shrinks the payload substantially.
COORD_PRECISION = 1

Image.MAX_IMAGE_PIXELS = None


def build_map_payload(map_key: str, rows: pd.DataFrame) -> dict:
    """Assemble one map's matches, player trails and events.

    Trails are stored columnar -- parallel arrays of t/x/z rather than an array
    of point objects. It roughly halves the JSON and drops straight into typed
    arrays on the client.
    """
    config = MAPS[map_key]
    rows = rows.sort_values(["match_id", "user_id", "t"])

    matches: list[dict] = []
    players: list[dict] = []
    events: list[dict] = []
    match_index: dict[str, int] = {}

    for match_id, match_rows in rows.groupby("match_id", sort=True):
        start = int(match_rows["t"].min())
        end = int(match_rows["t"].max())

        match_idx = len(matches)
        match_index[match_id] = match_idx

        counts = match_rows["category"].value_counts()
        humans = match_rows.loc[~match_rows["is_bot"], "user_id"].nunique()
        bots = match_rows.loc[match_rows["is_bot"], "user_id"].nunique()

        matches.append(
            {
                "id": match_id,
                # The match is dated by when it actually started, not by the
                # folder it sits in. A handful of matches run across midnight
                # and would otherwise be filed under the wrong day.
                "date": pd.to_datetime(start, unit="s").strftime("%Y-%m-%d"),
                "start": start,
                "duration": end - start,
                "humans": int(humans),
                "bots": int(bots),
                "kills": int(counts.get("kill", 0)),
                "deaths": int(counts.get("death", 0)),
                "loot": int(counts.get("loot", 0)),
                "storm": int(counts.get("storm", 0)),
            }
        )

        for user_id, player_rows in match_rows.groupby("user_id", sort=True):
            player_idx = len(players)
            trail = player_rows[player_rows["is_position"]]

            players.append(
                {
                    "m": match_idx,
                    "u": user_id,
                    "b": int(bool(player_rows["is_bot"].iloc[0])),
                    # Seconds from match start, so playback needs no date math.
                    "t": [int(v - start) for v in trail["t"]],
                    "x": [round(float(v), COORD_PRECISION) for v in trail["x"]],
                    "z": [round(float(v), COORD_PRECISION) for v in trail["z"]],
                }
            )

            for row in player_rows[player_rows["category"].notna()].itertuples():
                events.append(
                    {
                        "m": match_idx,
                        "p": player_idx,
                        "c": row.category,
                        "b": int(bool(row.is_bot)),
                        "t": int(row.t - start),
                        "x": round(float(row.x), COORD_PRECISION),
                        "z": round(float(row.z), COORD_PRECISION),
                    }
                )

    return {
        "map": config.key,
        "label": config.label,
        "config": {
            "scale": config.scale,
            "originX": config.origin_x,
            "originZ": config.origin_z,
        },
        "image": f"/maps/{config.key}.webp",
        "matches": matches,
        "players": players,
        "events": events,
    }


def convert_minimaps(raw_root: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    for config in MAPS.values():
        source = raw_root / "minimaps" / config.source_image
        if not source.exists():
            print(f"  missing minimap for {config.key}, skipping")
            continue
        image = Image.open(source).convert("RGB")
        image = image.resize((MINIMAP_SIZE, MINIMAP_SIZE), Image.LANCZOS)
        target = out_dir / f"{config.key}.webp"
        image.save(target, "WEBP", quality=MINIMAP_QUALITY, method=6)
        print(f"  {config.key}: {source.name} -> {target.name} ({target.stat().st_size // 1024} KB)")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw", type=Path, default=Path("data_raw/player_data"))
    parser.add_argument("--out", type=Path, default=Path("public"))
    args = parser.parse_args()

    if not args.raw.exists():
        raise SystemExit(
            f"Raw data not found at {args.raw}. Unzip player_data.zip there first."
        )

    print("Reading journeys...")
    df = read_journeys(args.raw)
    print(f"  {len(df):,} rows across {df['match_id'].nunique():,} matches")

    data_dir = args.out / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    index: list[dict] = []
    for map_key in MAPS:
        rows = df[df["map_id"] == map_key]
        if rows.empty:
            print(f"  no rows for {map_key}, skipping")
            continue

        payload = build_map_payload(map_key, rows)
        target = data_dir / f"{map_key}.json"
        target.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")

        dates = sorted({m["date"] for m in payload["matches"]})
        index.append(
            {
                "map": map_key,
                "label": payload["label"],
                "file": f"/data/{map_key}.json",
                "matches": len(payload["matches"]),
                "players": len(payload["players"]),
                "events": len(payload["events"]),
                "dates": dates,
            }
        )
        print(
            f"  {map_key}: {len(payload['matches'])} matches, "
            f"{len(payload['players'])} players, {len(payload['events'])} events "
            f"({target.stat().st_size // 1024} KB)"
        )

    (data_dir / "index.json").write_text(
        json.dumps({"maps": index}, indent=2), encoding="utf-8"
    )

    print("Converting minimaps...")
    convert_minimaps(args.raw, args.out / "maps")
    print("Done.")


if __name__ == "__main__":
    main()
