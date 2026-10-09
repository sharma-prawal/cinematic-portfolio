# V11 complete experimental right-side route — CONDITIONAL

The source contains a genuine LOWER-RIGHT→RIGHT chin rise, but skipping the early blink leaves a perceptible gaze/pitch step. V11's own RIGHT endpoint is more compatible than production RIGHT156. The isolated route works in both directions with visible eyes; it is not certified seamless or ready to promote.

## Preview and evidence

- Recommended: http://127.0.0.1:5177/?debug=1&right=own
- Production RIGHT comparison within the experiment: http://127.0.0.1:5177/?debug=1&right=production
- Existing V10: http://127.0.0.1:5176/?debug=1&endpoint=own
- Existing progressive DOWN: http://127.0.0.1:5175/?debug=1&down=progressive
- Production remains http://127.0.0.1:5173/

`analysis/v11/side-by-side.jpg` uses identical full 960×540 views of V10 frame60/V11 frame0, final usable pre-blink21/first conservatively usable post-blink30, and production RIGHT156/V11 RIGHT120. `comparison.jpg` uses identical face/body crops and also includes29 and144. Native originals remain in `analysis/v11/native`. `qa/v11-right/full-route-short.webm` is actual cursor-driven browser recording of CENTER→DOWN→LOWER-RIGHT→RIGHT and reverse. Full videos include fast movements and mid-transition reversals, at both 1440×900 and1920×1080, for baseline/own/production modes. Screenshots use identical cursor positions and viewport layouts. `results.json` records actual Canvas source changes and times.

## All-frame inspection

Source `Man_raising_chin_in_studio_20261009201213.mp4`: 240 frames,24fps,1920×1080. All zero-based frames0–239 were inspected individually in12 review boards. The first40 and endpoint candidates received an additional native-resolution eye inspection. No AI-generated frames, eye replacement, morphing, interpolation or facial crossfades. No source video was changed.

| Range | Actual motion and gaze | Assessment |
|---|---|---|
|0–21 /0–.875s|Held LOWER-RIGHT, modest downward pitch and down-right gaze|Natural narrow lids, visible iris portions; head/shoulders nearly held|
|22–29 /.916667–1.208333s|Closing/reopening blink, gaze moves toward horizontal right, chin starts rising|Conservatively excluded; closure strongest/full around24–26 /1–1.083333s;27–29 reopen progressively|
|30–40 /1.25–1.666667s|Clearly reopened eyes; early chin rise and increasingly horizontal gaze|Useful real early intermediate poses|
|41–72 /1.708333–3s|Further modest pitch leveling, right yaw broadly retained|Open eyes, subtle continuous head/neck changes|
|73–120 /3.041667–5s|Small further settling/leveling toward RIGHT|No large additional yaw turn; no reason to assume uniform pose change per second|
|121–239 /5.041667–9.958333s|Predominantly stable RIGHT hold|No additional blink or useful reverse arc found; one representative endpoint is sufficient|

The longest contiguous conservatively usable open-eye range is **30–239**. Preferred moving subsection is **30–120**, followed by a held frame120. The separate initial open-eye range is0–21. There is **no uninterrupted open-eye V11 sequence covering the entire initial LOWER-RIGHT→RIGHT route**. The blink cannot simply be described as removed with no consequence. Gaze/pitch judgments are visual, not calibrated degree estimates.

## Blink-gap result

Conservative rejected frame interval: **22–29 inclusive**. Frame21 at.875s is the final acceptable pre-blink frame; frame30 at1.25s is the first clearly reopened frame used. Frame29 shows nearly reopened eyes but is omitted conservatively rather than prioritizing more samples. Full/strong closure lies around24–26; partial closing/reopening occurs on either side. These exact boundaries describe this visual assessment rather than an automated eyelid threshold.

Yaw and shoulder/collar geometry remain broadly similar across21→30. However, the chin/nose registration moves slightly and the gaze changes from down-right to substantially more horizontal right. This is **not a clean case A**: deleting blink frames loses real early pitch/gaze progression. It is a **limited case B**, with useful subsequent motion but missing eye-visible early orientations. Case C was checked across all remaining frames: after reopening, the video proceeds toward RIGHT and holds, without another blink-free return to the initial LOWER-RIGHT pose.

The head-angle gap is modest enough to justify a conditional browser experiment, not an acceptable basis for claiming seamless motion. In slow and reverse sweeps, the0→30 and30→0 gaze change remains discernible. Frame0 represents the near-held0–21 pre-blink pose; frame21 is not a separate runtime asset because it adds little pose change. Holding or retiming frame0 does not recover the missing gaze samples. No incorrect pose was inserted to mask the gap.

## Cross-source comparisons

**V10 frame60→V11 frame0:** closely aligned right yaw/downward pitch, recognizable same identity, hairline, beard, facial scale/location, shirt/collar and gray background. V11 introduces a slightly different smile/eye/beard detail, so the join has a small appearance change, not zero pixel difference. Gross scale is similar; no geometric transform or exposure correction was applied.

**Nearby V10 endpoints54,60,64,68,72,76,80,84:** evaluated against V11 start and post-blink30. Frame60 remains the best raw ROI match among this set and visually retains the previously validated lower-right pose. Later V10 eye relaxation does not fill the V11 blink gap. The validated V10 sequence/end60 is unchanged.

**V11's own RIGHT120→production RIGHT:** production is `Man_moving_head_in_studio_20261009121811.mp4`, **frame156 at6.500s**. It has less pronounced right yaw, different gaze/head pitch and facial/hair/collar registration than V11. The experiment's production endpoint variant visibly jumps toward a more forward-looking right pose. This is an incompatible final join. V11120 has genuine level/rightward head and eye orientation and avoids that cut. Source144 and later holds add little distinct movement;120 is sufficient.

Identity remains recognizable within V11. Head location rises with the chin; scale does not abruptly jump within the selected same-source samples. Beard/neck contour and collar change with real pitch. The smile subtly differs from V10 and develops around the early transition. Background/exposure remain broadly stable within V11; cross-clip background/texture and shirt details are not pixel-identical. No obvious facial warping, ghosting or flicker was observed in selected samples. Cross-clip source detail changes and the blink-skip gaze step remain visible limitations.

Supporting unaligned RGB RMS uses 960×540 face ROI(310,40)–(700,420),shirt ROI(250,430)–(710,530): V10-60→V11-0 face8.675/shirt3.117; pre21→post30 face17.673/shirt5.143; V11-120→production156 face44.886/shirt8.299. Data in`join-metrics.json` and`nearby-v10-endpoints.json`. These are image differences, not pose angles, calibrated eye openness or perceptual pass thresholds. Browser inspection determines the decision.

## Selected experimental mapping

|V11 frame|Source time s|Chin-rise progress|Real pose role|
|---:|---:|---:|---|
|0|0|.025|Open-eye LOWER-RIGHT source entry, representing pre-blink hold|
|30|1.25|.22|First used reopened pose; early chin/gaze change across omitted blink|
|34|1.416667|.38|Increasingly horizontal eye direction and real intermediate pitch|
|40|1.666667|.55|Further pitch leveling, right-facing|
|72|3|.78|Later near-level right pose|
|120|5|1|Stable RIGHT endpoint, own mode|

CENTER retains production neutral3. Progressive DOWN retains its exact nine prior source samples0,22,23,25,27,29,30,31,32. V10 retains0,22,28,34,40,46,54,60 and its own lower-right60. The added route operates at normalized`x>=.65,y>=0,y<x`, with angular chin-rise progress`1-y/x` and .008 hysteresis. Exact LOWER-RIGHT remains V10-60; moving upward/rightward selects V11 samples. Reversing selects the reverse sequence immediately according to smoothed coordinates; no playback queue, no neutral detour. Original65ms smoothing and reduced-motion coordinate behavior remain.

Outside this experiment's route wedge, prior selector behavior remains. This is a verified arc, not a globally complete two-dimensional pose field. Right-to-upper-right and other wedge boundary joins may still change source/pose abruptly and were not declared solved. Production RIGHT is evaluated only by a query-controlled endpoint substitution within this isolated app. It is never changed in production.

## Browser QA and measured performance

Six desktop runs passed: baseline/own/production at1440×900 and1920×1080. All source images preload, all endpoint holds are stable, no runtime errors, and the eight stable endpoints other than RIGHT match V10 baseline pixels. DOWN and V10 source selection orders are preserved. In own mode, actual Canvas draws for LOWER-RIGHT→RIGHT are0,30,34,40,72,120; reverse draws72,40,34,30,0,then V10-60. Both sizes confirm these exact orders. The production comparison visibly cuts from V11 toward production156 at the final step.

Slow whole-route and reverse sweeps, fast versions of all four lower/right segments, and16 sudden reversals midway through the V11 transition were recorded. No stationary oscillation or forced stale playback. Fast input can naturally skip/shorten pose holds because coordinates remain65ms smoothed. In the1440 own run, first-to-last V11 draw span was1800ms on slow movement,220ms on fast movement, and1820ms on slow reverse. These are actual cursor-driven traces, not a prescribed animation duration or source-video playback timing. Source selection begins once the smoothed coordinate crosses a real pose threshold.

Visual assessment: own endpoint substantially improves the right-side arc; returning reverses the real poses without a center detour. Small discrete steps are visible on deliberately slow motion, especially at the omitted blink gaze change. V10→V11 is a smaller appearance change than the old right endpoint cut. Prior DOWN→V10 entry appearance difference persists. The production-right comparison fails seamless continuity. No tests are presented as proof that those visual defects disappear.

|Atlas|Frames|Desktop decoded RGBA MiB|Mobile MiB|Observed render-loop|
|---|---:|---:|---:|---:|
|Existing V10 baseline|37|73.17|32.52|≈60fps|
|V11 experimental, either endpoint mode|43|85.03|37.79|≈60fps|

Six frames add16.2% nominal decoded pixel storage. No additional existing source samples were removed to enforce37. This is36.8% below the original68-frame atlas, rather than the baseline's45.6% reduction. Both modes preload43 for a controlled comparison; production mode still loads V11-120 even though the endpoint uses already-cached156. MiB is the sum of decoded image width×height×4, excluding browser/Canvas/cache overhead; it is not total process RAM. FPS is the rAF loop, not60 unique portrait frames per second.

Actual image.decode spans from one fresh-context local trial: desktop baseline61.6ms vs V11 73.3ms; mobile baseline36.2ms vs V11 41.0ms. Filesystem/server were local and warm; these are not network deployment benchmarks. Navigation-to-debug-ready ranged263–299ms baseline,261–491ms own,273–278ms production across desktop runs; that includes navigation, initialization and200ms debug sampling and is not pure decode time. `performance.json` preserves the actual decode measurements and decoded dimensions.

Lint, isolated TypeScript, optimized Vite build and relevant browser tests passed. Reduced-motion/mobile touch verified DOWN32→V10 LOWER-RIGHT60→V11 RIGHT120 and release→neutral3 with immediate coordinate selection. Production build output is isolated in`/private/tmp/v11-right-build`.168 preserved input hashes, including all nine original source videos and prior production/experiment files, remain unchanged. No production deployment or merge. Removing`experiments/v11-right` rolls back the variant.

## Recommendation and exact next step

**CONDITIONAL** for the complete experimental arc. V11 supplies useful real LOWER-RIGHT→RIGHT progression and a compatible own RIGHT endpoint. It does not recover the eyes-visible early gaze/pitch samples lost during22–29; therefore it does not fully satisfy the no-snapping visual criterion. Reject the production RIGHT final cut as a seamless join. Keep this isolated for review, with own120 preferred.

Capture only the missing short LOWER-RIGHT↔RIGHT arc starting from exact V10-60, retaining right yaw, closed-mouth expression, facial scale, framing, hair/beard, collar/shoulders, background and exposure. Require continuously visible irises while gaze/pitch change gradually from down-right to level right; no blink during the motion. Match the own RIGHT endpoint or explicitly request compatible motion to the different production156 yaw if that endpoint must remain. The prepared targeted prompt is`analysis/v11/TARGETED-FLOW-PROMPT.md`; no generation was performed. Do not request another full compass sweep or substitute a wrong pose to conceal missing orientations. After compatible footage, re-evaluate slow reverse motion and route boundaries before proposing production integration.
