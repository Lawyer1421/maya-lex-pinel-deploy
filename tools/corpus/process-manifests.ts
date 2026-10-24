/**
 * tools/corpus/process-manifests.ts — pre-recepción de manifiestos de evidencia (sin bytes ni texto).
 *   npx tsx tools/corpus/process-manifests.ts <directorio|manifiesto.json> [--out docs/corpus/staging/<lote>-manifests]
 * Resultado máximo: NEEDS_SOURCE_BYTES. No crea candidatos ni QA; no relaja el receptor estricto (process-batch). Offline: sin red ni bases de datos.
 * Escribe solo en --out: MANIFEST_REPORT.{json,md} y worksheets/*.md.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { informeManifiestosMd, procesarManifiestos } from '../../lib/legal-os/corpus-factory/evidence-manifest';

export interface ResultadoCli {
  codigo: number;
  mensaje: string;
}

const listarJson = (ruta: string): string[] =>
  statSync(ruta).isDirectory() ? readdirSync(ruta).filter((f) => f.endsWith('.json')).sort().map((f) => join(ruta, f)) : [ruta];

export function main(argv: readonly string[]): ResultadoCli {
  const i = argv.indexOf('--out');
  const out = resolve(i >= 0 && argv[i + 1] ? argv[i + 1] : 'docs/corpus/staging/manifiestos');
  const entrada = argv.find((a, k) => !a.startsWith('--') && argv[k - 1] !== '--out');
  if (!entrada) return { codigo: 2, mensaje: 'uso: process-manifests <directorio|manifiesto.json> [--out dir]' };
  if (!existsSync(entrada)) return { codigo: 2, mensaje: `no existe: ${entrada}` };
  const entradas = listarJson(entrada).map((f) => {
    try { return { archivo: basename(f), contenido: JSON.parse(readFileSync(f, 'utf8')) as unknown }; } catch { return { archivo: basename(f), contenido: null }; }
  });
  const r = procesarManifiestos(entradas);
  mkdirSync(join(out, 'worksheets'), { recursive: true });
  for (const [id, hoja] of Object.entries(r.hojas)) writeFileSync(join(out, 'worksheets', `${id.replace(/[^A-Za-z0-9_.@-]/g, '_')}.md`), hoja);
  writeFileSync(join(out, 'MANIFEST_REPORT.json'), `${JSON.stringify(r.evaluaciones.map((e) => ({ ...e, manifiesto: e.manifiesto ? { package_id: e.manifiesto.package_id, instrument_id: e.manifiesto.instrument_id, act_type: e.manifiesto.act_type } : null })), null, 2)}\n`);
  writeFileSync(join(out, 'MANIFEST_REPORT.md'), informeManifiestosMd(r));
  const rechazados = r.evaluaciones.filter((e) => e.estado === 'REJECTED').length;
  return { codigo: rechazados > 0 ? 1 : 0, mensaje: `${r.evaluaciones.length} manifiestos: ${r.evaluaciones.length - rechazados} NEEDS_SOURCE_BYTES, ${rechazados} rechazados; salida en ${out}` };
}

if (process.argv[1] && /process-manifests\.ts$/.test(process.argv[1])) {
  const r = main(process.argv.slice(2));
  console.log(r.mensaje);
  process.exitCode = r.codigo;
}
