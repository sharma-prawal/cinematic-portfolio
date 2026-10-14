from pathlib import Path
import json,numpy as np
from scipy.spatial import cKDTree
BASE=Path(__file__).resolve().parents[1]
rows=json.loads((BASE/'data/frame-manifest.json').read_text());graph=json.loads((BASE/'data/adjacency-graph.json').read_text());nodes=graph['nodes'];coords=np.array([[rows[i]['yaw'],rows[i]['pitch']] for i in nodes]);tree=cKDTree(coords);lookup={n:i for i,n in enumerate(nodes)}
neighbors={i:{i} for i in range(len(nodes))}
for e in graph['edges']:
 a,b=lookup[e['a']],lookup[e['b']];neighbors[a].add(b);neighbors[b].add(a)
results=[]
for tolerance in [1.5,2,3]:
 for radius in [.2,.45,.75,1]:
  for cw in [True,False]:
   theta=np.linspace(0,2*np.pi,361)*(1 if cw else -1);circle=np.c_[20*radius*np.cos(theta),16*radius*np.sin(theta)];targets=np.concatenate([np.c_[np.linspace(0,20*radius,81),np.zeros(81)],circle,np.c_[np.linspace(20*radius,0,81),np.zeros(81)]])
   states=set(tree.query_ball_point([0,0],.75));sizes=[];failure=None
   for step,target in enumerate(targets):
    candidates=set(tree.query_ball_point(target,tolerance));reachable=set()
    for a in states:reachable.update(neighbors[a]&candidates)
    states=reachable;sizes.append(len(states))
    if not states:failure=dict(step=step,target=target.tolist());break
   results.append(dict(tolerance=tolerance,radius=radius,clockwise=cw,feasible_in_screened_graph=failure is None,failure=failure,reachable_counts=sizes,method='Set-valued adjacency-constrained reachability; center -> circle -> center; no forced detours; sparse screening graph, not photographic acceptance proof'))
(BASE/'data/path-feasibility.json').write_text(json.dumps(results,indent=2));print([{k:v for k,v in r.items() if k not in ['reachable_counts','method']} for r in results])
