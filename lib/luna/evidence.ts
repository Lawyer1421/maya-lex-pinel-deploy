/**
 * lib/luna/evidence.ts
 * Evidencia AUTORIZADA para Luna. NO define reglas jurídicas propias: consume el clasificador compartido del PR #106
 * (`clasificarFragmentoClo`: vigencia TRUE/FALSE/NULL, desplazamiento/derogación, identidad de instrumento y artículo, jurisdicción,
 * bloqueos CLO). Solo un fragmento PRIMARY sale hacia el proveedor externo; CONTEXT nunca sale. La clasificación se recalcula aquí:
 * no se confía en un `rol_evidencia` que venga en el fragmento. Solo lectura: nunca modifica, reclasifica ni reindexa el corpus.
 *
 * Suficiencia: este módulo NO declara suficiencia. Un conteo de PRIMARY no basta; la suficiencia la da el estado de recuperación
 * (EXACT/SEMANTIC_SUCCESS) más una claim con respaldo DIRECT validado (ver engine.ts).
 */
import { clasificarFragmentoClo, type ContextoClasificacion } from '../legal-retrieval/clo-guards';
import type { FragmentoRAG } from '../legal-retrieval/types';
import type { EvidenceChunk } from '../ai-gateway/shadow/types';

export interface EvidenciaAutorizada {
  evidencia: EvidenceChunk[];
  /** Cantidad de fragmentos recuperados que NO se enviarán (CONTEXT, sin id, duplicados o fuera del tope). */
  omitidos: number;
}

export function autorizarEvidencia(fragmentos: readonly FragmentoRAG[], maxEvidencias: number, ctx: ContextoClasificacion = {}): EvidenciaAutorizada {
  const lista = Array.isArray(fragmentos) ? fragmentos : [];
  const vistos = new Set<string>();
  const chunks: EvidenceChunk[] = [];
  for (const f of lista) {
    if (clasificarFragmentoClo(f, ctx).rol !== 'PRIMARY') continue;
    // El id es la única forma de citar y de reconstruir la cita validada: sin id no hay chunk.
    if (typeof f.id !== 'string' || f.id.trim() === '' || vistos.has(f.id)) continue;
    vistos.add(f.id);
    chunks.push({
      chunk_id: f.id,
      instrumento: f.fuente,
      articulo: f.num_articulo || null,
      gaceta: null,
      rol: 'PRIMARY',
      clasificacionProduccion: 'NORMA_VIGENTE_HONDURAS',
      citable: true,
      texto: f.contenido,
    });
  }
  const tope = chunks.slice(0, Math.max(0, maxEvidencias));
  return { evidencia: tope, omitidos: lista.length - tope.length };
}
