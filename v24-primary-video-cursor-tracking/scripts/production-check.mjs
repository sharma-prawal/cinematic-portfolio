import {chromium} from 'playwright';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base=new URL('../',import.meta.url),url='http://127.0.0.1:4324';
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));const result={modes:[],evidence:[],sourceHashes:{},errors};
try {
  for(const query of ['?mode=A','?mode=B','?mode=C','?compare=1']){
    await page.goto(url+'/'+query);await page.waitForFunction(()=>{const s=window.__v24?.snapshot();return s&&Object.keys(s.panels).length>0&&Object.values(s.panels).every(r=>r.status==='ready');});
    const s=await page.evaluate(()=>window.__v24.snapshot());assert.ok(s.primary.includes('20261009112404'));assert.equal(await page.locator('video').count(),0);result.modes.push({query,panels:Object.keys(s.panels),status:'ready'});
  }
  await page.goto(url+'/evidence/');await page.getByRole('heading',{name:'V24: photographic tracking evidence'}).waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('video')].every(v=>v.readyState>=1));
  assert.equal(await page.locator('video').count(),3);assert.ok(await page.locator('body').innerText().then(t=>t.includes('NO-GO')));
  for(const path of ['/evidence/REPORT.md','/evidence/source-inventory.csv','/evidence/primary-frame-audit.csv','/evidence/browser-results.json','/evidence/preservation-after.json']){const r=await page.request.get(url+path);assert.equal(r.status(),200);result.evidence.push({path,status:200,bytes:(await r.body()).length});}
  await page.screenshot({path:new URL('qa/evidence-page.png',base).pathname});
  for(const path of ['src/main.tsx','src/controller.ts','src/cache.ts','src/style.css','public/atlas.json']){result.sourceHashes[path]=createHash('sha256').update(await readFile(new URL(path,base))).digest('hex');}
  assert.equal(errors.length,0);result.passed=true;
} finally {await writeFile(new URL('qa/production-check.json',base),JSON.stringify(result,null,2));await browser.close();}
console.log('Final production modes, evidence page, three video recordings and all downloadable reports passed.');
