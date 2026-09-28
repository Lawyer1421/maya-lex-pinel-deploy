/**
 * MAYA PENAL — RAG Search
 * =======================
 * Búsqueda semántica del CPP Honduras.
 *
 * Modos soportados (configurable por RAG_BACKEND en .env.local):
 *
 *  'python'   → Llama al microservicio FastAPI local (python-rag/api_fastapi.py)
 *               Útil durante desarrollo local antes de provisionar Supabase.
 *               Requiere: uvicorn api_fastapi:app --port 8100
 *
 *  'supabase' → Búsqueda vectorial en Supabase pgvector (producción)
 *               Requiere: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 *  'disabled' → Sin RAG (solo el system prompt y normas-cpp.ts)
 *               Modo actual mientras Supabase no está provisionado.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS Y PRIMITIVAS — Retrieval v3, Fase 1A.1 / 1B
// ─────────────────────────────────────────────────────────────────────────────
// FragmentoRAG, ResultadoRAG, hashFragmento y contieneArtefactoAnonimizacion
// se movieron a lib/legal-retrieval/{types,primitives}.ts (extracción 1:1,
// sin cambio de forma/comportamiento -- ver MAYALEX_RETRIEVAL_V3_ARCHITECTURE.md).
// ResultadoRAG se movió en Fase 1B porque semantic-retriever.ts la necesita
// como tipo de retorno y no puede importarla de vuelta desde este archivo sin
// reabrir el ciclo cerrado en Fase 1A.1. Se importan aquí para uso interno de
// este archivo y se re-exportan para que los consumidores actuales (route.ts,
// tests) no requieran ningún cambio.
import type { FragmentoRAG, ResultadoRAG } from '@/lib/legal-retrieval/types';
import { hashFragmento, contieneArtefactoAnonimizacion } from '@/lib/legal-retrieval/primitives';
import { buscarEnSupabase, esRegistroNoVigenteExcluido, seleccionarFinal } from '@/lib/legal-retrieval/semantic-retriever';
// Fase 1C: FUENTES_DOCTRINALES, formatearContextoRAG, requiereEvidenciaCorpus,
// CORPUS_EVIDENCE_NOT_FOUND y MENSAJE_ABSTENCION_CORPUS se movieron a
// evidence-engine.ts (extracción 1:1, sin cambio de comportamiento -- ver
// MAYALEX_RETRIEVAL_V3_ARCHITECTURE.md y MAYALEX_RETRIEVAL_RUNTIME_CONTRACT.md).
import {
  FUENTES_DOCTRINALES,
  formatearContextoRAG,
  requiereEvidenciaCorpus,
  CORPUS_EVIDENCE_NOT_FOUND,
  MENSAJE_ABSTENCION_CORPUS,
} from '@/lib/legal-retrieval/evidence-engine';

export type { FragmentoRAG, ResultadoRAG };
export { hashFragmento, contieneArtefactoAnonimizacion, esRegistroNoVigenteExcluido, seleccionarFinal };
export { FUENTES_DOCTRINALES, formatearContextoRAG, requiereEvidenciaCorpus, CORPUS_EVIDENCE_NOT_FOUND, MENSAJE_ABSTENCION_CORPUS };

// Fase 1D — MAYALEX_RETRIEVAL_RUNTIME_CONTRACT.md. buscarRAG() construye un
// RetrievalOutcome en cada camino de retorno (ver más abajo); esta lógica de
// construcción/clasificación vive en retrieval-outcome.ts, no inline aquí,
// para que sea unitariamente testeable sin mockear Supabase/HF.
import { buildRetrievalOutcome, classifyRetrievalError, safeErrorCode } from '@/lib/legal-retrieval/retrieval-outcome';
export { buildRetrievalOutcome, classifyRetrievalError, safeErrorCode };
export type { RetrievalOutcome, RetrievalExecutionState, RetrievalErrorCategory } from '@/lib/legal-retrieval/types';

// ─────────────────────────────────────────────────────────────────────────────
// RECUPERACIÓN DETERMINISTA POR ARTÍCULO EXACTO — Retrieval v3, Fase 1A
// ─────────────────────────────────────────────────────────────────────────────
// Extraído 1:1 (sin cambio de comportamiento) a lib/legal-retrieval/exact-resolver.ts
// -- ver MAYALEX_RETRIEVAL_V3_ARCHITECTURE.md secciones E/F. Se importa aquí
// para uso interno de este archivo (buscarArticuloExacto/consultarPorVigencia,
// más abajo, y detectarMateriaDesdeTexto en buscarRAG) y se re-exporta para
// que los consumidores actuales (route.ts, tests) no requieran ningún cambio
// de import -- misma API pública, mismo comportamiento.
import {
  detectarMateriaDesdeTexto,
  detectarMateriaSemanticaAmpliada,
  detectarInstrumentoDesdeTexto,
  detectarArticuloExacto,
  identidadDocumentalCoincide,
  tieneEncabezadoArticulo,
  tieneIdentidadSinEncabezado,
  resolverArticuloExacto,
  type InstrumentoNormalizado,
  type DeteccionArticulo,
  type FilaExactaDB,
  type ResultadoExacto,
} from '@/lib/legal-retrieval/exact-resolver';

export {
  detectarMateriaDesdeTexto,
  detectarMateriaSemanticaAmpliada,
  detectarInstrumentoDesdeTexto,
  detectarArticuloExacto,
  identidadDocumentalCoincide,
  tieneEncabezadoArticulo,
  tieneIdentidadSinEncabezado,
  resolverArticuloExacto,
  type InstrumentoNormalizado,
  type DeteccionArticulo,
  type FilaExactaDB,
  type ResultadoExacto,
};
async function consultarPorVigencia(
  numero: string,
  materiaDetectada: string | null,
  esNormaVigente: boolean,
): Promise<FilaExactaDB[]> {
  const { createServerSupabaseClient } = await import('@/lib/supabase');
  const supabase = createServerSupabaseClient();

  let consulta = supabase
    .from('biblioteca_vectores')
    .select('id, contenido, num_articulo, fuente, fuente_tipo, jurisdiccion, es_norma_vigente, materia, metadata')
    .eq('num_articulo', numero)
    .eq('fuente_tipo', 'codigo')
    .eq('es_norma_vigente', esNormaVigente)
    .eq('revision_pendiente', false);

  // Filtro de materia: solo optimiza la consulta a la DB (menos filas a
  // traer) — la aceptación real la decide identidadDocumentalCoincide() en
  // resolverArticuloExacto, nunca la materia por sí sola.
  if (materiaDetectada) consulta = consulta.eq('materia', materiaDetectada);

  const { data, error } = await consulta;
  if (error || !data) return [];
  return data as FilaExactaDB[];
}

export async function buscarArticuloExacto(
  numero: string,
  materiaDetectada: string | null,
  instrumentoSolicitado: InstrumentoNormalizado | null,
): Promise<ResultadoExacto> {
  const filasVigentes = await consultarPorVigencia(numero, materiaDetectada, true);
  const resultadoVigente = resolverArticuloExacto(filasVigentes, numero, instrumentoSolicitado);
  if (resultadoVigente.fragmentos.length > 0 || resultadoVigente.ambiguo) {
    return resultadoVigente;
  }

  // GAP 2 (Operación "Facultades Completas", 2026-08-28): si no hay ningún
  // artículo vigente con ese número, se intenta un segundo paso -- solo
  // artículos CONFIRMADOS no vigentes (ej. derogados, con evidencia textual
  // directa de fuente -- nunca inferidos). Reutiliza exactamente la misma
  // función de resolución (mismos tres filtros: anonimización, encabezado
  // real, identidad de instrumento) -- ningún criterio se relaja para este
  // camino. El resultado NUNCA se presenta como norma vigente: construirCitas
  // ya exige es_norma_vigente===true para entrar a la lista de citas, y
  // formatearContextoRAG ya etiqueta este patrón exacto como
  // "[NO VIGENTE — NO CITAR COMO NORMA]" (D6a-bis). Este paso es
  // deliberadamente distinto de la exclusión de D6(b): esa protege contra
  // que un artículo derogado se cuele por similitud semántica sin que el
  // usuario lo haya pedido; esto responde de forma honesta cuando el usuario
  // SÍ preguntó explícitamente por ese número exacto -- "fue derogado" es
  // información real, no una alucinación.
  const filasNoVigentes = await consultarPorVigencia(numero, materiaDetectada, false);
  return resolverArticuloExacto(filasNoVigentes, numero, instrumentoSolicitado);
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────

type BackendRAG = 'python' | 'supabase' | 'disabled';

/**
 * P0-2B: RAG_BACKEND ausente en un entorno (a diferencia de 'disabled'
 * explícito) apagaba el RAG por completo en silencio — el chat seguía
 * respondiendo, sin ningún error visible, simplemente sin corpus ni citas.
 * Un olvido de configuración no debe comportarse igual que una decisión
 * deliberada de desactivar el RAG: si las credenciales de Supabase existen,
 * se usa el backend real; 'disabled' sigue respetándose cuando es explícito.
 */
export function getBackend(): BackendRAG {
  const val = process.env.RAG_BACKEND as BackendRAG | undefined;
  if (val && ['python', 'supabase', 'disabled'].includes(val)) return val;

  const tieneSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
  return tieneSupabase ? 'supabase' : 'disabled';
}

const PYTHON_RAG_URL = process.env.PYTHON_RAG_URL ?? 'http://localhost:8100';

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND: PYTHON FASTAPI (desarrollo local)
// ─────────────────────────────────────────────────────────────────────────────

async function buscarEnPython(
  consulta: string,
  k: number,
  coleccion: string,
  materia?: string,
): Promise<ResultadoRAG> {
  const response = await fetch(`${PYTHON_RAG_URL}/buscar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consulta, k, coleccion, materia: materia ?? null }),
    // Timeout razonable — la búsqueda vectorial es rápida
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'Error desconocido');
    throw new Error(`Python RAG error ${response.status}: ${err}`);
  }

  const data = await response.json() as {
    fragmentos: FragmentoRAG[];
    articulos_encontrados: string[];
  };

  return {
    fragmentos: data.fragmentos.map((f) => ({ ...f, hash: f.hash ?? hashFragmento(f) })),
    articulos_encontrados: data.articulos_encontrados,
    backend: 'python',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca fragmentos normativos relevantes para una consulta.
 * Elige automáticamente el backend según RAG_BACKEND en .env.local.
 *
 * @param consulta - Texto de la pregunta jurídica
 * @param k - Número de fragmentos a recuperar (default 5)
 * @param coleccion - Colección ChromaDB (ej. 'mayalex_normativos')
 * @param materia - Filtro por metadato materia (ej. '01_PENAL') — garantiza
 *                  aislamiento anti-contaminación dentro de colecciones mixtas
 */
export async function buscarRAG(
  consulta: string,
  k = 5,
  coleccion = 'cpp_honduras',
  materia?: string,
  opts?: { rerank?: boolean },
): Promise<ResultadoRAG> {
  const backend = getBackend();

  if (backend === 'disabled') {
    // Fase 1D: buscarRAG no sabe si ESTE caller exige evidencia -- esa es
    // una decisión de ruta/modo que vive en route.ts (§5A de la directiva:
    // "Do NOT decide route-level requirement inside low-level semantic
    // code"). Se reporta CONFIGURATION_ERROR siempre que no hubo retrieval
    // por configuración; quien no lo necesitaba simplemente nunca llega a
    // invocar buscarRAG en el flujo actual (ver app/api/chat/route.ts,
    // ragPromise: los modos sin router activo retornan antes de este punto).
    return {
      fragmentos: [], articulos_encontrados: [], backend: 'disabled',
      outcome: buildRetrievalOutcome('CONFIGURATION_ERROR', {
        errorCategory: 'CONFIGURATION', errorCode: safeErrorCode('CONFIGURATION'),
      }),
    };
  }

  // exactoIntentado: true en cuanto se detecta un número de artículo y se
  // entra a la ruta determinista, incluso si termina fallando y degradando a
  // semántica (catch de abajo) -- el outcome final debe reflejar que SÍ se
  // intentó, no solo si tuvo éxito.
  let exactoIntentado = false;

  // Recuperación exacta por artículo — prioridad sobre la semántica.
  // No requiere HF_API_TOKEN (no genera embedding), así que sigue
  // funcionando aunque la búsqueda semántica esté degradada. Si detecta
  // ambigüedad entre instrumentos con el mismo número, NO cae en
  // silencio a la semántica (que podría citar el instrumento equivocado)
  // — deja constancia explícita vía `ambiguo` para que el caller decida
  // abstenerse.
  if (backend === 'supabase') {
    const deteccion = detectarArticuloExacto(consulta);
    if (deteccion) {
      exactoIntentado = true;
      try {
        const materiaEfectiva = deteccion.materiaDetectada ?? materia ?? null;
        const exacto = await buscarArticuloExacto(deteccion.numero, materiaEfectiva, deteccion.instrumento);
        if (exacto.ambiguo) {
          // Regla K (MAYALEX_RETRIEVAL_RUNTIME_CONTRACT.md): ambigüedad ->
          // NO_VERIFIED_EVIDENCE, NUNCA contaminación semántica.
          return {
            fragmentos: [], articulos_encontrados: [], backend: 'supabase', ambiguo: true,
            outcome: buildRetrievalOutcome('NO_VERIFIED_EVIDENCE', { exactAttempted: true }),
          };
        }
        if (exacto.fragmentos.length > 0) {
          return {
            fragmentos: exacto.fragmentos,
            articulos_encontrados: [deteccion.numero],
            backend: 'supabase',
            outcome: buildRetrievalOutcome('EXACT_SUCCESS', {
              evidenceCount: exacto.fragmentos.length, exactAttempted: true,
            }),
          };
        }
        // Sin candidato exacto válido. Si el usuario identificó la materia
        // (penal/civil) O el instrumento específico (CPP, Código Penal,
        // Código de Trabajo, etc.), no se cae a semántica amplia — podría
        // citar un artículo de un instrumento distinto con el mismo número,
        // o un fragmento mal segmentado; la búsqueda semántica tampoco filtra
        // por instrumento, así que no puede sustituir la identidad exacta que
        // el usuario pidió. Se abstiene. Si el número vino totalmente
        // desnudo ("Artículo 173" a secas, sin materia ni instrumento), sí se
        // permite el fallback semántico — comportamiento previo, ya validado.
        if (deteccion.materiaDetectada || deteccion.instrumento) {
          // Regla C: instrumento/artículo explícito sin candidato válido ->
          // NO_VERIFIED_EVIDENCE (ej. Art. 9999 CPP), NUNCA RETRIEVAL_ERROR.
          return {
            fragmentos: [], articulos_encontrados: [], backend: 'supabase',
            outcome: buildRetrievalOutcome('NO_VERIFIED_EVIDENCE', { exactAttempted: true }),
          };
        }
      } catch (error) {
        console.warn(
          '[RAG] Búsqueda exacta falló, degradando a semántica:',
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  // Guardia de producción: en Vercel no existe localhost — si RAG_BACKEND=python
  // apunta a localhost, degradar a disabled en vez de esperar el timeout de 8s
  // en CADA consulta.
  if (
    backend === 'python' &&
    process.env.VERCEL === '1' &&
    /localhost|127\.0\.0\.1/.test(PYTHON_RAG_URL)
  ) {
    console.warn(
      '[RAG] RAG_BACKEND=python con PYTHON_RAG_URL=localhost en Vercel — RAG deshabilitado. ' +
      'Configura RAG_BACKEND=disabled (o supabase) en las env vars de Vercel.'
    );
    // Regla H: configuración inválida/no viable para el entorno ->
    // CONFIGURATION_ERROR, igual que backend='disabled' arriba.
    return {
      fragmentos: [], articulos_encontrados: [], backend: 'disabled',
      outcome: buildRetrievalOutcome('CONFIGURATION_ERROR', {
        errorCategory: 'CONFIGURATION', errorCode: safeErrorCode('CONFIGURATION'), exactAttempted: exactoIntentado,
      }),
    };
  }

  // Búsqueda semántica: si no vino un filtro de materia explícito (route.ts
  // solo lo pasa en modos "_penal", que la UI no expone hoy), se infiere de
  // lo que el propio texto de la consulta indique. Sin esto, una pregunta
  // claramente penal podía recuperar por similitud un artículo civil o de
  // arbitraje (ej. Art. 353, procesos extranjeros) solo porque puntuaba alto
  // — el filtro de materia en la RPC lo excluye a nivel de base de datos,
  // no por heurística posterior.
  //
  // EG-1 (2026-09-28): se usa la detección AMPLIADA aquí (mercantil/notarial/
  // constitucional además de penal/civil) -- nunca en la ruta de artículo
  // exacto de arriba, que sigue usando la detección original sin tocar (ver
  // comentario de detectarMateriaSemanticaAmpliada en exact-resolver.ts).
  const materiaSemantica = materia ?? detectarMateriaSemanticaAmpliada(consulta) ?? undefined;

  try {
    if (backend === 'python') {
      const resultado = await buscarEnPython(consulta, k, coleccion, materiaSemantica);
      // Regla D/E: semántica ejecutó sin error -> SEMANTIC_SUCCESS si trajo
      // evidencia, OFFICIAL_FALLBACK_REQUIRED si no (nunca "no existe la ley").
      return {
        ...resultado,
        outcome: buildRetrievalOutcome(
          resultado.fragmentos.length > 0 ? 'SEMANTIC_SUCCESS' : 'OFFICIAL_FALLBACK_REQUIRED',
          { evidenceCount: resultado.fragmentos.length, exactAttempted: exactoIntentado, semanticAttempted: true },
        ),
      };
    }
    if (backend === 'supabase') {
      const resultado = await buscarEnSupabase(consulta, k, coleccion, materiaSemantica, opts?.rerank ?? false);
      // Regla L: un fallo de Cohere (opcional) ya degrada de forma
      // resiliente DENTRO de seleccionarFinal/rerankearFragmentos (sin
      // lanzar) desde antes de esta fase -- buscarEnSupabase nunca ve ese
      // error, así que este camino nunca lo convierte en RETRIEVAL_ERROR.
      // `degraded` permanece false (ver types.ts: no instrumentado en esta
      // fase, límite de alcance explícito, no un bug).
      return {
        ...resultado,
        outcome: buildRetrievalOutcome(
          resultado.fragmentos.length > 0 ? 'SEMANTIC_SUCCESS' : 'OFFICIAL_FALLBACK_REQUIRED',
          { evidenceCount: resultado.fragmentos.length, exactAttempted: exactoIntentado, semanticAttempted: true },
        ),
      };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[RAG] Error backend ${backend}:`, msg);
    // Reglas F/G: un fallo real de infraestructura (HF, Supabase, red) NUNCA
    // se convierte silenciosamente en "no hay evidencia" -- RETRIEVAL_ERROR
    // explícito, categorizado de forma segura (sin exponer el mensaje crudo
    // en errorCode/errorCategory; `error` de ResultadoRAG se conserva tal
    // cual para compatibilidad interna, no para telemetría nueva).
    const categoria = classifyRetrievalError(msg, backend);
    // Degradación elegante — continuar sin RAG
    return {
      fragmentos: [],
      articulos_encontrados: [],
      backend,
      error: msg,
      outcome: buildRetrievalOutcome('RETRIEVAL_ERROR', {
        errorCategory: categoria, errorCode: safeErrorCode(categoria),
        exactAttempted: exactoIntentado, semanticAttempted: true,
      }),
    };
  }

  // Inalcanzable en la práctica: `backend` en este punto solo puede ser
  // 'python' o 'supabase' (BackendRAG solo tiene 3 valores y 'disabled' ya
  // retornó arriba), y ambos ifs del try retornan siempre. Se conserva por
  // completitud de tipos, con un outcome neutro documentado como tal.
  return {
    fragmentos: [], articulos_encontrados: [], backend: 'disabled',
    outcome: buildRetrievalOutcome('CONFIGURATION_ERROR', {
      errorCategory: 'UNKNOWN', errorCode: safeErrorCode('UNKNOWN'), exactAttempted: exactoIntentado,
    }),
  };
}

