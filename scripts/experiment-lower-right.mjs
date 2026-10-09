import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const output = new URL('../qa/lower-right-experiment/', import.meta.url);
await mkdir(output, { recursive: true });
const manifest = JSON.parse(await readFile(new URL('../src/poses.json', import.meta.url)));
const points = { center:[.5,.5], right:[.92,.5], 'lower-right':[.92,.92], 'lower-left':[.08,.92],
  left:[.08,.5], up:[.5,.08], down:[.5,.92], 'upper-left':[.08,.08], 'upper-right':[.92,.08] };
const browser = await chromium.launch({channel:'chrome',headless:true});
const report = { runs:[], errors:[] };
try {
  for (const [width,height] of [[1440,900],[1920,1080]]) {
    for (const strategy of ['baseline','A','B','C']) {
      const name = `${strategy}-${width}x${height}`;
      const context = await browser.newContext({viewport:{width,height},deviceScaleFactor:2,
        recordVideo:{dir:new URL('video/',output).pathname,size:{width:1440,height:900}}});
      const page = await context.newPage();
      await page.addInitScript(() => {
        window.__draws=[];
        const original=CanvasRenderingContext2D.prototype.drawImage;
        CanvasRenderingContext2D.prototype.drawImage=function(...args) {
          const result=original.apply(this,args);
          if (args[0]?.src?.includes('/frames/')) window.__draws.push({ms:performance.now(),source:args[0].src.split('/frames/')[1]});
          return result;
        };
      });
      page.on('pageerror',e=>report.errors.push(`${name}: ${e.message}`));
      const url=strategy==='baseline' ? 'http://127.0.0.1:5173/?debug=1' : `http://127.0.0.1:5174/?debug=1&strategy=${strategy}`;
      await page.goto(url);
      await page.waitForFunction(()=>document.querySelector('[data-testid="assets"]')?.textContent==='Ready');
      const move=async (pose,steps=1) => {const [x,y]=points[pose];await page.mouse.move(x*width,y*height,{steps});await page.waitForTimeout(550);};
      const run={strategy,width,height,url,poses:[],sweeps:[]};
      for (const pose of Object.keys(points)) {
        await move('center');await move(pose,12);
        const label=await page.getByTestId('frame').innerText();
        assert.equal(await page.getByTestId('target').innerText(),pose);
        const expected=pose==='lower-right' && strategy!=='baseline' ? 132 : manifest.anchors[pose].frame;
        assert.equal(Number(label.match(/frame (\d+)/)[1]),expected,`${name} ${pose}`);
        const pixels=await page.locator('canvas').evaluate(c=>c.toDataURL());
        run.poses.push({pose,label,pixelSignature:pixels});
        if (['center','right','lower-right'].includes(pose)) await page.screenshot({path:new URL(`${name}-${pose}.png`,output).pathname,style:'.debug{visibility:hidden}'});
      }
      run.layout=await page.locator('canvas').evaluate(c=>({width:c.width,height:c.height,rect:c.getBoundingClientRect().toJSON(),scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight]}));
      run.resources=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>e.name.includes('/frames/')).map(e=>e.name.split('/frames/')[1]));
      const requests=[];page.on('request',r=>{if(r.url().includes('/frames/'))requests.push(r.url());});
      for (const [from,to] of [['center','lower-right'],['right','lower-right'],['lower-right','right'],['lower-right','center'],['lower-left','lower-right']]) {
        await move(from);
        const count=await page.evaluate(()=>window.__draws.length);
        await move(to,60);
        run.sweeps.push({from,to,draws:await page.evaluate(n=>window.__draws.slice(n),count)});
      }
      const count=await page.evaluate(()=>window.__draws.length);
      for(let i=0;i<20;i++) {const [x,y]=points[i%2?'right':'lower-right'];await page.mouse.move(x*width,y*height);await page.waitForTimeout(25);}
      await move('lower-right');
      run.rapid=await page.evaluate(n=>window.__draws.slice(n),count);
      const drawn=await page.getByTestId('drawn').innerText();await page.waitForTimeout(400);
      assert.equal(await page.getByTestId('drawn').innerText(),drawn);
      assert.deepEqual(requests,[]);
      run.fps=await page.getByTestId('fps').innerText();
      await page.mouse.move(-20,-20);await page.waitForTimeout(550);
      assert.equal(await page.getByTestId('target').innerText(),'center');
      assert.ok((await page.getByTestId('frame').innerText()).includes('frame 3'));
      await page.getByLabel('Show cursor grid').check();assert.equal(await page.locator('.cursor-grid > div').count(),9);
      await page.getByLabel('Smooth tracking').uncheck();
      await context.close();
      await page.video().saveAs(new URL(`${name}.webm`,output).pathname);
      report.runs.push(run);
      console.log(`${name}: nine directions, sweeps, rapid reversals, exit and cache checks passed`);
    }
  }
  for (const run of report.runs.filter(r=>r.strategy!=='baseline')) {
    const base=report.runs.find(r=>r.strategy==='baseline' && r.width===run.width);
    assert.deepEqual(run.layout,base.layout);
    for(const pose of run.poses.filter(p=>p.pose!=='lower-right')) assert.equal(pose.pixelSignature,base.poses.find(p=>p.pose===pose.pose).pixelSignature,`${run.strategy}: ${pose.pose} pixels changed`);
  }
  // Reduced-motion and touch remain immediate at the correct stable pose.
  for(const strategy of ['A','B','C']) {
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    const page=await context.newPage();await page.goto(`http://127.0.0.1:5174/?debug=1&strategy=${strategy}`);
    await page.locator('canvas.is-ready').waitFor();
    const cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:350,y:750}]});await page.waitForTimeout(300);
    assert.ok((await page.getByTestId('frame').innerText()).includes('frame 132'));
    assert.equal(await page.getByLabel('Smooth tracking').isDisabled(),true);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300);
    assert.equal(await page.getByTestId('target').innerText(),'center');await context.close();
  }
  assert.deepEqual(report.errors,[]);
  for(const run of report.runs) for(const pose of run.poses) delete pose.pixelSignature;
  await writeFile(new URL('results.json',output),JSON.stringify(report,null,2)+'\n');
} finally {await browser.close();}
