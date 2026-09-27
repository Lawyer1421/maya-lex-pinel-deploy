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

export type { FragmentoRAG, ResultadoRAG };
export { hashFragmento, contieneArtefactoAnonimizacion, esRegistroNoVigenteExcluido, seleccionarFinal };

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
// ─────────────────────────────────────────────────────────────────────────────
// FAIL-CLOSED: ¿ESTA CONSULTA EXIGE EVIDENCIA VERIFICABLE DEL CORPUS?
// ─────────────────────────────────────────────────────────────────────────────
//
// WAR ROOM FINAL: hasta ahora, cuando la recuperación (exacta o semántica)
// devolvía cero fragmentos válidos, el chat seguía llamando al LLM con un
// system prompt sin contexto RAG — el modelo podía (y lo hizo, en la Prueba 3
// del hotfix anterior) responder con un análisis jurídico detallado desde su
// propio conocimiento paramétrico, citando artículos por número, sin ningún
// respaldo documental verificable. Esta función identifica, ANTES de invocar
// al LLM, cuándo una consulta exige ese respaldo — para poder abstenerse en
// código en vez de confiar en que el modelo se abstenga por sí mismo.

const RE_SEGUN_CORPUS = /seg[uú]n el corpus|de acuerdo (?:a|con) el corpus|corpus jur[ií]dico/i;
const RE_SOLICITA_EVIDENCIA = /\b(fuente|citas?|hash|texto recuperado|fragmento(?:s)?\s+(?:recuperado|del corpus))\b/i;

/**
 * true cuando la consulta exige evidencia verificable del corpus: lo pide
 * explícitamente ("según el corpus", "cita la fuente"), pide el contenido de
 * un artículo específico, o la ruta jurídica ya la exige por configuración
 * (modos de análisis con router activo en ruta A/B/C — ver route.ts).
 */
export function requiereEvidenciaCorpus(query: string, rutaCorpusObligatoria: boolean): boolean {
  if (rutaCorpusObligatoria) return true;
  if (RE_SEGUN_CORPUS.test(query)) return true;
  if (RE_SOLICITA_EVIDENCIA.test(query)) return true;
  if (detectarArticuloExacto(query) !== null) return true;
  return false;
}

export const CORPUS_EVIDENCE_NOT_FOUND = 'CORPUS_EVIDENCE_NOT_FOUND';

export const MENSAJE_ABSTENCION_CORPUS =
  'No se recuperaron fragmentos verificables del corpus para esta consulta. ' +
  'Para evitar una respuesta jurídica sin respaldo documental, Maya Lex no responderá desde conocimiento general.';

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
    return { fragmentos: [], articulos_encontrados: [], backend: 'disabled' };
  }

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
      try {
        const materiaEfectiva = deteccion.materiaDetectada ?? materia ?? null;
        const exacto = await buscarArticuloExacto(deteccion.numero, materiaEfectiva, deteccion.instrumento);
        if (exacto.ambiguo) {
          return { fragmentos: [], articulos_encontrados: [], backend: 'supabase', ambiguo: true };
        }
        if (exacto.fragmentos.length > 0) {
          return {
            fragmentos: exacto.fragmentos,
            articulos_encontrados: [deteccion.numero],
            backend: 'supabase',
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
          return { fragmentos: [], articulos_encontrados: [], backend: 'supabase' };
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
    return { fragmentos: [], articulos_encontrados: [], backend: 'disabled' };
  }

  // Búsqueda semántica: si no vino un filtro de materia explícito (route.ts
  // solo lo pasa en modos "_penal", que la UI no expone hoy), se infiere de
  // lo que el propio texto de la consulta indique. Sin esto, una pregunta
  // claramente penal podía recuperar por similitud un artículo civil o de
  // arbitraje (ej. Art. 353, procesos extranjeros) solo porque puntuaba alto
  // — el filtro de materia en la RPC lo excluye a nivel de base de datos,
  // no por heurística posterior.
  const materiaSemantica = materia ?? detectarMateriaDesdeTexto(consulta) ?? undefined;

  try {
    if (backend === 'python') {
      return await buscarEnPython(consulta, k, coleccion, materiaSemantica);
    }
    if (backend === 'supabase') {
      return await buscarEnSupabase(consulta, k, coleccion, materiaSemantica, opts?.rerank ?? false);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[RAG] Error backend ${backend}:`, msg);
    // Degradación elegante — continuar sin RAG
    return {
      fragmentos: [],
      articulos_encontrados: [],
      backend,
      error: msg,
    };
  }

  return { fragmentos: [], articulos_encontrados: [], backend: 'disabled' };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUENTES DOCTRINALES / COMENTARIO — NUNCA DERECHO POSITIVO VINCULANTE
// ─────────────────────────────────────────────────────────────────────────────
// Blindaje explícito (auditoría CLO 2026-09-02): en producción, las filas de
// CPC_COMENTADO_ROMERO_2024 (doctrina/comentario, no norma) tienen
// es_norma_vigente=NULL y fuente_tipo=NULL. Cualquier filtro basado solo en
// esos campos es INCIDENTAL -- depende de que nadie los pueble mal en una
// ingesta futura. Esta lista hace la exclusión/etiquetado explícito e
// independiente de esos campos, en los dos puntos donde una fuente doctrinal
// podría presentarse como si fuera norma vigente:
//   1. construirCitas() (app/api/chat/route.ts) -- la excluye del array de
//      citas formales de la UI.
//   2. formatearContextoRAG() (abajo) -- la etiqueta inequívocamente dentro
//      del propio contexto inyectado al modelo, para que el LLM nunca la
//      trate como derecho positivo vinculante aunque siga usándola como
//      referencia doctrinal.
// Definida aquí (no en route.ts) para que ambos consumidores la importen de
// una única fuente de verdad sin crear un import circular entre los dos
// módulos. Añadir aquí cualquier otra fuente de doctrina/comentario/glosa
// que se ingiera en el futuro.
export const FUENTES_DOCTRINALES = new Set<string>(['CPC_COMENTADO_ROMERO_2024']);

// ─────────────────────────────────────────────────────────────────────────────
// FORMATEAR CONTEXTO PARA EL SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convierte los fragmentos RAG en un bloque de texto para inyectar
 * en el system prompt de Claude (después del MAYA PENAL system prompt base).
 */
export function formatearContextoRAG(resultado: ResultadoRAG): string {
  if (resultado.fragmentos.length === 0) {
    return '';
  }

  const lineas = [
    '── CONTEXTO RECUPERADO — BIBLIOTECA PENAL PINEL ──',
    `Fuente: ${resultado.backend === 'python' ? 'Índice local ChromaDB' : 'Supabase pgvector'}`,
    `Fragmentos: ${resultado.fragmentos.length} | Artículos: ${resultado.articulos_encontrados.join(', ') || 'N/A'}`,
    '',
  ];

  for (const [i, f] of resultado.fragmentos.entries()) {
    // Salvaguarda D6(a) (2026-08-27), corregida D6(a-bis) (2026-08-28): esta
    // etiqueta NUNCA debe quedar en null. Un artículo de código hondureño
    // confirmado NO vigente (derogado — dossier DEROGACION_ADOPCION_102-2018)
    // ahora recibe su propia etiqueta específica, distinta del fallback
    // genérico: "NO VIGENTE" es una afirmación conocida y verificada, no lo
    // mismo que "no sabemos qué es esto" (fuente sin clasificar). El fallback
    // genérico queda reservado solo para metadata realmente ausente/ambigua.
    // Nota: desde D6(b), esRegistroNoVigenteExcluido() ya excluye estos
    // fragmentos ANTES de llegar aquí en la vía de búsqueda semántica de
    // Supabase — esta etiqueta es la segunda capa de defensa, por si un
    // fragmento con este mismo patrón llega por otra vía (ej. backend
    // Python, o una recuperación exacta futura que no pase por ese filtro).
    // Chequeo de FUENTES_DOCTRINALES primero y por separado del resto de la
    // cadena: debe ganar incluso si es_norma_vigente llegara mal poblado
    // como true por error de ingesta futura (mismo principio que en
    // construirCitas() -- ver comentario junto a la constante).
    const etiqueta = FUENTES_DOCTRINALES.has(f.fuente)
      ? `FUENTE DOCTRINAL / COMENTARIO ACADÉMICO - NO VINCULANTE: ${f.fuente}`
      : f.es_norma_vigente === true
        ? 'NORMA VIGENTE HONDURAS'
        : f.jurisdiccion && f.jurisdiccion !== 'HN'
          ? `DOCTRINA/JURISPRUDENCIA COMPARADA — ${f.jurisdiccion}`
          : f.fuente_tipo === 'sentencia' || f.fuente_tipo === 'doctrina'
            ? 'DOCTRINA/JURISPRUDENCIA — NO ES NORMA VIGENTE'
            : esRegistroNoVigenteExcluido(f)
              ? 'NO VIGENTE — NO CITAR COMO NORMA'
              : 'FUENTE SIN CLASIFICAR — NO CITAR COMO NORMA VIGENTE';
    const art = f.num_articulo ? ` — Art. ${f.num_articulo}` : '';
    const tag = ` [${etiqueta}]`;
    lineas.push(`[FRAGMENTO ${i + 1}${art}${tag} | relevancia: ${(f.relevancia * 100).toFixed(0)}%]`);
    lineas.push(f.contenido.trim());
    lineas.push('');
  }

  lineas.push('── FIN DEL CONTEXTO RAG ──');
  lineas.push('INSTRUCCIÓN: Usar exclusivamente la información del contexto anterior para fundamentar el análisis. Solo cite número de artículo de fragmentos marcados [NORMA VIGENTE HONDURAS]. Fragmentos de doctrina o jurisprudencia comparada se usan únicamente como referencia, nunca como fundamento normativo directo. Si el artículo citado no aparece en el contexto, indicarlo explícitamente. La interfaz muestra por separado, de forma automática, la fuente y el hash de verificación de cada fragmento citado — no comentes sobre la presencia, ausencia o formato de esos datos, ni intentes reproducirlos: no forman parte de este contexto y no te corresponde informarlos.');

  return lineas.join('\n');
}
