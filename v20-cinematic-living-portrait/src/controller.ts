export const normalize = (position: number, size: number) => size > 0 ? Math.max(-1, Math.min(1, position / size * 2 - 1)) : 0;
export const defaults = { amplitudeX: 2, amplitudeY: 1.5, background: 18, stiffness: 300, damping: 35, enabled: true, reduced: false };
export type Settings = typeof defaults;
export type Mode = 'A' | 'B' | 'C';
export function parseMode(value: string | null): Mode { return value === 'B' || value === 'C' ? value : 'A'; }
