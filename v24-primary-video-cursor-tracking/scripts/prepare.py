"""Build reviewed primary atlas, continuity graph, coverage and compression evidence."""
from audit import BASE, ROOT, PRIMARY, save, sheet, sha
import json, math, cv2, numpy as np, subprocess, shutil
from PIL import Image, ImageDraw

rows=json.loads((BASE/'data/source-frame-manifest.json').read_text())
primary=[r for r in rows if r['source']=='primary']; inventory=json.loads((BASE/'data/inventory.json').read_text())
neutral=primary[0]; y0=neutral['yaw'];p0=neutral['pitch']
# Reviewed on all eight chronological sheets, then enlarged eye comparisons.
excluded=set(range(1,16)) | set(range(198,206)) | set(range(220,240))
# 1-10 are redundant neutral holds; 11-15 and 198-205 are blink/partial-reopening paths.
selected=[r for r in primary if r['frame'] not in excluded]
for r in primary:
    f=r['frame'];r['visual_review']='reviewed on full chronological contact sheets; pose direction signs verified from nose, cheeks and eyes'
    r['head_orientation']={'yaw_from_neutral':r['yaw']-y0,'pitch_from_neutral':r['pitch']-p0,'roll':r['roll']}
    if f in [12,199,200,201]:r['verified_eye_observation']='full blink; iris not usefully visible'
    elif 11<=f<=15 or 198<=f<=205:r['verified_eye_observation']='blink approach or partial reopening; omit from cursor atlas'
    elif 136<=f<=197:r['verified_eye_observation']='downward-directed iris visible; upper-lid narrowing, not a full blink; pitch partly occludes iris'
    elif 115<=f<=135:r['verified_eye_observation']='oblique right gaze with far-eye narrowing; not a full blink'
    else:r['verified_eye_observation']='iris visible; inspect gaze independently from head angle'
    r['appearance_review']={'expression':'stable gentle closed-mouth expression; gaze differs along upper sweep','face_alignment':'native image composition retained; landmark displacement is measured, no alignment warp','collar_shoulders':'mostly stable within primary; real small shoulder/collar changes remain','quality':'high-quality source JPEG; no facial synthesis', 'roll':'visible source roll retained; never used to implement yaw'}
    r['selected']=f not in excluded
save('data/primary/frame-manifest.json',primary)
for r in rows:
    if r['source']=='primary':r.update(primary[r['frame']])
save('data/source-frame-manifest.json',rows)
directions={'CENTER':(0,0),'LEFT':(-1,0),'RIGHT':(1,0),'UP':(0,-1),'DOWN':(0,1),'UPPER-LEFT':(-.78,-.78),'UPPER-RIGHT':(.78,-.78),'LOWER-LEFT':(-.78,.78),'LOWER-RIGHT':(.78,.78)}
def target(x,y):return y0+x*(30 if x>=0 else 28),p0-y*(18 if y<0 else 5)
def distance(r,yaw,pitch):return math.hypot((r['yaw']-yaw)/30,(r['pitch']-pitch)/18)
anchors={}
for name,(x,y) in directions.items():
    ya,pi=target(x,y)
    pool=[r for r in selected if (x>=0 or r['yaw']<y0) and (x<=0 or r['yaw']>y0)]
    best=neutral if name=='CENTER' else min(pool,key=lambda r:distance(r,ya,pi)+max(0,r['blink']-.30)*.03)
    anchors[name]=dict(frame=best['frame'],source='primary',filename=PRIMARY,input=[x,y],requested_yaw=ya,requested_pitch=pi,actual_yaw=best['yaw'],actual_pitch=best['pitch'],error=distance(best,ya,pi))
    ya,pi=target(x,y);pool=sorted(selected,key=lambda r:distance(r,ya,pi))[:18]
    sheet(pool,BASE/f'report/contact-sheets/directions/{name}.jpg',cols=6,label=f'{name}: nearest PRIMARY photographs; yaw/pitch estimates, not invented poses')
sheet([primary[a['frame']] for a in anchors.values()],BASE/'report/nine-direction-photographs.jpg',cols=3,label='V24 nine requested directions; primary only; intermediate path gaps are documented separately')

# Decode original native frames for lossless shortlist and runtime formats.
shortlist=sorted(set(a['frame'] for a in anchors.values())|{12,55,60,115,149,163,164,184,199,200,201,206})
pngdir=BASE/'data/primary/lossless-png';pngdir.mkdir(exist_ok=True)
runtime=BASE/'public/frames/primary';runtime.mkdir(parents=True,exist_ok=True)
cap=cv2.VideoCapture(str(ROOT/PRIMARY));formats=[]; selected_ids={r['frame'] for r in selected}
for i,r in enumerate(primary):
    ok,bgr=cap.read(); assert ok
    rgb=cv2.cvtColor(bgr,cv2.COLOR_BGR2RGB); im=Image.fromarray(rgb)
    if i in shortlist: im.save(pngdir/f'frame_{i:06}.png')
    for width,height in [(960,540),(1280,720)]:
        if width==1280 and i not in selected_ids:continue
        folder=runtime/str(width);folder.mkdir(exist_ok=True)
        resized=im.resize((width,height),Image.Resampling.LANCZOS)
        resized.save(folder/f'frame_{i:06}.webp',quality=92,method=5,exif=Image.Exif())
        if i in shortlist:
            d=BASE/f'data/format-comparison/{width}';d.mkdir(parents=True,exist_ok=True)
            ref=np.array(resized).astype(float)
            for fmt,params in [('jpg',dict(quality=94,subsampling=0)),('webp',dict(quality=92,method=5)),('png',{})]:
                p=d/f'frame_{i:06}.{fmt}';resized.save(p,**params)
                decoded=np.array(Image.open(p)).astype(float); mse=float(np.mean((decoded-ref)**2))
                a=ref[85*height//540:400*height//540,360*width//960:590*width//960];b=decoded[85*height//540:400*height//540,360*width//960:590*width//960];fmse=float(np.mean((a-b)**2))
                formats.append(dict(frame=i,width=width,height=height,format=fmt,bytes=p.stat().st_size,psnr_db=10*math.log10(255**2/mse) if mse else None,face_psnr_db=10*math.log10(255**2/fmse) if fmse else None,reference='lossless original decoded RGB, Lanczos downsample; source already video-compressed'))
cap.release()
save('data/format-comparison.json',formats)
# Direct JPEG extraction vs original decoded PNG: no invented lossless claim.
quality=[]
for i in shortlist:
    a=np.array(Image.open(pngdir/f'frame_{i:06}.png')).astype(float);b=np.array(Image.open(BASE/primary[i]['image'])).astype(float);m=float(np.mean((a-b)**2))
    quality.append(dict(frame=i,psnr_db=10*math.log10(255**2/m),jpeg_bytes=(BASE/primary[i]['image']).stat().st_size,png_bytes=(pngdir/f'frame_{i:06}.png').stat().st_size))
save('data/extraction-quality.json',quality)

# Pairwise photographic compatibility; no shortest path routing is used at runtime.
thumbs={}
for r in selected:
    im=cv2.resize(cv2.imread(str(BASE/r['image'])),(960,540)).astype(float)
    thumbs[r['frame']]={n:cv2.resize(im[a:b,c:d],(32,32)) for n,(a,b,c,d) in dict(face=(90,400,360,590),collar=(405,515,280,690),shoulder=(460,535,210,750),background=(40,400,30,200)).items()}
edges=[];neighbors={str(r['frame']):[] for r in selected}
for j,a in enumerate(selected):
    for b in selected[j+1:]:
        angle=math.hypot(a['yaw']-b['yaw'],a['pitch']-b['pitch'])
        if angle>4.5:continue
        ma=thumbs[a['frame']];mb=thumbs[b['frame']]
        m=dict(angular_deg=angle,landmark_px=float(np.linalg.norm(np.array(a['landmarks'])-b['landmarks'],axis=1).mean()),gaze_horizontal=float(np.linalg.norm(np.array(a['gaze_proxy'])[::2]-np.array(b['gaze_proxy'])[::2])),gaze_vertical=float(np.linalg.norm(np.array(a['gaze_proxy'])[1::2]-np.array(b['gaze_proxy'])[1::2])),roll_deg=abs(a['roll']-b['roll']),scale_fraction=abs(a['face_scale']/b['face_scale']-1),expression_delta=abs(a['expression']['smile']-b['expression']['smile']),source_switch_penalty=0,**{f'{n}_mae':float(np.abs(ma[n]-mb[n]).mean()) for n in ma})
        consecutive=abs(a['frame']-b['frame'])<=2
        compatible=m['landmark_px']<9 and m['gaze_horizontal']<.16 and m['gaze_vertical']<.22 and m['roll_deg']<3 and m['scale_fraction']<.04 and m['collar_mae']<8 and m['face_mae']<16 and m['background_mae']<5 and m['expression_delta']<.10
        if compatible:
            cost=angle+m['landmark_px']*.12+m['gaze_horizontal']*5+m['roll_deg']*.25+m['face_mae']*.04+m['collar_mae']*.08+(0 if consecutive else 2)
            edges.append(dict(a=a['frame'],b=b['frame'],cost=cost,near_chronological=consecutive,metrics=m));neighbors[str(a['frame'])].append(b['frame']);neighbors[str(b['frame'])].append(a['frame'])
unvisited=set(selected_ids);components=[]
while unvisited:
    stack=[min(unvisited)];c=[]
    while stack:
        n=stack.pop()
        if n not in unvisited:continue
        unvisited.remove(n);c.append(n);stack.extend(neighbors[str(n)])
    components.append(sorted(c))
save('data/continuity-graph.json',dict(nodes=[dict(source=r['source'],filename=r['filename'],frame=r['frame'],yaw=r['yaw'],pitch=r['pitch'],roll=r['roll'],gaze=r['gaze_proxy'],expression=r['expression'],quality=r['sharpness'],eye_state=r['verified_eye_observation'],neighbors=neighbors[str(r['frame'])]) for r in selected],edges=edges,components=components,cross_video_penalty=30,method='Consecutive/nearly consecutive primary edges favored; cross-video penalty explicit; no secondary nodes approved; no shortest-path playback. Quantitative gates screen plausibility, not proof of photographic smoothness.'))

candidates=json.loads((BASE/'data/secondary-compatibility-candidates.json').read_text())
reasons={
 's01':'Eyes point toward camera; expression/lid shape changes; does not improve downward-gaze continuity.',
 's02':'Useful downward/left pose but head/collar and roll change across the source boundary; no complete transition improvement demonstrated.',
 's03':'Right-facing starting region has no frontal or left downward counterpart; smile/eyes differ.',
 's04':'Similar shallow DOWN pose, but roll and lid/expression differ; eyes still naturally lowered; no clear improvement over primary f163.',
 's05':'Face/collar/scale differ; no matching frontal downward pose in this source.',
 's06':'Camera-facing gaze changes character of primary downward sweep; face and collar mismatch.',
 's07':'Only right-side angles; wrong yaw for frontal/left repair, different beard/collar and eyes.',
 's08':'Right-side-only angles and smile/eye changes; no coherent matching downward transition.',
 's09':'Right-side starting pose and face/collar differences; does not repair complete lower arc.',
 's10':'Frontal downward option still looks down; deeper chin/roll and collar discontinuity, no improvement over nearby primary.',
 's11':'Eyes look toward camera with changed smile/eyebrows; repair would introduce independent gaze jump.',
 's12':'Eyes look toward camera with altered smile; not a matching downward-gaze transition.',
 's13':'Gaze/pose candidates exist but collar/head roll and lighting differ; boundary has no visual continuity advantage.',
 's14':'Large lateral roll is conspicuous; it cannot stand in for yaw/pitch.',
 's15':'Large lateral roll/tilted eyes plus expression change; a more open iris does not justify it.',
 's16':'Large roll or expression change, and weak left yaw coverage; no compatible lower arc.',
 's17':'Predominantly frontal/right and camera-looking eyes; expression changes, no left repair.',
 's18':'Frontal/right source with camera-directed gaze; the primary has the more consistent transition.'}
for c in candidates:c.update(decision='rejected',visual_reason=reasons[c['source']],review='Matched source photographs visually reviewed in the six repair contact sheets; metric screening covers every frame from every source.')
save('data/secondary-compatibility.json',candidates)
save('data/down-repair-decisions.json',dict(approved_secondary=[],primary_preferences=[dict(request='DOWN',preferred=163,over=164,reason='Nearby same-primary pose retains visible downward irises; mild eyelid narrowing is not a full blink.'),dict(request='blink-covered left return',omitted=list(range(198,206)),reason='No natural same-orientation open-eye bridge through this return; retain earlier left poses and document the jump rather than paste eyes.')],rejected_secondary_sources=len(reasons),mode_c='Same approved primary atlas as B; zero secondary repairs passed the complete-transition visual gate.'))

manifest=dict(version=24,primary=PRIMARY,neutral=0,calibration=dict(yaw0=y0,pitch0=p0,yaw_left=28,yaw_right=30,pitch_up=18,pitch_down=5,note='Viewer-relative +X right, +Y down. Downward excursion is intentionally shallow, only five estimated degrees from neutral; no claim of symmetric physical range.'),frames=[dict(id=r['frame'],source=r['source'],filename=r['filename'],frame=r['frame'],timestamp=r['timestamp'],yaw=r['yaw'],pitch=r['pitch'],roll=r['roll'],eye_openness=r['eye_openness'],gaze=r['gaze_proxy'],eye_state=r['verified_eye_observation'],blink=r['blink'],expression=r['expression'],face_scale=r['face_scale'],landmarks=r['landmarks'],quality=r['sharpness'],neighbors=neighbors[str(r['frame'])],url=f"/frames/primary/960/frame_{r['frame']:06}.webp",sharp_url=f"/frames/primary/1280/frame_{r['frame']:06}.webp") for r in selected],sequence=[dict(id=r['frame'],url=f"/frames/primary/960/frame_{r['frame']:06}.webp",timestamp=r['timestamp']) for r in primary],anchors=anchors,approved_repairs=[],usage=dict(primary=len(selected),secondary=0),cache=dict(max_images=24,max_parallel_decodes=2,default_resolution=[960,540],sharp_resolution=[1280,720]),selection=dict(max_pose_error=.23,hysteresis=.012,continuity_weight=.025,large_jump_deg=5),components=[len(c) for c in components])
save('public/atlas.json',manifest);save('data/selected-image-manifest.json',manifest)

# Coverage diagram and a measured regular grid expose the empty interior.
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
fig,ax=plt.subplots(figsize=(11,6));ax.plot([r['yaw']-y0 for r in primary],[r['pitch']-p0 for r in primary],color='#adb7b3',lw=1,label='all chronological frames')
sc=ax.scatter([r['yaw']-y0 for r in selected],[r['pitch']-p0 for r in selected],c=[r['frame'] for r in selected],cmap='viridis',s=15,label='selected primary photographs')
for name,a in anchors.items(): ax.annotate(f"{name} f{a['frame']}",(a['actual_yaw']-y0,a['actual_pitch']-p0),fontsize=7,xytext=(5,5),textcoords='offset points')
ax.set(xlabel='Estimated yaw from neutral (degrees; right positive)',ylabel='Estimated pitch from neutral (degrees; up positive)',title='V24 measured primary pose trajectory — empty interior is not synthesized');ax.grid(alpha=.2);fig.colorbar(sc,ax=ax,label='Original primary frame index');fig.tight_layout();fig.savefig(BASE/'report/pose-coverage.png',dpi=150);plt.close(fig)
grid=[]
for y in np.linspace(-1,1,41):
    for x in np.linspace(-1,1,41):
        ya,pi=target(float(x),float(y));best=min(selected,key=lambda r:distance(r,ya,pi));error=distance(best,ya,pi)
        grid.append(dict(x=float(x),y=float(y),nearest_frame=best['frame'],error=error,supported=error<=.23))
save('data/pose-coverage.json',dict(grid=grid,supported_fraction=sum(r['supported'] for r in grid)/len(grid),threshold='.23 in yaw/30 and pitch/18 normalized distance; this proximity gate does not establish traversable transitions',missing='Frontal and central upper interior; neutral-to-UP bridge; blink-covered late lower-left return',anchors=anchors))
save('data/visual-review.json',dict(primary_all_frames_reviewed=240,primary_sheets=[f'report/contact-sheets/primary-all/{i:06}.jpg' for i in range(0,240,30)],direction_signs='Verified nose/cheek orientation against head yaw; gaze is measured separately; roll is not yaw.',primary_ranges=[dict(start=0,end=10,note='Neutral hold, open eyes; f0 selected, redundant photographs omitted.'),dict(start=11,end=15,note='Blink and gaze shift during initial left departure; rejected.'),dict(start=16,end=38,note='Graceful left yaw; source roll gradually reaches roughly -5 degrees.'),dict(start=39,end=55,note='Upper-left transition; head pitch increases naturally, modest source roll.'),dict(start=56,end=64,note='Gaze shifts upward/right ahead of head yaw; independent eye movement remains.'),dict(start=65,end=94,note='Upper sweep across frontal yaw; no corresponding neutral-to-upper interior.'),dict(start=95,end=135,note='Upper-right to right arc; far-eye narrowing is not classified as a blink.'),dict(start=136,end=197,note='Right to shallow down to lower-left arc; visible downward irises with eyelid narrowing, no full blink.'),dict(start=198,end=205,note='Blink/partial reopening during lower-left return; excluded; missing bridge disclosed.'),dict(start=206,end=219,note='Open-eye return toward neutral; minor gaze/roll differences remain.'),dict(start=220,end=239,note='Redundant neutral hold; not loaded into tracking atlas.')],secondary_scope='All 4,319 secondary frames quantitatively screened; best matched down/lower-left/lower-right candidate from each of 18 clips visually compared. This is not a claim that every secondary photograph was manually inspected.',conclusions='Primary remains visually most consistent. No secondary repair demonstrates better complete transitions. Source supports a graceful perimeter, not a densely sampled two-dimensional disk.'))
print('Prepared',len(selected),'selected primary images;',len(edges),'compatibility edges; component sizes',[len(c) for c in components]);print('Anchors',json.dumps({k:v['frame'] for k,v in anchors.items()}));print('Grid supported fraction',sum(r['supported'] for r in grid)/len(grid))
