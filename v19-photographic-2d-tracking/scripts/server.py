from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import threading
ROOT=Path(__file__).resolve().parents[1]
def serve(root,port):
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(root),**kwargs)
        def list_directory(self,path):self.send_error(403);return None
        def do_GET(self):
            from urllib.parse import unquote,urlsplit
            parts=Path(unquote(urlsplit(self.path).path)).parts
            if any(p.startswith('.') for p in parts if p!='/'):self.send_error(403);return
            super().do_GET()
        def log_message(self,*args):pass
    print(f'Serving only {root} at http://127.0.0.1:{port}/',flush=True)
    ThreadingHTTPServer(('127.0.0.1',port),Handler).serve_forever()
threading.Thread(target=serve,args=(ROOT.parent/'standalone/v15-singleclip-comparison/dist',61915),daemon=True).start()
serve(ROOT/'dist',61919)
