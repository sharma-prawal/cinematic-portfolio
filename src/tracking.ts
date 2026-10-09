import manifest from './poses.json';

export type Point = { x: number; y: number };
export type Direction = keyof typeof manifest.anchors;
export type Pose = (typeof manifest.frames)[number];
export const frames = manifest.frames;
export const anchors = manifest.anchors;
export const sourceVideo = manifest.source;
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
export function selectPose(point: Point, previous: Pose): Pose {
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
  for (const frame of frames) {
    const candidate = score(frame);
    if (candidate < distance) { best = frame; distance = candidate; }
  }
  // Small spatial hysteresis keeps a stationary cursor from alternating frames.
  return score(previous) <= distance + .002 ? previous : best;
}

export function ease(current: Point, target: Point, elapsed: number, smooth: boolean): Point {
  if (!smooth) return { ...target };
  const amount = 1 - Math.exp(-Math.min(elapsed, 50) / 65);
  const x = current.x + (target.x - current.x) * amount;
  const y = current.y + (target.y - current.y) * amount;
  return { x: Math.abs(x - target.x) < .001 ? target.x : x,
    y: Math.abs(y - target.y) < .001 ? target.y : y };
}
