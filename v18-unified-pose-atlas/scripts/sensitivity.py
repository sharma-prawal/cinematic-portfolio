from pathlib import Path
import json,numpy as np
from scipy.spatial import cKDTree
BASE=Path(__file__).resolve().parents[1]
rows=json.loads((BASE/'data/frame-manifest.json').read_text());out=[]
xx,yy=np.meshgrid(np.linspace(-20,20,161),np.linspace(-16,16,129));grid=np.c_[xx.ravel(),yy.ravel()]
for roll,blink in [(3,.2),(7,.35),(12,.5),(180,1.1)]:
 rr=[r for r in rows if abs(r['roll'])<=roll and r['blink']<=blink and (min(r['eye_openness'])>=.10 or blink>1)]
 tree=cKDTree([[r['yaw'],r['pitch']] for r in rr]);ds,_=tree.query(grid);circles=[]
 for radius in [.2,.45,.75,1]:
  t=np.linspace(0,2*np.pi,361);target=np.c_[20*radius*np.cos(t),16*radius*np.sin(t)];d,ix=tree.query(target);coords=np.array([[rr[int(i)]['yaw'],rr[int(i)]['pitch']] for i in ix]);steps=np.linalg.norm(np.diff(coords,axis=0),axis=1)
  circles.append(dict(radius=radius,max_error=float(max(d)),fraction_over_2deg=float(np.mean(d>2)),max_pose_step=float(max(steps))))
 out.append(dict(roll_limit=roll,blink_limit=blink,frame_count=len(rr),fraction_grid_over_2deg=float(np.mean(ds>2)),circles=circles,scope='Geometry sensitivity only: relaxed settings deliberately include bad photographs; not runtime approval'))
(BASE/'data/threshold-sensitivity.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
