import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  anotarFragmentosClo, clasificarFragmentoClo, instrumentIdDeFragmento, normalizarNumeroArticulo, resumenEvidenciaClo,
} from '@/lib/legal-retrieval/clo-guards';
import { construirCitas, formatearContextoRAG } from '@/lib/legal-retrieval/evidence-engine';
import { resolverArticuloExacto, type FilaExactaDB } from '@/lib/legal-retrieval/exact-resolver';
import type { FragmentoRAG } from '@/lib/legal-retrieval/types';

/**
 * Salvaguardas CLO de recuperación (24-oct-2026). Cada regla lleva su prueba:
 *  (a) sin instrument_id → nunca PRIMARY ni suficiente; (b) sentencias; (c) Notariado arts. 17/11/27; (d) Reglamento PCSJ-17-2012;
 *  (e) 03_NOTARIAL práctica.
 */

const CODIGO_NOTARIADO = 'Código del Notariado de Honduras (Decreto 353-2005)';
const REGLAMENTO = 'Reglamento del Código del Notariado (Resolución PCSJ-17-2012)';
const D77 = 'Decreto 77-2006 (Reformas al Código del Notariado)';
const CODIGO_PENAL = 'Codigo Penal';

/** La etiqueta de norma en el encabezado de un fragmento (la instrucción final del contexto también nombra la etiqueta). */
const ETIQUETA_NORMA_EN_FRAGMENTO = /\[FRAGMENTO \d+[^\n]*\[NORMA VIGENTE HONDURAS\]/;

const frag = (o: Partial<FragmentoRAG> = {}): FragmentoRAG => ({
  id: 'x', contenido: 'Texto del artículo.', num_articulo: '5', fuente: CODIGO_PENAL, relevancia: 0.9,
  fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, hash: 'abcd1234', ...o,
});
const fila = (o: Partial<FilaExactaDB> = {}): FilaExactaDB => ({
  id: 'r', contenido: 'ARTICULO 17.- Texto.', num_articulo: '17', fuente: CODIGO_NOTARIADO, fuente_tipo: 'codigo', jurisdiccion: 'HN',
  es_norma_vigente: true, materia: '03_NOTARIAL', metadata: null, ...o,
});

describe('(a) filas sin instrument_id: nunca PRIMARY ni suficientes', () => {
  it('una fila sin instrumento identificado es CONTEXT, con aviso, aunque diga es_norma_vigente=true', () => {
    const c = clasificarFragmentoClo(frag({ fuente: 'Fuente sin instrumento', es_norma_vigente: true }));
    expect(c.instrumentId).toBeNull();
    expect(c.rol).toBe('CONTEXT');
    expect(c.bloqueos).toContain('SIN_INSTRUMENT_ID');
    expect(c.avisos.join(' ')).toMatch(/sin instrumento identificado/i);
  });
  it('fuente vacía o nula: CONTEXT; el instrumento nunca se infiere de la materia', () => {
    for (const fuente of ['', '   ']) expect(clasificarFragmentoClo(frag({ fuente }), { materia: '01_PENAL' }).rol).toBe('CONTEXT');
    expect(instrumentIdDeFragmento(frag({ fuente: 'Documento', materia: '01_PENAL' }))).toBeNull();
  });
  it('con instrumento identificado y sin bloqueos es PRIMARY', () => {
    const c = clasificarFragmentoClo(frag());
    expect(c.instrumentId).toBe('CODIGO_PENAL');
    expect(c.rol).toBe('PRIMARY');
  });
  it('un conjunto solo de CONTEXT no es suficiente; con un PRIMARY sí', () => {
    const solo = anotarFragmentosClo([frag({ fuente: 'X' }), frag({ fuente: 'Y' })]);
    expect(resumenEvidenciaClo(solo)).toMatchObject({ primarios: 0, contexto: 2, suficiente: false });
    const mixto = anotarFragmentosClo([frag({ fuente: 'X' }), frag()]);
    expect(resumenEvidenciaClo(mixto)).toMatchObject({ primarios: 1, contexto: 1, suficiente: true });
  });
  it('no es cita formal y el contexto la marca como no citable', () => {
    const f = frag({ fuente: 'Fuente sin instrumento', es_norma_vigente: true });
    expect(construirCitas([f])).toEqual([]);
    const texto = formatearContextoRAG({ fragmentos: [f], articulos_encontrados: ['5'], backend: 'supabase' });
    expect(texto).not.toMatch(ETIQUETA_NORMA_EN_FRAGMENTO);
    expect(texto).toContain('NO CITAR COMO NORMA');
    expect(texto).toContain('AVISO:');
  });
  it('anotar es idempotente y no muta la entrada', () => {
    const f = frag();
    const una = anotarFragmentosClo([f]);
    expect(f.rol_evidencia).toBeUndefined();
    expect(anotarFragmentosClo(una)).toEqual(una);
  });
});

describe('(b) sentencias: su propio tipo de fuente, nunca derecho de Honduras', () => {
  it('una sentencia no hondureña (ES, PE, INTERNACIONAL o sin país) es JURISPRUDENCIA, CONTEXT y no es derecho de Honduras', () => {
    for (const jurisdiccion of ['ES', 'PE', 'INTERNACIONAL', null]) {
      const c = clasificarFragmentoClo(frag({ fuente_tipo: 'sentencia', jurisdiccion, fuente: 'Sentencia X', es_norma_vigente: true }));
      expect(c.tipoFuente).toBe('JURISPRUDENCIA');
      expect(c.rol).toBe('CONTEXT');
      expect(c.bloqueos).toContain('SENTENCIA_NO_HONDURENA');
      expect(c.avisos.join(' ')).toMatch(/NO es derecho de Honduras/);
    }
  });
  it('una sentencia hondureña tampoco es norma', () => {
    const c = clasificarFragmentoClo(frag({ fuente_tipo: 'sentencia', jurisdiccion: 'HN', fuente: 'Sentencia HN' }));
    expect(c.tipoFuente).toBe('JURISPRUDENCIA');
    expect(c.bloqueos).toContain('SENTENCIA_NO_ES_NORMA');
    expect(c.rol).toBe('CONTEXT');
  });
  it('aunque llegue con es_norma_vigente=true por error de ingesta: ni etiqueta de norma ni cita', () => {
    const s = frag({ fuente_tipo: 'sentencia', jurisdiccion: 'ES', fuente: 'Codigo Penal', es_norma_vigente: true });
    expect(construirCitas([s])).toEqual([]);
    const texto = formatearContextoRAG({ fragmentos: [s], articulos_encontrados: ['5'], backend: 'supabase' });
    expect(texto).not.toMatch(ETIQUETA_NORMA_EN_FRAGMENTO);
    expect(texto).toContain('DOCTRINA/JURISPRUDENCIA COMPARADA — ES');
  });
  it('en el contexto las sentencias van en su propio bloque, después de la legislación, nunca mezcladas', () => {
    const norma = frag({ fuente: CODIGO_PENAL, num_articulo: '1' });
    const sentencia = frag({ fuente_tipo: 'sentencia', jurisdiccion: 'ES', fuente: 'Sentencia X', num_articulo: '2' });
    const norma2 = frag({ fuente: CODIGO_PENAL, num_articulo: '3' });
    const texto = formatearContextoRAG({ fragmentos: [sentencia, norma, norma2], articulos_encontrados: ['1', '2', '3'], backend: 'supabase' });
    const encabezado = texto.indexOf('JURISPRUDENCIA / DOCTRINA (NO ES LEGISLACIÓN');
    expect(encabezado).toBeGreaterThan(texto.lastIndexOf('Fuente documental: Codigo Penal'));
    expect(texto.indexOf('Fuente documental: Sentencia X')).toBeGreaterThan(encabezado);
  });
  it('doctrina: CONTEXT y tipo propio', () => {
    const c = clasificarFragmentoClo(frag({ fuente_tipo: 'doctrina', fuente: 'Libro' }));
    expect(c).toMatchObject({ tipoFuente: 'DOCTRINA', rol: 'CONTEXT' });
  });
});

describe('(c) Código del Notariado D.353-2005: arts. 17 (HUECO), 11 y 27 (TEXTO_DIVERGENTE)', () => {
  it('art. 17 = HUECO y bloqueado como PRIMARY', () => {
    const c = clasificarFragmentoClo(frag({ fuente: CODIGO_NOTARIADO, num_articulo: '17' }));
    expect(c.rol).toBe('CONTEXT');
    expect(c.bloqueos).toContain('NOTARIADO_HUECO');
  });
  it.each(['11', '27'])('art. %s = TEXTO_DIVERGENTE (D.77-2006, Gaceta 31,091, no cotejado) y bloqueado como PRIMARY', (n) => {
    const c = clasificarFragmentoClo(frag({ fuente: CODIGO_NOTARIADO, num_articulo: n }));
    expect(c.rol).toBe('CONTEXT');
    expect(c.bloqueos).toContain('NOTARIADO_TEXTO_DIVERGENTE');
    expect(c.avisos.join(' ')).toMatch(/Gaceta 31,091/);
  });
  it('la numeración se normaliza ("Art. 017." y "17" son el mismo artículo)', () => {
    expect(normalizarNumeroArticulo('Art. 017.')).toBe('17');
    expect(clasificarFragmentoClo(frag({ fuente: CODIGO_NOTARIADO, num_articulo: ' 017 ' })).bloqueos).toContain('NOTARIADO_HUECO');
  });
  it('otros artículos del Código del Notariado siguen siendo PRIMARY; 17/11/27 de otros instrumentos no se tocan', () => {
    expect(clasificarFragmentoClo(frag({ fuente: CODIGO_NOTARIADO, num_articulo: '18' })).rol).toBe('PRIMARY');
    for (const n of ['17', '11', '27']) expect(clasificarFragmentoClo(frag({ fuente: CODIGO_PENAL, num_articulo: n })).rol).toBe('PRIMARY');
  });
  it('el Exact Resolver devuelve el art. 17/11/27 como CONTEXT, nunca PRIMARY, y no es evidencia suficiente', () => {
    for (const n of ['17', '11', '27']) {
      const r = resolverArticuloExacto([fila({ num_articulo: n, contenido: `ARTICULO ${n}.- Texto.` })], n, 'CODIGO_NOTARIADO');
      expect(r.fragmentos).toHaveLength(1);
      expect(r.fragmentos[0].rol_evidencia).toBe('CONTEXT');
      expect(resumenEvidenciaClo(r.fragmentos).suficiente).toBe(false);
    }
    const ok = resolverArticuloExacto([fila({ num_articulo: '18', contenido: 'ARTICULO 18.- Texto.' })], '18', 'CODIGO_NOTARIADO');
    expect(ok.fragmentos[0].rol_evidencia).toBe('PRIMARY');
  });
  it('una fila del D.77-2006 no es el Código del Notariado: es otro instrumento y no pasa como el artículo pedido', () => {
    expect(instrumentIdDeFragmento(frag({ fuente: D77 }))).toBe('DECRETO_77_2006');
    const r = resolverArticuloExacto([fila({ fuente: D77, num_articulo: '5', contenido: 'ARTICULO 5.- Texto.' })], '5', 'CODIGO_NOTARIADO');
    expect(r.fragmentos[0].rol_evidencia).toBe('CONTEXT');
    expect(r.fragmentos[0].bloqueos_clo).toContain('INSTRUMENTO_DISTINTO_DEL_SOLICITADO');
  });
});

describe('(d) Reglamento PCSJ-17-2012: bloqueado como PRIMARY hasta que haya pliego CLO', () => {
  it('solo puede ir como CONTEXT', () => {
    const c = clasificarFragmentoClo(frag({ fuente: REGLAMENTO, num_articulo: '9' }));
    expect(c.instrumentId).toBe('REGLAMENTO_NOTARIADO');
    expect(c.rol).toBe('CONTEXT');
    expect(c.bloqueos).toContain('INSTRUMENTO_SIN_PLIEGO_CLO');
  });
  it('no es cita formal ni evidencia suficiente', () => {
    const f = anotarFragmentosClo([frag({ fuente: REGLAMENTO, num_articulo: '9' })]);
    expect(construirCitas(f)).toEqual([]);
    expect(resumenEvidenciaClo(f).suficiente).toBe(false);
  });
  it('el Exact Resolver lo devuelve como CONTEXT', () => {
    const r = resolverArticuloExacto([fila({ fuente: REGLAMENTO, num_articulo: '9', contenido: 'ARTICULO 9.- Texto.' })], '9', 'REGLAMENTO_NOTARIADO');
    expect(r.fragmentos[0].rol_evidencia).toBe('CONTEXT');
    expect(r.fragmentos[0].bloqueos_clo).toContain('INSTRUMENTO_SIN_PLIEGO_CLO');
  });
});

describe('(e) 03_NOTARIAL (protocolo y práctica): nunca se cita como norma', () => {
  it('una fila 03_NOTARIAL sin identidad normativa notarial es PRACTICA_NOTARIAL y CONTEXT', () => {
    const c = clasificarFragmentoClo(frag({ fuente: 'Escritura de compraventa modelo' }), { materia: '03_NOTARIAL' });
    expect(c.tipoFuente).toBe('PRACTICA_NOTARIAL');
    expect(c.rol).toBe('CONTEXT');
    expect(c.bloqueos).toContain('PRACTICA_NOTARIAL_NO_NORMA');
    expect(c.bloqueos).not.toContain('SIN_INSTRUMENT_ID');
  });
  it('lo mismo con la materia que trae la propia fila (ruta exacta)', () => {
    const c = clasificarFragmentoClo(frag({ fuente: 'Poder especial modelo', materia: '03_NOTARIAL' }));
    expect(c.tipoFuente).toBe('PRACTICA_NOTARIAL');
  });
  it('aunque diga es_norma_vigente=true: no es cita y el contexto no la etiqueta como norma', () => {
    const f = frag({ fuente: 'Escritura modelo', materia: '03_NOTARIAL', es_norma_vigente: true });
    expect(construirCitas([f])).toEqual([]);
    expect(formatearContextoRAG({ fragmentos: [f], articulos_encontrados: ['5'], backend: 'supabase' })).not.toMatch(ETIQUETA_NORMA_EN_FRAGMENTO);
  });
  it('el Código del Notariado, su Reglamento y el D.77-2006 no son práctica: se rigen por sus propias reglas', () => {
    expect(clasificarFragmentoClo(frag({ fuente: CODIGO_NOTARIADO, num_articulo: '3' }), { materia: '03_NOTARIAL' }).rol).toBe('PRIMARY');
    expect(clasificarFragmentoClo(frag({ fuente: D77, num_articulo: '3' }), { materia: '03_NOTARIAL' }).tipoFuente).toBe('NORMA');
  });
});

describe('integración con buscarRAG (semántica): solo los PRIMARY son evidencia', () => {
  const ORIGINAL_ENV = { ...process.env };
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.RAG_BACKEND = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';
  });
  afterEach(() => { process.env = { ...ORIGINAL_ENV }; });

  function mockearRpc(filas: Array<Record<string, unknown>>): void {
    const rpc = vi.fn(async (_n: string, p: Record<string, unknown>) => ({ data: filas.slice(0, (p.limite as number | undefined) ?? filas.length), error: null }));
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ rpc }) }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));
  }
  const rpcFila = (o: Record<string, unknown>) => ({ id: 'r', contenido: 'Texto.', num_articulo: '5', fuente: CODIGO_PENAL, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, similarity: 0.9, ...o });

  it('solo filas sin instrumento: se conservan como CONTEXT pero no hay evidencia suficiente (OFFICIAL_FALLBACK_REQUIRED, evidenceCount 0)', async () => {
    mockearRpc([rpcFila({ id: 'a', fuente: 'Documento sin instrumento' }), rpcFila({ id: 'b', fuente: 'Otro documento' })]);
    const { buscarRAG } = await import('@/lib/rag/search');
    const r = await buscarRAG('¿Qué obligaciones tiene la sociedad?', 5, 'mayalex_normativos');
    expect(r.fragmentos).toHaveLength(2);
    expect(r.fragmentos.every((f) => f.rol_evidencia === 'CONTEXT')).toBe(true);
    expect(r.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
    expect(r.outcome?.evidenceCount).toBe(0);
    expect(r.outcome?.cloBlocks).toContain('SIN_INSTRUMENT_ID');
  });

  it('con un PRIMARY entre CONTEXT: SEMANTIC_SUCCESS y evidenceCount cuenta solo los PRIMARY', async () => {
    mockearRpc([rpcFila({ id: 'a', fuente: 'Documento sin instrumento' }), rpcFila({ id: 'b' })]);
    const { buscarRAG } = await import('@/lib/rag/search');
    const r = await buscarRAG('¿Qué obligaciones tiene la sociedad?', 5, 'mayalex_normativos');
    expect(r.fragmentos).toHaveLength(2);
    expect(r.outcome?.state).toBe('SEMANTIC_SUCCESS');
    expect(r.outcome?.evidenceCount).toBe(1);
  });

  it('una sentencia extranjera recuperada no cuenta como evidencia y queda como jurisprudencia', async () => {
    mockearRpc([rpcFila({ id: 's', fuente: 'Sentencia SV', fuente_tipo: 'sentencia', jurisdiccion: 'ES', es_norma_vigente: false })]);
    const { buscarRAG } = await import('@/lib/rag/search');
    const r = await buscarRAG('¿Qué dice la jurisprudencia sobre el fraude?', 5, 'mayalex_normativos');
    expect(r.fragmentos[0].bloqueos_clo).toContain('SENTENCIA_NO_HONDURENA');
    expect(r.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
    expect(r.outcome?.evidenceCount).toBe(0);
  });

  it('con filtro de materia 03_NOTARIAL, las filas sin identidad normativa son práctica y no bastan', async () => {
    mockearRpc([rpcFila({ id: 'p', fuente: 'Escritura modelo', es_norma_vigente: true })]);
    const { buscarRAG } = await import('@/lib/rag/search');
    const r = await buscarRAG('¿Cómo se redacta el protocolo notarial?', 5, 'mayalex_normativos', '03_NOTARIAL');
    expect(r.fragmentos[0].bloqueos_clo).toContain('PRACTICA_NOTARIAL_NO_NORMA');
    expect(r.outcome?.evidenceCount).toBe(0);
  });

  it('artículo 17 del Código del Notariado (ruta exacta): NO_VERIFIED_EVIDENCE con el motivo del bloqueo, sin PRIMARY', async () => {
    const chain: any = {
      select: vi.fn(() => chain), eq: vi.fn(() => chain),
      then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [fila({ num_articulo: '17' })], error: null }),
    };
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ from: vi.fn(() => chain) }) }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));
    const { buscarRAG } = await import('@/lib/rag/search');
    const r = await buscarRAG('Artículo 17 del Código del Notariado', 5, 'mayalex_normativos');
    expect(r.outcome?.state).toBe('NO_VERIFIED_EVIDENCE');
    expect(r.outcome?.evidenceCount).toBe(0);
    expect(r.outcome?.cloBlocks).toContain('NOTARIADO_HUECO');
    expect(r.fragmentos[0].rol_evidencia).toBe('CONTEXT');
  });

  it('artículo 18 del Código del Notariado (no bloqueado) sigue siendo EXACT_SUCCESS', async () => {
    const chain: any = {
      select: vi.fn(() => chain), eq: vi.fn(() => chain),
      then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [fila({ num_articulo: '18', contenido: 'ARTICULO 18.- Texto.' })], error: null }),
    };
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ from: vi.fn(() => chain) }) }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));
    const { buscarRAG } = await import('@/lib/rag/search');
    const r = await buscarRAG('Artículo 18 del Código del Notariado', 5, 'mayalex_normativos');
    expect(r.outcome?.state).toBe('EXACT_SUCCESS');
    expect(r.outcome?.evidenceCount).toBe(1);
  });
});
