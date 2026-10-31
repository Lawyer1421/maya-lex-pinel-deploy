import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  anotarFragmentosClo, clasificarFragmentoClo, clasificarFuenteExterna, esFilaCorpusP21, filtrarCorpusP21, normalizarNumeroArticulo, resumenLogClo,
} from '@/lib/legal-retrieval/clo-guards';
import { detectarArticuloExacto, resolverArticuloExacto, type FilaExactaDB } from '@/lib/legal-retrieval/exact-resolver';
import { KNOWN_FLAGS } from '@/lib/flags';
import type { FragmentoRAG } from '@/lib/legal-retrieval/types';

/**
 * ANEXO 2 y 3 del CLO (28-oct-2026) sobre el #106: una prueba por punto.
 */

const COMERCIO = 'Código de Comercio (Decreto 73-50)';
const NOTARIADO = 'Código del Notariado de Honduras (Decreto 353-2005)';
const frag = (o: Partial<FragmentoRAG> & { metadata?: Record<string, unknown> | null } = {}): FragmentoRAG => ({
  id: 'x', contenido: 'Texto.', num_articulo: '5', fuente: 'Codigo Penal', relevancia: 0.9, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, hash: 'abcd1234', ...o,
} as FragmentoRAG);
const fila = (o: Partial<FilaExactaDB> = {}): FilaExactaDB => ({
  id: 'r', contenido: 'ARTICULO 5.- Texto.', num_articulo: '5', fuente: 'Codigo Penal', fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL', metadata: null, ...o,
});
const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf8');

describe('A2.1 normalización de jurisdicción y fuente_tipo; jurisdicción nula nunca es PRIMARY', () => {
  it("'Honduras', 'hn', 'HN', ' HN ' y 'honduras' son lo mismo (HN) y pueden ser PRIMARY", () => {
    for (const j of ['HN', 'hn', 'Honduras', ' HN ', 'honduras', 'HND']) expect(clasificarFragmentoClo(frag({ jurisdiccion: j })).rol, j).toBe('PRIMARY');
  });
  it('jurisdicción null, undefined o vacía: NO es HN, nunca PRIMARY', () => {
    for (const j of [null, undefined, '', '   ']) {
      const c = clasificarFragmentoClo(frag({ jurisdiccion: j }));
      expect(c.rol, String(j)).toBe('CONTEXT');
      expect(c.bloqueos).toContain('JURISDICCION_NO_ACREDITADA');
    }
  });
  it("fuente_tipo 'ley', 'Codigo', 'codigo', 'Código ' son equivalentes (normativos); null o desconocido no", () => {
    for (const t of ['ley', 'Ley', 'Codigo', 'codigo', 'Código ', 'CODIGO']) expect(clasificarFragmentoClo(frag({ fuente_tipo: t })).rol, t).toBe('PRIMARY');
    for (const t of [null, undefined, '', 'desconocido']) expect(clasificarFragmentoClo(frag({ fuente_tipo: t as string | null })).bloqueos).toContain('FUENTE_TIPO_NO_VERIFICADO');
  });
});

describe('A2.2 ninguna fila FALSE produce EXACT_SUCCESS (sin segunda pasada)', () => {
  it('search.ts ya no consulta es_norma_vigente=false', () => {
    const src = read('lib/rag/search.ts');
    expect(src).not.toMatch(/consultarPorVigencia\([^)]*,\s*false\)/);
    expect(src).not.toContain('filasNoVigentes');
  });
  it('una fila FALSE nunca es PRIMARY', () => {
    const c = clasificarFragmentoClo(frag({ es_norma_vigente: false }));
    expect(c.rol).toBe('CONTEXT');
    expect(c.bloqueos).toContain('VIGENCIA_FALSE_EXCLUIDA');
  });
});

describe('A2.3 «72-A», «72A» y «73-A» son artículos propios', () => {
  it('detectarArticuloExacto conserva el sufijo en forma canónica', () => {
    expect(detectarArticuloExacto('Artículo 72-A del Código del Notariado')?.numero).toBe('72-A');
    expect(detectarArticuloExacto('artículo 72A del Código del Notariado')?.numero).toBe('72-A');
    expect(detectarArticuloExacto('Art. 73-a del Código del Notariado')?.numero).toBe('73-A');
    expect(detectarArticuloExacto('Artículo 72 del Código del Notariado')?.numero).toBe('72');
    expect(detectarArticuloExacto('el artículo 73 y siguientes')?.numero).toBe('73');
  });
  it('un texto como «artículo 5 de la ley» no toma la «d» como sufijo', () => {
    expect(detectarArticuloExacto('artículo 5 de la ley')?.numero).toBe('5');
    expect(detectarArticuloExacto('artículo 12 y 13')?.numero).toBe('12');
  });
  it('normalizarNumeroArticulo: 72A, 72-a y «Art. 72-A» → 72-A', () => {
    for (const n of ['72A', '72-a', 'Art. 72-A', '072-A']) expect(normalizarNumeroArticulo(n), n).toBe('72-A');
  });
  it('pedir el 72-A no devuelve el 72 ni el 73; pedir el 73-A no devuelve el 73', () => {
    const filas = [fila({ id: 'a72', num_articulo: '72', contenido: 'ARTÍCULO 72.- Créase la Unión.', fuente: NOTARIADO, materia: '03_NOTARIAL' }),
      fila({ id: 'a73', num_articulo: '73', contenido: 'ARTÍCULO 73.- Patrimonio.', fuente: NOTARIADO, materia: '03_NOTARIAL' })];
    expect(resolverArticuloExacto(filas, '72-A', 'CODIGO_NOTARIADO').fragmentos).toHaveLength(0);
    expect(resolverArticuloExacto(filas, '73-A', 'CODIGO_NOTARIADO').fragmentos).toHaveLength(0);
    const con72a = [...filas, fila({ id: 'a72a', num_articulo: '72-A', contenido: 'ARTÍCULO 72-A.- Los órganos.', fuente: NOTARIADO, materia: '03_NOTARIAL' })];
    const r = resolverArticuloExacto(con72a, '72-A', 'CODIGO_NOTARIADO');
    expect(r.fragmentos.map((f) => f.id)).toEqual(['a72a']);
    expect(r.fragmentos[0].rol_evidencia).toBe('CONTEXT');
    expect(r.fragmentos[0].bloqueos_clo).toContain('NOTARIADO_SOLO_CONTEXT_CLO');
  });
});

describe('A2.4 la práctica notarial (03_NOTARIAL) la decide el tipo de fuente, nunca el nombre', () => {
  it('fila 03_NOTARIAL con fuente «Código del Notariado…» pero tipo no normativo = práctica', () => {
    for (const fuente_tipo of ['instrumento', 'escritura', null, undefined]) {
      const c = clasificarFragmentoClo(frag({ fuente: NOTARIADO, fuente_tipo: fuente_tipo as string | null, materia: '03_NOTARIAL', num_articulo: '18' }));
      expect(c.tipoFuente, String(fuente_tipo)).toBe('PRACTICA_NOTARIAL');
      expect(c.rol).toBe('CONTEXT');
      expect(c.bloqueos).toContain('PRACTICA_NOTARIAL_NO_NORMA');
    }
  });
  it('señales fuertes de práctica (sub_tipo, tipo_fuente=instrumento) mandan aunque el tipo diga codigo', () => {
    const c1 = clasificarFragmentoClo(frag({ fuente: NOTARIADO, materia: '03_NOTARIAL', num_articulo: '18', metadata: { sub_tipo: 'poder' } }));
    const c2 = clasificarFragmentoClo(frag({ fuente: NOTARIADO, materia: '03_NOTARIAL', num_articulo: '18', metadata: { tipo_fuente: 'instrumento' } }));
    for (const c of [c1, c2]) { expect(c.tipoFuente).toBe('PRACTICA_NOTARIAL'); expect(c.rol).toBe('CONTEXT'); }
  });
  it('el Código del Notariado normativo (tipo codigo, materia 03_NOTARIAL) sigue siendo norma', () => {
    const c = clasificarFragmentoClo(frag({ fuente: NOTARIADO, materia: '03_NOTARIAL', num_articulo: '18' }));
    expect(c.tipoFuente).toBe('NORMA');
    expect(c.rol).toBe('PRIMARY');
  });
});

describe('A2.5 el clasificador lee metadata.rol y desplazado_por en todas las rutas; sin materia, la carga no asciende a PRIMARY', () => {
  it('metadata.rol = CONTEXT degrada a CONTEXT (metadata completa y metadata_clo)', () => {
    for (const f of [frag({ metadata: { rol: 'CONTEXT' } }), frag({ metadata_clo: { rol: 'CONTEXT' } }), frag({ metadata: { elegible_primary: false } })]) {
      const c = clasificarFragmentoClo(f);
      expect(c.rol).toBe('CONTEXT');
      expect(c.bloqueos).toContain('ROL_DECLARADO_CONTEXT');
    }
    expect(clasificarFragmentoClo(frag({ metadata: { rol: 'PRIMARY' } })).rol).toBe('PRIMARY'); // declarar PRIMARY no asciende ni degrada
  });
  it('desplazado_por (cualquier ruta) degrada a CONTEXT', () => {
    for (const f of [frag({ metadata: { desplazado_por: 'D.182-2009' } }), frag({ metadata_clo: { desplazado_por: 'D.182-2009' } })]) {
      const c = clasificarFragmentoClo(f);
      expect(c.rol).toBe('CONTEXT');
      expect(c.bloqueos).toContain('NORMA_DESPLAZADA');
    }
  });
  it('el Exact Resolver pasa rol y desplazado_por de la metadata de la fila al clasificador', () => {
    const r = resolverArticuloExacto([fila({ metadata: { rol: 'CONTEXT', desplazado_por: 'D.182-2009' } })], '5', 'CODIGO_PENAL');
    expect(r.fragmentos[0].rol_evidencia).toBe('CONTEXT');
    expect(r.fragmentos[0].bloqueos_clo).toEqual(expect.arrayContaining(['ROL_DECLARADO_CONTEXT', 'NORMA_DESPLAZADA']));
  });
  it('sin materia de la ruta (la RPC semántica nunca la devuelve), un instrumento notarial no es PRIMARY aunque la carga diga otra cosa', () => {
    const sinMateria = frag({ fuente: NOTARIADO, num_articulo: '18', materia: undefined, metadata: { materia: '02_CIVIL', rol: 'PRIMARY' } });
    const c = clasificarFragmentoClo(sinMateria);
    expect(c.rol).toBe('CONTEXT');
    expect(c.bloqueos).toContain('MATERIA_NO_VERIFICADA');
    // con materia conocida por la ruta (filtro de la consulta) sí se acredita
    expect(clasificarFragmentoClo(sinMateria, { materia: '03_NOTARIAL' }).rol).toBe('PRIMARY');
  });
});

describe('A2.6 contexto web y plantillas notariales pasan por el clasificador y nunca son PRIMARY', () => {
  it('clasificarFuenteExterna: WEB y PLANTILLA_NOTARIAL → CONTEXT con aviso', () => {
    for (const tipo of ['WEB', 'PLANTILLA_NOTARIAL'] as const) {
      const c = clasificarFuenteExterna(tipo);
      expect(c.rol).toBe('CONTEXT');
      expect(c.bloqueos).toEqual(['FUENTE_EXTERNA_NO_NORMA']);
      expect(c.avisos[0]).toMatch(/externo|web|plantilla/i);
    }
  });
  it('route.ts clasifica el contexto web (Tavily) y las plantillas del modo documento', () => {
    const src = read('app/api/chat/route.ts');
    expect(src).toContain("clasificarFuenteExterna('WEB')");
    expect(src).toContain("clasificarFuenteExterna('PLANTILLA_NOTARIAL')");
    // el contexto externo nunca entra a las citas: construirCitas solo recibe los fragmentos del corpus
    expect(src).toContain('construirCitas(ragData.fragmentos)');
  });
});

describe('A3.1 Comercio con vigencia NULL da abstención (no PRIMARY)', () => {
  const ORIGINAL_ENV = { ...process.env };
  beforeEach(() => { vi.resetModules(); vi.restoreAllMocks(); process.env.RAG_BACKEND = 'supabase'; process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key'; });
  afterEach(() => { process.env = { ...ORIGINAL_ENV }; vi.doUnmock('@/lib/supabase'); vi.doUnmock('@/lib/rag/embed'); });

  const comercio = (vig: boolean | null, extra: Partial<FilaExactaDB> = {}): FilaExactaDB => fila({
    id: 'mayalex_normativos:codigo_comercio_bch_d73_50_a380', num_articulo: '380', contenido: 'Articulo 380\n\nTexto del artículo.', fuente: COMERCIO,
    materia: '10_LEYES_REGLAMENTOS', es_norma_vigente: vig, ...extra,
  });

  it('el clasificador: TRUE elegible, FALSE excluido, NULL solo CONTEXT', () => {
    expect(clasificarFragmentoClo(frag({ fuente: COMERCIO, es_norma_vigente: true }), { corpusP21Habilitado: true }).rol).toBe('PRIMARY');
    expect(clasificarFragmentoClo(frag({ fuente: COMERCIO, es_norma_vigente: false })).bloqueos).toContain('VIGENCIA_FALSE_EXCLUIDA');
    for (const v of [null, undefined]) {
      const c = clasificarFragmentoClo(frag({ fuente: COMERCIO, es_norma_vigente: v }));
      expect(c.rol).toBe('CONTEXT');
      expect(c.bloqueos).toContain('VIGENCIA_NO_ACREDITADA');
    }
  });

  it('ruta exacta: una fila de Comercio con NULL → NO_VERIFIED_EVIDENCE, evidenceCount 0 → decidirAbstencion se abstiene', async () => {
    const chain: any = { select: vi.fn(() => chain), eq: vi.fn(() => chain), then: (res: (v: unknown) => void) => res({ data: [comercio(null)], error: null }) };
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ from: vi.fn(() => chain) }) }));
    const { buscarRAG } = await import('@/lib/rag/search');
    const { decidirAbstencion } = await import('@/lib/legal-retrieval/retrieval-session');
    const r = await buscarRAG('Artículo 380 del Código de Comercio', 5, 'mayalex_normativos', undefined, { corpusP21: true });
    expect(r.outcome?.state).toBe('NO_VERIFIED_EVIDENCE');
    expect(r.outcome?.evidenceCount ?? 0).toBe(0);
    expect(r.outcome?.cloBlocks).toContain('VIGENCIA_NO_ACREDITADA');
    const d = decidirAbstencion('Artículo 380 del Código de Comercio', true, { fragmentos: r.fragmentos, outcome: r.outcome });
    expect(d.evidenciaInsuficiente).toBe(true);
  });

  it('ruta exacta: la misma fila con TRUE (y el corpus encendido) sí es EXACT_SUCCESS', async () => {
    const chain: any = { select: vi.fn(() => chain), eq: vi.fn(() => chain), then: (res: (v: unknown) => void) => res({ data: [comercio(true)], error: null }) };
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ from: vi.fn(() => chain) }) }));
    const { buscarRAG } = await import('@/lib/rag/search');
    const r = await buscarRAG('Artículo 380 del Código de Comercio', 5, 'mayalex_normativos', undefined, { corpusP21: true });
    expect(r.outcome?.state).toBe('EXACT_SUCCESS');
  });

  it('ruta semántica: una fila de Comercio con NULL → OFFICIAL_FALLBACK_REQUIRED, sin evidencia', async () => {
    const rpc = vi.fn(async () => ({ data: [{ id: 'mayalex_normativos:codigo_comercio_bch_d73_50_a1', contenido: 'Articulo 1\n\nTexto.', num_articulo: '1', fuente: COMERCIO, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: null, similarity: 0.9 }], error: null }));
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ rpc }) }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));
    const { buscarRAG } = await import('@/lib/rag/search');
    const r = await buscarRAG('¿Qué regula el Código de Comercio sobre los comerciantes?', 5, 'mayalex_normativos', undefined, { corpusP21: true });
    expect(r.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
    expect(r.outcome?.evidenceCount ?? 0).toBe(0);
  });
});

describe('A3.2 flag_corpus_p21 gobierna el corpus P21 (apagado por defecto)', () => {
  it('está en KNOWN_FLAGS y route.ts lo lee de verdad y lo pasa a la recuperación', () => {
    expect(KNOWN_FLAGS).toContain('flag_corpus_p21');
    const route = read('app/api/chat/route.ts');
    expect(route).toContain("isFlagEnabledForUser('flag_corpus_p21'");
    expect(route).toContain('corpusP21: corpusP21Habilitado');
    expect(read('lib/legal-retrieval/retrieval-session.ts')).toContain('corpusP21: p.corpusP21');
  });
  it('no hay migración que lo siembre encendido (fila ausente = apagado)', () => {
    const fs = require('node:fs') as typeof import('node:fs');
    for (const f of fs.readdirSync(join(process.cwd(), 'supabase/migrations'))) {
      expect(fs.readFileSync(join(process.cwd(), 'supabase/migrations', f), 'utf8')).not.toMatch(/flag_corpus_p21/);
    }
  });
  it('apagado (o sin resolver): las filas P21 se descartan; encendido: se conservan', () => {
    const p21 = frag({ id: 'mayalex_normativos:codigo_comercio_bch_d73_50_a1', fuente: COMERCIO });
    const otra = frag({ id: 'otra' });
    expect(esFilaCorpusP21(p21)).toBe(true);
    expect(esFilaCorpusP21(otra)).toBe(false);
    for (const h of [undefined, false]) expect(filtrarCorpusP21([p21, otra], h).map((f) => f.id)).toEqual(['otra']);
    expect(filtrarCorpusP21([p21, otra], true).map((f) => f.id)).toEqual([p21.id, 'otra']);
  });
  it('por si una fila P21 llega igual con el flag apagado, nunca es PRIMARY', () => {
    const c = clasificarFragmentoClo(frag({ id: 'mayalex_normativos:decreto_284_2013_titulo_ii_a15', fuente: 'Decreto 284-2013', es_norma_vigente: true }));
    expect(c.rol).toBe('CONTEXT');
    const [a] = anotarFragmentosClo([frag({ id: 'mayalex_normativos:codigo_comercio_bch_d73_50_a9', fuente: COMERCIO })], { corpusP21Habilitado: false });
    expect(a.rol_evidencia).toBe('CONTEXT');
    expect(a.bloqueos_clo).toContain('CORPUS_P21_APAGADO');
    const [b] = anotarFragmentosClo([frag({ id: 'mayalex_normativos:codigo_comercio_bch_d73_50_a9', fuente: COMERCIO })], { corpusP21Habilitado: true });
    expect(b.rol_evidencia).toBe('PRIMARY');
  });
  it('la recuperación sin la opción corpusP21 descarta las filas P21 (apagado por defecto)', async () => {
    vi.resetModules();
    const ORIGINAL_ENV = { ...process.env };
    process.env.RAG_BACKEND = 'supabase'; process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';
    const rpc = vi.fn(async () => ({ data: [{ id: 'mayalex_normativos:codigo_comercio_bch_d73_50_a1', contenido: 'Articulo 1\n\nTexto.', num_articulo: '1', fuente: COMERCIO, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, similarity: 0.9 }], error: null }));
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ rpc }) }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));
    const { buscarRAG } = await import('@/lib/rag/search');
    const r = await buscarRAG('¿Qué regula el Código de Comercio sobre los comerciantes?', 5, 'mayalex_normativos');
    expect(r.fragmentos).toHaveLength(0);
    expect(r.outcome?.evidenceCount ?? 0).toBe(0);
    process.env = ORIGINAL_ENV; vi.doUnmock('@/lib/supabase'); vi.doUnmock('@/lib/rag/embed');
  });
});

describe('A3.3 el log por fragmento lleva motivo CLO y vigencia, sin texto de cliente', () => {
  it('resumenLogClo: solo id, rol, instrumento, motivos y TRUE/FALSE/NULL; nunca contenido ni pregunta', () => {
    const secreto = 'TEXTO-SECRETO-DEL-CLIENTE Juan Pérez';
    const lineas = resumenLogClo([frag({ id: 'a', contenido: secreto, es_norma_vigente: null }), frag({ id: 'b', contenido: secreto, es_norma_vigente: false }), frag({ id: 'c', contenido: secreto })]);
    expect(lineas.map((l) => l.vigencia)).toEqual(['NULL', 'FALSE', 'TRUE']);
    expect(lineas[0].motivos).toContain('VIGENCIA_NO_ACREDITADA');
    expect(lineas[1].motivos).toContain('VIGENCIA_FALSE_EXCLUIDA');
    expect(lineas[2].rol).toBe('PRIMARY');
    expect(JSON.stringify(lineas)).not.toContain('SECRETO');
    expect(JSON.stringify(lineas)).not.toContain('Pérez');
    expect(Object.keys(lineas[0]).sort()).toEqual(['id', 'instrument_id', 'motivos', 'rol', 'vigencia']);
  });
  it('buscarRAG registra [RAG][CLO] por fragmento y el log no contiene el texto del fragmento', async () => {
    vi.resetModules();
    const ORIGINAL_ENV = { ...process.env };
    process.env.RAG_BACKEND = 'supabase'; process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const rpc = vi.fn(async () => ({ data: [{ id: 'cc-1', contenido: 'Artículo 1. TEXTO-SECRETO-DEL-CLIENTE', num_articulo: '1', fuente: 'Codigo Civil', fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: null, similarity: 0.9 }], error: null }));
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ rpc }) }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));
    const { buscarRAG } = await import('@/lib/rag/search');
    await buscarRAG('¿Qué regula el Código Civil sobre la posesión?', 5, 'mayalex_normativos');
    const lineas = info.mock.calls.map((c) => String(c[0])).filter((l) => l.startsWith('[RAG][CLO]'));
    expect(lineas.length).toBeGreaterThan(0);
    expect(lineas.join('\n')).toContain('VIGENCIA_NO_ACREDITADA');
    expect(lineas.join('\n')).toContain('"vigencia":"NULL"');
    expect(lineas.join('\n')).not.toContain('SECRETO');
    expect(lineas.join('\n')).not.toContain('posesión');
    process.env = ORIGINAL_ENV; vi.doUnmock('@/lib/supabase'); vi.doUnmock('@/lib/rag/embed'); info.mockRestore();
  });
});
