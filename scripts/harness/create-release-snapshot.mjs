// Crea snapshot pre-release y actualiza RELEASE_MANIFEST.json.
// Los conteos llegan como argumentos agregados (sin PII). Este script no
// consulta bases de datos ni almacena datos personales.
// Uso: create-release-snapshot.mjs <mainCommit> <deploymentId> <usuarios> <suscripciones>
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const [commit, deployment, usuarios, suscripciones] = process.argv.slice(2);
if (!commit || !deployment) {
  console.error('Uso: create-release-snapshot.mjs <mainCommit> <deploymentId> <usuarios> <suscripciones>');
  process.exit(1);
}
const fecha = new Date().toISOString();
const stamp = fecha.slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
const tag = 'pre-mayalex-release-' + stamp;
execSync('git tag ' + tag + ' ' + commit);
console.log('OK tag ' + tag + ' sobre ' + commit + ' (pendiente: git push origin ' + tag + ')');
const manifest = JSON.parse(fs.readFileSync('harness/RELEASE_MANIFEST.json', 'utf8'));
manifest.snapshots = manifest.snapshots || [];
manifest.snapshots.push({
  fecha,
  mainCommit: commit,
  rollbackTarget: deployment,
  tag,
  usuarios: Number(usuarios) || null,
  suscripciones: Number(suscripciones) || null,
});
manifest.rollbackTarget = deployment;
fs.writeFileSync('harness/RELEASE_MANIFEST.json', JSON.stringify(manifest, null, 2));
console.log('OK RELEASE_MANIFEST.json actualizado');
