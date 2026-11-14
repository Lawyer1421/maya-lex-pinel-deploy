#!/usr/bin/env node
/**
 * P21 — descarga y verificación de SHA-256 de las fuentes. SOLO red HTTP(S) pública:
 * no abre conexión a base de datos, no lee variables de entorno ni secretos.
 * Uso: node tools/corpus/p21-verify-sources.mjs <directorio-de-salida>      (descarga HTTP pública)
 *      node tools/corpus/p21-verify-sources.mjs --local <carpeta-con-archivos>  (verifica archivos locales)
 * B1 y B2 (Drive privado) NO son fuente HTTP pública: solo se verifican con --local.
 * Salida: una línea JSON por fuente con {id, estado, sha256_obtenido, bytes}. No escribe manifiestos.
 * Si el hash no coincide, la fuente se ABORTA (nunca se sustituye).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const FUENTES = [
  { id: 'A_codigo_comercio', archivo: 'A_comercio.pdf', url: 'https://www.bch.hn/administrativas/JUR/Marco%20Legal%20OM%202/codigo_comercio.pdf', sha256: '57c42a07b7540168fa74287212fa897505d0283d9e314606b25dd9106ce7f74a', bytes: 751606 },
  { id: 'B1_gaceta_33801', archivo: 'B1_gaceta33801.pdf', soloLocal: true, url: 'https://drive.google.com/uc?export=download&id=1y6ZmCoEhHKCejag8QMvxjoAZuNILKNw0', sha256: '8ec5d27be89442e2fdaa0164356cecb82874f23bbbe93bed962fe083a52868f7', bytes: 790648 },
  { id: 'B2_cotejo_d59_2015', archivo: 'B2_COTEJO-D59-2015-literal.md', soloLocal: true, url: 'https://drive.google.com/uc?export=download&id=1YZnjONI2E8VlXAbGMj-ZQ-lpIC8jjXiA', sha256: '7bbe492e83992c05087b568b56202460be49f138a786692506abacb006e25e6d', bytes: 21102 },
  { id: 'C_gaceta_33445', archivo: 'C_gaceta33445.pdf', url: 'https://enag.gob.hn/index.php/gaceta-digital/20140605-33445/download', sha256: '3b42a1f9120f386fbcb72039de94cc1110038450d0bbb16668c5818a1fe3a4cb', bytes: 1720691 },
  { id: 'D_ley_garantias_mobiliarias', archivo: 'D_lgm.pdf', url: 'https://www.tsc.gob.hn/web/leyes/Ley%20de%20Garantias%20Mobiliarias.pdf', sha256: '66270e8d35d3d1ed5561028380baca78cb74f82ff2d8da5f97095c7a3856f267', bytes: 3648369 },
];

function verificarLocal(dir) {
  for (const f of FUENTES) {
    const ruta = join(dir, f.archivo);
    if (!existsSync(ruta)) { console.log(JSON.stringify({ id: f.id, estado: 'ARCHIVO_AUSENTE' })); continue; }
    const buf = readFileSync(ruta);
    const sha = createHash('sha256').update(buf).digest('hex');
    const ok = sha === f.sha256 && (f.bytes == null || f.bytes === buf.length);
    console.log(JSON.stringify({ id: f.id, estado: ok ? 'SHA_OK' : 'SHA_MISMATCH_ABORTADA', sha256_obtenido: sha, bytes: buf.length }));
  }
}

async function main() {
  const li = process.argv.indexOf('--local');
  if (li > 0) return verificarLocal(process.argv[li + 1]);
  const out = process.argv[2];
  if (!out) throw new Error('falta directorio de salida');
  mkdirSync(out, { recursive: true });
  for (const f of FUENTES) {
    if (f.soloLocal) { console.log(JSON.stringify({ id: f.id, estado: 'REQUIERE_ARCHIVO_LOCAL' })); continue; }
    try {
      const r = await fetch(f.url, { redirect: 'follow' });
      if (!r.ok) { console.log(JSON.stringify({ id: f.id, estado: `HTTP_${r.status}` })); continue; }
      const buf = Buffer.from(await r.arrayBuffer());
      const sha = createHash('sha256').update(buf).digest('hex');
      const ok = sha === f.sha256;
      if (ok) writeFileSync(join(out, f.id), buf);
      console.log(JSON.stringify({ id: f.id, estado: ok ? 'SHA_OK' : 'SHA_MISMATCH_ABORTADA', sha256_obtenido: sha, bytes: buf.length }));
    } catch (e) {
      console.log(JSON.stringify({ id: f.id, estado: 'RED_NO_ALCANZABLE', detalle: String(e?.cause?.code ?? e?.message ?? e) }));
    }
  }
}
if (import.meta.url === `file://${process.argv[1]}`) main();
