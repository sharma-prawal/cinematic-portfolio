from pathlib import Path
import json,math,hashlib
import cv2,numpy as np,mediapipe as mp
from scipy.spatial.transform import Rotation
BASE=Path(__file__).resolve().parents[1]
def dist(a,b):return float(np.linalg.norm(a-b))
def run():
 inventory=json.loads((BASE/'data/inventory.json').read_text());rows=[]
 options=mp.tasks.vision.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=str(BASE/'data/face_landmarker.task')),running_mode=mp.tasks.vision.RunningMode.IMAGE,num_faces=1,output_face_blendshapes=True,output_facial_transformation_matrixes=True)
 with mp.tasks.vision.FaceLandmarker.create_from_options(options) as model:
  for v in inventory:
   folder=BASE/'data/extracted'/Path(v['filename']).stem;prev=None
   for i in range(v['frame_count']):
    file=folder/f'frame_{i:06}.jpg'
    if not file.exists():raise RuntimeError('Extraction not complete')
    im=cv2.imread(str(file));h,w=im.shape[:2];small=cv2.resize(im,(960,540));gray=cv2.cvtColor(small,cv2.COLOR_BGR2GRAY)
    res=model.detect(mp.Image(image_format=mp.ImageFormat.SRGB,data=cv2.cvtColor(small,cv2.COLOR_BGR2RGB)))
    row=dict(source=v['id'],filename=v['filename'],frame=i,timestamp=v['timestamps'][i],image=str(file.relative_to(BASE)),visual_review='pending',identity='not established by landmarks',hair_beard='photographic review required',neck_collar='photographic review required',shoulders='photographic review required',rejections=[])
    row['background_mean']=float(gray[10:480,20:170].mean()); row['collar_temporal_mae']=float(np.abs(gray[365:500,330:650].astype(float)-prev[365:500,330:650]).mean()) if prev is not None else 0
    row['background_temporal_mae']=float(np.abs(gray[10:480,20:170].astype(float)-prev[10:480,20:170]).mean()) if prev is not None else 0
    if not res.face_landmarks:row['rejections'].append('landmark detection failed');rows.append(row);continue
    pts=np.array([[p.x*960,p.y*540,p.z*960] for p in res.face_landmarks[0]])
    angles=Rotation.from_matrix(res.facial_transformation_matrixes[0][:3,:3]).as_euler('xyz',degrees=True)
    # Camera/image conventions verified on contact sheets; positive yaw = viewer RIGHT, pitch = UP.
    row.update(yaw=float(angles[1]),pitch=float(-angles[0]),roll=float(angles[2]),face_scale=dist(pts[33,:2],pts[263,:2]),translation=pts[1,:2].tolist())
    bs={x.category_name:float(x.score) for x in res.face_blendshapes[0]};row['blendshapes']=bs
    row['blink']=max(bs.get('eyeBlinkLeft',0),bs.get('eyeBlinkRight',0))
    row['eye_openness']=[dist(pts[a,:2],pts[b,:2])/dist(pts[c,:2],pts[d,:2]) for a,b,c,d in [(159,145,33,133),(386,374,362,263)]]
    row['gaze_proxy']=[float((pts[468,0]-pts[33,0])/(pts[133,0]-pts[33,0])),float((pts[473,0]-pts[362,0])/(pts[263,0]-pts[362,0]))]
    row['smile']=(bs.get('mouthSmileLeft',0)+bs.get('mouthSmileRight',0))/2;row['mouth_open']=bs.get('jawOpen',0)
    row['landmarks']=pts[[1,33,133,263,362,61,291,152,10],:2].tolist()
    x1,y1=np.maximum(pts[:468,:2].min(0).astype(int),0);x2,y2=np.minimum(pts[:468,:2].max(0).astype(int),[959,539]);row['sharpness']=float(cv2.Laplacian(gray[y1:y2,x1:x2],cv2.CV_64F).var())
    if row['blink']>.35 or min(row['eye_openness'])<.10:row['rejections'].append('blink/partial eye closure candidate')
    if abs(row['roll'])>7:row['rejections'].append('roll exceeds 7 degrees')
    if abs(row['yaw'])>30 or abs(row['pitch'])>25:row['rejections'].append('exaggerated pose candidate')
    if row['mouth_open']>.12:row['rejections'].append('mouth opening')
    if row['background_temporal_mae']>5:row['rejections'].append('background temporal discontinuity candidate')
    if prev is not None and rows and rows[-1]['source']==v['id'] and 'gaze_proxy' in rows[-1]:
     row['gaze_delta']=float(np.linalg.norm(np.array(row['gaze_proxy'])-rows[-1]['gaze_proxy']))
     if row['gaze_delta']>.10:row['rejections'].append('independent gaze change candidate; inspect head motion')
    rows.append(row);prev=gray.astype(float)
   (BASE/'data/frame-manifest.json').write_text(json.dumps(rows))
   rr=[r for r in rows if r['source']==v['id'] and 'yaw' in r]
   print(v['id'],'frames',len(rr),'yaw',tuple(round(f(r['yaw'] for r in rr),1) for f in [min,max]),'pitch',tuple(round(f(r['pitch'] for r in rr),1) for f in [min,max]),flush=True)
 (BASE/'data/measurement-method.json').write_text(json.dumps(dict(model_sha256=hashlib.sha256((BASE/'data/face_landmarker.task').read_bytes()).hexdigest(),mediapipe=mp.__version__,angles='Uncalibrated canonical-model Euler estimates, not physical ground truth',gaze='Iris/corner image-position proxy; not calibrated eye-gaze angle',thresholds='Conservative screening candidates, require visual review',processing='Sequential, one 960x540 landmark input at a time; audit JPEGs remain native size'),indent=2))
if __name__=='__main__':run()
