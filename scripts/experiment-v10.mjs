import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='qa/v10-bridge';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const report={runs:[],errors:[]};
try {for(const [width,height] of [[1440,900],[1920,1080]])for(const mode of ['baseline','own','retained']){
 const c=await browser.newContext({viewport:{width,height},recordVideo:{dir:out+'/video',size:{width,height}}});const p=await c.newPage();
 await p.addInitScript(()=>{window.__draws=[];const orig=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(...a){const r=orig.apply(this,a);if(a[0]?.src)window.__draws.push({ms:performance.now(),src:a[0].src});return r;};});
 p.on('pageerror',e=>report.errors.push(e.message));
 await p.goto(mode==='baseline'?'http://127.0.0.1:5175/?debug=1&down=progressive':`http://127.0.0.1:5176/?debug=1&endpoint=${mode}`);
 await p.waitForFunction(()=>document.querySelector('[data-testid="assets"]')?.textContent==='Ready');
 const run={width,height,mode,poses:{},sweeps:[]};
 const move=async(x,y)=>{await p.mouse.move(width*x,height*y);await p.waitForTimeout(450);};
 for(const [pose,x,y] of [['center',.5,.5],['down',.5,.995],['lower-right',.92,.92],['right',.92,.5],['lower-left',.08,.92],['left',.08,.5],['up',.5,.08],['upper-left',.08,.08],['upper-right',.92,.08]]){
 await move(x,y);run.poses[pose]={label:await p.getByTestId('frame').innerText(),pixels:await p.locator('canvas').evaluate(c=>c.toDataURL())};
 if(['center','down','lower-right'].includes(pose))await p.screenshot({path:`${out}/${mode}-${width}-${pose}.png`,style:'.debug{visibility:hidden}'});
 }
 const sweep=async(name,from,to,steps=30)=>{await move(...from);const n=await p.evaluate(()=>window.__draws.length);for(let i=1;i<=steps;i++){await p.mouse.move((from[0]+(to[0]-from[0])*i/steps)*width,(from[1]+(to[1]-from[1])*i/steps)*height);await p.waitForTimeout(30);}await p.waitForTimeout(350);run.sweeps.push({name,draws:await p.evaluate(n=>window.__draws.slice(n),n)});};
 await sweep('center-down',[.5,.5],[.5,.995]);await sweep('slow-down-lr',[.5,.995],[.92,.92],60);await sweep('slow-lr-down',[.92,.92],[.5,.995],60);await sweep('down-center',[.5,.995],[.5,.5]);
 await sweep('direct-center-lr',[.5,.5],[.92,.92]);await sweep('direct-lr-center',[.92,.92],[.5,.5]);
 const count=await p.evaluate(()=>window.__draws.length);
 for(let i=0;i<16;i++){await p.mouse.move(width*(i%2?.5:.92),height*(i%2?.995:.92));await p.waitForTimeout(40);}await move(.92,.92);
 run.rapid=await p.evaluate(n=>window.__draws.slice(n),count);
 const n=await p.evaluate(()=>window.__draws.length);await p.waitForTimeout(500);assert.equal(await p.evaluate(()=>window.__draws.length),n);
 run.fps=await p.getByTestId('fps').innerText();run.resources=await p.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('/frames/')).map(r=>r.name));assert.equal(new Set(run.resources).size,37);
 await c.close();await p.video().saveAs(`${out}/${mode}-${width}.webm`);report.runs.push(run);console.log(`${mode} ${width}: stable, sweeps, reversals, 37-frame cache passed`);
 }
 for(const run of report.runs.filter(r=>r.mode!=='baseline')){const base=report.runs.find(r=>r.mode==='baseline'&&r.width===run.width);for(const pose of Object.keys(run.poses).filter(p=>p!=='lower-right'))assert.equal(run.poses[pose].pixels,base.poses[pose].pixels,pose);assert.ok(run.poses['lower-right'].label.includes(run.mode==='own'?'frame 60':'frame 132'));if(run.mode==='retained')assert.equal(run.poses['lower-right'].pixels,base.poses['lower-right'].pixels);}
 assert.deepEqual(report.errors,[]);for(const r of report.runs)for(const p of Object.values(r.poses))delete p.pixels;await writeFile(out+'/results.json',JSON.stringify(report,null,2));
}finally{await browser.close();}
