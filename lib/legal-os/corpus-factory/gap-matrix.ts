/**
 * lib/legal-os/corpus-factory/gap-matrix.ts
 * Matriz de brechas del corpus: función pura de registros + materias del launch-core. AVAILABLE solo con pipeline completo y verificación humana.
 */
import { estaDisponible } from './pipeline';
import { MATERIAS_LAUNCH_CORE, type InstrumentRecord, type MateriaLaunch } from './schema';

export type EstadoBrecha = 'AVAILABLE' | 'PARTIAL' | 'OUTDATED' | 'MISSING' | 'PENDING_VERIFICATION';

export function estadoDeRegistro(r: InstrumentRecord): EstadoBrecha {
  if (r.presence === 'ABSENT_VERIFIED') return 'MISSING';
  if (estaDisponible(r)) return r.outdated ? 'OUTDATED' : 'AVAILABLE';
  if (r.presence === 'PRESENT') return r.outdated ? 'OUTDATED' : 'PARTIAL';
  return 'PENDING_VERIFICATION';
}

export interface FilaMatriz {
  materia: MateriaLaunch;
  estado: EstadoBrecha;
  registros: { id: string; title: string; estado: EstadoBrecha }[];
}

export function estadoDeMateria(estados: readonly EstadoBrecha[]): EstadoBrecha {
  if (estados.length === 0) return 'PENDING_VERIFICATION';
  if (estados.every((e) => e === 'AVAILABLE')) return 'AVAILABLE';
  if (estados.every((e) => e === 'MISSING')) return 'MISSING';
  if (estados.every((e) => e === 'PENDING_VERIFICATION')) return 'PENDING_VERIFICATION';
  if (estados.includes('OUTDATED') && !estados.includes('AVAILABLE')) return 'OUTDATED';
  return 'PARTIAL';
}

export function generarMatriz(registros: readonly InstrumentRecord[], materias: readonly MateriaLaunch[] = MATERIAS_LAUNCH_CORE): FilaMatriz[] {
  return materias.map((materia) => {
    const regs = registros.filter((r) => r.matter === materia).map((r) => ({ id: r.id, title: r.title, estado: estadoDeRegistro(r) }));
    return { materia, estado: estadoDeMateria(regs.map((x) => x.estado)), registros: regs };
  });
}

export function matrizAMarkdown(filas: readonly FilaMatriz[], fuente: string): string {
  const L = [
    '# CORPUS_GAP_MATRIX_HN (generada)',
    '',
    `Generada por \`npx tsx scripts/generate-corpus-gap-matrix.ts\` a partir de \`${fuente}\`. No edite a mano. \`AVAILABLE\` exige pipeline completo y verificación humana V4/V5; ningún dato se infiere.`,
    '',
    '| Materia | Estado | Instrumentos (estado) |',
    '|---|---|---|',
    ...filas.map((f) => `| ${f.materia} | ${f.estado} | ${f.registros.length ? f.registros.map((r) => `${r.title} (${r.estado})`).join('; ') : '— sin inventario'} |`),
    '',
    `Resumen: ${(['AVAILABLE', 'PARTIAL', 'OUTDATED', 'MISSING', 'PENDING_VERIFICATION'] as const).map((e) => `${e}=${filas.filter((f) => f.estado === e).length}`).join(' · ')}`,
  ];
  return `${L.join('\n')}\n`;
}
