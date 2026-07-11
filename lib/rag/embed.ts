/**
 * lib/rag/embed.ts
 * Embedding de consultas para el backend RAG 'supabase' (pgvector).
 *
 * El corpus fue indexado con intfloat/multilingual-e5-small (384 dims):
 *   documentos con prefijo "passage: ..." · consultas con prefijo "query: ..."
 * La consulta DEBE usar el mismo modelo — un modelo distinto produce
 * vectores incompatibles y resultados basura.
 *
 * Proveedor: HuggingFace Inference API (HF_API_TOKEN en env).
 * Seguridad: URL fija (anti-SSRF), token solo server-side, timeout 4s.
 */

// Endpoint del ROUTER de HF (el dominio legado api-inference.huggingface.co
// fue desmantelado en 2025 — devolvía "fetch failed" en producción).
const HF_MODEL_URL =
  'https://router.huggingface.co/hf-inference/models/intfloat/multilingual-e5-small/pipeline/feature-extraction';

const EMBED_DIMS = 384;

/**
 * Genera el embedding e5 de una consulta (con prefijo "query: ").
 * Lanza Error si HF_API_TOKEN falta o la API falla — el caller (buscarRAG)
 * captura y degrada a sin-RAG.
 */
export async function embedQuery(consulta: string): Promise<number[]> {
  const token = process.env.HF_API_TOKEN?.trim();
  if (!token) {
    throw new Error('HF_API_TOKEN no configurada — embedding de consulta no disponible');
  }

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(HF_MODEL_URL, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: `query: ${consulta.slice(0, 500)}`,
        options: { wait_for_model: true },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      throw new Error(`HF Inference ${res.status}: ${err.slice(0, 120)}`);
    }

    const data = (await res.json()) as unknown;
    return normalizarSalidaHF(data);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * La API de HF puede devolver:
 *   [dims]           → embedding ya agrupado (sentence-transformers pipeline)
 *   [tokens][dims]   → embeddings por token → mean pooling
 *   [1][tokens][dims]→ batch de 1 → mean pooling
 * Normaliza siempre a un vector L2-unitario de 384 dims (igual que el corpus,
 * indexado con normalize_embeddings=True).
 */
function normalizarSalidaHF(data: unknown): number[] {
  let vec: number[];

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('HF Inference: respuesta vacía o inválida');
  }

  if (typeof data[0] === 'number') {
    vec = data as number[];
  } else {
    let tokens = data as number[][] | number[][][];
    if (Array.isArray(tokens[0]) && Array.isArray((tokens[0] as number[][])[0])) {
      tokens = (tokens as number[][][])[0]; // desempaquetar batch de 1
    }
    const matriz = tokens as number[][];
    const dims = matriz[0].length;
    vec = new Array(dims).fill(0);
    for (const fila of matriz) {
      for (let i = 0; i < dims; i++) vec[i] += fila[i];
    }
    for (let i = 0; i < dims; i++) vec[i] /= matriz.length; // mean pooling
  }

  if (vec.length !== EMBED_DIMS) {
    throw new Error(`HF Inference: dims inesperadas (${vec.length} ≠ ${EMBED_DIMS})`);
  }

  // Normalización L2 (el corpus está normalizado — cosine requiere paridad)
  const norma = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
  return vec.map((x) => x / norma);
}
