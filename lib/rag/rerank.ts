/**
 * lib/rag/rerank.ts
 * Segunda etapa del retrieval RAG: reranking semántico vía Cohere Rerank.
 *
 * Etapa 1 (lib/rag/search.ts, buscarEnSupabase) trae un conjunto AMPLIO de
 * candidatos por similitud de pgvector (embeddings e5-small, 384 dims) --
 * barata pero limitada: mide cercanía vectorial, no relevancia jurídica real
 * consulta-documento. Caso real en producción (2026-07-23, ver comentario en
 * buscarEnSupabase): "prisión preventiva" rankeaba el Art. 173 CPP en la
 * posición #8 por similitud pura, fuera del top-5 que llegaba al modelo.
 *
 * Etapa 2 (este módulo) reordena esos candidatos con un cross-encoder
 * (Cohere rerank-v3.5) que evalúa la consulta y cada documento juntos --
 * más preciso que comparar vectores pre-calculados por separado.
 *
 * Resiliencia (obligatoria, no opcional): si COHERE_API_KEY falta, la
 * llamada da timeout, la red falla, o la respuesta es inválida, se retorna
 * la lista original (ya ordenada por similitud pgvector) truncada a topN --
 * el flujo del chat NUNCA se rompe ni se bloquea por este paso. Mismo
 * principio de degradación elegante que embedQuery()/buscarEnPython() en
 * este mismo directorio.
 */

const COHERE_RERANK_URL = 'https://api.cohere.com/v1/rerank';
const COHERE_MODEL = 'rerank-v3.5';

// El rerank es un paso adicional dentro de un pipeline que ya hizo 2 RPC a
// Supabase + 1 embedding HF antes de llegar aquí, y el usuario espera el
// primer token del streaming — un timeout corto es preferible a alargar la
// respuesta completa por este paso opcional.
const RERANK_TIMEOUT_MS = 5000;

/** Forma mínima que necesita un candidato para poder reordenarse. */
export interface CandidatoRerank {
  contenido: string;
  relevancia: number;
}

interface CohereRerankResponse {
  results: Array<{ index: number; relevance_score: number }>;
}

/**
 * Reordena `candidatos` por relevancia real consulta-documento vía Cohere
 * rerank-v3.5, y trunca al resultado a los `topN` mejores.
 *
 * Nunca lanza. Ante cualquier fallo (sin API key, red, timeout, respuesta
 * inválida) retorna `candidatos.slice(0, topN)` -- los primeros `topN` en su
 * orden de entrada, que ya viene ordenado por similitud pgvector desde el
 * caller. `relevancia` se reasigna al `relevance_score` de Cohere solo si el
 * rerank tuvo éxito; en el camino de fallback queda intacta.
 *
 * `T` debe traer `contenido` (texto evaluado) y `relevancia` (score previo).
 */
export async function rerankearFragmentos<T extends CandidatoRerank>(
  query: string,
  candidatos: T[],
  topN: number,
): Promise<T[]> {
  if (candidatos.length === 0) return [];

  const apiKey = process.env.COHERE_API_KEY?.trim();
  if (!apiKey) {
    console.warn('[Rerank] COHERE_API_KEY no configurada — se mantiene el orden por similitud pgvector.');
    return candidatos.slice(0, topN);
  }

  try {
    const res = await fetch(COHERE_RERANK_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: COHERE_MODEL,
        query,
        // Documentos como texto plano (forma soportada por la v1 de Cohere).
        // No se trunca aquí: el endpoint trunca internamente documentos
        // largos antes de puntuar, sin devolver error por longitud.
        documents: candidatos.map((c) => c.contenido),
        top_n: Math.min(topN, candidatos.length),
      }),
      signal: AbortSignal.timeout(RERANK_TIMEOUT_MS),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      throw new Error(`Cohere rerank ${res.status}: ${err.slice(0, 150)}`);
    }

    const data = (await res.json()) as CohereRerankResponse;
    if (!Array.isArray(data.results) || data.results.length === 0) {
      throw new Error('Cohere rerank: respuesta sin resultados');
    }

    return data.results.map((r) => ({
      ...candidatos[r.index],
      relevancia: r.relevance_score,
    }));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[Rerank] Cohere falló, degradando a orden pgvector: ${msg}`);
    return candidatos.slice(0, topN);
  }
}
