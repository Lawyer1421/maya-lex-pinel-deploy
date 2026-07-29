/**
 * lib/ingesta-oficial/embeddings.ts
 * Proveedor de embeddings del pipeline de ingesta — pluggable por diseño.
 *
 * Esta fase NO debe conectar un proveedor de embeddings real (HuggingFace,
 * el mismo que usa lib/rag/embed.ts en producción) porque eso requeriría
 * HF_API_TOKEN de producción — explícitamente prohibido en esta fase.
 * `FakeEmbeddingProvider` genera un vector determinístico (mismo texto →
 * mismo vector) de 384 dimensiones, la misma dimensión que el corpus real,
 * solo para probar el pipeline extremo a extremo sin red ni credenciales.
 *
 * Para conectar el proveedor real en una fase futura autorizada: implementar
 * EmbeddingProvider con lib/rag/embed.ts (embedQuery/embedPassage) y
 * sustituir la instancia por defecto — ningún consumidor de este módulo
 * necesita cambiar.
 */

export const EMBED_DIMS = 384;

export interface EmbeddingProvider {
  embed(texto: string): Promise<number[]>;
}

/** Hash simple determinístico (no criptográfico) — solo para generar semilla del vector falso. */
function hashSimple(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) {
    h = (Math.imul(31, h) + texto.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

export class FakeEmbeddingProvider implements EmbeddingProvider {
  async embed(texto: string): Promise<number[]> {
    const semilla = hashSimple(texto);
    const vec = new Array(EMBED_DIMS).fill(0);
    let estado = semilla || 1;
    for (let i = 0; i < EMBED_DIMS; i++) {
      // LCG determinístico — mismo texto siempre produce el mismo vector.
      estado = (Math.imul(1103515245, estado) + 12345) >>> 0;
      vec[i] = (estado / 0xffffffff) * 2 - 1;
    }
    const norma = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
    return vec.map((x) => x / norma);
  }
}
