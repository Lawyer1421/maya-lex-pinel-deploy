/**
 * lib/legal-retrieval/primitives.ts
 * Retrieval v3 — Fase 1A.1: ruptura de dependencia circular.
 *
 * Movidas 1:1 desde lib/rag/search.ts, sin cambio de implementación: hash
 * corto y determinista de un fragmento (trazabilidad en UI, P0-4) y el
 * filtro de artefactos de anonimización sin limpiar. Antes vivían en
 * search.ts y exact-resolver.ts las importaba desde ahí -- eso cerraba un
 * ciclo (search.ts -> exact-resolver.ts -> search.ts). Ahora son primitivas
 * puras sin dependencia de search.ts ni de exact-resolver.ts; search.ts las
 * re-exporta para mantener la superficie pública histórica.
 */

import { createHash } from 'crypto';
import type { FragmentoRAG } from './types';

/** Hash corto y determinista de un fragmento, para trazabilidad en UI (P0-4). */
export function hashFragmento(f: Pick<FragmentoRAG, 'contenido' | 'num_articulo' | 'fuente'>): string {
  return createHash('sha256')
    .update(`${f.contenido}|${f.num_articulo ?? ''}|${f.fuente}`)
    .digest('hex')
    .slice(0, 8);
}

const PATRON_ANONIMIZACION_SIN_LIMPIAR = /\[(Cliente|Empresa)_An[oó]nimo|Tel[eé]fono_Oculto|Expediente_Anonimizado\]/;

export function contieneArtefactoAnonimizacion(contenido: string): boolean {
  return PATRON_ANONIMIZACION_SIN_LIMPIAR.test(contenido);
}
