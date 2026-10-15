import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { defaults, normalize, parseMode } from './controller';
import type { Mode, Settings } from './controller';
import './style.css';

const query = new URLSearchParams(location.search);
const debug = import.meta.env.DEV && query.get('debug') === '1';
type Telemetry = { startedAt: number; readyMs: number | null; frames: number; mediaTimes: number[]; seams: { before: number; after: number; gapMs: number }[]; lastWall: number; lastMedia: number; events: string[] };
declare global { interface Window { __v20?: { snapshot: () => unknown; reset: () => void } } }

function App() {
  const [mode, setMode] = useState<Mode>(parseMode(query.get('mode')));
  const [settings, setSettings] = useState<Settings>(defaults);
  const [fine, setFine] = useState(() => matchMedia('(hover: hover) and (pointer: fine)').matches);
  const [systemReduced, setSystemReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const reduced = systemReduced || settings.reduced;
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState<'loading' | 'playing' | 'blocked' | 'error' | 'still'>('loading');
  const video = useRef<HTMLVideoElement>(null);
  const coordinates = useRef<HTMLOutputElement>(null);
  const rawX = useMotionValue(0), rawY = useMotionValue(0);
  // Near critically damped (2*sqrt(300) ≈ 34.64); no bounce for this study.
  const sx = useSpring(rawX, { stiffness: settings.stiffness, damping: settings.damping, mass: 1, restDelta: 0.0001, restSpeed: 0.001 });
  const sy = useSpring(rawY, { stiffness: settings.stiffness, damping: settings.damping, mass: 1, restDelta: 0.0001, restSpeed: 0.001 });
  const interactive = fine && !reduced && settings.enabled && mode !== 'A';
  const portraitTransform = useTransform(() => `translate3d(${interactive && mode === 'B' ? sx.get() * settings.amplitudeX : 0}px, ${interactive && mode === 'B' ? sy.get() * settings.amplitudeY : 0}px, 0)`);
  const atmosphereTransform = useTransform(() => `translate3d(${interactive && mode === 'C' ? sx.get() * settings.background : 0}px, ${interactive && mode === 'C' ? sy.get() * settings.background : 0}px, 0)`);
  const captionTransform = useTransform(() => `translate3d(${interactive && mode === 'C' ? sx.get() * 3 : 0}px, ${interactive && mode === 'C' ? sy.get() * 2 : 0}px, 0)`);
  const metrics = useRef<Telemetry>({ startedAt: 0, readyMs: null, frames: 0, mediaTimes: [], seams: [], lastWall: 0, lastMedia: -1, events: [] });

  useEffect(() => {
    const mq = matchMedia('(hover: hover) and (pointer: fine)');
    const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setFine(mq.matches);
    const updateMotion = () => setSystemReduced(motionPreference.matches);
    mq.addEventListener('change', update);
    motionPreference.addEventListener('change', updateMotion);
    return () => { mq.removeEventListener('change', update); motionPreference.removeEventListener('change', updateMotion); };
  }, []);

  useEffect(() => {
    const neutral = () => { rawX.set(0); rawY.set(0); };
    const move = (e: PointerEvent) => {
      if (!interactive || e.pointerType === 'touch') return;
      rawX.set(normalize(e.clientX, window.innerWidth));
      rawY.set(normalize(e.clientY, window.innerHeight));
    };
    neutral();
    if (!interactive) { sx.jump(0); sy.jump(0); }
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', neutral);
    window.addEventListener('pointercancel', neutral);
    window.addEventListener('blur', neutral);
    window.addEventListener('resize', neutral);
    return () => { window.removeEventListener('pointermove', move); document.documentElement.removeEventListener('pointerleave', neutral); window.removeEventListener('pointercancel', neutral); window.removeEventListener('blur', neutral); window.removeEventListener('resize', neutral); };
  }, [interactive, rawX, rawY, sx, sy]);

  useEffect(() => {
    if (!debug) return;
    const update = () => { if (coordinates.current) coordinates.current.textContent = `X ${rawX.get().toFixed(3)} / Y ${rawY.get().toFixed(3)}`; };
    const ux = rawX.on('change', update), uy = rawY.on('change', update);
    window.__v20 = { snapshot: () => ({ mode, interactive, reduced, fine, settings, target: [rawX.get(), rawY.get()], spring: [sx.get(), sy.get()], telemetry: metrics.current }), reset: () => { rawX.set(0); rawY.set(0); } };
    return () => { ux(); uy(); delete window.__v20; };
  }, [mode, interactive, reduced, fine, settings, rawX, rawY, sx, sy]);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    let disposed = false;
    const play = () => { void v.play().then(() => { if (!disposed) setStatus('playing'); }).catch(() => { if (!disposed) setStatus(v.error ? 'error' : 'blocked'); }); };
    const sync = () => {
      if (document.hidden || reduced || paused) {
        v.pause(); rawX.set(0); rawY.set(0);
        if (reduced) { v.currentTime = 0; setStatus('still'); }
      } else if (!v.error) play();
    };
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => { disposed = true; document.removeEventListener('visibilitychange', sync); v.pause(); };
  }, [reduced, paused, rawX, rawY]);

  useEffect(() => {
    const v = video.current;
    if (!v || !import.meta.env.DEV) return;
    metrics.current.startedAt = performance.now();
    let id = 0;
    const frame: VideoFrameRequestCallback = (now, metadata) => {
      const m = metrics.current;
      if (m.readyMs === null) m.readyMs = now - m.startedAt;
      m.frames++;
      if (metadata.mediaTime < m.lastMedia) m.seams.push({ before: m.lastMedia, after: metadata.mediaTime, gapMs: now - m.lastWall });
      m.lastMedia = metadata.mediaTime; m.lastWall = now;
      if (m.mediaTimes.length < 6000) m.mediaTimes.push(metadata.mediaTime);
      id = v.requestVideoFrameCallback(frame);
    };
    if ('requestVideoFrameCallback' in v) id = v.requestVideoFrameCallback(frame);
    return () => { if (id) v.cancelVideoFrameCallback(id); };
  }, []);

  const changeNumber = (key: keyof Settings, value: string) => setSettings(s => ({ ...s, [key]: Number(value) }));
  const togglePause = () => {
    if (status === 'blocked') {
      setPaused(false);
      void video.current?.play().then(() => setStatus('playing')).catch(() => setStatus('blocked'));
    } else setPaused(p => !p);
  };
  return <main className="studio" data-mode={mode} data-reduced={reduced}>
    <div className="environment" aria-hidden="true"><motion.div className="ambient" style={{ transform: atmosphereTransform, opacity: mode === 'C' ? 1 : 0 }} /></div>
    <div className="composition">
      <motion.figure className="photograph" style={{ transform: portraitTransform }}>
        <img className="poster" src="/poster.png" alt="Studio portrait of a dark-haired, bearded man in a white shirt against a silver-grey background." />
        <video ref={video} className={status === 'error' || reduced ? 'hidden-video' : ''} src="/portrait.mp4" poster="/poster.png" muted playsInline loop preload={reduced ? 'none' : 'auto'} aria-label="Living studio portrait with natural blinking and head movement" onError={() => setStatus('error')} onWaiting={() => { metrics.current.events.push(`waiting:${performance.now().toFixed(1)}`); }} />
      </motion.figure>
      <motion.footer className="caption" style={{ transform: captionTransform }}>
        <h1>A quiet presence.</h1>
        <div className="playback-controls">
          <p role="status">{status === 'error' ? 'Video unavailable. A still portrait is shown.' : reduced ? 'Still portrait · reduced motion' : status === 'blocked' ? 'Press play to begin.' : paused ? 'A moment, held.' : 'A living portrait'}</p>
          {!reduced && status !== 'error' && <button className="play-toggle" onClick={togglePause} aria-label={paused || status === 'blocked' ? 'Play portrait' : 'Pause portrait'}>{paused || status === 'blocked' ? 'Play' : 'Pause'}</button>}
        </div>
      </motion.footer>
    </div>
    {debug && <aside className="debug" aria-label="Development controls">
      <details open><summary>V20 · evaluation controls</summary>
        <fieldset><legend>Presentation</legend>{(['A','B','C'] as const).map(m => <label className="mode-choice" key={m}><input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} />{m} · {m === 'A' ? 'Living video' : m === 'B' ? 'Frame motion' : 'Environment'}</label>)}</fieldset>
        <output ref={coordinates}>X 0.000 / Y 0.000</output>
        {([['amplitudeX','Frame X (px)',0,2,0.1],['amplitudeY','Frame Y (px)',0,1.5,0.1],['background','Environment (px)',0,32,1],['stiffness','Spring stiffness',100,600,10],['damping','Spring damping',25,60,1]] as const).map(([key,label,min,max,step]) => <label className="range" key={key}>{label}<input type="range" min={min} max={max} step={step} value={settings[key]} onChange={e => changeNumber(key,e.target.value)} /><span>{settings[key]}</span></label>)}
        <label className="check"><input type="checkbox" checked={settings.enabled} onChange={e => setSettings(s => ({ ...s, enabled: e.target.checked }))} />Interactive motion</label>
        <label className="check"><input type="checkbox" checked={settings.reduced} onChange={e => setSettings(s => ({ ...s, reduced: e.target.checked }))} />Simulate reduced motion</label>
        <button onClick={() => { rawX.set(0); rawY.set(0); }}>Return to neutral</button>
        <p>Native 24 fps video. Cursor moves the presentation, never the head.</p>
      </details>
    </aside>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<App />);
