import { useEffect, useRef, useState } from 'react';
import { frameUrl, preloadFrames } from './frameCache';
import { direction, ease, neutral, normalize, selectPose, sourceVideo } from './tracking';
import type { Point } from './tracking';

type Stats = { cursor: Point; smoothed: Point; target: string; frame: number; time: number;
  fps: number; drawn: number; ready: boolean; failed: number; reduced: boolean };
const initial: Stats = { cursor: { x: 0, y: 0 }, smoothed: { x: 0, y: 0 }, target: 'center',
  frame: neutral.frame, time: neutral.time, fps: 0, drawn: 0, ready: false, failed: 0, reduced: false };
const debugEnabled = import.meta.env.DEV && new URLSearchParams(location.search).get('debug') === '1';

export function HeadTracker() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statsRef = useRef<Stats>({ ...initial });
  const smoothingRef = useRef(true);
  const [stats, setStats] = useState(initial);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [grid, setGrid] = useState(false);
  const [smoothing, setSmoothing] = useState(true);
  const [variant] = useState(() => innerWidth <= 640 ? 'mobile' : 'desktop');

  useEffect(() => {
    const canvas = canvasRef.current!;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) { setError(true); return; }
    let disposed = false;
    let animation = 0;
    let target: Point = { x: 0, y: 0 };
    let current: Point = { x: 0, y: 0 };
    let pose = neutral;
    let drawnFrame = -1;
    let lastTick = 0;
    let lastFps = 0;
    let ticks = 0;
    let touchActive = false;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch' && !touchActive) return;
      target = normalize(event.clientX, event.clientY, innerWidth, innerHeight);
    };
    const reset = () => { target = { x: 0, y: 0 }; touchActive = false; };
    const onLeave = (event: PointerEvent) => { if (!event.relatedTarget) reset(); };
    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch' && !(event.target as Element).closest('.debug')) {
        touchActive = true; onPointer(event);
      }
    };
    const onUp = (event: PointerEvent) => { if (event.pointerType === 'touch') reset(); };
    const onVisibility = () => { if (document.hidden) reset(); };
    const onResize = () => reset();
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', reset);
    window.addEventListener('pointerout', onLeave);
    window.addEventListener('blur', reset);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);

    void preloadFrames(variant).then(cache => {
      if (disposed) return;
      const center = cache.images.get(neutral.frame);
      if (!center) { setError(true); return; }
      canvas.width = center.naturalWidth;
      canvas.height = center.naturalHeight;
      context.drawImage(center, 0, 0);
      drawnFrame = neutral.frame;
      setError(false);
      setReady(true);
      statsRef.current.ready = true;
      statsRef.current.failed = cache.failed.length;
      const render = (now: number) => {
        if (disposed) return;
        const elapsed = lastTick ? now - lastTick : 16.67;
        lastTick = now;
        current = ease(current, target, elapsed, smoothingRef.current && !motion.matches);
        const desired = selectPose(current, pose);
        // Missing derived files never clear the last valid portrait.
        if (cache.images.has(desired.frame)) pose = desired;
        if (drawnFrame !== pose.frame) {
          context.drawImage(cache.images.get(pose.frame)!, 0, 0);
          drawnFrame = pose.frame;
          statsRef.current.drawn++;
        }
        ticks++;
        if (now - lastFps >= 500) {
          statsRef.current.fps = Math.round(ticks * 1000 / (now - lastFps));
          ticks = 0; lastFps = now;
        }
        Object.assign(statsRef.current, { cursor: target, smoothed: current,
          target: direction(target), frame: pose.frame, time: pose.time, reduced: motion.matches });
        animation = requestAnimationFrame(render);
      };
      lastFps = performance.now();
      animation = requestAnimationFrame(render);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(animation);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', reset);
      window.removeEventListener('pointerout', onLeave);
      window.removeEventListener('blur', reset);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [variant]);

  useEffect(() => {
    if (!debugEnabled) return;
    const interval = window.setInterval(() => setStats({ ...statsRef.current }), 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="experience" aria-label="Interactive head-tracking portrait">
      <div className="portrait" role="img" aria-label="A man in a white shirt follows your pointer with his gaze.">
        <picture className={ready ? 'poster poster--hidden' : 'poster'} aria-hidden="true">
          <source media="(max-width: 640px)" srcSet={frameUrl(neutral.frame, 'mobile')} />
          <img src={frameUrl(neutral.frame, 'desktop')} alt="" fetchPriority="high" draggable={false} onError={() => setError(true)} />
        </picture>
        <canvas ref={canvasRef} className={ready ? 'portrait-canvas is-ready' : 'portrait-canvas'} aria-hidden="true" />
      </div>
      {error ? <p className="instruction" role="alert">The portrait couldn’t load. <button onClick={() => location.reload()}>Reload</button></p>
        : <p className="instruction"><span className="desktop-hint">Move your cursor</span><span className="touch-hint">Touch and move</span></p>}
      {debugEnabled && <>
        {grid && <div className="cursor-grid" aria-hidden="true">
          {['upper-left', 'up', 'upper-right', 'left', 'center', 'right', 'lower-left', 'down', 'lower-right'].map(label =>
            <div key={label} data-active={label === stats.target}>{label}</div>)}
          <i style={{ left: `${(stats.smoothed.x + 1) * 50}%`, top: `${(stats.smoothed.y + 1) * 50}%` }} />
        </div>}
        <aside className="debug" aria-label="Tracking diagnostics">
          <h1>Tracking diagnostics</h1>
          <dl>
            <div><dt>Video</dt><dd data-testid="source-video">{sourceVideo}</dd></div>
            <div><dt>Cursor</dt><dd data-testid="cursor">{stats.cursor.x.toFixed(3)}, {stats.cursor.y.toFixed(3)}</dd></div>
            <div><dt>Target</dt><dd data-testid="target">{stats.target}</dd></div>
            <div><dt>Source</dt><dd data-testid="frame">{stats.time.toFixed(3)} s · frame {stats.frame >= 12000 ? stats.frame - 12000 : stats.frame >= 8000 ? stats.frame - 8000 : stats.frame >= 5000 ? stats.frame - 5000 : stats.frame}{stats.frame >= 12000 ? ' · V10' : stats.frame >= 8000 ? ' · DOWN clip' : stats.frame >= 5000 ? ' · LOWER-RIGHT clip' : ''}</dd></div>
            <div><dt>Renderer</dt><dd>Canvas 2D · frame atlas</dd></div>
            <div><dt>Smoothing</dt><dd>{smoothing && !stats.reduced ? 'On · 65 ms' : 'Off'}</dd></div>
            <div><dt>Render loop</dt><dd data-testid="fps">≈ {stats.fps} fps</dd></div>
            <div><dt>Frames drawn</dt><dd data-testid="drawn">{stats.drawn}</dd></div>
            <div><dt>Assets</dt><dd data-testid="assets">{stats.ready ? 'Ready' : 'Loading'}{stats.failed ? ` · ${stats.failed} unavailable` : ''}</dd></div>
          </dl>
          <label><input type="checkbox" checked={grid} onChange={event => setGrid(event.target.checked)} /> Show cursor grid</label>
          <label><input type="checkbox" checked={smoothing} disabled={stats.reduced}
            onChange={event => { setSmoothing(event.target.checked); smoothingRef.current = event.target.checked; }} /> Smooth tracking</label>
          <p>{stats.reduced ? 'Reduced motion: immediate pose selection.' : 'Coordinates −1…+1; directions from the viewer’s perspective.'}</p>
          <p>Some center transitions are discrete. All images are recorded source frames.</p>
        </aside>
      </>}
    </main>
  );
}
