import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const out=new URL('../report/',import.meta.url).pathname;
const trajectory=JSON.parse(await fs.readFile(out+'pointer-trajectory.json','utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true});
for(const method of ['a','b']){
 const ctx=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out+'recordings/',size:{width:1440,height:900}}});
 const p=await ctx.newPage();await p.goto(`http://127.0.0.1:61919/?method=${method}&tau=40`);await p.waitForFunction(()=>window.__v19.ready);
 await p.evaluate(()=>{Object.assign(window.__v19.settings,{yaw:1,pitch:.75});window.__v19.reset();const label=document.createElement('div');label.id='phase';label.style.cssText='position:fixed;top:56px;left:16px;font:11px system-ui;z-index:99;background:#ddd;padding:4px;';document.body.append(label);const cursor=document.createElement('div');cursor.style.cssText='position:fixed;width:8px;height:8px;border:1px solid white;box-shadow:0 0 0 1px #222;border-radius:50%;pointer-events:none;z-index:99;';document.body.append(cursor);window.addEventListener('pointermove',e=>{cursor.style.left=(e.clientX-4)+'px';cursor.style.top=(e.clientY-4)+'px';});});
 const dispatched=[];let phase='';
 for(const step of trajectory){if(phase!==step.phase){phase=step.phase;await p.evaluate(({phase,method})=>document.getElementById('phase').textContent=`${method.toUpperCase()} · ±1° / ±0.75° · ${phase}`,{phase,method});}await p.mouse.move((step.x+1)*720,(1-step.y)*450);dispatched.push({...step,t:await p.evaluate(()=>performance.now())});await p.waitForTimeout(step.wait);}
 const measured=await p.evaluate(()=>({samples:window.__v19.samples,metrics:window.__v19.metrics()}));
 await fs.writeFile(out+`half-amplitude-${method}.json`,JSON.stringify({method,amplitudes:[1,.75],dispatched,...measured}));
 for(const [name,x,y] of [['center',0,0],['upper-right',.99,.99],['lower-left',-.99,-.99]]){await p.mouse.move((x+1)*720,(1-y)*450);await p.waitForTimeout(500);await p.locator('canvas').screenshot({path:out+`half-${method}-${name}.png`});}
 const v=p.video();await ctx.close();await fs.rename(await v.path(),out+`recordings/${method}-half-40.webm`);console.log('Recorded half amplitude',method);
}
await browser.close();
