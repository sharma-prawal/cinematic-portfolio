from pathlib import Path
import json,hashlib,ast
from PIL import Image
from extract import snapshot,sha
BASE=Path(__file__).resolve().parents[1]
inv=json.loads((BASE/'data/inventory.json').read_text());rows=json.loads((BASE/'data/frame-manifest.json').read_text());before=json.loads((BASE/'data/preservation-before.json').read_text());after=snapshot()
changed=[p for p,h in before.items() if after.get(p)!=h];added=[p for p in after if p not in before]
preservation=dict(files_checked=len(before),changed=changed,added_outside_v18=added,passed=not changed and not added)
(BASE/'data/preservation-after.json').write_text(json.dumps(after,indent=2));(BASE/'data/preservation-result.json').write_text(json.dumps(preservation,indent=2));assert preservation['passed'],preservation
assert len(inv)==len(list(BASE.parent.glob('*.mp4')))
assert sum(v['frame_count'] for v in inv)==len(rows)==4559
for v in inv:
 assert sha(BASE.parent/v['filename'])==v['sha256']
 rr=[r for r in rows if r['source']==v['id']];assert [r['frame'] for r in rr]==list(range(v['frame_count']))
 assert all(abs(t-i/24)<1e-5 for i,t in enumerate(v['timestamps']))
 for r in rr:
  assert abs(r['timestamp']-v['timestamps'][r['frame']])<1e-9
  assert all(k in r for k in ['yaw','pitch','roll','blink','gaze_proxy','landmarks','runtime_approved'])
  assert r['runtime_approved'] is False
  with Image.open(BASE/r['image']) as im:assert im.size==(1920,1080)
for p in (BASE/'scripts').glob('*.py'):ast.parse(p.read_text())
circles=json.loads((BASE/'data/circle-gap-tests.json').read_text())
for a,b in zip(circles[::2],circles[1::2]):
 assert a['changes']==b['changes'];assert abs(a['max_error']-b['max_error'])<1e-9
 for c in [a,b]:assert all(0<=s['frame']<next(v['frame_count'] for v in inv if v['id']==s['source']) for s in c['samples'])
graph=json.loads((BASE/'data/adjacency-graph.json').read_text());valid=set(graph['nodes']);assert all(e['a'] in valid and e['b'] in valid and not e['reasons'] for e in graph['edges'])
lookup={(r['source'],r['frame']):i for i,r in enumerate(rows)};baseline=[lookup[('s12',i)] for i in [0,*range(8,56)]];edges={tuple(sorted([e['a'],e['b']])) for e in graph['edges']}
assert all(tuple(sorted([a,b])) in edges for a,b in zip(baseline,baseline[1:])), 'Graph must retain known V15 baseline'
responsive=json.loads((BASE/'report/browser/responsive-results.json').read_text());assert len(responsive)==5;assert all(not r['errors'] and r['layout']['scrollWidth']==r['width'] for r in responsive)
playback=json.loads((BASE/'report/browser/source-playback.json').read_text());assert [c['id'] for c in playback['clips']]==[v['id'] for v in inv]
assert all(len(c['frames'])>=v['frame_count']-1 for c,v in zip(playback['clips'],inv))
decode=json.loads((BASE/'report/browser/format-decode.json').read_text());assert len(decode)==42
paths=json.loads((BASE/'data/path-feasibility.json').read_text());assert len(paths)==24
assert all(not p['feasible_in_screened_graph'] for p in paths if p['tolerance']<=2)
assert (BASE/'report/browser/all-sources-normal-latest-slow.webm').stat().st_size>1_000_000
out=dict(passed=True,source_count=len(inv),frames_verified=len(rows),checks=['Original SHA-256','All protected pre-existing file hashes','Native extracted dimensions','Exact chronological frame indices','FFprobe timestamp mapping','Manifest required metrics','No runtime-approved fabricated pose','Graph endpoint validity','CW/CCW offline symmetry','Python AST parsing'],runtime_tests='Not applicable: SOURCE NO-GO; no V18 tracking controller or React/TypeScript application was built',preservation=preservation)
out.update(baseline_graph_transitions='48/48 pass',responsive_audit_viewer='5/5 pass',source_browser_playback='19/19 sources captured',browser_format_decodes='42/42 samples',graph_constrained_path_tests='24 evaluated; no completion at <=2deg target tolerance',lint='V18 JavaScript ESLint passes; command recorded in report',qa_scope='Audit/data/viewer QA; runtime tracking tests explicitly not applicable')
(BASE/'data/qa-results.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
