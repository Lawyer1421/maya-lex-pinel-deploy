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

import { createHash } from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export interface FragmentoRAG {
  id?: string;
  contenido: string;
  num_articulo: string | null;
  fuente: string;
  relevancia: number;
  fuente_tipo?: string | null;
  jurisdiccion?: string | null;
  es_norma_vigente?: boolean | null;
  /** SHA-256(contenido+num_articulo+fuente) truncado a 8 hex — integridad verificable sin columna DB nueva (P0-4). */
  hash?: string;
}

/** Hash corto y determinista de un fragmento, para trazabilidad en UI (P0-4). */
export function hashFragmento(f: Pick<FragmentoRAG, 'contenido' | 'num_articulo' | 'fuente'>): string {
  return createHash('sha256')
    .update(`${f.contenido}|${f.num_articulo ?? ''}|${f.fuente}`)
    .digest('hex')
    .slice(0, 8);
}

// ─────────────────────────────────────────────────────────────────────────────
// RECUPERACIÓN DETERMINISTA POR ARTÍCULO EXACTO
// ─────────────────────────────────────────────────────────────────────────────
//
// P0-2B: la búsqueda semántica pura falla en dos escenarios de seguridad
// jurídica: (a) depende de HF_API_TOKEN, que puede faltar en un entorno y
// dejar el chat sin ningún contexto sin que el usuario lo note con claridad;
// (b) puede no rankear el artículo exacto pedido en el top-k cuando hay
// jurisprudencia/doctrina compitiendo por similitud. Esta capa intenta una
// recuperación exacta y determinista ANTES de la semántica, y no requiere
// embeddings — sigue funcionando aunque falte HF_API_TOKEN.
//
// Limitación de datos conocida (no resoluble en código): la columna `fuente`
// está vacía en todo el corpus de staging hoy, así que no hay forma de
// distinguir p. ej. Código Penal de Código Procesal Penal por metadato — solo
// por lo que el propio texto de la consulta indique. Mientras esa columna no
// se pueble, la desambiguación de instrumento es best-effort por texto, nunca
// una certeza de base de datos. Este código NO inventa un instrumento cuando
// no puede determinarlo: si hay más de un candidato tras vigencia+materia,
// se marca ambiguo y no se ofrece como fundamento normativo.

export interface DeteccionArticulo {
  numero: string;
  materiaDetectada: string | null;
}

const RE_ARTICULO_NUM = /\bart(?:[ií]culo|\.)?\s*(\d+)\b/i;
const RE_MATERIA_PENAL = /\b(penal|cpp|c[oó]digo\s+procesal\s+penal)\b/i;
const RE_MATERIA_CIVIL = /\b(civil|cpc|c[oó]digo\s+procesal\s+civil)\b/i;

/**
 * Detecta la materia (penal/civil) mencionada explícitamente en el texto de
 * una consulta — independiente de si hay un número de artículo. Se usa tanto
 * para la búsqueda exacta como para acotar la búsqueda semántica: sin esto,
 * una consulta claramente penal ("medidas cautelares... proceso penal") podía
 * recuperar por similitud un artículo civil/arbitral (ej. Art. 353 sobre
 * procesos extranjeros), porque la búsqueda semántica no filtraba materia.
 */
export function detectarMateriaDesdeTexto(query: string): string | null {
  if (RE_MATERIA_PENAL.test(query)) return '01_PENAL';
  if (RE_MATERIA_CIVIL.test(query)) return '02_CIVIL';
  return null;
}

/** Detecta un número de artículo explícito y, si el texto lo indica, la materia. */
export function detectarArticuloExacto(query: string): DeteccionArticulo | null {
  const m = RE_ARTICULO_NUM.exec(query);
  if (!m) return null;
  return { numero: m[1], materiaDetectada: detectarMateriaDesdeTexto(query) };
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

/**
 * Confirma que el fragmento contiene el encabezado real del artículo
 * ("ARTICULO {n}.-" / "ARTÍCULO {n}.-"), no solo una mención de paso (p. ej.
 * una sentencia que cita "el artículo 173 numeral 3" sin ser el texto del
 * artículo). Sin esto, un fragmento mal segmentado que solo contiene la cola
 * de un artículo distinto podía citarse como si fuera el artículo pedido.
 */
export function tieneEncabezadoArticulo(contenido: string, numero: string): boolean {
  const re = new RegExp(`art[ií]culo\\s*${numero}\\s*\\.-`, 'i');
  return re.test(contenido);
}

export interface ResultadoExacto {
  fragmentos: FragmentoRAG[];
  /** true cuando hay más de un candidato (posibles instrumentos distintos con el mismo número) — no citar ninguno como autoritativo. */
  ambiguo: boolean;
}

/**
 * Busca un artículo por coincidencia exacta de número — sin embeddings.
 * Solo considera fuente_tipo='codigo' (excluye jurisprudencia/sentencias que
 * simplemente MENCIONAN un número de artículo) y es_norma_vigente=true.
 */
export interface FilaExactaDB {
  id: string;
  contenido: string;
  num_articulo: string | null;
  fuente: string;
  fuente_tipo: string | null;
  jurisdiccion: string | null;
  es_norma_vigente: boolean | null;
  materia: string;
}

/**
 * Resuelve las filas ya obtenidas de la DB a un resultado exacto — función
 * pura, separada de la llamada a Supabase para poder testear la lógica de
 * ambigüedad/filtrado sin necesitar una base de datos real.
 */
export function resolverArticuloExacto(filas: FilaExactaDB[], numero: string): ResultadoExacto {
  if (filas.length === 0) return { fragmentos: [], ambiguo: false };

  // Dos filtros obligatorios, ninguno se relaja por el otro:
  // 1) sin artefactos de anonimización sin limpiar (nunca se presenta
  //    "[Cliente_Anónimo]" como si fuera texto de ley real);
  // 2) el fragmento debe contener el encabezado real del artículo, no solo
  //    mencionarlo de paso o ser un trozo de un artículo distinto mal
  //    segmentado. Si ningún candidato cumple ambos, se trata como "no
  //    encontrado" — mejor abstenerse que citar un fragmento degradado o
  //    mal atribuido.
  const limpias = filas
    .filter((row) => !contieneArtefactoAnonimizacion(row.contenido))
    .filter((row) => tieneEncabezadoArticulo(row.contenido, numero));

  // Más de un candidato en materias distintas (posibles instrumentos
  // distintos con el mismo número) => ambiguo. No adivinar cuál es el
  // correcto.
  const materiasDistintas = new Set(limpias.map((r) => r.materia));
  if (limpias.length > 1 && materiasDistintas.size > 1) {
    return { fragmentos: [], ambiguo: true };
  }

  const fragmentos: FragmentoRAG[] = limpias.slice(0, 1).map((row) => ({
    id: row.id,
    contenido: row.contenido,
    num_articulo: row.num_articulo,
    fuente: row.fuente,
    relevancia: 1,
    fuente_tipo: row.fuente_tipo,
    jurisdiccion: row.jurisdiccion,
    es_norma_vigente: row.es_norma_vigente,
    hash: hashFragmento({ contenido: row.contenido, num_articulo: row.num_articulo, fuente: row.fuente }),
  }));

  return { fragmentos, ambiguo: false };
}

export async function buscarArticuloExacto(
  numero: string,
  materiaDetectada: string | null,
): Promise<ResultadoExacto> {
  const { createServerSupabaseClient } = await import('@/lib/supabase');
  const supabase = createServerSupabaseClient();

  let consulta = supabase
    .from('biblioteca_vectores')
    .select('id, contenido, num_articulo, fuente, fuente_tipo, jurisdiccion, es_norma_vigente, materia')
    .eq('num_articulo', numero)
    .eq('fuente_tipo', 'codigo')
    .eq('es_norma_vigente', true);

  if (materiaDetectada) consulta = consulta.eq('materia', materiaDetectada);

  const { data, error } = await consulta;
  if (error || !data) return { fragmentos: [], ambiguo: false };

  return resolverArticuloExacto(data as FilaExactaDB[], numero);
}

export interface ResultadoRAG {
  fragmentos: FragmentoRAG[];
  articulos_encontrados: string[];
  backend: 'python' | 'supabase' | 'disabled';
  error?: string;
  /** true cuando la búsqueda exacta encontró el mismo número de artículo en más de un instrumento/materia — no se citó nada para no adivinar. */
  ambiguo?: boolean;
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
// BACKEND: SUPABASE PGVECTOR (producción)
// ─────────────────────────────────────────────────────────────────────────────

async function buscarEnSupabase(
  consulta: string,
  k: number,
  coleccion: string,
  materia?: string,
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
  // Retrieval en dos etapas: el top-k por similitud pura puede quedar dominado
  // por jurisprudencia/doctrina extranjera (puntúa más alto que el texto
  // codificado plano) y dejar fuera la norma vigente real — confirmado en
  // producción 2026-07-23 con "prisión preventiva" (Art. 173 CPP quedaba en
  // la posición #8, fuera del top-5). Se fusiona el top-k normal con un
  // top-3 adicional filtrado a solo_norma_vigente=true, para garantizar que
  // el modelo siempre reciba algo de norma vigente hondureña cuando exista,
  // sin importar cómo puntúe frente a la jurisprudencia comparada.
  const [normal, vigente] = await Promise.all([
    supabase.rpc('buscar_biblioteca_v2', {
      query_embedding: queryEmbedding,
      coleccion_filtro: coleccion,
      materia_filtro: materia ?? null,
      limite: k,
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
  const fragmentos = fragmentosSinFiltrar.filter((f) => !contieneArtefactoAnonimizacion(f.contenido));

  const articulos = [...new Set(
    fragmentos
      .map(f => f.num_articulo)
      .filter((a): a is string => a !== null)
  )];

  return { fragmentos, articulos_encontrados: articulos, backend: 'supabase' };
}

const PATRON_ANONIMIZACION_SIN_LIMPIAR = /\[(Cliente|Empresa)_An[oó]nimo|Tel[eé]fono_Oculto|Expediente_Anonimizado\]/;

export function contieneArtefactoAnonimizacion(contenido: string): boolean {
  return PATRON_ANONIMIZACION_SIN_LIMPIAR.test(contenido);
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
        const exacto = await buscarArticuloExacto(deteccion.numero, materiaEfectiva);
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
        // Sin candidato exacto válido. Si el usuario identificó tanto el
        // instrumento (penal/civil) COMO el número, no se cae a semántica
        // amplia — podría citar un artículo de un instrumento distinto con
        // el mismo número, o un fragmento mal segmentado. Se abstiene.
        // Si solo dio el número (instrumento ambiguo), sí se permite el
        // fallback semántico — comportamiento previo, ya validado.
        if (deteccion.materiaDetectada) {
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
      return await buscarEnSupabase(consulta, k, coleccion, materiaSemantica);
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
    const etiqueta = f.es_norma_vigente === true
      ? 'NORMA VIGENTE HONDURAS'
      : f.jurisdiccion && f.jurisdiccion !== 'HN'
        ? `DOCTRINA/JURISPRUDENCIA COMPARADA — ${f.jurisdiccion}`
        : f.fuente_tipo === 'sentencia' || f.fuente_tipo === 'doctrina'
          ? 'DOCTRINA/JURISPRUDENCIA — NO ES NORMA VIGENTE'
          : null;
    const art = f.num_articulo ? ` — Art. ${f.num_articulo}` : '';
    const tag = etiqueta ? ` [${etiqueta}]` : '';
    lineas.push(`[FRAGMENTO ${i + 1}${art}${tag} | relevancia: ${(f.relevancia * 100).toFixed(0)}%]`);
    lineas.push(f.contenido.trim());
    lineas.push('');
  }

  lineas.push('── FIN DEL CONTEXTO RAG ──');
  lineas.push('INSTRUCCIÓN: Usar exclusivamente la información del contexto anterior para fundamentar el análisis. Solo cite número de artículo de fragmentos marcados [NORMA VIGENTE HONDURAS]. Fragmentos de doctrina o jurisprudencia comparada se usan únicamente como referencia, nunca como fundamento normativo directo. Si el artículo citado no aparece en el contexto, indicarlo explícitamente. La interfaz muestra por separado, de forma automática, la fuente y el hash de verificación de cada fragmento citado — no comentes sobre la presencia, ausencia o formato de esos datos, ni intentes reproducirlos: no forman parte de este contexto y no te corresponde informarlos.');

  return lineas.join('\n');
}
