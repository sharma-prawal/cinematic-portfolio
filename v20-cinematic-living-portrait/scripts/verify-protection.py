"""Read-only audit of the parent; writes evidence only inside V20."""
from pathlib import Path
import hashlib
import json
import os

experiment = Path(__file__).resolve().parents[1]
root = experiment.parent
before = json.loads((experiment / 'report/protected-before.json').read_text())
changed, missing, added = [], [], []
for name, expected in before.items():
    path = root / name
    if not path.is_file():
        missing.append(name)
    elif path.stat().st_size != expected['size'] or hashlib.sha256(path.read_bytes()).hexdigest() != expected['sha256']:
        changed.append(name)
for directory, directories, files in os.walk(root):
    directories[:] = [d for d in directories if d not in ['node_modules', experiment.name]]
    for filename in files:
        path = Path(directory) / filename
        name = str(path.relative_to(root))
        if not path.is_symlink() and name not in before:
            added.append(name)
result = {'protectedFiles': len(before), 'changed': changed, 'missing': missing, 'addedOutsideExperiment': added,
          'passed': not (changed or missing or added),
          'scope': 'Every existing parent file outside node_modules; includes all original media, protected experiments, dist artifacts, rollback files and tsbuildinfo. Parent node_modules caches were excluded from hashing and no parent package/build commands were run.',
          'git': 'This workspace and its ancestors are not a Git repository. No Git mutations, tags or rollback commits were created or modified.'}
(experiment / 'report/preservation.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
if not result['passed']:
    raise SystemExit(1)
