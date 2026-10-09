import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const b=await chromium.launch({channel:'chrome',headless:true});const results=[];
try{for(const mode of ['baseline','own'])for(const width of [1440,390]){
 const c=await b.newContext({viewport:{width,height:width===390?844:900},hasTouch:width===390,isMobile:width===390,reducedMotion:width===390?'reduce':'no-preference'});const p=await c.newPage();
 await p.addInitScript(()=>{window.__decode=[];const orig=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=async function(){const start=performance.now();await orig.call(this);window.__decode.push({src:this.src,start,end:performance.now(),width:this.naturalWidth,height:this.naturalHeight});};});
 await p.goto(mode==='baseline'?'http://127.0.0.1:5176/?debug=1&endpoint=own':'http://127.0.0.1:5177/?debug=1&right=own');await p.waitForFunction(()=>document.querySelector('[data-testid="assets"]')?.textContent==='Ready');await p.waitForTimeout(1100);
 const rows=await p.evaluate(()=>window.__decode);assert.equal(rows.length,mode==='baseline'?37:43);
 results.push({mode,width,decodeSpanMs:Math.max(...rows.map(r=>r.end))-Math.min(...rows.map(r=>r.start)),frames:rows.length,decodedMiB:rows.reduce((sum,r)=>sum+r.width*r.height*4,0)/1048576,fps:await p.getByTestId('fps').innerText()});
 if(mode==='own'&&width===390){assert.equal(await p.getByLabel('Smooth tracking').isDisabled(),true);const cdp=await c.newCDPSession(p);for(const [x,y,expected] of [[195,843,32],[389,843,60],[389,422,120]]){await cdp.send('Input.dispatchTouchEvent',{type:x===195?'touchStart':'touchMove',touchPoints:[{x,y}]});await p.waitForTimeout(250);assert.ok((await p.getByTestId('frame').innerText()).includes(`frame ${expected}`));}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(250);assert.ok((await p.getByTestId('frame').innerText()).includes('frame 3'));}
 await c.close();
}await writeFile('qa/v11-right/performance.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await b.close();}
