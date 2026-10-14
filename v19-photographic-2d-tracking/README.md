# V19 photographic two-axis tracking

Isolated React/TypeScript/WebGL comparison of the original photograph, constrained head motion (A), and shallow inferred relief (B). **NO-GO for natural photographic head tracking.** Full evidence: [report](/Users/prawalsharma/Documents/Projects/cinematic-portfolio/v19-photographic-2d-tracking/report/REPORT.md).

Preview: http://127.0.0.1:61919/ . Add `?debug=1` for limits and 20/40/70 ms controls. Historical V15 is served on port 61915. Nothing is promoted.

## Reproduce

Uses existing workspace Node dependencies and the read-only V18 Python environment. A fresh copy can install dependencies from its own package.json. Chrome is required for browser scripts. Python preparation requires OpenCV, numpy and Pillow; analysis requires numpy and Pillow. Filmstrips require ffmpeg/ffprobe.

From the parent cinematic-portfolio directory:

```sh
rtk proxy v18-unified-pose-atlas/.venv/bin/python v19-photographic-2d-tracking/scripts/prepare.py
rtk proxy npm run build --prefix v19-photographic-2d-tracking
rtk proxy python3 v19-photographic-2d-tracking/scripts/server.py
```

In another terminal, run sequentially:

```sh
rtk proxy node v19-photographic-2d-tracking/scripts/check.mjs
rtk proxy node v19-photographic-2d-tracking/scripts/browser-qa.mjs
rtk proxy node v19-photographic-2d-tracking/scripts/reduced-qa.mjs
rtk proxy node v19-photographic-2d-tracking/scripts/response.mjs
rtk proxy node v19-photographic-2d-tracking/scripts/final-check.mjs
rtk proxy python3 v19-photographic-2d-tracking/scripts/filmstrips.py
rtk proxy python3 v19-photographic-2d-tracking/scripts/analyze.py
rtk proxy python3 v19-photographic-2d-tracking/scripts/report.py
```

Scripts overwrite only V19 output. Preparation snapshots protected files before recreating local assets. Source path and SHA-256 are in report/source.json. The server exposes only V19 dist and the existing V15 dist on separate localhost ports; it denies directory listings and dotfile routes. Stop the existing server before starting a second copy. The renderer uses a shallow heuristic, not anatomically measured depth; report limitations before interpreting its motion as actual head rotation.
