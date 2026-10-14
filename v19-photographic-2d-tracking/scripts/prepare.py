from pathlib import Path
import json, hashlib, shutil, os
import numpy as np
import cv2
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
SOURCE = Path('/Users/prawalsharma/Downloads/Professional Studio Headshot of a Smiling Bearded Man.png')
def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()
before = {}
for base, dirs, files in os.walk(WORKSPACE):
    dirs[:] = [d for d in dirs if d not in {ROOT.name, 'node_modules', '.venv', '.git', '.vite'}]
    for name in files:
        p = Path(base)/name
        if p.is_symlink() or name == '.DS_Store': continue
        before[str(p.relative_to(WORKSPACE))] = digest(p)
(ROOT/'report/preservation-before.json').write_text(json.dumps(before))
shutil.copyfile(SOURCE, ROOT/'public/original.png')
im = Image.open(SOURCE).convert('RGB')
a = np.array(im)
h,w = a.shape[:2]
# Manually traced head/neck ROI; foreground confidence comes from photographic
# colour contrast against the near-neutral grey backdrop, not generated anatomy.
outline = [(640,344),(634,281),(650,218),(687,156),(743,118),(798,98),
           (853,104),(920,123),(957,157),(967,188),(985,218),(996,273),
           (981,339),(1002,365),(996,416),(975,444),(951,523),(950,646),
           (907,708),(836,790),(773,704),(727,649),(718,556),(687,513),
           (665,446),(643,423),(638,385)]
roi = Image.new('L',(w,h)); ImageDraw.Draw(roi).polygon(outline, fill=255)
r = cv2.dilate(np.array(roi),np.ones((25,25),np.uint8))>0
spread = a.max(2).astype(float)-a.min(2).astype(float)
brightness = a.mean(2)
foreground = r & ((spread>16)|(brightness<145))
mask = cv2.morphologyEx(foreground.astype('uint8')*255, cv2.MORPH_CLOSE, np.ones((3,3),np.uint8))
contours,_ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
mask[:] = 0
cv2.drawContours(mask,[max(contours,key=cv2.contourArea)],-1,255,cv2.FILLED)
# One-pixel matte feather only; no face texture filtering.
mask = cv2.GaussianBlur(mask,(3,3),.55)
Image.fromarray(mask).save(ROOT/'public/head-mask.png')
# Row-wise grey backdrop interpolation under the removed head. The unaffected
# background and clothing remain original pixels. This infers only hidden grey.
plate = a.copy()
for y in range(h):
    if y >= 655: continue
    xs = np.flatnonzero(mask[y])
    if not len(xs): continue
    l,rr = max(0,int(xs[0])-16), min(w-1,int(xs[-1])+16)
    # Above shoulders use immediate exterior background; below, this plate is
    # covered by the stationary lower neck/torso or the moving photographic layer.
    left = np.median(a[y, 540:560],axis=0)
    right = np.median(a[y, 1080:1100],axis=0)
    t = np.linspace(0,1,rr-l+1)[:,None]
    row = (left*(1-t)+right*t).astype('uint8')
    keep = mask[y,l:rr+1]>0
    plate[y,l:rr+1][keep] = row[keep]
Image.fromarray(plate).save(ROOT/'public/static-plate.png')
info = {'source':str(SOURCE),'sha256':digest(SOURCE),'size':[w,h],'mode':'RGB',
        'bytes':SOURCE.stat().st_size,'alpha':False,
        'composition':'Supplied nearly 16:9 photograph; no additional padded reference supplied',
        'matte':'Deterministic contrast mask within manually traced ROI, 1-pixel edge feather. Original is not a cutout.',
        'background':'Only concealed region estimated by row-wise exterior colour interpolation',
        'depth':'Heuristic shallow ellipsoid with rigid central facial plateau; not calibrated anatomical depth',
        'protectedFiles':len(before)}
(ROOT/'report/source.json').write_text(json.dumps(info,indent=2))
print(json.dumps(info,indent=2))
