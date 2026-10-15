# V24 primary-video photographic cursor tracking

**NO-GO for natural tracking across arbitrary circles.** Working isolated React/TypeScript/Motion/Canvas prototype, complete primary audit, 19-source inventory, 4,559 native-frame extractions, real Chrome evidence and preservation records. The preferred video remains the only approved photographic source. No promotion occurred.

- [Primary atlas](http://127.0.0.1:4324/?mode=B)
- [Source reference](http://127.0.0.1:4324/?mode=A)
- [Reviewed repair mode](http://127.0.0.1:4324/?mode=C)
- [B/C comparison](http://127.0.0.1:4324/?compare=1)
- [Evidence page](http://127.0.0.1:4324/evidence/)
- [Full report](report/REPORT.md)

The server may already be running on localhost port 4324. To restart from the parent project:

```sh
rtk proxy npm run preview --prefix v24-primary-video-cursor-tracking
```

For development, stop that preview first, then run:

```sh
rtk proxy npm run dev --prefix v24-primary-video-cursor-tracking
```

The V24 node_modules symlink reuses installed V20 dependencies read-only. Vite's cache is inside V24/data. A standalone checkout can replace the symlink with a local `npm ci` installation using V24's package-lock.json. Do not install through the existing symlink. Python scripts use the existing V18 environment read-only, with bytecode writes disabled. The required versions are copied to requirements-lock.txt. FFmpeg, FFprobe and installed Chrome supply extraction and browser testing.

To reproduce analysis from the parent project, preserve the delivered baseline rather than replacing it. `preserve.py before` refuses to overwrite an existing baseline. The following preparation scripts overwrite only V24 generated artifacts:

```sh
rtk proxy env PYTHONDONTWRITEBYTECODE=1 v18-unified-pose-atlas/.venv/bin/python v24-primary-video-cursor-tracking/scripts/audit.py
rtk proxy env PYTHONDONTWRITEBYTECODE=1 v18-unified-pose-atlas/.venv/bin/python v24-primary-video-cursor-tracking/scripts/candidates.py
rtk proxy env PYTHONDONTWRITEBYTECODE=1 v18-unified-pose-atlas/.venv/bin/python v24-primary-video-cursor-tracking/scripts/prepare.py
rtk proxy npm run build --prefix v24-primary-video-cursor-tracking
```

Start the production preview before browser checks, then run these sequentially:

```sh
rtk proxy node v24-primary-video-cursor-tracking/scripts/browser-qa.mjs
rtk proxy node v24-primary-video-cursor-tracking/scripts/physical-circles.mjs
rtk proxy env PYTHONDONTWRITEBYTECODE=1 v18-unified-pose-atlas/.venv/bin/python v24-primary-video-cursor-tracking/scripts/evidence.py
rtk proxy env PYTHONDONTWRITEBYTECODE=1 v18-unified-pose-atlas/.venv/bin/python v24-primary-video-cursor-tracking/scripts/validate.py
rtk proxy env PYTHONDONTWRITEBYTECODE=1 python3 v24-primary-video-cursor-tracking/scripts/preserve.py after
rtk proxy env PYTHONDONTWRITEBYTECODE=1 v18-unified-pose-atlas/.venv/bin/python v24-primary-video-cursor-tracking/scripts/write-report.py
rtk proxy env PYTHONDONTWRITEBYTECODE=1 python3 v24-primary-video-cursor-tracking/scripts/checks.py
```

Modes A/B/C are available in the production build. A is manual inspection until Play once is explicitly pressed; it never loops. B chooses only independently extracted photographs. C reports that zero secondary repairs passed and uses B's same library. `?debug=1` opens inspection controls; `?tau=20`, `?tau=35`, `?tau=50`, `?strategy=nearest`, `?strategy=neighbor`, `?strategy=continuity`, and `?resolution=1280` select measured runtime options.

The normal-speed recordings and frame-by-frame source provenance are in qa. The 60fps renderer does not create 60fps photographic motion. Medium and offset circles expose gaps; the full report separates successful engineering QA from the failed photographic acceptance gate.
