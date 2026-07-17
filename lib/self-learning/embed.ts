/**
 * lib/self-learning/embed.ts
 * Embeddings para el conocimiento comunitario — intfloat/multilingual-e5-small
 * (384 dims), el MISMO modelo que biblioteca_vectores.
 *
 * Por qué NO OpenAI/Gemini/Claude aquí (a pesar de haberse sugerido):
 *   - Anthropic/Claude no ofrece API de embeddings (su socio recomendado
 *     es Voyage AI, un proveedor distinto).
 *   - Un modelo de embeddings diferente genera vectores en un espacio
 *     matemático incompatible — la similitud coseno entre un vector de
 *     OpenAI y uno de e5-small no tiene significado real. Usarlos
 *     mezclados daría resultados de búsqueda basura.
 *   - Reutilizar e5-small mantiene la puerta abierta a fusionar este
 *     índice con biblioteca_vectores en el futuro si se decide así,
 *     sin tener que re-embeber todo el corpus curado.
 *
 * Deliberadamente NO importa lib/rag/embed.ts (aislamiento del feature
 * branch) — hay duplicación menor de código a cambio de cero riesgo de
 * tocar el pipeline de producción.
 */

const HF_MODEL_URL =
  'https://router.huggingface.co/hf-inference/models/intfloat/multilingual-e5-small/pipeline/feature-extraction';

const EMBED_DIMS = 384;

async function embedTexto(texto: string, prefijo: 'query' | 'passage'): Promise<number[]> {
  const token = process.env.HF_API_TOKEN?.trim();
  if (!token) {
    throw new Error('HF_API_TOKEN no configurada — embedding no disponible');
  }

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(HF_MODEL_URL, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: `${prefijo}: ${texto.slice(0, 2000)}`,
        options: { wait_for_model: true },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      throw new Error(`HF Inference ${res.status}: ${err.slice(0, 120)}`);
    }

    return normalizarSalidaHF(await res.json());
  } finally {
    clearTimeout(timeoutId);
  }
}

export const embedPassage = (texto: string) => embedTexto(texto, 'passage');
export const embedQueryComunidad = (texto: string) => embedTexto(texto, 'query');

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
      tokens = (tokens as number[][][])[0];
    }
    const matriz = tokens as number[][];
    const dims = matriz[0].length;
    vec = new Array(dims).fill(0);
    for (const fila of matriz) {
      for (let i = 0; i < dims; i++) vec[i] += fila[i];
    }
    for (let i = 0; i < dims; i++) vec[i] /= matriz.length;
  }

  if (vec.length !== EMBED_DIMS) {
    throw new Error(`HF Inference: dims inesperadas (${vec.length} ≠ ${EMBED_DIMS})`);
  }

  const norma = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
  return vec.map((x) => x / norma);
}

/**
 * Divide un documento largo en fragmentos de ~1200 caracteres con
 * solapamiento, cortando preferentemente en párrafos.
 */
export function fragmentarDocumento(texto: string, maxChars = 1200, overlap = 100): string[] {
  if (texto.length <= maxChars) return [texto];

  const partes: string[] = [];
  let inicio = 0;
  while (inicio < texto.length) {
    const fin = inicio + maxChars;
    if (fin >= texto.length) {
      partes.push(texto.slice(inicio).trim());
      break;
    }
    let corte = texto.lastIndexOf('\n\n', fin);
    if (corte <= inicio) corte = texto.lastIndexOf('. ', fin);
    if (corte <= inicio) corte = fin;
    partes.push(texto.slice(inicio, corte).trim());
    inicio = Math.max(inicio + 1, corte - overlap);
  }
  return partes.filter((p) => p.length > 0);
}
