from audit import BASE, save
import json, math, statistics, shutil, html
from pathlib import Path

read=lambda p:json.loads((BASE/p).read_text())
inventory=read('data/inventory.json'); primary=read('data/primary/frame-manifest.json');atlas=read('data/selected-image-manifest.json');qa=read('qa/browser-results.json');graph=read('data/continuity-graph.json');coverage=read('data/pose-coverage.json');formats=read('data/format-comparison.json');compat=read('data/secondary-compatibility.json');video=read('qa/recording-probe.json');physical=read('qa/physical-circle-results.json')
trials={t['name']:t for t in qa['trajectories']}; m=lambda n:trials[n]['panels']['B']
preservation=read('report/preservation-after.json') if (BASE/'report/preservation-after.json').exists() else None
def num(x,n=1):return f'{x:.{n}f}'
def pct(x):return f'{x*100:.1f}%'
def table(headers,rows):return '\n'.join(['| '+' | '.join(headers)+' |','| '+' | '.join(['---']*len(headers))+' |']+['| '+' | '.join(str(x) for x in r)+' |' for r in rows])
total=sum(v['frame_count'] for v in inventory);runtimebytes=sum(p.stat().st_size for p in (BASE/'public/frames').rglob('*.webp'))
response={tau:[r for r in qa['response'] if r['tau']==tau] for tau in [20,35,50]}
sourcegate=dict(verdict='NO-GO',scope='Natural two-dimensional cursor tracking across arbitrary circular trajectories',reason='The primary preserves the strongest photographic identity, but its upper interior and blink-covered return lack compatible intermediate poses. Normal circles visibly jump up to 33 estimated degrees and hold missing regions. No compatible secondary repair passed the static adjacent-photograph gate.',promoted=False,selected_sources={atlas['primary']:197},selected_secondary=0,browser_engineering_checks_passed=qa['passed'],method_limits='Uncalibrated pose estimates, hand-reviewed source photographs, one local Chrome/macOS machine. No claim of a physical pose ground truth, actual process/GPU memory measurement, all-secondary-frame manual inspection, exhaustive secondary-source impossibility, or 60fps photographic motion.')
save('report/source-quality-gate.json',sourcegate)
parts=[f'''# V24 — Primary-video photographic cursor tracking

**NO-GO for natural two-dimensional tracking across arbitrary circles.** The isolated prototype works, preserves the preferred primary video's photographic character, and exposes usable directional photographs. It does not demonstrate the required continuous circular head response. The recording shows held poses and abrupt source-image changes; adding smoothing or PixiJS would not supply the missing photographs. Nothing is promoted.

This verdict is specific to the requested general cursor experience. Portions of the actual primary trajectory are graceful, the lower arc contains naturally visible downward irises, and small movements are stable. Those successes are retained as working inspection modes rather than discarded.

## Preview and evidence

- [A — chronological extracted-image reference](http://127.0.0.1:4324/?mode=A)
- [B — primary-only cursor atlas](http://127.0.0.1:4324/?mode=B)
- [C — reviewed repair atlas](http://127.0.0.1:4324/?mode=C)
- [B/C — identical-input side-by-side comparison](http://127.0.0.1:4324/?compare=1)
- [Evidence page](http://127.0.0.1:4324/evidence/)
- [58.2-second normal-speed B/C circular recording](../qa/recordings/circular-B-vs-C.webm), [actual mouse circle recording](../qa/recordings/real-mouse-circles-B.webm), [chronological A recording](../qa/recordings/chronological-A.webm)

C has **zero approved secondary repairs**, so it intentionally uses B's approved primary library. The comparison does not claim a repair advantage. D was not added: B/C did not pass the source-quality gate. The requested 20/35/50ms values were nevertheless compared once, as part of the controller evaluation.

## Isolation and preservation

All generated scripts, images, manifests, source audit, browser assets, recordings and reports reside in `v24-primary-video-cursor-tracking`. The baseline fingerprints **37,414 pre-existing files, 7,095,630,738 bytes**, including all original MP4s, the root implementation, frozen standalone prototypes, V14/V15, V18/V19/V20, dependencies and rollback assets. The final preservation result is `{preservation['passed'] if preservation else 'pending final scan'}`; see [preservation-after.json](preservation-after.json) and the complete [baseline](preservation-before.json). The supplied folder has no `.git` directory; there are no local commits/tags to enumerate or modify. Existing rollback files are protected by the byte comparison.

Node modules are reused through a V24-local symlink to the existing V20 installation, read-only in this experiment; Vite cache is explicitly redirected into V24/data. Python uses the existing V18 environment with bytecode writing disabled; the official model is copied into V24 and freshly run on V24's independent extractions. No earlier audit result is used as the new measurement. Package and Python lockfiles are retained locally. No original MP4 is served to the renderer or changed.

## Complete original-video inventory

Root discovery found **19 independent original candidates and one excluded derived V20 preview**. Original provenance is inferred from descriptive Google Flow download filenames and visuals, not verified against an external generation account. All 19 are 1920×1080 H.264 sources at the original 24/1 FPS. Source s07 has 239 decoded frames; every other candidate has 240. Total: **{total:,} native JPEGs**, including **240 primary** and **4,319 secondary**. The exclusion and its checksum are retained in [excluded-videos.json](../data/excluded-videos.json).

All frames were extracted with FFmpeg `-map 0:v:0 -fps_mode passthrough -q:v 1 -start_number 0`. There is no FPS filter or resampling. Native primary photographs are `data/primary/original-jpg/frame_000000.jpg` through `frame_000239.jpg`; each secondary source has its own original-jpg folder. Original FFprobe presentation timestamps and native dimensions are preserved in [inventory.json](../data/inventory.json) and [source-frame-manifest.json](../data/source-frame-manifest.json).
''']
parts.append(table(['ID / filename','Duration / frames','SHA-256'],[[f"{v['id']} · {v['filename']}",f"{v['duration']:.6f}s / {v['frame_count']}",v['sha256']] for v in inventory]))
parts.append('''
The full machine-readable inventory also includes FPS, resolution, codec, source bytes and extracted bytes. [CSV](source-inventory.csv).

## Primary-video frame audit and actual sequence

All **240** primary photographs were quantitatively measured and visually inspected across [eight chronological sheets](contact-sheets/primary-all/000000.jpg), each showing 30 individual frames, plus enlarged eye, directional and compression comparisons. [Per-frame audit CSV](primary-frame-audit.csv), [full annotated primary manifest](../data/primary/frame-manifest.json), [visual review record](../data/visual-review.json).

MediaPipe measures canonical-model Euler yaw/pitch/roll, eye aspect ratios, blink blendshape scores, relative iris positions, facial landmarks, face scale/translation, expression proxies, sharpness and temporal pixel differences in face/beard, collar, shoulder and background regions. Every row retains its original index and timestamp. Region MAE and landmarks are screening proxies; they are not calibrated body pose, identity verification or a proof of photographic compatibility. The pose signs were checked against visible nose and cheek orientation. Eye direction is recorded separately from head orientation.
''')
parts.append(table(['Primary frames / time','Actual visual sequence and limitation'],[[f"{r['start']}–{r['end']} / {r['start']/24:.3f}–{r['end']/24:.3f}s",r['note']] for r in read('data/visual-review.json')['primary_ranges']]))
parts.append(f'''
Raw estimates span yaw **{min(r['yaw'] for r in primary):.1f}° to {max(r['yaw'] for r in primary):.1f}°**, pitch **{min(r['pitch'] for r in primary):.1f}° to {max(r['pitch'] for r in primary):.1f}°**, and absolute roll at most **{max(abs(r['roll']) for r in primary):.1f}°**. Neutral itself measures yaw {primary[0]['yaw']:.2f}°, pitch {primary[0]['pitch']:.2f}°, roll {primary[0]['roll']:.2f}°. These systematic offsets make relative-to-neutral interpretation necessary. No roll is manufactured or substituted for yaw.

## Coverage, nine directions and missing interior

![Measured primary pose coverage](pose-coverage.png)

The source traces a broad perimeter and a shallow lower path. Strongest regions are left yaw, upper-left arc, upper sweep and the right-to-lower arc along their recorded trajectories. DOWN is a modest real chin lowering with visible downward irises; it is not a deep open-eye look downward. Missing or weak regions include the central upper interior, neutral-to-UP bridge, portions of the right/central interior and the blink-covered late lower-left return. Independent gaze shifts near frames 56–64 remain visible even while the head path is graceful.

The runtime requests −28° to +30° yaw relative to neutral, +18° upward pitch and only −5° downward pitch. This asymmetric mapping reflects the source; it does not establish a symmetric physical motion range. Coverage proximity on a 41×41 grid is {coverage['supported_fraction']*100:.1f}% under the explicit .23 yaw/30, pitch/18 distance gate. **This is not a smoothness score:** a near photograph can still belong to a disconnected path or have different eyes. The circular tests below expose that distinction.

![Nine source photographs](nine-direction-photographs.jpg)
''')
parts.append(table(['Requested direction','Nearest reference frame','Estimated raw yaw / pitch','Distance gate error'],[[name,a['frame'],f"{a['actual_yaw']:.1f}° / {a['actual_pitch']:.1f}°",f"{a['error']:.3f}"] for name,a in atlas['anchors'].items()]))
parts.append('''
Each direction has its own 18-photo [direction contact sheet](contact-sheets/directions/CENTER.jpg). Browser-selected indices are retained in qa/browser-results.json and direction screenshots; continuity and hysteresis can pick a nearby photograph rather than exactly the static nearest reference above. Nine visible endpoints do not establish valid transitions between them.

## Eye, blink and gaze anomalies / DOWN decisions

![Eye distinction](eye-blink-gaze-comparison.jpg)

Full blinks are visually confirmed at primary frame 12 (0.500s) and frames 199–201 (8.292–8.375s). Their minimum eye-aspect ratios are roughly .013–.032 and the irises are not usefully visible. Frames 11–15 and 198–205 include closure or partial reopening and are omitted from tracking. The intervening lower arc, roughly frames 136–197, contains visible irises directed downward under narrowed upper lids. This is natural downward gaze plus eyelid narrowing / pitch occlusion, not a continuous blink. Its eye measurements must not be treated as the same class as the full closures.

Primary f163 is the nearest reference DOWN photograph and is a mild preference over f164: nearly the same pose with slightly more visible eyes. Browser continuity can settle on f164 after a transition; it is still a valid visible-iris photograph, not an asserted eye repair. Neither is represented as fully forward-looking eyes. Other nearby primary frames cannot fill the late blink return without changing gaze/roll or making a larger head jump. The excluded frames are not blindly stitched over as if the path were repaired.

The iris proxy is especially unreliable while the eyes close; large vertical jumps near frames 11–13 and 197–203 partly reflect occlusion, not measured eye rotation. On the upper sweep, eyes move independently ahead of head yaw around frames 56–64. The overall source has more than one defect; downward visibility is not the only gate.

No eyes were pasted, independently animated, inferred or synthesized. No face morphing or facial crossfade is used. [DOWN decisions](../data/down-repair-decisions.json).

## Secondary-source compatibility investigation

All 4,319 secondary frames were freshly screened. For each of 18 sources, the best matching eyes-visible candidate for DOWN, LOWER-LEFT and LOWER-RIGHT was compared against primary f164, f184 and f149 respectively: **54 matched-source comparisons**. The six repair contact sheets show these candidates, alongside their primary references. This is not a claim that every secondary photograph was manually inspected. Some candidates are poor yaw matches because that clip has no appropriate direction at all; they remain visibly rejected.

Numerical matching includes yaw/pitch, landmark displacement, gaze, roll, face-scale ratio, face/beard texture MAE, collar, shoulder and background differences. Actual photographic character controls approval. The decision below applies to the entire source's repair investigation, with individual candidate metrics in [secondary-compatibility.json](../data/secondary-compatibility.json). No candidate passed the adjacent-photograph review strongly enough to justify insertion; no runtime repair was claimed or silently swapped in.
''')
parts.append(table(['Source','Best tested DOWN candidate','Decision / visual reason'],[[c['source'],f"frame {c['frame']} ({c['filename']})",c['visual_reason']] for c in compat if c['target']=='down']))
parts.append(f'''
## Selected image library and photographic continuity graph

**197 selected primary photographs, zero secondary photographs; 100% primary source.** Selection omitted redundant neutral holds and the two visibly blink-covered paths; there was no target count or source quota. Runtime files preserve the original aspect ratio and complete source composition, including full hair, forehead, beard, white shirt and source watermark.

[Selected manifest](../data/selected-image-manifest.json) retains filename, original frame, source timestamp, pose, gaze, expression, eye measurements, source quality and neighbors. [Continuity graph](../data/continuity-graph.json) contains {len(graph['nodes'])} nodes, {len(graph['edges'])} compatible screening edges and {len(graph['components'])} components (sizes: {', '.join(str(len(c)) for c in graph['components'])}). Edges prefer consecutive or nearly consecutive primary frames and assess angular, landmark, gaze, roll, scale, expression, face/beard, collar and background changes. The declared cross-source penalty is 30, but no secondary node was approved. These threshold-dependent components are evidence of weak sampling, not ground-truth anatomical connectivity.

The selector does not traverse shortest paths or queue video-like playback. Neighbor-aware selection and continuity-aware scoring only choose photographs near the current target. Disconnected nearby regions can still change discretely; the controller exposes that limitation. A target without a nearby valid source pose holds the last photograph instead of taking an unrelated head excursion. The source-quality gate fails rather than disguising these jumps.

## Compression and bounded loading

Native lossless references are retained for {len(list((BASE/'data/primary/lossless-png').glob('*.png')))} shortlisted poses. Runtime images are encoded directly from decoded original video RGB, not recompressed from audit JPEGs. The library has 240 960×540 WebPs for chronological reference and 197 1280×720 WebPs for selected-pose detail, totaling {runtimebytes/1048576:.1f} MiB on disk. No source is upscaled to manufacture detail. The browser never decodes the full-resolution extraction collection.

![Format comparison](format-comparison.jpg)
''')
formatrows=[]
for width in [960,1280]:
    for fmt in ['jpg','webp','png']:
        a=[x for x in formats if x['width']==width and x['format']==fmt]
        formatrows.append([width,fmt,f"{statistics.median(x['bytes'] for x in a):,.0f}",'lossless' if fmt=='png' else f"{statistics.median(x['face_psnr_db'] for x in a):.2f} dB"])
parts.append(table(['Width','Format','Median bytes / shortlisted image','Median face PSNR vs downsampled lossless RGB'],formatrows))
parts.append('''
WebP q92 at 960×540 is the default balance; JPEG q94 has higher measured fidelity but roughly 2.7× the median size. PNG is a lossless reference to the already video-compressed decoded RGB. 1280×720 preserves more small facial texture at higher memory/decode cost; it is available in Inspect and was browser tested. Per-frame format metrics and native JPEG-vs-PNG quality checks remain in data. The visual comparison is diagnostic, not a synthetic retouch.

Each panel has a 24-slot image cache, including decode reservations, and at most two concurrent loads/decodes. It pins the displayed, requested and neutral photographs, replaces speculative pending work on reversal, preloads likely graph neighbors, closes evicted ImageBitmaps and cancels fetches on disposal. No whole-collection preload occurs: initial readiness requests only five images. Browser memory bounds are nominal decoded RGBA estimates; they exclude canvas backing stores, compressed response cache, browser internals and driver memory. Actual process/GPU memory was not measured.

## Cursor controller and smoothing comparisons

Both normalized viewport axes determine requested yaw/pitch. Motion for React MotionValues and its animation-frame scheduler update a frame-rate-independent exponential coordinate smoother, `1 - exp(-dt/tau)`, at the requested 20/35/50ms time constants. Canvas 2D copies one extracted photograph atomically. There is no video element, time seeking, automatic source playback, photographic interpolation, artificial image rotation or ghosting crossfade.

35ms remains the diagnostic default. Increasing it to 50ms did not reduce the large source jumps, and increased coordinate settling delay. Smaller cursor motions use a small neutral dead zone and selection hysteresis; stationary tests showed no selection chatter. Reduced motion disables passive tracking and permits deliberate static targets. Touch starts only on the photograph, follows a deliberate drag and resets on release/cancellation. Pointer exit, blur, resize and document hiding reset to neutral.
''')
parts.append(table(['Smoothing tau','Normal-circle changes / large jumps','Unsupported fraction','Measured coordinate settling to within .1 of step input'],[[tau,f"{m(f'smoothing-{tau}')['selectionChanges']} / {m(f'smoothing-{tau}')['largeJumps']}",pct(m(f'smoothing-{tau}')['unsupportedFraction']),f"{min(r['withinPointOneInputMs'] for r in response[tau]):.1f}–{max(r['withinPointOneInputMs'] for r in response[tau]):.1f} ms"] for tau in [20,35,50]]))
parts.append('\n'+table(['Selection policy','Normal-circle changes','Large jumps >5°','Unsupported fraction'],[[strategy,m(f'selector-{strategy}')['selectionChanges'],m(f'selector-{strategy}')['largeJumps'],pct(m(f'selector-{strategy}')['unsupportedFraction'])] for strategy in ['nearest','neighbor','continuity']]))
parts.append('''
Continuity/hysteresis slightly reduces selection changes; none of the three policies fills the source gaps. No extended tuning loop or PixiJS migration is justified. First visible image-change response in the 35ms step tests ranged about 8–65ms, but this is not guaranteed arrival at an exact target orientation. Decode readiness, selection thresholds and missing poses affect it. The separate continuous-input “input age” field in traces is sampling age, not total head-tracking lag.

## Real browser and circular-motion evidence

Installed real Chrome was used against the optimized production build. All five requested viewports were tested: 1920×1080, 1440×900, 1366×768, 1024×768 and 390×844. At every size, all nine directional targets reached correctly signed source photographs, the full canvas composition remained 16:9, no horizontal overflow occurred, no MP4/video element loaded, exit returned to neutral and stationary selection did not chatter. Desktop and mobile captures are retained in qa. Mobile touch input was dispatched through Chrome's native touch protocol; reduced-motion settings used browser emulation.

The main 58.2s normal-speed recording is 1440×900 VP9 at 25 capture FPS, with B and C side by side. Its deterministic circle inputs run on browser animation frames with real elapsed wall time, ensuring identical cursor trajectories for both panels. A second recording uses actual Playwright/Chrome mouse moves for small clockwise, medium counterclockwise, large clockwise and offset circles. A third records user-initiated chronological A. A displays all 240 original-order photos once at the original 24fps timing, with no autoplay or loop; the trace captured every one of those 240 photographs.

![Actual requested and displayed paths](circular-coverage.png)
''')
pathnames=['small-clockwise','small-counterclockwise','medium-clockwise','medium-counterclockwise','large-clockwise','large-counterclockwise','offset-upper','offset-lower','slow-circle','normal-circle','rapid-reversals','small-movement','horizontal-sweep','diagonal-sweep']
parts.append(table(['Trajectory','Radius / cycles / duration','Image changes','Missing-pose hold','Large jumps','Largest estimated jump'],[[name,f"{trials[name].get('radius','—')} / {trials[name].get('cycles','—')} / {trials[name]['duration']/1000:g}s",m(name)['selectionChanges'],pct(m(name)['unsupportedFraction']),m(name)['largeJumps'],f"{m(name)['maxAngularJumpDeg']:.1f}°"] for name in pathnames]))
parts.append('''
Small radius .15 circles use only 5–6 distinct photographs over two revolutions, with holds around 0.7s; they are stable but not convincingly continuous circular head movement. Radius .035 stays neutral by design. Medium circles hold unsupported poses for about 34–35% of the samples and jump up to 27°. Large circles hold about 15% and jump up to 31°. The upper-offset circle is unsupported for about 80% and mostly holds. The lower-offset circle is more coherent but still stepped. Rapid reversals respond without queued playback, yet can jump roughly 19° because the needed orientations are absent along the input line.

![Largest actual displayed jumps](largest-visible-jumps.jpg)

The normal-circle trace includes f73 → f142, a roughly 33° angular separation, with a conspicuous upward-to-right/downward photographic change. Similar jumps are visible in the actual screen recording filmstrips, not merely in a selector simulation. Four [recording filmstrips](recording-filmstrips/0000.jpg) sample the entire B/C recording at .75s intervals; the full file preserves exact timing and both panels. These source-image jumps fail natural circular coherence even though identity stays primary-only and there are no cross-source switches or blended eyes.

## Actual performance, loading and memory
''')
parts.append(table(['Measured case','Render FPS','p95 frame interval / work','p95 bitmap decode','Frames waiting for requested image','Peak nominal decoded memory'],[[name,f"{m(name)['renderFPS']:.2f}",f"{m(name)['frameMsP95']:.2f} / {m(name)['renderCostMsP95']:.2f} ms",f"{m(name)['cache']['decodeMsP95']:.2f} ms",pct(m(name)['cacheWaitFraction']),f"{m(name)['cache']['peakNominalBytes']/1048576:.2f} MiB / panel"] for name in ['small-clockwise','medium-clockwise','large-clockwise','normal-circle','rapid-reversals','sharp-1280']]))
parts.append(f'''
Primary neutral readiness across the five viewport runs was {min(v['metrics']['readyMs'] for v in qa['viewports']):.1f}–{max(v['metrics']['readyMs'] for v in qa['viewports']):.1f}ms after panel initialization on this local machine; this excludes navigation and is not a cold-network guarantee. All browser measurements ran on one desktop Chrome/macOS setup, including emulated mobile dimensions and touch. Physical mobile hardware was unavailable.

At 960×540, the 24-slot cache limit is 49,766,400 bytes = **47.46 MiB per panel**, or 94.92 MiB for B/C together. The 1280×720 option reaches 88,473,600 bytes = **84.38 MiB per panel**. Canvas backing stores add about 1.98 MiB and 3.52 MiB per panel respectively. No decoded-cache bound was exceeded, no image load error occurred in successful trajectory runs, and failure recovery was separately verified. Decode stalls are not zero: rapid reversals waited for a requested image in roughly 15% of sampled render frames, generally retaining the previous valid photo. The short 24-slot budget and speculative cache churn remain engineering tradeoffs, explicitly visible in the trace's evictions and decode counts.

Renderer cadence near 60 FPS does **not** mean 60fps photographic head animation. Actual selection changes, unique image counts, held periods, angular jumps, decoder waits and target-to-visible information are recorded independently. Source filename and original image index are present for every captured render sample in qa/trace-*.json. Samples are bounded to 12,000 per panel during normal use.

## QA and review

- TypeScript, ESLint and optimized Vite production build: passed. Exact command results are retained in qa/checks.json.
- 20 controller/manifest unit tests: passed, including both axes, nine directions, original timestamps, source integrity, missing-region fallback, stationary hysteresis, immediate coordinate reversal, circular limitations and B/C equivalence when repairs are empty.
- Native extraction integrity: all 4,559 JPEGs verified for frame number, source timestamp and 1920×1080 dimensions; all 19 original checksums match. Runtime images verified at 960×540 and 1280×720. [Integrity results](../qa/integrity-results.json).
- Browser responsive, nine-direction, exit, stationary, touch, reduced-motion, error/retry, source reference and 21 trajectory/comparison cases: passed their engineering assertions. [Browser results](../qa/browser-results.json).
- Four additional actual mouse circle paths: recorded with visible-image traces in qa/physical-circle-results.json.
- Independent UI review: **ship at isolated UI scope**, with no material findings. [UI review](ui-review.md). This does not pass the photographic gate. The mechanical detector returned an empty finding list. [Design documentation](design-documentation.md).
- Protected-file preservation: **{'PASS' if preservation and preservation['passed'] else 'pending final scan'}**. See preservation-after.json; no source or prior implementation is promoted or overwritten.

Browser testing corrected a controller bug that ignored pointer movement over toolbar controls. The final successful run covers the corrected implementation. An earlier test also erroneously moved outside the viewport at the exact width/height coordinates; its coordinates were corrected to the last actual pixel without changing directional acceptance. No test was weakened to accept incorrect yaw, missing assets or unbounded memory.

## Remaining limitations and recommendation

The preferred source remains the strongest identity and expression anchor and retains its graceful actual arcs. Its sparse two-dimensional interior, shallow downward excursion, independent gaze shifts, blink-covered left return and small natural roll cannot be repaired by choosing a different smoothing constant. Cross-video photographs tested here do not offer a visually convincing complete replacement transition. Their more open eyes alone are not grounds for source switching.

Keep V24 as a source-inspection and constrained-pose experiment. Do not promote it as natural arbitrary-circle tracking. The demonstrated lower and outer arc regions could support a deliberately constrained interaction, but the present general-cursor specification is **NO-GO**. No new Google Flow video, synthetic face, independent eyes or fabricated pose was created. Further source acquisition or a changed interaction brief would be separate authorized work; this experiment performs neither automatically.

Method references: [MediaPipe Face Landmarker Python](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/python), [FaceLandmarkerResult fields](https://ai.google.dev/edge/api/mediapipe/python/mp/tasks/vision/FaceLandmarkerResult), [Motion animation-frame hook](https://motion.dev/docs/react-use-animation-frame), [Motion values](https://motion.dev/docs/react-motion-value). These document the tools; source-coverage and performance conclusions above come from this experiment's own files and browser measurements.
''')
report='\n\n'.join(parts);(BASE/'report/REPORT.md').write_text(report)

summary=dict(verdict='NO-GO',total_original_sources=19,excluded_derived=1,total_jpegs=total,primary_jpegs=240,primary_reviewed=240,selected_primary=197,selected_secondary=0,primary_percent=100,pose_components=len(graph['components']),medium_circle_unsupported=pct(m('medium-clockwise')['unsupportedFraction']),normal_circle_max_jump_deg=m('normal-circle')['maxAngularJumpDeg'],peak_decoded_960_bytes=49766400,peak_decoded_1280_bytes=88473600,engineer_qa_pass=qa['passed'],recording_seconds=video['duration'],preserved=preservation['passed'] if preservation else None)
save('report/summary.json',summary)
evidence=BASE/'public/evidence';evidence.mkdir(parents=True,exist_ok=True)
for name in ['pose-coverage.png','nine-direction-photographs.jpg','circular-coverage.png','eye-blink-gaze-comparison.jpg','largest-visible-jumps.jpg','format-comparison.jpg','REPORT.md','summary.json','source-inventory.csv','primary-frame-audit.csv']:
    shutil.copyfile(BASE/'report'/name,evidence/name)
for name in ['browser-results.json','integrity-results.json','recording-probe.json']:
    if (BASE/'qa'/name).exists():shutil.copyfile(BASE/'qa'/name,evidence/name)
for name in ['preservation-after.json','source-quality-gate.json']:
    if (BASE/'report'/name).exists():shutil.copyfile(BASE/'report'/name,evidence/name)
rec=evidence/'recordings';rec.mkdir(exist_ok=True)
for p in (BASE/'qa/recordings').glob('*.webm'):shutil.copyfile(p,rec/p.name)
for p in (BASE/'report').glob('poster-*.jpg'):shutil.copyfile(p,evidence/p.name)
page=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V24 — evidence</title><style>body{{font:15px/1.6 system-ui,sans-serif;background:#edf0ec;color:#20382e;max-width:1120px;margin:auto;padding:30px 22px}}h1{{font-size:28px}}h2{{margin-top:42px}}a{{color:#164b37;text-underline-offset:3px}}img,video{{display:block;width:100%;height:auto;margin:20px 0}}table{{width:100%;border-collapse:collapse;font-size:13px}}td,th{{text-align:left;border-bottom:1px solid #bdc9c0;padding:9px}}.scroll{{overflow-x:auto}}nav{{display:flex;gap:16px;flex-wrap:wrap}}p{{max-width:80ch}}button:focus-visible,a:focus-visible{{outline:2px solid #164b37;outline-offset:4px}}</style></head><body><h1>V24: photographic tracking evidence</h1><p><strong>NO-GO for natural tracking across arbitrary circles.</strong> All 240 preferred-source frames were audited. The 197-photo atlas preserves the primary identity, but missing intermediate poses cause held orientations and visible jumps. No secondary repair passed. Nothing is promoted.</p><nav><a href="/?mode=A">A · Source</a><a href="/?mode=B">B · Primary</a><a href="/?mode=C">C · Repairs</a><a href="/?compare=1">B / C</a><a href="REPORT.md" download>Full report</a><a href="source-inventory.csv">Source inventory</a><a href="primary-frame-audit.csv">240-frame audit</a></nav><h2>Normal-speed identical-input comparison</h2><p>B and C deliberately use the same primary atlas: zero secondary repairs were approved. This recording shows the real browser result, including holds and jumps. Capture is 25fps; render cadence is approximately 60fps. Neither implies 60fps photographic motion.</p><video controls preload="metadata" src="recordings/circular-B-vs-C.webm"></video><h2>Actual mouse circles</h2><video controls preload="metadata" src="recordings/real-mouse-circles-B.webm"></video><h2>Requested vs displayed paths</h2><img loading="lazy" src="circular-coverage.png" alt="Actual cursor traces show missing upper interior regions and discrete photo jumps"><div class="scroll">{table(['Trajectory','Changes','Unsupported','Large jumps'],[[n,m(n)['selectionChanges'],pct(m(n)['unsupportedFraction']),m(n)['largeJumps']] for n in pathnames])}</div><h2>Primary pose coverage</h2><img loading="lazy" src="pose-coverage.png" alt="Measured primary pose trajectory with sparse interior"><h2>Nine directional photographs</h2><img loading="lazy" src="nine-direction-photographs.jpg" alt="Nine approved primary reference photographs"><h2>Eyes: downward gaze and full blinks</h2><img loading="lazy" src="eye-blink-gaze-comparison.jpg" alt="Visible downward irises contrasted with full blink frames"><h2>Visible transition failures</h2><img loading="lazy" src="largest-visible-jumps.jpg" alt="Before and after source photographs from the largest actual browser jumps"><h2>Chronological reference</h2><p>All 240 extracted photographs, explicitly played once at original timing. The cursor atlas never plays or seeks an MP4.</p><video controls preload="metadata" src="recordings/chronological-A.webm"></video><h2>Compression reference</h2><img loading="lazy" src="format-comparison.jpg" alt="Lossless PNG, high-quality JPEG and WebP reference comparison"><h2>Validation</h2><p>TypeScript, lint, 20 unit tests, all five viewport sizes, touch, reduced motion, failure recovery and production build pass engineering checks. Photographic acceptance fails. Nominal decoded-image cap is 47.46 MiB per panel at 960px, 84.38 MiB at 1280px. Actual browser process/GPU memory was not measured.</p><nav><a href="browser-results.json">Browser measurements</a><a href="integrity-results.json">Frame integrity</a><a href="preservation-after.json">Preservation</a><a href="source-quality-gate.json">Source-quality verdict</a></nav></body></html>'''
# Render this one explicit table as semantic HTML, not raw Markdown.
mdtable=table(['Trajectory','Changes','Unsupported','Large jumps'],[[n,m(n)['selectionChanges'],pct(m(n)['unsupportedFraction']),m(n)['largeJumps']] for n in pathnames])
htmltable='<table><thead><tr>'+''.join(f'<th>{h}</th>' for h in ['Trajectory','Changes','Unsupported','Large jumps'])+'</tr></thead><tbody>'+''.join('<tr>'+''.join(f'<td>{html.escape(str(x))}</td>' for x in [n,m(n)['selectionChanges'],pct(m(n)['unsupportedFraction']),m(n)['largeJumps']])+'</tr>' for n in pathnames)+'</tbody></table>'
page=page.replace(mdtable,htmltable)
for name in ['circular-B-vs-C','real-mouse-circles-B','chronological-A']:page=page.replace(f'src="recordings/{name}.webm"',f'poster="poster-{name}.jpg" src="recordings/{name}.webm"')
(evidence/'index.html').write_text(page)
print('Report, source-quality gate, summary and self-contained evidence page prepared. Verdict NO-GO; primary-only preserved.')
