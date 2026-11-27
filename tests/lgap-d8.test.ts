/**
 * D8 de la OLA 14 (expediente EXPEDIENTE_AUDITORIA_LGAP_OLA14.md, firmado el 2026-11-26): la Ley General de la Administración Pública
 * (D.146-86) entra al catálogo de identidad, al guardián CLO y al buscador por nombre. Las filas imitan las de producción (V5): fuente,
 * `metadata.norm_id`, `rol` y vigencia tal como los dejó el P3. También los ajustes finos del detector (hallazgos BAJO del #175).
 */
import { describe, expect, it } from 'vitest';
import {
  detectarArticuloExacto, detectarIdentidadesDesdeTexto, detectarInstrumentoDesdeTexto, resolverArticuloExacto, type FilaExactaDB,
} from '@/lib/legal-retrieval/exact-resolver';
import { identidadDeFuente } from '@/lib/legal-retrieval/instrument-identity';
import { clasificarIntencionInstrumental, elegibilidadSemantica, IDENTIFICADORES_DOCUMENTALES } from '@/lib/legal-retrieval/instrument-gate';
import { clasificarFragmentoClo, INSTRUMENTOS_SOLO_CONTEXT, textoNombraInstrumento } from '@/lib/legal-retrieval/clo-guards';
import { parsearInstrumentRef } from '@/lib/legal-retrieval/instrument-ref';

const FUENTE_LGAP = 'Ley General de la Administración Pública de Honduras (Decreto No. 146-86)';
const FUENTE_LPA = 'Ley de Procedimiento Administrativo de Honduras (Decreto No. 152-87)';
const LGAP = 'LEY_GENERAL_ADMINISTRACION_PUBLICA' as const;

/** Fila V5 de la LGAP como la entrega la búsqueda exacta (con metadata). */
const filaLgap = (num: string, extra: Partial<FilaExactaDB> & { metadata?: Record<string, unknown> } = {}): FilaExactaDB => ({
  id: `OLA14_LGAP_2014_01:${LGAP}:${num}`, contenido: `Texto del artículo ${num}.`, num_articulo: num, fuente: FUENTE_LGAP, fuente_tipo: 'codigo',
  jurisdiccion: 'HN', es_norma_vigente: true, materia: '10_LEYES_REGLAMENTOS', ...extra,
  metadata: { norm_id: `HN:${LGAP}`, instrumento_id: LGAP, estado_v: 'V5', vigencia: 'TRUE_PRESUNTA', ...(extra.metadata ?? {}) },
});

describe('identidad de la LGAP (D8)', () => {
  it('es un instrumento del catálogo, país-calificado, sin bloqueo de instrumento', () => {
    expect(identidadDeFuente(FUENTE_LGAP)).toBe(LGAP);
    expect(parsearInstrumentRef(`HN:${LGAP}`)).toMatchObject({ ok: true, instrumento: LGAP });
    expect(INSTRUMENTOS_SOLO_CONTEXT[LGAP]).toBeUndefined();
    expect(IDENTIFICADORES_DOCUMENTALES[LGAP]).toEqual(['146-86']);
  });

  it.each(['5', '29'])('art. %s (vigente, sin rol) → PRIMARY por la ruta exacta', (n) => {
    const r = resolverArticuloExacto([filaLgap(n)], n, LGAP, 'HN');
    expect(r.fragmentos.map((f) => [f.id, f.rol_evidencia])).toEqual([[`OLA14_LGAP_2014_01:${LGAP}:${n}`, 'PRIMARY']]);
  });

  it.each(['30', '31'])('art. %s (reforma no verificada, D5) → CONTEXT, nunca fundamento', (n) => {
    const c = clasificarFragmentoClo({ ...filaLgap(n, { metadata: { rol: 'CONTEXT' } }) });
    expect(c).toMatchObject({ instrumentId: LGAP, rol: 'CONTEXT' });
    expect(c.bloqueos).toContain('ROL_DECLARADO_CONTEXT');
  });

  it('art. 82 (derogado por el D.266-2013) → excluido como fundamento', () => {
    const c = clasificarFragmentoClo(filaLgap('82', { es_norma_vigente: false, metadata: { rol: 'CONTEXT', vigencia: 'DEROGADO' } }));
    expect(c.rol).toBe('CONTEXT');
    expect(c.bloqueos).toContain('VIGENCIA_FALSE_EXCLUIDA');
  });

  it('art. 4-A: no hay fila; la búsqueda exacta no inventa nada ni toma el art. 4', () => {
    const d = detectarArticuloExacto('¿Qué dice el artículo 4-A de la Ley General de la Administración Pública?')!;
    expect(d).toMatchObject({ numero: '4-A', instrumento: LGAP });
    const filas = [filaLgap('4'), filaLgap('5')];
    expect(resolverArticuloExacto(filas.filter((f) => f.num_articulo === d.numero), d.numero, d.instrumento, 'HN').fragmentos).toEqual([]);
  });
});

describe('detector: LGAP por nombre y separada de la LPA', () => {
  it.each([
    'artículo 29 de la Ley General de la Administración Pública',
    'art. 29 Ley General de Administración Pública',
    'según la LEY GENERAL DE LA ADMINISTRACION PUBLICA, ¿qué es la desconcentración?',
  ])('«%s» → LGAP', (q) => {
    expect(detectarInstrumentoDesdeTexto(q)).toBe(LGAP);
    expect(clasificarIntencionInstrumental(q)).toMatchObject({ estado: 'SPECIFIC_RESOLVED', identidades: [LGAP] });
  });

  it('la LPA sigue siendo la LPA, y nombrar las dos es comparar las dos', () => {
    expect(detectarInstrumentoDesdeTexto('artículo 29 de la Ley de Procedimiento Administrativo')).toBe('LEY_PROCEDIMIENTO_ADMINISTRATIVO');
    const q = 'compare la Ley General de la Administración Pública con la Ley de Procedimiento Administrativo';
    expect(detectarIdentidadesDesdeTexto(q).map((i) => i.instrumento)).toEqual([LGAP, 'LEY_PROCEDIMIENTO_ADMINISTRATIVO']);
    const lpa = resolverArticuloExacto([filaLgap('29'), { ...filaLgap('29'), id: 'LPA:29', fuente: FUENTE_LPA }], '29', 'LEY_PROCEDIMIENTO_ADMINISTRATIVO', 'HN');
    expect(lpa.fragmentos.map((f) => f.id)).toEqual(['LPA:29']);
    expect(elegibilidadSemantica(clasificarIntencionInstrumental('¿qué dice la Ley General de la Administración Pública?'))(FUENTE_LPA)).toBe(false);
  });

  it('el decreto 146-86 identifica la LGAP; la ley que la reforma y su homónima de Costa Rica no', () => {
    expect(clasificarIntencionInstrumental('artículo 29 del Decreto 146-86')).toMatchObject({ estado: 'SPECIFIC_RESOLVED', identidades: [LGAP] });
    expect(detectarInstrumentoDesdeTexto('artículo 1 de la Ley para Optimizar la Administración Pública')).toBeNull();
    const cr = 'artículo 11 de la Ley General de la Administración Pública de Costa Rica';
    expect(detectarInstrumentoDesdeTexto(cr)).toBeNull();
    expect(clasificarIntencionInstrumental(cr).estado).toBe('SPECIFIC_UNRESOLVED');
  });

  it('respuestas: citar la LGAP no es citar la LPA', () => {
    expect(textoNombraInstrumento('Conforme al artículo 29 de la Ley General de la Administración Pública…', LGAP)).toBe(true);
    expect(textoNombraInstrumento('Conforme al artículo 29 de la Ley General de la Administración Pública…', 'LEY_PROCEDIMIENTO_ADMINISTRATIVO')).toBe(false);
  });
});

describe('ajustes finos del detector (hallazgos BAJO del #175)', () => {
  it.each([
    'artículo 5 de la Ley de Propiedad en Costa Rica',
    'artículo 5 de la Ley de Propiedad en Argentina',
    'artículo 5 de la Ley de Propiedad Mueble',
    'artículo 5 de la Ley de Propiedad Estatal',
    'artículo 5 de la Ley de Propiedad Inmueble',
  ])('«%s» no se resuelve a la Ley de Propiedad hondureña', (q) => {
    expect(detectarInstrumentoDesdeTexto(q)).toBeNull();
    expect(clasificarIntencionInstrumental(q).estado).toBe('SPECIFIC_UNRESOLVED');
  });

  it.each([
    'según el art. 10 de la Ley de Propiedad del artículo 10',
    'la Ley de Propiedad de su artículo 3',
    'la Ley de Propiedad en su artículo 3',
    'artículo 5 de la Ley de Propiedad de Honduras',
  ])('«%s» sigue siendo la Ley de Propiedad', (q) => {
    expect(detectarInstrumentoDesdeTexto(q)).toBe('LEY_PROPIEDAD');
  });

  it.each([
    'art. 25 del Reglamento para la Ley de Municipalidades',
    'art. 25 del Reglamento sobre la Ley de Municipalidades',
    'art. 25 del Reglamento de la nueva Ley de Municipalidades',
    'art. 25 del Reglamento General para la Ley de Municipalidades',
  ])('«%s» → siempre el Reglamento, nunca la Ley', (q) => {
    expect(detectarIdentidadesDesdeTexto(q).map((i) => i.instrumento)).toEqual(['REGLAMENTO_LEY_MUNICIPALIDADES']);
    expect(clasificarIntencionInstrumental(q)).toMatchObject({ estado: 'SPECIFIC_RESOLVED', identidades: ['REGLAMENTO_LEY_MUNICIPALIDADES'] });
    const texto = q.replace(/^art\. 25 del /, 'El ');
    expect(textoNombraInstrumento(texto, 'REGLAMENTO_LEY_MUNICIPALIDADES')).toBe(true);
    expect(textoNombraInstrumento(texto, 'LEY_MUNICIPALIDADES')).toBe(false);
  });

  it('«la nueva Ley de Municipalidades» sin reglamento sigue siendo la Ley', () => {
    expect(detectarInstrumentoDesdeTexto('artículo 25 de la nueva Ley de Municipalidades')).toBe('LEY_MUNICIPALIDADES');
  });
});
