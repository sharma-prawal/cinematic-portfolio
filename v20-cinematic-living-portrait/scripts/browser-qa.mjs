import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
const base='http://127.0.0.1:4320';
const report=path.resolve('report');
await fs.mkdir(`${report}/previews`,{recursive:true});
await fs.mkdir(`${report}/recordings`,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const checksOnly=process.argv.includes('--checks-only');
const results=checksOnly ? JSON.parse(await fs.readFile(`${report}/browser-results.json`,'utf8')) : {browser:browser.version(),paths:[],responsive:[],checks:[],errors:[]};
if(checksOnly) { results.previousCaptureResourceErrors ??= results.errors; results.errors=[]; results.checks=[]; }
const watch=p=>{p.on('pageerror',e=>results.errors.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('ERR_FAILED'))results.errors.push(m.text());});};
async function ready(p,mode='A') {await p.goto(`${base}/?mode=${mode}&debug=1`);await p.waitForFunction(()=>window.__v20&&document.querySelector('video').readyState>=2);}
async function sync(p){await p.evaluate(async()=>{const v=document.querySelector('video');v.pause();v.currentTime=0;await new Promise(r=>v.addEventListener('seeked',r,{once:true}));window.__start=performance.now();await v.play();});}
const snapshot=p=>p.evaluate(()=>window.__v20.snapshot());
// Same viewport, same video reset, identical timed trajectories for each mode.
const paths=[
 ['slow-horizontal',3000,t=>[.1+.8*t,.5]],['normal-horizontal',1200,t=>[.9-.8*t,.5]],
 ['slow-vertical',2400,t=>[.5,.1+.8*t]],['diagonal',1800,t=>[.1+.8*t,.1+.8*t]],
 ...[['small-clockwise',.07,1,.5,.5],['small-counterclockwise',.07,-1,.5,.5],['medium-circle',.18,1,.5,.5],['large-circle',.4,1,.5,.5],['offset-circle',.13,1,.7,.3]].map(([name,r,sign,cx,cy])=>[name,2400,t=>[cx+r*Math.cos(t*2*Math.PI*sign),cy+r*Math.sin(t*2*Math.PI*sign)]]),
 ['rapid-reversals',1500,t=>[Math.floor(t*10)%2?.15:.85,.5]],['stationary',1200,()=>[.65,.35]],
];
for(const mode of checksOnly ? [] : ['A','B','C']){
 const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:`${report}/recordings`,size:{width:1440,height:900}}});const p=await context.newPage();watch(p);await ready(p,mode);
 await p.locator('.debug details').evaluate(el=>el.open=false);await sync(p);
 await p.evaluate(()=>{window.__raf=[];let prev=performance.now();window.__rafActive=true;function tick(now){if(!window.__rafActive)return;window.__raf.push(now-prev);prev=now;requestAnimationFrame(tick)}requestAnimationFrame(tick)});
 const samples=[];
 for(const [name,duration,point] of paths){
  const start=performance.now();for(let i=0;i<=Math.round(duration/40);i++){const t=i/Math.round(duration/40);const [x,y]=point(t);await p.mouse.move(x*1440,y*900);const due=start+t*duration-performance.now();if(due>0)await p.waitForTimeout(due);}
  samples.push({name,...await snapshot(p)});
 }
 await p.evaluate(()=>document.documentElement.dispatchEvent(new PointerEvent('pointerleave')));await p.waitForTimeout(800);
 const exit=await snapshot(p);assert.ok(exit.spring.every(v=>Math.abs(v)<.01));
 await p.mouse.move(900,300);await p.waitForTimeout(500);
 // Cross three native loop boundaries in every recorded mode.
 console.log(`Paths complete for ${mode}; collecting third loop seam.`);
 await p.waitForFunction(()=>window.__v20.snapshot().telemetry.seams.length>=3,{},{timeout:35000});
 const metrics=await p.evaluate(()=>{window.__rafActive=false;const v=document.querySelector('video'),q=v.getVideoPlaybackQuality();const sorted=window.__raf.slice(3).sort((a,b)=>a-b);const percentile=x=>sorted[Math.floor((sorted.length-1)*x)];return {telemetry:window.__v20.snapshot().telemetry,raf:{count:sorted.length,p50:percentile(.5),p95:percentile(.95),p99:percentile(.99),max:sorted.at(-1)},quality:{total:q.totalVideoFrames,dropped:q.droppedVideoFrames},memory:performance.memory?{usedJSHeapSize:performance.memory.usedJSHeapSize,totalJSHeapSize:performance.memory.totalJSHeapSize,limit:performance.memory.jsHeapSizeLimit}:null};});
 await p.locator('.debug').evaluate(el=>el.style.display='none');await p.evaluate(async()=>{const v=document.querySelector('video');v.pause();v.currentTime=4;await new Promise(r=>v.addEventListener('seeked',r,{once:true}));});await p.screenshot({path:`${report}/previews/mode-${mode}.png`});
 const recording=p.video();await context.close();await recording.saveAs(`${report}/recordings/mode-${mode}-paths-and-three-loops.webm`);
 results.paths.push({mode,samples,exit,metrics,recording:`recordings/mode-${mode}-paths-and-three-loops.webm`});
 await fs.writeFile(`${report}/browser-results.json`,JSON.stringify(results,null,2));
 console.log(`Recorded ${mode}: ${metrics.telemetry.frames} video callbacks, ${metrics.quality.dropped} dropped frames, ${metrics.telemetry.seams.length} seams.`);
}
for(const [width,height] of checksOnly ? [] : [[1920,1080],[1440,900],[1366,768],[1024,768],[390,844]]){
 const c=await browser.newContext({viewport:{width,height},isMobile:width===390,hasTouch:width===390});const p=await c.newPage();watch(p);await ready(p,'C');
 await p.locator('.debug').evaluate(el=>el.style.display='none');await p.evaluate(()=>{const v=document.querySelector('video');v.pause();v.currentTime=4;});await p.waitForTimeout(150);
 const geometry=await p.evaluate(()=>{const r=document.querySelector('video').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,overflow:document.documentElement.scrollWidth>innerWidth,interactive:window.__v20.snapshot().interactive};});assert.equal(geometry.overflow,false);assert.ok(Math.abs(geometry.width/geometry.height-16/9)<.001);assert.ok(geometry.x>=0&&geometry.y>=0);assert.ok(geometry.y+geometry.height<=height);
 if(width===390){assert.equal(geometry.interactive,false);await p.touchscreen.tap(300,200);assert.deepEqual((await snapshot(p)).target,[0,0]);}
 await p.screenshot({path:`${report}/previews/${width}x${height}.png`,fullPage:true});results.responsive.push({viewport:[width,height],...geometry});await c.close();
}
await fs.writeFile(`${report}/browser-results.json`,JSON.stringify(results,null,2));
const c=await browser.newContext({viewport:{width:1440,height:900}});const p=await c.newPage();watch(p);await ready(p,'B');
// Measure spring step response with actual pointer input; JS event-to-observed-value, not mouse-to-photon.
await p.evaluate(()=>window.__v20.reset());await p.waitForTimeout(700);await p.mouse.move(1439,899);const step=await p.evaluate(async()=>{const start=performance.now(),samples=[];for(let i=0;i<45;i++){await new Promise(requestAnimationFrame);samples.push({ms:performance.now()-start,...window.__v20.snapshot()});}return samples;});
results.stepResponse=step;assert.ok(step.every(s=>s.spring.every(v=>Math.abs(v)<=1.001)));
await p.locator('input[name=mode][value=C]').check();assert.equal((await snapshot(p)).mode,'C');
await p.getByLabel('Simulate reduced motion').check();await p.waitForTimeout(200);assert.equal(await p.$eval('video',v=>v.paused),true);assert.equal((await snapshot(p)).interactive,false);results.checks.push('Mode switching and simulated reduced motion passed');
await p.getByLabel('Simulate reduced motion').uncheck();await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(200);assert.equal(await p.$eval('video',v=>v.paused),true);assert.deepEqual((await snapshot(p)).spring,[0,0]);results.checks.push('OS reduced-motion pauses video, shows poster, neutralizes motion');
await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForTimeout(200);await p.getByRole('button',{name:'Pause portrait',exact:true}).focus();await p.keyboard.press('Enter');assert.equal(await p.$eval('video',v=>v.paused),true);await p.keyboard.press('Enter');await p.waitForTimeout(100);assert.equal(await p.$eval('video',v=>v.paused),false);results.checks.push('Keyboard pause/resume passed');
// Exercise visibility listener with a controlled hidden-property simulation.
await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await p.$eval('video',v=>v.paused),true);
await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});await p.waitForTimeout(200);assert.equal(await p.$eval('video',v=>v.paused),false);results.checks.push('Simulated visibility pause/resume passed (real OS tab occlusion not measured)');
const forbidden=await p.request.get(`${base}/@fs/Users/prawalsharma/Documents/Projects/cinematic-portfolio/package.json`);assert.equal(forbidden.status(),403);results.checks.push('Vite refused parent-file @fs access with HTTP 403');await c.close();
const failure=await browser.newContext();const f=await failure.newPage();await f.route('**/portrait.mp4',r=>r.abort());await f.goto(`${base}/?debug=1`);await f.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('unavailable'));assert.equal(await f.locator('.poster').isVisible(),true);await failure.close();results.checks.push('Network video failure retains photographic fallback');
const blocked=await browser.newContext();const bp=await blocked.newPage();await bp.addInitScript(()=>{const play=HTMLMediaElement.prototype.play;let first=true;HTMLMediaElement.prototype.play=function(){if(first){first=false;return Promise.reject(new DOMException('Simulated policy block','NotAllowedError'));}return play.call(this);};});await bp.goto(base);await bp.getByRole('button',{name:'Play portrait',exact:true}).click();await bp.waitForFunction(()=>!document.querySelector('video').paused);await blocked.close();results.checks.push('Simulated autoplay rejection recovers through Play');
assert.deepEqual(results.errors,[]);results.checks.push('No unexpected page runtime or console errors');
await fs.writeFile(`${report}/browser-results.json`,JSON.stringify(results,null,2));await browser.close();console.log('Browser checks passed.');
