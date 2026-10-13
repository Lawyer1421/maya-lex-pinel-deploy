import { describe, it, expect } from 'vitest';
import { formatearContextoRAG } from '@/lib/legal-retrieval/evidence-engine';
import type { FragmentoRAG, ResultadoRAG } from '@/lib/legal-retrieval/types';

/**
 * P1-3: en NONE los fragmentos se describen como recuperados por similitud, sin
 * evaluación jurídica, y no se habilita al modelo para suplir evidencia ausente.
 * P1-4: con identidad única se conserva el comportamiento; un fragmento de otro
 * artículo del mismo instrumento es contexto complementario y no el artículo pedido.
 */

const FUENTE_PENAL = 'Codigo Penal';

const frag = (id: string, num: string | null, fuente = FUENTE_PENAL): FragmentoRAG => ({
  id, contenido: `Texto de ${id}.`, num_articulo: num, fuente, relevancia: 0.8,
  fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true,
});

const resultado = (fragmentos: FragmentoRAG[], extra: Partial<ResultadoRAG> = {}): ResultadoRAG => ({
  fragmentos, articulos_encontrados: fragmentos.map((f) => f.num_articulo ?? '').filter(Boolean), backend: 'supabase', ...extra,
});

describe('P1-3 — NONE: similitud sin evaluación jurídica y sin suplir evidencia', () => {
  it('describe los fragmentos como recuperados por similitud y prohíbe completar con conocimiento general', () => {
    const ctx = formatearContextoRAG(resultado([frag('a', '1')], { intencionInstrumental: 'NONE' }));

    expect(ctx).toContain('recuperados por similitud y no han sido evaluados jurídicamente');
    expect(ctx).toContain('no completes con conocimiento general');
    expect(ctx).toContain('similitud de recuperación:');
    expect(ctx).toContain('sin evaluación de relevancia jurídica');
  });
});

describe('P1-4 — artículo pedido frente a contexto complementario', () => {
  it('identidad única sin artículo pedido: sin marca complementaria (comportamiento previo)', () => {
    const ctx = formatearContextoRAG(resultado([frag('a', '1'), frag('b', '2')], { intencionInstrumental: 'SPECIFIC_RESOLVED' }));

    expect(ctx).not.toContain('contexto complementario');
    expect(ctx).toContain('similitud de recuperación:');
  });

  it('identidad única con artículo pedido: el del artículo pedido no se marca; el de otro artículo sí', () => {
    const ctx = formatearContextoRAG(resultado(
      [frag('art-173', '173'), frag('art-174', '174')],
      { intencionInstrumental: 'SPECIFIC_RESOLVED', articulosSolicitados: ['173'] },
    ));
    const lineas = ctx.split('\n');
    const cabecera173 = lineas.find((l) => l.includes('Art. 173'))!;
    const cabecera174 = lineas.find((l) => l.includes('Art. 174'))!;

    expect(cabecera173).not.toContain('contexto complementario');
    expect(cabecera174).toContain('contexto complementario: no es el artículo solicitado');
  });
});
