// Gate de citas: cada articulo del JSONL de una norma debe ser citable
// (numArticulo + texto + fuenteId + fuenteSha256) y sin duplicados.
// Uso: verify-citations.mjs <norma.jsonl>
import fs from 'node:fs';
const ruta = process.argv[2];
if (!ruta || !fs.existsSync(ruta)) { console.error('Uso: verify-citations.mjs <norma.jsonl>'); process.exit(1); }
let fallos = 0;
let n = 0;
const vistos = new Set();
for (const linea of fs.readFileSync(ruta, 'utf8').split('\n').filter(Boolean)) {
  n++;
  const a = JSON.parse(linea);
  if (!a.numArticulo || !a.texto?.trim() || !a.fuenteId || !a.fuenteSha256) {
    console.error('X articulo ' + (a.numArticulo ?? n) + ' incompleto (numArticulo/texto/fuenteId/fuenteSha256)');
    fallos++;
  }
  const clave = a.fuenteId + ':' + a.numArticulo;
  if (vistos.has(clave)) { console.error('X duplicado: ' + clave); fallos++; }
  vistos.add(clave);
}
if (fallos) process.exit(1);
console.log('OK ' + n + ' articulos citables con fuente y hash, sin duplicados');
