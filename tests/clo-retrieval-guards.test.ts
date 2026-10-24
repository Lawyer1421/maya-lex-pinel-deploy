import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  anotarFragmentosClo, clasificarFragmentoClo, instrumentIdDeFragmento, normalizarNumeroArticulo, normalizarPais, resumenEvidenciaClo,
} from '@/lib/legal-retrieval/clo-guards';
import { construirCitas, formatearContextoRAG } from '@/lib/legal-retrieval/evidence-engine';
import { detectarInstrumentoDesdeTexto, identidadDeFuente, resolverArticuloExacto, type FilaExactaDB } from '@/lib/legal-retrieval/exact-resolver';
import { clasificacionDesdeEtiqueta, clasificarFragmento } from '@/lib/ai-gateway/shadow/evidence-classification';
import { evidenciaDeProduccion } from '@/lib/legal-os/shadow/dispatch';
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

// ─────────────────────────────────────────────────────────────────────────────
// Correcciones del dictamen del Auditor (CHANGES_REQUIRED @ 56f31d9): A-1, A-2, A-3, M-1…M-4, B-1, B-2.
// ─────────────────────────────────────────────────────────────────────────────

describe('A-1: el D.77-2006 jamás pasa como Código del Notariado, ni por buscarRAG', () => {
  const ORIGINAL_ENV = { ...process.env };
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.RAG_BACKEND = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';
  });
  afterEach(() => { process.env = { ...ORIGINAL_ENV }; });

  function mockearFilas(filas: FilaExactaDB[]): void {
    const chain: any = {
      select: vi.fn(() => chain), eq: vi.fn(() => chain),
      then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: filas, error: null }),
    };
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ from: vi.fn(() => chain) }) }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));
  }

  it('buscarRAG("Artículo 5 del Código del Notariado") con una fila del D.77-2006: NO_VERIFIED_EVIDENCE, evidenceCount 0, CONTEXT', async () => {
    mockearFilas([fila({ fuente: D77, num_articulo: '5', contenido: 'ARTICULO 5.- Texto.' })]);
    const { buscarRAG } = await import('@/lib/rag/search');
    const r = await buscarRAG('Artículo 5 del Código del Notariado', 5, 'mayalex_normativos');
    expect(r.outcome?.state).toBe('NO_VERIFIED_EVIDENCE');
    expect(r.outcome?.evidenceCount).toBe(0);
    expect(r.outcome?.cloBlocks).toEqual(expect.arrayContaining(['INSTRUMENTO_DISTINTO_DEL_SOLICITADO', 'INSTRUMENTO_TEXTO_NO_COTEJADO']));
    expect(r.fragmentos.every((f) => f.rol_evidencia === 'CONTEXT')).toBe(true);
    expect(construirCitas(r.fragmentos)).toEqual([]);
  });

  it('el D.77-2006 pedido por su propio nombre sigue siendo solo CONTEXT (texto no cotejado)', () => {
    const c = clasificarFragmentoClo(frag({ fuente: 'Decreto 77-2006, Congreso Nacional de Honduras', num_articulo: '3' }));
    expect(c.instrumentId).toBe('DECRETO_77_2006');
    expect(c.rol).toBe('CONTEXT');
    expect(c.bloqueos).toContain('INSTRUMENTO_TEXTO_NO_COTEJADO');
  });

  it('el Reglamento por buscarRAG exacta con el alias «al/para el Código»: sigue siendo el Reglamento y solo CONTEXT', async () => {
    mockearFilas([fila({ fuente: REGLAMENTO, num_articulo: '9', contenido: 'ARTICULO 9.- Texto.' })]);
    const { buscarRAG } = await import('@/lib/rag/search');
    const r = await buscarRAG('Artículo 9 del reglamento al Código del Notariado', 5, 'mayalex_normativos');
    expect(r.outcome?.state).toBe('NO_VERIFIED_EVIDENCE');
    expect(r.fragmentos[0]?.instrument_id).toBe('REGLAMENTO_NOTARIADO');
  });
});

describe('A-2: (b) falla cerrado — fuente_tipo normalizado y país obligatorio', () => {
  it.each(['Sentencia', 'SENTENCIA', ' sentencia ', 'jurisprudencia', 'Jurisprudencia Constitucional', 'fallo', 'Casación'])('fuente_tipo %j es jurisprudencia, no norma', (fuente_tipo) => {
    const c = clasificarFragmentoClo(frag({ fuente_tipo, jurisdiccion: 'ES', es_norma_vigente: true }));
    expect(c.tipoFuente).toBe('JURISPRUDENCIA');
    expect(c.rol).toBe('CONTEXT');
  });
  it('fuente_tipo null, vacío o desconocido no se acredita como norma', () => {
    for (const fuente_tipo of [null, undefined, '', 'raro']) {
      const c = clasificarFragmentoClo(frag({ fuente_tipo }));
      expect(c.rol, String(fuente_tipo)).toBe('CONTEXT');
      expect(c.bloqueos).toContain('FUENTE_TIPO_NO_VERIFICADO');
    }
  });
  it('«Código Civil de España» (ES o sin país) no es derecho hondureño ni siquiera con es_norma_vigente=true', () => {
    for (const jurisdiccion of ['ES', 'es', null, undefined, '']) {
      const c = clasificarFragmentoClo(frag({ fuente: 'Código Civil de España', jurisdiccion, es_norma_vigente: true }));
      expect(c.rol, String(jurisdiccion)).toBe('CONTEXT');
    }
    // aun con la fuente correcta, un país distinto de HN no es PRIMARY
    const c = clasificarFragmentoClo(frag({ fuente: 'Codigo Civil', jurisdiccion: 'ES' }));
    expect(c.bloqueos).toContain('JURISDICCION_NO_HONDURENA');
    expect(c.rol).toBe('CONTEXT');
  });
  it('«Código Civil de España» no identifica el Código Civil hondureño', () => {
    expect(instrumentIdDeFragmento({ fuente: 'Código Civil de España' })).toBeNull();
    expect(instrumentIdDeFragmento({ fuente: 'Código Civil de Honduras (Decreto del Poder Ejecutivo del 8 de febrero de 1906)' })).toBe('CODIGO_CIVIL');
  });
});

describe('A-3: (a)/(e) no dependen de regex sobre texto libre ni de que llegue la materia', () => {
  it('«Escritura de constitución de sociedad» no identifica la Constitución', () => {
    for (const fuente of ['Escritura de constitución de sociedad', 'Acta de constitución de sociedad mercantil', 'Modelo de constitución en mora']) {
      expect(instrumentIdDeFragmento({ fuente }), fuente).toBeNull();
      expect(clasificarFragmentoClo(frag({ fuente })).rol).toBe('CONTEXT');
    }
    expect(instrumentIdDeFragmento({ fuente: 'Constitucion de la Republica de Honduras (Decreto 131-1982 - Consolidado TSC corte 2004)' })).toBe('CONSTITUCION');
  });
  it('la materia se normaliza: «03_notarial», « 03_NOTARIAL » y variantes de mayúsculas aplican (e)', () => {
    for (const materia of ['03_NOTARIAL', '03_notarial', ' 03_NOTARIAL ', '03_Notarial']) {
      const c = clasificarFragmentoClo(frag({ fuente: 'Escritura modelo', materia }));
      expect(c.bloqueos, materia).toContain('PRACTICA_NOTARIAL_NO_NORMA');
    }
  });
  it('sin materia, la colección documental «mayalex_instrumentos» sin identidad normativa nunca es norma', () => {
    const c = clasificarFragmentoClo(frag({ fuente: 'Escritura modelo' }), { coleccion: 'mayalex_instrumentos' });
    expect(c.rol).toBe('CONTEXT');
    expect(c.bloqueos).toContain('CAPA_DOCUMENTAL_NO_NORMA');
  });
  it('por buscarRAG semántica: una fila «de constitución de sociedad» NO produce SEMANTIC_SUCCESS', async () => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.RAG_BACKEND = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';
    const rpc = vi.fn(async () => ({ data: [{ id: 'e', contenido: 'Texto.', num_articulo: '3', fuente: 'Escritura de constitución de sociedad', fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, similarity: 0.9 }], error: null }));
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ rpc }) }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));
    const { buscarRAG } = await import('@/lib/rag/search');
    const r = await buscarRAG('¿Cómo se otorga una escritura de constitución de sociedad?', 5, 'mayalex_normativos');
    expect(r.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
    expect(r.outcome?.evidenceCount).toBe(0);
    expect(r.fragmentos[0]?.instrument_id).toBeNull();
  });
});

describe('M-1: el instrument_id declarado o el rol que traiga una carga externa se ignoran', () => {
  it.each(['   ', 'UNKNOWN', 'null', '', 'CODIGO_CIVIL', 'codigo_penal'])('instrument_id %j en el fragmento no confiere identidad', (instrument_id) => {
    const c = clasificarFragmentoClo(frag({ fuente: 'Documento sin instrumento', instrument_id }));
    expect(c.instrumentId).toBeNull();
    expect(c.rol).toBe('CONTEXT');
  });
  it('un rol_evidencia=PRIMARY falsificado se recalcula; resumen y citas no lo creen', () => {
    const f = frag({ fuente: 'Documento sin instrumento', rol_evidencia: 'PRIMARY', bloqueos_clo: [], instrument_id: 'CODIGO_CIVIL' });
    expect(resumenEvidenciaClo([f]).suficiente).toBe(false);
    expect(construirCitas([f])).toEqual([]);
    expect(anotarFragmentosClo([f])[0].rol_evidencia).toBe('CONTEXT');
  });
  it('por buscarRAG con backend Python: una carga con instrument_id/rol falsificados no es evidencia', async () => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.RAG_BACKEND = 'python';
    process.env.PYTHON_RAG_URL = 'http://python-rag.test';
    delete process.env.VERCEL;
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, text: async () => '',
      json: async () => ({ fragmentos: [{ contenido: 'Texto.', num_articulo: '5', fuente: 'Documento sin instrumento', relevancia: 0.9, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, instrument_id: 'CODIGO_CIVIL', rol_evidencia: 'PRIMARY' }], articulos_encontrados: ['5'] }),
    })));
    const { buscarRAG } = await import('@/lib/rag/search');
    const r = await buscarRAG('¿Qué obligaciones hay?', 5, 'mayalex_normativos');
    expect(r.outcome?.evidenceCount).toBe(0);
    expect(r.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
    expect(r.fragmentos[0].rol_evidencia).toBe('CONTEXT');
    vi.unstubAllGlobals();
  });
});

describe('M-2: (c) normaliza el número de artículo y exige uno verificable', () => {
  it.each(['Arto. 17', '17º', '17°', 'N° 17', 'No. 17', 'Art.º 17', 'Artículo 17', 'ARTÍCULO 017', ' 17. '])('%j es el artículo 17 (HUECO)', (num_articulo) => {
    expect(normalizarNumeroArticulo(num_articulo)).toBe('17');
    expect(clasificarFragmentoClo(frag({ fuente: CODIGO_NOTARIADO, num_articulo })).bloqueos).toContain('NOTARIADO_HUECO');
  });
  it('un num_articulo nulo, vacío o ilegible en el Código del Notariado no es PRIMARY', () => {
    for (const num_articulo of [null, undefined, '', 'sin número', 'abc']) {
      const c = clasificarFragmentoClo(frag({ fuente: CODIGO_NOTARIADO, num_articulo }));
      expect(c.rol, String(num_articulo)).toBe('CONTEXT');
      expect(c.bloqueos).toContain('NOTARIADO_ARTICULO_NO_VERIFICABLE');
    }
  });
  it('se conserva el sufijo de letra de los artículos bis', () => {
    expect(normalizarNumeroArticulo('123-A')).toBe('123-A');
    expect(normalizarNumeroArticulo('Art. 173-b')).toBe('173-B');
  });
});

describe('M-3: «Reglamento al/para el Código del Notariado» y su norm_id son el Reglamento, nunca el Código', () => {
  it.each([
    'Reglamento al Código del Notariado (Resolución PCSJ-17-2012)',
    'Reglamento para el Código del Notariado (Resolución PCSJ-17-2012)',
    'Reglamento del Código del Notariado (Resolución PCSJ-17-2012)',
  ])('%s', (fuente) => {
    expect(identidadDeFuente(fuente)).toBe('REGLAMENTO_NOTARIADO');
    expect(instrumentIdDeFragmento({ fuente })).toBe('REGLAMENTO_NOTARIADO');
    expect(clasificarFragmentoClo(frag({ fuente, num_articulo: '9' })).rol).toBe('CONTEXT');
  });
  it('el detector de la consulta resuelve «reglamento al/para el Código del Notariado» al Reglamento', () => {
    expect(detectarInstrumentoDesdeTexto('artículo 3 del reglamento al Código del Notariado')).toBe('REGLAMENTO_NOTARIADO');
    expect(detectarInstrumentoDesdeTexto('artículo 3 del reglamento para el Código del Notariado')).toBe('REGLAMENTO_NOTARIADO');
    expect(detectarInstrumentoDesdeTexto('artículo 3 del Código del Notariado')).toBe('CODIGO_NOTARIADO');
  });
  it('un norm_id desconocido (p. ej. *reglamento_codigo_notariado*) no identifica nada: jamás cae al Código', () => {
    const fuente = 'Documento sin instrumento';
    expect(instrumentIdDeFragmento({ fuente, norm_id: 'mayalex_normativos:reglamento_codigo_notariado' })).toBeNull();
    expect(instrumentIdDeFragmento({ fuente, norm_id: 'mayalex_normativos:reglamento_notariado_2012' })).toBe('REGLAMENTO_NOTARIADO');
    expect(instrumentIdDeFragmento({ fuente, norm_id: 'mayalex_normativos:codigo_notariado_2005' })).toBe('CODIGO_NOTARIADO');
  });
});

describe('M-4 (dictamen CLO 24-oct-2026): Código del Notariado arts. 72, 73, 84, 87 y 93 solo CONTEXT', () => {
  it.each(['72', '73', '84', '87', '93'])('art. %s', (num_articulo) => {
    const c = clasificarFragmentoClo(frag({ fuente: CODIGO_NOTARIADO, num_articulo }));
    expect(c.rol).toBe('CONTEXT');
    expect(c.bloqueos).toContain('NOTARIADO_SOLO_CONTEXT_CLO');
  });
  it('otros artículos (incluido 71 y 74) siguen siendo PRIMARY', () => {
    for (const n of ['71', '74', '18']) expect(clasificarFragmentoClo(frag({ fuente: CODIGO_NOTARIADO, num_articulo: n })).rol).toBe('PRIMARY');
  });
});

describe('B-2: el pipeline shadow cuenta solo PRIMARY, igual que producción', () => {
  it('evidenciaDeProduccion excluye los CONTEXT', () => {
    const primary = frag({ id: 'p', fuente: CODIGO_PENAL });
    const contexto = [
      frag({ id: 'c1', fuente: 'Documento sin instrumento' }),
      frag({ id: 'c2', fuente: REGLAMENTO, num_articulo: '9' }),
      frag({ id: 'c3', fuente: CODIGO_NOTARIADO, num_articulo: '17' }),
      frag({ id: 'c4', fuente_tipo: 'sentencia', jurisdiccion: 'ES', fuente: 'Sentencia X' }),
    ];
    const { chunks, excluidas } = evidenciaDeProduccion([primary, ...contexto]);
    expect(chunks.map((c) => c.id)).toEqual(['p']);
    expect(excluidas).toBe(4);
  });
  it('el gateway reconoce la etiqueta de CONTEXT como no clasificada y no citable', () => {
    expect(clasificacionDesdeEtiqueta('CONTEXTO (SIN_INSTRUMENT_ID) — NO CITAR COMO NORMA')).toBe('SIN_CLASIFICAR');
    const r = clasificarFragmento(frag({ fuente: 'Documento sin instrumento', es_norma_vigente: true }));
    expect(r).toEqual({ clasificacionProduccion: 'SIN_CLASIFICAR', citable: false });
    expect(clasificarFragmento(frag())).toEqual({ clasificacionProduccion: 'NORMA_VIGENTE_HONDURAS', citable: true });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Re-auditoría (CHANGES_REQUIRED @ f6660c0): H-1 política de país (CLO 24-oct-2026), H-2 unión de bloqueos, residuos BAJO.
// ─────────────────────────────────────────────────────────────────────────────

/** Los 11 instrumentos del Exact Resolver con datos: instrumento, fuente real del corpus y consulta que lo nombra. */
const ONCE: Array<{ id: string; fuente: string; consulta: string; materia: string }> = [
  { id: 'CONSTITUCION', fuente: 'Constitucion de la Republica de Honduras (Decreto 131-1982 - Consolidado TSC corte 2004)', consulta: 'Artículo 18 de la Constitución de la República', materia: '00_CONSTITUCIONAL' },
  { id: 'CODIGO_PENAL', fuente: 'Codigo Penal', consulta: 'Artículo 18 del Código Penal', materia: '01_PENAL' },
  { id: 'CODIGO_PROCESAL_PENAL', fuente: 'Código Procesal Penal de Honduras (Decreto 9-99-E)', consulta: 'Artículo 18 del Código Procesal Penal', materia: '01_PENAL' },
  { id: 'CODIGO_CIVIL', fuente: 'Código Civil de Honduras (Decreto del Poder Ejecutivo del 8 de febrero de 1906)', consulta: 'Artículo 18 del Código Civil', materia: '02_CIVIL' },
  { id: 'CODIGO_PROCESAL_CIVIL', fuente: 'Codigo Procesal Civil', consulta: 'Artículo 18 del Código Procesal Civil', materia: '02_CIVIL' },
  { id: 'CODIGO_TRABAJO', fuente: 'Codigo del Trabajo', consulta: 'Artículo 18 del Código del Trabajo', materia: '05_LABORAL' },
  { id: 'CODIGO_FAMILIA', fuente: 'Codigo de Familia', consulta: 'Artículo 18 del Código de Familia', materia: '06_FAMILIA' },
  { id: 'CODIGO_NOTARIADO', fuente: CODIGO_NOTARIADO, consulta: 'Artículo 18 del Código del Notariado', materia: '03_NOTARIAL' },
  { id: 'REGLAMENTO_NOTARIADO', fuente: REGLAMENTO, consulta: 'Artículo 18 del reglamento notarial', materia: '03_NOTARIAL' },
  { id: 'CODIGO_TRIBUTARIO', fuente: 'Codigo Tributario (Decreto 170-2016 - Consolidado SAR corte 2019)', consulta: 'Artículo 18 del Código Tributario', materia: '08_TRIBUTARIO' },
  { id: 'LEY_JUSTICIA_CONSTITUCIONAL', fuente: 'Ley sobre Justicia Constitucional', consulta: 'Artículo 18 de la Ley sobre Justicia Constitucional', materia: '07_CONSTITUCIONAL' },
];
const PAISES_HN: Array<string | null> = ['HN', null, '', 'Honduras', 'HND', 'hn', ' HN ', 'honduras'];
const PAISES_EXTRANJEROS = ['ES', 'SV', 'PE', 'España', 'MX'];

describe('H-1: política de país derivada del instrument_id validado (decisión CLO 24-oct-2026), por buscarRAG', () => {
  let filas: FilaExactaDB[] = [];
  let buscarRAG: typeof import('@/lib/rag/search').buscarRAG;
  const ORIGINAL_ENV = { ...process.env };

  beforeAll(async () => {
    vi.resetModules();
    process.env.RAG_BACKEND = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';
    const chain: any = {
      select: vi.fn(() => chain), eq: vi.fn(() => chain),
      then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: filas, error: null }),
    };
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ from: vi.fn(() => chain) }) }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));
    ({ buscarRAG } = await import('@/lib/rag/search'));
  });
  afterAll(() => { process.env = { ...ORIGINAL_ENV }; vi.doUnmock('@/lib/supabase'); vi.doUnmock('@/lib/rag/embed'); });

  const conPais = (i: (typeof ONCE)[number], jurisdiccion: string | null): FilaExactaDB =>
    fila({ fuente: i.fuente, num_articulo: '18', contenido: 'ARTICULO 18.- Texto.', materia: i.materia, jurisdiccion });

  for (const i of ONCE) {
    const bloqueadoPorOtraRegla = i.id === 'REGLAMENTO_NOTARIADO'; // (d) sigue vigente: no por el país
    it(`${i.id} con jurisdiccion HN / null / '' / 'Honduras' / 'HND': ${bloqueadoPorOtraRegla ? 'solo CONTEXT por la regla (d), nunca por el país' : 'EXACT_SUCCESS'}`, async () => {
      for (const j of PAISES_HN) {
        filas = [conPais(i, j)];
        const r = await buscarRAG(i.consulta, 5, 'mayalex_normativos');
        expect(r.fragmentos[0]?.instrument_id, `${i.id}/${String(j)}`).toBe(i.id);
        if (bloqueadoPorOtraRegla) {
          expect(r.outcome?.state, String(j)).toBe('NO_VERIFIED_EVIDENCE');
          expect(r.outcome?.cloBlocks).toContain('INSTRUMENTO_SIN_PLIEGO_CLO');
          expect(r.outcome?.cloBlocks).not.toContain('JURISDICCION_NO_HONDURENA');
        } else {
          expect(r.outcome?.state, `${i.id}/${String(j)}`).toBe('EXACT_SUCCESS');
          expect(r.outcome?.evidenceCount).toBe(1);
          expect(r.fragmentos[0].rol_evidencia).toBe('PRIMARY');
        }
      }
    });
    it(`${i.id} con jurisdiccion ES / SV / PE / España / MX: nunca PRIMARY (conflicto = CONTEXT con aviso), aunque la fuente coincida`, async () => {
      for (const j of PAISES_EXTRANJEROS) {
        filas = [conPais(i, j)];
        const r = await buscarRAG(i.consulta, 5, 'mayalex_normativos');
        expect(r.outcome?.state, `${i.id}/${j}`).toBe('NO_VERIFIED_EVIDENCE');
        expect(r.outcome?.evidenceCount).toBe(0);
        expect(r.outcome?.cloBlocks).toContain('JURISDICCION_NO_HONDURENA');
        expect(r.fragmentos[0].rol_evidencia).toBe('CONTEXT');
        expect(r.fragmentos[0].avisos_clo?.join(' ')).toMatch(/otro país|NO es derecho de Honduras/);
      }
    });
  }

  it('el país se normaliza: Honduras / HND / hn / " HN " son HN; vacío es "no declarado"; lo demás es otro país', () => {
    for (const v of ['HN', 'hn', ' HN ', 'Honduras', 'HONDURAS', 'HND', 'hnd']) expect(normalizarPais(v), v).toBe('HN');
    for (const v of [null, undefined, '', '   ']) expect(normalizarPais(v)).toBeNull();
    expect(normalizarPais('ES')).toBe('ES');
    expect(normalizarPais('España')).toBe('ESPANA');
  });

  it('sin instrument_id validado + jurisdiccion null o vacía → CONTEXT (sigue la regla a)', () => {
    for (const jurisdiccion of [null, undefined, '', 'HN']) {
      const c = clasificarFragmentoClo(frag({ fuente: 'Documento sin instrumento', jurisdiccion }));
      expect(c.rol, String(jurisdiccion)).toBe('CONTEXT');
      expect(c.bloqueos).toContain('SIN_INSTRUMENT_ID');
    }
  });

  it('las sentencias siguen en su tipo propio (JURISPRUDENCIA) sin importar el país, con o sin instrumento en la fuente', () => {
    for (const jurisdiccion of ['HN', null, '', 'Honduras', 'ES', 'SV', 'PE']) {
      const c = clasificarFragmentoClo(frag({ fuente: 'Codigo Penal', fuente_tipo: 'sentencia', jurisdiccion }));
      expect(c.tipoFuente, String(jurisdiccion)).toBe('JURISPRUDENCIA');
      expect(c.rol).toBe('CONTEXT');
    }
  });
});

describe('H-2: el payload nunca puede quitar un bloqueo — unión de señales 03_NOTARIAL / protocolo / práctica', () => {
  const ORIGINAL_ENV = { ...process.env };
  afterEach(() => { process.env = { ...ORIGINAL_ENV }; vi.unstubAllGlobals(); });

  async function buscarPorPython(fragmento: Record<string, unknown>, materia?: string) {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.RAG_BACKEND = 'python';
    process.env.PYTHON_RAG_URL = 'http://python-rag.test';
    delete process.env.VERCEL;
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, text: async () => '',
      json: async () => ({ fragmentos: [{ contenido: 'Texto.', num_articulo: '5', relevancia: 0.9, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, ...fragmento }], articulos_encontrados: ['5'] }),
    })));
    const { buscarRAG } = await import('@/lib/rag/search');
    return buscarRAG('¿Cómo se redacta el protocolo notarial?', 5, 'mayalex_normativos', materia);
  }

  it('ruta Python: materia 03_NOTARIAL en la consulta + materia:"02_CIVIL" en el payload → sigue bloqueado (práctica)', async () => {
    const r = await buscarPorPython({ fuente: 'Escritura modelo', materia: '02_CIVIL' }, '03_NOTARIAL');
    expect(r.fragmentos[0].bloqueos_clo).toContain('PRACTICA_NOTARIAL_NO_NORMA');
    expect(r.outcome?.evidenceCount).toBe(0);
    expect(r.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
  });
  it('ruta Python: una fuente con identidad que no es norma notarial tampoco se libra con un materia falso', async () => {
    const r = await buscarPorPython({ fuente: 'Codigo Penal', materia: '01_PENAL' }, '03_NOTARIAL');
    expect(r.fragmentos[0].bloqueos_clo).toContain('PRACTICA_NOTARIAL_NO_NORMA');
    expect(r.outcome?.evidenceCount).toBe(0);
  });
  it('ruta Python: el Código del Notariado (identidad normativa notarial) sigue siendo PRIMARY bajo el filtro 03_NOTARIAL', async () => {
    const r = await buscarPorPython({ fuente: CODIGO_NOTARIADO, materia: '02_CIVIL', num_articulo: '18' }, '03_NOTARIAL');
    expect(r.outcome?.state).toBe('SEMANTIC_SUCCESS');
    expect(r.outcome?.evidenceCount).toBe(1);
  });
  it('ruta Python: la señal de materia 03_NOTARIAL viene en el payload y la consulta no filtra → bloquea', async () => {
    const r = await buscarPorPython({ fuente: 'Escritura modelo', materia: '03_NOTARIAL' });
    expect(r.fragmentos[0].bloqueos_clo).toContain('PRACTICA_NOTARIAL_NO_NORMA');
    expect(r.outcome?.evidenceCount).toBe(0);
  });
  it('unidad: cualquier señal bloquea (fila, consulta o metadatos); el sellado conserva la señal bloqueante', () => {
    expect(clasificarFragmentoClo(frag({ fuente: 'Escritura modelo', materia: '02_CIVIL' }), { materia: '03_NOTARIAL' }).bloqueos).toContain('PRACTICA_NOTARIAL_NO_NORMA');
    expect(clasificarFragmentoClo(frag({ fuente: 'Escritura modelo', materia: '03_NOTARIAL' }), { materia: '02_CIVIL' }).bloqueos).toContain('PRACTICA_NOTARIAL_NO_NORMA');
    expect(clasificarFragmentoClo({ ...frag({ fuente: 'Escritura modelo' }), metadata: { materia: '03_NOTARIAL' } }).bloqueos).toContain('PRACTICA_NOTARIAL_NO_NORMA');
    expect(clasificarFragmentoClo({ ...frag({ fuente: 'Escritura modelo' }), metadata: { sub_tipo: 'testamento' } }).bloqueos).toContain('PRACTICA_NOTARIAL_NO_NORMA');
    const sellado = anotarFragmentosClo([frag({ fuente: 'Escritura modelo', materia: '02_CIVIL' })], { materia: '03_NOTARIAL' })[0];
    expect(sellado.materia).toBe('03_NOTARIAL');
    expect(resumenEvidenciaClo([sellado]).suficiente).toBe(false); // sin ctx: no depende de que se repita
  });
});

describe('Residuos BAJO: doctrina «comentada/anotada/concordada» y «Artículo 017.-»', () => {
  const ORIGINAL_ENV = { ...process.env };
  afterEach(() => { process.env = { ...ORIGINAL_ENV }; });

  it.each([
    'Constitución de la República de Honduras, comentada por X',
    'Constitucion de la Republica de Honduras anotada',
    'Código Penal concordado y comentado (Decreto 130-2017)',
    'Codigo Civil comentado',
  ])('%s es doctrina → CONTEXT aunque fuente_tipo sea codigo y el país HN', (fuente) => {
    const c = clasificarFragmentoClo(frag({ fuente, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true }));
    expect(c.tipoFuente).toBe('DOCTRINA');
    expect(c.rol).toBe('CONTEXT');
    expect(c.bloqueos).toContain('DOCTRINA_NO_ES_NORMA');
    expect(construirCitas([frag({ fuente, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true })])).toEqual([]);
  });

  it('por buscarRAG semántica: «Constitución…, comentada por X» no es evidencia', async () => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.RAG_BACKEND = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';
    const rpc = vi.fn(async () => ({ data: [{ id: 'k', contenido: 'Texto.', num_articulo: '1', fuente: 'Constitución de la República de Honduras, comentada por X', fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, similarity: 0.9 }], error: null }));
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ rpc }) }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));
    const { buscarRAG } = await import('@/lib/rag/search');
    const r = await buscarRAG('¿Qué dice la Constitución sobre el domicilio?', 5, 'mayalex_normativos');
    expect(r.outcome?.evidenceCount).toBe(0);
    expect(r.fragmentos[0].bloqueos_clo).toContain('DOCTRINA_NO_ES_NORMA');
  });

  it.each(['Artículo 017.-', 'Artículo 017.- ', 'ARTICULO 17.-', 'Art. 017.-', 'artículo 17 .-', 'Artículo 17—'])('%j se reconoce como el artículo 17', (n) => {
    expect(normalizarNumeroArticulo(n)).toBe('17');
  });
  it('«Artículo 017.-» en el Código del Notariado se bloquea como HUECO, también por buscarRAG', async () => {
    expect(clasificarFragmentoClo(frag({ fuente: CODIGO_NOTARIADO, num_articulo: 'Artículo 017.-' })).bloqueos).toContain('NOTARIADO_HUECO');
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.RAG_BACKEND = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';
    const chain: any = {
      select: vi.fn(() => chain), eq: vi.fn(() => chain),
      then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [fila({ num_articulo: 'Artículo 017.-', contenido: 'ARTICULO 17.- Texto.' })], error: null }),
    };
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ from: vi.fn(() => chain) }) }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));
    const { buscarRAG } = await import('@/lib/rag/search');
    const r = await buscarRAG('Artículo 17 del Código del Notariado', 5, 'mayalex_normativos');
    expect(r.outcome?.state).toBe('NO_VERIFIED_EVIDENCE');
    expect(r.outcome?.cloBlocks).toContain('NOTARIADO_HUECO');
  });
});
