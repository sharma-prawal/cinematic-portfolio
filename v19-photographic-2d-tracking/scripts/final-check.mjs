import {chromium} from 'playwright';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const out=new URL('../report/',import.meta.url).pathname;
const browser=await chromium.launch({channel:'chrome',headless:true});
const p=await browser.newPage({viewport:{width:1672,height:1051},deviceScaleFactor:1});
await p.goto('http://127.0.0.1:61919/?method=a&debug=1');await p.waitForFunction(()=>window.__v19.ready&&window.__v19.draws>0);
await p.locator('canvas').screenshot({path:out+'final-native-neutral.png',style:'aside{visibility:hidden}'});
await p.getByLabel('Yaw limit').fill('1');await p.getByLabel('Pitch limit').fill('0.75');await p.getByRole('combobox').selectOption('20');
await p.mouse.move(1580,200);await p.waitForTimeout(400);const debug=await p.evaluate(()=>({...window.__v19.settings,x:window.__v19.x,y:window.__v19.y}));assert.equal(debug.yaw,1);assert.equal(debug.pitch,.75);assert.equal(debug.tau,20);
await p.evaluate(()=>document.documentElement.dispatchEvent(new PointerEvent('pointerleave')));await p.waitForTimeout(700);
const exit=await p.evaluate(()=>({x:window.__v19.x,y:window.__v19.y,tx:window.__v19.tx,ty:window.__v19.ty}));assert.deepEqual(exit,{x:0,y:0,tx:0,ty:0});
await p.locator('canvas').screenshot({path:out+'final-native-return.png',style:'aside{visibility:hidden}'});
const ctx=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:2});const q=await ctx.newPage();await q.goto('http://127.0.0.1:61919/?method=b');await q.waitForFunction(()=>window.__v19.ready);
for(let i=0;i<100;i++){const a=i/100*Math.PI*4;await q.mouse.move(960+Math.cos(a)*600,540+Math.sin(a)*360);await q.waitForTimeout(16);}
const dpr2=await q.evaluate(()=>({metrics:window.__v19.metrics(),samples:window.__v19.samples}));await q.screenshot({path:out+'dpr2-1920x1080.png'});
await fs.writeFile(out+'final-check.json',JSON.stringify({debug,exit,dpr2},null,2));await ctx.close();await browser.close();console.log('Final checks passed');
