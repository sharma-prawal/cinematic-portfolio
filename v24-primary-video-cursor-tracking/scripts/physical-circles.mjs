import { chromium } from 'playwright';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import assert from 'node:assert/strict';
const output=new URL('../qa/',import.meta.url);await mkdir(new URL('recordings/',output),{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:new URL('recordings/',output).pathname,size:{width:1440,height:900}}});
const page=await context.newPage();await page.goto('http://127.0.0.1:4324/?mode=B');
await page.waitForFunction(()=>window.__v24?.snapshot().panels.B?.status==='ready');
const paths=[{name:'mouse-small-clockwise',radius:.15,seconds:3,sign:1},{name:'mouse-medium-counterclockwise',radius:.45,seconds:3,sign:-1},{name:'mouse-large-clockwise',radius:.9,seconds:4,sign:1},{name:'mouse-offset-circle',radius:.25,cx:.25,cy:-.25,seconds:3,sign:1}];const results=[];
try {
  for(const path of paths){
    await page.mouse.move(720,450);await page.waitForTimeout(250);await page.evaluate(()=>window.__v24.reset());
    const start=performance.now();let elapsed=0,count=0;
    while(elapsed<path.seconds*1000){
      elapsed=performance.now()-start;const a=elapsed/(path.seconds*1000)*Math.PI*2*path.sign;
      const x=(path.cx??0)+Math.cos(a)*path.radius,y=(path.cy??0)+Math.sin(a)*path.radius;
      await page.mouse.move((x+1)*720,(y+1)*450);count++;
      await new Promise(resolve=>setTimeout(resolve,16));
    }
    const state=await page.evaluate(()=>window.__v24.snapshot());const run=state.panels.B;
    assert.ok(run.cache.peakImages<=24);assert.equal(run.cache.errors,0);
    results.push({...path,wallMs:performance.now()-start,realMouseMoves:count,state});
  }
} finally {
  await writeFile(new URL('physical-circle-results.json',output),JSON.stringify(results,null,2));
  const video=page.video();await context.close();await rename(await video.path(),new URL('recordings/real-mouse-circles-B.webm',output));await browser.close();
}
console.log('Four normal-speed Playwright mouse circle paths recorded, with raw input and visible photograph traces.');
