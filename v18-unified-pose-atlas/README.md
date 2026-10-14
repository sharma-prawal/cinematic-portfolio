# V18 source audit

**SOURCE NO-GO:** the collection does not establish natural photographic 2D tracking. See [the full report](report/REPORT.md).

This isolated folder contains an audit, photographic references, measurements and an original-footage viewer. It contains no cursor-tracking renderer. Existing videos and projects are unchanged.

From the parent project directory, use the V18 virtual environment:

```sh
rtk proxy python3 v18-unified-pose-atlas/scripts/extract.py
rtk proxy v18-unified-pose-atlas/.venv/bin/python v18-unified-pose-atlas/scripts/measure.py
rtk proxy v18-unified-pose-atlas/.venv/bin/python v18-unified-pose-atlas/scripts/analyze.py
rtk proxy v18-unified-pose-atlas/.venv/bin/python v18-unified-pose-atlas/scripts/formats.py
rtk proxy v18-unified-pose-atlas/.venv/bin/python v18-unified-pose-atlas/scripts/sensitivity.py
rtk proxy v18-unified-pose-atlas/.venv/bin/python v18-unified-pose-atlas/scripts/path-feasibility.py
rtk proxy python3 v18-unified-pose-atlas/scripts/server.py
```

The server prints the localhost audit-viewer URL. In another terminal, record browser evidence, regenerate the report and validate:

```sh
rtk proxy node v18-unified-pose-atlas/scripts/browser-audit.mjs
rtk proxy v18-unified-pose-atlas/.venv/bin/python v18-unified-pose-atlas/scripts/finalize.py
rtk proxy v18-unified-pose-atlas/.venv/bin/python v18-unified-pose-atlas/scripts/validate.py
rtk proxy node_modules/.bin/eslint --config v18-unified-pose-atlas/eslint.config.mjs v18-unified-pose-atlas/viewer.mjs v18-unified-pose-atlas/scripts/browser-audit.mjs v18-unified-pose-atlas/eslint.config.mjs
```

Python versions are pinned in `requirements-lock.txt`. The official MediaPipe model is stored in `data/face_landmarker.task`; its checksum is in `data/measurement-method.json`. FFmpeg and FFprobe must be available. Chrome and the parent project's existing Playwright dependency supply browser automation. The audit viewer server exposes only allowlisted originals and V18 audit assets.

`extract.py` creates a fresh preservation snapshot; retain the original delivered before/after files if rerunning against a later parent-project state. Extraction and format scripts can overwrite V18 outputs. All indices are zero-based.

Audit validation and ESLint passed. React/TypeScript build and cursor-controller tests are inapplicable after the source gate; audit viewer responsive/touch checks are distinct from tracking QA.
