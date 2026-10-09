import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=new URL('../analysis/comprehensive-audit/browser/',import.meta.url);
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={errors:[],sequences:[]};
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2,
   recordVideo:{dir:new URL('video/',out).pathname,size:{width:1440,height:900}}});
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/analysis/comprehensive-audit/viewer.html');
 await page.waitForFunction(()=>document.body.dataset.ready==='true');
 for(const key of ['trimmed-down','trimmed-return','cross-clip-lower-arc','blink-return-6','same-clip-rejoin-3','original-lower-arc']){
  await page.evaluate(k=>window.auditLoad(k),key);
  await page.evaluate(()=>{document.body.dataset.complete='false';window.auditPlay();});
  await page.waitForFunction(()=>document.body.dataset.complete==='true');
  const label=await page.locator('#label').innerText();
  await page.screenshot({path:new URL(`${key}.png`,out).pathname});
  report.sequences.push({key,endLabel:label});await page.waitForTimeout(350);
 }
 assert.deepEqual(report.errors,[]);
 await context.close();await page.video().saveAs(new URL('source-playback.webm',out).pathname);
 await writeFile(new URL('results.json',out),JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();}
