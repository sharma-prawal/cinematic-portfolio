export type Strategy = 'nearest' | 'neighbor' | 'continuity';
export type Mode = 'A' | 'B' | 'C';
export interface Photo {
  id: number; source: string; filename: string; frame: number; timestamp: number;
  yaw: number; pitch: number; roll: number; blink: number; eye_state: string;
  eye_openness: number[]; gaze: number[]; face_scale: number; landmarks: number[][];
  expression: { smile: number; jaw_open: number }; quality: number;
  neighbors: number[]; url: string; sharp_url: string;
}
export interface Atlas {
  version: number; primary: string; neutral: number; frames: Photo[];
  sequence: { id: number; url: string; timestamp: number }[];
  calibration: { yaw0: number; pitch0: number; yaw_left: number; yaw_right: number; pitch_up: number; pitch_down: number; note: string };
  anchors: Record<string, { frame: number; input: [number, number]; error: number }>;
  approved_repairs: Photo[]; usage: { primary: number; secondary: number };
  selection: { max_pose_error: number; hysteresis: number; continuity_weight: number; large_jump_deg: number };
  components: number[];
}
export function normalize(value: number, extent: number) {
  return Number.isFinite(value) && extent > 0 ? Math.max(-1, Math.min(1, value / extent * 2 - 1)) : 0;
}
export function smooth(current: number, target: number, delta: number, tau: number) {
  if (tau <= 0) return target;
  const next = current + (target - current) * (1 - Math.exp(-Math.max(0, delta) / tau));
  return Math.abs(next - target) < .00001 ? target : next;
}
export function targetPose(atlas: Atlas, x: number, y: number) {
  const c = atlas.calibration;
  return { yaw: c.yaw0 + x * (x < 0 ? c.yaw_left : c.yaw_right), pitch: c.pitch0 - y * (y < 0 ? c.pitch_up : c.pitch_down) };
}
export function poseError(photo: Photo, yaw: number, pitch: number) {
  return Math.hypot((photo.yaw - yaw) / 30, (photo.pitch - pitch) / 18);
}
export function angularDistance(a: Photo, b: Photo) { return Math.hypot(a.yaw - b.yaw, a.pitch - b.pitch); }
export function appearanceCost(a: Photo, b: Photo) {
  if (a.id === b.id && a.source === b.source) return 0;
  const landmark = a.landmarks.reduce((sum, p, i) => sum + Math.hypot(p[0] - b.landmarks[i][0], p[1] - b.landmarks[i][1]), 0) / a.landmarks.length;
  const gaze = Math.hypot(a.gaze[0] - b.gaze[0], a.gaze[2] - b.gaze[2]);
  const chronological = a.source === b.source && Math.abs(a.frame - b.frame) <= 2;
  return Math.min(1.5, landmark / 30 + gaze * 2 + Math.abs(a.roll - b.roll) / 15 + Math.abs(a.face_scale / b.face_scale - 1) * 5 + Math.abs(a.expression.smile - b.expression.smile) + (chronological ? 0 : .12)) + (a.source === b.source ? 0 : 30);
}
export interface Selection { photo: Photo; nearest: Photo; supported: boolean; limited: boolean; error: number; angularJump: number; reason: string }
export function selectPhoto(atlas: Atlas, current: Photo, x: number, y: number, strategy: Strategy = 'continuity', mode: Mode = 'B'): Selection {
  const target = targetPose(atlas, x, y);
  const neutral = atlas.frames.find(p => p.id === atlas.neutral)!;
  const pool = mode === 'C' ? [...atlas.frames, ...atlas.approved_repairs] : atlas.frames;
  if (Math.hypot(x, y) < .065) return { photo: neutral, nearest: neutral, supported: true, limited: false, error: 0, angularJump: angularDistance(current, neutral), reason: 'Neutral photograph' };
  const ranked = pool.map(photo => ({ photo, error: poseError(photo, target.yaw, target.pitch) })).sort((a, b) => a.error - b.error || a.photo.id - b.photo.id);
  const best = ranked[0];
  if (best.error > atlas.selection.max_pose_error) {
    // Stable fallback: never run around an unrelated source arc to fill a missing orientation.
    return { photo: current, nearest: best.photo, supported: false, limited: true, error: best.error, angularJump: 0, reason: 'Missing intermediate pose · holding last photograph' };
  }
  let chosen = best;
  if (strategy !== 'nearest') {
    const candidates = ranked.filter(p => p.error <= best.error + .035);
    const score = (p: typeof best) => p.error + (strategy === 'neighbor' ? (current.neighbors.includes(p.photo.id) ? 0 : .022) : appearanceCost(current, p.photo) * atlas.selection.continuity_weight);
    chosen = candidates.reduce((a, b) => score(b) < score(a) ? b : a);
    const currentError = poseError(current, target.yaw, target.pitch);
    if (currentError <= chosen.error + atlas.selection.hysteresis && currentError <= atlas.selection.max_pose_error) chosen = { photo: current, error: currentError };
  }
  const jump = angularDistance(current, chosen.photo);
  const limited = jump > atlas.selection.large_jump_deg;
  return { photo: chosen.photo, nearest: best.photo, supported: true, limited, error: chosen.error, angularJump: jump, reason: limited ? 'Sparse transition · discrete photograph change' : 'Available primary photograph' };
}
export function validateAtlas(value: unknown): asserts value is Atlas {
  const a = value as Atlas;
  if (!a || a.version !== 24 || !Array.isArray(a.frames) || !a.frames.length || a.sequence?.length !== 240 || !a.frames.some(p => p.id === a.neutral)) throw new Error('The V24 manifest is incomplete. Rebuild its image library.');
  const ids = new Set<number>();
  for (const p of a.frames) {
    if (ids.has(p.id) || !Number.isFinite(p.yaw) || !Number.isFinite(p.pitch) || !p.url.startsWith('/frames/primary/') || !p.sharp_url.startsWith('/frames/primary/')) throw new Error('The image manifest failed its provenance check.');
    ids.add(p.id);
  }
  for (const p of a.frames) if (p.neighbors.some(n => !ids.has(n))) throw new Error('A photograph has an invalid neighbor.');
}
