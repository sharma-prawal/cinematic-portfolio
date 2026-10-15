import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,channel:'chrome'}), results={modes:[],errors:[]};
const p=await browser.newPage({viewport:{width:1440,height:900}});
p.on('pageerror',e=>results.errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')results.errors.push(m.text());});
for(const mode of ['A','B','C']) {
 const response=await p.goto(`http://127.0.0.1:4322/?mode=${mode}&debug=1`);assert.equal(response.status(),200);
 await p.waitForFunction(()=>document.querySelector('video').currentTime>0);
 assert.equal(await p.locator('.debug').count(),0);assert.equal(await p.evaluate(()=>typeof window.__v20),'undefined');
 await p.mouse.move(1400,850);await p.waitForTimeout(650);
 const data=await p.evaluate(()=>{const get=s=>{const m=new DOMMatrixReadOnly(getComputedStyle(document.querySelector(s)).transform);return [m.m41,m.m42]};return {portrait:get('.photograph'),ambient:get('.ambient'),objectFit:getComputedStyle(document.querySelector('video')).objectFit};});
 assert.equal(data.objectFit,'contain');
 if(mode==='A'||mode==='C')assert.deepEqual(data.portrait,[0,0]);
 if(mode==='B')assert.ok(data.portrait[0]>1&&data.portrait[0]<=2&&data.portrait[1]>0&&data.portrait[1]<=1.5);
 if(mode==='C')assert.ok(data.ambient.every(v=>v>1));
 results.modes.push({mode,...data,debugAbsent:true});
}
await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(150);assert.equal(await p.$eval('video',v=>v.paused),true);assert.equal(await p.$eval('video',v=>getComputedStyle(v).visibility),'hidden');
results.liveReducedMotion=true;assert.deepEqual(results.errors,[]);
await p.goto('http://127.0.0.1:4320/?mode=B&debug=1');await p.waitForFunction(()=>window.__v20);await p.mouse.move(1100,600);await p.waitForTimeout(800);const first=await p.evaluate(()=>window.__v20.snapshot());await p.waitForTimeout(600);const second=await p.evaluate(()=>window.__v20.snapshot());assert.ok(first.spring.every((v,i)=>Math.abs(v-second.spring[i])<.001));results.stationaryDrift=second.spring.map((v,i)=>v-first.spring[i]);
await p.getByLabel('Interactive motion', {exact:true}).uncheck();await p.waitForTimeout(100);assert.deepEqual((await p.evaluate(()=>window.__v20.snapshot())).spring,[0,0]);results.motionDisableNeutral=true;
await browser.close();await fs.writeFile('report/production-check.json',JSON.stringify(results,null,2));console.log(results);
