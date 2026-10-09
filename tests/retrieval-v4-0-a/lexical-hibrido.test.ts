import { describe, it, expect } from 'vitest';
import { LexicalLabAdapter, LEXICAL_LAB_NAME, LEXICAL_SIGNAL_WEIGHTS } from '@/lib/legal-retrieval/lab/lexical-lab';
import { normalizarTexto, identificadorDecreto } from '@/lib/legal-retrieval/lab/normalize';
import { recuperarLab } from '@/lib/legal-retrieval/lab/pipeline';
import { LAB_CORPUS_V1, LAB_QUERIES_V1 } from './fixtures/corpus-v1';

const q = (id: string) => LAB_QUERIES_V1.find((x) => x.id === id)!;

describe('lexical-lab — adaptador determinista', () => {
  it('se nombra honestamente y no pretende ser PostgreSQL FTS', () => {
    expect(LEXICAL_LAB_NAME).toBe('lexical-lab');
    expect(new LexicalLabAdapter().nombre).toBe('lexical-lab');
  });

  it('los pesos de señales suman 1', () => {
    const suma = Object.values(LEXICAL_SIGNAL_WEIGHTS).reduce((s, v) => s + v, 0);
    expect(suma).toBeCloseTo(1, 10);
  });

  it('misma entrada, misma salida (reproducible)', () => {
    const a = new LexicalLabAdapter().buscar('plazo de prueba de ejemplo', LAB_CORPUS_V1);
    const b = new LexicalLabAdapter().buscar('plazo de prueba de ejemplo', LAB_CORPUS_V1);
    expect(b).toEqual(a);
  });

  it('todas las puntuaciones están en el intervalo [0, 1]', () => {
    const hits = new LexicalLabAdapter().buscar('artículo 173 plazo de prueba', LAB_CORPUS_V1);
    for (const h of hits) {
      expect(h.score).toBeGreaterThan(0);
      expect(h.score).toBeLessThanOrEqual(1);
    }
  });

  it('una consulta con número de artículo puntúa el artículo exacto con encabezado real', () => {
    const hits = new LexicalLabAdapter().buscar('artículo 174 medida cautelar', LAB_CORPUS_V1);
    expect(hits[0].id).toBe('lab-cpp-174');
  });

  it('un número de decreto explícito se reconoce y coincide con el candidato', () => {
    expect(identificadorDecreto('decreto 99-2000')).toBe('99-2000');
    const hits = new LexicalLabAdapter().buscar(q('Q05').texto, LAB_CORPUS_V1);
    expect(hits[0].id).toBe('lab-dec-99');
  });

  it('normaliza acentos y mayúsculas sin perder dígitos', () => {
    expect(normalizarTexto('Artículo 173 — Código ÑANDÚ')).toBe('articulo 173 codigo nandu');
  });

  it('la sinonimia no se resuelve léxicamente (límite declarado)', () => {
    const hits = new LexicalLabAdapter().buscar(q('Q06').texto, LAB_CORPUS_V1);
    expect(hits).toHaveLength(0);
  });
});

describe('fusión híbrida — procedencia por canal', () => {
  it('un candidato hallado por léxico y semántico conserva ambos canales y puntuaciones', () => {
    const res = recuperarLab(q('Q16'), LAB_CORPUS_V1, { k: 10 });
    const cpp173 = res.ranking.find((c) => c.id === 'lab-cpp-173');
    expect(cpp173).toBeDefined();
    expect(cpp173!.retrieval_channel).toEqual(['lexical', 'semantic']);
    expect(cpp173!.lexical_score).not.toBeNull();
    expect(cpp173!.semantic_score).toBe(0.7);
  });

  it('modo solo semántico no produce canal léxico', () => {
    const res = recuperarLab(q('Q03'), LAB_CORPUS_V1, { k: 5, modo: 'SEMANTIC_ONLY' });
    for (const c of res.ranking) expect(c.retrieval_channel).not.toContain('lexical');
  });

  it('modo solo léxico no produce canal semántico', () => {
    const res = recuperarLab(q('Q03'), LAB_CORPUS_V1, { k: 5, modo: 'LEXICAL_ONLY' });
    for (const c of res.ranking) expect(c.retrieval_channel).not.toContain('semantic');
  });
});
