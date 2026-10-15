from pathlib import Path
import json
import hashlib
import statistics
import html

root = Path(__file__).resolve().parents[1]
report = root / 'report'
browser = json.loads((report / 'browser-results.json').read_text())
perf = json.loads((report / 'performance.json').read_text())
selection = json.loads((report / 'source/selection.json').read_text())
preservation = json.loads((report / 'preservation.json').read_text())
step = browser['stepResponse']
thresholds = {str(r): next((round(x['ms'], 1) for x in step if x['spring'][0] >= step[-1]['target'][0] * r), None) for r in [.5, .9, .95, .99]}
rows = []
for entry in browser['paths']:
    m = entry['metrics']
    gaps = ', '.join(f"{s['gapMs']:.1f}" for s in m['telemetry']['seams'])
    rows.append(f"| {entry['mode']} | {m['quality']['total']} | {m['quality']['dropped']} | {m['telemetry']['frames']} | {m['telemetry']['readyMs']:.1f} | {gaps} |")
perf_rows = []
for x in perf:
    d = x['mainThreadDelta']
    perf_rows.append(f"| {x['mode']} | {x['raf']['p50']:.1f} / {x['raf']['p95']:.1f} / {x['raf']['p99']:.1f} | {d['TaskDuration']*1000:.1f} | {d['ScriptDuration']*1000:.1f} | {d['LayoutDuration']*1000:.3f} | {d['RecalcStyleDuration']*1000:.1f} | {x['heapBytes']/1048576:.2f} |")
responsive_rows = [f"| {x['viewport'][0]}×{x['viewport'][1]} | {x['width']:.1f}×{x['height']:.1f} | No | {'On' if x['interactive'] else 'Off (touch)'} |" for x in browser['responsive']]
sha = hashlib.sha256((root / 'public/portrait.mp4').read_bytes()).hexdigest()
assert sha == selection['sha256']
text = f'''# V20 — Cinematic Living Portrait

15 October 2026 · isolated local experiment · **CONDITIONAL**

## 1. Decision and scope

**Mode A is the recommended living-video variant.** It is the cleanest photographic presentation. B has no demonstrated aesthetic advantage. C adds visible atmosphere outside the opaque video but accentuates its rectangular mount; it does not establish a meaningful improvement over A. The original static photograph remains stronger for texture authenticity and exact identity reference.

The experiment is ready for local review, not promotion. Source-level smoothing/likeness differences, the tilt, brief teeth-visible expression, watermark, mobile scale, and unresolved perceptual loop approval prevent a GO. Browser recordings and timing establish playback behavior; they do not certify an uninterrupted human visual approval of the entire source or three loop cycles. If normal-speed viewing finds these events distracting, retain the existing original static photograph. No new architecture or generated video was started.

## 2. Authoritative source and metadata

- Selected original: `{selection['source']}`.
- Local immutable runtime copy: `public/portrait.mp4` (byte-identical).
- SHA-256: `{sha}`.
- FFprobe: 1920×1080; H.264 High, yuv420p, progressive; 24/1 average and nominal fps; 240 frames; 10.000 seconds.
- Container: MP4, Google encoder, 3,098,029 bytes; approximately 2.478 Mbps overall.
- Audio: AAC-LC, stereo, 48 kHz, ten seconds; browser playback is muted.
- Only the preferred V20 filename exists among matching root candidates. No `20261014191641` alternate exists to compare for duplication; no earlier 19:15:53 footage was selected.
- Full FFprobe output: [metadata](source/metadata.json); [selection record](source/selection.json).

## 3. Source-quality audit

The full ten-second source was decoded for frame-difference analysis, played at native 1920×1080/1× in Chrome and recorded over three cycles. Visual inspection used the full-clip 2 fps contact sheet, six full-resolution frames, and denser blink/expression sequences. **Uninterrupted normal-speed perceptual viewing is not certified by this tool-based review.** Sampling cannot establish that every frame preserves identity or is flicker-free.

| Feature | Evidence and assessment |
|---|---|
| Identity | Broad likeness is recognizable, but comparison with the original still shows smoother skin/beard, altered apparent eye/facial proportions, and more uniform hair. Exact original photographic identity is not established. No frontend facial processing occurs. |
| Hairline / hair / beard | Complete hair and forehead are visible. No gross disappearing hair or beard region appears in inspected samples. Fine texture is more synthetic/smooth than the original reference. |
| Eyes / blink | Dense 2.7–3.3 s sequence shows bilateral closure/reopening around 3 s. Plausible natural blink; retained. Eye appearance differs subtly from the original still. |
| Expression | Neutral mild smile for much of the clip; visible lip opening/teeth around 6.6–7.1 s. This is a clear expression change, not concealed or treated as cursor response. |
| Head | Noticeable roll/tilt around 1.5–2.5 s, then recovery. Movement is larger than an almost-still portrait; no attempt to stabilize or reconstruct it. |
| Shirt / collar / shoulders | White shirt remains coherent in sampled frames; shoulder and fabric contours move substantially with the body. Small endpoint differences remain. No segmented neck/collar artifacts are introduced. |
| Studio | Baked-in neutral-grey background stays broadly consistent; a Flow watermark is visible at lower right throughout. No removal, crop, or concealment. |
| Flicker / blur | No gross flash or severe blur appears in inspected stills; fine temporal shimmer and blur require continuous playback approval and remain unverified. |
| Endpoint match | Similar pose, but small eyes/mouth/shirt differences. Endpoint similarity alone is insufficient for seam approval. |

Evidence: [full contact sheet](source/contact-sheet.jpg), [blink](source/blink-sequence.jpg), [expression](source/expression-sequence.jpg), [first/last comparison](source/first-last-comparison.jpg), [original photographic reference](source/original-photographic-reference.png). Audit frames are inspection evidence only, never an animation atlas.

## 4. Working previews

Production build, bound only to localhost:

- [A — Living video](http://127.0.0.1:4322/?mode=A) — default and recommendation.
- [B — Restrained frame motion](http://127.0.0.1:4322/?mode=B).
- [C — Cinematic environment](http://127.0.0.1:4322/?mode=C).
- [Development controls](http://127.0.0.1:4320/?mode=A&debug=1).
- [Evidence gallery](http://127.0.0.1:4320/report/index.html).

These are local server URLs, not hosted deployments. Reproduction instructions are in `README.md`. Production ignores `debug=1`. Preview images A/B/C were captured at the same 4.0-second source position; temporal comparisons must use the synchronized recording runs rather than unrelated video phases.

## 5. Rendering and realism restrictions

One standard HTML video plays natively with muted inline playback, original audio retained only in the local file. The complete opaque source frame is visible with exact 16:9 containment and no stretch, crop, segmentation, mesh, optical flow, generated face, face-light overlay, eye manipulation, cursor seeking, or frame selection. Static fallback/poster is the first source frame. The only `currentTime` writes in the app are the reduced-motion reset to zero; QA scripts seek solely to synchronize captures.

Mode A has no animated frame or lighting movement. B translates the complete photograph. C keeps the photograph stationary and translates a broad gradient in the visible mount around it, plus the caption. Opaque video pixels cover the background; no claim of depth inside the baked-in studio is made. The rectangular source edge is intentional and visible rather than masked into a fake cutout.

## 6. Exact motion settings

| Setting | Value |
|---|---|
| Controller | Shared viewport-normalized X/Y, clamped −1…+1, no dead zone |
| Spring | Motion for React `motion/react`, mass 1, stiffness 300, damping 35 |
| Near-critical reference | Critical damping at stiffness 300/mass 1 ≈34.64 |
| Spring rest | `restDelta=0.0001`, `restSpeed=0.001` |
| B frame amplitude | X ±2 px, Y ±1.5 px |
| C environment | X/Y ±18 px, transform only |
| C caption | X ±3 px, Y ±2 px |
| All variants | Rotation 0°, scale 1; A/C video translation 0 |
| Exit behavior | Spring targets return to zero on exit, blur, cancellation, resize, or hiding |
| Touch / reduced motion | No parallax on coarse pointer; reduced motion shows still poster and pauses video |

Targets update in the pointer handler immediately through MotionValues, without pointer-driven React state, queued animations, or layout reads. Debug readout uses a ref subscription. Controls tune amplitudes, stiffness/damping, mode, enabled state and reduced-motion simulation; these are experiments, and nondefault spring settings require revalidation. The verified default showed no overshoot beyond normalized bounds.

Library API basis: [MotionValues](https://motion.dev/docs/react-motion-value), [useSpring](https://motion.dev/docs/react-use-spring). Installed compatible version is Motion 12.23.24, pinned in the isolated lockfile; no claim of latest package version is made. A live media-query subscription handles runtime reduced-motion changes because the installed convenience hook did not update in the executed test.

## 7. Repeatable cursor trajectories

`scripts/browser-qa.mjs` runs identical timed paths after resetting each source to zero: slow/normal horizontal sweeps, slow vertical sweep, diagonal, small clockwise/counterclockwise closed paths, medium/large/offset paths, rapid reversals, stationary pointer, and exit/return. These primary closed paths are circular in normalized coordinates and elliptical in screen pixels.

`scripts/circles.mjs` additionally records **true pixel circles** at 1440×900: radius 65 px clockwise, radius 65 px counterclockwise, radius 160 px, radius 350 px, and radius 115 px around offset center (1000,280). Each completes over 2.4 seconds at normal speed, with the same source reset and path order for A/B/C. Mouse command scheduling has ordinary automation jitter; the runs are not hardware-genlocked. [Circle samples](circles.json).

## 8. Browser recordings

| Mode | Full cursor suite and ≥3 loop seams | True pixel-circle recording |
|---|---|---|
| A | [31.56 s WebM](recordings/mode-A-paths-and-three-loops.webm) | [13.36 s WebM](recordings/mode-A-pixel-circles.webm) |
| B | [31.28 s WebM](recordings/mode-B-paths-and-three-loops.webm) | [12.88 s WebM](recordings/mode-B-pixel-circles.webm) |
| C | [31.28 s WebM](recordings/mode-C-paths-and-three-loops.webm) | [13.08 s WebM](recordings/mode-C-pixel-circles.webm) |

[Native-resolution raw source, three cycles](recordings/source-native-three-cycles.webm) (32.8 s including setup). Playwright recording is a browser screen recording, not the source's photographic frame rate. See [FFprobe recording manifest](recording-manifest.json). No screenshot is substituted for these temporal artifacts. The recordings do not themselves constitute human perceptual signoff.

## 9. Loop investigation

Raw source: three observed wraps in 31.5 seconds of 1× native playback, 757 total video frames reported, zero dropped. `timeupdate` wrap samples are coarse and unsuitable for latency measurement.

Each primary A/B/C recording crossed three seams, independently observed with `requestVideoFrameCallback`: last presented media time 9.958333 s → first 0 s. Callback gaps were about 49.9–66.7 ms versus the 41.67 ms source frame interval. Callback timing is quantized/scheduled by the browser, not a direct photon or decoder latency measurement; it still does not support a perfect-seam claim.

At 480×270 grayscale, last→first mean absolute pixel difference was 1.129/255; adjacent-frame median 0.517 and p95 1.969. The seam is about 2.18× the adjacent median, below the p95 of within-clip differences. This supports relatively close endpoints, not velocity continuity. Head/eye/mouth/collar details differ slightly. Continuous perceptual loop acceptance remains open.

No shorter derived loop, reverse playback, ping-pong, facial crossfade, or removed expression segment was introduced. There is no justified evidence that a trim would improve pose *and* motion continuity. Pause holds a photographic video frame; reduced motion uses the first source frame. If the raw loop is distracting, the original static photo is preferred over hiding a discontinuity. [Difference data](source/frame-differences.json), [raw playback](source/raw-playback-results.json).

## 10. Expression-change assessment

The 6.4–7.4 s dense sequence shows the mouth opening enough to reveal teeth and then closing. This is visibly more conversational than a neutral resting portrait and repeats every ten seconds. The blink around three seconds is much less concerning. The head tilt is also conspicuous. None is cursor-controlled. These events are preserved and explicitly prevent a blanket GO pending normal-speed approval.

## 11. Photographic comparison and recommendation

| Variant | Judgment |
|---|---|
| Original still | Strongest unprocessed texture/identity reference; no expression or loop distraction. Remains the production fallback/reference. |
| A | Best living-video presentation: visual attention stays with the source; still subject to source-level differences and temporal approval. |
| B | Technically continuous, bounded and settled, but whole-photo movement offers no demonstrated realism gain. Do not prefer it because it responds to a pointer. |
| C | Environment is genuinely visible outside the opaque video and does not alter facial pixels. The broad gradient also emphasizes the mount; it does not beat A in the independent visual review. |

No claim that every living variant is definitively worse overall than the static photograph is justified by the available temporal review. Conversely, no claim that video exceeds the still's fidelity is justified. The independent review allows the isolated experiment to ship for local review with a CONDITIONAL verdict, and does not clear promotion. [Independent assessment](independent-review.md).

## 12. Playback and loading measurements

Chrome {browser['browser']}, headless, local files, dev server, 1440×900. `readyMs` measures effect setup → first presented-frame callback, not a full cold navigation or network benchmark. A ran before B/C; subsequent asset caches were warm, so readiness numbers are not a mode-performance ranking.

| Mode | Playback quality total frames | Dropped | Video callbacks | Ready ms | Three seam callback gaps ms |
|---|---:|---:|---:|---:|---|
{chr(10).join(rows)}

All had autonomous native playback independent of cursor movement. Median positive source media-time step is approximately 1/24 s. Playback quality counters and callback counts have different definitions and include setup/buffering, hence they are not expected to match exactly. An earlier exploratory capture reported 2 dropped frames in C; the final complete recording and separate performance runs reported zero. Zero in one local run is not a device-wide guarantee. [Full results](browser-results.json).

## 13. Cursor responsiveness and settling

Actual pointer events drove a near-corner step, sampled through animation callbacks. The first collected sample was about {step[0]['ms']:.1f} ms after the sampling start and already at {step[0]['spring'][0]*100:.1f}% normalized displacement; this is a sampled software response, not onset latency. Approximate first observed threshold crossings: 50% {thresholds['0.5']} ms, 90% {thresholds['0.9']} ms, 95% {thresholds['0.95']} ms, 99% {thresholds['0.99']} ms.

The sampled default response did not exceed normalized bounds. All mode exits settled within 0.01 of zero after 800 ms. A separate stationary check found exactly zero sampled drift after settling, and disabling motion neutralized both axes. Production DOM matrices verified B movement within limits, A/C stationary portrait transforms, and C's nonzero two-axis environmental response. These verify controller behavior, not the aesthetic benefit of circular interaction. [Production/settling results](production-check.json).

## 14. Responsive results

| Viewport | Complete source frame (CSS px) | Horizontal overflow | Pointer environment |
|---|---|---|---|
{chr(10).join(responsive_rows)}

All were browser-tested for a 16:9 ratio within 0.001, in-bounds geometry, full hair/forehead/source shoulders and no horizontal overflow. Full-frame B transforms fit inside the surrounding margins. Mobile emulation ignores touch for tracking and leaves the composition stable. At 390×844 the face is deliberately small, with large vertical negative space; preserving landscape composition limits immersion. No physical phone or Safari was tested. [Viewport captures](index.html#responsive).

## 15. Accessibility and fallback results

Executed browser checks passed: native labeled keyboard pause/resume; mode switching; simulated reduced motion; live operating-system reduced-motion emulation; video paused and poster visible when reduced; motion disabling; touch fallback; stationary settling; network-video failure leaves the source poster; simulated autoplay rejection recovers through explicit Play. Native form controls have labels and visible focus. Visibility pause/resume was tested through a controlled `document.hidden` simulation, not actual OS background-tab occlusion.

Computed palette contrast: ink `#303436` on studio `#b5b7b8` ≈6.25:1; on the darkest declared environmental endpoint `#9b9ea0` ≈4.67:1, above 4.5:1. A live pixel-by-pixel gradient contrast sweep and screen-reader session were not performed. Pause's small target remains an optional touch-polish improvement from the independent review.

## 16. Rendering performance and memory

Separate five-second normal-speed pointer runs without screen recording, dev build; Chrome CDP metrics. Durations are accumulated main-thread milliseconds over approximately five seconds, not single-frame cost or whole-device CPU percentage.

| Mode | rAF p50 / p95 / p99 ms | Task ms | Script ms | Layout ms | Style recalculation ms | JS heap MiB |
|---|---:|---:|---:|---:|---:|---:|
{chr(10).join(perf_rows)}

All three separate runs reported zero dropped video frames. B/C had about 300 style recalculations and one layout over five seconds; pointer transforms added style/script work without repeated layout. This is consistent with transform-based motion but does not directly measure GPU compositing, GPU memory, display scanout, or mouse-to-photon latency. rAF near 16.7 ms describes a roughly 60 Hz browser callback schedule. The source remains 24 unique photographic frames per second.

JS heap is a CDP estimate (roughly 5.7–6.2 MiB in these runs), excluding decoder buffers, browser process memory, images and GPU allocations. One 1920×1080 YUV420 frame requires roughly 3.1 MB of pixel storage; this is a format calculation, not measured total memory. Production JS is 352.23 kB / 112.10 kB gzip; CSS 3.05 kB / 1.34 kB gzip. One video element and one poster are used, with no runtime photographic atlas. [Measurements](performance.json).

## 17. Executed quality checks

- TypeScript: `rtk npm run typecheck` passed initially; final `rtk npm run build` also runs `tsc --noEmit` and passed.
- ESLint: `rtk npm run lint` passed after fixes.
- Production build: `rtk npm run build` passed.
- Controller tests: `rtk npm test` — 3 tests passed (mapping bounds/center/symmetry and safe mode parsing).
- Browser suite: all three trajectory/loop captures and five responsive sizes executed; targeted state checks passed on the final app.
- Extra true-pixel circle recordings, separate performance runs and production/settling checks executed successfully.
- Production preview returned HTTP 200 in Chrome; no debug panel or telemetry API exposed even with `debug=1`.
- Final state/production checks recorded no unexpected page runtime or console errors. A historical favicon 404 in a prior recording run was fixed with an inline icon; retained under `previousCaptureResourceErrors` rather than erased from history.
- Vite parent-file `/@fs/…/package.json` access returned 403.
- Impeccable mechanical detector ran once and returned `[]`; independent visual review completed. Design documentation saved only inside V20.

Failures found and corrected: impure telemetry initialization flagged by lint; insufficient loop wait after a dev reload; nonreactive library reduced-motion hook; network-error/autoplay-status race; favicon 404. Recordings cover the same final visual/motion implementation; targeted checks reran after the accessibility/fallback fixes. No claim is made of a single all-green monolithic run before those fixes.

## 18. Preservation and hygiene

Before work: {preservation['protectedFiles']:,} existing files hashed (SHA-256/size), including all original media, parent app/build outputs, frozen standalone variants, V14/V15/V18/V19, rollback artifacts and tsbuildinfo. After work: **zero changed, zero missing, zero added outside V20**. [Verification](preservation.json), [before inventory](protected-before.json). Parent `node_modules` was excluded from the content-hash sweep; all install/build/cache paths for V20 were isolated, and no parent install/build was run.

This directory and its ancestors are not a Git repository (`git rev-parse` returned that fact). No Git writes were performed; no accessible tags/rollback commits existed to enumerate or verify. Filesystem rollback artifacts were hashed and preserved.

Original source and runtime copy have matching hashes. No footage was uploaded, externally hosted, synthesized or reencoded for runtime use. Development root is V20 with explicit strict filesystem allowlist; production serves only V20 `dist`. Temporary raw-source server was stopped. The requested V20 preview servers remain running locally. No main portfolio promotion or protected-project change occurred.

## 19. Remaining limitations and acceptance gates

1. Full real-time human perceptual approval of native-size playback and at least three consecutive loops is still required. Automated playback plus sampled visual inspection does not satisfy that perceptual gate.
2. The source differs subtly from the original photo; fine temporal identity, shimmer and motion blur cannot be fully certified from samples.
3. Tilt and teeth-visible expression recur every ten seconds; watermark remains visible.
4. C does not beat A in visual review, so the requested GO criterion of meaningfully improved interactive cinematic presence is unmet.
5. Phone composition is small; real hardware, Safari/Firefox, screen readers, true OS occlusion, cold network loading and GPU profiling are untested.
6. No physical input-to-display latency or complete memory budget was measured. Spring values can be tuned in development, but defaults are the only validated configuration.

## 20. Final verdict and next decision

**CONDITIONAL — retain Mode A as the best living-video experiment; keep the original static photograph as the fidelity reference and production-safe choice.** B and C remain comparison variants. The frontend preserves source pixels and meets the tested interaction/fallback constraints; source/loop acceptance remains conditional. Do not promote V20 based on technical test success. If native-size normal-speed viewing finds the loop, mouth event or source likeness distracting, the decision becomes NO-GO for this footage and the original still should remain. No automatic replacement footage or architecture experiment is authorized by this report.

Tooling note: the parent Impeccable sidecar was already stale and was left untouched. Its optional `document` command can refresh it in a separate request. A newer Impeccable (v4.4.0) is available. Update now? It runs `npx impeccable update`. No skill update was performed.
'''
(report / 'REPORT.md').write_text(text)

sections = []
for mode in 'ABC':
    sections.append(f'''<section><h2>Mode {mode}</h2><p><a href="http://127.0.0.1:4322/?mode={mode}">Open production preview</a></p><img src="previews/mode-{mode}.png" alt="Mode {mode} at 4 seconds" loading="lazy"><h3>Cursor paths and three loops</h3><video controls preload="none" src="recordings/mode-{mode}-paths-and-three-loops.webm"></video><h3>True pixel circles</h3><video controls preload="none" src="recordings/mode-{mode}-pixel-circles.webm"></video></section>''')
responsive = ''.join(f'<figure><img src="previews/{w}x{h}.png" loading="lazy" alt="Complete frame at {w} by {h}"><figcaption>{w}×{h}</figcaption></figure>' for w,h in [[1920,1080],[1440,900],[1366,768],[1024,768],[390,844]])
(report / 'index.html').write_text('''<!doctype html><html lang="en"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V20 evidence gallery</title><link rel="icon" href="data:,"><style>body{font:16px/1.6 system-ui,sans-serif;max-width:1100px;margin:40px auto;padding:0 24px;background:#f1f2f2;color:#303436}a{color:inherit;text-underline-offset:3px}h1,h2,h3{line-height:1.25}section{margin:64px 0}img,video{display:block;width:100%;height:auto;margin:16px 0}figure{margin:40px 0}video{background:#b5b7b8}a:focus-visible{outline:2px solid;outline-offset:4px}</style><h1>V20 — review evidence</h1><p><strong>CONDITIONAL. Mode A preferred.</strong> C has not demonstrated an improvement over A. Source likeness, expression and perceptual loop approval remain open.</p><p><a href="REPORT.md">Full structured report</a> · <a href="independent-review.md">Independent visual review</a> · <a href="browser-results.json">Executed browser data</a> · <a href="performance.json">Performance measurements</a></p><p>Recordings run at normal speed. Start one at a time; simultaneous playback changes machine load. Cursor paths begin after resetting the source; setup durations vary. Video is independent of cursor motion. No anatomical head tracking.</p>''' + ''.join(sections) + '''<section><h2>Raw source: three native-resolution cycles</h2><video controls preload="none" src="recordings/source-native-three-cycles.webm"></video><h2>First / last frame</h2><img src="source/first-last-comparison.jpg" alt="Full first and last frames and face details"><h2>Blink sequence</h2><img src="source/blink-sequence.jpg" alt="Natural bilateral blink near 3 seconds"><h2>Expression sequence</h2><img src="source/expression-sequence.jpg" alt="Brief teeth-visible mouth opening around 6.6–7.1 seconds"></section><section id="responsive"><h2>Responsive captures</h2>''' + responsive + '</section></html>')
print('Wrote report/REPORT.md and report/index.html')
