"""Persist reproducible final command results without changing protected projects."""
from pathlib import Path
import json, subprocess, os, time
BASE=Path(__file__).resolve().parents[1]
commands=[['npm','run','typecheck'],['npm','run','lint'],['npm','test'],['npm','run','build']]
results=[]
for command in commands:
    start=time.monotonic();p=subprocess.run(['rtk','proxy',*command],cwd=BASE,text=True,capture_output=True)
    result=dict(command='rtk proxy '+' '.join(command),exit_code=p.returncode,seconds=time.monotonic()-start,stdout=p.stdout,stderr=p.stderr)
    results.append(result);print(result['command'],'PASS' if p.returncode==0 else 'FAIL',flush=True)
    (BASE/'qa/checks.json').write_text(json.dumps(results,indent=2))
    if p.returncode:raise SystemExit(p.returncode)
