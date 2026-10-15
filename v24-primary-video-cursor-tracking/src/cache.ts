export interface CacheStats { loaded: number; pending: number; queued: number; hits: number; misses: number; evictions: number; errors: number; decodes: number; decodeMs: number[]; loadMs: number[]; peakImages: number; nominalDecodedBytes: number; peakNominalBytes: number }
export class PhotoCache {
  private images = new Map<number, ImageBitmap>();
  private active = new Set<number>();
  private failed = new Set<number>();
  private queue: { id: number; url: string }[] = [];
  private pinned = new Set<number>();
  private controllers = new Set<AbortController>();
  private disposed = false;
  stats: CacheStats = { loaded: 0, pending: 0, queued: 0, hits: 0, misses: 0, evictions: 0, errors: 0, decodes: 0, decodeMs: [], loadMs: [], peakImages: 0, nominalDecodedBytes: 0, peakNominalBytes: 0 };
  constructor(private readonly bytesPerImage: number, readonly limit = 24, readonly concurrency = 2) {}
  peek(id: number) { return this.images.get(id); }
  get(id: number) {
    const image = this.images.get(id);
    if (image) { this.images.delete(id); this.images.set(id, image); this.stats.hits++; }
    else this.stats.misses++;
    return image;
  }
  request(requests: { id: number; url: string }[], pinned: number[]) {
    if (this.disposed) return;
    this.pinned = new Set(pinned);
    // Replace speculative work on reversal instead of building a playback queue.
    this.queue = requests.filter((r, i) => requests.findIndex(p => p.id === r.id) === i && !this.images.has(r.id) && !this.active.has(r.id) && !this.failed.has(r.id)).slice(0, 10);
    this.pump();
  }
  hasFailed(id: number) { return this.failed.has(id); }
  retry() { this.failed.clear(); }
  private updateStats() {
    const count = this.images.size + this.active.size;
    Object.assign(this.stats, { loaded: this.images.size, pending: this.active.size, queued: this.queue.length, nominalDecodedBytes: count * this.bytesPerImage });
    this.stats.peakImages = Math.max(this.stats.peakImages, count);
    this.stats.peakNominalBytes = Math.max(this.stats.peakNominalBytes, this.stats.nominalDecodedBytes);
  }
  private pump() {
    if (this.disposed) return;
    while (this.active.size < this.concurrency && this.queue.length) {
      if (this.images.size + this.active.size >= this.limit) {
        const evict = [...this.images.keys()].find(id => !this.pinned.has(id));
        if (evict === undefined) break;
        this.images.get(evict)!.close(); this.images.delete(evict); this.stats.evictions++;
      }
      const item = this.queue.shift()!;
      if (this.images.has(item.id) || this.active.has(item.id)) continue;
      this.active.add(item.id);
      const controller = new AbortController(); this.controllers.add(controller);
      const start = performance.now();
      void fetch(item.url, { signal: controller.signal }).then(response => {
        if (!response.ok) throw new Error(`Image request failed: ${response.status}`);
        return response.blob();
      }).then(async blob => {
        const decodeStart = performance.now();
        const bitmap = await createImageBitmap(blob);
        return { bitmap, decodeMs: performance.now() - decodeStart };
      }).then(({ bitmap, decodeMs }) => {
        if (this.disposed) { bitmap.close(); return; }
        this.images.set(item.id, bitmap); this.stats.decodes++;
        this.stats.decodeMs.push(decodeMs); this.stats.loadMs.push(performance.now() - start);
        if (this.stats.decodeMs.length > 1000) { this.stats.decodeMs.shift(); this.stats.loadMs.shift(); }
      }).catch(() => {
        if (!this.disposed) { this.failed.add(item.id); this.stats.errors++; }
      }).finally(() => {
        this.active.delete(item.id); this.controllers.delete(controller); this.updateStats(); this.pump();
      });
      this.updateStats();
    }
    this.updateStats();
  }
  dispose() {
    this.disposed = true; this.controllers.forEach(c => c.abort()); this.controllers.clear();
    this.images.forEach(image => image.close()); this.images.clear(); this.queue = [];
  }
}
