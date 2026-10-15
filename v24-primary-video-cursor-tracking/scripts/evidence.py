from audit import BASE, save
import json, subprocess, math, cv2, numpy as np
from PIL import Image, ImageDraw
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

qa=BASE/'qa';out=BASE/'report';atlas=json.loads((BASE/'data/selected-image-manifest.json').read_text());byid={p['id']:p for p in atlas['frames']}
video=qa/'recordings/circular-B-vs-C.webm'
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)]))
duration=float(probe['format']['duration']);cap=cv2.VideoCapture(str(video));film=out/'recording-filmstrips';film.mkdir(exist_ok=True)
times=np.arange(.75,duration,.75)
for start in range(0,len(times),24):
    group=times[start:start+24];board=Image.new('RGB',(1536,math.ceil(len(group)/6)*270+40),'#ecefed');d=ImageDraw.Draw(board);d.text((12,12),'Actual B/C Chrome screen recording: B face detail, 0.75s intervals. Full recording retains both panels.',fill='black')
    for j,t in enumerate(group):
        cap.set(cv2.CAP_PROP_POS_MSEC,float(t*1000));ok,frame=cap.read()
        if not ok:continue
        # Crop only for visual inspection; runtime retains the full source composition.
        rgb=cv2.cvtColor(frame,cv2.COLOR_BGR2RGB);im=Image.fromarray(rgb).crop((220,290,490,630));im.thumbnail((250,242))
        x=j%6*256;y=j//6*270+40;board.paste(im,(x+(256-im.width)//2,y));d.text((x+8,y+245),f'Browser recording t={t:.2f}s',fill='black')
    board.save(film/f'{start:04}.jpg',quality=94)
cap.release()
for name in ['circular-B-vs-C','real-mouse-circles-B','chronological-A']:
    poster_cap=cv2.VideoCapture(str(qa/f'recordings/{name}.webm'));poster_cap.set(cv2.CAP_PROP_POS_MSEC,750);ok,frame=poster_cap.read();poster_cap.release()
    if ok:Image.fromarray(cv2.cvtColor(frame,cv2.COLOR_BGR2RGB)).save(out/f'poster-{name}.jpg',quality=92)
save('qa/recording-probe.json',dict(duration=duration,width=probe['streams'][0]['width'],height=probe['streams'][0]['height'],fps=probe['streams'][0]['avg_frame_rate'],codec=probe['streams'][0]['codec_name'],note='Normal-speed Chrome screen capture; recording cadence is separate from render cadence and photograph selection cadence.'))

grid=Image.new('RGB',(900,1056),'#ecefed');gd=ImageDraw.Draw(grid);gd.text((12,12),'Nine PRIMARY reference photographs. Grid is diagnostic; path gaps remain. +yaw right / +pitch up.',fill='black')
for j,name in enumerate(['UPPER-LEFT','UP','UPPER-RIGHT','LEFT','CENTER','RIGHT','LOWER-LEFT','DOWN','LOWER-RIGHT']):
    a=atlas['anchors'][name];photo=byid[a['frame']];im=Image.open(BASE/'public'/photo['url'].lstrip('/'));w,h=im.size;im=im.crop((w*.33,h*.04,w*.68,h*.79));im.thumbnail((294,274));x=j%3*300;y=j//3*336+44;grid.paste(im,(x+(300-im.width)//2,y));gd.text((x+8,y+282),f"{name} | primary f{a['frame']} | {photo['timestamp']:.3f}s",fill='black');gd.text((x+8,y+301),f"yaw {photo['yaw']:.1f} / pitch {photo['pitch']:.1f} / roll {photo['roll']:.1f}",fill='black')
grid.save(out/'nine-direction-photographs.jpg',quality=95)

traces={}
for name in ['small-clockwise','medium-clockwise','large-clockwise','offset-upper','offset-lower','normal-circle','rapid-reversals']:
    p=qa/f'trace-{name}.json'
    if p.exists():traces[name]=json.loads(p.read_text())['panels']['B']['samples']
fig,axes=plt.subplots(2,3,figsize=(15,8))
for ax,(name,samples) in zip(axes.flat,[(n,traces[n]) for n in ['small-clockwise','medium-clockwise','large-clockwise','offset-upper','offset-lower','normal-circle'] if n in traces]):
    actual=[byid[s['frame']] for s in samples if s['frame'] in byid];ss=[s for s in samples if s['frame'] in byid]
    ax.plot([s['requested']['yaw'] for s in ss],[s['requested']['pitch'] for s in ss],color='#98a39e',lw=2,label='requested')
    ax.plot([p['yaw'] for p in actual],[p['pitch'] for p in actual],color='#245b44',lw=1,label='displayed')
    bad=[s for s in ss if not s['supported']];ax.scatter([s['requested']['yaw'] for s in bad],[s['requested']['pitch'] for s in bad],s=6,color='#b9513c',label='missing / held')
    ax.set(title=name,xlabel='Estimated yaw (degrees)',ylabel='Estimated pitch (degrees)',xlim=(-32,38),ylim=(-15,16));ax.grid(alpha=.15)
axes.flat[0].legend(fontsize=7);fig.suptitle('Actual Chrome traces: requested pose vs displayed source photographs. Held regions and jumps remain.');fig.tight_layout();fig.savefig(out/'circular-coverage.png',dpi=150);plt.close(fig)

jumps=[]
for name,samples in traces.items():
    prev=None
    for s in samples:
        if s['changed'] and s['angularJump']>5 and prev is not None:jumps.append(dict(path=name,before=prev['frame'],after=s['frame'],angle=s['angularJump'],time=s['t']))
        prev=s
jumps=sorted(jumps,key=lambda j:-j['angle']);save('qa/largest-visible-jumps.json',jumps)
board=Image.new('RGB',(1440,4*330+40),'#ecefed');d=ImageDraw.Draw(board);d.text((12,12),'Largest displayed jumps from actual browser traces; exact source photographs before / after, no blending.',fill='black')
for j,item in enumerate(jumps[:8]):
    x=j%2*720;y=j//2*330+40
    for k,key in enumerate(['before','after']):
        p=BASE/'public'/byid[item[key]]['url'].lstrip('/')
        im=Image.open(p);w,h=im.size;im=im.crop((w*.33,h*.04,w*.68,h*.79));im.thumbnail((290,285));board.paste(im,(x+k*340,y))
    d.text((x+4,y+292),f"{item['path']} f{item['before']} -> f{item['after']} | {item['angle']:.1f} estimated degrees",fill='black')
board.save(out/'largest-visible-jumps.jpg',quality=94)

# Large readable eye detail establishes blink vs naturally downward gaze.
primary=json.loads((BASE/'data/primary/frame-manifest.json').read_text());eye_frames=[0,12,149,157,163,164,179,190,199,200,201,206]
board=Image.new('RGB',(1440,3*260+40),'#ecefed');d=ImageDraw.Draw(board);d.text((12,12),'Primary eye detail: natural downward irises are distinguished from full blinks. Native decoded references.',fill='black')
for j,f in enumerate(eye_frames):
    im=Image.open(BASE/f'data/primary/lossless-png/frame_{f:06}.png') if (BASE/f'data/primary/lossless-png/frame_{f:06}.png').exists() else Image.open(BASE/primary[f]['image'])
    w,h=im.size;im=im.crop((w*.405,h*.22,w*.595,h*.44));im.thumbnail((350,200));x=j%4*360;y=j//4*260+40;board.paste(im,(x,y));d.text((x+3,y+205),f"f{f} | EAR {min(primary[f]['eye_openness']):.3f} | blink {primary[f]['blink']:.2f}",fill='black');d.text((x+3,y+224),'full blink' if f in [12,199,200,201] else 'visible iris / normal lid narrowing',fill='black')
board.save(out/'eye-blink-gaze-comparison.jpg',quality=96)

# Compression comparisons at equal displayed face size, from actual generated formats.
board=Image.new('RGB',(1280,3*420+44),'#ecefed');d=ImageDraw.Draw(board);d.text((12,12),'Format comparison: 960 lossless PNG | 960 JPEG q94 | 960 WebP q92 | 1280 WebP q92 (same face display size)',fill='black')
for row,f in enumerate([0,77,163]):
    for col,(width,fmt) in enumerate([(960,'png'),(960,'jpg'),(960,'webp'),(1280,'webp')]):
        im=Image.open(BASE/f'data/format-comparison/{width}/frame_{f:06}.{fmt}');w,h=im.size;im=im.crop((w*.36,h*.08,w*.64,h*.72));im.thumbnail((260,334));x=col*320;y=row*420+44;board.paste(im,(x+(320-im.width)//2,y));d.text((x+8,y+378),f'f{f} | {width} {fmt}',fill='black')
board.save(out/'format-comparison.jpg',quality=97)
print('Recording',duration,'seconds; filmstrips',math.ceil(len(times)/24),'largest trace jump',jumps[0] if jumps else None)
