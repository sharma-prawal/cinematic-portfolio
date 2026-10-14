from pathlib import Path
import os,json,math,collections
BASE=Path(__file__).resolve().parents[1]
os.environ['MPLCONFIGDIR']=str(BASE/'data/mpl-cache')
import numpy as np,cv2
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy.spatial import cKDTree
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from PIL import Image,ImageDraw
def dump(name,obj): (BASE/'data'/name).write_text(json.dumps(obj,indent=2))
def sheet(rows,path,title,columns=5):
 board=Image.new('RGB',(columns*300,math.ceil(len(rows)/columns)*260+35),'white');d=ImageDraw.Draw(board);d.text((8,8),title,fill='black')
 for k,r in enumerate(rows):
  with Image.open(BASE/r['image']) as im:
   w,h=im.size;im=im.crop((w*.3,h*.03,w*.7,h*.92));im.thumbnail((300,225));x=k%columns*300;y=k//columns*260+35;board.paste(im,(x,y))
  d.text((x+4,y+226),f"{r['source']} n{r['frame']} yaw {r['yaw']:.1f} pitch {r['pitch']:.1f}",fill='black')
  d.text((x+4,y+240),f"roll {r['roll']:.1f} blink {r['blink']:.2f}",fill='black')
 board.save(path,quality=95)
def run():
 rows=json.loads((BASE/'data/frame-manifest.json').read_text());inv=json.loads((BASE/'data/inventory.json').read_text())
 neutral_sources=['s00','s01','s02','s04','s05','s11','s12','s14','s15','s16','s17','s18']
 refs=[r for r in rows if r['source'] in neutral_sources and r['frame']==0]
 offset=np.median([[r.get('raw_yaw',r['yaw']),r.get('raw_pitch',r['pitch'])] for r in refs],axis=0)
 dump('neutral-calibration.json',dict(offset=offset.tolist(),references=[f"{r['source']}:0" for r in refs],method='One common canonical-model offset from visually neutral starts. Nonneutral starts are not zeroed. No per-video rescaling.',uncertainty='Approximate canonical-model degrees; scale and pitch/yaw coupling uncalibrated'))
 for r in rows:
  r['raw_yaw']=r.get('raw_yaw',r['yaw']);r['raw_pitch']=r.get('raw_pitch',r['pitch']);r['yaw']=r['raw_yaw']-float(offset[0]);r['pitch']=r['raw_pitch']-float(offset[1]);r['neutral_normalized']=True
  r['rejections']=[x for x in r['rejections'] if x!='exaggerated pose candidate']
  if abs(r['yaw'])>30 or abs(r['pitch'])>25:r['rejections'].append('exaggerated normalized pose candidate')
  r['screening_valid']=not r['rejections'];r['visual_review']='Source overview inspected at 12-frame intervals; not every frame certified';r['runtime_approved']=False
 # Local photographic measurements kept separate from angular estimates.
 thumbs=[];previous={}
 for r in rows:
  im=cv2.resize(cv2.imread(str(BASE/r['image'])),(240,135));thumbs.append(im)
  if r['source'] in previous:
   prev=previous[r['source']]
   for name,(x1,y1,x2,y2) in dict(hair=(95,5,151,35),beard=(100,62,149,86),shoulders=(64,100,176,134)).items():
    r[name+'_temporal_mae']=float(np.abs(im[y1:y2,x1:x2].astype(float)-prev[y1:y2,x1:x2]).mean())
  previous[r['source']]=im
 dump('frame-manifest.json',rows)
 valid=[i for i,r in enumerate(rows) if r['screening_valid']];coords=np.array([[rows[i]['yaw'],rows[i]['pitch']] for i in valid]);tree=cKDTree(coords)
 fig,ax=plt.subplots(figsize=(12,9))
 for v in inv:
  rr=[r for r in rows if r['source']==v['id']];ax.scatter([r['yaw'] for r in rr],[r['pitch'] for r in rr],s=9,alpha=.45,label=v['id'])
 ax.axvline(0,color='gray',lw=.5);ax.axhline(0,color='gray',lw=.5);ax.set(xlabel='Approximate yaw; viewer LEFT ← → RIGHT',ylabel='Approximate pitch; DOWN ← → UP',title='All 4,559 source frames: estimated pose coverage (not quality approval)');ax.legend(ncol=4);fig.savefig(BASE/'report/scatterplot.png',dpi=150);plt.close(fig)
 fig,ax=plt.subplots(figsize=(11,8));ax.hist2d(coords[:,0],coords[:,1],bins=[np.arange(-40,41,2),np.arange(-30,31,2)],cmap='magma');ax.set(xlabel='Yaw',ylabel='Pitch',title=f'Screening-only density: {len(valid)} frames; repeated holds inflate density');fig.colorbar(ax.collections[0],ax=ax,label='Frame count');fig.savefig(BASE/'report/density.png',dpi=150);plt.close(fig)
 xs=np.linspace(-20,20,161);ys=np.linspace(-16,16,129);xx,yy=np.meshgrid(xs,ys);grid=np.c_[xx.ravel(),yy.ravel()];distance,_=tree.query(grid)
 fig,ax=plt.subplots(figsize=(11,8));im=ax.imshow(distance.reshape(xx.shape),origin='lower',extent=[-20,20,-16,16],aspect='auto',cmap='viridis',vmin=0,vmax=8);ax.contour(xx,yy,distance.reshape(xx.shape),levels=[2,4],colors=['white','red']);ax.scatter(coords[:,0],coords[:,1],s=2,c='black',alpha=.2);ax.set(xlim=(-20,20),ylim=(-16,16),xlabel='Yaw',ylabel='Pitch',title='Interior holes: nearest screening-valid photograph distance');fig.colorbar(im,ax=ax,label='Approximate angular distance');fig.savefig(BASE/'report/gaps.png',dpi=150);plt.close(fig)
 # Screen graph edges using pose, gaze, roll, expression, raw landmark movement,
 # registered face differences, and raw collar/shoulder/background differences.
 edges=[];rejected=[];tested=set();d,nearest=tree.query(coords,k=9)
 neighbors=[list(ns[1:]) for ns in nearest]
 lookup={(rows[n]['source'],rows[n]['frame']):i for i,n in enumerate(valid)}
 for a,n in enumerate(valid):
  r=rows[n]
  for f in [r['frame']-1,r['frame']+1]:
   b=lookup.get((r['source'],f))
   if b is not None:neighbors[a].append(b)
 # Include the known accepted V15 start bridge; generic temporal neighbors
 # would omit its intentional frame 0 -> 8 jump.
 neighbors[lookup[('s12',0)]].append(lookup[('s12',8)])
 for radius in [.2,.45,.75,1]:
  t=np.linspace(0,2*np.pi,361);_,ns=tree.query(np.c_[20*radius*np.cos(t),16*radius*np.sin(t)])
  for a,b in zip(ns,ns[1:]):
   if a!=b:neighbors[int(a)].append(int(b))
 for a in range(len(valid)):
  for b in neighbors[a]:
   b=int(b);key=tuple(sorted([a,b]))
   if key in tested:continue
   tested.add(key);ra,rb=rows[valid[a]],rows[valid[b]];pd=float(np.linalg.norm(coords[a]-coords[b]))
   if pd>2.5:continue
   pa=np.array(ra['landmarks']);pb=np.array(rb['landmarks']);lm=float(np.sqrt(np.mean(np.sum((pa-pb)**2,axis=1))))
   gaze=float(np.linalg.norm(np.array(ra['gaze_proxy'])-rb['gaze_proxy']))
   ia,ib=thumbs[valid[a]],thumbs[valid[b]];matrix,_=cv2.estimateAffinePartial2D(pa/4,pb/4,method=cv2.LMEDS)
   aligned=cv2.warpAffine(ia,matrix,(240,135)) if matrix is not None else ia
   face=float(np.abs(aligned[25:88,96:153].astype(float)-ib[25:88,96:153]).mean())
   collar=float(np.abs(ia[94:133,78:173].astype(float)-ib[94:133,78:173]).mean())
   hair=float(np.abs(aligned[5:35,95:151].astype(float)-ib[5:35,95:151]).mean());beard=float(np.abs(aligned[62:86,100:149].astype(float)-ib[62:86,100:149]).mean())
   bg=float(np.abs(ia[5:120,5:43].astype(float)-ib[5:120,5:43]).mean());roll=abs(ra['roll']-rb['roll']);smile=abs(ra['smile']-rb['smile']);scale=abs(ra['face_scale']/rb['face_scale']-1)
   reasons=[]
   for fail,name in [(lm>5,'landmark displacement >5px'),(gaze>.065,'gaze proxy mismatch'),(roll>2,'roll change >2deg'),(smile>.15,'smile mismatch'),(scale>.03,'face scale >3%'),(face>8,'registered face MAE >8'),(collar>4,'collar/shoulder MAE >4'),(hair>10,'hair MAE >10'),(beard>12,'beard MAE >12'),(bg>3,'background MAE >3')]:
    if fail:reasons.append(name)
   edge=dict(a=valid[a],b=valid[b],pose_distance=pd,landmark_rms_px=lm,gaze_difference=gaze,roll_difference=roll,smile_difference=smile,face_scale_difference=scale,registered_face_mae=face,hair_mae=hair,beard_mae=beard,collar_shoulders_mae=collar,background_mae=bg,cross_source=ra['source']!=rb['source'],reasons=reasons,approval='automatic screen only; no biometric identity proof')
   (rejected if reasons else edges).append(edge)
 dump('adjacency-graph.json',dict(nodes=valid,edges=edges,rejected_edges=rejected,method='8 nearest pose neighbors plus original adjacent-frame pairs and all circle-selected transitions; <=2.5 approximate degrees; explicit image/landmark/gaze filters; passing is not perceptual certification'))
 ix={n:i for i,n in enumerate(valid)};aa=[ix[e['a']] for e in edges];bb=[ix[e['b']] for e in edges];matrix=coo_matrix((np.ones(len(aa)*2), (aa+bb,bb+aa)),shape=(len(valid),len(valid)))
 ncomp,labels=connected_components(matrix,directed=False);components=[]
 for label in range(ncomp):
  nodes=[valid[i] for i in np.where(labels==label)[0]];rc=[rows[i] for i in nodes];components.append(dict(nodes=nodes,count=len(nodes),sources=sorted(set(r['source'] for r in rc)),yaw=[min(r['yaw'] for r in rc),max(r['yaw'] for r in rc)],pitch=[min(r['pitch'] for r in rc),max(r['pitch'] for r in rc)]))
 components.sort(key=lambda x:-x['count']);dump('components.json',components)
 fig,ax=plt.subplots(figsize=(12,9))
 for e in edges:
  a,b=rows[e['a']],rows[e['b']];ax.plot([a['yaw'],b['yaw']],[a['pitch'],b['pitch']],color='red' if e['cross_source'] else '#aab7cc',alpha=.2,lw=.5)
 ax.scatter(coords[:,0],coords[:,1],c=labels,s=4,cmap='tab20');ax.set(xlabel='Yaw',ylabel='Pitch',title=f'Compatibility screening graph: {ncomp} components; red = provisional cross-source edges');fig.savefig(BASE/'report/compatibility-graph.png',dpi=150);plt.close(fig)
 targets={'CENTER':(0,0),'RIGHT':(16,0),'UPPER-RIGHT':(12,10),'UP':(0,12),'UPPER-LEFT':(-12,10),'LEFT':(-16,0),'LOWER-LEFT':(-12,-10),'DOWN':(0,-12),'LOWER-RIGHT':(12,-10)};coverage={};selection=[]
 (BASE/'report/directions').mkdir(exist_ok=True)
 for name,xy in targets.items():
  ds,ns=tree.query(xy,k=15);candidates=[rows[valid[int(n)]] for n in ns];coverage[name]=dict(target=xy,nearest_distance=float(ds[0]),candidates=[dict(source=r['source'],frame=r['frame'],yaw=r['yaw'],pitch=r['pitch'],roll=r['roll'],blink=r['blink']) for r in candidates],status='Endpoint candidate only; connected path unproven');selection.append(candidates[0]);sheet(candidates,BASE/'report/directions'/f'{name}.jpg',name+' — screening candidates, not runtime approval')
 dump('direction-coverage.json',coverage);dump('selected-endpoint-candidates.json',selection);sheet(selection,BASE/'report/nine-directions.jpg','Nine nearest endpoints do not establish a connected atlas')
 circles=[]
 for radius in [.2,.45,.75,1]:
  for clockwise in [True,False]:
   t=np.linspace(0,2*np.pi,361);t=t if clockwise else -t;targets2=np.c_[20*radius*np.cos(t),16*radius*np.sin(t)];ds,ns=tree.query(targets2);sel=[valid[int(n)] for n in ns];switches=[(a,b) for a,b in zip(sel,sel[1:]) if a!=b];steps=[np.linalg.norm(np.array([rows[a]['yaw'],rows[a]['pitch']])-np.array([rows[b]['yaw'],rows[b]['pitch']])) for a,b in switches];edgekeys={tuple(sorted([e['a'],e['b']])) for e in edges}
   circles.append(dict(radius=radius,clockwise=clockwise,max_error=float(max(ds)),p95_error=float(np.percentile(ds,95)),fraction_over_2deg=float(np.mean(ds>2)),changes=len(switches),cross_source_switches=sum(rows[a]['source']!=rows[b]['source'] for a,b in switches),max_pose_step=float(max(steps,default=0)),unscreened_transitions=sum(tuple(sorted([a,b])) not in edgekeys for a,b in switches),samples=[dict(target=xy.tolist(),source=rows[s]['source'],frame=rows[s]['frame'],error=float(er)) for xy,s,er in zip(targets2,sel,ds)],type='Offline nearest-pose stress test, NOT a browser performance or perceptual result'))
 dump('circle-gap-tests.json',circles)
 anomalies={}
 for v in inv:
  rr=[r for r in rows if r['source']==v['id']];ranges={}
  for name,pred in [('blink',lambda r:r['blink']>.35 or min(r['eye_openness'])<.10),('gaze_change_candidate',lambda r:r.get('gaze_delta',0)>.10),('roll',lambda r:abs(r['roll'])>7)]:
   indices=[r['frame'] for r in rr if pred(r)];runs=[]
   for i in indices:
    if runs and i==runs[-1][1]+1:runs[-1][1]=i
    else:runs.append([i,i])
   ranges[name]=runs
  anomalies[v['id']]=ranges
 dump('anomaly-ranges.json',anomalies)
 dump('summary.json',dict(frames=len(rows),screening_valid=len(valid),screening_rejected=len(rows)-len(valid),graph_edges=len(edges),cross_source_edges=sum(e['cross_source'] for e in edges),components=ncomp,largest_components=[{k:v for k,v in c.items() if k!='nodes'} for c in components[:10]],interior_fraction_over_2deg=float(np.mean(distance>2)),circles=[{k:v for k,v in c.items() if k!='samples'} for c in circles],audit_thumbnail_memory_MiB=sum(x.nbytes for x in thumbs)/1048576))
 print((BASE/'data/summary.json').read_text(),flush=True)
if __name__=='__main__':run()
