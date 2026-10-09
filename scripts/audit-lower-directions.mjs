import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const output = new URL('../qa/direction-audit/', import.meta.url);
await mkdir(output, { recursive: true });
const manifest = JSON.parse(await readFile(new URL('../src/poses.json', import.meta.url), 'utf8'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { source: manifest.source, viewport: [1440, 900], deviceScaleFactor: 2,
  atlasFrames: manifest.frames.length, captures: [], movements: [], errors: [] };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2,
    recordVideo: { dir: new URL('video/', output).pathname, size: { width: 1440, height: 900 } } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    // Observe actual canvas draws, including intermediates omitted by 5 Hz HUD.
    window.__auditDraws = [];
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      const result = draw.apply(this, args);
      const match = args[0]?.src?.match(/frame-(\d+)\.webp/);
      if (match) window.__auditDraws.push({ ms: performance.now(), frame: Number(match[1]) });
      return result;
    };
  });
  page.on('pageerror', e => report.errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/?debug=1');
  await page.waitForFunction(() => document.querySelector('[data-testid="assets"]')?.textContent === 'Ready');
  const points = { center: [.5,.5], 'lower-left': [.08,.92], down: [.5,.92], 'lower-right': [.92,.92] };
  const move = async (name, steps = 30) => {
    const [x,y] = points[name]; await page.mouse.move(x*1440,y*900,{steps}); await page.waitForTimeout(500);
  };
  for (const name of ['lower-left','down','lower-right']) {
    await move('center'); await move(name);
    const target = await page.getByTestId('target').innerText();
    const source = await page.getByTestId('frame').innerText();
    assert.equal(target,name);
    await page.screenshot({ path: new URL(`${name}-1440x900.png`,output).pathname,
      fullPage: true, style: '.debug { visibility: hidden; }' });
    report.captures.push({ requested: name, coordinate: points[name], selected: source,
      assessment: name === 'lower-left' ? 'Usable modest lower-left' : 'Rejected as directional match' });
  }
  for (const [from,to] of [['center','down'],['center','lower-right'],['lower-left','down'],
    ['down','lower-right'],['lower-left','lower-right'],['lower-right','lower-left']]) {
    await move(from);
    const start = await page.evaluate(() => performance.now());
    const count = await page.evaluate(() => window.__auditDraws.length);
    await move(to,60);
    const draws = await page.evaluate(n => window.__auditDraws.slice(n),count);
    report.movements.push({ from,to,draws:draws.map(d=>({ elapsedMs:Math.round(d.ms-start),frame:d.frame })) });
  }
  assert.deepEqual(report.errors,[]);
  const video = page.video();
  await context.close();
  report.video = await video.path();
  await video.saveAs(new URL('movement.webm',output).pathname);
  await writeFile(new URL('results.json',output),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
} finally { await browser.close(); }
