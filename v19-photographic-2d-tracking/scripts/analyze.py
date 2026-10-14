from pathlib import Path
import json, hashlib, os
import numpy as np
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'report'
def stats(a):
    a=np.asarray(a,dtype=float)
    return None if not len(a) else {'median':float(np.median(a)), 'p95':float(np.percentile(a,95)), 'max':float(a.max()), 'count':len(a)}
summaries=[]
for p in sorted(OUT.glob('trace-*.json')):
    record=json.loads(p.read_text()); samples=record['samples'];name=record['name']
    ts=[s.get('t',s.get('now',0)) for s in samples]
    intervals=np.diff(ts)
    row={'name':name,'readyMs':record['readyMs'],'rafMs':stats(intervals),'rafFPS':1000/intervals.mean() if len(intervals) else None}
    if 'metrics' in record:
        metrics=record['metrics'];row.update({k:v for k,v in metrics.items() if k not in {'drawMs','gpuTimeMs'}})
        row['cpuDrawMs']=stats(metrics['drawMs']);row['gpuDrawMs']=stats(metrics['gpuTimeMs'])
        latencies=[];seen=set()
        for i,s in enumerate(samples):
            key=s['inputTime']
            if key in seen or not key:continue
            seen.add(key)
            if 'wallT' in s and i and (abs(s['x']-samples[i-1]['x'])+abs(s['y']-samples[i-1]['y'])>1e-7):latencies.append(s['wallT']-key)
        row['firstStateResponseMs']=stats(latencies)
        row['responseNote']='Original trace uses rAF scheduling timestamps, which can precede the pointer event. Response is measured separately with callback wall-clock timestamps in response.json.'
        holds=[]
        for step in record['dispatched']:
            if 'hold' not in step['phase']:continue
            subset=[s for s in samples if step['t']<=s['t']<=step['t']+step['wait']]
            if not subset:continue
            initial=np.hypot(subset[0]['x']-step['x'],subset[0]['y']-step['y'])
            threshold=initial*.1
            settled=next((s['t']-step['t'] for s in subset if np.hypot(s['x']-step['x'],s['y']-step['y'])<=threshold),None)
            tail=subset[-8:]
            holds.append({'phase':step['phase'],'t90Ms':settled,'tailRangeX':max(s['x'] for s in tail)-min(s['x'] for s in tail),'tailRangeY':max(s['y'] for s in tail)-min(s['y'] for s in tail)})
        row['holds']=holds
    else:row['decodedImages']=len(record.get('decodes',[]));row['horizontalOnly']=True
    summaries.append(row)
(OUT/'performance-summary.json').write_text(json.dumps(summaries,indent=2))
visual=[]
for method in ['a','b']:
    files=[OUT/f'{method}-{d}.png' for d in ['center','left','right','up','down','upper-left','upper-right','lower-left','lower-right']]
    if not all(p.exists() for p in files):continue
    board=Image.new('RGB',(1200,780),(225,225,225));draw=ImageDraw.Draw(board)
    baseline=np.array(Image.open(OUT/'static-center.png').convert('RGB'))
    h,w=baseline.shape[:2]
    for i,p in enumerate(files):
        im=Image.open(p).convert('RGB');a=np.array(im);diff=np.abs(a.astype(float)-baseline.astype(float))
        # Conservative external-background and lower-torso regions, away from
        # the changed silhouette and neck transition.
        background=np.concatenate([diff[:int(h*.5),:int(w*.32)].reshape(-1,3),diff[:int(h*.5),int(w*.67):].reshape(-1,3)])
        torso=diff[int(h*.75):]
        transition=diff[int(h*.59):int(h*.71)]
        visual.append({'method':method,'direction':p.stem.split('-',1)[1],'backgroundMaxDifference':float(background.max()),'torsoMaxDifference':float(torso.max()),'torsoRegion':'Below 75% source image height, excluding neck/collar composite','neckCollarTransitionMaxDifference':float(transition.max()),'wholeImageMAE':float(diff.mean())})
        im.thumbnail((390,220));x=i%3*400;y=i//3*260;board.paste(im,(x,y+25));draw.text((x+12,y+7),p.stem,fill='black')
    board.save(OUT/f'{method}-nine-directions.jpg',quality=96)
(OUT/'pixel-stability.json').write_text(json.dumps(visual,indent=2))
before=json.loads((OUT/'preservation-before.json').read_text());changed=[];missing=[]
for name,sha in before.items():
    p=ROOT.parent/name
    if not p.exists():missing.append(name)
    elif hashlib.sha256(p.read_bytes()).hexdigest()!=sha:changed.append(name)
source=json.loads((OUT/'source.json').read_text())
source_preserved=hashlib.sha256(Path(source['source']).read_bytes()).hexdigest()==source['sha256']
result={'checkedFiles':len(before),'changed':changed,'missing':missing,'suppliedPhotographUnchanged':source_preserved,'pass':not changed and not missing and source_preserved}
(OUT/'preservation-result.json').write_text(json.dumps(result,indent=2))
print(json.dumps({'performance':summaries,'preservation':result},indent=2))
