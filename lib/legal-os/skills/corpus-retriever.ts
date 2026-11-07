/**
 * lib/legal-os/skills/corpus-retriever.ts
 * Recuperador del puente FIRAC sobre la RPC de solo lectura `resolver_articulo_exacto` (supabase/migrations/20261107010000_*).
 *
 * Este módulo NO verifica ni sella nada: solo trae filas y las anota con el MISMO clasificador CLO que usa la recuperación (`anotarFragmentosClo`).
 * Quien decide si un artículo queda respaldado es `corpus-bridge.ts` (R3: PRIMARY recalculado + vigente TRUE + mismo instrumento y artículo).
 *  - No confía en el hash almacenado: lo recalcula con `hashFragmento` sobre el contenido recibido.
 *  - `es_norma_vigente` viaja tal cual (null/false ⇒ el puente lo rechaza); aquí nunca se pone en true.
 *  - Un error de la RPC se propaga como excepción: el puente lo registra como RECUPERACION_FALLIDA (nunca se asume verificado).
 *  - La E/S está inyectada (`LlamadaRpc`): sin claves ni cliente en este archivo; el llamador usa el cliente de servidor existente.
 */
import { anotarFragmentosClo, normalizarNumeroArticulo } from '../../legal-retrieval/clo-guards';
import { hashFragmento } from '../../legal-retrieval/primitives';
import type { FragmentoRAG } from '../../legal-retrieval/types';
import type { Recuperador } from './corpus-bridge';

export const RPC_RESOLVER_ARTICULO = 'resolver_articulo_exacto';

export type FilaResolucion = {
  id: string;
  coleccion: string | null;
  materia: string | null;
  contenido: string;
  num_articulo: string | null;
  fuente: string | null;
  fuente_tipo: string | null;
  jurisdiccion: string | null;
  es_norma_vigente: boolean | null;
  hash_contenido?: string | null;
  ingest_batch?: string | null;
};

/** Llamada a la RPC (p. ej. `(fn, args) => supabase.rpc(fn, args)`); se inyecta para no hacer E/S aquí. */
export type LlamadaRpc = (
  fn: typeof RPC_RESOLVER_ARTICULO,
  args: { p_instrumento_id: string; p_num_articulo_norm: string; p_limite: number },
) => PromiseLike<{ data: readonly FilaResolucion[] | null; error: { message: string } | null }>;

export function crearRecuperadorRpc(llamar: LlamadaRpc, limite = 5): Recuperador {
  return async ({ instrumentId, articulo }) => {
    const norm = normalizarNumeroArticulo(articulo);
    if (norm === null) return [];
    const { data, error } = await llamar(RPC_RESOLVER_ARTICULO, { p_instrumento_id: instrumentId, p_num_articulo_norm: norm, p_limite: limite });
    if (error) throw new Error(`resolver_articulo_exacto: ${error.message}`);
    const filas = Array.isArray(data) ? data : [];
    const fragmentos: FragmentoRAG[] = filas.map((r) => ({
      id: r.id,
      contenido: r.contenido,
      num_articulo: r.num_articulo,
      fuente: r.fuente ?? '',
      relevancia: 1,
      fuente_tipo: r.fuente_tipo,
      jurisdiccion: r.jurisdiccion,
      es_norma_vigente: r.es_norma_vigente,
      materia: r.materia,
      instrumento_solicitado: instrumentId,
      ...(r.coleccion ? { coleccion_origen: r.coleccion } : {}),
      hash: hashFragmento({ contenido: r.contenido, num_articulo: r.num_articulo, fuente: r.fuente ?? '' }),
    }));
    return anotarFragmentosClo(fragmentos);
  };
}
