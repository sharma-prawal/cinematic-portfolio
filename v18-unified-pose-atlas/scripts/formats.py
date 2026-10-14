from pathlib import Path
import json,subprocess,time
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
BASE=Path(__file__).resolve().parents[1]
selected=json.loads((BASE/'data/selected-endpoint-candidates.json').read_text())
allrows=json.loads((BASE/'data/frame-manifest.json').read_text());lookup={(r['source'],r['frame']):r for r in allrows}
selected += [lookup[k] for k in [('s12',0),('s12',55),('s14',12),('s14',80),('s14',158)]]
out=BASE/'data/format-comparison';out.mkdir(exist_ok=True);results=[]
for r in selected:
 key=f"{r['source']}-{r['frame']:06}";native=out/(key+'-native.png')
 subprocess.run(['ffmpeg','-v','error','-i',str(BASE.parent/r['filename']),'-vf',f"select=eq(n\\,{r['frame']})",'-fps_mode','passthrough','-frames:v','1',str(native),'-y'],check=True)
 with Image.open(native) as im:reference=im.convert('RGB').resize((960,540),Image.Resampling.LANCZOS)
 arr=np.asarray(reference,dtype=float)
 for fmt,ext,kwargs in [('PNG','png',{}),('JPEG','jpg',dict(quality=95,subsampling=0)),('WebP','webp',dict(quality=95,method=6))]:
  p=out/(key+'.'+ext);t=time.perf_counter();reference.save(p,**kwargs);encode=(time.perf_counter()-t)*1000
  ts=[]
  for _ in range(5):
   t=time.perf_counter()
   with Image.open(p) as im:decoded=np.asarray(im.convert('RGB'),dtype=float)
   ts.append((time.perf_counter()-t)*1000)
  metrics={}
  for name,(x1,y1,x2,y2) in dict(full=(0,0,960,540),hair=(380,20,604,140),eyes=(400,175,600,240),beard=(400,248,596,344)).items():
   a=arr[y1:y2,x1:x2];b=decoded[y1:y2,x1:x2];mse=float(np.mean((a-b)**2));metrics[name+'_psnr_db']=float(10*np.log10(255**2/mse)) if mse else None
   ag=a.mean(2);bg=b.mean(2);mu1=gaussian_filter(ag,1.5);mu2=gaussian_filter(bg,1.5);s1=gaussian_filter(ag*ag,1.5)-mu1*mu1;s2=gaussian_filter(bg*bg,1.5)-mu2*mu2;s12=gaussian_filter(ag*bg,1.5)-mu1*mu2
   metrics[name+'_ssim']=float(np.mean(((2*mu1*mu2+6.5025)*(2*s12+58.5225))/((mu1*mu1+mu2*mu2+6.5025)*(s1+s2+58.5225))))
  results.append(dict(source=r['source'],frame=r['frame'],format=fmt,file=str(p.relative_to(BASE)),bytes=p.stat().st_size,encode_ms=encode,pillow_decode_median_ms=float(np.median(ts)),decoded_MiB=960*540*4/1048576,metrics=metrics))
(BASE/'data/format-comparison.json').write_text(json.dumps(results,indent=2));print('format records',len(results),flush=True)
