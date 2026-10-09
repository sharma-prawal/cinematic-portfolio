import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { writeFile, readFile } from 'node:fs/promises';
const manifest = JSON.parse(await readFile(new URL('../src/poses.json', import.meta.url), 'utf8'));
const neutralFile = `frame-${String(manifest.anchors.center.frame).padStart(3, '0')}.webp`;

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  const production = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  production.on('pageerror', e => errors.push(e.message));
  await production.goto('http://127.0.0.1:4173/?debug=1');
  await production.locator('canvas.is-ready').waitFor();
  assert.equal(await production.locator('.debug').count(), 0);
  assert.equal(await production.locator('.cursor-grid').count(), 0);
  assert.equal(await production.locator('video').count(), 0);
  const assetUrls = await production.evaluate(() => performance.getEntriesByType('resource').map(e => e.name).filter(url => /\/frames\//.test(url)));
  assert.ok(assetUrls.length > 0 && assetUrls.every(url => url.includes(`/${manifest.assetDirectory}/`)));
  const center = await production.locator('canvas').evaluate(c => c.toDataURL());
  await production.mouse.move(1300, 450, { steps: 15 });
  await production.waitForTimeout(350);
  const right = await production.locator('canvas').evaluate(c => c.toDataURL());
  assert.notEqual(center, right);
  assert.deepEqual(errors, []);
  results.push('Production preview loads and tracks input. Debug query cannot reveal debug controls; no video element or runtime errors.');
  await production.close();

  const missing = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await missing.route(`**/${manifest.assetDirectory}/desktop/*.webp`, route => route.request().url().endsWith(neutralFile) ? route.continue() : route.abort());
  await missing.goto('http://127.0.0.1:5173/?debug=1');
  await missing.locator('canvas.is-ready').waitFor();
  const before = await missing.locator('canvas').evaluate(c => c.toDataURL());
  await missing.mouse.move(1350, 450);
  await missing.waitForTimeout(400);
  assert.equal(await missing.locator('canvas').evaluate(c => c.toDataURL()), before);
  assert.ok((await missing.getByTestId('assets').innerText()).includes(`${manifest.frames.length - 1} unavailable`));
  results.push(`When all ${manifest.frames.length - 1} non-neutral images fail, the valid neutral canvas remains visible without flashes or clearing.`);
  await missing.close();

  const failed = await browser.newPage();
  await failed.route('**/frames/**/*.webp', route => route.abort());
  await failed.goto('http://127.0.0.1:5173');
  await failed.getByRole('alert').waitFor();
  assert.equal(await failed.getByRole('button', { name: 'Reload' }).count(), 1);
  results.push('Complete asset failure exposes the reload recovery message.');
  await failed.close();
  await writeFile(new URL('../qa/smoke-results.json', import.meta.url), JSON.stringify(results, null, 2)+'\n');
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
