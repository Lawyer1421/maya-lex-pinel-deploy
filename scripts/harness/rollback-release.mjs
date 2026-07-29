// Rollback del alias productivo al deployment registrado en el manifiesto.
// El codigo de main NO se reescribe: jamas force-push para "revertir".
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const manifest = JSON.parse(fs.readFileSync('harness/RELEASE_MANIFEST.json', 'utf8'));
const target = manifest.rollbackTarget;
if (!target) { console.error('X Sin rollbackTarget en RELEASE_MANIFEST.json'); process.exit(1); }
console.log('Rollback de mayalexhn.com al deployment ' + target + '...');
execSync('npx vercel rollback ' + target + ' --yes', { stdio: 'inherit' });
console.log('OK Rollback ejecutado. Verifica /api/version y escribe el informe de incidente (docs/harness/INCIDENT_RUNBOOK.md).');
