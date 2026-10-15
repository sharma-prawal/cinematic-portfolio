import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,channel:'chrome'}),results=[];
for(const mode of ['A','B','C']) {
 const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:'report/recordings',size:{width:1440,height:900}}});const p=await context.newPage();
 await p.goto(`http://127.0.0.1:4320/?mode=${mode}&debug=1`);await p.waitForFunction(()=>document.querySelector('video').currentTime>0&&window.__v20);
 await p.locator('.debug').evaluate(el=>el.style.display='none');await p.evaluate(async()=>{const v=document.querySelector('video');v.pause();v.currentTime=0;await new Promise(r=>v.addEventListener('seeked',r,{once:true}));await v.play();});
 const paths=[];
 for(const [name,r,sign,cx,cy] of [['small-clockwise',65,1,720,450],['small-counterclockwise',65,-1,720,450],['medium',160,1,720,450],['large',350,1,720,450],['offset',115,1,1000,280]]) {
  const start=performance.now();for(let i=0;i<=60;i++){const t=i/60*Math.PI*2*sign;await p.mouse.move(cx+r*Math.cos(t),cy+r*Math.sin(t));const due=start+i/60*2400-performance.now();if(due>0)await p.waitForTimeout(due);}
  paths.push({name,radiusPx:r,direction:sign===1?'clockwise':'counterclockwise',center:[cx,cy],snapshot:await p.evaluate(()=>window.__v20.snapshot())});
 }
 const v=p.video();await context.close();await v.saveAs(`report/recordings/mode-${mode}-pixel-circles.webm`);results.push({mode,paths});console.log(`Recorded ${mode} pixel-circle paths`);
}
await browser.close();await fs.writeFile('report/circles.json',JSON.stringify(results,null,2));
