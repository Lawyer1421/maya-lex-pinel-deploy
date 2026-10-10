import { detectarArticuloExacto, detectarInstrumentoDesdeTexto, detectarMateriaDesdeTexto, resolverArticuloExacto, type FilaExactaDB, type ResultadoExacto } from '@/lib/legal-retrieval/exact-resolver';
import type { FragmentoRAG } from '@/lib/legal-retrieval/types';
import { aFilaExacta } from '@/lib/legal-retrieval/lab/exact-lab';
import type { LabRow } from '@/lib/legal-retrieval/lab/types';

/**
 * Overlay exacto tri-estado (V1.1, sólo evaluación). NO modifica el resolvedor
 * de producción ni Variante A. Orden: TRUE → UNKNOWN → FALSE.
 * UNKNOWN puede localizarse por identidad exacta; nunca es PRIMARY por sí solo.
 */

export type EstadoExactoV11 = 'EXACT_TRUE' | 'EXACT_UNKNOWN' | 'EXACT_FALSE' | 'NO_ARTICLE' | 'AMBIGUOUS' | 'ABSTAIN' | 'MISS';

export interface ResultadoExactoV11 {
  estado: EstadoExactoV11;
  fragmento: FragmentoRAG | null;
  vigencia: 'TRUE' | 'UNKNOWN' | 'FALSE' | null;
}

export function resolverExactoV11(texto: string, filas: readonly LabRow[]): ResultadoExactoV11 {
  const det = detectarArticuloExacto(texto);
  if (!det) return { estado: 'NO_ARTICLE', fragmento: null, vigencia: null };

  const materia = detectarMateriaDesdeTexto(texto);
  const candidatas = (vigencia: boolean | null): FilaExactaDB[] =>
    filas
      .filter(
        (f) =>
          f.num_articulo === det.numero &&
          f.fuente_tipo === 'codigo' &&
          f.revision_pendiente !== true &&
          f.es_norma_vigente === vigencia &&
          (materia === null || f.materia === materia),
      )
      .map(aFilaExacta);

  const resolver = (rows: FilaExactaDB[]): ResultadoExacto => resolverArticuloExacto(rows, det.numero, det.instrumento);
  const pasos: { estado: EstadoExactoV11; vigencia: 'TRUE' | 'UNKNOWN' | 'FALSE'; filas: FilaExactaDB[] }[] = [
    { estado: 'EXACT_TRUE', vigencia: 'TRUE', filas: candidatas(true) },
    { estado: 'EXACT_UNKNOWN', vigencia: 'UNKNOWN', filas: candidatas(null) },
    { estado: 'EXACT_FALSE', vigencia: 'FALSE', filas: candidatas(false) },
  ];
  for (const paso of pasos) {
    const r = resolver(paso.filas);
    if (r.fragmentos.length > 0) return { estado: paso.estado, fragmento: r.fragmentos[0], vigencia: paso.vigencia };
    if (r.ambiguo) return { estado: 'AMBIGUOUS', fragmento: null, vigencia: null };
  }
  if (materia || detectarInstrumentoDesdeTexto(texto)) return { estado: 'ABSTAIN', fragmento: null, vigencia: null };
  return { estado: 'MISS', fragmento: null, vigencia: null };
}
