"""Read the raw parquet journeys into one tidy frame.

Every file under the dated folders is one player's journey through one match.
They carry a `.nakama-0` extension rather than `.parquet`, but they are valid
parquet and any reader opens them by path.
"""

from __future__ import annotations

import os
from pathlib import Path

import pandas as pd
import pyarrow.parquet as pq

# Movement samples versus things that happened at a point in time. Splitting
# them early keeps the trail builder and the event builder from re-filtering.
POSITION_EVENTS = {"Position", "BotPosition"}

# The eight raw event names collapse into four things a designer cares about.
# `Kill`/`BotKill` are "this player killed someone", `Killed`/`BotKilled` are
# "this player died", regardless of whether the other party was human or a bot.
EVENT_CATEGORY = {
    "Kill": "kill",
    "BotKill": "kill",
    "Killed": "death",
    "BotKilled": "death",
    "KilledByStorm": "storm",
    "Loot": "loot",
}


def _decode(value: object) -> str:
    """The `event` column is stored as parquet binary, not as a string."""
    if isinstance(value, (bytes, bytearray)):
        return value.decode("utf-8")
    return str(value)


def read_journeys(root: Path) -> pd.DataFrame:
    """Load every journey file under `root` into a single frame."""
    files = sorted(
        p
        for day in sorted(root.iterdir())
        if day.is_dir() and day.name != "minimaps"
        for p in day.iterdir()
        if p.is_file() and not p.name.startswith(".")
    )
    if not files:
        raise SystemExit(f"No journey files found under {root}")

    frames: list[pd.DataFrame] = []
    skipped: list[str] = []
    for path in files:
        try:
            frames.append(pq.read_table(path).to_pandas())
        except Exception as exc:  # a corrupt file should not sink the run
            skipped.append(f"{path.name}: {exc}")

    if skipped:
        print(f"  skipped {len(skipped)} unreadable file(s)")
        for line in skipped[:5]:
            print(f"    {line}")

    df = pd.concat(frames, ignore_index=True)
    df["event"] = df["event"].map(_decode)

    # The match_id carries the game server instance as a suffix. It is the same
    # for every row here and only makes the id harder to read in the UI.
    df["match_id"] = df["match_id"].str.removesuffix(".nakama-0")

    df["is_bot"] = ~df["user_id"].str.contains("-", regex=False)
    df["category"] = df["event"].map(EVENT_CATEGORY)
    df["is_position"] = df["event"].isin(POSITION_EVENTS)
    df["t"] = _wall_clock_seconds(df["ts"])

    return df.drop(columns=["ts", "y"])


def _wall_clock_seconds(ts: pd.Series) -> pd.Series:
    """Recover real wall-clock seconds from the `ts` column.

    The column arrives typed as millisecond-resolution datetimes, and the
    dataset README describes it as milliseconds elapsed within a match. Neither
    is true. The underlying integers are epoch *seconds*, so reading them as
    milliseconds lands every row in January 1970 and compresses matches into
    well under a second.

    Read as seconds they resolve to February 2026, matching the folder names,
    and produce match lengths of roughly 13 to 890 seconds with position samples
    every 5 seconds -- which is what a battle royale should look like.
    """
    return ts.astype("int64")
