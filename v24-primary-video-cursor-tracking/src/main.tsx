import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useAnimationFrame, useMotionValue, useReducedMotion } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { normalize, smooth, selectPhoto, targetPose, validateAtlas, angularDistance } from './controller';
import type { Atlas, Mode, Photo, Strategy } from './controller';
import { PhotoCache } from './cache';
import './style.css';

const query = new URLSearchParams(location.search);
interface Sample { t: number; dt: number; raw: number[]; smoothed: number[]; requested: { yaw: number; pitch: number }; frame: number; desired: number; filename: string; supported: boolean; limited: boolean; error: number; changed: boolean; angularJump: number; cacheWait: boolean; inputAgeMs: number; renderMs: number }
interface Run { samples: Sample[]; frames: number; changes: number; waits: number; readyMs: number | null; status: string; current: number; desired: number; input: number[]; smoothed: number[]; error: number; supported: boolean; limited: boolean; reason: string; lastChangeMs: number; largeJumps: number; sourceCounts: Record<string, number>; cache: PhotoCache; started: number; reduced: boolean }
interface API { snapshot: () => unknown; reset: () => void; setTarget: (x: number, y: number) => void }
declare global { interface Window { __v24?: API } }
const runtimes = new Map<string, Run>();
const title: Record<Mode, string> = { A: 'Chronological reference', B: 'Primary pose atlas', C: 'Reviewed repair atlas' };
const getMode = (value: string | null): Mode => value === 'A' || value === 'C' ? value : 'B';

function Portrait({ atlas, mode, label, rawX, rawY, inputAt, tau, strategy, sharp, reduced, sequenceFrame }: { atlas: Atlas; mode: Mode; label: string; rawX: MotionValue<number>; rawY: MotionValue<number>; inputAt: { current: number }; tau: number; strategy: Strategy; sharp: boolean; reduced: boolean; sequenceFrame: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const smoothedX = useMotionValue(0), smoothedY = useMotionValue(0);
  const [hud, setHud] = useState({ frame: 0, status: 'Loading neutral photograph…', loaded: 0, memory: 0, error: 0 });
  const engine = useRef<Run | null>(null);
  const current = useRef<Photo>(atlas.frames.find(p => p.id === atlas.neutral)!);
  const byId = useRef(new Map(atlas.frames.map(p => [p.id, p])));
  const rendered = useRef(-1); const lastHud = useRef(0);
  const width = sharp && mode !== 'A' ? 1280 : 960, height = width * 9 / 16;

  useEffect(() => {
    const cache = new PhotoCache(width * height * 4);
    const run: Run = { samples: [], frames: 0, changes: 0, waits: 0, readyMs: null, status: 'loading', current: atlas.neutral, desired: atlas.neutral, input: [0, 0], smoothed: [0, 0], error: 0, supported: true, limited: false, reason: 'Neutral photograph', lastChangeMs: 0, largeJumps: 0, sourceCounts: {}, cache, started: performance.now(), reduced };
    engine.current = run; runtimes.set(label, run); current.current = byId.current.get(atlas.neutral)!; rendered.current = -1;
    cache.request([{ id: atlas.neutral, url: sharp && mode !== 'A' ? current.current.sharp_url : current.current.url }], [atlas.neutral]);
    return () => { cache.dispose(); runtimes.delete(label); engine.current = null; };
  }, [atlas, label, sharp, width, height, mode, reduced]);

  useAnimationFrame((_time, delta) => {
    const run = engine.current; const context = canvas.current?.getContext('2d', { alpha: false });
    if (!run || !context || document.hidden) return;
    const start = performance.now(); const dt = Math.max(0, delta);
    const x = smooth(smoothedX.get(), rawX.get(), dt, reduced ? 0 : tau);
    const y = smooth(smoothedY.get(), rawY.get(), dt, reduced ? 0 : tau);
    smoothedX.set(x); smoothedY.set(y);
    const selection = selectPhoto(atlas, current.current, x, y, strategy, mode);
    const wanted = mode === 'A' ? sequenceFrame : selection.photo.id;
    const selected = byId.current.get(wanted);
    const entry = atlas.sequence[wanted];
    const url = mode === 'A' ? entry.url : sharp ? selected!.sharp_url : selected!.url;
    const request = [{ id: wanted, url }];
    // Favor graph neighbors and poses near today's input; never preload the collection.
    const upcoming = mode === 'A' ? atlas.sequence.slice(wanted + 1, wanted + 7).map(p => ({ id: p.id, url: p.url })) : [
      ...(selected?.neighbors ?? []).map(id => byId.current.get(id)!),
      ...atlas.frames.slice().sort((a, b) => Math.hypot(a.yaw - selection.nearest.yaw, a.pitch - selection.nearest.pitch) - Math.hypot(b.yaw - selection.nearest.yaw, b.pitch - selection.nearest.pitch)).slice(0, 5),
    ].filter(Boolean).slice(0, 8).map(p => ({ id: p.id, url: sharp ? p.sharp_url : p.url }));
    run.cache.request([...request, ...upcoming, { id: atlas.neutral, url: sharp && mode !== 'A' ? byId.current.get(atlas.neutral)!.sharp_url : atlas.sequence[atlas.neutral].url }], [wanted, rendered.current, atlas.neutral]);
    const bitmap = run.cache.get(wanted);
    let changed = false; let jump = 0;
    if (bitmap && rendered.current !== wanted) {
      context.drawImage(bitmap, 0, 0, width, height);
      if (mode !== 'A' && selected) { jump = angularDistance(current.current, selected); current.current = selected; }
      changed = rendered.current !== -1; rendered.current = wanted;
      run.changes += changed ? 1 : 0; if (jump > atlas.selection.large_jump_deg) run.largeJumps++;
      run.lastChangeMs = start;
      if (run.readyMs === null) run.readyMs = start - run.started;
    }
    const cacheWait = !bitmap;
    if (cacheWait) run.waits++;
    run.frames++; run.current = rendered.current; run.desired = wanted;
    run.input = [rawX.get(), rawY.get()]; run.smoothed = [x, y]; run.error = selection.error;
    run.supported = selection.supported; run.limited = selection.limited;
    run.reason = mode === 'A' ? 'Manual source inspection · cursor selection disabled' : selection.reason;
    run.status = run.cache.hasFailed(wanted) ? 'error' : rendered.current < 0 ? 'loading' : 'ready';
    if (rendered.current >= 0) run.sourceCounts[atlas.primary] = (run.sourceCounts[atlas.primary] ?? 0) + 1;
    const sample: Sample = { t: start, dt, raw: [...run.input], smoothed: [x, y], requested: targetPose(atlas, x, y), frame: rendered.current, desired: wanted, filename: atlas.primary, supported: mode === 'A' || selection.supported, limited: selection.limited, error: selection.error, changed, angularJump: jump, cacheWait, inputAgeMs: Math.max(0, start - inputAt.current), renderMs: performance.now() - start };
    run.samples.push(sample); if (run.samples.length > 12000) run.samples.shift();
    if (start - lastHud.current > 180) {
      lastHud.current = start;
      setHud({ frame: rendered.current, status: run.status === 'error' ? 'Photograph could not load · retry' : run.status === 'loading' ? 'Loading neutral photograph…' : run.reason, loaded: run.cache.stats.loaded, memory: run.cache.stats.nominalDecodedBytes / 1048576, error: selection.error });
    }
  });

  return <figure className="portrait" data-panel={label}>
    <figcaption><strong>{label} · {title[mode]}</strong><span>{mode === 'C' ? '0 secondary repairs approved' : mode === 'A' ? '240 extracted frames · original order' : '197 photographs · primary only'}</span></figcaption>
    <div className="image-wrap"><canvas ref={canvas} width={width} height={height} role="img" aria-label="Complete studio portrait of the same person, using independently extracted source photographs" />{hud.frame < 0 && <span className="loading">Loading neutral photograph…</span>}</div>
    <div className="image-status" aria-live="off"><span data-testid={`frame-${label}`}>Primary f{String(Math.max(0, hud.frame)).padStart(3, '0')}</span><span>{hud.status}</span><span>{hud.loaded}/24 images · {hud.memory.toFixed(1)} MiB decoded</span>{hud.status.includes('retry') && <button onClick={() => engine.current?.cache.retry()}>Retry image</button>}</div>
  </figure>;
}

function App() {
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [failure, setFailure] = useState('');
  const [mode, setMode] = useState<Mode>(getMode(query.get('mode')));
  const [compare, setCompare] = useState(query.get('compare') === '1');
  const [tau, setTau] = useState([20, 35, 50].includes(Number(query.get('tau'))) ? Number(query.get('tau')) : 35);
  const [strategy, setStrategy] = useState<Strategy>(query.get('strategy') === 'nearest' ? 'nearest' : query.get('strategy') === 'neighbor' ? 'neighbor' : 'continuity');
  const [sharp, setSharp] = useState(query.get('resolution') === '1280');
  const [details, setDetails] = useState(query.get('debug') === '1');
  const [sequenceFrame, setSequenceFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reduced = useReducedMotion() === true;
  const [coarse, setCoarse] = useState(() => matchMedia('(pointer: coarse)').matches);
  const rawX = useMotionValue(0), rawY = useMotionValue(0);
  const inputAt = useRef(0); const marker = useRef<HTMLDivElement>(null);
  const drag = useRef<number | null>(null); const markerVisible = useRef(false);
  const explicit = useCallback((x: number, y: number) => { rawX.set(x); rawY.set(y); inputAt.current = performance.now(); }, [rawX, rawY]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/atlas.json', { signal: controller.signal }).then(r => { if (!r.ok) throw new Error('The atlas manifest could not load.'); return r.json(); }).then(value => { validateAtlas(value); setAtlas(value); }).catch(error => { if (!controller.signal.aborted) setFailure(String(error)); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const mq = matchMedia('(pointer: coarse)'); const update = () => setCoarse(mq.matches);
    mq.addEventListener('change', update); return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const neutral = () => { rawX.set(0); rawY.set(0); drag.current = null; markerVisible.current = false; inputAt.current = performance.now(); };
    const move = (e: PointerEvent) => {
      if (reduced || mode === 'A' || (e.pointerType === 'touch' && drag.current !== e.pointerId)) return;
      rawX.set(normalize(e.clientX, innerWidth)); rawY.set(normalize(e.clientY, innerHeight)); inputAt.current = performance.now(); markerVisible.current = true;
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' || !(e.target instanceof Element) || !e.target.closest('.image-wrap') || reduced || mode === 'A') return;
      drag.current = e.pointerId; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); move(e);
    };
    const up = (e: PointerEvent) => { if (e.pointerType === 'touch') neutral(); };
    const hidden = () => { if (document.hidden) { neutral(); setPlaying(false); } };
    neutral();
    window.addEventListener('pointermove', move, { passive: true }); window.addEventListener('pointerdown', down, { passive: true }); window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('pointercancel', neutral); window.addEventListener('blur', neutral); window.addEventListener('resize', neutral);
    document.documentElement.addEventListener('pointerleave', neutral); document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', neutral); window.removeEventListener('blur', neutral); window.removeEventListener('resize', neutral); document.documentElement.removeEventListener('pointerleave', neutral); document.removeEventListener('visibilitychange', hidden); };
  }, [mode, reduced, rawX, rawY]);

  useAnimationFrame(() => {
    if (marker.current) { marker.current.style.transform = `translate3d(${(rawX.get() + 1) * innerWidth / 2 - 5}px,${(rawY.get() + 1) * innerHeight / 2 - 5}px,0)`; marker.current.style.opacity = markerVisible.current ? '1' : '0'; }
  });

  useEffect(() => {
    if (!playing || mode !== 'A' || reduced || !atlas) return;
    const start = performance.now(); const offset = atlas.sequence[sequenceFrame].timestamp; let id = 0;
    const tick = (now: number) => {
      const time = offset + (now - start) / 1000;
      const frame = Math.min(239, Math.floor(time * 24)); setSequenceFrame(frame);
      if (frame >= 239) setPlaying(false); else id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick); return () => cancelAnimationFrame(id);
    // Starting offset is intentionally captured once per explicit Play action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, mode, reduced, atlas]);

  useEffect(() => {
    window.__v24 = {
      snapshot: () => ({ mode, compare, tau, strategy, sharp, reduced, coarse, raw: [rawX.get(), rawY.get()], primary: atlas?.primary, panels: Object.fromEntries([...runtimes].map(([key, r]) => [key, { ...r, cache: { ...r.cache.stats } }])) }),
      reset: () => { for (const r of runtimes.values()) { r.samples = []; r.frames = 0; r.changes = 0; r.waits = 0; r.largeJumps = 0; r.sourceCounts = {}; } },
      setTarget: (x, y) => { rawX.set(Math.max(-1, Math.min(1, x))); rawY.set(Math.max(-1, Math.min(1, y))); inputAt.current = performance.now(); markerVisible.current = true; },
    };
    return () => { delete window.__v24; };
  }, [mode, compare, tau, strategy, sharp, reduced, coarse, rawX, rawY, atlas]);

  const switchMode = (next: Mode) => { setMode(next); setPlaying(false); explicit(0, 0); const url = new URL(location.href); url.searchParams.set('mode', next); history.replaceState(null, '', url); };
  if (failure) return <main className="failure"><h1>V24 could not load</h1><p>{failure}</p><button onClick={() => location.reload()}>Reload experiment</button></main>;
  if (!atlas) return <main className="failure" role="status">Loading the V24 photograph manifest…</main>;
  return <main className="app">
    <header><h1>V24 <span>Primary portrait study</span></h1><span className="isolation">Isolated experiment</span></header>
    <nav className="toolbar" aria-label="Photographic comparison controls">
      <div className="mode-buttons">{(['A', 'B', 'C'] as const).map(m => <button key={m} aria-pressed={mode === m && !compare} onClick={() => { setCompare(false); switchMode(m); }}>{m} · {m === 'A' ? 'Source' : m === 'B' ? 'Primary' : 'Repairs'}</button>)}<button aria-pressed={compare} onClick={() => { setCompare(!compare); switchMode('B'); }}>B / C comparison</button></div>
      <label>Response <select aria-label="Coordinate smoothing" value={tau} disabled={reduced || mode === 'A'} onChange={e => setTau(Number(e.target.value))}>{[20, 35, 50].map(n => <option key={n} value={n}>{n} ms</option>)}</select></label>
      <button aria-expanded={details} onClick={() => setDetails(!details)}>Inspect</button>
    </nav>
    <section className={`stage ${compare ? 'comparison' : ''}`} aria-label="Photographic portrait comparison">
      <Portrait key={`${mode}-${compare}`} atlas={atlas} mode={compare ? 'B' : mode} label={compare ? 'B' : mode} rawX={rawX} rawY={rawY} inputAt={inputAt} tau={tau} strategy={strategy} sharp={sharp} reduced={reduced} sequenceFrame={sequenceFrame}/>
      {compare && <Portrait atlas={atlas} mode="C" label="C" rawX={rawX} rawY={rawY} inputAt={inputAt} tau={tau} strategy={strategy} sharp={sharp} reduced={reduced} sequenceFrame={sequenceFrame}/>}
    </section>
    <div className="instruction">{mode === 'A' ? 'Source reference · use the frame slider or play once.' : reduced ? 'Reduced motion · portrait stays still. Choose a pose in Inspect.' : coarse ? 'Touch the portrait and drag. Release to return to neutral.' : 'Move your cursor. Both axes select real photographs.'}</div>
    {(mode === 'C' || compare) && <p className="repair-note">No secondary repair passed the continuity review. C uses the same approved primary photographs as B.</p>}
    {mode === 'A' && <div className="source-controls"><button onClick={() => { if (sequenceFrame === 239) setSequenceFrame(0); setPlaying(!playing); }} disabled={reduced}>{playing ? 'Pause' : 'Play once'}</button><label>Original frame <input aria-label="Original primary source frame" type="range" min="0" max="239" value={sequenceFrame} onChange={e => { setPlaying(false); setSequenceFrame(Number(e.target.value)); }}/></label><output>{sequenceFrame} / 239 · {atlas.sequence[sequenceFrame].timestamp.toFixed(3)}s</output></div>}
    {details && <aside className="inspection" aria-label="Source and controller inspection">
      <div className="inspection-controls"><label>Selection <select value={strategy} onChange={e => setStrategy(e.target.value as Strategy)}><option value="nearest">Nearest pose</option><option value="neighbor">Neighbor aware</option><option value="continuity">Continuity + hysteresis</option></select></label><label><input type="checkbox" checked={sharp} onChange={e => setSharp(e.target.checked)}/>1280 × 720 detail</label><button onClick={() => explicit(0, 0)}>Return to neutral</button></div>
      <div className="directions" aria-label="Nine explicit directional targets">{Object.entries(atlas.anchors).map(([name, anchor]) => <button key={name} onClick={() => explicit(...anchor.input)}>{name.replaceAll('-', ' ').toLowerCase()}</button>)}</div>
      <p className="provenance">Source: <span>{atlas.primary}</span><br/>Yaw range requested: −28° to +30°. Pitch from neutral: +18° up / −5° down (uncalibrated estimates). Empty regions hold the last photograph; sparse boundaries can change discretely. No faces are blended.</p>
      <p className="provenance">24 decoded-image slots per panel, including at most two concurrent decodes. The comparison uses two bounded caches. Motion smooths coordinates; the photographs determine available motion.</p>
    </aside>}
    <footer><span>Primary source only · real extracted photographs</span><span>Full source composition · no promotion</span></footer>
    <div ref={marker} className="pointer-marker" aria-hidden="true"/>
  </main>;
}

createRoot(document.getElementById('root')!).render(<App/>);
