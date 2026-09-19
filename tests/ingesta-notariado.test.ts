import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { identidadDocumentalCoincide } from '@/lib/rag/search';
import {
  IDENTIDAD_CODIGO_NOTARIADO,
  IDENTIDAD_REGLAMENTO_NOTARIADO,
  identidadPorClave,
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
    expect(lote.finales.find((c) => c.numArticulo === '3')?.contenido).toMatch(/artículo 31/);
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
