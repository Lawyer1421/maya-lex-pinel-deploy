// Preflight compuesto del harness (rama + secretos + estado global).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
for (const s of ['scripts/harness/verify-branch.mjs', 'scripts/harness/verify-secrets.mjs']) {
  const r = spawnSync('node', [s], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
if (fs.existsSync('harness/STATE.json')) {
  const st = JSON.parse(fs.readFileSync('harness/STATE.json', 'utf8'));
  if (['BLOCKED', 'ROLLED_BACK'].includes(st.estadoGlobal)) {
    console.error('X STATE=' + st.estadoGlobal + ': resuelve el bloqueo antes de continuar.');
    process.exit(1);
  }
}
console.log('OK Preflight completo');
