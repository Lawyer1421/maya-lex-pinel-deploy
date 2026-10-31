/**
 * lib/luna/citas.ts
 * Citas del evento SSE final: SOLO las que Luna validó (cita DIRECT a un fragmento PRIMARY dentro de una claim que superó el
 * validador), convertidas al contrato de citas del frontend (`Cita`) con la misma función que usa producción. Un fragmento
 * recuperado que Luna no citó, o que citó una claim descartada, no aparece.
 */
import { construirCitas, type Cita } from '../legal-retrieval/evidence-engine';
import type { FragmentoRAG } from '../legal-retrieval/types';

export function citasValidadasDeLuna(fragmentos: readonly FragmentoRAG[], chunkIdsValidados: readonly string[]): Cita[] {
  const ids = new Set(chunkIdsValidados);
  if (ids.size === 0) return [];
  return construirCitas(fragmentos.filter((f) => typeof f.id === 'string' && ids.has(f.id)));
}
