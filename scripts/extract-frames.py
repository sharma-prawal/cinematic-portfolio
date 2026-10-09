"""Reproducible source-only extraction. Requires ffmpeg; never modifies the video."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "Man_moving_head_in_studio_20261009121811.mp4"
ASSET_DIRECTORY = "frames/flow-1218"
# Frame numbers are zero-based, measured by inspection at 24 fps.
ANCHORS = [
    (3, 0, 0, "center"), (8, 0, 0, None), (16, -.4, 0, None),
    (36, -1, 0, "left"), (42, -1, 0, None), (58, -1, -1, "upper-left"),
    (76, 0, -1, "up"), (88, .45, -1, None), (94, 1, -1, "upper-right"),
    # The middle of this clip reverses/rolls. Do not treat it as a compass sweep.
    (148, .8, 0, None), (156, 1, 0, "right"), (164, 1, 1, "lower-right"),
    (174, .3, 1, None), (180, 0, 1, "down"), (198, -1, 1, "lower-left"),
    (202, -1, 1, None),
]
EXCLUDED = [(9, 15), (82, 87), (98, 147), (165, 173), (203, 215)]
# Sparse supports only on clean, useful paths. Omit blinks and the rolled/reversed
# middle sequence. This is intentionally smaller than the old 68-frame atlas.
indices = sorted(set([3, 8] + list(range(16, 79, 4)) + [88, 92, 94]
                     + list(range(148, 165, 4)) + list(range(174, 203, 4)))
                 | {a[0] for a in ANCHORS})
indices = [n for n in indices if not any(lo <= n <= hi for lo, hi in EXCLUDED)]
def position(n):
    for a, b in zip(ANCHORS, ANCHORS[1:]):
        if a[0] <= n <= b[0]:
            p = (n-a[0])/(b[0]-a[0])
            return [round(a[1]+(b[1]-a[1])*p, 5), round(a[2]+(b[2]-a[2])*p, 5)]
    return [0, 0]
frames = []
for n in indices:
    name = f"frame-{n:03d}.webp"
    frames.append({"frame": n, "time": round(n/24, 6), "position": position(n), "file": name})
for width, directory in [(960, "desktop"), (640, "mobile")]:
    target = ROOT / "public" / ASSET_DIRECTORY / directory
    target.mkdir(parents=True, exist_ok=True)
    expr = "+".join(f"eq(n,{n})" for n in indices)
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(SOURCE),
                    "-vf", f"select='{expr}',scale={width}:-1", "-fps_mode", "vfr",
                    str(target / "temp-%03d.png")], check=True)
    for i, frame in enumerate(frames, 1):
        temp = target / f"temp-{i:03d}.png"
        subprocess.run(["cwebp", "-quiet", "-q", "88", str(temp), "-o", str(target / frame["file"])], check=True)
        temp.unlink()
manifest = {"source": SOURCE.name, "assetDirectory": ASSET_DIRECTORY,
            "sourceId": "Google Flow 12:18 PM", "fps": 24, "sourceSize": [1920, 1080],
            "limitations": {"lower-right": "Closest eyes-open source pose; mostly rightward with minimal downward tilt.",
                            "right": "Weaker yaw than the previous source.",
                            "transitions": "Rolled/reversed middle sequence and blinks excluded; some paths remain discrete."},
            "renderSize": [960, 540], "excludedFrameRanges": EXCLUDED,
            "anchors": {a[3]: {"frame": a[0], "time": round(a[0]/24, 6), "position": list(a[1:3])}
                        for a in ANCHORS if a[3]}, "frames": frames}
(ROOT / "src" / "poses.json").write_text(json.dumps(manifest, indent=2)+"\n")
(ROOT / "public" / ASSET_DIRECTORY / "provenance.json").write_text(json.dumps(manifest, indent=2)+"\n")
print(f"Extracted {len(frames)} frames in two resolutions from {SOURCE.name}.")
