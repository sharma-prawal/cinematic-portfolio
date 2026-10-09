# Isolated LOWER-RIGHT integration experiment

**Result: CONDITIONAL. Do not promote to production.**

Production remains at http://127.0.0.1:5173/. This separate Vite root copies the renderer/layout/input code and overlays pose selection and source URLs locally. Its public `flow-1218` directory is a read-only-use symlink to the production assets; new video frames live only inside this experiment. Removing this experiment has no effect on the production atlas.

Run from the project root: `rtk proxy npx vite experiments/lower-right --host 127.0.0.1 --port 5174 --strictPort`.

## Previews

- A, direct: http://127.0.0.1:5174/?strategy=A&debug=1
- B, verified intermediates (best of the tested strategies, still conditional): http://127.0.0.1:5174/?strategy=B&debug=1
- C, neutral route (rejected transition strategy): http://127.0.0.1:5174/?strategy=C&debug=1

Leave `debug=1` off for the original uncluttered appearance. The experiment defaults to A. These links are local previews, not deployments. No merge or production replacement was performed.

## Actual source and frames

The brief repeats the absent 16:51:57 filename. This experiment uses the **previously confirmed and evaluated** `Creating_studio_portrait_video_1080p_20261009170410.mp4`, SHA-256 `ab35fc4c372c28c1019ae77488fe61a9d9dc0674f556e1f2efcc051e1206e283`. The 12:18 clip supplies all unchanged directions. Only this experiment intentionally mixes the two confirmed clips, as authorized by the integration task.

Zero-based frames: new neutral 3 / 0.125000 s; entry 66 / 2.750000 s; intermediate 78 / 3.250000 s; stable LOWER-RIGHT 132 / 5.500000 s. The stable frame has image-right yaw, moderate downward pitch, down-right gaze, natural open lids, and a partly visible far iris. Frame 166 is excluded. An earlier entry candidate 58 was omitted because its eye aperture is weaker after the first blink. No blink frames, artificial intermediates, face morphing, rigid adjustments, or crossfading are used.

The copied `poses.json` retains the baseline for comparison; the experiment's `tracking.ts` exports the effective preload list and applies the local LOWER-RIGHT overlay. New frames have internal keys 5000+n solely to prevent collisions with the old source. Debug labels show the real source number, timestamp and “new clip”; filenames also use real source numbers.

## Strategies and findings

| Strategy | Implementation | Browser observation | Verdict |
|---|---|---|---|
| A | Existing 65 ms coordinate easing; switch directly to new frame 132 when the smoothed point enters LOWER-RIGHT | Correct static direction; obvious yaw/pitch and collar/shoulder jump at entry and return | Conditional static improvement, fails seamless joins |
| B | Only verified frame 78 in the shallower LOWER-RIGHT area, then frame 132 for deeper movement; uses the same recorded frame in reverse | Reduces the RIGHT ↔ LOWER-RIGHT angular step, but two discrete steps and the source join remain visible; center return still jumps | Best experimental option; **CONDITIONAL** |
| C | At LOWER-RIGHT entry/exit, four real poses at 60 ms intervals route through current/source neutral and source 66/78; reduced motion bypasses the timed route | Neutral endpoints align closely, but RIGHT → LOWER-RIGHT visibly detours forward. Rapid reversals restart the route and create conspicuous oscillation. It adds 240 ms routing time after the region crossing | **Reject strategy C**; do not promote |

No strategy meets the acceptance criterion of transitions without noticeable snapping. No ghosting was observed: each Canvas draw replaces the image and uses no blend. The improved stationary pose is not proof of a successful transition.

## Required transition comparison

Actual draw traces and complete recordings are in `../../qa/lower-right-experiment/`.

| Cursor sweep | A | B | C |
|---|---|---|---|
| CENTER → LOWER-RIGHT | current center → new 132; large angular step | new 78 → 132 after leaving center; entry still discrete | source neutral → 66 → 78 → 132; smaller increments but short entry jump and timed response |
| RIGHT → LOWER-RIGHT | current RIGHT → 132, noticeable pitch/yaw step | current RIGHT → 78 → 132; smaller but visible steps | current RIGHT → current/source neutral → 66 → 78 → 132; inappropriate forward detour |
| LOWER-RIGHT → RIGHT | 132 → current RIGHT; visible return step | 132 → 78 → current RIGHT; visibly improved, still discontinuous | 78 → 66 → source/current neutral → current RIGHT; inappropriate detour |
| LOWER-RIGHT → CENTER | 132 → current center; large step | 132 → 78 → current center; final jump remains | source return path to neutral; useful orientation order, but discrete jumps and added latency remain |
| LOWER-LEFT → LOWER-RIGHT | Existing lower-left/down sequence then new 132; large final step | Same unresolved lower-middle sequence then 132 on this horizontal sweep; shallow intermediate not traversed | Same unresolved lower-middle sequence, then forward detour and source route |

The horizontal lower sweep traverses the existing DOWN region and therefore still displays its known incorrect forward-looking frame 180. This was neither corrected nor relabeled. It prevents claiming that the complete lower arc is directionally accurate. Routing through an artificial DOWN was not attempted. DOWN remains unresolved and requires new footage.

## Alignment, identity and background

The neutral endpoint comparison searched uniform scales 0.98–1.02 and integer translations −8…+8 pixels in 2-pixel steps at 960×540, using a fixed face ROI. The best fit was the original scale and zero translation. Face-region pixel MSE was 48.55 (RMS approximately 6.97 channel levels); this is appearance error, not an identity score. See `alignment-evaluation.json`. No adjustment was applied, and intentional pose displacement was not registered away.

Fixed corner background patches excluded the subject and diamond. Mean channel RMS between sources was approximately 1.24–1.38 / 255 (`../../qa/lower-right-experiment/background-metrics.json`), so exposure/background differences are small in those patches. This does not measure the whole background or prove a seamless join. The diamond stays in a compatible position; no major background jump was apparent. The more visible discontinuities are orientation, neck/collar/shoulder contour and expression. Facial identity appears consistent, with no major deformation; skin and cheek/mouth detail differ subtly. Full hairstyle and native 16:9 proportions remain visible.

## Memory and performance

Decoded estimates use RGBA pixels (not total browser heap/GPU/video-recording memory).

| Version | Preloaded frames | Desktop MiB | Mobile MiB | Reduction vs original 68 |
|---|---:|---:|---:|---:|
| Current production | 37 | 73.17 | 32.52 | 45.59% |
| A | 37 | 73.17 | 32.52 | 45.59% |
| B | 37 | 73.17 | 32.52 | 45.59% |
| C | 38 | 75.15 | 33.40 | 44.12% |

A substitutes one frame; B substitutes two; C also repurposes a duplicate neutral slot and adds one net frame. Browser resource inspection confirmed 37/37/38 unique loaded frame URLs at both desktop viewport sizes. None requests new frames during motion after preload. All eight recorded runs sampled approximately 60 fps. These are diagnostics, not a guarantee on every device. Recorded draw times measure actual image selection, not input-to-photon latency. The 65 ms coordinate easing and native Canvas resolutions remain unchanged. The isolated experiment publishes several assets that a given strategy does not preload; those unused files do not increase decoded-frame memory.

## Verification

- Actual browser screenshots at 1440×900 and 1920×1080, DPR 2, identical cursor coordinates: CENTER (0.5,0.5), RIGHT (0.92,0.5), LOWER-RIGHT (0.92,0.92), baseline plus A/B/C.
- Eight runs: 72 direction/viewport checks, 40 continuous sweeps, rapid reversals, stable cursor, cache, exit-to-center and debug controls. Eight other stable poses were compared pixel-for-pixel with baseline at both sizes; all equal. Canvas bounds/resolution and scroll dimensions also equal.
- Reduced-motion and mobile touch/release checked for A/B/C in Chromium emulation. No runtime errors. Real hardware and Safari/Firefox were not tested.
- Existing production browser suite passed: all nine directions at five viewports, 35 transitions, pointer exit, rapid input, touch, reduced motion, cache, layout and controls. Its passing selections do not validate the known DOWN/LR direction defects.
- Existing production smoke tests passed, including unavailable-image fallback and complete failure recovery.
- ESLint, production TypeScript/build, and separate experimental TypeScript/build passed. The experimental build is isolated at `/private/tmp/lower-right-experiment-build`.
- SHA-256 verification of 85 production/source inputs matched the pre-experiment fingerprints. Production code, atlas/provenance, layout, original videos and rollback remain untouched.

## Recommendation

Keep B available for review; do not replace production. A correct static LOWER-RIGHT pose is demonstrated, but seamless mixed-source joins are not. If the no-noticeable-snapping requirement remains strict, obtain a matching clip with blink-free CENTER → RIGHT → LOWER-RIGHT → RIGHT → CENTER movements, open irises, fixed camera/torso/background and consistent expression. LOWER-LEFT continuity also needs a valid DOWN region before the full lower arc can be accepted. No production promotion should occur without explicit approval and successful visual verification.
