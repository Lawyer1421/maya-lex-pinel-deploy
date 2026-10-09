import { describe, it, expect } from 'vitest';
import { LexicalLabAdapter, LEXICAL_MIN_SCORE } from '@/lib/legal-retrieval/lab/lexical-lab';
import { recuperarLab } from '@/lib/legal-retrieval/lab/pipeline';
import { LAB_CORPUS_V1, LAB_QUERIES_V1 } from './fixtures/corpus-v1';

/**
 * Casos adversariales del léxico. El umbral LEXICAL_MIN_SCORE NO se ajusta
 * en esta fase. Los comportamientos marcados COMPORTAMIENTO_ACTUAL_CUESTIONABLE
 * se registran tal como son, para revisión posterior.
 */

const adaptador = new LexicalLabAdapter();
const q = (id: string) => LAB_QUERIES_V1.find((x) => x.id === id)!;

describe('léxico adversarial — casos base', () => {
  it('el umbral vigente se mantiene en 0.2', () => {
    expect(LEXICAL_MIN_SCORE).toBe(0.2);
  });

  it('una palabra común aislada ("plazo") supera el umbral — COMPORTAMIENTO_ACTUAL_CUESTIONABLE', () => {
    const hits = adaptador.buscar('plazo', LAB_CORPUS_V1);
    expect(hits.length).toBeGreaterThan(0);
  });

  it('la frase "de la" (sólo palabras vacías) no produce coincidencias', () => {
    expect(adaptador.buscar('de la', LAB_CORPUS_V1)).toHaveLength(0);
  });

  it('acentos y ausencia de acentos producen los mismos resultados', () => {
    const conAcento = adaptador.buscar('Código Civil sintético', LAB_CORPUS_V1);
    const sinAcento = adaptador.buscar('codigo civil sintetico', LAB_CORPUS_V1);
    expect(sinAcento).toEqual(conAcento);
  });

  it('sólo puntuación no produce coincidencias', () => {
    expect(adaptador.buscar('¿?!... --', LAB_CORPUS_V1)).toHaveLength(0);
  });

  it('un decreto explícito ubica la unidad correcta en primer lugar', () => {
    expect(adaptador.buscar('decreto 99-2000', LAB_CORPUS_V1)[0].id).toBe('lab-dec-99');
  });

  it('un nombre parcial de fuente empata entre fuentes equivalentes; el orden de empate es alfabético — COMPORTAMIENTO_ACTUAL_CUESTIONABLE', () => {
    const top = adaptador.buscar('Código Civil', LAB_CORPUS_V1).slice(0, 2);
    expect(top.map((h) => h.id).sort()).toEqual(['lab-amb-190-civil', 'lab-cc-173']);
    expect(top[0].score).toBe(top[1].score);
  });

  it('una consulta sinónima no produce coincidencia léxica (límite declarado)', () => {
    expect(adaptador.buscar(q('Q06').texto, LAB_CORPUS_V1)).toHaveLength(0);
  });
});

describe('léxico adversarial — vocabulario jurídico compartido', () => {
  it('"plazo de prueba" recupera una unidad no relacionada que comparte "plazo de" — COMPORTAMIENTO_ACTUAL_CUESTIONABLE', () => {
    const ids = adaptador.buscar('plazo de prueba', LAB_CORPUS_V1).map((h) => h.id);
    expect(ids).toContain('lab-merc-300');
  });

  it('"Código Civil" recupera también unidades de otros códigos por la palabra "código" — COMPORTAMIENTO_ACTUAL_CUESTIONABLE', () => {
    const ids = adaptador.buscar('Código Civil', LAB_CORPUS_V1).map((h) => h.id);
    expect(ids.some((id) => id !== 'lab-cc-173')).toBe(true);
  });
});

describe('léxico adversarial — distractor léxico frente a correcto semántico', () => {
  it('Q23: el distractor semántico de alta puntuación gana dentro del mismo nivel — COMPORTAMIENTO_ACTUAL_CUESTIONABLE', () => {
    const res = recuperarLab(q('Q23'), LAB_CORPUS_V1, { k: 5 });
    expect(res.ranking[0].id).toBe('lab-merc-300');
    expect(res.ranking.map((c) => c.id)).toContain('lab-cpp-180');
    expect(res.ranking[0].rol_recuperacion).toBe('PRIMARY');
  });

  it('la misma consulta en SEMANTIC_ONLY y HYBRID muestra cómo cambia el orden', () => {
    const semantico = recuperarLab(q('Q23'), LAB_CORPUS_V1, { k: 5, modo: 'SEMANTIC_ONLY' });
    const hibrido = recuperarLab(q('Q23'), LAB_CORPUS_V1, { k: 5, modo: 'HYBRID' });
    expect(semantico.ranking[0].id).toBe('lab-merc-300');
    expect(hibrido.ranking.map((c) => c.id)).toEqual(expect.arrayContaining(['lab-cpp-180', 'lab-merc-300']));
  });
});
