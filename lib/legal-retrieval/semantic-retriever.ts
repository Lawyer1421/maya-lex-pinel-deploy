/**
 * lib/legal-retrieval/semantic-retriever.ts
 * Retrieval v3 — Fase 1B: EXTRACCIÓN, no rediseño.
 *
 * Movido 1:1 desde lib/rag/search.ts (sin cambio de comportamiento): la
 * recuperación semántica vía Supabase pgvector (embedding de la consulta,
 * dos RPC en paralelo -- embudo ancho + fusión de vigentes --, filtros de
 * calidad, y el corte final con rerank Cohere opcional detrás de
 * `flag_rerank`, con degradación elegante). Ver
 * MAYALEX_RETRIEVAL_V3_ARCHITECTURE.md secciones E/F para el diseño completo
 * de Retrieval v3 -- esta fase solo mueve el código ya existente y
 * verificado, no introduce ninguna lógica, modelo, endpoint ni k nuevo.
 *
 * Dependencias permitidas: ./types, ./primitives, ./instrument-gate, lib/rag/embed,
 * lib/rag/rerank, lib/supabase. NUNCA lib/rag/search.ts (reabriría el ciclo
 * cerrado en Fase 1A.1). ./instrument-gate importa de ./exact-resolver, que no
 * importa nada de este archivo: no hay ciclo. Sólo se usa la identidad de
 * fuente para el gate de intención explícita (P1), nada de la resolución
 * determinista por artículo exacto.
 */

import type { FragmentoRAG, ResultadoRAG } from './types';
import { hashFragmento, contieneArtefactoAnonimizacion } from './primitives';
import { cumpleIdentidadExplicita } from './instrument-gate';
import type { InstrumentoNormalizado } from './exact-resolver';

/**
 * D6(b) — true para un artículo de código hondureño confirmado NO vigente
 * (ej. derogado). Mismo criterio exacto que la etiqueta de seguridad D6(a)
 * en formatearContextoRAG, pero aplicado ANTES de que el fragmento llegue al
 * contexto, no solo al mostrarlo. Se define aquí (no inline) para que ambos
 * puntos del código — exclusión y etiqueta — usen la misma condición, nunca
 * dos copias que puedan desincronizarse.
 */
export function esRegistroNoVigenteExcluido(f: Pick<FragmentoRAG, 'es_norma_vigente' | 'fuente_tipo' | 'jurisdiccion'>): boolean {
  return f.es_norma_vigente === false && f.fuente_tipo === 'codigo' && f.jurisdiccion === 'HN';
}

/**
 * Capa documental doc_* (E7, EXCLUDED_BY_TYPE; nunca PRIMARY). Replica el
 * predicado canónico `fuente LIKE 'doc_%'` de
 * docs/corpus/hygiene-identity-queries.sql: el `_` de LIKE es comodín de un
 * carácter, así que equivale a prefijo 'doc' con al menos 4 caracteres.
 */
export function esFuenteDocumentalExcluida(fuente: string | null): boolean {
  return fuente !== null && fuente.length >= 4 && fuente.startsWith('doc');
}

/**
 * Corte final del retrieval semántico — Etapa 2, detrás de `flag_rerank`
 * (Decisión C, DECISION_LOG 2026-09-07).
 *
 * - `rerankHabilitado === false` (default): devuelve `candidatos.slice(0, k)`
 *   — los `k` mejores por similitud pgvector, SIN llamar a Cohere. Es
 *   exactamente lo que `rerankearFragmentos()` ya devolvía en su camino de
 *   fallback, así que con el flag OFF y sin `COHERE_API_KEY` el comportamiento
 *   es idéntico al previo a este cableado.
 * - `rerankHabilitado === true`: Cohere rerank-v3.5 reordena por relevancia
 *   consulta-documento y trunca a `k`; degrada al slice si Cohere no está
 *   disponible. Nunca lanza.
 */
export async function seleccionarFinal<T extends { contenido: string; relevancia: number }>(
  consulta: string,
  candidatos: T[],
  k: number,
  rerankHabilitado: boolean,
): Promise<T[]> {
  if (!rerankHabilitado) return candidatos.slice(0, k);
  const { rerankearFragmentos } = await import('@/lib/rag/rerank');
  return rerankearFragmentos(consulta, candidatos, k);
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND: SUPABASE PGVECTOR (producción)
// ─────────────────────────────────────────────────────────────────────────────

export async function buscarEnSupabase(
  consulta: string,
  k: number,
  coleccion: string,
  materia: string | undefined,
  rerankHabilitado: boolean,
  identidadExplicita: InstrumentoNormalizado | null = null,
): Promise<ResultadoRAG> {
  // Requiere la tabla biblioteca_vectores + RPC buscar_biblioteca en Supabase
  // (supabase/vectores.sql — poblada por scripts/seed_vectores.py) y
  // HF_API_TOKEN para el embedding de la consulta (lib/rag/embed.ts).
  const { createServerSupabaseClient } = await import('@/lib/supabase');
  const { embedQuery } = await import('@/lib/rag/embed');
  const supabase = createServerSupabaseClient();

  const queryEmbedding = await embedQuery(consulta);

  type FilaRPC = {
    id: string;
    contenido: string;
    num_articulo: string | null;
    fuente: string;
    fuente_tipo: string | null;
    jurisdiccion: string | null;
    es_norma_vigente: boolean | null;
    similarity: number;
  };

  const mapearFila = (row: FilaRPC): FragmentoRAG => ({
    id: row.id,
    contenido: row.contenido,
    num_articulo: row.num_articulo,
    fuente: row.fuente,
    relevancia: row.similarity,
    fuente_tipo: row.fuente_tipo,
    jurisdiccion: row.jurisdiccion,
    es_norma_vigente: row.es_norma_vigente,
    hash: hashFragmento({ contenido: row.contenido, num_articulo: row.num_articulo, fuente: row.fuente }),
  });

  // v2: agrega fuente_tipo/jurisdiccion/es_norma_vigente para que el modelo
  // distinga norma vigente hondureña de doctrina/jurisprudencia comparada.
  //
  // Retrieval en dos etapas (Cohere rerank-v3.5, 2026-09-01):
  //  Etapa 1 (aquí): en vez de traer directamente los k=5 finales por
  //    similitud pura, se amplía la recuperación a RETRIEVAL_WIDE_K
  //    candidatos — la similitud vectorial es barata pero imprecisa para
  //    relevancia jurídica real; un embudo ancho le da más material al
  //    reranker antes de decidir.
  //  Etapa 2 (rerankearFragmentos, más abajo): Cohere reordena esos
  //    candidatos por relevancia consulta-documento real y se trunca a los
  //    k mejores — reemplaza a la similitud coseno como criterio final de
  //    corte, con degradación elegante si Cohere no está disponible.
  //
  // El fusionado con un top-3 adicional filtrado a solo_norma_vigente=true
  // se mantiene sin cambios: sigue siendo el mecanismo que garantiza que un
  // artículo vigente con similitud pura baja (el caso real de producción,
  // 2026-07-23: Art. 173 CPP en la posición #8 por similitud, fuera del
  // top-5 de esa época) SIEMPRE entre al menos como candidato al pool que
  // recibe el reranker — ya no depende de "forzar su inclusión final" sino
  // de garantizarle una oportunidad justa de ranking por relevancia real,
  // que es un criterio más fuerte que el hack de fusión que sustituye.
  const RETRIEVAL_WIDE_K = Math.max(k, 25);
  const [normal, vigente] = await Promise.all([
    supabase.rpc('buscar_biblioteca_v2', {
      query_embedding: queryEmbedding,
      coleccion_filtro: coleccion,
      materia_filtro: materia ?? null,
      limite: RETRIEVAL_WIDE_K,
    }),
    supabase.rpc('buscar_biblioteca_v2', {
      query_embedding: queryEmbedding,
      coleccion_filtro: coleccion,
      materia_filtro: materia ?? null,
      limite: 3,
      solo_norma_vigente: true,
    }),
  ]);

  if (normal.error) {
    throw new Error(`Supabase RAG error: ${normal.error.message}`);
  }

  const fragmentosNormal: FragmentoRAG[] = (normal.data ?? []).map(mapearFila);

  // vigente.error se ignora (degradación elegante) — el top-k normal ya es
  // un resultado válido por sí solo; la fusión es una garantía adicional.
  const fragmentosVigente: FragmentoRAG[] = (vigente.error ? [] : vigente.data ?? []).map(mapearFila);

  const idsExistentes = new Set(fragmentosNormal.map(f => f.id));
  const fragmentosSinFiltrar = [
    ...fragmentosNormal,
    ...fragmentosVigente.filter(f => !idsExistentes.has(f.id)),
  ];

  // Contención de calidad: nunca presentar como respuesta un fragmento con
  // artefactos de anonimización sin limpiar (ej. [Cliente_Anónimo],
  // [Teléfono_Oculto]) — mismo criterio que la contención SEO de /leyes y
  // /consultas (lib/seo/estado-editorial.ts). Auditoría de corpus 2026-07-27
  // encontró este patrón en 76.6% del corpus legacy.
  //
  // D6(b) (Operación "Facultades Completas", 2026-08-28): exclusión real de
  // artículos de código hondureño confirmados NO vigentes (ej. derogados —
  // dossier DEROGACION_ADOPCION_102-2018 de Fase 1). Antes solo se
  // etiquetaban (D6a) pero seguían llegando al contexto del modelo por esta
  // vía sin filtro (`fragmentosNormal`, similitud pura, sin filtro de
  // vigencia) — un artículo derogado con embedding cercano a la consulta
  // podía colarse igual, con o sin etiqueta. Se excluyen aquí, antes de
  // construir el contexto, no solo se marcan. No se borran de la base de
  // datos (quedan disponibles para la futura feature de vigencia/derogación
  // visible, ver decision log 2026-08-27) — solo se excluyen de esta
  // recuperación semántica sin filtro.
  //
  // Extensión (2026-08-28, mismo día): `esRegistroNoVigenteExcluido` exige
  // `fuente_tipo === 'codigo'` exacto, así que NO cubre las filas realmente
  // huérfanas del corpus legacy (`fuente IS NULL`, y con ella
  // `fuente_tipo`/`jurisdiccion` también NULL — 5,024 de las 8,366 puestas
  // en `es_norma_vigente=false` en el QUINTO UPDATE, ver DECISION_LOG.md).
  // Se agrega un filtro adicional, deliberadamente angosto (solo
  // `fuente === null`, sin tocar la condición de D6b) para cerrar ese caso
  // sin duplicar ni reemplazar la función existente.
  //
  // P1 (intención instrumental explícita): si la consulta nombra un instrumento
  // con identidad resuelta, un candidato sólo entra si su propia fuente confirma
  // esa identidad. La materia (03_NOTARIAL, etc.) nunca lo valida por sí sola.
  // Va ANTES del corte final, para que `k` se llene con candidatos elegibles.
  const candidatos = fragmentosSinFiltrar
    .filter((f) => !contieneArtefactoAnonimizacion(f.contenido))
    .filter((f) => !esRegistroNoVigenteExcluido(f))
    .filter((f) => f.fuente !== null)
    .filter((f) => !esFuenteDocumentalExcluida(f.fuente))
    .filter((f) => cumpleIdentidadExplicita(f.fuente, identidadExplicita));

  // Etapa 2 — reranking Cohere, ahora detrás de `flag_rerank` (Decisión C,
  // DECISION_LOG 2026-09-07). `rerankHabilitado` lo resuelve `/api/chat` una
  // vez por request vía `isFlagEnabledForUser`. Con el flag OFF (default) el
  // embudo ancho (RETRIEVAL_WIDE_K) se sigue trayendo pero el corte final es
  // por similitud pgvector — `candidatos.slice(0, k)` —, idéntico al fallback
  // que `rerankearFragmentos()` ya hacía sin `COHERE_API_KEY`.
  const fragmentos = await seleccionarFinal(consulta, candidatos, k, rerankHabilitado);

  const articulos = [...new Set(
    fragmentos
      .map(f => f.num_articulo)
      .filter((a): a is string => a !== null)
  )];

  return { fragmentos, articulos_encontrados: articulos, backend: 'supabase' };
}
