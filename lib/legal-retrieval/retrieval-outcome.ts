/**
 * lib/legal-retrieval/retrieval-outcome.ts
 * Retrieval v3 — Fase 1D: PRIMER CAMBIO DE COMPORTAMIENTO AUTORIZADO.
 *
 * Resuelve el hallazgo central de MAYALEX_RETRIEVAL_RUNTIME_CONTRACT.md §0:
 * hoy `ResultadoRAG.fragmentos.length === 0` colapsa 5 situaciones distintas
 * (artículo inexistente, fallo de Supabase, fallo de HuggingFace, RAG mal
 * configurado, semántica exitosa sin evidencia válida) en la misma
 * abstención, sin que nadie -- ni el usuario, ni Langfuse -- pueda
 * distinguirlas. Invariante central: NO_VERIFIED_EVIDENCE != RETRIEVAL_FAILED.
 *
 * Alcance estricto de esta fase (autorizado): crear este archivo, extender
 * lib/legal-retrieval/types.ts, y modificar lib/rag/search.ts /
 * app/api/chat/route.ts SOLO lo necesario para cablear los nuevos estados.
 * NO se tocó lib/legal-retrieval/{exact-resolver,semantic-retriever,
 * evidence-engine}.ts, lib/rag/embed.ts ni lib/rag/rerank.ts -- por eso
 * `degraded` (ver types.ts) no puede detectarse de forma segura todavía para
 * la ruta semántica, y la clasificación de errores de Supabase/HF se hace
 * por el prefijo textual estable de sus mensajes actuales (ya existentes,
 * sin modificar esos archivos), no por una excepción tipada emitida desde
 * dentro de ellos.
 *
 * OFFICIAL_FALLBACK_REQUIRED es un ESTADO, no una ejecución: esta fase NO
 * implementa ningún adapter de fuente oficial ni llama a Tavily
 * automáticamente para rescatar corpus vacío (Gap G de Fase 1B.5 permanece
 * intencionalmente sin resolver -- ver MAYALEX_RETRIEVAL_RUNTIME_CONTRACT.md
 * §10 de la directiva de esta fase).
 */

import type { RetrievalOutcome, RetrievalExecutionState, RetrievalErrorCategory } from './types';

/**
 * Construye un RetrievalOutcome con defaults explícitos -- evita repetir los
 * 4 campos obligatorios en cada call site de lib/rag/search.ts.
 */
export function buildRetrievalOutcome(
  state: RetrievalExecutionState,
  opts: Partial<Omit<RetrievalOutcome, 'state'>> = {},
): RetrievalOutcome {
  const outcome: RetrievalOutcome = {
    state,
    evidenceCount: opts.evidenceCount ?? 0,
    exactAttempted: opts.exactAttempted ?? false,
    semanticAttempted: opts.semanticAttempted ?? false,
    degraded: opts.degraded ?? false,
  };
  if (opts.errorCategory) outcome.errorCategory = opts.errorCategory;
  if (opts.errorCode) outcome.errorCode = opts.errorCode;
  return outcome;
}

/**
 * Códigos seguros para telemetría (§6 de la directiva) -- nunca el mensaje
 * crudo de Supabase/HF (que puede incluir detalles de host/infraestructura),
 * nunca contenido de la consulta.
 */
const CODIGOS_SEGUROS: Record<RetrievalErrorCategory, string> = {
  CONFIGURATION: 'RAG_DISABLED',
  EMBEDDING: 'EMBEDDING_UNAVAILABLE',
  DATABASE: 'DATABASE_RETRIEVAL_FAILED',
  NETWORK: 'UNKNOWN_RETRIEVAL_FAILURE',
  UNKNOWN: 'UNKNOWN_RETRIEVAL_FAILURE',
};

export function safeErrorCode(category: RetrievalErrorCategory): string {
  return CODIGOS_SEGUROS[category];
}

/**
 * Clasifica un error real de retrieval (ya capturado por buscarRAG) en una
 * categoría segura, SIN modificar embed.ts/semantic-retriever.ts para que
 * lancen una excepción tipada -- se usa el prefijo textual estable que esos
 * módulos YA emiten hoy (verificado contra su código fuente vigente, no
 * supuesto):
 *   - buscarEnSupabase (semantic-retriever.ts) lanza literalmente
 *     `Supabase RAG error: ${normal.error.message}` cuando la RPC falla.
 *   - embedQuery (embed.ts) lanza mensajes que siempre contienen "HF" (p.ej.
 *     "HF_API_TOKEN no configurada...", "HF Inference: ...") -- ambos
 *     orígenes posibles de fallo de embedding.
 *   - buscarEnPython (este mismo archivo, lib/rag/search.ts) lanza
 *     `Python RAG error ${status}: ...` para errores HTTP, o un
 *     AbortError/TypeError de fetch para fallos de red/timeout -- ambos se
 *     tratan como NETWORK.
 * Cualquier mensaje que no matchee ninguno de estos patrones se clasifica
 * como UNKNOWN -- nunca se inventa una categoría más específica de la que la
 * evidencia textual permite.
 */
export function classifyRetrievalError(mensaje: string, backend: 'python' | 'supabase' | 'disabled'): RetrievalErrorCategory {
  if (mensaje.startsWith('Supabase RAG error:')) return 'DATABASE';
  if (/\bHF[\s_]/.test(mensaje) || mensaje.includes('HF Inference') || mensaje.includes('HF_API_TOKEN')) return 'EMBEDDING';
  if (backend === 'python') return 'NETWORK';
  return 'UNKNOWN';
}

// ─────────────────────────────────────────────────────────────────────────────
// MENSAJES DE USUARIO — CASE 4 / CASE 5 (app/api/chat/route.ts, §9)
// ─────────────────────────────────────────────────────────────────────────────
// Distintos, a propósito, de MENSAJE_ABSTENCION_CORPUS (evidence-engine.ts):
// ese mensaje sigue siendo el correcto para NO_VERIFIED_EVIDENCE/
// OFFICIAL_FALLBACK_REQUIRED (el corpus funcionó, simplemente no tenía nada
// verificable). Estos dos son para cuando el propio sistema de retrieval NO
// pudo ejecutarse de forma confiable -- nunca deben presentarse como si el
// derecho no existiera.

export const MENSAJE_CONFIGURACION_NO_DISPONIBLE =
  'No fue posible consultar temporalmente la biblioteca jurídica de MayaLex. ' +
  'Para evitar una respuesta sin respaldo verificable, la consulta no será respondida en este momento.';

export const MENSAJE_RETRIEVAL_ERROR =
  'No fue posible completar la consulta de las fuentes jurídicas en este momento. ' +
  'MayaLex no responderá sin respaldo verificable.';
