# Isolated DOWN experiment — CONDITIONAL

Preview: http://127.0.0.1:5175/?debug=1&down=progressive
Comparison selector: http://127.0.0.1:5175/?debug=1&down=banded
Existing untouched LOWER-RIGHT B: http://127.0.0.1:5174/?strategy=B&debug=1
Production: http://127.0.0.1:5173/

DOWN itself is genuinely downward and blink-free. The vertical cursor path is usable in both directions, but this is not approval to integrate a complete lower arc. Discrete changes are noticeable in slow sweeps, and diagonal boundaries remain abrupt. Production integration should wait for explicit approval and compatible diagonal transition footage.

## Source and native review

Only DOWN assets derive from `Integrating_down_video_prototype_1080p_20261009181612.mp4`. All frames 0–32 were inspected at native 1920×1080 resolution; `analysis/down-experiment/native/` preserves them. No synthetic images, interpolation, crossfades or morphing. Existing LOWER-RIGHT assets retain their previously approved experimental source; they are not blended into DOWN.

Frames 0–21 are predominantly neutral. Frame 20 contributes little beyond frame 0; frame 22 adds a distinct early downward pupil/lid shift. Thus the recommended nine-frame set was adjusted by replacing 20 with 22. Frames 24,26,28 are visually close to their selected neighbors. Frames 30–32 warrant denser sampling because chin pitch changes faster there. Frame 36 and the deep bow are excluded.

| Source frame | Time seconds | Cursor progression | Visual assessment |
|---|---:|---:|---|
| 0 | 0 | .025 | Near-neutral centered bridge; open eyes |
| 22 | .916667 | .15 | Early downward pupils; minimal pitch; visible irises |
| 23 | .958333 | .25 | Clear downward gaze; centered yaw; natural lid narrowing |
| 25 | 1.041667 | .37 | Beginning chin lowering; downward gaze |
| 27 | 1.125 | .50 | Increasing downward pitch, no yaw excursion |
| 29 | 1.208333 | .68 | More downward chin angle; visible iris portions |
| 30 | 1.25 | .79 | Later real pitch progression |
| 31 | 1.291667 | .89 | Close to endpoint; natural narrow eyelids |
| 32 | 1.333333 | 1 | Genuine centered DOWN; both iris portions visible; no blink |

These are qualitative visual judgments, not calibrated angle estimates. The DOWN eyes are naturally less open than neutral; choosing a wider-eyed forward pose would sacrifice directional accuracy. Identity and closed-mouth expression remain consistent along this source segment, with a small expression/registration change at the production-neutral to source-neutral join.

## Selector and scope

The isolated vertical corridor `abs(x) <= 1/3 && y > 0` uses nearest annotated progress with .008 progress hysteresis. Canonical production frame 3 remains the exact center. Coordinates still use the original 65ms smoothing, so rapid reversals may skip source frames naturally according to cursor speed; no time-queued animation continues after reversing. A stationary cursor stabilizes. Returning upward reverses the source ordering. Reduced motion keeps immediate coordinate selection.

`down=banded` applies the old central dead zone and 1.5× saturation to the same sequence as a measurable comparison. It delays the initial response, jumps into middle poses at the boundary and reaches the endpoint early. Progressive mode distributes real poses across the lower vertical distance. Neither mode forces the whole sequence to play after every input.

Strategy B remains fixed in this experiment: source frames 78 and 132 retain their existing LOWER-RIGHT behavior. Original global angular gating and coordinate smoothing remain. The experiment excludes removed DOWN candidates from its base selector to avoid returning uncached or directionally invalid old DOWN poses; this can change nearby diagonal intermediate selection and is deliberately reported as experimental. Seven non-DOWN/non-LOWER-RIGHT stable directions are tested against B; LOWER-RIGHT itself is also compared pixel-for-pixel.

## Memory and preservation

37 decoded frames, unchanged from production/Strategy B; 960×540 desktop and 640×360 mobile. Nominal decoded RGBA storage: 73.17 MiB desktop, 32.52 MiB mobile versus original 68-frame 134.47/59.77 MiB, a 45.59% reduction. These figures describe decoded pixel buffers, not whole browser-process RAM.

Nine DOWN frames replace five invalid old DOWN supports (174,178,180,182,186) and four redundant neutral/held-pose entries (8,40,42,202). Strategy B already replaces 160/164 with 78/132. Canvas, cache workers, responsive CSS, input handling and fallback remain copied from the existing experiment. Production and existing LOWER-RIGHT code/assets have not been edited; 103 hashed inputs are checked in `analysis/down-experiment/preserved-inputs.json`. Removing `experiments/down` rolls back this isolated work.

## Evidence and remaining limitations

`qa/down-experiment/` contains identical-coordinate CENTER, DOWN, LOWER-LEFT and LOWER-RIGHT screenshots at 1440×900 and 1920×1080, baseline/progressive/banded recordings and `results.json` with actual Canvas draw timestamps/source paths. The focused browser tests use real mouse movement for forward/reverse/cycles, short movements, rapid reversals and all requested joins. Source changes are captured at drawImage, independently of the slower debug UI sampling. Endpoint stability and 37 resource loads are asserted. Separate QA verifies reduced-motion/mobile DOWN touch and release plus missing-frame fallback. Lint, isolated TypeScript check and isolated optimized Vite build are required. Build output stays in `/private/tmp/down-experiment-build`.

Browser screenshot inspection confirms the old DOWN image looks nearly forward, while new frame 32 shows clear downward pupils and modest genuine chin lowering. No blink, facial ghosting or synthetic warping in the selected sequence. Small steps remain visible in deliberately slow sweeps; there are only nine real samples. The center source join has a slight expression/registration shift. DOWN→LOWER-LEFT still changes yaw/pose abruptly at the region boundary. DOWN↔LOWER-RIGHT has a stronger yaw and shoulder/collar discontinuity; it is not solved by this experiment.

New footage must continuously connect modest centered DOWN (visible irises, matching frame 32) to genuine LOWER-RIGHT while preserving downward pitch, then reverse through DOWN toward center. It must match framing, facial scale, lighting, closed-mouth expression, shirt/collar and shoulders across the entire motion; hold eyes naturally open without deep bowing or blink. Include a compatible RIGHT↔LOWER-RIGHT connection. Prefer the entire CENTER→DOWN→LOWER-RIGHT→RIGHT→LOWER-RIGHT→DOWN→CENTER route in one clip, with no neutral/upward detour between lower poses. More compatible real intermediate samples are needed to reduce slow-sweep stepping without exceeding the existing decoded cache budget. Do not substitute incorrect poses to hide a join.

## Completed runtime measurements

All six browser runs passed (baseline B, progressive and banded at both sizes). Each reported approximately 60fps for the requestAnimationFrame render loop; this is not a claim of 60 unique portrait frames per second. All 37 assets were requested during preload. The eight unchanged stable portraits, including LOWER-RIGHT B, match baseline Canvas pixels at both sizes. Progressive sweeps actually drew all nine DOWN source frames in order, and the reverse route drew 31,30,29,27,25,23,22,0,then production neutral 3. Forward first-to-last draw span was 1450ms and reverse 1483ms in the deliberately slow automated mouse sweep (900ms requested sleeps plus browser/input overhead). These are cursor-driven observations, not a fixed animation duration. Banded mode drew only 27,29,30,31,32 over 450ms, skipping the early stages. Baseline B switched directly between neutral 3 and invalid DOWN 180.

Lint, TypeScript, optimized isolated build, mobile/reduced-motion tests and missing-frame fallback passed. No production or existing B input hash changed.
