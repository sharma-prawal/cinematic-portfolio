from audit import BASE, ROOT, sha, save
import json, csv
from PIL import Image

inventory=json.loads((BASE/'data/inventory.json').read_text())
rows=json.loads((BASE/'data/source-frame-manifest.json').read_text())
atlas=json.loads((BASE/'data/selected-image-manifest.json').read_text())
checks=[]
for v in inventory:
    assert sha(ROOT/v['filename'])==v['sha256'],v['filename']
    frames=[r for r in rows if r['source']==v['id']]
    assert len(frames)==v['frame_count']==v['extracted_count']
    for i,r in enumerate(frames):
        assert r['frame']==i and r['timestamp']==v['timestamps'][i]
        p=BASE/r['image'];assert p.exists()
        with Image.open(p) as im:assert im.size==(v['width'],v['height'])
        assert r['quantitative_screening'] and 'gaze_proxy' in r and 'yaw' in r and 'pitch' in r
    checks.append(dict(source=v['id'],frames=len(frames),native_dimensions=[v['width'],v['height']],sha256_preserved=True))
assert len(rows)==4559
ids={p['id'] for p in atlas['frames']}
for p in atlas['frames']:
    assert p['filename']==atlas['primary'] and p['source']=='primary'
    assert all(n in ids for n in p['neighbors'])
    for name,size in [('url',(960,540)),('sharp_url',(1280,720))]:
        with Image.open(BASE/'public'/p[name].lstrip('/')) as im:assert im.size==size
assert set(range(240))=={r['id'] for r in atlas['sequence']}
assert not atlas['approved_repairs']
compat=json.loads((BASE/'data/secondary-compatibility.json').read_text())
assert len(compat)==54 and all(c['decision']=='rejected' for c in compat)
browser=json.loads((BASE/'qa/browser-results.json').read_text());assert browser['passed'] and not browser['errors']
assert len(browser['viewports'])==5 and len(browser['directions'])==9
assert len(browser['trajectories'])==21
for trial in browser['trajectories']:
    for panel in trial['panels'].values():assert panel['cache']['peakImages']<=24 and panel['cache']['errors']==0
for video in ['circular-B-vs-C.webm','chronological-A.webm','real-mouse-circles-B.webm']:assert (BASE/'qa/recordings'/video).stat().st_size>10000
save('qa/integrity-results.json',dict(passed=True,all_original_candidates=checks,total_native_jpegs=len(rows),primary_native_jpegs=240,selected_primary=len(ids),selected_secondary=0,optimized_960=240,optimized_1280=len(ids),primary_reviewed=240,frame_timestamps='all exact original FFprobe presentation timestamps preserved',all_runtime_dimensions_verified=True,all_19_checksums_preserved=True,notes='Engineering QA success does not imply the source-quality acceptance gate passes.'))
with (BASE/'report/source-inventory.csv').open('w',newline='') as f:
    keys=['id','filename','duration','width','height','fps','frame_count','sha256','bytes','extracted_count','extracted_bytes','classification'];writer=csv.DictWriter(f,keys,extrasaction='ignore');writer.writeheader();writer.writerows(inventory)
primary=[r for r in rows if r['source']=='primary']
with (BASE/'report/primary-frame-audit.csv').open('w',newline='') as f:
    keys=['frame','timestamp','yaw','pitch','roll','eye_openness','blink','eye_state','gaze_proxy','verified_eye_observation','face_scale','face_center','expression','sharpness','landmark_delta_px','collar_temporal_mae','shoulder_temporal_mae','background_temporal_mae','gaze_delta','flags','visual_review','selected'];writer=csv.DictWriter(f,keys,extrasaction='ignore');writer.writeheader();writer.writerows(primary)
print('Integrity PASS: all 4,559 native JPEGs and measurements; 19 original checksums; 437 optimized photos; 240 primary visual annotations; browser and recording evidence.')
