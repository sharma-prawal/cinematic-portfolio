import { anchors, assetDirectory, frames, neutral } from './tracking';

export type FrameCache = { images: Map<number, HTMLImageElement>; failed: number[] };
const caches = new Map<string, Promise<FrameCache>>();

export function frameUrl(frame: number, variant: string): string {
  const directory = frame >= 5000 ? 'frames/flow-1704' : assetDirectory;
  const sourceFrame = frame >= 5000 ? frame - 5000 : frame;
  return `${import.meta.env.BASE_URL}${directory}/${variant}/frame-${String(sourceFrame).padStart(3, '0')}.webp`;
}

export function preloadFrames(variant: string): Promise<FrameCache> {
  const existing = caches.get(variant);
  if (existing) return existing;
  const promise = (async () => {
    const images = new Map<number, HTMLImageElement>();
    const failed: number[] = [];
    const priority = new Set([neutral.frame, ...Object.values(anchors).map(p => p.frame)]);
    const queue = [...frames].sort((a, b) => Number(priority.has(b.frame)) - Number(priority.has(a.frame)));
    const worker = async () => {
      while (queue.length) {
        const pose = queue.shift()!;
        const image = new Image();
        image.src = frameUrl(pose.frame, variant);
        try { await image.decode(); images.set(pose.frame, image); }
        catch { failed.push(pose.frame); }
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
    return { images, failed };
  })();
  caches.set(variant, promise);
  return promise;
}
