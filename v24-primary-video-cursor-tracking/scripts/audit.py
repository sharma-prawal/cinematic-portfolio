"""Fresh native-frame extraction and independent MediaPipe screening, confined to V24."""
from pathlib import Path
import json, subprocess, hashlib, shutil, math, os, sys
os.environ['MPLCONFIGDIR'] = str(Path(__file__).resolve().parents[1] / 'data/mpl-cache')
import numpy as np
import cv2
import mediapipe as mp
from PIL import Image, ImageDraw
from scipy.spatial.transform import Rotation

BASE = Path(__file__).resolve().parents[1]; ROOT = BASE.parent
PRIMARY = 'Generate_video_from_image_reference_20261009112404.mp4'
def save(path, data):
    p = BASE/path; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(json.dumps(data, indent=2))
def sha(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for b in iter(lambda: f.read(1048576), b''): h.update(b)
    return h.hexdigest()
def sheet(rows, path, cols=6, label=''):
    cellw, cellh = 256, 280
    board = Image.new('RGB', (cols*cellw, math.ceil(len(rows)/cols)*cellh+40), '#ecefed'); d = ImageDraw.Draw(board)
    d.text((12,12),label,fill='#182420')
    for i,r in enumerate(rows):
        x=i%cols*cellw; y=i//cols*cellh+40
        with Image.open(BASE/r['image']) as im:
            w,h=im.size
            im=im.crop((w*.33,h*.04,w*.68,h*.79)); im.thumbnail((cellw-4,cellh-42))
            board.paste(im,(x+(cellw-im.width)//2,y))
        text=f"{r['source']} f{r['frame']:03} {r['timestamp']:.3f}s"
        if 'yaw' in r: text+=f"  yaw {r['yaw']:.1f} pitch {r['pitch']:.1f}"
        d.text((x+4,y+cellh-38),text,fill='#182420')
        if 'eye_state' in r: d.text((x+4,y+cellh-21),f"{r['eye_state']} | roll {r['roll']:.1f}",fill='#182420')
    path.parent.mkdir(parents=True,exist_ok=True); board.save(path,quality=94)
def extract():
    assert (ROOT/PRIMARY).exists()
    assert (BASE/'report/preservation-before.json').exists()
    inventory=[]; excluded=[]
    sources=sorted(ROOT.glob('*.mp4'),key=lambda p:(p.name!=PRIMARY,p.name))
    for p in sources:
        derived=p.name.startswith('v20_') or any(t in p.stem.lower() for t in ['recording','preview','export','test-clip']) and 'Man_recording_head_motion' not in p.name
        probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-count_frames','-show_streams','-show_frames','-show_entries','frame=best_effort_timestamp_time,pkt_duration_time','-of','json',str(p)]))
        s=probe['streams'][0]; timestamps=[float(f['best_effort_timestamp_time']) for f in probe['frames']]
        v=dict(id='primary' if p.name==PRIMARY else f's{len(inventory):02}',filename=p.name,bytes=p.stat().st_size,sha256=sha(p),duration=float(s.get('duration',len(timestamps)/24)),width=s['width'],height=s['height'],fps=s['avg_frame_rate'],frame_count=len(timestamps),timestamps=timestamps,codec=s['codec_name'],classification='original Google Flow candidate; filename and source visuals, no generation-account provenance' if not derived else 'derived V20 preview; excluded')
        if derived: excluded.append(v); continue
        inventory.append(v)
    save('data/inventory.json',inventory);save('data/excluded-videos.json',excluded)
    print('Inventory',len(inventory),'original candidates;',len(excluded),'derived exclusions; free GB',round(shutil.disk_usage(BASE).free/1e9,2),flush=True)
    for v in inventory:
        folder=BASE/'data'/('primary' if v['id']=='primary' else f"secondary/{Path(v['filename']).stem}")/'original-jpg'
        folder.mkdir(parents=True,exist_ok=True)
        subprocess.run(['ffmpeg','-v','error','-threads','2','-i',str(ROOT/v['filename']),'-map','0:v:0','-fps_mode','passthrough','-q:v','1','-start_number','0',str(folder/'frame_%06d.jpg')],check=True)
        files=sorted(folder.glob('frame_*.jpg')); assert len(files)==v['frame_count']
        rows=[]
        for i,p in enumerate(files):
            assert p.name==f'frame_{i:06}.jpg'
            with Image.open(p) as im: assert im.size==(v['width'],v['height'])
            rows.append(dict(source=v['id'],filename=v['filename'],frame=i,timestamp=v['timestamps'][i],image=str(p.relative_to(BASE))))
        v['folder']=str(folder.relative_to(BASE));v['extracted_count']=len(files);v['extracted_bytes']=sum(f.stat().st_size for f in files)
        save(f"data/{v['id']}-extraction.json",rows)
        if v['id']=='primary':
            for start in range(0,len(rows),30): sheet(rows[start:start+30],BASE/f'report/contact-sheets/primary-all/{start:06}.jpg',label=f'PRIMARY chronological frames {start} through {min(start+29,len(rows)-1)}; every decoded frame')
        print(v['id'],v['filename'],len(files),'native JPEGs',flush=True)
    save('data/inventory.json',inventory)
def measure():
    inventory=json.loads((BASE/'data/inventory.json').read_text()); allrows=[]
    modelpath=BASE/'data/face_landmarker.task'
    if not modelpath.exists(): shutil.copyfile(ROOT/'v18-unified-pose-atlas/data/face_landmarker.task',modelpath)
    options=mp.tasks.vision.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=str(modelpath)),running_mode=mp.tasks.vision.RunningMode.IMAGE,num_faces=1,output_face_blendshapes=True,output_facial_transformation_matrixes=True)
    with mp.tasks.vision.FaceLandmarker.create_from_options(options) as model:
        for v in inventory:
            rows=json.loads((BASE/f"data/{v['id']}-extraction.json").read_text()); previous=None; previousrow=None
            for r in rows:
                im=cv2.imread(str(BASE/r['image'])); im=cv2.resize(im,(960,540),interpolation=cv2.INTER_AREA);gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
                result=model.detect(mp.Image(image_format=mp.ImageFormat.SRGB,data=cv2.cvtColor(im,cv2.COLOR_BGR2RGB)))
                r.update(quantitative_screening=True,visual_review='pending chronological contact-sheet review',flags=[])
                if not result.face_landmarks: r['flags'].append('no-face-landmarks');continue
                pts=np.array([[p.x*960,p.y*540,p.z*960] for p in result.face_landmarks[0]])
                angle=Rotation.from_matrix(result.facial_transformation_matrixes[0][:3,:3]).as_euler('xyz',degrees=True)
                b={x.category_name:float(x.score) for x in result.face_blendshapes[0]}
                dist=lambda a,c:float(np.linalg.norm(pts[a,:2]-pts[c,:2]))
                eye=[dist(a,c)/dist(e,f) for a,c,e,f in [(159,145,33,133),(386,374,362,263)]]
                gaze=[]
                for iris,left,right,upper,lower in [(468,33,133,159,145),(473,362,263,386,374)]:
                    gaze.extend([float((pts[iris,0]-pts[left,0])/(pts[right,0]-pts[left,0])),float((pts[iris,1]-pts[upper,1])/max(1,pts[lower,1]-pts[upper,1]))])
                blink=max(b.get('eyeBlinkLeft',0),b.get('eyeBlinkRight',0))
                # No single EAR threshold labels every downward pose a blink.
                state='full-blink-candidate' if blink>.65 and max(eye)<.12 else 'eyelid-narrowing-or-pitch-occlusion' if blink>.28 or min(eye)<.12 else 'eyes-visible'
                r.update(yaw=float(angle[1]),pitch=float(-angle[0]),roll=float(angle[2]),eye_openness=eye,blink=blink,eye_state=state,gaze_proxy=gaze,blendshapes=b,expression=dict(smile=(b.get('mouthSmileLeft',0)+b.get('mouthSmileRight',0))/2,jaw_open=b.get('jawOpen',0)),face_scale=dist(33,263),face_center=pts[1,:2].tolist(),landmarks=pts[[1,33,133,263,362,61,291,152,10],:2].tolist())
                x1,y1=np.maximum(pts[:468,:2].min(0).astype(int),0);x2,y2=np.minimum(pts[:468,:2].max(0).astype(int),[959,539])
                r['sharpness']=float(cv2.Laplacian(gray[y1:y2,x1:x2],cv2.CV_64F).var())
                r['background_mean']=float(gray[40:400,30:200].mean())
                for name,rect in dict(collar=(slice(405,510),slice(330,630)),shoulder=(slice(440,530),slice(210,750)),hair_beard=(slice(90,400),slice(360,590)),background=(slice(40,400),slice(30,200))).items():
                    r[f'{name}_temporal_mae']=float(np.abs(gray[rect].astype(float)-previous[rect]).mean()) if previous is not None else 0
                if previousrow:
                    r['gaze_delta']=float(np.linalg.norm(np.array(gaze)-previousrow['gaze_proxy']))
                    r['landmark_delta_px']=float(np.linalg.norm(np.array(r['landmarks'])-previousrow['landmarks'],axis=1).mean())
                    r['angular_delta']=math.hypot(r['yaw']-previousrow['yaw'],r['pitch']-previousrow['pitch'])
                    if r['gaze_delta']>.22: r['flags'].append('gaze-jump-or-occlusion-candidate')
                    if r['angular_delta']>4: r['flags'].append('angular-jump-candidate')
                if state!='eyes-visible':r['flags'].append(state)
                if abs(r['roll'])>7:r['flags'].append('roll-over-7deg')
                if r['expression']['jaw_open']>.12:r['flags'].append('expression-change')
                previous=gray.astype(float);previousrow=r
            save(f"data/{v['id']}-measurements.json",rows);allrows.extend(rows)
            print(v['id'],'measured',len(rows),'yaw',round(min(r.get('yaw',0) for r in rows),1),round(max(r.get('yaw',0) for r in rows),1),'pitch',round(min(r.get('pitch',0) for r in rows),1),round(max(r.get('pitch',0) for r in rows),1),flush=True)
            if v['id']=='primary':
                for start in range(0,len(rows),30):sheet(rows[start:start+30],BASE/f'report/contact-sheets/primary-all/{start:06}.jpg',label=f'PRIMARY all frames {start}–{min(start+29,len(rows)-1)} | estimates: +yaw viewer right; +pitch up')
            else:
                picks=sorted(rows,key=lambda r:r.get('pitch',0))[:12]
                sheet(picks,BASE/f"report/contact-sheets/secondary/{v['id']}-down.jpg",cols=4,label=v['filename']+' | 12 lowest estimated pitch poses')
    save('data/source-frame-manifest.json',allrows)
    save('data/measurement-method.json',dict(model_sha256=sha(modelpath),mediapipe=mp.__version__,angles='Uncalibrated canonical-model Euler estimates; not physical ground-truth angles. Viewer +yaw=right, +pitch=up; visually verified separately.',eyes='EAR, blendshape blink score and iris/corner position proxies; no calibrated gaze angles. Full-blink is a screening candidate requiring visible iris review.',input='960x540 sequential measurement; extracted JPEGs remain native dimensions',temporal_alignment='Image-coordinate landmark and fixed-region MAE screening, not an identity embedding or physical shoulder model',source='https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/python'))
if __name__=='__main__':
    if sys.argv[-1]=='extract': extract()
    elif sys.argv[-1]=='measure':measure()
    else:extract();measure()
