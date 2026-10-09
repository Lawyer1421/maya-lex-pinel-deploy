import { describe, it, expect } from 'vitest';
import { recuperarLab } from '@/lib/legal-retrieval/lab/pipeline';
import { resolverExactoLab } from '@/lib/legal-retrieval/lab/exact-lab';
import { resolverArticuloExacto, detectarArticuloExacto, type FilaExactaDB } from '@/lib/legal-retrieval/exact-resolver';
import { LAB_CORPUS_V1, LAB_QUERIES_V1 } from './fixtures/corpus-v1';

const q = (id: string) => {
  const found = LAB_QUERIES_V1.find((x) => x.id === id);
  if (!found) throw new Error(`consulta ${id} no existe en la fixture`);
  return found;
};

describe('FAST PATH exacto — comportamiento de producción preservado', () => {
  it('Q01 artículo con instrumento explícito resuelve por exacto y no ejecuta léxico ni semántico', () => {
    const res = recuperarLab(q('Q01'), LAB_CORPUS_V1, { k: 5 });
    expect(res.ruta).toBe('FAST_EXACT');
    expect(res.estadoExacto).toBe('EXACT_SUCCESS');
    expect(res.ranking.map((c) => c.id)).toEqual(['lab-cpp-173']);
    expect(res.ranking[0].retrieval_channel).toEqual(['exact']);
    expect(res.ranking[0].exact_match).toBe(true);
    expect(res.tiemposMs.lexico).toBe(0);
    expect(res.tiemposMs.semantico).toBe(0);
  });

  it('el fragmento exacto del laboratorio coincide con el del resolvedor de producción', () => {
    const detect = detectarArticuloExacto(q('Q01').texto);
    expect(detect?.numero).toBe('173');
    const filaProduccion: FilaExactaDB = {
      id: 'lab-cpp-173',
      contenido: LAB_CORPUS_V1.find((r) => r.id === 'lab-cpp-173')!.contenido,
      num_articulo: '173',
      fuente: LAB_CORPUS_V1.find((r) => r.id === 'lab-cpp-173')!.fuente!,
      fuente_tipo: 'codigo',
      jurisdiccion: 'HN',
      es_norma_vigente: true,
      materia: '01_PENAL',
      metadata: {},
    };
    const directo = resolverArticuloExacto([filaProduccion], '173', 'CODIGO_PROCESAL_PENAL');
    const lab = resolverExactoLab(q('Q01').texto, LAB_CORPUS_V1);
    expect(lab.fragmento?.hash).toBe(directo.fragmentos[0].hash);
    expect(lab.fragmento?.contenido).toBe(directo.fragmentos[0].contenido);
  });

  it('Q02 instrumento solicitado sin candidato identificado abstiene, no cae a semántica', () => {
    const res = recuperarLab(q('Q02'), LAB_CORPUS_V1, { k: 5 });
    expect(res.estadoExacto).toBe('ABSTAIN_INSTRUMENT_OR_MATERIA');
    expect(res.ruta).toBe('ABSTAIN');
    expect(res.ranking).toHaveLength(0);
  });
});

describe('STANDARD LAB PATH — exclusiones duras', () => {
  it('Q10: un doc_* con alta similitud nunca llega al ranking', () => {
    const res = recuperarLab(q('Q10'), LAB_CORPUS_V1, { k: 5 });
    expect(res.ruta).toBe('STANDARD_LAB');
    expect(res.ranking.map((c) => c.id)).not.toContain('lab-doc-9f2a');
    expect(res.excluidos.some((e) => e.id === 'lab-doc-9f2a' && e.motivo === 'CAPA_DOC_STAR')).toBe(true);
  });

  it('Q11: fuente=NULL nunca sobrevive', () => {
    const res = recuperarLab(q('Q11'), LAB_CORPUS_V1, { k: 5 });
    expect(res.ranking.map((c) => c.id)).not.toContain('lab-null-1');
    expect(res.excluidos.some((e) => e.id === 'lab-null-1' && e.motivo === 'FUENTE_NULL')).toBe(true);
  });

  it('Q12: código HN no vigente (D6b) queda excluido en canales léxico y semántico', () => {
    const res = recuperarLab(q('Q12'), LAB_CORPUS_V1, { k: 5 });
    expect(res.ranking.map((c) => c.id)).not.toContain('lab-derog-120');
    expect(res.excluidos.some((e) => e.id === 'lab-derog-120' && e.motivo === 'D6B_NO_VIGENTE_HN')).toBe(true);
  });

  it('revision_pendiente y anonimización no reaparecen', () => {
    const res = recuperarLab(
      { ...q('Q08'), semantic_hits: [...q('Q08').semantic_hits, { id: 'lab-cpp-177-rev', score: 0.9 }, { id: 'lab-cpp-176-anon', score: 0.85 }] },
      LAB_CORPUS_V1,
      { k: 10 },
    );
    const ids = res.ranking.map((c) => c.id);
    expect(ids).not.toContain('lab-cpp-177-rev');
    expect(ids).not.toContain('lab-cpp-176-anon');
  });

  it('Q13 conjunto mixto: jurisprudencia y norma sobreviven; doc_* no', () => {
    const res = recuperarLab(q('Q13'), LAB_CORPUS_V1, { k: 5 });
    const ids = res.ranking.map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(['lab-cpp-173', 'lab-sent-1']));
    expect(ids.some((id) => id.startsWith('lab-docbulk') || id === 'lab-doc-9f2a')).toBe(false);
  });

  it('Q14 sin evidencia no produce candidatos por coincidencias de un solo token', () => {
    const res = recuperarLab(q('Q14'), LAB_CORPUS_V1, { k: 5 });
    expect(res.ranking).toHaveLength(0);
  });
});

describe('tiempos por etapa', () => {
  it('reporta cada etapa por separado y un total no negativo', () => {
    const res = recuperarLab(q('Q03'), LAB_CORPUS_V1, { k: 5 });
    for (const clave of ['exacto', 'lexico', 'semantico', 'fusion', 'dedup', 'ranking', 'total'] as const) {
      expect(res.tiemposMs[clave]).toBeGreaterThanOrEqual(0);
    }
  });
});
