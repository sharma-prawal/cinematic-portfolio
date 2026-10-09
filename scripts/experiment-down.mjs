import { chromium } from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='qa/down-experiment';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const report=[];
try {for(const [width,height] of [[1440,900],[1920,1080]]) for(const mode of ['baseline','progressive','banded']) {
 const context=await browser.newContext({viewport:{width,height},recordVideo:{dir:out+'/video',size:{width,height}}});const page=await context.newPage();
 await page.addInitScript(()=>{window.__draws=[];const orig=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(...args){const r=orig.apply(this,args);if(args[0]?.src)window.__draws.push({ms:performance.now(),src:args[0].src});return r;};});
 await page.goto(mode==='baseline'?'http://127.0.0.1:5174/?strategy=B&debug=1':`http://127.0.0.1:5175/?strategy=B&debug=1&down=${mode}`);
 await page.waitForFunction(()=>document.querySelector('[data-testid="assets"]')?.textContent==='Ready');
 const move=async(x,y)=>{await page.mouse.move(x*width,y*height);await page.waitForTimeout(450);};
 const run={width,height,mode,poses:{},sweeps:[]};
 for(const [pose,x,y] of [['center',.5,.5],['down',.5,.995],['lower-left',.08,.92],['lower-right',.92,.92],['right',.92,.5],['left',.08,.5],['up',.5,.08],['upper-left',.08,.08],['upper-right',.92,.08]]) {
 await move(x,y);run.poses[pose]={label:await page.getByTestId('frame').innerText(),pixels:await page.locator('canvas').evaluate(c=>c.toDataURL())};
 if(['center','down','lower-left','lower-right'].includes(pose))await page.screenshot({path:`${out}/${mode}-${width}-${pose}.png`,style:'.debug{visibility:hidden}'});
 }
 const sweep=async(name,from,to,duration=900)=>{await move(...from);const n=await page.evaluate(()=>window.__draws.length);for(let i=1;i<=45;i++){await page.mouse.move((from[0]+(to[0]-from[0])*i/45)*width,(from[1]+(to[1]-from[1])*i/45)*height);await page.waitForTimeout(duration/45);}await page.waitForTimeout(400);run.sweeps.push({name,draws:await page.evaluate(n=>window.__draws.slice(n),n)});};
 await sweep('center-down',[.5,.5],[.5,.995]);await sweep('down-center',[.5,.995],[.5,.5]);await sweep('center-down-center-out',[.5,.5],[.5,.995]);await sweep('center-down-center-back',[.5,.995],[.5,.5]);
 for(let i=0;i<3;i++){await sweep('short-down',[.5,.5],[.5,.64],300);await sweep('short-up',[.5,.64],[.5,.5],300);}
 for(let i=0;i<12;i++){await page.mouse.move(width*.5,height*(i%2?.5:.995));await page.waitForTimeout(35);}await move(.5,.995);
 await sweep('down-lower-left',[.5,.995],[.08,.92]);await move(.5,.995);await sweep('down-lower-right',[.5,.995],[.92,.92]);await sweep('lower-right-down',[.92,.92],[.5,.995]);await sweep('down-center-final',[.5,.995],[.5,.5]);
 const n=await page.evaluate(()=>window.__draws.length);await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>window.__draws.length),n);
 run.fps=await page.getByTestId('fps').innerText();run.resources=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('/frames/')).map(r=>r.name));
 await context.close();await page.video().saveAs(`${out}/${mode}-${width}.webm`);report.push(run);console.log(`${mode} ${width} passed`);
 }
 for(const run of report.filter(r=>r.mode!=='baseline')){const base=report.find(r=>r.mode==='baseline'&&r.width===run.width);for(const p of Object.keys(run.poses).filter(p=>p!=='down'))assert.equal(run.poses[p].pixels,base.poses[p].pixels,p);assert.ok(run.poses.down.label.includes('frame 32'));assert.equal(new Set(run.resources).size,37);}
 for(const r of report)for(const p of Object.values(r.poses))delete p.pixels;await writeFile(out+'/results.json',JSON.stringify(report,null,2));
}finally{await browser.close();}
