import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { identidadDocumentalCoincide } from '@/lib/rag/search';
import {
  ARTICULOS_REFORMA_77_2006,
  IDENTIDAD_CODIGO_NOTARIADO,
  IDENTIDAD_REGLAMENTO_NOTARIADO,
  NETWORK_WRITES,
  analizarFuenteNotariado,
  aplicarPoliticaEditorialNotariado,
  clasificarDuplicadosNotariado,
  clasificarHuecosParseo,
  identidadPorClave,
  normalizarNumeroArticuloOcr,
  parsearArgsNotariado,
  prepararLoteNotariado,
  resolverDuplicadosNotariado,
} from '@/scripts/ingesta-notariado';
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
  it('NETWORK_WRITES=0 y allowlist fija 2/3/11/27', () => {
    expect(NETWORK_WRITES).toBe(0);
    expect(ARTICULOS_REFORMA_77_2006).toEqual(['2', '3', '11', '27']);
    expect(normalizarNumeroArticuloOcr('2O')).toEqual({ normalizado: '20', eraOcr: true });
    expect(normalizarNumeroArticuloOcr('5A')).toEqual({ normalizado: '5A', eraOcr: false });
  });

  it('los scripts de notariado no abren Supabase ni fetch', () => {
    const fuentes = [
      readFileSync(resolve(process.cwd(), 'scripts/ingesta-notariado.ts'), 'utf8'),
      readFileSync(resolve(process.cwd(), 'scripts/dry-run-notariado-fuente-real.ts'), 'utf8'),
    ];
    for (const src of fuentes) {
      expect(src).not.toMatch(/@supabase|createClient\s*\(|\bfetch\s*\(/);
    }
  });

  it('prevalece el cuerpo reformado (última ocurrencia) en arts. 2/3/11/27', () => {
    const editorial = aplicarPoliticaEditorialNotariado([
      chunk('2', 'Cuerpo 2005 sintético del segundo'),
      chunk('3', 'Cuerpo 2005 sintético del tercero'),
      chunk('2', 'Cuerpo 77-2006 sintético del segundo'),
      chunk('3', 'Cuerpo 77-2006 sintético del tercero'),
      chunk('11', 'Cuerpo 2005 sintético del undécimo'),
      chunk('11', 'Cuerpo 77-2006 sintético del undécimo'),
      chunk('27', 'Cuerpo 77-2006 sintético del 27'),
    ]);
    expect(editorial.adjudicadosReforma77).toEqual(['2', '3', '11']);
    expect(editorial.divergentes).toEqual([]);
    expect(editorial.finales.find((c) => c.numArticulo === '2')?.contenido).toMatch(/77-2006/);
    expect(editorial.finales.find((c) => c.numArticulo === '3')?.contenido).toMatch(/77-2006/);
  });

  it('art. 1 o 4 divergente NO se adjudica y prepararLote falla cerrado', () => {
    const editorial = aplicarPoliticaEditorialNotariado([
      chunk('1', 'Cuerpo 2005 sintético del primero'),
      chunk('1', 'Cuerpo anexo sintético distinto del primero'),
      chunk('2', 'Único dos'),
      chunk('3', 'Único tres'),
      chunk('7', 'Único siete'),
      chunk('8', 'Único ocho'),
    ]);
    expect(editorial.divergentes.map((d) => d.numArticulo)).toEqual(['1']);
    expect(editorial.adjudicadosReforma77).toEqual([]);

    expect(() =>
      resolverDuplicadosNotariado([
        chunk('1', 'Cuerpo 2005 sintético del primero'),
        chunk('1', 'Cuerpo anexo sintético distinto del primero'),
      ]),
    ).toThrow(/process.exit/);
  });

  it('fixture editorial cubre currículo, OCR 20 y reforma 2/3; nunca vigente', () => {
    const informe = analizarFuenteNotariado(fixtureEditorial, IDENTIDAD_CODIGO_NOTARIADO, fuenteSintetica);
    expect(informe.curriculoFaltantes).toEqual([]);
    expect(informe.adjudicadosReforma77).toEqual(['2', '3', '11']);
    expect(informe.ocrNormalizados).toEqual(['20']);
    expect(informe.articulosAceptados).toContain('20');
    expect(informe.articulosAceptados).toContain('27');
    expect(informe.networkWrites).toBe(0);
    expect(informe.vigenciaDeclarada).toBe(false);

    const lote = prepararLoteNotariado(fixtureEditorial, {
      ...IDENTIDAD_CODIGO_NOTARIADO,
      opts: { ...IDENTIDAD_CODIGO_NOTARIADO.opts, input: 'fixture-editorial' },
    });
    expect(lote.registros.find((r) => r.num_articulo === '2')?.contenido).toMatch(/reformado/);
    expect(lote.registros.find((r) => r.num_articulo === '2')?.metadata.reforma_adjudicada).toBe(
      'Decreto 77-2006',
    );
    expect(lote.registros.find((r) => r.num_articulo === '20')?.id).toBe(
      'mayalex_normativos:codigo_notariado_2005_a20',
    );
    expect(lote.registros.every((r) => r.es_norma_vigente === false)).toBe(true);
  });
});
