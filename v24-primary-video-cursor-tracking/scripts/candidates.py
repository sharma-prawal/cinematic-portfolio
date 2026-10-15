from audit import BASE, save, sheet
import json, math, numpy as np, cv2

rows=json.loads((BASE/'data/source-frame-manifest.json').read_text()); primary=[r for r in rows if r['source']=='primary']
targets={'down':primary[164],'lower-left':primary[184],'lower-right':primary[149]}
groups=[]; comparisons=[]
def pixels(r):
    im=cv2.imread(str(BASE/r['image']));return cv2.resize(im,(960,540)).astype(float)
for name,ref in targets.items():
    result=[]; a=pixels(ref)
    for source in sorted({r['source'] for r in rows if r['source']!='primary'}):
        pool=[r for r in rows if r['source']==source and 'yaw' in r and min(r['eye_openness'])>.14 and r['blink']<.50]
        ranked=sorted(pool,key=lambda r:math.hypot(r['yaw']-ref['yaw'],r['pitch']-ref['pitch'])+max(0,abs(r['roll']-ref['roll'])-2)*.4)
        candidates=[]
        for r in ranked[:16]:
            b=pixels(r);metrics=dict(pose_distance_deg=math.hypot(r['yaw']-ref['yaw'],r['pitch']-ref['pitch']),landmark_mean_px=float(np.linalg.norm(np.array(r['landmarks'])-ref['landmarks'],axis=1).mean()),scale_ratio=r['face_scale']/ref['face_scale'],roll_delta=abs(r['roll']-ref['roll']),gaze_distance=float(np.linalg.norm(np.array(r['gaze_proxy'])-ref['gaze_proxy'])),face_mae=float(np.abs(a[85:400,360:590]-b[85:400,360:590]).mean()),collar_mae=float(np.abs(a[405:515,280:690]-b[405:515,280:690]).mean()),shoulder_mae=float(np.abs(a[460:535,210:750]-b[460:535,210:750]).mean()),background_mae=float(np.abs(a[40:400,30:200]-b[40:400,30:200]).mean()))
            score=metrics['pose_distance_deg']+metrics['landmark_mean_px']*.10+metrics['face_mae']*.08+metrics['collar_mae']*.10+metrics['background_mae']*.10
            candidates.append((score,r,metrics))
        if not candidates:continue
        _,r,metrics=min(candidates,key=lambda t:t[0]);result.append(r)
        comparisons.append(dict(target=name,primary_frame=ref['frame'],source=source,filename=r['filename'],frame=r['frame'],metrics=metrics,decision='pending visual review; numerical rank does not approve a repair'))
    for start in range(0,len(result),9):sheet([ref]+result[start:start+9],BASE/f'report/contact-sheets/repair-{name}-{start//9}.jpg',cols=5,label=f'{name}: primary reference first, closest eyes-visible pose candidate per source')
save('data/secondary-compatibility-candidates.json',comparisons)
print('54 matched-source comparisons generated')
