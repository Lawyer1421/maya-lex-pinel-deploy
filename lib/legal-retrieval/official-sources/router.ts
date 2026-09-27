/**
 * lib/legal-retrieval/official-sources/router.ts
 * Retrieval v3 — Fase 1E: Official Source Router.
 *
 * NO wireado a app/api/chat/route.ts todavía (§11 de la directiva). Este
 * router selecciona adapters por REGLAS DETERMINISTAS según
 * `OfficialSourceQuery.kind` -- nunca deja que un LLM decida dinámicamente
 * qué fuente es autoritativa (§5). Tavily permanece fuera de este router por
 * diseño: es una herramienta de descubrimiento/investigación secundaria, no
 * una fuente oficial (§6) -- nunca se le asigna un OfficialSourceId ni se le
 * trata como si produjera OfficialSourceEvidence.
 */

import type { OfficialSourceAdapter, OfficialSourceKind, OfficialSourceQuery, OfficialSourceResult } from './types';
import { cedijLegislacionAdapter } from './adapters/cedij-legislacion';

/**
 * Orden de prioridad por tipo de consulta (§5). Con un solo adapter real
 * implementado en esta fase, la lista solo tiene un elemento -- el orden
 * queda documentado para cuando SIJ (jurisprudencia) y un adapter de Gaceta
 * se verifiquen y se agreguen (ver docs/retrieval/OFFICIAL_HONDURAS_SOURCE_REGISTRY.md).
 */
const ADAPTERS_POR_TIPO: Record<OfficialSourceKind, OfficialSourceAdapter[]> = {
  LEGISLATION: [cedijLegislacionAdapter],
  // SIJ (sij.poderjudicial.gob.hn) no fue alcanzable durante la investigación
  // de esta fase -- sin adapter real todavía.
  JURISPRUDENCE: [],
  // Dominio oficial del Diario Oficial La Gaceta no verificado en esta fase
  // -- ver registro, hallazgo negativo: lagaceta.hn es un medio de noticias
  // privado, NO la fuente oficial.
  GAZETTE: [],
  ADMINISTRATIVE: [],
  MIXED: [],
};

/**
 * Consulta los adapters que soporten `query.kind`, en orden de prioridad,
 * hasta obtener el primer resultado con evidencia (SUCCESS). Si ninguno
 * tiene evidencia, o no existe ningún adapter real para ese tipo todavía,
 * devuelve un resultado explícito -- NUNCA lanza, NUNCA falla en silencio.
 */
export async function routeOfficialSourceQuery(query: OfficialSourceQuery): Promise<OfficialSourceResult[]> {
  const candidatos = (ADAPTERS_POR_TIPO[query.kind] ?? []).filter((a) => a.supports(query));

  if (candidatos.length === 0) {
    return [{
      status: 'UNSUPPORTED_QUERY',
      evidence: [],
      // Sin adapter real disponible para este tipo -- se usa el único id
      // conocido hoy solo como placeholder de tipo; el status ya comunica
      // que ningún adapter respondió. (Limitación conocida: con un solo
      // OfficialSourceId definido en types.ts, este campo no puede señalar
      // "ninguna fuente" de forma más precisa sin ampliar el tipo -- se
      // documenta aquí en vez de inventar un id ficticio.)
      sourceId: 'CEDIJ_LEGISLACION',
      errorCode: 'NO_ADAPTER_FOR_KIND',
    }];
  }

  const resultados: OfficialSourceResult[] = [];
  for (const adapter of candidatos) {
    const resultado = await adapter.search(query);
    resultados.push(resultado);
    if (resultado.status === 'SUCCESS') break;
  }
  return resultados;
}

// ─────────────────────────────────────────────────────────────────────────────
// MINIMIZACIÓN DE CONSULTA (§9) — nunca enviar PII a una fuente externa
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Patrones conservadores de datos personales que NUNCA deben llegar a una
 * fuente externa: nombres propios introducidos por frases posesivas típicas
 * ("mi cliente X", "el señor Y"), números de identidad, correos, teléfonos.
 * Esto es intencionalmente amplio (mejor sobre-redactar que filtrar de
 * menos) -- la consulta minimizada debe seguir siendo útil para búsqueda
 * legal (número de artículo, instrumento, materia), no una transcripción.
 */
const PATRONES_PII = [
  /\bmi\s+client[ea]\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ]*(?:\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ]*){0,2}/gi,
  /\b(?:el|la)\s+(?:señor|señora|sr\.?|sra\.?|licenciado|lic\.?|abogado)\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ]*(?:\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ]*){0,2}/gi,
  /\b\d{4}-\d{4}-\d{5}\b/g, // formato de identidad hondureña (DNI)
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi, // correos
  /\b(?:\+?504[-\s]?)?\d{4}[-\s]?\d{4}\b/g, // teléfonos HN (8 dígitos, con o sin +504)
];

/**
 * Reduce una consulta de usuario a los términos jurídicos mínimos seguros
 * para investigación externa -- redacta patrones de PII conocidos. NO es una
 * garantía absoluta de anonimización (eso no es el objetivo de esta
 * función): es la primera capa de minimización antes de construir el
 * OfficialSourceQuery. El caller (una fase futura de wiring, no esta) sigue
 * siendo responsable de construir `searchText` a partir de la INTENCIÓN
 * jurídica detectada (artículo/instrumento/materia), no de la pregunta cruda
 * completa -- ver ejemplo en la directiva de Fase 1E §9.
 */
export function minimizeQueryForExternalResearch(consultaCruda: string): string {
  let texto = consultaCruda;
  for (const patron of PATRONES_PII) {
    texto = texto.replace(patron, '');
  }
  return texto.replace(/\s+/g, ' ').trim();
}
