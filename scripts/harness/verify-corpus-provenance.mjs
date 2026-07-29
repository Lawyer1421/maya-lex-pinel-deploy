// Gate de corpus: toda norma registrada debe tener source record completo.
// Uso: verify-corpus-provenance.mjs [registro=corpus-data/registro-fuentes.jsonl]
import fs from 'node:fs';
const ruta = process.argv[2] ?? 'corpus-data/registro-fuentes.jsonl';
if (!fs.existsSync(ruta)) { console.error('X No existe ' + ruta); process.exit(1); }
const OBLIGATORIOS = ['id', 'titulo', 'autoridad', 'url', 'fechaAdquisicion', 'sha256', 'formato', 'estadoEditorial'];
let fallos = 0;
let n = 0;
for (const linea of fs.readFileSync(ruta, 'utf8').split('\n').filter(Boolean)) {
  n++;
  const rec = JSON.parse(linea);
  const faltan = OBLIGATORIOS.filter((c) => !rec[c]);
  if (faltan.length) { console.error('X ' + (rec.id ?? 'registro ' + n) + ': faltan ' + faltan.join(', ')); fallos++; }
  if (rec.sha256 && !/^[a-f0-9]{64}$/.test(rec.sha256)) { console.error('X ' + rec.id + ': sha256 invalido'); fallos++; }
  if (rec.url && !/^https:\/\//.test(rec.url)) { console.error('X ' + rec.id + ': URL no https'); fallos++; }
}
if (fallos) process.exit(1);
console.log('OK Procedencia completa en ' + n + ' registros');
