import {chromium} from 'playwright';
import {mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const out='qa/interaction-polish';
await mkdir(out+'/video',{recursive:true});
const configs={baseline:'http://127.0.0.1:5177/?debug=1&right=own',
 boundary:'http://127.0.0.1:5178/?debug=1&tuning=boundary',
 responsive:'http://127.0.0.1:5178/?debug=1&tuning=responsive'};
const sizes=[[1920,1080],[1440,900],[1366,768],[1024,768],[390,844]];
const poses={center:[.5,.5],down:[.5,.995],'lower-right':[.92,.92],right:[.92,.5],
 'lower-left':[.08,.92],left:[.08,.5],up:[.5,.08],'upper-left':[.08,.08],'upper-right':[.92,.08]};
const b=await chromium.launch({channel:'chrome',headless:true});
const report={browser:await b.version(),runs:[],accessibility:[],errors:[],method:'Real Playwright mouse and CDP touch; actual Canvas draws, pointer events, image.decode and rAF callback timing instrumented. Timings are CPU submission, not physical display latency.'};

async function instrument(p){
 await p.addInitScript(()=>{
  const q=window.__qa={draws:[],inputs:[],ticks:[],decodes:[],phase:'preload',lastFrame:3,lastInput:null};
  const id=src=>{const n=Number(src.match(/frame-(\d+)/)?.[1]);return n+(src.includes('flow-2012')?16000:src.includes('flow-1934')?12000:src.includes('flow-1816')?8000:src.includes('flow-1704')?5000:0);};
  const draw=CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage=function(...a){
   const start=performance.now();const r=draw.apply(this,a);
   if(this.canvas.matches('.portrait-canvas')&&a[0]?.src){
    q.lastFrame=id(a[0].src);q.draws.push({t:start,ms:performance.now()-start,frame:q.lastFrame,phase:q.phase,input:q.lastInput});
    const label=document.querySelector('#qa-label');if(label)label.textContent=`${q.phase} · atlas ${q.lastFrame}`;
   }return r;
  };
  const decode=HTMLImageElement.prototype.decode;
  HTMLImageElement.prototype.decode=async function(){const start=performance.now();await decode.call(this);q.decodes.push({start,end:performance.now(),frame:id(this.src),width:this.naturalWidth,height:this.naturalHeight});};
  const raf=window.requestAnimationFrame;let prior=0;
  window.requestAnimationFrame=fn=>raf.call(window,t=>{const start=performance.now();fn(t);q.ticks.push({t,interval:prior?t-prior:0,cpu:performance.now()-start,phase:q.phase});prior=t;});
  window.addEventListener('pointermove',e=>{
   q.lastInput={t:performance.now(),x:e.clientX,y:e.clientY,phase:q.phase,type:e.pointerType};q.inputs.push(q.lastInput);
   const dot=document.querySelector('#qa-pointer');if(dot){dot.style.left=`${e.clientX}px`;dot.style.top=`${e.clientY}px`;}
  },{passive:true});
 });
}
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
const percentile=(xs,p)=>[...xs].sort((a,b)=>a-b)[Math.min(xs.length-1,Math.floor(xs.length*p))];

try{
 for(const [width,height] of sizes)for(const [config,url] of Object.entries(configs)){
  const c=await b.newContext({viewport:{width,height},deviceScaleFactor:1,recordVideo:{dir:out+'/video',size:{width,height}}});
  const p=await c.newPage();await instrument(p);p.on('pageerror',e=>report.errors.push({config,width,error:e.message}));
  const start=Date.now();await p.goto(url);await p.waitForFunction(()=>document.querySelector('[data-testid="assets"]')?.textContent==='Ready');
  const run={config,width,height,readyMs:Date.now()-start,poses:{},phases:[],responses:[]};
  await p.addStyleTag({content:'.debug{visibility:hidden}'});
  await p.evaluate(()=>{
   for(const [id,style] of [['qa-label','position:fixed;left:8px;top:8px;font:12px monospace;color:white;background:#222b;padding:5px;z-index:99;pointer-events:none'],['qa-pointer','position:fixed;width:9px;height:9px;border-radius:50%;background:#f65338;border:1px solid white;z-index:99;pointer-events:none;transform:translate(-50%,-50%)'],['qa-marker','position:fixed;bottom:0;left:0;height:12px;width:100%;background:#00ff00;z-index:100;pointer-events:none']]){const d=document.createElement('div');d.id=id;d.style.cssText=style;document.body.append(d);}
  });
  const phase=async name=>{const t=await p.evaluate(name=>{window.__qa.phase=name;document.querySelector('#qa-label').textContent=`${name} · atlas ${window.__qa.lastFrame}`;return performance.now();},name);run.phases.push({name,t});};
  const move=async(point,hold=350)=>{await p.mouse.move(width*point[0],height*point[1]);if(hold)await p.waitForTimeout(hold);};
  await phase('comparison-start');await move(poses.center,300);await p.evaluate(()=>document.querySelector('#qa-marker').remove());
  for(const [name,point] of Object.entries(poses)){
   await phase('stationary-'+name);await move(point,450);
   const data=await p.locator('canvas').evaluate(c=>c.toDataURL());
   run.poses[name]={frame:await p.evaluate(()=>window.__qa.lastFrame),pixels:createHash('sha256').update(data).digest('hex')};
   assert.equal(await p.getByTestId('target').textContent(),name);
   await p.screenshot({path:`${out}/${config}-${width}-${name}.png`});
  }
  const sweep=async(name,from,to,steps=36,delay=25,settle=150)=>{
   await phase('setup-'+name);await move(from,450);await phase(name);const start=Date.now();
   for(let i=1;i<=steps;i++){
    await p.mouse.move(width*(from[0]+(to[0]-from[0])*i/steps),height*(from[1]+(to[1]-from[1])*i/steps));
    const remaining=start+i*delay-Date.now();if(remaining>0)await p.waitForTimeout(remaining);
   }if(settle)await p.waitForTimeout(settle);
  };
  await sweep('slow-horizontal',poses.left,poses.right,64,25);
  await sweep('slow-vertical',poses.center,poses.down,64,25);
  await sweep('slow-vertical-reverse',poses.down,poses.center,64,25);
  await sweep('slow-diagonal',poses.center,poses['lower-right'],64,25);
  await sweep('slow-diagonal-reverse',poses['lower-right'],poses.center,64,25);
  const route=['center','down','lower-right','right','lower-right','down','center'];
  for(const [speed,steps,delay] of [['slow',32,30],['normal',10,16],['rapid',3,16]]){
   for(let i=1;i<route.length;i++)await sweep(`${speed}-${route[i-1]}-${route[i]}`,poses[route[i-1]],poses[route[i]],steps,delay,120);
  }
  await sweep('boundary-x65',[.78,.73],[.86,.73],48,25);
  await sweep('boundary-x65-reverse',[.86,.73],[.78,.73],48,25);
  await sweep('boundary-y65',[.75,.78],[.75,.86],48,25);
  await sweep('boundary-y65-reverse',[.75,.86],[.75,.78],48,25);
  await sweep('right-radial-x65',[.78,.5],[.86,.5],48,25);
  await sweep('right-radial-x65-reverse',[.86,.5],[.78,.5],48,25);
  await sweep('right-equator',[.92,.49],[.92,.51],48,25);
  await sweep('right-equator-reverse',[.92,.51],[.92,.49],48,25);
  await phase('setup-rapid-midpoint-reversals');await move([.92,.79],450);await phase('rapid-midpoint-reversals');
  for(let i=0;i<16;i++){await move([.92,i%2?.79:.64],0);await p.waitForTimeout(40);}
  await phase('setup-boundary-jitter');await move([.92,.794],450);
  await phase('boundary-jitter');
  for(let i=0;i<24;i++){await move([.92,.794+(i%2?.0004:-.0004)],0);await p.waitForTimeout(20);}
  for(const [from,to] of [['center','down'],['down','center'],['lower-right','right'],['right','lower-right']]){
   await phase(`setup-response-${from}-${to}`);await move(poses[from],450);await phase(`response-${from}-${to}`);await move(poses[to],450);
  }
  await phase('stopped');const n=await p.evaluate(()=>window.__qa.draws.length);await p.waitForTimeout(500);assert.equal(await p.evaluate(()=>window.__qa.draws.length),n);
  await phase('leave-viewport');await p.mouse.move(-20,-20);await p.waitForTimeout(500);assert.equal(await p.evaluate(()=>window.__qa.lastFrame),3);
  await phase('return-center');await move(poses.center,450);assert.equal(await p.evaluate(()=>window.__qa.lastFrame),3);
  const q=await p.evaluate(()=>window.__qa);
  assert.equal(q.decodes.length,43);assert.equal(new Set(q.decodes.map(d=>d.frame)).size,43);
  run.frameCount=q.decodes.length;run.decodedMiB=q.decodes.reduce((s,d)=>s+d.width*d.height*4,0)/1048576;
  run.decodeSpanMs=Math.max(...q.decodes.map(d=>d.end))-Math.min(...q.decodes.map(d=>d.start));
  const ticks=q.ticks.filter(t=>t.interval>0&&t.phase!=='preload');
  run.timing={fps:1000/median(ticks.map(t=>t.interval)),rafP95Ms:percentile(ticks.map(t=>t.interval),.95),callbackP95Ms:percentile(ticks.map(t=>t.cpu),.95),drawP95Ms:percentile(q.draws.map(d=>d.ms),.95),over25ms:ticks.filter(t=>t.interval>25).length,totalTicks:ticks.length};
  run.draws=q.draws;run.inputs=q.inputs;
  for(const {name,t} of run.phases.filter(p=>p.name.startsWith('response-'))){
   const input=q.inputs.find(i=>i.phase===name&&i.t>=t);const draws=q.draws.filter(d=>d.phase===name&&d.t>=input.t);
   assert.ok(draws.length>0,'response must include an actual changed Canvas pose');
   run.responses.push({name,firstDrawMs:draws[0]?.t-input.t,finalPoseMs:draws.at(-1)?.t-input.t,frames:draws.map(d=>d.frame)});
  }
  run.layout=await p.evaluate(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return{scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,canvasWidth:r.width,canvasHeight:r.height,canvasY:r.y,videoCount:document.querySelectorAll('video').length};});
  assert.equal(run.layout.scrollWidth,width);assert.equal(run.layout.scrollHeight,height);assert.equal(run.layout.videoCount,0);
  assert.ok(Math.abs(run.layout.canvasWidth/run.layout.canvasHeight-16/9)<.01);
  assert.ok(run.layout.canvasY>=0&&run.layout.canvasY+run.layout.canvasHeight<=height);
  const resources=await p.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('/frames/')).map(r=>r.name));
  assert.equal(new Set(resources).size,43);assert.ok(resources.every(r=>!r.includes('115345')&&!r.includes('114645')));
  await c.close();await p.video().saveAs(`${out}/${config}-${width}.webm`);
  report.runs.push(run);await writeFile(out+'/results.json',JSON.stringify(report,null,2));
  console.log(`${config} ${width}x${height}: 9 poses, all sweeps, reversals, exit, layout; ${run.decodedMiB.toFixed(2)} MiB; ${run.timing.fps.toFixed(1)} fps`);
 }
 for(const r of report.runs){const base=report.runs.find(a=>a.config==='baseline'&&a.width===r.width);for(const pose of Object.keys(poses))assert.equal(r.poses[pose].pixels,base.poses[pose].pixels,`${r.config} ${r.width} ${pose}: endpoint pixels`);assert.equal(r.poses.center.frame,3);assert.equal(r.poses.down.frame,8032);assert.equal(r.poses['lower-right'].frame,12060);assert.equal(r.poses.right.frame,16120);}
 for(const [width,height] of sizes)for(const [config,url] of Object.entries(configs)){
  const c=await b.newContext({viewport:{width,height},hasTouch:true,isMobile:width===390,reducedMotion:'reduce'});const p=await c.newPage();await instrument(p);await p.goto(url);await p.waitForFunction(()=>document.querySelector('[data-testid="assets"]')?.textContent==='Ready');
  assert.equal(await p.getByLabel('Smooth tracking').isDisabled(),true);
  for(const point of [poses.down,poses['lower-right'],poses.right,poses.center]){await p.mouse.move(width*point[0],height*point[1]);await p.waitForTimeout(60);const xy=await p.evaluate(()=>window.__qa.inputs.at(-1));const draws=await p.evaluate(()=>window.__qa.draws);assert.ok(draws.at(-1).t-xy.t<50);}
  const cdp=await c.newCDPSession(p);const touch=[];
  for(const [i,name] of ['down','lower-right','right'].entries()){
   const [x,y]=poses[name];await cdp.send('Input.dispatchTouchEvent',{type:i===0?'touchStart':'touchMove',touchPoints:[{x:width*x,y:height*y}]});await p.waitForTimeout(80);touch.push(await p.evaluate(()=>window.__qa.lastFrame));
  }assert.deepEqual(touch,[8032,12060,16120]);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(80);assert.equal(await p.evaluate(()=>window.__qa.lastFrame),3);
  report.accessibility.push({config,width,reducedMotion:'pass',touch:'pass',touchFrames:touch});await c.close();
 }
 assert.deepEqual(report.errors,[]);await writeFile(out+'/results.json',JSON.stringify(report,null,2));
 console.log('All endpoint pixel comparisons, reduced motion and touch passed at all five sizes.');
}finally{await b.close();}
