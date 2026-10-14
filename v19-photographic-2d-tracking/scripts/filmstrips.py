from pathlib import Path
import subprocess,json
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
out=ROOT/'report'
inventory=[]
for video in sorted((out/'recordings').glob('*.webm')):
    dest=out/'filmstrip-frames'/video.stem;dest.mkdir(parents=True,exist_ok=True)
    for old in dest.glob('*.jpg'): old.unlink()
    for old in out.glob(f'filmstrip-{video.stem}-*.jpg'): old.unlink()
    probe=json.loads(subprocess.check_output(['rtk','proxy','ffprobe','-v','error','-show_entries','format=duration:stream=width,height,r_frame_rate','-of','json',str(video)]))
    subprocess.run(['rtk','proxy','ffmpeg','-v','error','-y','-i',str(video),'-vf','fps=2,crop=360:490:540:110','-q:v','2',str(dest/'%04d.jpg')],check=True)
    frames=sorted(dest.glob('*.jpg'))
    sheets=[]
    for start in range(0,len(frames),16):
        board=Image.new('RGB',(1000,1500),(225,225,225));d=ImageDraw.Draw(board)
        for j,p in enumerate(frames[start:start+16]):
            im=Image.open(p);im.thumbnail((240,340));x=j%4*250;y=j//4*375;board.paste(im,(x,y+27));d.text((x+7,y+7),f'{video.stem} / {(start+j)*.5:.1f}s',fill='black')
        path=out/f'filmstrip-{video.stem}-{start:03d}.jpg';board.save(path,quality=95);sheets.append(path.name)
    inventory.append({'recording':video.name,'duration':float(probe['format']['duration']),'streams':probe['streams'],'sampledFrames':len(frames),'sheets':sheets})
(out/'recording-inventory.json').write_text(json.dumps(inventory,indent=2))
print(json.dumps(inventory,indent=2))
