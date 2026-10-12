import manifest from './poses.json';

export type Point = { x: number; y: number };
export type Direction = keyof typeof manifest.anchors;
export type Pose = (typeof manifest.frames)[number];
export const strategy: string = 'B';
export const tuning = new URLSearchParams(location.search).get('tuning') === 'responsive' ? 'responsive' : 'boundary';
export const smoothingMs = tuning === 'responsive' ? 50 : 65;
const routeHysteresis = tuning === 'responsive' ? .004 : .008;
const newPose = (frame: number, x: number, y: number) => ({ frame: 5000 + frame,
  time: frame / 24, position: [x, y], file: `frame-${String(frame).padStart(3, '0')}.webp` });
export const lowerRight = newPose(132, 1, 1);
const intermediate = newPose(78, .8, .6);
export const downMode = new URLSearchParams(location.search).get('down') || 'progressive';
export const downFrames = [0,22,23,25,27,29,30,31,32].map((frame, i) => ({
  frame: 8000 + frame, time: frame / 24,
  position: [0, [.025,.15,.25,.37,.5,.68,.79,.89,1][i]],
  file: `frame-${String(frame).padStart(3, '0')}.webp`,
}));
const removed = new Set([20,28,44,56,60,148,152,8,40,42,202,174,178,180,182,186,160,164]);
export const endpointMode: string = 'own';
export const rightMode = new URLSearchParams(location.search).get('right') || 'own';
export const bridgeFrames = [0,22,28,34,40,46,54,60].map((frame,i) => ({
  frame: 12000 + frame, time: frame / 24,
  position: [[.025,.12,.25,.39,.54,.70,.87,1][i], 1],
  file: `frame-${String(frame).padStart(3,'0')}.webp`,
}));
const bridge = endpointMode === 'retained' ? [...bridgeFrames.slice(0,-1),lowerRight] : bridgeFrames;
export const rightFrames = [0,30,34,40,72,120].map((frame,i)=>({
 frame:16000+frame,time:frame/24,position:[1,1-[.025,.22,.38,.55,.78,1][i]],
 file:`frame-${String(frame).padStart(3,'0')}.webp`,
}));
const productionRight = manifest.frames.find(p=>p.frame===manifest.anchors.right.frame)!;
const rightRoute = rightMode === 'production' ? [...rightFrames.slice(0,-1),productionRight] : rightFrames;
export const frames = [...manifest.frames.filter(p => !removed.has(p.frame)),
  intermediate, ...downFrames, ...bridge, ...rightFrames];
export const anchors = manifest.anchors;
export const sourceVideo = `${manifest.source} + Flow 17:04:10 (LOWER-RIGHT B) + Flow 18:16:12 (DOWN ${downMode}) + V10 ${endpointMode} + V11 RIGHT ${rightMode}`;
export const assetDirectory = manifest.assetDirectory;
export const neutral = frames.find(p => p.frame === anchors.center.frame)!;
export const clamp = (n: number) => Math.max(-1, Math.min(1, n));

export function normalize(clientX: number, clientY: number, width: number, height: number): Point {
  return { x: clamp(clientX / width * 2 - 1), y: clamp(clientY / height * 2 - 1) };
}

export function direction({ x, y }: Point): Direction {
  const horizontal = Math.abs(x) <= 1 / 3 ? '' : x < 0 ? 'left' : 'right';
  const vertical = Math.abs(y) <= 1 / 3 ? '' : y < 0 ? 'upper' : 'lower';
  if (!horizontal) return !vertical ? 'center' : vertical === 'upper' ? 'up' : 'down';
  return (vertical ? `${vertical}-${horizontal}` : horizontal) as Direction;
}

/** Smooth coordinates, then select a real frame. Never blend facial images.
 * Interior poses are sparse: angular gating prevents unrelated directions from
 * being used just because they happen to be geometrically closer to center.
 */
function selectOriginal(point: Point, previous: Pose): Pose {
  if (direction(point) === 'center') return neutral;
  const goal = {
    x: Math.abs(point.x) <= 1 / 3 ? 0 : clamp(point.x * 1.5),
    y: Math.abs(point.y) <= 1 / 3 ? 0 : clamp(point.y * 1.5),
  };
  const magnitude = Math.hypot(goal.x, goal.y);
  const score = (pose: Pose) => {
    const [x, y] = pose.position;
    const length = Math.hypot(x, y);
    // Neutral is canonical; avoid late neutral frames with a changed smile.
    if (length < .15 && pose.frame !== neutral.frame) return Infinity;
    if (length > .15 && (x * goal.x + y * goal.y) / (length * magnitude) < .86) return Infinity;
    return (x - goal.x) ** 2 + (y - goal.y) ** 2;
  };
  let best = neutral;
  let distance = score(best);
  for (const frame of manifest.frames.filter(p => !removed.has(p.frame))) {
    const candidate = score(frame);
    if (candidate < distance) { best = frame; distance = candidate; }
  }
  // Small spatial hysteresis keeps a stationary cursor from alternating frames.
  return score(previous) <= distance + .002 ? previous : best;
}

export function ease(current: Point, target: Point, elapsed: number, smooth: boolean): Point {
  if (!smooth) return { ...target };
  const amount = 1 - Math.exp(-Math.min(elapsed, 50) / smoothingMs);
  const x = current.x + (target.x - current.x) * amount;
  const y = current.y + (target.y - current.y) * amount;
  return { x: Math.abs(x - target.x) < .001 ? target.x : x,
    y: Math.abs(y - target.y) < .001 ? target.y : y };
}

// Experiment only. No blending, synthetic poses or production mapping changes.
export function selectPose(point: Point, previous: Pose): Pose {
  // Genuine chin-rise route. No blink images, crossfade or queued playback.
  if (point.x > 1 / 3 && point.y >= 0 && point.y < point.x) {
    const progress = 1 - point.y / point.x;
    const candidates = [bridgeFrames[bridgeFrames.length-1], ...rightRoute];
    const level = (p: Pose) => p.frame === 12060 ? 0 : p.frame === productionRight.frame ? 1 : 1-p.position[1];
    let best = candidates[0];
    for (const pose of candidates) if (Math.abs(level(pose)-progress) < Math.abs(level(best)-progress)) best=pose;
    return candidates.some(p=>p.frame===previous.frame) &&
      Math.abs(level(previous)-progress)<=Math.abs(level(best)-progress)+routeHysteresis ? previous : best;
  }
  // Continuous lower-right angular route: preserve the exact x=0 DOWN trajectory.
  if (point.x > .03 && point.y >= point.x && (point.y >= .65 || point.x > 1 / 3)) {
    const progress = Math.min(1,point.x / point.y);
    const candidates = [downFrames[downFrames.length-1], ...bridge];
    const level = (p: Pose) => p.frame === 8032 ? 0 : p.position[0];
    let best = candidates[0];
    for (const pose of candidates) if (Math.abs(level(pose)-progress) < Math.abs(level(best)-progress)) best = pose;
    return candidates.some(p=>p.frame===previous.frame) &&
      Math.abs(level(previous)-progress) <= Math.abs(level(best)-progress)+routeHysteresis ? previous : best;
  }
  // Experimental vertical corridor bypasses the production central dead zone.
  // Progress is visually annotated, independent of source timestamp spacing.
  if (Math.abs(point.x) <= 1 / 3 && point.y > 0) {
    const progress = downMode === 'banded' ? (point.y <= 1/3 ? 0 : clamp(point.y * 1.5)) : point.y;
    const candidates = [neutral, ...downFrames];
    const level = (p: Pose) => p.frame === neutral.frame ? 0 : p.position[1];
    let best = neutral;
    for (const pose of candidates) if (Math.abs(level(pose)-progress) < Math.abs(level(best)-progress)) best = pose;
    return candidates.some(p => p.frame === previous.frame) &&
      Math.abs(level(previous)-progress) <= Math.abs(level(best)-progress) + routeHysteresis ? previous : best;
  }
  // The validated RIGHT endpoint must remain stable across the horizontal axis.
  // Upper diagonals still use their original verified source poses.
  if (direction(point) === 'right') return rightRoute[rightRoute.length - 1];
  const isLowerRight = direction(point) === 'lower-right';
  const destination = isLowerRight ? (strategy === 'B' && point.y < .65 ? intermediate : bridge[bridge.length-1])
    : selectOriginal(point, previous);
  return destination;
}
