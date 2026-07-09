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
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export interface FragmentoRAG {
  contenido: string;
  num_articulo: string | null;
  fuente: string;
  relevancia: number;
}

export interface ResultadoRAG {
  fragmentos: FragmentoRAG[];
  articulos_encontrados: string[];
  backend: 'python' | 'supabase' | 'disabled';
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────

type BackendRAG = 'python' | 'supabase' | 'disabled';

function getBackend(): BackendRAG {
  const val = (process.env.RAG_BACKEND ?? 'disabled') as BackendRAG;
  if (['python', 'supabase', 'disabled'].includes(val)) return val;
  return 'disabled';
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
    fragmentos: data.fragmentos,
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

  const { data, error } = await supabase.rpc('buscar_biblioteca', {
    query_embedding: queryEmbedding,
    coleccion_filtro: coleccion,
    materia_filtro: materia ?? null,
    limite: k,
  });

  if (error) {
    throw new Error(`Supabase RAG error: ${error.message}`);
  }

  const fragmentos: FragmentoRAG[] = (data ?? []).map((row: {
    contenido: string;
    num_articulo: string | null;
    fuente: string;
    similarity: number;
  }) => ({
    contenido: row.contenido,
    num_articulo: row.num_articulo,
    fuente: row.fuente,
    relevancia: row.similarity,
  }));

  const articulos = [...new Set(
    fragmentos
      .map(f => f.num_articulo)
      .filter((a): a is string => a !== null)
  )];

  return { fragmentos, articulos_encontrados: articulos, backend: 'supabase' };
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

  try {
    if (backend === 'python') {
      return await buscarEnPython(consulta, k, coleccion, materia);
    }
    if (backend === 'supabase') {
      return await buscarEnSupabase(consulta, k, coleccion, materia);
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
    lineas.push(`[FRAGMENTO ${i + 1}${f.num_articulo ? ` — Art. ${f.num_articulo}` : ''} | relevancia: ${(f.relevancia * 100).toFixed(0)}%]`);
    lineas.push(f.contenido.trim());
    lineas.push('');
  }

  lineas.push('── FIN DEL CONTEXTO RAG ──');
  lineas.push('INSTRUCCIÓN: Usar exclusivamente la información del contexto anterior para fundamentar el análisis. Si el artículo citado no aparece en el contexto, indicarlo explícitamente.');

  return lineas.join('\n');
}
