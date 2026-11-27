/**
 * Bloque (a) de la Fase II (2026-11-26): las leyes V5 de las olas 12–13 (LOAT, LP, LA, LPA, LMUN y RLMUN) entran al catálogo único de
 * identidad (instrument-identity.ts) y el buscador exacto las reconoce por su nombre completo. Las fuentes son las de producción
 * (consulta de solo lectura, 2026-11-26); las filas imitan las V5: sin «Artículo N.» en el contenido y num_articulo normalizado.
 */
import { describe, expect, it } from 'vitest';
import {
  detectarArticuloExacto, detectarIdentidadesDesdeTexto, detectarInstrumentoDesdeTexto, resolverArticuloExacto, type FilaExactaDB,
  type InstrumentoNormalizado,
} from '@/lib/legal-retrieval/exact-resolver';
import { identidadDeFuente, RE_FUENTE_POR_INSTRUMENTO } from '@/lib/legal-retrieval/instrument-identity';
import { clasificarIntencionInstrumental, elegibilidadSemantica, IDENTIFICADORES_DOCUMENTALES } from '@/lib/legal-retrieval/instrument-gate';
import { instrumentIdDeFragmento } from '@/lib/legal-retrieval/clo-guards';

const LEYES: Array<[InstrumentoNormalizado, string, string, string]> = [
  // id, fuente de producción, nombre en una consulta, número de decreto o acuerdo
  ['LEY_ORGANIZACION_TRIBUNALES', 'Ley de Organización y Atribuciones de los Tribunales de Honduras (Decreto No. 76 de 1906)', 'Ley de Organización y Atribuciones de los Tribunales', '76-1906'],
  ['LEY_PROPIEDAD', 'Ley de Propiedad de Honduras (Decreto No. 82-2004)', 'Ley de Propiedad', '82-2004'],
  ['LEY_LAVADO_ACTIVOS', 'Ley Especial contra el Lavado de Activos de Honduras (Decreto No. 144-2014)', 'Ley Especial contra el Lavado de Activos', '144-2014'],
  ['LEY_PROCEDIMIENTO_ADMINISTRATIVO', 'Ley de Procedimiento Administrativo de Honduras (Decreto No. 152-87)', 'Ley de Procedimiento Administrativo', '152-87'],
  ['REGLAMENTO_LEY_MUNICIPALIDADES', 'Reglamento General de la Ley de Municipalidades de Honduras (Acuerdo No. 018-93)', 'Reglamento General de la Ley de Municipalidades', '018-93'],
  ['LEY_MUNICIPALIDADES', 'Ley de Municipalidades de Honduras (Decreto No. 134-90)', 'Ley de Municipalidades', '134-90'],
];
const FUENTE = Object.fromEntries(LEYES.map(([id, f]) => [id, f])) as Record<string, string>;

const filaV5 = (id: InstrumentoNormalizado, num: string, extra: Partial<FilaExactaDB> = {}): FilaExactaDB => ({
  id: `LOTE:${id}:${num}`, contenido: `Texto del artículo ${num} sin encabezado.`, num_articulo: num, fuente: FUENTE[id],
  fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '10_LEYES_REGLAMENTOS',
  metadata: { norm_id: `HN:${id}`, instrumento_id: id, estado_v: 'V5' }, ...extra,
});

describe('catálogo único: la fuente real confirma cada ley y solo esa', () => {
  it.each(LEYES)('%s: fuente de producción → identidad propia (catálogo y guardián CLO coinciden)', (id, fuente) => {
    expect(identidadDeFuente(fuente)).toBe(id);
    expect(instrumentIdDeFragmento({ fuente })).toBe(id);
    const otras = LEYES.filter(([o]) => o !== id).map(([o]) => o);
    for (const o of otras) expect(RE_FUENTE_POR_INSTRUMENTO[o].test(fuente), `${o} no debe confirmar «${fuente}»`).toBe(false);
  });

  it('fuentes parecidas o extranjeras no confirman ninguna de estas leyes', () => {
    for (const f of [
      'Ley de Propiedad Intelectual (Decreto 12-99-E)',
      'Ley de Propiedad Industrial (Decreto 12-99-E)',
      'Ley de Municipalidades de El Salvador',
      'Comentario a la Ley de Municipalidades',
      'Ley contra el Delito de Lavado de Activos (Decreto 45-2002)',
      'Ley Especial contra el Lavado de Activos y Financiamiento del Terrorismo de Panamá',
      'Ley General de la Administración Pública',
    ]) {
      const id = identidadDeFuente(f);
      expect(LEYES.map(([x]) => x as string), f).not.toContain(id);
    }
  });

  it('cada número de decreto o acuerdo está registrado para su ley y es único', () => {
    for (const [id, , , codigo] of LEYES) expect(IDENTIFICADORES_DOCUMENTALES[id]).toEqual([codigo]);
    const todos = Object.values(IDENTIFICADORES_DOCUMENTALES).flat();
    expect(new Set(todos).size).toBe(todos.length);
  });
});

describe('detector de consultas: nombre completo, con las exclusiones', () => {
  it.each(LEYES)('%s se detecta por su nombre completo', (id, _f, nombre) => {
    expect(detectarInstrumentoDesdeTexto(`¿Qué dice el artículo 25 de la ${nombre}?`)).toBe(id);
    expect(detectarArticuloExacto(`art. 25 de la ${nombre}`)).toMatchObject({ numero: '25', instrumento: id });
  });

  it('«art. 25 del Reglamento de la Ley de Municipalidades» → solo el Reglamento; «art. 25 de la Ley de Municipalidades» → solo la Ley', () => {
    for (const q of ['art. 25 del Reglamento de la Ley de Municipalidades', 'artículo 25 del Reglamento General de la Ley de Municipalidades']) {
      expect(detectarInstrumentoDesdeTexto(q), q).toBe('REGLAMENTO_LEY_MUNICIPALIDADES');
      expect(detectarIdentidadesDesdeTexto(q).map((i) => i.instrumento), q).toEqual(['REGLAMENTO_LEY_MUNICIPALIDADES']);
      expect(clasificarIntencionInstrumental(q), q).toMatchObject({ estado: 'SPECIFIC_RESOLVED', identidades: ['REGLAMENTO_LEY_MUNICIPALIDADES'] });
    }
    const ley = 'art. 25 de la Ley de Municipalidades';
    expect(detectarInstrumentoDesdeTexto(ley)).toBe('LEY_MUNICIPALIDADES');
    expect(clasificarIntencionInstrumental(ley)).toMatchObject({ estado: 'SPECIFIC_RESOLVED', identidades: ['LEY_MUNICIPALIDADES'] });
  });

  it('una consulta que nombra las dos es una comparación de las dos', () => {
    const q = 'compare el artículo 25 de la Ley de Municipalidades con el artículo 25 del Reglamento de la Ley de Municipalidades';
    expect(clasificarIntencionInstrumental(q)).toMatchObject({
      estado: 'MULTI_SPECIFIC_RESOLVED', identidades: ['LEY_MUNICIPALIDADES', 'REGLAMENTO_LEY_MUNICIPALIDADES'],
    });
  });

  it('falsos positivos: Propiedad Intelectual/Industrial/Horizontal y leyes extranjeras no se resuelven a estas leyes', () => {
    for (const q of [
      'artículo 5 de la Ley de Propiedad Intelectual',
      'artículo 5 de la Ley de Propiedad Industrial',
      'artículo 5 de la Ley de Propiedad Horizontal',
      'artículo 25 de la Ley de Municipalidades de El Salvador',
      'artículo 25 de la Ley de Municipalidades de la República de Guatemala',
      'artículo 3 de la Ley de Procedimiento Administrativo de Costa Rica',
      'artículo 3 de la Ley de Procedimiento Administrativo salvadoreña',
    ]) {
      expect(detectarInstrumentoDesdeTexto(q), q).toBeNull();
      // Sigue siendo una referencia específica: el gate se abstiene (fail-close), no cae a NONE ni cita la ley hondureña.
      expect(clasificarIntencionInstrumental(q).estado, q).toBe('SPECIFIC_UNRESOLVED');
    }
  });

  it('«Ley contra el Lavado de Activos de Panamá»: sin identidad; el gate la trata como tema (NONE), igual que antes de este cambio', () => {
    const q = 'artículo 3 de la Ley contra el Lavado de Activos de Panamá';
    expect(detectarInstrumentoDesdeTexto(q)).toBeNull();
    expect(detectarArticuloExacto(q)?.instrumento).toBeNull();
    // Comportamiento previo del gate para «ley contra …» (no es «ley de/del» + título): NONE. No se resuelve a la ley hondureña.
    expect(clasificarIntencionInstrumental(q)).toMatchObject({ estado: 'NONE', identidades: [] });
  });

  it('el decreto solo, sin nombre, identifica la ley por correspondencia única', () => {
    expect(clasificarIntencionInstrumental('¿qué establece el Decreto 134-90 en su artículo 25?')).toMatchObject({
      estado: 'SPECIFIC_RESOLVED', identidades: ['LEY_MUNICIPALIDADES'],
    });
    expect(clasificarIntencionInstrumental('artículo 25 del Acuerdo 018-93')).toMatchObject({
      estado: 'SPECIFIC_RESOLVED', identidades: ['REGLAMENTO_LEY_MUNICIPALIDADES'],
    });
    // Decreto equivocado para la ley nombrada: conflicto, fail-close.
    expect(clasificarIntencionInstrumental('artículo 25 de la Ley de Municipalidades (Decreto 82-2004)').estado).toBe('SPECIFIC_UNRESOLVED');
  });

  it('las identidades anteriores no cambian', () => {
    expect(detectarInstrumentoDesdeTexto('artículo 1 del Código Civil')).toBe('CODIGO_CIVIL');
    expect(detectarInstrumentoDesdeTexto('artículo 5 de la Ley sobre Justicia Constitucional')).toBe('LEY_JUSTICIA_CONSTITUCIONAL');
    expect(detectarInstrumentoDesdeTexto('artículo 72 del Reglamento del Código del Notariado')).toBe('REGLAMENTO_NOTARIADO');
    expect(clasificarIntencionInstrumental('artículo 3 de la Ley de Inquilinato').estado).toBe('SPECIFIC_UNRESOLVED');
  });
});

describe('ruta exacta con filas como las de producción', () => {
  const filas = [filaV5('LEY_MUNICIPALIDADES', '25'), filaV5('REGLAMENTO_LEY_MUNICIPALIDADES', '25'), filaV5('LEY_PROPIEDAD', '25', { materia: '02_CIVIL' })];

  it('«art. 25 de la Ley de Municipalidades» → solo la fila de la Ley, PRIMARY', () => {
    const d = detectarArticuloExacto('art. 25 de la Ley de Municipalidades')!;
    const r = resolverArticuloExacto(filas, d.numero, d.instrumento, 'HN');
    expect(r.ambiguo).toBe(false);
    expect(r.fragmentos.map((f) => [f.id, f.rol_evidencia])).toEqual([['LOTE:LEY_MUNICIPALIDADES:25', 'PRIMARY']]);
  });

  it('«art. 25 del Reglamento de la Ley de Municipalidades» → solo la fila del Reglamento, PRIMARY', () => {
    const d = detectarArticuloExacto('art. 25 del Reglamento de la Ley de Municipalidades')!;
    const r = resolverArticuloExacto(filas, d.numero, d.instrumento, 'HN');
    expect(r.fragmentos.map((f) => [f.id, f.rol_evidencia])).toEqual([['LOTE:REGLAMENTO_LEY_MUNICIPALIDADES:25', 'PRIMARY']]);
  });

  it.each(LEYES)('%s: su artículo se recupera sin encabezado textual, por num_articulo', (id, _f, nombre) => {
    const r = resolverArticuloExacto([filaV5(id, '7'), filaV5(id, '70')], '7', detectarInstrumentoDesdeTexto(`art. 7 de la ${nombre}`), 'HN');
    expect(r.fragmentos.map((f) => f.id)).toEqual([`LOTE:${id}:7`]);
    expect(r.fragmentos[0].rol_evidencia).toBe('PRIMARY');
  });

  it('una fila de otra ley o de otro país con el mismo número no se acepta', () => {
    const intelectual = filaV5('LEY_PROPIEDAD', '5', { id: 'PI:5', fuente: 'Ley de Propiedad Intelectual (Decreto 12-99-E)', metadata: null });
    expect(resolverArticuloExacto([intelectual], '5', 'LEY_PROPIEDAD', 'HN').fragmentos).toEqual([]);
    const sv = filaV5('LEY_MUNICIPALIDADES', '5', { jurisdiccion: 'SV' });
    expect(resolverArticuloExacto([sv], '5', 'LEY_MUNICIPALIDADES', 'HN').fragmentos).toEqual([]);
  });

  it('la ruta semántica con intención resuelta solo admite la fuente de esa ley', () => {
    const elegible = elegibilidadSemantica(clasificarIntencionInstrumental('¿qué dice el Reglamento de la Ley de Municipalidades sobre los cabildos?'));
    expect(elegible(FUENTE.REGLAMENTO_LEY_MUNICIPALIDADES)).toBe(true);
    expect(elegible(FUENTE.LEY_MUNICIPALIDADES)).toBe(false);
  });
});
