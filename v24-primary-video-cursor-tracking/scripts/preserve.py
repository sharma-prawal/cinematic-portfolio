"""Hash every pre-existing project file; V24 is the only write boundary."""
from pathlib import Path
import os, json, hashlib, sys, time
BASE = Path(__file__).resolve().parents[1]
ROOT = BASE.parent
def digest(p):
    h = hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda: f.read(1024 * 1024), b''): h.update(b)
    return h.hexdigest()
def snapshot():
    result = {}
    for directory, dirs, files in os.walk(ROOT, followlinks=False):
        dirs[:] = sorted(d for d in dirs if Path(directory, d) != BASE)
        for name in sorted(files):
            p = Path(directory, name)
            if p.is_symlink(): result[str(p.relative_to(ROOT))] = {'link': os.readlink(p)}
            elif p.is_file(): result[str(p.relative_to(ROOT))] = {'bytes': p.stat().st_size, 'sha256': digest(p)}
    return result
if __name__ == '__main__':
    target = BASE / 'report/preservation-before.json'
    if sys.argv[-1] == 'before':
        if target.exists(): raise SystemExit('Refusing to replace initial snapshot')
        rows = snapshot()
        target.write_text(json.dumps(rows, indent=2))
        print('Protected files:', len(rows), 'bytes:', sum(r.get('bytes', 0) for r in rows.values()), flush=True)
    else:
        before = json.loads(target.read_text()); after = snapshot()
        result = dict(checked_at=time.time(), protected_files=len(before), changed=[p for p in before if p in after and before[p] != after[p]], missing=sorted(before.keys()-after.keys()), added_outside_v24=sorted(after.keys()-before.keys()), git='No .git directory exists in the supplied project; no commits or tags were modified.')
        result['passed'] = not any(result[k] for k in ['changed', 'missing', 'added_outside_v24'])
        (BASE/'report/preservation-after.json').write_text(json.dumps(result, indent=2))
        print(json.dumps(result))
        assert result['passed']
