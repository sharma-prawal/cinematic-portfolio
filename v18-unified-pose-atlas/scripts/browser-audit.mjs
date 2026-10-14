import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {url}=JSON.parse(await readFile(path.join(base,'data/server.json')));
const out=path.join(base,'report/browser');await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
try{
 for(const [width,height] of [[1920,1080],[1440,900],[1366,768],[1024,768],[390,844]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width===390,isMobile:width===390,reducedMotion:'reduce'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url+'/v18-unified-pose-atlas/viewer.html');await page.waitForFunction(()=>window.audit&&document.querySelector('video').readyState>=2);
  const layout=await page.evaluate(()=>{const r=document.querySelector('video').getBoundingClientRect();return{scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,width:r.width,height:r.height,videoWidth:document.querySelector('video').videoWidth,videoHeight:document.querySelector('video').videoHeight}});assert.equal(layout.scrollWidth,width);assert.equal(layout.videoWidth,1920);assert.equal(layout.videoHeight,1080);assert.deepEqual(errors,[]);
  if(width===390){await page.tap('#slow');assert.equal(await page.$eval('video',v=>v.playbackRate),.5)}
  await page.screenshot({path:path.join(out,`audit-viewer-${width}.png`)});results.push({width,height,layout,errors,scope:'Audit viewer only; no cursor controller exists',reducedMotion:'No animated UI; video plays only by explicit control',touch:width===390?'Native control tap passed':'not applicable'});await context.close();
 }
 const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}});const page=await context.newPage();await page.goto(url+'/v18-unified-pose-atlas/viewer.html');await page.waitForFunction(()=>window.audit);
 const inventory=await page.evaluate(()=>window.audit.inventory);const clips=[];
 for(const source of inventory){
  await page.evaluate(id=>window.audit.load(id),source.id);await page.waitForFunction(()=>document.querySelector('video').readyState>=2);
  const result=await page.evaluate(async()=>{const v=document.querySelector('video');const frames=[];let active=true;const frame=(now,meta)=>{frames.push({now,mediaTime:meta.mediaTime,presentedFrames:meta.presentedFrames});if(active)v.requestVideoFrameCallback(frame)};v.requestVideoFrameCallback(frame);v.currentTime=0;v.playbackRate=1;const start=performance.now();await v.play();await new Promise(resolve=>v.addEventListener('ended',resolve,{once:true}));active=false;return{elapsed:performance.now()-start,frames}});clips.push({id:source.id,...result});console.log('Normal source playback',source.id);
 }
 for(const source of inventory.filter(v=>['s14','s15','s16','s17'].includes(v.id))){await page.evaluate(id=>window.audit.load(id),source.id);await page.waitForFunction(()=>document.querySelector('video').readyState>=2);await page.evaluate(async()=>{const v=document.querySelector('video');v.currentTime=0;v.playbackRate=.5;await v.play();await new Promise(resolve=>v.addEventListener('ended',resolve,{once:true}))});console.log('Slow source playback',source.id)}
 await writeFile(path.join(out,'source-playback.json'),JSON.stringify({clips,results},null,2));const video=page.video();await context.close();await video.saveAs(path.join(out,'all-sources-normal-latest-slow.webm'));await video.delete();await writeFile(path.join(out,'responsive-results.json'),JSON.stringify(results,null,2));
 const formats=JSON.parse(await readFile(path.join(base,'data/format-comparison.json')));const p=await browser.newPage();await p.goto(url+'/v18-unified-pose-atlas/viewer.html');const decode=[];
 for(const record of formats){const timings=await p.evaluate(async src=>{const times=[];for(let i=0;i<5;i++){const im=new Image();im.src=src;const t=performance.now();await im.decode();times.push(performance.now()-t)}return times},url+'/v18-unified-pose-atlas/'+record.file);decode.push({source:record.source,frame:record.frame,format:record.format,timings,scope:'Local image.decode with repeat-cache effects; not network cold-load performance'})};await writeFile(path.join(out,'format-decode.json'),JSON.stringify(decode,null,2));await p.close();
}finally{await browser.close()}
