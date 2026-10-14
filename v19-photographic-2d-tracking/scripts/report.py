from pathlib import Path
import json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'report'
source=json.loads((OUT/'source.json').read_text())
performance=json.loads((OUT/'performance-summary.json').read_text())
qa=json.loads((OUT/'browser-qa.json').read_text())
videos=json.loads((OUT/'recording-inventory.json').read_text())
responses=json.loads((OUT/'response.json').read_text())
preservation=json.loads((OUT/'preservation-result.json').read_text())
final=json.loads((OUT/'final-check.json').read_text())
original=np.array(Image.open(ROOT/'public/original.png'))
identity={name:bool(np.array_equal(original,np.array(Image.open(OUT/name)))) for name in ['native-neutral.png','final-native-neutral.png','final-native-return.png']}
assert all(identity.values())
(OUT/'neutral-identity.json').write_text(json.dumps({'nativeSize':[1672,941],'equalPixels':identity,'maxChannelDifference':0,'meanAbsoluteDifference':0},indent=2))
Image.open(OUT/'initial-b-upper-right.png').crop((660,555,1010,835)).resize((700,560)).save(OUT/'final-neck-detail.png')
def link(label,path):return f'[{label}](<{path}>)'
table='\n'.join(f"| {r['name']} | {r['rafFPS']:.2f} | {r['rafMs']['p95']:.2f} | {r['gpuDrawMs']['median']:.3f} | {r['readyMs']:.1f} |" for r in performance if r.get('gpuDrawMs'))
response_table='\n'.join(f"| {r['method'].upper()} / {r['tau']} ms | {np.median(r['latenciesMs']):.2f} | {np.percentile(r['latenciesMs'],95):.2f} | {max(r['latenciesMs']):.2f} |" for r in responses)
video_table='\n'.join(f"| {link(v['recording'],OUT/'recordings'/v['recording'])} | {v['duration']:.2f} s |" for v in videos)
view_table='\n'.join(f"| {r['width']}×{r['height']} | {r['rect']['width']:.0f}×{r['rect']['height']:.0f} | {r['metrics']['framebufferMiB']:.2f} | PASS |" for r in qa['layouts'] if r['method']=='b')
gpu=final['dpr2']['metrics']['gpuTimeMs']
gate={'verdict':'NO-GO','scope':'The two tested implementations, not a proof that every possible single-image renderer must fail','nativeNeutral':'PASS','continuousTwoAxis':'PASS','naturalCircularHeadMotion':'FAIL','performance':'PASS on tested local Chrome','visiblyPreferableToStatic':'FAIL','photographicEdges':'FAIL at full-range neck/collar boundary','promotion':'Not performed'}
(OUT/'verdict.json').write_text(json.dumps(gate,indent=2))
text=f'''# V19 — photographic tracking feasibility

**NO-GO for the requested natural two-axis photographic head tracking.** Both implementations provide smooth simultaneous X/Y response and retain the supplied photographic identity. Circles mainly move a camera-facing head cutout; full-range holds expose a neck/collar composite seam. Half amplitude reduces the defect and also makes the effect barely distinguishable from static. Method B does not demonstrate a realism advantage over A.

This verdict applies to the tested implementations, not every possible monocular reconstruction or matting technique. Nothing was promoted.

## Source and preview

Selected source: {link('Professional Studio Headshot of a Smiling Bearded Man.png',Path(source['source']))}, supplied by the user. **1672×941, RGB, 1,671,000 bytes, no alpha.** SHA-256: `{source['sha256']}`. The local {link('original.png',ROOT/'public/original.png')} is byte-identical.

The photograph already has nearly 16:9 composition. No separate padded reference or transparent original was supplied, so the full source is displayed without cropping. Native hair, beard, skin and eye detail are usable. Fine hair edges contain baked-in background colour. Neck and both shoulders are visible; the lower shirt ends at the source boundary. The gaze is near camera-facing; the mild smile is retained. No MP4 frame supplies identity pixels, and the source file remains immutable.

Experiment: `{ROOT}`.

[Working V19 comparison](http://127.0.0.1:61919/) · [Debug controls](http://127.0.0.1:61919/?debug=1) · [Existing V15 Variation 2 subtle](http://127.0.0.1:61915/?candidate=v2-subtle&smoothing=20&resolution=960). Local previews are running; these are not deployments.

## Architecture and comparison

React/TypeScript provides comparison controls. Pointer events mutate controller values directly without setting React state. A requestAnimationFrame loop smooths both axes with `alpha = 1 − exp(−dt / tau)`. Targets update immediately; reversal continues from the current pose without a queued timeline. Initial apparent limits are yaw ±2° and pitch ±1.5°; there is no roll parameter. These are perceptual controls, not calibrated anatomical angles. Debug exposes both limits and 20/40/70 ms response constants.

WebGL uses three native-resolution textures: original RGB photograph, head/neck mask, and stationary plate. A shared 84×48 grid has 8,064 triangles. The mask comes from photographic colour contrast within a manually traced region, with one-pixel edge feather. It is not a professional source matte. The plate preserves original pixels outside the removed head/neck footprint and estimates concealed colours from exterior row samples. It does not paint unseen facial regions. Its approximation fails at the neck beside the white collar.

| Method | Geometry | Result |
| --- | --- | --- |
| Static | Original texture | Highest photographic fidelity; preferred reference |
| A | Head translation, blended into an anchored neck | Continuous motion, but reads as displaced photographic cutout |
| B | Shallow relief, orthographic virtual yaw/pitch around a neck pivot | Limited parallax, no convincing realism upgrade; neck seam persists |
| V15 | Existing 49-frame horizontal arc, 960×540, tau 20 ms | More legible horizontal pose changes; no vertical response |

A moves the rigid head by at most approximately **4.19 native pixels horizontally / 2.62 vertically**. The final anchor transition runs from source Y=570 to Y=655, below the beard. Shoulders and torso remain fixed. This is image-space sway rather than physical yaw reconstruction.

B uses a shallow ellipsoid inferred from the visible head bounds, approximately 30–130 pixel units deep, with a broad facial plateau protecting eyes, nose and mouth. It is a **hand-set image-conditioned heuristic**, not a learned depth estimate or anatomical ground truth. Orthographic micro-rotation preserves the original texture while avoiding back-facing texture invention. Its conservative facial plateau also weakens the perspective cues that would make the face turn convincing.

No facial texture, eyes, blink or expression is generated. Ordinary texture resampling occurs during movement, so moving frames are not asserted to be pixel-identical. At exact neutral the composite is bypassed and the original texture is drawn directly. Native Chrome canvas screenshots of initial neutral and returned neutral are **pixel-identical to the source: maximum channel difference 0**. See {link('identity measurements',OUT/'neutral-identity.json')}. This equality claim does not apply to resized/high-DPI images.

The original pupils remain intact and camera-directed; the portrait does not acquire gaze toward the pointer. Inspected directional samples show no gross eye/nose/mouth distortion. At full range a thin light/jagged line remains beside the neck/collar: {link('native neck detail',OUT/'final-neck-detail.png')}. This is a failed photographic gate, not hidden by blur. Moving the blend below the beard preserves the jaw more faithfully but does not repair the disoccluded neck boundary.

At **±1° / ±0.75°**, contour motion and the seam shrink. Movement is then marginal at desktop size and mostly subpixel on a 390px-wide screen. Reducing amplitude does not establish a visible advantage over static. B is rejected as an upgrade, and A is not accepted as natural photographic head tracking.

## Circular motion and responsiveness

The shared path contains **383 dispatched points**: small CW/CCW circles of normalized radius .12; medium radius .4; large radius .85; radius-.2 offset circles centred at (−.45,.35) and (.4,−.3); horizontal, vertical and diagonal sweeps; rapid reversals; stationary and neutral holds. Radius and angle both affect the targets; both axes influence the geometry simultaneously. No discrete source-frame switching occurs in V19.

Static, A/B at 20/40/70 ms, historical V15, and half-amplitude A/B replay the same coordinates, phases and planned waits. Actual timestamps are retained because automation scheduling varies; videos are not claimed to be frame-synchronized. The visible ring represents dispatched browser pointer events.

Small circles are continuous but visually slight. Larger circles make A's translation more evident; B adds modest outline parallax while retaining a largely frontal face. Offset circles work without selector boundaries. Reversals retarget immediately and held poses settle without autonomous movement. Smoothing cannot repair the spatial neck composite defect.

20 ms is most immediate; 40 ms is the inspection default; 70 ms delays settling without improving realism. Measured stationary/neutral 90% response thresholds are roughly 55–70 ms, 100–120 ms and 175–190 ms respectively, including browser scheduling. They are distinct from the smoothing constants. 20/40 ms tails become exactly stationary; the tiny 70 ms residual is below visible displacement before the epsilon snap. Draw submission stops when the pose settles, while rAF instrumentation continues.

Visual assessment uses native extreme stills, nine-direction boards and chronological samples from actual browser recordings. This is engineering inspection, not a blinded preference study or a physical pose calibration.

## Performance and QA

All **15 static/A/B viewport combinations** pass fit, aspect ratio and overflow checks. Reduced-motion static behavior, live preference switching, touch drag/release, debug controls and neutral return also pass. Touch testing is Chrome device emulation, not a physical phone test. Reduced motion resets directly to original neutral. A WebGL startup failure retains the original HTML image.

| Viewport | Portrait buffer at DPR 1 | Single RGBA buffer estimate (MiB) | Layout |
| --- | --- | --- | --- |
{view_table}

| Run | rAF ticks/s | p95 rAF interval (ms) | Median GPU draw (ms) | Navigation → ready (ms) |
| --- | --- | --- | --- | --- |
{table}

GPU draw time uses asynchronous `EXT_disjoint_timer_query` samples, discarding disjoint results. CPU submission p95 is approximately 0.1 ms; medians often round to 0.0 at browser clock resolution. These are local Chrome results, not device-wide guarantees or physical display measurements. Recordings are **25 fps**, independently of the roughly 60 Hz rAF loop.

Three RGBA textures total **18.01 MiB** nominal GPU pixel storage; mesh storage adds 189 KiB. Nominal decoded image storage is another 18.01 MiB; the retained fallback can account for another 6.00 MiB if not cache-shared. A 1440×900 case uses 4.23 MiB per RGBA buffer. Actual GPU/process memory, driver allocation, compositor surfaces and buffering are not measured. The comparison preloads both methods even in static mode; a plain static image would be cheaper.

The additional 1920×1080 DPR-2 test has a {final['dpr2']['metrics']['drawingBuffer'][0]}×{final['dpr2']['metrics']['drawingBuffer'][1]} buffer, approximately {final['dpr2']['metrics']['framebufferMiB']:.2f} MiB per RGBA surface, and median GPU draw {np.median(gpu) if gpu else float('nan'):.3f} ms.

Corrected callback wall-clock input timing:

| Run | Median input → render submission (ms) | p95 | Max |
| --- | --- | --- | --- |
{response_table}

These small values reflect automated dispatch close to browser callbacks and clock resolution. They **do not measure physical mouse-to-photon latency**. Earlier raw traces use rAF scheduling timestamps, which can precede an event handled before the callback; their negative differences are excluded from latency conclusions. See {link('corrected response evidence',OUT/'response.json')}.

Tested outer background and lower torso regions match the static rendered reference exactly (maximum channel difference 0). This does not cover disoccluded pixels immediately beside the moving silhouette/neck, where the composite fails.

## Deliverable evidence

**10 actual Chrome recordings**, totalling {sum(v['duration'] for v in videos):.2f} seconds at 1440×900. Selected recordings include directional holds after the shared pointer sequence.

| Recording | Duration |
| --- | --- |
{video_table}

Screenshots: {link('native neutral',OUT/'final-native-neutral.png')}, {link('native returned neutral',OUT/'final-native-return.png')}, {link('A nine directions',OUT/'a-nine-directions.jpg')}, {link('B nine directions',OUT/'b-nine-directions.jpg')}, {link('mobile',OUT/'viewport-b-390x844.png')}, {link('reduced motion',OUT/'reduced-motion.png')}, {link('touch drag',OUT/'touch-drag.png')}. Individual direction PNGs and all five viewport captures are alongside this report. Recording inventory indexes timestamped filmstrips. Raw traces, source provenance, performance, pixel stability, corrected response and browser QA JSON are retained here.

All **{preservation['checkedFiles']:,} inventoried pre-existing files** remain unchanged, and the Downloads source retains its SHA-256. Inventory excludes installed dependencies, virtual environments, Git internals, symlinks and OS metadata. No Git/tag/rollback mutation was performed. Portfolio, frozen prototype, V14/V15, V18 and original media were not edited. All new code/assets/evidence are inside V19. See {link('preservation verification',OUT/'preservation-result.json')}.

| Acceptance gate | Result |
| --- | --- |
| Original identity source / exact native neutral | PASS |
| Continuous simultaneous two-axis response | PASS |
| Natural circular photographic head motion | FAIL |
| Seamless neck/contours at full range | FAIL |
| Performance | PASS on tested local Chrome |
| Visibly preferable to static | Not demonstrated |
| Overall | **NO-GO** |

Keep the comparison isolated. Static remains the photographic fidelity reference; V15 remains the historical horizontal reference. Neither new method should be promoted on the strength of continuity or FPS alone.
'''
(OUT/'REPORT.md').write_text(text)
print('Report complete; native equality:',identity)
