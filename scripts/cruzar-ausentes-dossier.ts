/**
 * scripts/cruzar-ausentes-dossier.ts
 *
 * Cruza los hallazgos AUSENTE_EN_VERSION_LOCAL_CAUSA_NO_CONFIRMADA de
 * HUMAN_LEGAL_REVIEW_QUEUE.jsonl (Fase 1, Operación "Facultades Completas")
 * contra una lista de artículos derogados, y escribe el resultado del cruce
 * a un archivo de salida separado.
 *
 * Corrección de incidente (2026-08-27): una versión anterior de este script
 * escribió por error el resultado del cruce directamente sobre el archivo
 * fuente HUMAN_LEGAL_REVIEW_QUEUE.jsonl, sobrescribiendo sus 958 líneas
 * originales en el working tree de un worktree de solo-lectura (nunca se
 * comiteó -- restaurado con `git checkout --`, sin pérdida de datos, pero
 * fue un error real). Esta versión hace `--out` obligatorio y rechaza
 * explícitamente escribir sobre cualquier ruta que apunte al archivo fuente.
 *
 * Uso:
 *   npx tsx scripts/cruzar-ausentes-dossier.ts --source <ruta.jsonl> --out <ruta-salida.json>
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

export const NOMBRE_ARCHIVO_FUENTE_PROTEGIDO = 'HUMAN_LEGAL_REVIEW_QUEUE';

/**
 * Valida que la ruta de salida sea segura para escribir: nunca vacía, nunca
 * igual a la ruta fuente, nunca conteniendo el nombre del archivo fuente
 * protegido (blindaje adicional aunque la ruta no coincida byte a byte --
 * cubre el caso de rutas relativas/absolutas distintas que apuntan al mismo
 * archivo por nombre).
 *
 * Lanza un Error (nunca escribe) si la validación falla -- el CLI la
 * convierte en `process.exit(2)`; en pruebas se captura como excepción.
 */
export function validarRutaSalida(outPath: string | undefined, sourcePath: string): void {
  if (!outPath || outPath.trim() === '') {
    throw new Error('--out es obligatorio -- no se permite ejecutar sin ruta de salida explícita.');
  }
  const outResuelto = resolve(outPath);
  const sourceResuelto = resolve(sourcePath);
  if (outResuelto === sourceResuelto) {
    throw new Error(`--out no puede ser igual a --source (${sourcePath}). Se rechaza para no sobrescribir el archivo fuente.`);
  }
  if (outPath.includes(NOMBRE_ARCHIVO_FUENTE_PROTEGIDO)) {
    throw new Error(`--out no puede contener "${NOMBRE_ARCHIVO_FUENTE_PROTEGIDO}" en la ruta -- archivo fuente protegido contra escritura, sin importar la ruta exacta.`);
  }
}

interface HallazgoQueue {
  tipo: string;
  normId?: string;
  numArticulo?: string;
}

interface ResultadoCruce {
  candidatos: string[];
  incidente: string[];
  noExplicados: string[];
  totalAusentes: number;
  totalListaDerogacion: number;
}

export function cruzarAusentesContraLista(
  hallazgos: HallazgoQueue[],
  listaDerogacion: string[],
  articulosIncidente: string[] = ['1', '2'],
): ResultadoCruce {
  const setLista = new Set(listaDerogacion);
  const setIncidente = new Set(articulosIncidente);
  const ausentes = hallazgos.filter((h) => h.tipo === 'AUSENTE_EN_VERSION_LOCAL_CAUSA_NO_CONFIRMADA');

  const candidatos: string[] = [];
  const incidente: string[] = [];
  const noExplicados: string[] = [];

  for (const h of ausentes) {
    const art = h.numArticulo ?? '';
    if (setIncidente.has(art)) { incidente.push(art); continue; }
    if (setLista.has(art)) { candidatos.push(art); continue; }
    noExplicados.push(art);
  }

  return { candidatos, incidente, noExplicados, totalAusentes: ausentes.length, totalListaDerogacion: listaDerogacion.length };
}

function parsearArgs(argv: string[]): { source?: string; out?: string } {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--source') args.source = argv[++i];
    if (argv[i] === '--out') args.out = argv[++i];
  }
  return args;
}

function main() {
  const { source, out } = parsearArgs(process.argv.slice(2));

  if (!source) {
    console.error('Error: --source es obligatorio.');
    process.exit(2);
  }

  try {
    validarRutaSalida(out, source);
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : err);
    process.exit(2);
  }

  const hallazgos: HallazgoQueue[] = readFileSync(source, 'utf8')
    .trim()
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));

  // Lista del Art. 63, Decreto 102-2018 -- confirmada por el fundador (D10.2).
  const expandirRango = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => String(a + i));
  const listaDerogacion = [
    '119-B',
    '120', '120-A', '120-B', '120-C', '120-D',
    '121', '122', '123', '123-A', '123-B', '123-C', '123-D', '123-E', '123-F', '123-G', '123-H',
    ...expandirRango(124, 128),
    '130',
    ...expandirRango(132, 134),
    '136',
    ...expandirRango(139, 144),
    ...expandirRango(157, 159),
    ...expandirRango(161, 163),
    ...expandirRango(166, 168),
    ...expandirRango(173, 184),
  ];

  const resultado = cruzarAusentesContraLista(hallazgos, listaDerogacion);

  writeFileSync(out as string, JSON.stringify(resultado, null, 2));
  console.log(`DEROGADO_CANDIDATO: ${resultado.candidatos.length}`);
  console.log(`INCIDENTE_TECNICO: ${resultado.incidente.length}`);
  console.log(`SIN_EXPLICAR: ${resultado.noExplicados.length}`);
  console.log(`Total AUSENTE: ${resultado.totalAusentes}`);
  console.log(`Escrito en: ${out}`);
}

if (require.main === module) {
  main();
}
