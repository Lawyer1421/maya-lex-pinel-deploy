import { describe, it, expect } from 'vitest';
import { compararOrdenLegal, puntuarCandidatos, PESOS_RECUPERACION, INVARIANTES_PUNTUACION_RECUPERACION } from '@/lib/legal-retrieval/lab/ranking';
import type { LabCandidate, RankedCandidate } from '@/lib/legal-retrieval/lab/types';

const CONTEXTO = { materia: null, intencion: { historicaCPC: false } };

interface Opciones {
  fuente?: string;
  tipo?: string | null;
  vigente?: boolean | null;
  num?: string | null;
  contenido?: string;
  lexical?: number | null;
  semantic?: number | null;
  exact?: boolean;
  materia?: string | null;
  jurisdiccion?: string | null;
}

function cand(id: string, o: Opciones = {}): LabCandidate {
  return {
    id,
    contenido: o.contenido ?? `ARTICULO ${o.num ?? '1'}.- Texto de prueba sintético ${id}.`,
    num_articulo: o.num === undefined ? '1' : o.num,
    fuente: o.fuente ?? `Fuente Fixture ${id}`,
    fuente_tipo: o.tipo === undefined ? 'codigo' : o.tipo,
    jurisdiccion: o.jurisdiccion === undefined ? 'HN' : o.jurisdiccion,
    es_norma_vigente: o.vigente === undefined ? true : o.vigente,
    materia: o.materia ?? null,
    hash: `h-${id}`,
    retrieval_channel: o.exact ? ['exact'] : ['lexical'],
    semantic_score: o.semantic ?? null,
    lexical_score: o.lexical ?? null,
    exact_match: o.exact ?? false,
  };
}

const ids = (r: RankedCandidate[]) => r.map((c) => c.id);

describe('orden legal lexicográfico', () => {
  it('un PRIMARY con puntuación de recuperación nula supera a un CONTEXT con puntuación máxima', () => {
    const { ranking } = puntuarCandidatos(
      [
        cand('ctx-alto', { tipo: 'sentencia', vigente: false, jurisdiccion: 'ES', lexical: 1, semantic: 1 }),
        cand('prim-bajo', { lexical: null, semantic: null }),
      ],
      CONTEXTO,
    );
    expect(ids(ranking)).toEqual(['prim-bajo', 'ctx-alto']);
  });

  it('una similitud semántica muy alta no supera a un nivel legal superior', () => {
    const { ranking } = puntuarCandidatos(
      [cand('ctx', { tipo: 'sentencia', vigente: false, jurisdiccion: 'ES', semantic: 1 }), cand('prim', { semantic: 0 })],
      CONTEXTO,
    );
    expect(ranking[0].id).toBe('prim');
  });

  it('una coincidencia léxica muy alta no promueve un CONTEXT a PRIMARY', () => {
    const { ranking } = puntuarCandidatos(
      [cand('ctx', { tipo: 'instrumento', lexical: 1 }), cand('prim', { lexical: 0 })],
      CONTEXTO,
    );
    expect(ranking[0].rol_recuperacion).toBe('PRIMARY');
    expect(ranking[0].id).toBe('prim');
    expect(ranking[1].rol_recuperacion).toBe('CONTEXT');
  });

  it('un SECONDARY no supera a un PRIMARY por puntuación numérica', () => {
    const { ranking } = puntuarCandidatos(
      [
        cand('sec', { fuente: 'Ley Especial de Adopciones de Honduras (Decreto 102-2018) (FIXTURE)', tipo: 'instrumento', semantic: 1, lexical: 1 }),
        cand('prim', { semantic: 0, lexical: 0 }),
      ],
      CONTEXTO,
    );
    expect(ranking[0].id).toBe('prim');
    expect(ranking[1].rol_recuperacion).toBe('SECONDARY');
  });

  it('la penalización de espejo opera después de las compuertas legales', () => {
    const cands = [
      cand('prim-a', { fuente: 'F', num: '9', contenido: 'A', lexical: 0.9 }),
      cand('prim-b', { fuente: 'F', num: '9', contenido: 'B', lexical: 0.9 }),
      cand('ctx-c', { fuente: 'G', num: '9', tipo: 'sentencia', vigente: false, jurisdiccion: 'ES', lexical: 0.1 }),
    ];
    const { ranking } = puntuarCandidatos(cands, CONTEXTO);
    expect(ids(ranking)).toEqual(['prim-a', 'prim-b', 'ctx-c']);
    expect(ranking[1].legal_order_key.penalizacion_espejo).toBe(-1);
  });

  it('dentro del mismo nivel legal, la penalización de espejo decide antes que la puntuación de recuperación', () => {
    const cands = [
      cand('a-conservado', { fuente: 'F', num: '9', contenido: 'A', lexical: 1.0 }),
      cand('b-penalizado', { fuente: 'F', num: '9', contenido: 'B', lexical: 0.9 }),
      cand('c-limpio', { fuente: 'G', num: '3', contenido: 'C', lexical: 0.1 }),
    ];
    const { ranking } = puntuarCandidatos(cands, CONTEXTO);
    expect(ids(ranking)).toEqual(['a-conservado', 'c-limpio', 'b-penalizado']);
  });

  it('la puntuación de recuperación sólo desempata dentro del mismo nivel legal', () => {
    const { ranking } = puntuarCandidatos(
      [cand('bajo', { fuente: 'A', num: '1', lexical: 0.1 }), cand('alto', { fuente: 'B', num: '2', lexical: 0.9 })],
      CONTEXTO,
    );
    expect(ranking[0].id).toBe('alto');
    expect(compararOrdenLegal(ranking[0].legal_order_key, ranking[1].legal_order_key)).toBe(0);
  });

  it('la vigencia TRUE supera a UNKNOWN y FALSE sólo en el mismo rol', () => {
    const { ranking } = puntuarCandidatos(
      [
        cand('falso', { fuente: 'A', num: '1', vigente: false, tipo: 'codigo', jurisdiccion: 'ES' }),
        cand('desconocido', { fuente: 'B', num: '2', vigente: null, tipo: 'sentencia', jurisdiccion: 'ES' }),
        cand('verdadero', { fuente: 'C', num: '3', vigente: true, tipo: 'sentencia', jurisdiccion: 'ES' }),
      ],
      CONTEXTO,
    );
    expect(ids(ranking)).toEqual(['verdadero', 'desconocido', 'falso']);
  });
});

describe('dimensiones desconocidas son neutrales', () => {
  it('relación verificada y jerarquía valen cero para todos los candidatos', () => {
    const { ranking } = puntuarCandidatos([cand('a'), cand('b', { fuente: 'X', num: '2' })], CONTEXTO);
    for (const c of ranking) {
      expect(c.legal_order_key.relacion_verificada).toBe(0);
      expect(c.legal_order_key.jerarquia_normativa).toBe(0);
    }
  });

  it('no existe campo de confianza, probabilidad o autoridad en el candidato ni en la clave legal', () => {
    const { ranking } = puntuarCandidatos([cand('a')], CONTEXTO);
    const prohibidos = ['confidence', 'probability', 'authority', 'prestige', 'composite', 'ranking_components', 'canonical_status', 'normative_rank'];
    for (const p of prohibidos) {
      expect(Object.keys(ranking[0])).not.toContain(p);
      expect(Object.keys(ranking[0].legal_order_key)).not.toContain(p);
    }
  });
});

describe('retrieval_order_score es sólo recuperación', () => {
  it('la puntuación de recuperación usa exclusivamente léxico, semántico y completitud de cita', () => {
    expect(Object.keys(PESOS_RECUPERACION).sort()).toEqual(['citation_completeness', 'lexical', 'semantic']);
  });

  it('declara invariantes que la excluyen de confianza, autoridad y suficiencia', () => {
    expect(INVARIANTES_PUNTUACION_RECUPERACION).toContain('retrieval_order_score no es confianza jurídica');
    expect(INVARIANTES_PUNTUACION_RECUPERACION).toContain('retrieval_order_score no satisface suficiencia legal');
    expect(INVARIANTES_PUNTUACION_RECUPERACION).toContain('retrieval_order_score no compensa un nivel legal superior');
  });

  it('la clave legal no contiene ningún componente de recuperación', () => {
    const { ranking } = puntuarCandidatos([cand('a', { lexical: 1, semantic: 1 })], CONTEXTO);
    expect(Object.keys(ranking[0].legal_order_key)).not.toContain('lexical');
    expect(Object.keys(ranking[0].legal_order_key)).not.toContain('semantic');
    expect(Object.keys(ranking[0].legal_order_key)).not.toContain('retrieval_order_score');
  });
});
