import {chromium} from 'playwright';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});const p=await browser.newPage({viewport:{width:1440,height:900}});const rows=[];
for(const method of ['a','b'])for(const tau of [20,40,70]){
 await p.goto(`http://127.0.0.1:61919/?method=${method}&tau=${tau}`);await p.waitForFunction(()=>window.__v19.ready);await p.evaluate(()=>window.__v19.reset());
 for(let i=0;i<30;i++){await p.waitForTimeout(13+i%7);await p.mouse.move(i%2?1260:180,i%2?680:220);await p.waitForTimeout(27);}
 await p.mouse.move(1100,620);await p.waitForTimeout(1200);
 const samples=await p.evaluate(()=>window.__v19.samples);const seen=new Set(),latencies=[];
 for(let i=1;i<samples.length;i++){const s=samples[i];if(seen.has(s.inputTime)||!s.inputTime)continue;seen.add(s.inputTime);if(Math.abs(s.x-samples[i-1].x)+Math.abs(s.y-samples[i-1].y)>1e-7)latencies.push(s.wallT-s.inputTime);}
 assert.ok(latencies.length>20);assert.ok(latencies.every(x=>x>=0));const tail=samples.slice(-10);assert.ok(Math.max(...tail.map(s=>s.x))-Math.min(...tail.map(s=>s.x))<1e-6);
 rows.push({method,tau,latenciesMs:latencies,tail,samples});console.log('Response',method,tau);
}
await fs.writeFile(new URL('../report/response.json',import.meta.url),JSON.stringify(rows));await browser.close();
