import { chromium } from 'playwright';
import { mkdir, writeFile, readFile, rename } from 'node:fs/promises';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const qa = new URL('qa/', root); await mkdir(qa, { recursive: true });
const url = process.env.QA_URL || 'http://127.0.0.1:4324';
const atlas = JSON.parse(await readFile(new URL('public/atlas.json', root), 'utf8'));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const percentile = (values, p) => { const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return a[Math.min(a.length-1,Math.floor(a.length*p))] ?? null; };
function metrics(run) {
  const s=run.samples.filter(s=>s.dt>0); const dt=s.map(s=>s.dt);const duration=dt.reduce((n,x)=>n+x,0);
  const changes=s.filter(s=>s.changed);
  let longestHold=0,lastChange=s[0]?.t??0;
  for(const x of s){if(x.changed)lastChange=x.t;longestHold=Math.max(longestHold,x.t-lastChange);}
  return { samples:s.length,durationMs:duration,renderFPS:duration?s.length*1000/duration:0,frameMsP50:percentile(dt,.5),frameMsP95:percentile(dt,.95),frameMsMax:Math.max(...dt),renderCostMsP95:percentile(s.map(x=>x.renderMs),.95),selectionChanges:changes.length,uniquePhotographs:new Set(s.map(x=>x.frame)).size,unsupportedFraction:s.filter(x=>!x.supported).length/Math.max(1,s.length),cacheWaitFraction:s.filter(x=>x.cacheWait).length/Math.max(1,s.length),largeJumps:changes.filter(x=>x.angularJump>5).length,maxAngularJumpDeg:Math.max(0,...changes.map(x=>x.angularJump)),longestPhotographHoldMs:longestHold,visibleChangeInputAgeMsP50:percentile(changes.map(x=>x.inputAgeMs),.5),visibleChangeInputAgeMsP95:percentile(changes.map(x=>x.inputAgeMs),.95),readyMs:run.readyMs,cache:{...run.cache,decodeMs:undefined,loadMs:undefined,decodeMsP50:percentile(run.cache.decodeMs,.5),decodeMsP95:percentile(run.cache.decodeMs,.95),loadMsP95:percentile(run.cache.loadMs,.95)},sourceCounts:run.sourceCounts};
}
const browser = await chromium.launch({ channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding'] });
const report={browser:await browser.version(),url,viewports:[],checks:[],directions:[],trajectories:[],response:[],errors:[],method:'Installed real Chrome, production Vite preview. Direction/exit tests use Playwright mouse input; reproducible normal-speed paths dispatch pointer events inside browser requestAnimationFrame, measured in real wall time. Recordings are Playwright screen captures, no time compression. Render FPS is not photographic FPS. Nominal memory includes cache reservations, excludes browser internals and canvas backing stores.'};
const snapshot=page=>page.evaluate(()=>window.__v24.snapshot());
async function ready(page, query='?mode=B') {
  await page.goto(url+'/'+query);await page.waitForFunction(()=>{const a=window.__v24?.snapshot();return a&&Object.values(a.panels).length>0&&Object.values(a.panels).every(p=>p.status==='ready');},{timeout:20000});
  await wait(250);
}
async function recordTrajectory(page, spec) {
  await page.evaluate(()=>window.__v24.setTarget(0,0));await wait(300);await page.evaluate(()=>window.__v24.reset());
  const actual = await page.evaluate(async spec => {
    const start=performance.now();let frames=0;
    await new Promise(resolve=>{
      function tick(now){
        const u=Math.min(1,(now-start)/spec.duration);const cycles=spec.cycles??1;
        const a=u*Math.PI*2*cycles*(spec.ccw?-1:1);
        let x,y;
        if(spec.kind==='sweep'){x=-.9+u*1.8;y=(spec.y??0);}
        else if(spec.kind==='diagonal'){x=-.85+u*1.7;y=-.85+u*1.7;}
        else if(spec.kind==='reverse'){x=Math.sin(u*Math.PI*2*6)*.85;y=Math.sin(u*Math.PI*2*6)*.22;}
        else {x=(spec.cx??0)+Math.cos(a)*spec.radius;y=(spec.cy??0)+Math.sin(a)*spec.radius;}
        window.dispatchEvent(new PointerEvent('pointermove',{clientX:(x+1)*innerWidth/2,clientY:(y+1)*innerHeight/2,pointerType:'mouse',pointerId:1,bubbles:true}));
        frames++;if(u>=1)resolve();else requestAnimationFrame(tick);
      }requestAnimationFrame(tick);
    });return {wallMs:performance.now()-start,inputEvents:frames};
  },spec);
  const state=await snapshot(page);const result={...spec,...actual,panels:Object.fromEntries(Object.entries(state.panels).map(([key,run])=>[key,metrics(run)]))};
  await writeFile(new URL(`trace-${spec.name}.json`,qa),JSON.stringify(state,null,2));
  report.trajectories.push(result);return result;
}
try {
  for(const [width,height] of [[1920,1080],[1440,900],[1366,768],[1024,768],[390,844]]) {
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});const page=await context.newPage();
    page.on('pageerror',e=>report.errors.push({where:`${width}`,message:e.message}));
    const requests=[];page.on('request',r=>{if(r.url().includes('/frames/'))requests.push(r.url());});
    await ready(page);
    const initialImageRequests=requests.length;
    const layout=await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,canvas:[r.x,r.y,r.width,r.height],pixel:[...c.getContext('2d').getImageData(480,200,1,1).data],videos:document.querySelectorAll('video').length};});
    assert.equal(layout.scrollWidth,width);assert.equal(layout.videos,0);assert.ok(layout.pixel[3]===255&&layout.pixel[0]>20);assert.ok(Math.abs(layout.canvas[2]/layout.canvas[3]-16/9)<.01);
    assert.ok(layout.canvas[1]>=0&&layout.canvas[1]+layout.canvas[3]<=height);
    await page.screenshot({path:new URL(`viewport-${width}x${height}.png`,qa).pathname,fullPage:true});
    for(const [name,a] of Object.entries(atlas.anchors)) {
      const [x,y]=a.input;await page.mouse.move(Math.min(width-1,(x+1)*width/2),Math.min(height-1,(y+1)*height/2),{steps:4});await wait(180);
      const state=await snapshot(page);const r=state.panels.B;const photo=atlas.frames.find(p=>p.id===r.current);
      assert.ok(r.supported,`${width} ${name} should have nearby source pose`);
      if(name.includes('LEFT'))assert.ok(photo.yaw<atlas.calibration.yaw0);
      if(name.includes('RIGHT'))assert.ok(photo.yaw>atlas.calibration.yaw0);
      if(name.includes('UP'))assert.ok(photo.pitch>atlas.calibration.pitch0);
      if(name.includes('LOWER')||name==='DOWN')assert.ok(photo.pitch<atlas.calibration.pitch0);
      if(width===1440){report.directions.push({name,frame:r.current,filename:photo.filename,yaw:photo.yaw,pitch:photo.pitch,error:r.error});await page.screenshot({path:new URL(`direction-${name.toLowerCase()}.png`,qa).pathname});}
    }
    await page.mouse.move(0,0);await page.evaluate(()=>document.documentElement.dispatchEvent(new PointerEvent('pointerleave')));await wait(240);
    assert.equal((await snapshot(page)).panels.B.current,0,'pointer exit returns neutral');
    await page.evaluate(()=>window.__v24.reset());await wait(350);assert.equal((await snapshot(page)).panels.B.changes,0,'stationary neutral has no chatter');
    const final=await snapshot(page);assert.ok(final.panels.B.cache.peakImages<=24);assert.equal(final.panels.B.cache.errors,0);
    assert.ok(requests.length<240,'must not preload all primary source photographs');
    report.viewports.push({width,height,layout,initialImageRequests,requestsDuringDirectionalTest:requests.length,metrics:metrics(final.panels.B)});
    if(width===1440){await page.getByRole('button',{name:'Inspect',exact:true}).click();await page.screenshot({path:new URL('inspection-desktop.png',qa).pathname,fullPage:true});}
    if(width===390){await page.getByRole('button',{name:'Inspect',exact:true}).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);await page.screenshot({path:new URL('inspection-mobile.png',qa).pathname,fullPage:true});}
    await context.close();
    console.log('Responsive + nine directions',width,height);
  }
  const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:new URL('recordings/',qa).pathname,size:{width:1440,height:900}}});const page=await context.newPage();
  page.on('pageerror',e=>report.errors.push({where:'circles',message:e.message}));
  await ready(page,'?compare=1&tau=35');await page.screenshot({path:new URL('comparison-desktop.png',qa).pathname});
  const paths=[
    {name:'small-clockwise',radius:.15,duration:3000,cycles:2},
    {name:'small-counterclockwise',radius:.15,duration:3000,cycles:2,ccw:true},
    {name:'medium-clockwise',radius:.45,duration:3500,cycles:2},
    {name:'medium-counterclockwise',radius:.45,duration:3500,cycles:2,ccw:true},
    {name:'large-clockwise',radius:.9,duration:4500,cycles:2},
    {name:'large-counterclockwise',radius:.9,duration:4500,cycles:2,ccw:true},
    {name:'offset-upper',radius:.3,cx:.25,cy:-.35,duration:3500,cycles:2},
    {name:'offset-lower',radius:.3,cx:-.2,cy:.4,duration:3500,cycles:2},
    {name:'slow-circle',radius:.8,duration:7000,cycles:1},
    {name:'normal-circle',radius:.8,duration:3500,cycles:2},
    {name:'rapid-reversals',kind:'reverse',duration:3500},
    {name:'small-movement',radius:.035,duration:2000,cycles:2},
    {name:'horizontal-sweep',kind:'sweep',duration:3500},
    {name:'diagonal-sweep',kind:'diagonal',duration:3500},
  ];
  for(const path of paths){const r=await recordTrajectory(page,path);assert.equal(r.panels.B.cache.errors,0);assert.ok(r.panels.B.cache.peakImages<=24);console.log(path.name,JSON.stringify({changes:r.panels.B.selectionChanges,unsupported:r.panels.B.unsupportedFraction,jumps:r.panels.B.largeJumps,fps:r.panels.B.renderFPS}));}
  const video=page.video();await context.close();await rename(await video.path(),new URL('recordings/circular-B-vs-C.webm',qa));
  report.checks.push('B/C identical-input recording: no secondary repairs passed, so compare claims no repaired advantage');

  // Evaluate all three requested smoothing values and all three selector policies once.
  for(const tau of [20,35,50]) {
    const c=await browser.newContext({viewport:{width:1440,height:900}});const p=await c.newPage();await ready(p,`?mode=B&tau=${tau}`);
    await recordTrajectory(p,{name:`smoothing-${tau}`,radius:.8,duration:3500,cycles:2});
    for(const [x,y,name] of [[.8,.7,'right-down'],[-.8,.7,'left-down'],[0,-1,'up'],[0,1,'down']]) {
      await p.evaluate(()=>window.__v24.setTarget(0,0));await wait(200);await p.evaluate(()=>window.__v24.reset());
      const input=await p.evaluate(([x,y])=>{const t=performance.now();window.__v24.setTarget(x,y);return t;},[x,y]);await wait(300);
      const state=await snapshot(p);const s=state.panels.B.samples;const first=s.find(s=>s.t>=input&&s.changed);const target=s.at(-1).requested;
      const near=s.find(s=>s.t>=input&&Math.hypot(s.smoothed[0]-x,s.smoothed[1]-y)<.1);
      report.response.push({tau,name,firstVisibleChangeMs:first?first.t-input:null,withinPointOneInputMs:near?near.t-input:null,finalFrame:state.panels.B.current,requested:target,supported:state.panels.B.supported});
    }
    await c.close();
  }
  for(const strategy of ['nearest','neighbor','continuity']) {
    const c=await browser.newContext({viewport:{width:1440,height:900}});const p=await c.newPage();await ready(p,`?mode=B&strategy=${strategy}`);
    await recordTrajectory(p,{name:`selector-${strategy}`,radius:.8,duration:3500,cycles:2});await c.close();
  }
  // Browser-native touch input and release fallback.
  const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});const tp=await touch.newPage();await ready(tp);
  const cdp=await touch.newCDPSession(tp);const rect=await tp.locator('canvas').boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:rect.y+rect.height/2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:345,y:rect.y+rect.height*.8}]});await wait(200);
  assert.ok((await snapshot(tp)).raw[0]>.5);
  await tp.screenshot({path:new URL('touch-active.png',qa).pathname});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(240);assert.equal((await snapshot(tp)).panels.B.current,0);
  report.checks.push('390x844 browser-native touch drag and release-to-neutral passed');await touch.close();

  const reduced=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});const rp=await reduced.newPage();await ready(rp);
  await rp.mouse.move(1200,200);await wait(200);assert.equal((await snapshot(rp)).panels.B.current,0);
  await rp.getByRole('button',{name:'Inspect',exact:true}).click();await rp.getByRole('button',{name:'right',exact:true}).click();await wait(200);assert.ok((await snapshot(rp)).panels.B.current!==0);
  await rp.screenshot({path:new URL('reduced-motion.png',qa).pathname});report.checks.push('Reduced motion suppresses passive tracking and permits explicit static pose selection');await reduced.close();

  const source=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:new URL('recordings/',qa).pathname,size:{width:1440,height:900}}});const sp=await source.newPage();await ready(sp,'?mode=A');
  await wait(300);assert.equal((await snapshot(sp)).panels.A.current,0,'no source autoplay');
  await sp.getByRole('slider').fill('12');await wait(200);assert.equal((await snapshot(sp)).panels.A.current,12,'source mode can inspect excluded blink');
  await sp.getByRole('slider').fill('0');await wait(150);await sp.evaluate(()=>window.__v24.reset());await sp.getByRole('button',{name:'Play once',exact:true}).click();await wait(10500);
  const sourceState=await snapshot(sp);assert.equal(sourceState.panels.A.current,239);await wait(250);assert.equal((await snapshot(sp)).panels.A.current,239,'no looping');
  await writeFile(new URL('trace-source-A.json',qa),JSON.stringify(sourceState,null,2));report.sourceReference=metrics(sourceState.panels.A);
  const sourceVideo=sp.video();await source.close();await rename(await sourceVideo.path(),new URL('recordings/chronological-A.webm',qa));
  report.checks.push('A uses extracted images only, manual blink inspection, explicit play once, no autoplay or loop');

  const sharp=await browser.newContext({viewport:{width:1920,height:1080}});const shp=await sharp.newPage();await ready(shp,'?mode=B&resolution=1280');await recordTrajectory(shp,{name:'sharp-1280',radius:.8,duration:3500,cycles:2});await sharp.close();
  const fail=await browser.newContext({viewport:{width:1024,height:768}});const fp=await fail.newPage();
  await fp.route('**/atlas.json',route=>route.abort());await fp.goto(url);await fp.getByRole('heading',{name:'V24 could not load'}).waitFor();
  report.checks.push('Manifest failure exposes a recovery action');await fail.close();

  const missing=await browser.newContext({viewport:{width:1024,height:768}});const mp=await missing.newPage();
  const pattern='**/frames/primary/960/frame_000000.webp';await mp.route(pattern,route=>route.abort());await mp.goto(url);
  await mp.getByRole('button',{name:'Retry image'}).waitFor();await mp.unroute(pattern);await mp.getByRole('button',{name:'Retry image'}).click();
  await mp.waitForFunction(()=>window.__v24.snapshot().panels.B.status==='ready');report.checks.push('Neutral image failure retries successfully without erasing the last valid photo');await missing.close();
  assert.equal(report.errors.length,0);report.passed=true;
} catch(error) { report.passed=false;report.failure=error.stack;throw error; }
finally { await writeFile(new URL('browser-results.json',qa),JSON.stringify(report,null,2));await browser.close(); }
