"""Compare actual old/new browser captures at identical viewport and cursor positions."""
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "qa" / "comparison"
OUT.mkdir(parents=True, exist_ok=True)
OLD = ROOT / "rollback" / "original-68" / "qa"
NEW = ROOT / "qa"
DIRECTIONS = ["upper-left", "up", "upper-right", "left", "center", "right", "lower-left", "down", "lower-right"]
for label, folder, manifest_path in [
    ("old", OLD, ROOT / "rollback/original-68/src/poses.json"),
    ("new", NEW, ROOT / "src/poses.json"),
]:
    manifest = json.loads(manifest_path.read_text())
    board = Image.new("RGB", (1440, 995), "#eeeeee")
    draw = ImageDraw.Draw(board)
    draw.text((12, 12), f"{label.upper()} — actual browser screenshots, 1440x900, identical cursor positions", fill="black")
    for i, name in enumerate(DIRECTIONS):
        capture = Image.open(folder / f"{name}-1440x900.png").convert("RGB")
        assert capture.size == (2880, 1800), "Both comparisons must use the same viewport and DPR 2"
        x = i % 3 * 480; y = 40 + i // 3 * 315
        board.paste(capture.resize((480, 300)), (x, y))
        anchor = manifest["anchors"][name]
        draw.text((x+8, y+301), f"{name} — frame {anchor['frame']} / {anchor['time']:.6f}s", fill="black")
    board.save(OUT / f"{label}-nine-directions.jpg", quality=93)
    if label == "new": board.save(NEW / "direction-overview.jpg", quality=93)

board = Image.new("RGB", (1350, 1160), "#eeeeee")
draw = ImageDraw.Draw(board)
for row, (label, folder) in enumerate([("OLD", OLD), ("NEW", NEW)]):
    y = row * 580
    draw.text((12, y+8), f"{label} — same unregistered crop of each actual browser screenshot", fill="black")
    for column, name in enumerate(["lower-left", "down", "lower-right"]):
        capture = Image.open(folder / f"{name}-1440x900.png").convert("RGB")
        # Fixed viewport crop; no per-face registration, warp, or eye editing.
        face = capture.crop((960, 190, 1860, 1260)).resize((450, 535))
        x = column * 450
        board.paste(face, (x, y+30))
        draw.text((x+8, y+564), name, fill="black")
board.save(OUT / "lower-eyes-before-after.jpg", quality=95)

# Independently verify that the application layout has not changed.
old = json.loads((OLD / "results.json").read_text())
new = json.loads((NEW / "results.json").read_text())
for before, after in zip(old["viewports"], new["viewports"]):
    assert (before["width"], before["height"]) == (after["width"], after["height"])
    assert before["layout"]["portrait"] == after["layout"]["portrait"]
    assert before["layout"]["canvas"] == after["layout"]["canvas"]
print("Old/new screenshot boards created. Portrait bounds and canvas resolution are identical at all five sizes.")
