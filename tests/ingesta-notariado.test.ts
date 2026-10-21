import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { identidadDocumentalCoincide } from '@/lib/rag/search';
import {
  ARTICULOS_REFORMA_77_2006,
  ARTICULOS_TRAMITE_77_2006,
  CODIGO_GAP_DOCUMENTAL,
  CURACION_CODIGO_NOTARIADO,
  GAPS_DOCUMENTALES_CODIGO_NOTARIADO,
  IDENTIDAD_CODIGO_NOTARIADO,
  IDENTIDAD_REGLAMENTO_NOTARIADO,
  NETWORK_WRITES,
  analizarFuenteNotariado,
  aplicarPoliticaEditorialNotariado,
  clasificarDuplicadosNotariado,
  clasificarHuecosParseo,
  encabezadoNotarialConGuion,
  identidadPorClave,
  normalizarNumeroArticuloOcr,
  parsearArgsNotariado,
  prepararLoteNotariado,
  resolverDuplicadosNotariado,
  segmentarNotariado,
} from '@/scripts/ingesta-notariado';
import { segmentarGenerico } from '@/scripts/ingestar-ley';
import type { ChunkCandidato } from '@/scripts/ingestar-ley';

beforeEach(() => {
  vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
    throw new Error(`process.exit(${code})`);
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const fixtureCodigo = readFileSync(
  resolve(process.cwd(), 'tests/fixtures/notariado-codigo-muestra.txt'),
  'utf8',
);
const fixtureReglamento = readFileSync(
  resolve(process.cwd(), 'tests/fixtures/notariado-reglamento-muestra.txt'),
  'utf8',
);
const fixtureEditorial = readFileSync(
  resolve(process.cwd(), 'tests/fixtures/notariado-codigo-editorial-77-2006.txt'),
  'utf8',
);

function chunk(num: string, contenido: string): ChunkCandidato {
  return { numArticulo: num, contenido, aceptado: true };
}

describe('identidad notarial anclada al router / currículo', () => {
  it('Código usa 03_NOTARIAL, id-prefix del adaptador y fuente Decreto 353-2005', () => {
    expect(IDENTIDAD_CODIGO_NOTARIADO.opts.materia).toBe('03_NOTARIAL');
    expect(IDENTIDAD_CODIGO_NOTARIADO.opts.idPrefix).toBe(
      'mayalex_normativos:codigo_notariado_2005',
    );
    expect(IDENTIDAD_CODIGO_NOTARIADO.opts.fuente).toMatch(/Decreto 353-2005/);
    expect(IDENTIDAD_CODIGO_NOTARIADO.articulosCurriculo).toEqual(['2', '3', '7', '8']);
  });

  it('Reglamento usa Resolución PCSJ-17-2012 y no se confunde con el Código', () => {
    expect(IDENTIDAD_REGLAMENTO_NOTARIADO.opts.fuente).toMatch(/PCSJ-17-2012/);
    expect(IDENTIDAD_REGLAMENTO_NOTARIADO.opts.idPrefix).toBe(
      'mayalex_normativos:reglamento_notariado_2012',
    );
    const filaCodigo = {
      id: 'x',
      contenido: 'x',
      num_articulo: '1',
      fuente: IDENTIDAD_CODIGO_NOTARIADO.opts.fuente,
      fuente_tipo: 'codigo',
      jurisdiccion: 'HN',
      es_norma_vigente: false,
      materia: '03_NOTARIAL',
    };
    const filaReglamento = { ...filaCodigo, fuente: IDENTIDAD_REGLAMENTO_NOTARIADO.opts.fuente };
    expect(identidadDocumentalCoincide(filaCodigo, 'CODIGO_NOTARIADO')).toBe(true);
    expect(identidadDocumentalCoincide(filaCodigo, 'REGLAMENTO_NOTARIADO')).toBe(false);
    expect(identidadDocumentalCoincide(filaReglamento, 'REGLAMENTO_NOTARIADO')).toBe(true);
    expect(identidadDocumentalCoincide(filaReglamento, 'CODIGO_NOTARIADO')).toBe(false);
  });

  it('identidadPorClave rechaza un instrumento inventado', () => {
    expect(() => identidadPorClave('penal')).toThrow(/process.exit/);
  });
});

describe('parsearArgsNotariado — dry-run only', () => {
  it('acepta codigo + input', () => {
    const r = parsearArgsNotariado(['--instrumento', 'codigo', '--input', 'x.txt']);
    expect(r.identidad.clave).toBe('codigo');
    expect(r.identidad.opts.input).toBe('x.txt');
    expect(r.identidad.opts.dryRun).toBe(true);
  });

  it('--execute falla cerrado (datos después)', () => {
    expect(() =>
      parsearArgsNotariado([
        '--instrumento',
        'codigo',
        '--input',
        'x.txt',
        '--execute',
        'out.sql',
      ]),
    ).toThrow(/process.exit/);
  });
});

const fuenteSintetica = {
  path: 'fixture.txt',
  sha256: '0'.repeat(64),
  bytes: 128,
  pages: 1,
  provenance: 'fixture sintética — no es texto legal oficial',
  extractedChars: 128,
};

describe('resolverDuplicadosNotariado', () => {
  it('colapsa ocurrencias idénticas y falla si el cuerpo diverge', () => {
    const { finales, colapsadosIdenticos } = resolverDuplicadosNotariado([
      chunk('2', 'Mismo cuerpo'),
      chunk('2', 'Mismo   cuerpo'),
    ]);
    expect(finales).toHaveLength(1);
    expect(colapsadosIdenticos).toEqual(['2']);

    expect(() =>
      resolverDuplicadosNotariado([
        chunk('7', 'Cuerpo A sustantivo'),
        chunk('7', 'Cuerpo B distinto y también sustantivo'),
      ]),
    ).toThrow(/process.exit/);
  });
});

describe('clasificarDuplicadosNotariado — informe, sin fail-hard', () => {
  it('colapsa idénticos y reporta divergentes sin abortar ni adjudicar', () => {
    const { finales, colapsadosIdenticos, divergentes } = clasificarDuplicadosNotariado([
      chunk('2', 'Mismo cuerpo'),
      chunk('2', 'Mismo   cuerpo'),
      chunk('7', 'Cuerpo A sustantivo'),
      chunk('7', 'Cuerpo B distinto y también sustantivo'),
    ]);
    expect(finales.map((c) => c.numArticulo)).toEqual(['2']);
    expect(colapsadosIdenticos).toEqual(['2']);
    expect(divergentes).toEqual([
      {
        numArticulo: '7',
        ocurrencias: 2,
        longitudes: ['Cuerpo A sustantivo'.length, 'Cuerpo B distinto y también sustantivo'.length],
      },
    ]);
  });
});

describe('analizarFuenteNotariado — dry-run tolerante a huecos', () => {
  it('reporta huecos 4/5/6 del fixture y nunca declara vigencia ni write', () => {
    const informe = analizarFuenteNotariado(fixtureCodigo, IDENTIDAD_CODIGO_NOTARIADO, fuenteSintetica);
    expect(informe.articulosAceptados).toEqual(['1', '2', '3', '7', '8']);
    expect(informe.huecosNumeracion).toEqual(['4', '5', '6']);
    expect(informe.curriculoFaltantes).toEqual([]);
    expect(informe.hallazgos.huecosSinCandidato).toEqual(['4', '5', '6']);
    expect(informe.vigenciaDeclarada).toBe(false);
    expect(informe.corpusWrite).toBe(false);
    expect(informe.sqlApply).toBe(false);
  });

  it('Código sin art. 8 del currículo NO aborta: lo lista como faltante', () => {
    const incompleto = 'ARTÍCULO 2. Solo dos.\nARTÍCULO 3. Solo tres.\nARTÍCULO 7. Solo siete.';
    const informe = analizarFuenteNotariado(incompleto, IDENTIDAD_CODIGO_NOTARIADO, fuenteSintetica);
    expect(informe.curriculoFaltantes).toEqual(['8']);
    expect(informe.articulosAceptados).toEqual(['2', '3', '7']);
    expect(informe.sqlApply).toBe(false);
  });

  it('recorta snippets de rechazados a 60 caracteres y no incluye el cuerpo', () => {
    const texto =
      'Según el artículo 9 de la ley, corresponde y este párrafo sintético es deliberadamente largo para forzar el recorte.';
    const informe = analizarFuenteNotariado(texto, IDENTIDAD_REGLAMENTO_NOTARIADO, fuenteSintetica);
    expect(informe.counts.rechazados).toBeGreaterThan(0);
    expect(informe.rechazados.every((r) => r.snippet.length <= 60)).toBe(true);
    expect(informe.rechazados[0]?.numArticulo).toBe('9');
  });

  it('clasifica OCR O-por-0 y currículo bloqueado por divergente, sin adjudicar', () => {
    const ocr = clasificarHuecosParseo(
      ['5', '2O', '7', '8'],
      ['2', '3', '6', '20'],
      ['2', '3'],
      [{ numArticulo: '3', ocurrencias: 2, longitudes: [10, 12] }],
      [{ numArticulo: '6' }],
    );
    expect(ocr.ocrLetraOPorCero).toEqual(['2O']);
    expect(ocr.huecosPorDivergente).toEqual(['3']);
    expect(ocr.huecosPorRechazo).toEqual(['6']);
    expect(ocr.huecosSinCandidato).toEqual(['2']);
    expect(ocr.curriculoBloqueadoPorDivergente).toEqual(['3']);
    expect(ocr.curriculoAusente).toEqual(['2']);
  });
});

describe('prepararLoteNotariado — fixtures sintéticas', () => {
  it('Código cubre arts. 2/3/7/8, IDs canónicos y nunca declara vigente', () => {
    const lote = prepararLoteNotariado(fixtureCodigo, {
      ...IDENTIDAD_CODIGO_NOTARIADO,
      opts: { ...IDENTIDAD_CODIGO_NOTARIADO.opts, input: 'fixture' },
    });
    expect(lote.registros.map((r) => r.num_articulo).sort()).toEqual(['1', '2', '3', '7', '8']);
    expect(lote.registros.find((r) => r.num_articulo === '2')?.id).toBe(
      'mayalex_normativos:codigo_notariado_2005_a2',
    );
    expect(lote.registros.every((r) => r.es_norma_vigente === false)).toBe(true);
    expect(lote.registros.every((r) => r.metadata.verificado === false)).toBe(true);
    expect(lote.registros.every((r) => r.metadata.vigencia_state === 'NO_VERIFICADO')).toBe(true);
    expect(lote.finales.find((c) => c.numArticulo === '3')?.contenido).toMatch(/treinta y uno/);
  });

  it('Reglamento no se etiqueta como Código y no exige arts. del currículo', () => {
    const lote = prepararLoteNotariado(fixtureReglamento, {
      ...IDENTIDAD_REGLAMENTO_NOTARIADO,
      opts: { ...IDENTIDAD_REGLAMENTO_NOTARIADO.opts, input: 'fixture' },
    });
    expect(lote.registros.map((r) => r.num_articulo).sort()).toEqual(['1', '21']);
    expect(lote.registros[0]?.id).toBe('mayalex_normativos:reglamento_notariado_2012_a1');
    expect(lote.registros[0]?.fuente).toMatch(/Reglamento/);
  });

  it('Código sin art. 8 del currículo falla cerrado', () => {
    const incompleto = 'ARTÍCULO 2. Solo dos.\nARTÍCULO 3. Solo tres.\nARTÍCULO 7. Solo siete.';
    expect(() =>
      prepararLoteNotariado(incompleto, {
        ...IDENTIDAD_CODIGO_NOTARIADO,
        opts: { ...IDENTIDAD_CODIGO_NOTARIADO.opts, input: 'x' },
      }),
    ).toThrow(/process.exit/);
  });
});

describe('política editorial 77-2006 + OCR — fail-closed', () => {
  it('NETWORK_WRITES=0 y allowlists fijas', () => {
    expect(NETWORK_WRITES).toBe(0);
    expect(ARTICULOS_REFORMA_77_2006).toEqual(['11', '27']);
    expect(ARTICULOS_TRAMITE_77_2006).toEqual(['1', '2', '3', '4']);
    expect(normalizarNumeroArticuloOcr('2O')).toEqual({ normalizado: '20', eraOcr: true });
    expect(normalizarNumeroArticuloOcr('5A')).toEqual({ normalizado: '5A', eraOcr: false });
  });

  it('los scripts de notariado no abren Supabase ni fetch', () => {
    const fuentes = [
      readFileSync(resolve(process.cwd(), 'scripts/ingesta-notariado.ts'), 'utf8'),
      readFileSync(resolve(process.cwd(), 'scripts/dry-run-notariado-fuente-real.ts'), 'utf8'),
      readFileSync(resolve(process.cwd(), 'scripts/generar-lote-formal-notariado.ts'), 'utf8'),
    ];
    for (const src of fuentes) {
      expect(src).not.toMatch(/@supabase|createClient\s*\(|\bfetch\s*\(/);
    }
  });

  it('11/27 divergentes van a curación TEXTO_DIVERGENTE (no se adjudican ni fallan); 1/2/3/4 son primera ocurrencia', () => {
    const editorial = aplicarPoliticaEditorialNotariado([
      chunk('1', 'Cuerpo 2005 sintético del primero'),
      chunk('2', 'Cuerpo 2005 sintético del segundo'),
      chunk('3', 'Cuerpo 2005 sintético del tercero'),
      chunk('4', 'Cuerpo 2005 sintético del cuarto'),
      chunk('11', 'Cuerpo 2005 sintético del undécimo'),
      chunk('1', 'Cuerpo anexo orden de reforma'),
      chunk('2', 'Cuerpo anexo Derogar el Capitulo VI del Instituto'),
      chunk('3', 'Cuerpo anexo certificados de autenticidad CAH'),
      chunk('4', 'Cuerpo anexo vacatio'),
      chunk('11', 'Cuerpo 77-2006 sintético del undécimo'),
      chunk('27', 'Cuerpo 2005 sintético del 27'),
      chunk('27', 'Cuerpo 77-2006 sintético del 27'),
    ]);
    // Dictamen CLO 21-oct-2026 (issue #74): sólo la Gaceta 30,904 o una fe de erratas deciden 11/27.
    expect(editorial.curacion.filter((c) => c.motivo === 'TEXTO_DIVERGENTE').map((c) => c.numArticulo)).toEqual(['11', '27']);
    expect(editorial.adjudicadosTramite77).toEqual(['1', '2', '3', '4']);
    expect(editorial.divergentes).toEqual([]);
    expect(editorial.finales.find((c) => c.numArticulo === '2')?.contenido).toMatch(/2005/);
    expect(editorial.finales.find((c) => c.numArticulo === '3')?.contenido).toMatch(/2005/);
    expect(editorial.finales.some((c) => c.numArticulo === '11' || c.numArticulo === '27')).toBe(false);
    expect(() => resolverDuplicadosNotariado([chunk('11', 'A'), chunk('11', 'B distinto')])).not.toThrow();
  });

  it('ancla: art. 2/3 de trámite 77-2006 no pueden quedar como canónicos', () => {
    expect(() =>
      prepararLoteNotariado(
        [
          'Código del Notariado de Honduras (Decreto 353-2005)',
          'ARTÍCULO 2. Derogar el Capitulo VI del Código del Notariado titulado Instituto.',
          'ARTÍCULO 3. Los ingresos producto de los certificados de autenticidad y de los timbres.',
          'ARTÍCULO 7. Solo siete sintético.',
          'ARTÍCULO 8. Solo ocho sintético.',
        ].join('\n'),
        { ...IDENTIDAD_CODIGO_NOTARIADO, opts: { ...IDENTIDAD_CODIGO_NOTARIADO.opts, input: 'ancla' } },
      ),
    ).toThrow(/process.exit/);
  });

  it('un divergente fuera de allowlist sigue fail-hard', () => {
    expect(() =>
      resolverDuplicadosNotariado([
        chunk('7', 'Cuerpo A sustantivo'),
        chunk('7', 'Cuerpo B distinto y también sustantivo'),
      ]),
    ).toThrow(/process.exit/);
  });

  it('fixture editorial cubre currículo y OCR 20; 2/3 son 2005; 11/17/27 en curación sin cargar', () => {
    const informe = analizarFuenteNotariado(fixtureEditorial, IDENTIDAD_CODIGO_NOTARIADO, fuenteSintetica);
    expect(informe.curriculoFaltantes).toEqual([]);
    expect(informe.curacion).toEqual(CURACION_CODIGO_NOTARIADO);
    expect(informe.adjudicadosTramite77).toEqual(['1', '2', '3', '4']);
    expect(informe.ocrNormalizados).toEqual(['20']);
    expect(informe.articulosAceptados).toContain('20');
    expect(informe.articulosAceptados).not.toContain('11');
    expect(informe.articulosAceptados).not.toContain('27');
    expect(informe.huecosBloqueantes).not.toEqual(expect.arrayContaining(['11']));
    expect(informe.hallazgos.enCuracion).toEqual(['11', '17', '27']);
    expect(informe.networkWrites).toBe(0);
    expect(informe.vigenciaDeclarada).toBe(false);

    const lote = prepararLoteNotariado(fixtureEditorial, {
      ...IDENTIDAD_CODIGO_NOTARIADO,
      opts: { ...IDENTIDAD_CODIGO_NOTARIADO.opts, input: 'fixture-editorial' },
    });
    expect(lote.registros.find((r) => r.num_articulo === '2')?.contenido).toMatch(/original del segundo/);
    expect(lote.registros.find((r) => r.num_articulo === '3')?.contenido).toMatch(/original del tercer/);
    expect(lote.registros.find((r) => r.num_articulo === '11')).toBeUndefined();
    expect(lote.registros.find((r) => r.num_articulo === '27')).toBeUndefined();
    expect(lote.registros.find((r) => r.num_articulo === '1')?.contenido).toMatch(/original del primer/);
    expect(lote.registros.find((r) => r.num_articulo === '2')?.metadata.adjudicacion_editorial).toBe(
      'primera_ocurrencia_tramite_77_2006',
    );
    expect(lote.manifest.curacion).toEqual(CURACION_CODIGO_NOTARIADO);
    expect(lote.registros.some((r) => 'reforma_adjudicada' in r.metadata)).toBe(false);
    expect(lote.registros.find((r) => r.num_articulo === '20')?.id).toBe(
      'mayalex_normativos:codigo_notariado_2005_a20',
    );
    expect(lote.manifest.gaps_documentales.some((g) => g.codigo === CODIGO_GAP_DOCUMENTAL)).toBe(true);
    expect(lote.registros.every((r) => r.es_norma_vigente === false)).toBe(true);
  });
});

describe('dictamen CLO 21-oct-2026 (issue #74) — parser y curación del Código del Notariado', () => {
  const codigoCon = (...lineas: string[]) =>
    [
      'Código del Notariado de Honduras (Decreto 353-2005)',
      'FIXTURE SINTÉTICA — no es el texto legal oficial.',
      'ARTÍCULO 2. El Notariado es la institución del Estado sintética. No es norma vigente.',
      'ARTÍCULO 3. La función notarial es aquella función de interés público sintética. No es norma vigente.',
      'ARTÍCULO 7. Texto sintético del séptimo. No es norma vigente.',
      'ARTÍCULO 8. Texto sintético del octavo. No es norma vigente.',
      ...lineas,
    ].join('\n');
  const idCodigo = { ...IDENTIDAD_CODIGO_NOTARIADO, opts: { ...IDENTIDAD_CODIGO_NOTARIADO.opts, input: 'clo-74' } };

  it('acepta «ARTÍCULO 21 -» y «ARTÍCULO 52. -» como encabezados', () => {
    expect(encabezadoNotarialConGuion('ARTÍCULO 21 - Texto sintético', '21')).toBe(true);
    expect(encabezadoNotarialConGuion('ARTÍCULO 52. - Texto sintético', '52')).toBe(true);
    expect(encabezadoNotarialConGuion('ARTICULO 52.- Texto sintético', '52')).toBe(true);
    const chunks = segmentarNotariado(codigoCon('ARTÍCULO 21 - Texto sintético del veintiuno.', 'ARTÍCULO 52. - Texto sintético del cincuenta y dos.'));
    expect(chunks.filter((c) => c.aceptado).map((c) => c.numArticulo)).toEqual(['2', '3', '7', '8', '21', '52']);
  });

  it('el parser genérico (y por tanto tieneEncabezadoArticulo en producción) no cambia: sigue rechazando esos encabezados', () => {
    const chunks = segmentarGenerico('ARTÍCULO 21 - Texto sintético.\nARTÍCULO 52. - Otro texto sintético.');
    expect(chunks.filter((c) => c.aceptado)).toEqual([]);
  });

  it('no altera el texto: el contenido es el tramo original de la fuente, encabezado incluido', () => {
    const linea21 = 'ARTÍCULO 21 - Texto sintético del veintiuno, con   espacios   y guion - interno.';
    const linea52 = 'ARTÍCULO 52. - Texto sintético del cincuenta y dos.';
    const lote = prepararLoteNotariado(codigoCon(linea21, linea52), idCodigo);
    expect(lote.finales.find((c) => c.numArticulo === '21')?.contenido).toBe(linea21);
    expect(lote.finales.find((c) => c.numArticulo === '52')?.contenido).toBe(linea52);
    expect(lote.registros.find((r) => r.num_articulo === '21')?.contenido).toContain(linea21);
    expect(lote.registros.find((r) => r.num_articulo === '52')?.contenido).toContain(linea52);
  });

  it('una cita con guion dentro de un cuerpo (minúsculas) no se toma por encabezado', () => {
    expect(encabezadoNotarialConGuion('artículo 21 - Texto', '21')).toBe(false);
    expect(encabezadoNotarialConGuion('ARTÍCULO 21 - texto en minúscula', '21')).toBe(false);
    expect(encabezadoNotarialConGuion('ARTÍCULO 21 -', '21')).toBe(false);
    const chunks = segmentarNotariado(codigoCon('ARTÍCULO 9. Remite al artículo 21 - Ver texto sintético.'));
    expect(chunks.filter((c) => c.aceptado).map((c) => c.numArticulo)).not.toContain('21');
  });

  it('21 y 52 ya no son gaps documentales; el 17 sí', () => {
    expect(GAPS_DOCUMENTALES_CODIGO_NOTARIADO.map((g) => g.numArticulo)).toEqual(['17']);
  });

  it('art. 17: HUECO en curación; no se carga ni se inventa, aunque la fuente traiga un candidato', () => {
    expect(CURACION_CODIGO_NOTARIADO.find((c) => c.numArticulo === '17')?.motivo).toBe('HUECO');
    const lote = prepararLoteNotariado(codigoCon('ARTÍCULO 17. Texto sintético que no debe cargarse.'), idCodigo);
    expect(lote.registros.some((r) => r.num_articulo === '17')).toBe(false);
    expect(lote.curacion).toContainEqual(expect.objectContaining({ numArticulo: '17', motivo: 'HUECO' }));
    // «ARTÍCULO 17.Los» (sin espacio) sigue sin entrar.
    expect(segmentarNotariado('ARTÍCULO 17.Los notarios sintéticos.').filter((c) => c.aceptado)).toEqual([]);
  });

  it('arts. 11 y 27: TEXTO_DIVERGENTE, sin PRIMARY ni registro, también con una sola ocurrencia', () => {
    const lote = prepararLoteNotariado(
      codigoCon('ARTÍCULO 11. Texto sintético único del undécimo.', 'ARTÍCULO 27. Texto sintético único del 27.'),
      idCodigo,
    );
    expect(lote.registros.some((r) => r.num_articulo === '11' || r.num_articulo === '27')).toBe(false);
    expect(lote.curacion.filter((c) => c.motivo === 'TEXTO_DIVERGENTE').map((c) => c.numArticulo)).toEqual(['11', '27']);
    expect(lote.registros.every((r) => r.es_norma_vigente === false)).toBe(true);
  });

  it('el Reglamento no se ve afectado: sus arts. 11 y 27 se cargan y no hay curación', () => {
    const texto = [
      'Reglamento del Código del Notariado (Resolución PCSJ-17-2012)',
      'ARTÍCULO 11. Texto sintético del Reglamento.',
      'ARTÍCULO 27. Otro texto sintético del Reglamento.',
    ].join('\n');
    const lote = prepararLoteNotariado(texto, {
      ...IDENTIDAD_REGLAMENTO_NOTARIADO,
      opts: { ...IDENTIDAD_REGLAMENTO_NOTARIADO.opts, input: 'clo-74' },
    });
    expect(lote.registros.map((r) => r.num_articulo)).toEqual(['11', '27']);
    expect(lote.curacion).toEqual([]);
  });

  it('--execute sigue bloqueado', () => {
    expect(() => parsearArgsNotariado(['--execute', 'x.sql', '--instrumento', 'codigo', '--input', 'x.txt'])).toThrow(/process.exit/);
  });
});
