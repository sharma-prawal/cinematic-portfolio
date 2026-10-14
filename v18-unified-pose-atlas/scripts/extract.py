from pathlib import Path
import hashlib,json,subprocess,shutil,time
from PIL import Image,ImageDraw
BASE=Path(__file__).resolve().parents[1]; ROOT=BASE.parent
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''): h.update(b)
 return h.hexdigest()
def snapshot():
 return {str(p.relative_to(ROOT)):sha(p) for p in ROOT.rglob('*') if p.is_file() and not any(x in p.relative_to(ROOT).parts for x in ['v18-unified-pose-atlas','node_modules','.vite'])}
if __name__=='__main__':
 before=snapshot(); (BASE/'data/preservation-before.json').write_text(json.dumps(before,indent=2))
 inventory=[]
 for k,p in enumerate(sorted(ROOT.glob('*.mp4'))):
  probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-count_frames','-show_streams','-show_frames','-show_entries','frame=best_effort_timestamp_time,pkt_duration_time','-of','json',str(p)]))
  s=probe['streams'][0]; pts=[float(f['best_effort_timestamp_time']) for f in probe['frames']]
  inventory.append(dict(id=f's{k:02}',filename=p.name,bytes=p.stat().st_size,sha256=sha(p),width=s['width'],height=s['height'],fps=s['avg_frame_rate'],duration=float(s['duration']),frame_count=int(s['nb_read_frames']),codec=s['codec_name'],timestamps=pts,generation='Filename timestamp only; generation/version not independently verified',classification='Root MP4, source candidate; visual audit required'))
 (BASE/'data/inventory.json').write_text(json.dumps(inventory,indent=2))
 estimated=sum(v['width']*v['height']*.22*v['frame_count'] for v in inventory)
 (BASE/'data/storage-plan.json').write_text(json.dumps(dict(estimated_jpeg_bytes=estimated,lossless_shortlist_budget_bytes=500_000_000,free_bytes=shutil.disk_usage(BASE).free,method='0.22 byte/pixel high-quality JPEG estimate; sequential one-video extraction'),indent=2))
 print('Sources',len(inventory),'frames',sum(v['frame_count'] for v in inventory),'estimated GB',estimated/1e9,flush=True)
 for v in inventory:
  out=BASE/'data/extracted'/Path(v['filename']).stem;out.mkdir(parents=True,exist_ok=True)
  subprocess.run(['ffmpeg','-v','error','-i',str(ROOT/v['filename']),'-map','0:v:0','-fps_mode','passthrough','-q:v','1','-start_number','0',str(out/'frame_%06d.jpg')],check=True)
  files=sorted(out.glob('*.jpg')); assert len(files)==v['frame_count']
  for i,p in enumerate(files):
   assert p.name==f'frame_{i:06}.jpg'
   with Image.open(p) as im: assert im.size==(v['width'],v['height'])
  v['extracted_count']=len(files);v['extracted_bytes']=sum(p.stat().st_size for p in files)
  # Every frame appears on a readable chronological sheet, 40 frames per sheet.
  sheetdir=BASE/'report/contact-sheets'/v['id'];sheetdir.mkdir(parents=True,exist_ok=True)
  for start in range(0,len(files),40):
   board=Image.new('RGB',(1600,1080),'#eeeeee');d=ImageDraw.Draw(board)
   for slot,p in enumerate(files[start:start+40]):
    with Image.open(p) as im:
     w,h=im.size;im=im.crop((w*.30,h*.03,w*.70,h*.92));im.thumbnail((200,190));x=slot%8*200;y=slot//8*216;board.paste(im,(x,y))
    d.text((x+4,y+193),f"{v['id']} frame {start+slot} {v['timestamps'][start+slot]:.3f}s",fill='black')
   board.save(sheetdir/f'{start:06}.jpg',quality=95)
  print(v['id'],v['filename'],len(files),flush=True)
 (BASE/'data/inventory.json').write_text(json.dumps(inventory,indent=2))
