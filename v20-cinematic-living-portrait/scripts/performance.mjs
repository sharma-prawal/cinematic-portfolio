import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const b=await chromium.launch({headless:true,channel:'chrome'}), results=[];
for(const mode of ['A','B','C']) {
 const c=await b.newContext({viewport:{width:1440,height:900}}),p=await c.newPage();
 await p.goto(`http://127.0.0.1:4320/?mode=${mode}&debug=1`);
 await p.waitForFunction(()=>window.__v20&&document.querySelector('video').currentTime>0);
 await p.locator('.debug').evaluate(el=>el.style.display='none');
 const client=await c.newCDPSession(p);await client.send('Performance.enable');
 const metrics=async()=>Object.fromEntries((await client.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
 const before=await metrics();
 await p.evaluate(()=>{window.__times=[];window.__running=true;let last=performance.now();const tick=t=>{if(!window.__running)return;window.__times.push(t-last);last=t;requestAnimationFrame(tick)};requestAnimationFrame(tick);});
 const start=performance.now();
 for(let i=0;i<=150;i++){const theta=i/150*Math.PI*6;await p.mouse.move(720+Math.cos(theta)*450,450+Math.sin(theta)*300);const due=start+i/150*5000-performance.now();if(due>0)await p.waitForTimeout(due);}
 const after=await metrics();const timing=await p.evaluate(()=>{window.__running=false;const s=window.__times.slice(2).sort((a,b)=>a-b),v=document.querySelector('video'),q=v.getVideoPlaybackQuality();return {raf:{samples:s.length,p50:s[Math.floor(s.length*.5)],p95:s[Math.floor(s.length*.95)],p99:s[Math.floor(s.length*.99)]},video:{total:q.totalVideoFrames,dropped:q.droppedVideoFrames},telemetry:window.__v20.snapshot().telemetry};});
 const delta={};for(const k of ['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration','LayoutCount','RecalcStyleCount'])delta[k]=after[k]-before[k];
 results.push({mode,elapsedSeconds:(performance.now()-start)/1000,mainThreadDelta:delta,heapBytes:after.JSHeapUsedSize,domNodes:after.Nodes,...timing});await c.close();
}
await b.close();await fs.writeFile('report/performance.json',JSON.stringify(results,null,2));console.log(results.map(({mode,mainThreadDelta,heapBytes,raf,video})=>({mode,mainThreadDelta,heapBytes,raf,video})));
