import { describe, it, expect } from 'vitest';
import { construirCitas } from '@/app/api/chat/route';
import { hashFragmento, type FragmentoRAG } from '@/lib/rag/search';

/**
 * P0-2 — Verificación de citas exactas (mockeada, sin DB real).
 * Simula 3 respuestas típicas de buscar_biblioteca_v2 (Art. 1 CPC, Art. 173
 * CPP, Art. 22 Código Penal) y valida que construirCitas() produzca el
 * formato exacto requerido: artículo, texto, fuente, hash de 8 chars.
 * No sustituye una prueba E2E contra Supabase real — eso requiere
 * credenciales de staging que no están disponibles en este entorno.
 */

function frag(overrides: Partial<FragmentoRAG>): FragmentoRAG {
  const base: FragmentoRAG = {
    id: 'x', contenido: 'texto', num_articulo: '1', fuente: 'Poder Judicial de Honduras',
    relevancia: 0.9, fuente_tipo: 'norma', jurisdiccion: 'HN', es_norma_vigente: true,
  };
  const f = { ...base, ...overrides };
  return { ...f, hash: hashFragmento(f) };
}

describe('construirCitas — P0-2 pipeline de citas exactas', () => {
  it('Art. 1 CPC — norma vigente TSC entra con hash de 8 chars', () => {
    const citas = construirCitas([
      frag({ num_articulo: '1', fuente: 'TSC', contenido: 'Derecho de acceso a los juzgados...' }),
    ]);
    expect(citas).toHaveLength(1);
    expect(citas[0].articulo).toBe('1');
    expect(citas[0].fuente).toBe('TSC');
    expect(citas[0].hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('Art. 173 CPP — Poder Judicial, doctrina comparada NO entra como cita', () => {
    const citas = construirCitas([
      frag({ num_articulo: '173', fuente: 'Poder Judicial de Honduras' }),
      frag({ num_articulo: '173', fuente: 'Doctrina Comparada', es_norma_vigente: false }),
    ]);
    expect(citas).toHaveLength(1);
    expect(citas[0].vigente).toBe(true);
  });

  it('deduplica por (articulo, fuente) y limita a 5 citas', () => {
    const dup = frag({ num_articulo: '22', fuente: 'TSC' });
    const muchas = Array.from({ length: 8 }, (_, i) => frag({ num_articulo: String(i), fuente: 'TSC' }));
    const citas = construirCitas([dup, dup, ...muchas]);
    expect(citas.length).toBeLessThanOrEqual(5);
    const claves = citas.map((c) => `${c.articulo}|${c.fuente}`);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it('hashFragmento es determinista para el mismo contenido', () => {
    const f1 = frag({ num_articulo: '1', contenido: 'mismo texto' });
    const f2 = frag({ num_articulo: '1', contenido: 'mismo texto' });
    expect(f1.hash).toBe(f2.hash);
  });
});
