import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Renderer,type Method} from './renderer';
import './style.css';
type Sample={t:number,wallT:number,dt:number,tx:number,ty:number,x:number,y:number,method:Method,inputTime:number};
const query=new URLSearchParams(location.search);
const settings={method:(['static','a','b'].includes(query.get('method')||'')?query.get('method'):'a') as Method,tau:Number(query.get('tau')||40),yaw:2,pitch:1.5};
const state={tx:0,ty:0,x:0,y:0,inputTime:0,ready:false,reduced:false,error:'',samples:[] as Sample[],renderer:null as Renderer|null,draws:0};
declare global {interface Window {__v19:typeof state & {settings:typeof settings;reset:()=>void;metrics:()=>unknown}}}
window.__v19=Object.assign(state,{settings,reset:()=>{state.samples=[];state.renderer!.drawMs=[];},metrics:()=>state.renderer?.metrics()});
function App(){
 const canvas=useRef<HTMLCanvasElement>(null),[ready,setReady]=useState(false),[error,setError]=useState(''),[config,setConfig]=useState({...settings}),[readout,setReadout]=useState('');
 const debug=query.has('debug');
 useEffect(()=>{
  let raf=0,active=true,last=performance.now(),dirty=true;const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  state.reduced=reduce.matches;
  const preference=()=>{state.reduced=reduce.matches;state.tx=state.ty=state.x=state.y=0;dirty=true;};
  const pointer=(e:PointerEvent)=>{
   if((e.target as HTMLElement).closest('header,aside'))return;
   if(e.pointerType==='touch'&&e.buttons===0)return;
   state.tx=Math.max(-1,Math.min(1,2*e.clientX/innerWidth-1));state.ty=Math.max(-1,Math.min(1,1-2*e.clientY/innerHeight));state.inputTime=performance.now();
  };
  const neutral=()=>{state.tx=state.ty=0;state.inputTime=performance.now();};
  const resize=()=>{dirty=true;};
  const tick=(now:number)=>{
   if(!active)return;const dt=Math.min(now-last,100);last=now;
   const tx=state.reduced||settings.method==='static'?0:state.tx,ty=state.reduced||settings.method==='static'?0:state.ty;
   const alpha=1-Math.exp(-dt/Math.max(1,settings.tau));
   const oldx=state.x,oldy=state.y;state.x+=(tx-state.x)*alpha;state.y+=(ty-state.y)*alpha;
   if(Math.abs(tx-state.x)<1e-6)state.x=tx;if(Math.abs(ty-state.y)<1e-6)state.y=ty;
   if(state.ready&&(dirty||oldx!==state.x||oldy!==state.y)){
    state.renderer!.draw(settings.method,state.x*settings.yaw,state.y*settings.pitch);state.draws++;dirty=false;
   }
   state.samples.push({t:now,wallT:performance.now(),dt,tx,ty,x:state.x,y:state.y,method:settings.method,inputTime:state.inputTime});if(state.samples.length>30000)state.samples.shift();
   raf=requestAnimationFrame(tick);
  };
  try{
   const renderer=new Renderer(canvas.current!);state.renderer=renderer;
   renderer.load().then(()=>{if(!active)return;state.ready=true;setReady(true);dirty=true;raf=requestAnimationFrame(tick);}).catch(e=>{setError(String(e));state.error=String(e);});
  }catch(e){setError(String(e));state.error=String(e);}
  window.addEventListener('pointermove',pointer,{passive:true});window.addEventListener('pointerdown',pointer,{passive:true});window.addEventListener('pointerup',neutral,{passive:true});
  document.documentElement.addEventListener('pointerleave',neutral);window.addEventListener('blur',neutral);window.addEventListener('resize',resize);reduce.addEventListener('change',preference);
  const interval=debug?setInterval(()=>{setReadout(`Target ${state.tx.toFixed(3)}, ${state.ty.toFixed(3)} · pose ${(state.x*settings.yaw).toFixed(2)}°, ${(state.y*settings.pitch).toFixed(2)}° · ${state.reduced?'reduced motion: static':'continuous control'}`);},200):0;
  return()=>{active=false;cancelAnimationFrame(raf);clearInterval(interval);state.renderer?.destroy();window.removeEventListener('pointermove',pointer);window.removeEventListener('pointerdown',pointer);window.removeEventListener('pointerup',neutral);document.documentElement.removeEventListener('pointerleave',neutral);window.removeEventListener('blur',neutral);window.removeEventListener('resize',resize);reduce.removeEventListener('change',preference);};
 },[debug]);
 const change=(key:keyof typeof settings,value:string|number)=>{Object.assign(settings,{[key]:value});setConfig({...settings});state.x+=1e-8;};
 return <main>
  <header><span>V19 / PHOTOGRAPHIC PRESENCE</span><nav aria-label="Rendering comparison">{(['static','a','b'] as Method[]).map(m=><button key={m} aria-pressed={config.method===m} onClick={()=>change('method',m)}>{m==='static'?'Original':`Method ${m.toUpperCase()}`}</button>)}</nav></header>
  <figure aria-label="Original photographic portrait with optional subtle pointer response"><img src="/original.png" alt="Studio portrait of a bearded man wearing a white shirt" style={{visibility:ready?'hidden':'visible'}}/><canvas ref={canvas} style={{visibility:ready?'visible':'hidden'}} aria-hidden="true"/></figure>
  <footer>{error||'Move the pointer · Touch and drag · Leave to return to neutral'}</footer>
  {debug&&<aside><label>Response <select value={config.tau} onChange={e=>change('tau',Number(e.target.value))}>{[20,40,70].map(t=><option key={t} value={t}>{t} ms</option>)}</select></label><label>Yaw limit <input type="number" min="0" max="4" step=".25" value={config.yaw} onChange={e=>change('yaw',Number(e.target.value))}/></label><label>Pitch limit <input type="number" min="0" max="3" step=".25" value={config.pitch} onChange={e=>change('pitch',Number(e.target.value))}/></label><output>{readout}</output><small>Apparent angles. Inferred geometry is experimental.</small></aside>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
