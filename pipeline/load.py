"""Read the raw parquet journeys into one tidy frame.

Each file under the dated folders is one player's journey through one match.
The `.nakama-0` extension is misleading -- they are ordinary parquet.
"""

from __future__ import annotations

import os
from pathlib import Path

import pandas as pd
import pyarrow.parquet as pq

# Movement samples, as opposed to point-in-time events.
POSITION_EVENTS = {"Position", "BotPosition"}

# Kill and BotKill both mean "killed someone"; Killed and BotKilled both mean
# "died". Who was on the other end does not change what happened here.
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

    # Strip the server-instance suffix; it is identical on every row.
    df["match_id"] = df["match_id"].str.removesuffix(".nakama-0")

    df["is_bot"] = ~df["user_id"].str.contains("-", regex=False)
    df["category"] = df["event"].map(EVENT_CATEGORY)
    df["is_position"] = df["event"].isin(POSITION_EVENTS)
    df["t"] = _wall_clock_seconds(df["ts"])

    return df.drop(columns=["ts", "y"])


def _wall_clock_seconds(ts: pd.Series) -> pd.Series:
    """Recover wall-clock seconds from the `ts` column.

    The column is typed as millisecond datetimes and the dataset README calls it
    milliseconds into the match. Both are wrong: the integers are epoch seconds.
    Read as milliseconds every row lands in January 1970 and matches collapse to
    under a second. Read as seconds they fall in February 2026, matching the
    folder names, with 13-890s matches sampled every 5s.
    """
    return ts.astype("int64")
