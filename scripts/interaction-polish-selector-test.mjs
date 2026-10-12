import {readFile,writeFile} from 'node:fs/promises';
import {transpileModule,ModuleKind,ScriptTarget} from 'typescript';
import assert from 'node:assert/strict';

async function load(folder,query){
 const manifest=JSON.parse(await readFile(folder+'/src/poses.json','utf8'));
 let source=await readFile(folder+'/src/tracking.ts','utf8');
 source=source.replace("import manifest from './poses.json';",`const manifest = ${JSON.stringify(manifest)}; const location={search:${JSON.stringify(query)}};`);
 const js=transpileModule(source,{compilerOptions:{module:ModuleKind.ESNext,target:ScriptTarget.ES2022}}).outputText;
 return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
}
const baseline=await load('experiments/v11-right','');
const configurations={boundary:await load('experiments/interaction-polish','?tuning=boundary'),responsive:await load('experiments/interaction-polish','?tuning=responsive')};
const walk=(m,from,to)=>{let previous=m.selectPose(from,m.neutral);const result=[];for(let i=0;i<=100;i++){const p={x:from.x+(to.x-from.x)*i/100,y:from.y+(to.y-from.y)*i/100};previous=m.selectPose(p,previous);if(result.at(-1)!==previous.frame)result.push(previous.frame);}return result;};
const results={};
for(const [name,m] of Object.entries(configurations)){
 assert.deepEqual(m.frames.map(p=>p.frame),baseline.frames.map(p=>p.frame),'exactly the same 43 cached source frames');
 for(const point of [{x:0,y:0},{x:0,y:.99},{x:.84,y:.84},{x:.84,y:0},{x:-.84,y:0},{x:0,y:-.84},{x:-.84,y:-.84},{x:.84,y:-.84},{x:-.84,y:.84}])assert.equal(m.selectPose(point,m.neutral).frame,baseline.selectPose(point,baseline.neutral).frame,'same reference endpoints');
 for(const [from,to] of [[{x:.56,y:.46},{x:.72,y:.46}],[{x:.5,y:.56},{x:.5,y:.72}]]){
  const seq=walk(m,from,to);assert.ok(seq.every(n=>n>=12000),'route must not fall into the unrelated older lower-right source');
 }
 const equator=walk(m,{x:.84,y:-.02},{x:.84,y:.02});assert.deepEqual(equator,[16120],'same verified RIGHT across horizontal boundary');
 const down=walk(m,{x:0,y:0},{x:0,y:1});assert.deepEqual(down,[3,8000,8022,8023,8025,8027,8029,8030,8031,8032],'all audited progressive DOWN intermediates reached in a slow sweep');
 const bridge=walk(m,{x:0,y:.99},{x:.99,y:.99});assert.deepEqual(bridge,[8032,12000,12022,12028,12034,12040,12046,12054,12060]);
 const right=walk(m,{x:.84,y:.84},{x:.84,y:0});assert.deepEqual(right,[12060,16000,16030,16034,16040,16072,16120]);
 assert.deepEqual(walk(m,{x:.84,y:0},{x:.84,y:.84}),[...right].reverse(),'route genuinely reverses without a queued animation');
 assert.deepEqual(m.ease({x:0,y:0},{x:1,y:1},16,false),{x:1,y:1},'reduced motion immediate');
 results[name]={equator,down,bridge,right,baselineX65:walk(baseline,{x:.56,y:.46},{x:.72,y:.46}),tunedX65:walk(m,{x:.56,y:.46},{x:.72,y:.46}),baselineY65:walk(baseline,{x:.5,y:.56},{x:.5,y:.72}),tunedY65:walk(m,{x:.5,y:.56},{x:.5,y:.72})};
}
await writeFile('qa/interaction-polish/selector-tests.json',JSON.stringify(results,null,2));console.log('Same assets/endpoints; full progressive routes; corrected boundary continuity; reduced motion: passed.');
