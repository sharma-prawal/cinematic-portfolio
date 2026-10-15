# V20 — Cinematic Living Portrait

Isolated local React / TypeScript / Vite experiment. **CONDITIONAL; Mode A preferred.** See [report/REPORT.md](report/REPORT.md) for measurements, evidence and limits. Nothing is promoted into the parent portfolio.

Production previews: [A](http://127.0.0.1:4322/?mode=A), [B](http://127.0.0.1:4322/?mode=B), [C](http://127.0.0.1:4322/?mode=C). Development controls: [debug](http://127.0.0.1:4320/?debug=1). [Evidence gallery](http://127.0.0.1:4320/report/index.html).

Run commands from this experiment directory. Dependencies and Vite cache are local; the source video copy is byte-identical to the root V20 original. No external media requests or uploads are used.

```sh
rtk npm ci --no-audit --no-fund
rtk npm run dev
```

In another terminal:

```sh
rtk npm run typecheck
rtk npm run lint
rtk npm test
rtk npm run build
rtk proxy npm exec vite preview -- --host 127.0.0.1 --port 4322 --strictPort
```

QA needs installed Google Chrome and Playwright's recording FFmpeg runtime. Run these sequentially, without editing the app during captures; recordings overwrite only V20 evidence.

```sh
rtk npm run qa
rtk proxy node scripts/circles.mjs
rtk proxy node scripts/performance.mjs
rtk proxy node scripts/production-check.mjs
rtk proxy python3 scripts/verify-protection.py
rtk proxy python3 scripts/write-report.py
```

`browser-qa.mjs --checks-only` reruns state cases against previously captured motion/responsive evidence and preserves earlier capture errors separately. The full suite regenerates all main evidence. The primary suite's closed paths are normalized-coordinate circles; `circles.mjs` supplies exact screen-pixel circles.

Modes use native muted inline video. A is untouched playback; B translates the full frame by ±2/±1.5px; C moves only exterior atmosphere (±18px) and caption (±3/±2px). Shared spring: stiffness 300, damping 35, mass 1. Reduced motion pauses video and uses the first source frame. Coarse pointers disable parallax. The frontend never manipulates facial pixels or seeks based on a cursor.

The selected source contains a head tilt, blink, brief teeth-visible expression, and baked-in watermark. Source texture/likeness and perceptual loop quality remain conditional. Recordings and sampled source images are evidence, not a claim of human continuous-playback approval. The original photograph remains the fidelity reference.
