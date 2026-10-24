/**
 * tools/corpus/process-batch.ts — receptor de lotes de Corpus Supply.
 *   npx tsx tools/corpus/process-batch.ts <directorio-de-paquetes|paquete.json> [--out docs/corpus/staging/<lote>]
 * Flujo: OfficialSourcePackage → hash/procedencia → segmentación → QA → candidato de staging → CLO_PENDING.
 * Offline: NO hace red, NO toca bases de datos ni el corpus. Escribe solo en --out: records.json (historial append-only),
 * candidates/*.json, worksheets/*.md (hojas para el CLO) y BATCH_REPORT.{json,md}. Nada queda verificado ni autoritativo.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { InstrumentRecordSchema, type InstrumentRecord } from '../../lib/legal-os/corpus-factory/schema';
import { informeLoteMd, procesarLote } from '../../lib/legal-os/corpus-factory/staging';

export interface ResultadoCli {
  codigo: number;
  mensaje: string;
}

function listarJson(ruta: string): string[] {
  return statSync(ruta).isDirectory() ? readdirSync(ruta).filter((f) => f.endsWith('.json')).sort().map((f) => join(ruta, f)) : [ruta];
}

export function main(argv: readonly string[]): ResultadoCli {
  const i = argv.indexOf('--out');
  const out = resolve(i >= 0 && argv[i + 1] ? argv[i + 1] : 'docs/corpus/staging/lote');
  const entrada = argv.find((a, k) => !a.startsWith('--') && argv[k - 1] !== '--out');
  if (!entrada) return { codigo: 2, mensaje: 'uso: process-batch <directorio|paquete.json> [--out dir]' };
  if (!existsSync(entrada)) return { codigo: 2, mensaje: `no existe: ${entrada}` };

  const entradas = listarJson(entrada).map((f) => {
    try {
      return { archivo: basename(f), contenido: JSON.parse(readFileSync(f, 'utf8')) as unknown };
    } catch {
      return { archivo: basename(f), contenido: null };
    }
  });

  mkdirSync(join(out, 'candidates'), { recursive: true });
  mkdirSync(join(out, 'worksheets'), { recursive: true });
  const rutaRecords = join(out, 'records.json');
  const previos: InstrumentRecord[] = existsSync(rutaRecords) ? (JSON.parse(readFileSync(rutaRecords, 'utf8')) as unknown[]).map((r) => InstrumentRecordSchema.parse(r)) : [];

  const r = procesarLote(entradas, previos);
  writeFileSync(rutaRecords, `${JSON.stringify(r.records, null, 2)}\n`);
  for (const c of r.candidatos) {
    const nombre = c.candidate_id.replace(/[^A-Za-z0-9_.@-]/g, '_');
    writeFileSync(join(out, 'candidates', `${nombre}.json`), `${JSON.stringify(c, null, 2)}\n`);
    writeFileSync(join(out, 'worksheets', `${nombre}.md`), r.hojas[c.candidate_id]);
  }
  writeFileSync(join(out, 'BATCH_REPORT.json'), `${JSON.stringify({ items: r.items.map((x) => ({ ...x, candidato: x.candidato ? { id: x.candidato.candidate_id, estado: x.candidato.estado } : null })) }, null, 2)}\n`);
  writeFileSync(join(out, 'BATCH_REPORT.md'), informeLoteMd(r));
  const rechazados = r.items.filter((x) => x.importacion === 'REJECTED').length;
  return { codigo: rechazados > 0 ? 1 : 0, mensaje: `${r.items.length} paquetes: ${r.candidatos.length} candidatos, ${rechazados} rechazados; salida en ${out}` };
}

if (process.argv[1] && /process-batch\.ts$/.test(process.argv[1])) {
  const r = main(process.argv.slice(2));
  console.log(r.mensaje);
  process.exitCode = r.codigo;
}
