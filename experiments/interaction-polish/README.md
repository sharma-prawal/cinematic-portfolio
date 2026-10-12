# Bounded final interaction polish

An isolated copy of `experiments/v11-right`, using its existing public assets through a symlink. Original experiments, production and rollback are preserved. No V13 images, additional source frames, image transforms, crossfades, queued playback or new dependencies.

## Three configurations

| Configuration | Preview | Coordinate time constant | Progressive-route hysteresis |
| --- | --- | --- | --- |
| Preserved baseline | http://127.0.0.1:5177/?debug=1&right=own | 65 ms | .008 |
| Boundary correction | http://127.0.0.1:5178/?debug=1&tuning=boundary | 65 ms | .008 |
| Responsive trial | http://127.0.0.1:5178/?debug=1&tuning=responsive | 50 ms | .004 |

Original angular score hysteresis remains .002 in every configuration. All use the same 43 source frames, frame cache, four decode workers, Canvas renderer, input listeners and responsive stylesheet. The smoothing diagnostic reflects the trial's actual time constant. Reduced motion still bypasses smoothing entirely.

## Selection correction

The baseline changes route families at the arbitrary .65 coordinate cutoffs. For example, an identical angular trajectory can select Flow 17:04:10 frame 78 below a cutoff, then abruptly switch to V10 or V11 above it. A radial RIGHT sweep can switch production frame 156 to the verified V11 RIGHT frame 120 without changing cursor direction.

The trials extend the existing angular V10/V11 routes to the already-established right-hand directional region (`x > 1/3`). V10 still handles the downward side (`y >= x`), V11 the rightward side (`0 <= y < x`), with their original progress levels. The full existing bottom DOWN-to-LOWER-RIGHT route is retained. The verified RIGHT endpoint is also held in the quantized RIGHT region above the horizontal axis. Upper diagonals, left-side selection, normalization and the exact vertical CENTER-to-DOWN route retain their original rules.

This does not interpolate faces or change endpoint orientations. It removes unnecessary visits to older source poses. Discrete near-center diagonal transitions remain because the available atlas does not contain a continuous two-dimensional family of partial-pitch/partial-yaw faces. The excluded V11 blink remains a genuine source gap.

## Validation and evidence

From the project root:

```sh
rtk proxy node scripts/interaction-polish-selector-test.mjs
rtk proxy node scripts/interaction-polish-qa.mjs
rtk proxy npx tsc -p experiments/interaction-polish/tsconfig.json
rtk proxy npm run lint
rtk proxy npm run typecheck
rtk proxy npx vite build experiments/interaction-polish --outDir /private/tmp/interaction-polish-build
```

Browser QA uses local Chrome, real mouse paths and CDP touch events at all five requested sizes. Instrumentation captures actual Canvas source frame IDs and every pointer event, plus image decoding and rAF callback timing. It is injected into the test browser, not shipped in the application. Video annotations show the actual displayed atlas ID; 8000+n is DOWN, 12000+n V10, 16000+n V11, 5000+n the older lower-right clip, and smaller IDs the original production footage.

`qa/interaction-polish/results.json` contains the measured trajectories, endpoint pixel hashes, decoded memory and timing results. `selector-tests.json` records independent route and endpoint assertions. Final findings and promotion decision belong in `qa/interaction-polish/REPORT.md`; promotion requires the user's explicit approval.

Rollback: close the trial preview and continue using the unchanged baseline URL. Nothing has been promoted into production.
