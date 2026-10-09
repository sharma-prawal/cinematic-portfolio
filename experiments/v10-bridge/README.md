# V10 DOWN → LOWER-RIGHT evaluation — CONDITIONAL

**The missing movement exists.** Frames 0–84 contain a coherent DOWN-to-LOWER-RIGHT segment with natural narrow eyelids and visible iris portions. It is suitable for an isolated experimental bridge. It is not a seamless match to both existing endpoints. Defaulting to V10's own lower-right pose substantially improves the internal bridge; keeping Flow 17:04:10 frame 132 leaves an obvious final yaw/appearance jump.

## Previews

- Recommended isolated variant: http://127.0.0.1:5176/?debug=1&endpoint=own
- Old endpoint comparison: http://127.0.0.1:5176/?debug=1&endpoint=retained
- Untouched progressive DOWN: http://127.0.0.1:5175/?debug=1&down=progressive
- Untouched LOWER-RIGHT B: http://127.0.0.1:5174/?strategy=B&debug=1
- Production remains at http://127.0.0.1:5173/

## Audit and exact usable range

Source: `Man_turning_head_rightward_1080p_20261009193414.mp4`, 1920×1080, 24fps. Source hash and exact runtime assets are in `provenance.json`. All 85 frames from 0 through 84 were decoded and visually inspected, with an additional native-resolution eye crop for every frame. Evidence is in `analysis/v10/native`, the 17 individual-frame review boards and three native eye boards. No frames after 84 were selected or incorporated.

The longest coherent **reviewed** sequence is **0–84 inclusive (0–3.500000s)**. Not every frame contributes distinct movement. Recommended runtime segment: **0–60 inclusive (0–2.500000s)**. The later hold is unnecessary. Frames 80–84 slightly relax the downward eye position and open the lids; they do not offer useful additional yaw. They were not preferred merely for wider eyes.

| Frames | Head yaw/pitch and gaze | Eyes/continuity |
|---|---|---|
| 0–17 | Centered DOWN hold, modest downward pitch | Irises visible; little distinct movement |
| 18–24 | Downward gaze shifts right before substantial head rotation | Natural narrowing, no complete blink |
| 25–39 | Increasing right yaw while maintaining downward pitch/gaze | Coherent facial and collar movement |
| 40–54 | Stronger lower-right orientation; no neutral/upward detour | Narrow lids but visible iris portions; no deep eyes-hidden bow |
| 55–79 | Lower-right hold, small settling changes | No full blink or obvious facial warping observed |
| 80–84 | Similar right yaw/pitch, slightly less downward eye position | Lids widen; no additional useful rotational progression |

No frame in 0–84 was rejected for a full blink, excessive eyes-hidden closure, obvious face distortion or incorrect upward head orientation. This is a qualitative visual assessment, not calibrated yaw/pitch angles. Naturally narrow down-looking eyes are not described as wide-open neutral eyes. Frames beyond the reviewed interval remain unaudited for this task.

## Recommended samples

**0,22,28,34,40,46,54,60**, with times **0,.916667,1.166667,1.416667,1.666667,1.916667,2.25,2.5 seconds**. Cursor yaw-progress annotations are **.025,.12,.25,.39,.54,.70,.87,1**. They describe visual progression, not uniform timestamp spacing or calibrated angles. Frame 0 supplies the centered source entry; 22 captures the early eye/rightward shift; 28–46 cover distinct yaw changes; 54 approaches the settled angle; 60 is a genuine lower-right endpoint. Frames 61–79 mostly repeat the hold. Frame 84 was not assumed to be the best endpoint.

## Endpoint comparison

`analysis/v10/side-by-side.jpg` shows full portraits without alignment or color correction: DOWN32 next to V10 frame0, and existing LOWER-RIGHT132 next to V10 frame60. `endpoint-comparison.jpg` additionally includes V10 54,72,84. Existing endpoints were freshly extracted at their exact source indices.

- **Existing DOWN32 → V10 frame0:** centered downward pose and overall framing are close. Identity is recognizable, but V10 has sharper brow/eye/beard detail, a slightly different smile/brow expression and facial contour/registration. Gross head scale is similar rather than pixel-identical. The shirt and background match much more closely than the face. The entry exhibits a small visible appearance pop in slow browser sweeps; it is not certified seamless.
- **Within V10:** head and gaze turn down-right without a forward/upward detour. Closed-mouth expression is broadly stable, though the brow remains a little more contracted than the old DOWN source. Shoulder/collar changes follow the real rotation and stay coherent. No ghosting, synthetic morphing or obvious identity warping in the selected samples.
- **V10 lower-right → existing LOWER-RIGHT132:** the old endpoint has more pronounced right yaw and different facial/collar geometry. Head position/contour and expression differ, with background/exposure also not perfectly identical. The browser retained variant visibly jumps in yaw and collar position. Keeping the old endpoint does not solve continuity.
- **V10 own endpoint60:** less extreme yaw than old132, but genuine downward-right head/gaze orientation. Holding it avoids the final cross-clip jump. The entry discontinuity remains, and transitions toward existing RIGHT/other clips still need their own compatibility evaluation.

As supporting image-difference data only, unaligned RGB RMS at fixed 960×540 review resolution uses face ROI (310,40)–(670,420) and shirt ROI (250,430)–(710,530). DOWN32→V10 frame0: face **17.988**, shirt **4.445**. V10 frame54→old132: face **50.080**, shirt **11.189**. Adjacent V10 frames across 0–84: mean face RMS **5.859**, maximum **11.944**. These include texture, pose and registration differences; they are not pose angles, eye-openness scores or perceptual pass thresholds. Browser visual inspection determines the decision.

## Isolated integration and reversibility

Only `experiments/v10-bridge` is the new app variant. Canvas rendering, 65ms coordinate smoothing, responsive CSS, input handling, debug cadence, reduced-motion and fallback architecture remain copied from the existing experiment. No facial blending or AI interpolation. Source footage files are not runtime assets.

For the bottom-right route (`x > .03`, `y >= .65`), smoothed normalized coordinates select the real source poses by angular progress `min(1,x/y)` with .008 spatial hysteresis. Exact x=0 retains the full prior progressive DOWN selector. Existing DOWN32 is the zero-yaw bridge basis; V10 frame0 is the first source entry. Reversing the cursor reverses the source order; no time-queued route continues after reversal. Two configurable endpoint variants compare own60 against retained132. Outside this bottom corridor, the prior directional selector/Strategy B entry78 still applies.

This route is deliberately limited. At intermediate vertical distances its entry can change pitch to the V10 DOWN basis. Direct CENTER↔LOWER-RIGHT sweeps still cross the old frame78 boundary and jump to the V10 endpoint. This work does not establish a natural global two-dimensional lower-right field or solve RIGHT↔LOWER-RIGHT. No incorrect forward/upward frame has been added to disguise those boundaries.

**37-frame decoded cache in both variants.** The original experiment has 26 retained production frames +9 DOWN +2 LOWER-RIGHT. This variant uses 19 production +9 unchanged DOWN +1 old Strategy B entry +8 bridge/endpoints =37. Seven production intermediate supports (20,28,44,56,60,148,152) are omitted only in this isolated variant; this makes some unrelated intermediate paths sparser. They are not redundant stable anchors and this tradeoff is explicitly experimental. All seven other stable directions plus DOWN still match baseline Canvas pixels. The retained mode also matches the old lower-right endpoint pixels. Existing production, DOWN and Strategy B files/assets were checked against **132 preserved hashes** and remain unchanged. Removing the new directory rolls back the variant; existing preview URLs remain available.

## Actual browser evidence and performance

`qa/v10-bridge/results.json` records Canvas drawImage source paths/timestamps rather than relying on sampled debug labels. Six runs cover baseline, own and retained modes at **1440×900 and 1920×1080**, with screenshots at identical normalized cursor coordinates (CENTER .5,.5; DOWN .5,.995; LOWER-RIGHT .92,.92).

All runs passed cache, stable endpoint, pixel comparison and runtime error checks. Real mouse movement exercised CENTER→DOWN→LOWER-RIGHT and the reverse, slow angular sweeps, direct diagonals and sixteen rapid DOWN/LOWER-RIGHT reversals. Both sizes drew **0,22,28,34,40,46,54,60** forward and **54,46,40,34,28,22,0,then existing DOWN32** backward. The complete nine-frame progressive DOWN draw order remains identical to baseline. Rapid reversals may skip poses with the existing 65ms smoothing; no forced stale route runs afterward, and the stationary endpoint holds without oscillation. Discrete steps remain perceptible in deliberately slow sweeps, particularly the larger yaw intervals. Sparse source selection cannot supply continuously unique orientations.

Full browser videos: `own-1440.webm`, `retained-1440.webm`, corresponding1920 videos and baseline videos. `bridge-cycle-short.webm` is a trimmed browser recording of the actual mouse-driven route, not a source-video replay. Motion boards extracted from recordings were inspected for both forward/reverse variants and rapid/direct motion. Browser PNGs verify real rendered orientation at both sizes.

| Variant | Decoded frames | Desktop RGBA MiB | Mobile RGBA MiB | Observed rAF loop |
|---|---:|---:|---:|---:|
| Existing progressive DOWN/B |37|73.17|32.52|≈60fps|
| V10 own endpoint |37|73.17|32.52|≈60fps|
| V10 retained endpoint |37|73.17|32.52|≈60fps|
| Original rollback atlas |68|134.47|59.77|Not rerun here|

The **45.59% nominal decoded pixel-buffer reduction** remains. These numbers are not total browser-process RAM. rAF FPS is not 60 unique portrait frames per second. No new runtime asset requests are needed after preloading. Mobile reduced-motion DOWN→V10 lower-right→touch release and missing-DOWN-frame fallback tests passed. ESLint, isolated TypeScript checking and optimized Vite build passed; build output is `/private/tmp/v10-bridge-build`, not production `dist`.

## Decision and next steps

**CONDITIONAL for frames0–84 as an integrated bridge.** The natural DOWN-to-LOWER-RIGHT movement is present and directional/eye inspection passes. **Reject retaining old132 as a seamless final join.** Prefer own60 for further isolated evaluation, with its less extreme but genuine lower-right pose. Do not merge or promote without approval.

For production-quality continuity, capture a single compatible CENTER→DOWN→LOWER-RIGHT and reverse sequence that matches facial scale/registration, closed-mouth smile/brow, exposure, background and collar/shoulder geometry. Start by matching existing DOWN32 precisely; continue to a held lower-right pose at the desired yaw without deepening the bow or hiding the irises. If old132 must remain, additional real yaw progression must reach that more pronounced endpoint with matching shirt/face geometry; this interval does not contain that final match. Include a compatible RIGHT↔LOWER-RIGHT arc and medium-depth diagonal samples to remove the current corridor/Strategy B boundary jump. Reallocate the 37 slots based on full-field visual QA before restoring a complete production mapping; do not silently sacrifice other trajectories to hide the new join.
