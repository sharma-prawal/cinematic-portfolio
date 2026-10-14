from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
import json
from urllib.parse import unquote,urlsplit
base=Path(__file__).resolve().parents[1]
videos={v['filename'] for v in json.loads((base/'data/inventory.json').read_text())}
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  route=unquote(urlsplit(self.path).path).lstrip('/')
  parts=Path(route).parts
  allowed=route in videos or route in ['v18-unified-pose-atlas/viewer.html','v18-unified-pose-atlas/viewer.mjs','v18-unified-pose-atlas/data/inventory.json']
  if parts[:2]==('v18-unified-pose-atlas','report') and Path(route).suffix.lower() in ['.png','.jpg','.md','.webm','.json']:allowed=True
  if parts[:3]==('v18-unified-pose-atlas','data','format-comparison') and Path(route).suffix.lower() in ['.png','.jpg','.webp']:allowed=True
  if '..' in parts or not allowed:self.send_error(403);return
  target=(base.parent/route).resolve()
  if not target.is_relative_to(base.parent) or target.is_symlink():self.send_error(403);return
  super().do_GET()
 def do_HEAD(self):self.send_error(405)
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(base.parent)))
(base/'data/server.json').write_text(json.dumps({'url':f'http://127.0.0.1:{server.server_port}'}))
print(f'http://127.0.0.1:{server.server_port}/v18-unified-pose-atlas/viewer.html',flush=True)
server.serve_forever()
