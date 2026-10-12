import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const out='qa/interaction-polish';const report=JSON.parse(await readFile(out+'/results.json','utf8'));
assert.equal(report.runs.length,15);assert.equal(report.accessibility.length,15);
for(const r of report.runs){
 const base=report.runs.find(b=>b.width===r.width&&b.config==='baseline');
 assert.deepEqual(r.inputs.map(({x,y,phase})=>({x,y,phase})),base.inputs.map(({x,y,phase})=>({x,y,phase})),'identical real cursor coordinates and phase order');
}
const b=await chromium.launch({channel:'chrome',headless:true});const result={identicalPaths:'pass',normalTouch:[],boundaryScreens:[]};
try{for(const config of ['baseline','boundary']){
 const url=config==='baseline'?'http://127.0.0.1:5177/?debug=1&right=own':'http://127.0.0.1:5178/?debug=1&tuning=boundary';
 const c=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,recordVideo:{dir:out+'/video',size:{width:390,height:844}}});const p=await c.newPage();
 await p.addInitScript(()=>{window.__draws=[];const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(...a){const r=draw.apply(this,a);if(a[0]?.src)window.__draws.push({t:performance.now(),src:a[0].src});return r;};});
 await p.goto(url);await p.waitForFunction(()=>document.querySelector('[data-testid="assets"]')?.textContent==='Ready');assert.equal(await p.getByLabel('Smooth tracking').isDisabled(),false);
 await p.addStyleTag({content:'.debug{visibility:hidden}'});
 const cdp=await c.newCDPSession(p);const points=[[195,422],[195,839.78],[358.8,776.48],[358.8,422],[358.8,776.48],[195,839.78],[195,422]];let active=false;
 for(let i=0;i<points.length;i++){
  const from=points[Math.max(0,i-1)],to=points[i];
  for(let step=1;step<=12;step++){
   await cdp.send('Input.dispatchTouchEvent',{type:active?'touchMove':'touchStart',touchPoints:[{x:from[0]+(to[0]-from[0])*step/12,y:from[1]+(to[1]-from[1])*step/12}]});active=true;await p.waitForTimeout(25);
  }await p.waitForTimeout(300);
  const actual=await p.evaluate(()=>{const src=window.__draws.at(-1).src;const n=Number(src.match(/frame-(\d+)/)[1]);return n+(src.includes('flow-2012')?16000:src.includes('flow-1934')?12000:src.includes('flow-1816')?8000:0);});
  assert.equal(actual,[3,8032,12060,16120,12060,8032,3][i],`${config}: normal touch endpoint ${i}`);
 }
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(450);assert.ok((await p.getByTestId('frame').textContent()).includes('frame 3'));
 result.normalTouch.push({config,result:'pass',draws:await p.evaluate(()=>window.__draws)});
 await c.close();await p.video().saveAs(`${out}/${config}-normal-touch.webm`);
 const desktop=await b.newContext({viewport:{width:1440,height:900}});const page=await desktop.newPage();
 await page.addInitScript(()=>{window.__lastDraw='';const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(...a){const r=draw.apply(this,a);if(a[0]?.src)window.__lastDraw=a[0].src;return r;};});
 await page.goto(url);await page.waitForFunction(()=>document.querySelector('[data-testid="assets"]')?.textContent==='Ready');await page.addStyleTag({content:'.debug{visibility:hidden}'});
 for(const [name,x,y] of [['x65-before',.82,.73],['x65-after',.83,.73],['y65-before',.75,.82],['y65-after',.75,.83],['right-before',.82,.5],['right-after',.83,.5]]){
  await page.mouse.move(720,450);await page.waitForTimeout(450);await page.mouse.move(1440*x,900*y);await page.waitForTimeout(450);
  result.boundaryScreens.push({config,name,x,y,source:await page.evaluate(()=>window.__lastDraw)});await page.screenshot({path:`${out}/${config}-${name}.png`});
 }
 // Diagnostics are optional; the normal portrait view stays minimal.
 await page.goto(url.split('?')[0]);await page.locator('canvas.is-ready').waitFor();assert.equal(await page.locator('.debug').count(),0);assert.equal((await page.locator('body').innerText()).trim(),'Move your cursor');await desktop.close();
}await writeFile(out+'/final-checks.json',JSON.stringify(result,null,2));console.log('All 15 mouse paths identical; normal touch full route/reverse; exact-coordinate boundary screenshots; normal view: passed.');}finally{await b.close();}
