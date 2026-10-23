/**
 * tools/corpus/import-official-source-package.ts
 * CLI offline: valida paquetes de fuente oficial (OfficialSourcePackage) y los convierte en registros del Corpus Factory.
 *   npx tsx tools/corpus/import-official-source-package.ts <paquete.json|directorio> [--out docs/corpus/imports]
 * NO hace red, NO toca bases de datos. Escribe solo en --out: records.json (historial append-only), IMPORT_REPORT.json y IMPORT_REPORT.md.
 * Importar no otorga autoridad: sigue CORPUS_QA → CLO → V4/V5.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { InstrumentRecordSchema, type InstrumentRecord } from '../../lib/legal-os/corpus-factory/schema';
import { importarPaquetes, informeImportacionMd } from '../../lib/legal-os/corpus-factory/import-package';

export interface ResultadoCli {
  codigo: number;
  mensaje: string;
}

function listarJson(ruta: string): string[] {
  const s = statSync(ruta);
  if (s.isDirectory()) return readdirSync(ruta).filter((f) => f.endsWith('.json')).sort().map((f) => join(ruta, f));
  return [ruta];
}

export function main(argv: readonly string[]): ResultadoCli {
  const i = argv.indexOf('--out');
  const out = resolve(i >= 0 && argv[i + 1] ? argv[i + 1] : 'docs/corpus/imports');
  const entrada = argv.find((a, k) => !a.startsWith('--') && argv[k - 1] !== '--out');
  if (!entrada) return { codigo: 2, mensaje: 'uso: import-official-source-package <paquete.json|directorio> [--out dir]' };
  if (!existsSync(entrada)) return { codigo: 2, mensaje: `no existe: ${entrada}` };

  const entradas = listarJson(entrada).map((f) => {
    try {
      return { archivo: basename(f), contenido: JSON.parse(readFileSync(f, 'utf8')) as unknown };
    } catch {
      return { archivo: basename(f), contenido: null };
    }
  });

  mkdirSync(out, { recursive: true });
  const ruta = join(out, 'records.json');
  const previos: InstrumentRecord[] = existsSync(ruta) ? (JSON.parse(readFileSync(ruta, 'utf8')) as unknown[]).map((r) => InstrumentRecordSchema.parse(r)) : [];

  const lote = importarPaquetes(entradas, previos);
  writeFileSync(ruta, `${JSON.stringify(lote.records, null, 2)}\n`);
  writeFileSync(join(out, 'IMPORT_REPORT.json'), `${JSON.stringify({ items: lote.items, jurisprudencia: lote.jurisprudencia }, null, 2)}\n`);
  writeFileSync(join(out, 'IMPORT_REPORT.md'), informeImportacionMd(lote));
  const rechazados = lote.items.filter((x) => x.estado === 'REJECTED').length;
  return { codigo: rechazados > 0 ? 1 : 0, mensaje: `${lote.items.length} paquetes: ${rechazados} rechazados; informe en ${out}` };
}

if (process.argv[1] && /import-official-source-package\.ts$/.test(process.argv[1])) {
  const r = main(process.argv.slice(2));
  console.log(r.mensaje);
  process.exitCode = r.codigo;
}
