"""Per-map world-to-minimap configuration.

Scale and origin come from the dataset README and put a world (x, z) into a 0-1
square covering the playable area:

    u = (x - origin_x) / scale
    v = (z - origin_z) / scale

The renderer turns that into pixels, flipping V because image Y grows downward
while world Z grows north. Checked against the telemetry: every row on all three
maps lands inside the square, and plotted points follow roads rather than
drifting into the sea. The `y` column is elevation and is not used.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class MapConfig:
    key: str
    label: str
    scale: float
    origin_x: float
    origin_z: float
    source_image: str


MAPS: dict[str, MapConfig] = {
    "AmbroseValley": MapConfig(
        key="AmbroseValley",
        label="Ambrose Valley",
        scale=900.0,
        origin_x=-370.0,
        origin_z=-473.0,
        source_image="AmbroseValley_Minimap.png",
    ),
    "GrandRift": MapConfig(
        key="GrandRift",
        label="Grand Rift",
        scale=581.0,
        origin_x=-290.0,
        origin_z=-290.0,
        source_image="GrandRift_Minimap.png",
    ),
    "Lockdown": MapConfig(
        key="Lockdown",
        label="Lockdown",
        scale=1000.0,
        origin_x=-500.0,
        origin_z=-500.0,
        source_image="Lockdown_Minimap.jpg",
    ),
}
