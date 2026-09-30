/**
 * lib/legal-retrieval/evidence-engine.ts
 * Retrieval v3 — Fase 1C: EXTRACCIÓN, no rediseño.
 *
 * Responde "¿QUÉ ES este material recuperado?" (norma vigente hondureña,
 * norma no vigente, doctrina/jurisprudencia comparada, material de solo
 * contexto, candidato a cita formal, o material no citable) — nunca "¿qué
 * pasó con la ejecución del retrieval?" (eso es Fase 1D, sin empezar aún).
 *
 * Movido 1:1 desde lib/rag/search.ts y app/api/chat/route.ts, sin cambio de
 * comportamiento: la política de citación (`Cita`/`construirCitas`), el
 * formateo del contexto inyectado al LLM (`formatearContextoRAG`,
 * `FUENTES_DOCTRINALES`), y el gate de evidencia exigida antes de invocar al
 * LLM (`requiereEvidenciaCorpus`, `CORPUS_EVIDENCE_NOT_FOUND`,
 * `MENSAJE_ABSTENCION_CORPUS`). Ver MAYALEX_RETRIEVAL_V3_ARCHITECTURE.md y
 * MAYALEX_RETRIEVAL_RUNTIME_CONTRACT.md.
 *
 * NO cambia: la semántica de `ResultadoRAG.error`, `getBackend()`,
 * `RetrievalExecutionState` (no existe todavía en código), ni ningún gap P1
 * documentado en la Fase 1B.5 — esos gaps permanecen exactamente iguales,
 * intencionalmente, hasta una fase de implementación autorizada por separado.
 *
 * Dependencias necesarias fuera de ./types y ./primitives, ambas
 * preexistentes al esta extracción (no es acoplamiento nuevo):
 *   - `esRegistroNoVigenteExcluido` (./semantic-retriever) — ya la usaba
 *     formatearContextoRAG antes de esta fase, para la segunda capa de
 *     defensa D6(b) en el etiquetado de fragmentos.
 *   - `detectarArticuloExacto` (./exact-resolver) — ya la usaba
 *     requiereEvidenciaCorpus antes de esta fase, para exigir evidencia
 *     cuando la consulta pide un artículo exacto.
 */

import type { FragmentoRAG, ResultadoRAG } from './types';
import { esRegistroNoVigenteExcluido } from './semantic-retriever';
import { detectarArticuloExacto } from './exact-resolver';

// ─────────────────────────────────────────────────────────────────────────────
// CITAS ESTRUCTURADAS PARA TRAZABILIDAD EN UI (P0-4)
// ─────────────────────────────────────────────────────────────────────────────
// Solo fragmentos marcados es_norma_vigente=true califican como "cita" —
// doctrina/jurisprudencia comparada se usa como contexto para el modelo pero
// nunca se presenta al usuario como fundamento normativo verificable.
export interface Cita {
  articulo: string | null;
  texto: string;
  fuente: string;
  vigente: boolean;
  hash: string;
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
//   1. construirCitas() (abajo) -- la excluye del array de citas formales de
//      la UI.
//   2. formatearContextoRAG() (abajo) -- la etiqueta inequívocamente dentro
//      del propio contexto inyectado al modelo, para que el LLM nunca la
//      trate como derecho positivo vinculante aunque siga usándola como
//      referencia doctrinal.
// Ambos consumidores viven ahora en el mismo módulo (antes vivían en
// search.ts y route.ts por separado, importando esta constante desde
// search.ts para evitar un ciclo entre los dos) -- añadir aquí cualquier
// otra fuente de doctrina/comentario/glosa que se ingiera en el futuro.
export const FUENTES_DOCTRINALES = new Set<string>(['CPC_COMENTADO_ROMERO_2024']);

// Blindaje explícito (auditoría CLO 2026-09-02): FUENTES_DOCTRINALES vive en
// este mismo módulo (una sola fuente de verdad, compartida por
// formatearContextoRAG() -- ver comentario junto a su definición arriba para
// el detalle completo del hallazgo). Aquí se usa para excluir esas fuentes
// del array de citas formales de la UI, independiente del campo
// es_norma_vigente.
export function construirCitas(fragmentos: FragmentoRAG[]): Cita[] {
  const vistos = new Set<string>();
  const citas: Cita[] = [];
  for (const f of fragmentos) {
    if (FUENTES_DOCTRINALES.has(f.fuente)) continue;
    if (f.es_norma_vigente !== true) continue;
    const clave = `${f.num_articulo ?? ''}|${f.fuente}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    citas.push({
      articulo: f.num_articulo,
      texto: f.contenido.length > 600 ? `${f.contenido.slice(0, 600)}…` : f.contenido,
      fuente: f.fuente,
      vigente: true,
      hash: f.hash ?? '',
    });
    if (citas.length >= 5) break;
  }
  return citas;
}

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
//
// Nota Fase 1B.5 (MAYALEX_RETRIEVAL_RUNTIME_CONTRACT.md §3.3, §5 escenario
// G): esta función NO distingue hoy un fallo de infraestructura de una
// evidencia cero genuina, y no tiene ningún parámetro para considerar
// evidencia web disponible. Ambos son gaps P1 conocidos y documentados,
// intencionalmente NO corregidos en esta fase (extracción, no rediseño).

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
