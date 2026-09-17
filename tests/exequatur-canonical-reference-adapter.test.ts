import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ResultadoExacto, FragmentoRAG } from '@/lib/rag/search';

// Mismo patrón de mocking que tests/exequatur-access.test.ts para
// @/lib/paypal/access y @/lib/flags -- aquí se mockea @/lib/rag/search, la
// única dependencia externa del adaptador.
vi.mock('@/lib/rag/search', () => ({
  buscarArticuloExacto: vi.fn(),
}));

import { buscarArticuloExacto } from '@/lib/rag/search';
import { resolverReferenciaLegal } from '@/lib/exequatur/canonical-reference-adapter';
import type { CanonicalLegalReference } from '@/lib/exequatur/curriculum/types';

const mockBuscarArticuloExacto = vi.mocked(buscarArticuloExacto);

const REF: CanonicalLegalReference = { instrumento: 'CODIGO_NOTARIADO', articulo: '2' };

function fragmentoFixture(overrides: Partial<FragmentoRAG> = {}): FragmentoRAG {
  return {
    id: 'mayalex_normativos:codigo_notariado_2005_a2',
    contenido: 'ARTÍCULO 2.- El Notariado es la institución del Estado...',
    num_articulo: '2',
    fuente: 'Código del Notariado de Honduras (Decreto 353-2005)',
    relevancia: 1,
    fuente_tipo: 'codigo',
    jurisdiccion: 'HN',
    es_norma_vigente: true,
    hash: 'abc12345',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resolverReferenciaLegal — CanonicalLegalReferenceAdapter (Slice 2)', () => {
  it('[6] referencia con evidencia real -> RESUELTO, con contenido/fuente reales, nunca fabricados', async () => {
    const resultado: ResultadoExacto = { fragmentos: [fragmentoFixture()], ambiguo: false };
    mockBuscarArticuloExacto.mockResolvedValue(resultado);

    const r = await resolverReferenciaLegal(REF);

    expect(r.estado).toBe('RESUELTO');
    if (r.estado === 'RESUELTO') {
      expect(r.contenido).toBe(resultado.fragmentos[0].contenido);
      expect(r.fuente).toBe(resultado.fragmentos[0].fuente);
      expect(r.numArticulo).toBe('2');
      // Pasa la vigencia tal cual del corpus -- no la infiere ni la afirma por su cuenta.
      expect(r.vigenciaSegunCorpus).toBe(true);
    }
    expect(mockBuscarArticuloExacto).toHaveBeenCalledWith('2', null, 'CODIGO_NOTARIADO');
  });

  it('[7] resultado ambiguo -> NO_VERIFICADO (nunca se elige un candidato al azar)', async () => {
    mockBuscarArticuloExacto.mockResolvedValue({ fragmentos: [], ambiguo: true });

    const r = await resolverReferenciaLegal(REF);

    expect(r.estado).toBe('NO_VERIFICADO');
    if (r.estado === 'NO_VERIFICADO') {
      expect(r.motivo).toMatch(/ambigu/i);
    }
  });

  it('[8] sin fragmentos -> NO_VERIFICADO (nunca se sintetiza contenido)', async () => {
    mockBuscarArticuloExacto.mockResolvedValue({ fragmentos: [], ambiguo: false });

    const r = await resolverReferenciaLegal(REF);

    expect(r.estado).toBe('NO_VERIFICADO');
  });

  it('[9] FAIL-CLOSED: si buscarArticuloExacto lanza una excepción, siempre NO_VERIFICADO', async () => {
    mockBuscarArticuloExacto.mockRejectedValue(new Error('Supabase no disponible'));

    const r = await resolverReferenciaLegal(REF);

    expect(r.estado).toBe('NO_VERIFICADO');
  });

  it('[10] la resolución RESUELTO nunca expone el id/chunk de la fila subyacente como identidad', async () => {
    mockBuscarArticuloExacto.mockResolvedValue({
      fragmentos: [fragmentoFixture({ id: 'mayalex_normativos:codigo_notariado_2005_a2' })],
      ambiguo: false,
    });

    const r = await resolverReferenciaLegal(REF);

    expect(r).not.toHaveProperty('id');
    expect(JSON.stringify(r)).not.toContain('mayalex_normativos');
  });

  it('vigenciaSegunCorpus es null si la fila no trae el dato -- nunca se infiere un valor', async () => {
    mockBuscarArticuloExacto.mockResolvedValue({
      fragmentos: [fragmentoFixture({ es_norma_vigente: null })],
      ambiguo: false,
    });

    const r = await resolverReferenciaLegal(REF);

    expect(r.estado).toBe('RESUELTO');
    if (r.estado === 'RESUELTO') {
      expect(r.vigenciaSegunCorpus).toBeNull();
    }
  });

  it('artículo confirmado no vigente (GAP 2) se expone tal cual, marcado, nunca oculto', async () => {
    mockBuscarArticuloExacto.mockResolvedValue({
      fragmentos: [fragmentoFixture({ es_norma_vigente: false })],
      ambiguo: false,
    });

    const r = await resolverReferenciaLegal(REF);

    expect(r.estado).toBe('RESUELTO');
    if (r.estado === 'RESUELTO') {
      expect(r.vigenciaSegunCorpus).toBe(false);
    }
  });
});
