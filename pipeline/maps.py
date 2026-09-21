"""Per-map world-to-minimap configuration.

The scale and origin values come from the dataset README. They place a world
(x, z) pair into a 0-1 UV square that covers the whole playable area:

    u = (x - origin_x) / scale
    v = (z - origin_z) / scale

The renderer turns UV into pixels, flipping V because image origin is top-left
while world Z grows northward. Verified against the shipped telemetry: 100% of
rows on all three maps land inside the unit square, and plotted points follow
roads and cluster on buildings rather than drifting into the sea.

The `y` column is elevation and plays no part in the 2D projection.
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
