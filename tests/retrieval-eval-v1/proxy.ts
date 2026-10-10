import type { LabRow } from '@/lib/legal-retrieval/lab/types';

/**
 * PROXY SEMÁNTICO LOCAL — NO es multilingual-e5-small.
 * Coseno TF-IDF sobre trigramas de caracteres normalizados (sin acentos, minúsculas).
 * Se usa porque la evaluación no puede llamar a embeddings externos. Sus resultados
 * no representan la calidad del modelo de producción.
 */

export const NOMBRE_PROXY = 'CHAR3GRAM_TFIDF_LOCAL_NOT_E5' as const;

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function trigramas(texto: string): Map<string, number> {
  const t = ` ${normalizar(texto)} `;
  const out = new Map<string, number>();
  for (let i = 0; i + 3 <= t.length; i++) {
    const g = t.slice(i, i + 3);
    out.set(g, (out.get(g) ?? 0) + 1);
  }
  return out;
}

export function puntuarProxy(consulta: string, filas: readonly LabRow[]): { id: string; score: number }[] {
  const docs = filas.map((f) => trigramas(`${f.contenido} ${f.fuente ?? ''}`));
  const df = new Map<string, number>();
  for (const d of docs) for (const g of d.keys()) df.set(g, (df.get(g) ?? 0) + 1);
  const n = docs.length;
  const idf = (g: string): number => Math.log((n + 1) / ((df.get(g) ?? 0) + 1)) + 1;

  const vec = (tf: Map<string, number>): Map<string, number> => {
    const v = new Map<string, number>();
    for (const [g, c] of tf) v.set(g, c * idf(g));
    return v;
  };
  const norma = (v: Map<string, number>): number => Math.sqrt([...v.values()].reduce((s, x) => s + x * x, 0));

  const q = vec(trigramas(consulta));
  const nq = norma(q);
  if (nq === 0) return [];

  const hits: { id: string; score: number }[] = [];
  filas.forEach((f, i) => {
    const d = vec(docs[i]);
    const nd = norma(d);
    if (nd === 0) return;
    let dot = 0;
    for (const [g, x] of q) {
      const y = d.get(g);
      if (y !== undefined) dot += x * y;
    }
    const score = dot / (nq * nd);
    if (score > 0) hits.push({ id: f.id, score: Math.round(score * 1e6) / 1e6 });
  });
  hits.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return hits;
}
