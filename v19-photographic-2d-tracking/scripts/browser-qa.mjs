import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=new URL('../report/',import.meta.url).pathname;
const trajectory=[];
function circle(name,cx,cy,r,sign=1){for(let i=0;i<=40;i++){let a=i/40*Math.PI*2*sign;trajectory.push({phase:name,x:cx+r*Math.cos(a),y:cy+r*Math.sin(a),wait:25});}}
circle('small-cw',0,0,.12,-1);circle('small-ccw',0,0,.12,1);circle('medium-cw',0,0,.4,-1);circle('large-ccw',0,0,.85,1);circle('offset-left',-.45,.35,.2,-1);circle('offset-right',.4,-.3,.2,1);
for(const axis of ['horizontal','vertical','diagonal'])for(let i=0;i<=40;i++){const p=-.9+1.8*i/40;trajectory.push({phase:axis,x:axis==='vertical'?0:p,y:axis==='horizontal'?0:p,wait:25});}
for(let i=0;i<12;i++)trajectory.push({phase:'rapid-reversal',x:i%2?.85:-.85,y:i%2?-.65:.65,wait:40});
trajectory.push({phase:'stationary-hold',x:.55,y:-.4,wait:850},{phase:'neutral-hold',x:0,y:0,wait:900});
await fs.writeFile(out+'pointer-trajectory.json',JSON.stringify(trajectory,null,2));
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
const errors=[];
for(const [method,tau] of [['static',40],['a',20],['a',40],['a',70],['b',20],['b',40],['b',70],['v15',20]]){
 const name=`${method}-${tau}`;
 const ctx=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,recordVideo:{dir:out+'recordings/',size:{width:1440,height:900}}});
 await ctx.addInitScript(()=>{
  window.__historical=[];window.__v14Probe=s=>window.__historical.push(s);
  window.__decodes=[];const decode=HTMLImageElement.prototype.decode;
  HTMLImageElement.prototype.decode=async function(){const t=performance.now();await decode.call(this);window.__decodes.push({url:this.src,w:this.naturalWidth,h:this.naturalHeight,ms:performance.now()-t});};
 });
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push({name,error:String(e)}));
 const began=performance.now();
 await p.goto(method==='v15'?'http://127.0.0.1:61915/?candidate=v2-subtle&smoothing=20&resolution=960':`http://127.0.0.1:61919/?method=${method}&tau=${tau}`);
 if(method==='v15')await p.waitForSelector('canvas.ready');else await p.waitForFunction(()=>window.__v19.ready);
 const readyMs=performance.now()-began;
 await p.evaluate(()=>{
  const cursor=document.createElement('div');cursor.id='qa-pointer';cursor.style.cssText='position:fixed;left:0;top:0;width:8px;height:8px;border:1px solid white;border-radius:50%;box-shadow:0 0 0 1px #222;pointer-events:none;z-index:99;';document.body.append(cursor);
  window.addEventListener('pointermove',e=>cursor.style.transform=`translate(${e.clientX-4}px,${e.clientY-4}px)`);
  const label=document.createElement('div');label.id='qa-phase';label.style.cssText='position:fixed;top:56px;left:18px;font:11px system-ui;color:#222;background:#ddddddcc;padding:4px;pointer-events:none;z-index:99';document.body.append(label);
  if(window.__v19)window.__v19.reset();else window.__historical=[];
 });
 const dispatched=[];let prev='';
 for(const step of trajectory){
  if(prev!==step.phase){prev=step.phase;await p.evaluate(({phase,name})=>document.getElementById('qa-phase').textContent=`${name} · ${phase}`,{phase:prev,name});}
  const x=(step.x+1)*720,y=(1-step.y)*450;
  await p.mouse.move(x,y);dispatched.push({...step,clientX:x,clientY:y,t:await p.evaluate(()=>performance.now())});await p.waitForTimeout(step.wait);
 }
 const metrics=await p.evaluate(()=>window.__v19?{samples:window.__v19.samples,metrics:window.__v19.metrics(),decodes:window.__decodes,draws:window.__v19.draws,ready:window.__v19.ready}:{samples:window.__historical,decodes:window.__decodes});
 if(method!=='v15')assert.equal(metrics.ready,true);
 await fs.writeFile(out+`trace-${name}.json`,JSON.stringify({name,readyMs,dispatched,...metrics}));
 await p.screenshot({path:out+`settled-${name}.png`});
 if(method==='static'||(method!=='v15'&&tau===40)){
  await p.evaluate(()=>{document.getElementById('qa-pointer').remove();document.getElementById('qa-phase').remove();});
  for(const [dir,x,y] of [['center',0,0],['left',-.99,0],['right',.99,0],['up',0,.99],['down',0,-.99],['upper-left',-.99,.99],['upper-right',.99,.99],['lower-left',-.99,-.99],['lower-right',.99,-.99]]){
   await p.mouse.move((x+1)*720,(1-y)*450);await p.waitForTimeout(450);
   await p.locator('canvas').screenshot({path:out+`${method}-${dir}.png`});
  }
 }
 const video=p.video();await ctx.close();const raw=await video.path();const destination=out+`recordings/${name}.webm`;await fs.rename(raw,destination);
 results.push({name,readyMs,recording:destination});console.log('Recorded',name);
}
const layouts=[];
for(const [width,height] of [[1920,1080],[1440,900],[1366,768],[1024,768],[390,844]]){
 const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});const p=await ctx.newPage();
 for(const method of ['static','a','b']){
  await p.goto(`http://127.0.0.1:61919/?method=${method}&tau=40`);await p.waitForFunction(()=>window.__v19.ready);
  await p.mouse.move(width*.85,height*.72);await p.waitForTimeout(550);
  const result=await p.evaluate(()=>{const r=document.querySelector('figure').getBoundingClientRect();return {width:innerWidth,height:innerHeight,rect:{x:r.x,y:r.y,width:r.width,height:r.height},overflow:document.documentElement.scrollWidth>innerWidth,metrics:window.__v19.metrics(),samples:window.__v19.samples};});
  assert.equal(result.overflow,false);assert.ok(result.rect.y>=0&&result.rect.y+result.rect.height<=height);assert.ok(Math.abs(result.rect.width/result.rect.height-1672/941)<.01);
  await p.screenshot({path:out+`viewport-${method}-${width}x${height}.png`});layouts.push({method,...result});
 }
 await ctx.close();console.log('Viewport',width,height);
}
const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const p=await ctx.newPage();
await p.goto('http://127.0.0.1:61919/?method=b&debug=1');await p.waitForFunction(()=>window.__v19.ready);await p.mouse.move(350,200);await p.waitForTimeout(250);
const reduced=await p.evaluate(()=>({x:window.__v19.x,y:window.__v19.y,reduced:window.__v19.reduced}));assert.deepEqual(reduced,{x:0,y:0,reduced:true});
await p.screenshot({path:out+'reduced-motion.png'});await p.emulateMedia({reducedMotion:'no-preference'});
const cdp=await ctx.newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:430}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:330,y:350}]});await p.waitForTimeout(250);
const drag=await p.evaluate(()=>({x:window.__v19.x,y:window.__v19.y,tx:window.__v19.tx,ty:window.__v19.ty}));assert.ok(Math.abs(drag.x)>.1&&Math.abs(drag.y)>.1);
await p.screenshot({path:out+'touch-drag.png'});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(750);
const released=await p.evaluate(()=>({x:window.__v19.x,y:window.__v19.y}));assert.deepEqual(released,{x:0,y:0});
await ctx.close();await fs.writeFile(out+'browser-qa.json',JSON.stringify({results,layouts,reduced,drag,released,errors},null,2));assert.equal(errors.length,0);
await browser.close();console.log('All browser checks passed');
