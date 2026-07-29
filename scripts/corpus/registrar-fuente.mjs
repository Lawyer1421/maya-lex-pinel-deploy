// Descarga un documento oficial, calcula SHA-256 y agrega el source record al
// registro JSONL (append-only). Estado inicial V1 (fuente identificada).
// Uso: node scripts/corpus/registrar-fuente.mjs <id> <titulo> <autoridad> <url> [decreto]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [id, titulo, autoridad, url, decreto] = process.argv.slice(2);
if (!id || !titulo || !autoridad || !url) {
  console.error('Uso: registrar-fuente.mjs <id> <titulo> <autoridad> <url> [decreto]');
  process.exit(1);
}
if (!/^https:\/\//.test(url)) { console.error('X La URL debe ser https de una autoridad oficial'); process.exit(1); }

const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'MayaLex-CorpusBot/1.0 (adquisicion de fuentes oficiales)' } });
if (!res.ok) { console.error('X Descarga fallo: HTTP ' + res.status); process.exit(1); }
const buf = Buffer.from(await res.arrayBuffer());
const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
const tipo = res.headers.get('content-type') ?? 'desconocido';
const ext = tipo.includes('pdf') ? '.pdf' : tipo.includes('html') ? '.html' : path.extname(new URL(url).pathname) || '.bin';
const destino = path.join('corpus-data', 'raw', id + ext);
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, buf);

const record = {
  id,
  titulo,
  decreto: decreto ?? null,
  autoridad,
  url,
  fechaAdquisicion: new Date().toISOString(),
  sha256,
  formato: tipo,
  bytes: buf.length,
  archivoLocal: destino,
  estadoEditorial: 'V1',
  gaceta: null,
  fechaPublicacion: null,
  paginas: null,
  articulos: null,
  reformas: [],
  derogaciones: [],
  fechaRevision: null,
};
fs.appendFileSync(path.join('corpus-data', 'registro-fuentes.jsonl'), JSON.stringify(record) + '\n');
console.log('OK ' + id + ' registrado: ' + buf.length + ' bytes, sha256=' + sha256.slice(0, 12) + '..., estado V1');
console.log('   archivo: ' + destino + ' (fuera del bundle publico)');
