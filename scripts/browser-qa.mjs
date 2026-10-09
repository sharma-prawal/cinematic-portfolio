import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.QA_URL || 'http://127.0.0.1:5173';
const output = new URL('../qa/', import.meta.url);
await mkdir(output, { recursive: true });
const manifest = JSON.parse(await readFile(new URL('../src/poses.json', import.meta.url), 'utf8'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { browser: await browser.version(), source: manifest.source, frameCount: manifest.frames.length,
  viewports: [], directions: [], transitions: [], checks: [], benchmark: null };
const locations = {
  center: [.5, .5], left: [.08, .5], right: [.92, .5], up: [.5, .08], down: [.5, .92],
  'upper-left': [.08, .08], 'upper-right': [.92, .08], 'lower-left': [.08, .92], 'lower-right': [.92, .92],
};
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  for (const [width, height] of [[1920,1080], [1440,900], [1366,768], [1024,768], [390,844]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: width === 390 ? 3 : 2 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/?debug=1`);
    await page.waitForFunction(() => document.querySelector('[data-testid="assets"]')?.textContent === 'Ready');
    assert.equal(await page.getByTestId('source-video').innerText(), manifest.source);
    const frameRequests = await page.evaluate(() => performance.getEntriesByType('resource').map(e => e.name).filter(url => /\/frames\//.test(url)));
    assert.ok(frameRequests.length > 0);
    assert.ok(frameRequests.every(url => url.includes(`/${manifest.assetDirectory}/`)), 'Only new-source image URLs may load');
    await page.mouse.move(width / 2, height / 2);
    await wait(350);
    const layout = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const r = canvas.getBoundingClientRect();
      const pixel = [...canvas.getContext('2d').getImageData(canvas.width / 2, canvas.height / 3, 1, 1).data];
      return { scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
        width: innerWidth, height: innerHeight, portrait: { x: r.x, y: r.y, width: r.width, height: r.height },
        canvas: [canvas.width, canvas.height], pixel, videoCount: document.querySelectorAll('video').length };
    });
    assert.equal(layout.scrollWidth, width);
    assert.equal(layout.scrollHeight, height);
    assert.equal(layout.videoCount, 0);
    assert.ok(layout.pixel[0] > 20 && layout.pixel[3] === 255);
    assert.ok(layout.portrait.y >= 0 && layout.portrait.y + layout.portrait.height <= height);
    assert.ok(Math.abs(layout.portrait.width / layout.portrait.height - 16 / 9) < .01);
    await page.screenshot({ path: new URL(`center-${width}x${height}.png`, output).pathname,
      fullPage: true, style: '.debug { visibility: hidden; }' });
    for (const [name, [x, y]] of Object.entries(locations)) {
      await page.mouse.move(x * width, y * height, { steps: 12 });
      await wait(400);
      assert.equal(await page.getByTestId('target').innerText(), name);
      const label = await page.getByTestId('frame').innerText();
      const frame = Number(label.match(/frame (\d+)/)[1]);
      assert.equal(frame, manifest.anchors[name].frame, `${width}: ${name} selected ${frame}`);
      if (width === 1440) {
        report.directions.push({ name, frame, sourceTime: manifest.anchors[name].time });
        await page.screenshot({ path: new URL(`${name}-1440x900.png`, output).pathname,
          fullPage: true, style: '.debug { visibility: hidden; }' });
      }
    }
    for (const [from, to] of [['center','lower-left'], ['center','down'], ['center','lower-right'],
      ['lower-left','lower-right'], ['down','center'], ['left','right'], ['upper-left','lower-right']]) {
      const move = async name => {
        const [x,y] = locations[name]; await page.mouse.move(x*width,y*height,{steps:8}); await wait(350);
        assert.equal(await page.getByTestId('target').innerText(), name);
        const selected = Number((await page.getByTestId('frame').innerText()).match(/frame (\d+)/)[1]);
        assert.equal(selected, manifest.anchors[name].frame);
      };
      await move(from); await move(to);
      report.transitions.push({ width, from, to, result: 'pass' });
    }
    // Same loaded assets remain in use during rapid motion and opposite jumps.
    const requests = [];
    page.on('request', request => { if (/\/frames\//.test(request.url())) requests.push(request.url()); });
    for (let i = 0; i < 30; i++) await page.mouse.move((i % 2 ? .98 : .02) * width, (i % 3 ? .02 : .98) * height);
    await page.mouse.move(width - 2, height - 2);
    await wait(450);
    assert.equal(await page.getByTestId('target').innerText(), 'lower-right');
    assert.equal(requests.length, 0);
    const stable = await page.getByTestId('frame').innerText();
    const drawn = await page.getByTestId('drawn').innerText();
    await wait(450);
    assert.equal(await page.getByTestId('frame').innerText(), stable);
    assert.equal(await page.getByTestId('drawn').innerText(), drawn);
    await page.mouse.move(-20, -20);
    await wait(450);
    assert.equal(await page.getByTestId('target').innerText(), 'center');
    assert.ok((await page.getByTestId('frame').innerText()).endsWith(`frame ${manifest.anchors.center.frame}`));
    await page.getByLabel('Show cursor grid').check();
    assert.equal(await page.locator('.cursor-grid > div').count(), 9);
    await page.getByLabel('Smooth tracking').uncheck();
    assert.equal(await page.getByLabel('Smooth tracking').isChecked(), false);
    assert.deepEqual(errors, []);
    report.viewports.push({ width, height, layout, fps: await page.getByTestId('fps').innerText(), errors });
    await context.close();
  }
  report.checks.push('All nine exact anchor frames at all five viewport sizes; no scroll, clipping, black canvas, video elements, or runtime errors.',
    'Rapid opposite movements and viewport corners pass; pointer exit returns to canonical neutral; stopped cursor does not redraw.',
    'No additional frame requests after preload; debug grid and smoothing controls work.');

  const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const mobile = await touch.newPage();
  await mobile.goto(`${base}/?debug=1`);
  await mobile.waitForFunction(() => document.querySelector('[data-testid="assets"]')?.textContent === 'Ready');
  assert.ok((await mobile.getByTestId('frame').innerText()).endsWith(`frame ${manifest.anchors.center.frame}`));
  const session = await touch.newCDPSession(mobile);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 340, y: 720 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 350, y: 750 }] });
  await wait(500);
  assert.equal(await mobile.getByTestId('target').innerText(), 'lower-right');
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await wait(500);
  assert.equal(await mobile.getByTestId('target').innerText(), 'center');
  await touch.close();
  report.checks.push('Touch defaults to center, deliberate drag tracks position, and release returns to center (Chromium mobile emulation).');

  const reduced = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(`${base}/?debug=1`);
  await reducedPage.waitForFunction(() => document.querySelector('[data-testid="assets"]')?.textContent === 'Ready');
  await reducedPage.mouse.move(1320, 450);
  await wait(250);
  assert.equal(await reducedPage.getByLabel('Smooth tracking').isDisabled(), true);
  assert.ok((await reducedPage.getByTestId('frame').innerText()).endsWith(`frame ${manifest.anchors.right.frame}`));
  await reduced.close();
  report.checks.push('prefers-reduced-motion disables smoothing and selects deliberate source poses immediately.');

  const normal = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await normal.goto(base);
  await normal.locator('canvas.is-ready').waitFor();
  assert.equal(await normal.locator('.debug').count(), 0);
  assert.equal(await normal.locator('body').innerText(), 'Move your cursor');

  // Development-only benchmark: decode source video in this isolated test page.
  report.benchmark = await normal.evaluate(async ({ timestamps, files, base, source, directory }) => {
    const median = values => [...values].sort((a,b) => a-b)[Math.floor(values.length/2)];
    const p95 = values => [...values].sort((a,b) => a-b)[Math.floor(values.length*.95)];
    const video = document.createElement('video');
    video.muted = true; video.preload = 'auto';
    video.src = `${base}/${source}`;
    await new Promise((resolve, reject) => { video.onloadeddata = resolve; video.onerror = reject; });
    const seekTimes = [];
    for (let repeat = 0; repeat < 3; repeat++) {
      for (const time of timestamps) {
        if (Math.abs(video.currentTime-time) < .01) continue;
        const start = performance.now();
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Seek timeout')), 5000);
          video.onseeked = () => { clearTimeout(timeout); resolve(); };
          video.currentTime = time;
        });
        seekTimes.push(performance.now()-start);
      }
    }
    video.removeAttribute('src'); video.load();
    const images = await Promise.all(files.map(async file => {
      const image = new Image(); image.src = `${base}/${directory}/desktop/${file}`; await image.decode(); return image;
    }));
    const canvas = document.createElement('canvas'); canvas.width = 960; canvas.height = 540;
    const context = canvas.getContext('2d', { alpha: false });
    const drawTimes = [];
    for (let n = 0; n < 90; n++) {
      const start = performance.now(); context.drawImage(images[n % images.length], 0, 0);
      drawTimes.push(performance.now()-start);
    }
    return { samples: seekTimes.length, videoSeekMedianMs: median(seekTimes), videoSeekP95Ms: p95(seekTimes),
      atlasDrawMedianMs: median(drawTimes), atlasDrawP95Ms: p95(drawTimes),
      note: 'Local Chrome headless, warm assets. Seek ends at seeked; draw measures CPU submission, not screen presentation. Normal app never loads the video.' };
  }, { timestamps: Object.values(manifest.anchors).map(p => p.time), source: manifest.source, directory: manifest.assetDirectory,
    files: Object.values(manifest.anchors).map(p => `frame-${String(p.frame).padStart(3,'0')}.webp`), base });
  await normal.close();
  await writeFile(new URL('results.json', output), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
