import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CanonicalLegalReference } from '@/lib/exequatur/curriculum/types';

/**
 * P1 delta (Cursor, revisión dirigida sobre 0abaf08 --
 * CANONICAL_BOUNDARY_VERDICT = FAIL_UNIQUENESS): el adaptador ya no llama a
 * buscarArticuloExacto (ese primitivo compartido colapsa candidatos con
 * `.slice(0,1)` antes de que el llamador pueda evaluar unicidad -- ver
 * lib/exequatur/canonical-reference-adapter.ts). Ahora consulta
 * `biblioteca_vectores` directamente, así que aquí se mockea
 * `@/lib/supabase`, mismo patrón que
 * tests/rag-articulo-derogado-fallback.test.ts (chain from().select().eq()
 * con `then` para simular la promesa de Supabase).
 */

function filaNotariadoArt2(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'mayalex_normativos:codigo_notariado_2005_a2',
    contenido: 'ARTÍCULO 2.- El Notariado es la institución del Estado que garantiza la seguridad jurídica.',
    num_articulo: '2',
    fuente: 'Código del Notariado de Honduras (Decreto 353-2005)',
    fuente_tipo: 'codigo',
    jurisdiccion: 'HN',
    es_norma_vigente: true,
    materia: '03_NOTARIAL',
    ...overrides,
  };
}

function filaCivilArt1(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'mayalex_normativos:cc_1906_a1',
    contenido: 'Artículo 1. La ley es una declaración de la voluntad soberana.',
    num_articulo: '1',
    fuente: 'Código Civil de Honduras (Decreto del Poder Ejecutivo del 8 de febrero de 1906)',
    fuente_tipo: 'codigo',
    jurisdiccion: 'HN',
    es_norma_vigente: true,
    materia: '02_CIVIL',
    ...overrides,
  };
}

/** Mismo mock chainable que tests/rag-articulo-derogado-fallback.test.ts. */
function mockSupabaseFilas(filasVigentes: unknown[], filasNoVigentes: unknown[] = []) {
  const eqCallsPorConsulta: Array<Array<[string, unknown]>> = [];
  const from = () => {
    const eqCalls: Array<[string, unknown]> = [];
    eqCallsPorConsulta.push(eqCalls);
    const chain: any = {
      select: () => chain,
      eq: (campo: string, valor: unknown) => {
        eqCalls.push([campo, valor]);
        return chain;
      },
      then: (resolve: (v: { data: unknown[] | null; error: unknown }) => void) => {
        const pideVigente = eqCalls.some(([c, v]) => c === 'es_norma_vigente' && v === true);
        resolve({ data: pideVigente ? filasVigentes : filasNoVigentes, error: null });
      },
    };
    return chain;
  };
  return { createServerSupabaseClient: () => ({ from }), eqCallsPorConsulta };
}

function mockSupabaseError() {
  const from = () => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      then: (resolve: (v: { data: null; error: unknown }) => void) => {
        resolve({ data: null, error: new Error('conexión rechazada') });
      },
    };
    return chain;
  };
  return { createServerSupabaseClient: () => ({ from }) };
}

const REF_NOTARIADO_2: CanonicalLegalReference = { instrumento: 'CODIGO_NOTARIADO', articulo: '2' };
const REF_CIVIL_1: CanonicalLegalReference = { instrumento: 'CODIGO_CIVIL', articulo: '1' };

beforeEach(() => {
  vi.resetModules();
});
afterEach(() => {
  vi.doUnmock('@/lib/supabase');
});

describe('resolverReferenciaLegal — CanonicalLegalReferenceAdapter (Slice 2, P1 delta)', () => {
  it('[1] cero candidatos válidos (vigente y no-vigente vacíos) -> NO_VERIFICADO', async () => {
    vi.doMock('@/lib/supabase', () => mockSupabaseFilas([], []));
    const { resolverReferenciaLegal } = await import('@/lib/exequatur/canonical-reference-adapter');

    const r = await resolverReferenciaLegal(REF_NOTARIADO_2);

    expect(r.estado).toBe('NO_VERIFICADO');
  });

  it('[2] un único candidato válido -> RESUELTO, con contenido/fuente reales', async () => {
    vi.doMock('@/lib/supabase', () => mockSupabaseFilas([filaNotariadoArt2()]));
    const { resolverReferenciaLegal } = await import('@/lib/exequatur/canonical-reference-adapter');

    const r = await resolverReferenciaLegal(REF_NOTARIADO_2);

    expect(r.estado).toBe('RESUELTO');
    if (r.estado === 'RESUELTO') {
      expect(r.contenido).toBe(filaNotariadoArt2().contenido);
      expect(r.fuente).toBe(filaNotariadoArt2().fuente);
      expect(r.vigenciaSegunCorpus).toBe(true);
    }
  });

  it('[3] candidatos válidos en materias distintas (caso clásico heredado de "ambiguo") -> NO_VERIFICADO', async () => {
    const candidatoA = filaNotariadoArt2({ materia: '03_NOTARIAL' });
    const candidatoB = filaNotariadoArt2({
      id: 'otro-id',
      contenido: 'ARTÍCULO 2.- Texto completamente distinto de otra materia.',
      materia: '99_OTRA',
    });
    vi.doMock('@/lib/supabase', () => mockSupabaseFilas([candidatoA, candidatoB]));
    const { resolverReferenciaLegal } = await import('@/lib/exequatur/canonical-reference-adapter');

    const r = await resolverReferenciaLegal(REF_NOTARIADO_2);

    expect(r.estado).toBe('NO_VERIFICADO');
  });

  it('[4] P1 -- múltiples candidatos de la MISMA materia con contenido distinto -> JAMÁS "primer match" RESUELTO', async () => {
    const candidatoA = filaNotariadoArt2({ id: 'fila-1', contenido: 'ARTÍCULO 2.- Versión A del texto.' });
    const candidatoB = filaNotariadoArt2({ id: 'fila-2', contenido: 'ARTÍCULO 2.- Versión B del texto, distinta.' });
    vi.doMock('@/lib/supabase', () => mockSupabaseFilas([candidatoA, candidatoB]));
    const { resolverReferenciaLegal } = await import('@/lib/exequatur/canonical-reference-adapter');

    const r = await resolverReferenciaLegal(REF_NOTARIADO_2);

    // Bajo el camino heredado (resolverArticuloExacto), esto habría producido
    // RESUELTO con candidatoA (el primero) y ambiguo=false -- exactamente el
    // hallazgo P1. Aquí debe fallar cerrado.
    expect(r.estado).toBe('NO_VERIFICADO');
    if (r.estado === 'NO_VERIFICADO') {
      expect(r.motivo).toMatch(/múltiples candidatos/i);
    }
  });

  it('[5] el orden de los candidatos NUNCA determina la autoridad legal -- mismo resultado en ambos órdenes', async () => {
    const candidatoA = filaNotariadoArt2({ id: 'fila-1', contenido: 'ARTÍCULO 2.- Versión A del texto.' });
    const candidatoB = filaNotariadoArt2({ id: 'fila-2', contenido: 'ARTÍCULO 2.- Versión B del texto, distinta.' });

    vi.doMock('@/lib/supabase', () => mockSupabaseFilas([candidatoA, candidatoB]));
    const { resolverReferenciaLegal: resolverOrdenA } = await import('@/lib/exequatur/canonical-reference-adapter');
    const rOrdenA = await resolverOrdenA(REF_NOTARIADO_2);
    vi.doUnmock('@/lib/supabase');
    vi.resetModules();

    vi.doMock('@/lib/supabase', () => mockSupabaseFilas([candidatoB, candidatoA]));
    const { resolverReferenciaLegal: resolverOrdenB } = await import('@/lib/exequatur/canonical-reference-adapter');
    const rOrdenB = await resolverOrdenB(REF_NOTARIADO_2);

    expect(rOrdenA.estado).toBe('NO_VERIFICADO');
    expect(rOrdenB.estado).toBe('NO_VERIFICADO');
    expect(rOrdenA).toEqual(rOrdenB);
  });

  it('múltiples filas físicas comprobadamente idénticas (mismo contenido/fuente/vigencia) -> RESUELTO, sin importar el orden', async () => {
    const copiaA = filaNotariadoArt2({ id: 'fila-1' });
    const copiaB = filaNotariadoArt2({ id: 'fila-2' }); // mismo contenido/fuente/vigencia, distinto id -- duplicado real de ingesta
    vi.doMock('@/lib/supabase', () => mockSupabaseFilas([copiaA, copiaB]));
    const { resolverReferenciaLegal } = await import('@/lib/exequatur/canonical-reference-adapter');

    const r = await resolverReferenciaLegal(REF_NOTARIADO_2);

    expect(r.estado).toBe('RESUELTO');
    if (r.estado === 'RESUELTO') {
      expect(r.contenido).toBe(filaNotariadoArt2().contenido);
    }
  });

  it('[6] FAIL-CLOSED: error de infraestructura en la consulta -> NO_VERIFICADO', async () => {
    vi.doMock('@/lib/supabase', () => mockSupabaseError());
    const { resolverReferenciaLegal } = await import('@/lib/exequatur/canonical-reference-adapter');

    const r = await resolverReferenciaLegal(REF_NOTARIADO_2);

    expect(r.estado).toBe('NO_VERIFICADO');
  });

  it('[7] NO_VERIFICADO nunca lleva contenido citado -- ninguna vía produce una cita fabricada', async () => {
    vi.doMock('@/lib/supabase', () => mockSupabaseFilas([], []));
    const { resolverReferenciaLegal } = await import('@/lib/exequatur/canonical-reference-adapter');

    const r = await resolverReferenciaLegal(REF_NOTARIADO_2);

    expect(r.estado).toBe('NO_VERIFICADO');
    expect(r).not.toHaveProperty('contenido');
    expect(r).not.toHaveProperty('fuente');
  });

  it('[8] las referencias semilla reales del currículo siguen resolviendo cuando la unicidad está establecida', async () => {
    vi.doMock('@/lib/supabase', () => mockSupabaseFilas([filaCivilArt1()]));
    const { resolverReferenciaLegal } = await import('@/lib/exequatur/canonical-reference-adapter');

    const r = await resolverReferenciaLegal(REF_CIVIL_1);

    expect(r.estado).toBe('RESUELTO');
    if (r.estado === 'RESUELTO') {
      expect(r.contenido).toBe(filaCivilArt1().contenido);
    }
  });

  it('el id/chunk de la fila subyacente nunca se expone en la resolución', async () => {
    vi.doMock('@/lib/supabase', () => mockSupabaseFilas([filaNotariadoArt2()]));
    const { resolverReferenciaLegal } = await import('@/lib/exequatur/canonical-reference-adapter');

    const r = await resolverReferenciaLegal(REF_NOTARIADO_2);

    expect(r).not.toHaveProperty('id');
    expect(JSON.stringify(r)).not.toContain('mayalex_normativos');
  });

  it('GAP 2 se conserva: sin candidato vigente pero con uno no-vigente confirmado -> RESUELTO, marcado no vigente', async () => {
    const derogado = filaNotariadoArt2({ es_norma_vigente: false });
    vi.doMock('@/lib/supabase', () => mockSupabaseFilas([], [derogado]));
    const { resolverReferenciaLegal } = await import('@/lib/exequatur/canonical-reference-adapter');

    const r = await resolverReferenciaLegal(REF_NOTARIADO_2);

    expect(r.estado).toBe('RESUELTO');
    if (r.estado === 'RESUELTO') {
      expect(r.vigenciaSegunCorpus).toBe(false);
    }
  });
});
