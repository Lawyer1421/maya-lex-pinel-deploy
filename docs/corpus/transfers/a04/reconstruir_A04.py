#!/usr/bin/env python3
"""Reconstruct the unmodified original A04 PDF from exact binary chunks."""
import hashlib
import json
from pathlib import Path
root=Path(__file__).resolve().parent
m=json.loads((root/'MANIFEST_A04.json').read_text(encoding='utf-8'))
target=root/m['original_filename']
if target.exists(): raise SystemExit('STOP: output already exists. Never overwrite.')
sha=hashlib.sha256(); total=0
try:
 with target.open('xb') as out:
  for part in m['parts']:
   fp=root/part['name']
   b=fp.read_bytes()
   if len(b)!=part['size'] or hashlib.sha256(b).hexdigest()!=part['sha256']:
    raise ValueError('Invalid chunk: '+part['name'])
   out.write(b); sha.update(b); total+=len(b)
 if total!=m['original_size'] or sha.hexdigest()!=m['original_sha256']:
  raise ValueError('Final PDF integrity mismatch')
except BaseException:
 target.unlink(missing_ok=True)
 raise
print(f'OK: {target.name} size={total} sha256={sha.hexdigest()}')
