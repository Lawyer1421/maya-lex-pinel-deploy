import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parsearArgs,
  segmentarGenerico,
  construirRegistro,
  fallarDuro,
  type OpcionesCLI,
} from '@/scripts/ingestar-ley';

// fallarDuro() llama a process.exit(1) -- sin mockearlo, cualquier test que
// ejercite una ruta inválida mataría el propio proceso de vitest. Se
// reemplaza por una implementación que LANZA, para poder usar
// expect(...).toThrow() como con cualquier otra función que valida input.
beforeEach(() => {
  vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
    throw new Error(`process.exit(${code})`);
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parsearArgs', () => {
  const argsBase = [
    '--input', 'x.txt',
    '--coleccion', 'mayalex_normativos',
    '--materia', '01_PENAL',
    '--fuente', 'Fuente de prueba',
    '--id-prefix', 'mayalex_normativos:prueba',
  ];

  it('acepta argumentos completos y válidos, default dry-run=true', () => {
    const o = parsearArgs(argsBase);
    expect(o.dryRun).toBe(true);
    expect(o.execute).toBeNull();
    expect(o.coleccion).toBe('mayalex_normativos');
    expect(o.materia).toBe('01_PENAL');
  });

  it('--execute <ruta> saca del modo dry-run', () => {
    const o = parsearArgs([...argsBase, '--execute', 'out.sql']);
    expect(o.dryRun).toBe(false);
    expect(o.execute).toBe('out.sql');
  });

  it('rechaza una materia fuera de la whitelist (no inventar 04_* sin PR de router)', () => {
    const args = [...argsBase];
    args[args.indexOf('--materia') + 1] = '04_PROCESAL_CIVIL';
    expect(() => parsearArgs(args)).toThrow();
  });

  it('rechaza una coleccion fuera de la whitelist', () => {
    const args = [...argsBase];
    args[args.indexOf('--coleccion') + 1] = 'coleccion_inventada';
    expect(() => parsearArgs(args)).toThrow();
  });

  it('rechaza --fuente-tipo inválido', () => {
    expect(() => parsearArgs([...argsBase, '--fuente-tipo', 'novela'])).toThrow();
  });

  it('exige --id-prefix', () => {
    const sinIdPrefix = [
      '--input', 'x.txt',
      '--coleccion', 'mayalex_normativos',
      '--materia', '01_PENAL',
      '--fuente', 'Fuente de prueba',
    ];
    expect(() => parsearArgs(sinIdPrefix)).toThrow();
  });
});

describe('segmentarGenerico — reutiliza tieneEncabezadoArticulo real, no un criterio propio', () => {
  it('acepta formato CPP (".-")', () => {
    const texto = 'ARTICULO 1.- Primer artículo real.\nARTICULO 2.- Segundo artículo real.';
    const chunks = segmentarGenerico(texto);
    const aceptados = chunks.filter((c) => c.aceptado);
    expect(aceptados.map((c) => c.numArticulo)).toEqual(['1', '2']);
  });

  it('acepta formato Civil (". ")', () => {
    const texto = 'Artículo 1. La ley es una declaración de la voluntad soberana.\nArtículo 2. Otro texto real.';
    const chunks = segmentarGenerico(texto);
    const aceptados = chunks.filter((c) => c.aceptado);
    expect(aceptados.map((c) => c.numArticulo)).toEqual(['1', '2']);
  });

  it('acepta el formato stub sin punto ("Artículo N Derogado")', () => {
    const texto = 'Artículo 21 Derogado\nArtículo 22 Derogado';
    const chunks = segmentarGenerico(texto);
    const aceptados = chunks.filter((c) => c.aceptado);
    expect(aceptados.map((c) => c.numArticulo)).toEqual(['21', '22']);
  });

  it('rechaza una mención de paso a mitad de oración (mismo criterio que producción)', () => {
    const texto = 'Conforme al artículo 5 numeral 3 de esta ley, se aplicará la sanción.';
    const chunks = segmentarGenerico(texto);
    const aceptados = chunks.filter((c) => c.aceptado);
    expect(aceptados).toHaveLength(0);
  });

  it('marca aceptado=false para candidatos que no pasan la validación, sin descartarlos del resultado', () => {
    const texto = 'Según el artículo 9 de la ley, corresponde.';
    const chunks = segmentarGenerico(texto);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every((c) => c.aceptado === false)).toBe(true);
  });
});

describe('construirRegistro', () => {
  const opts: OpcionesCLI = {
    input: 'x.txt',
    coleccion: 'mayalex_normativos',
    materia: '01_PENAL',
    fuente: 'Ley de Prueba',
    fuenteTipo: 'codigo',
    idPrefix: 'mayalex_normativos:ley_prueba',
    instrumento: 'Decreto 1-2020',
    jurisdiccion: 'HN',
    dryRun: true,
    execute: null,
  };

  it('construye un id estable a partir del prefijo y el numero de articulo', () => {
    const r = construirRegistro({ numArticulo: '5', contenido: 'Artículo 5.- Texto.', aceptado: true }, opts);
    expect(r.id).toBe('mayalex_normativos:ley_prueba_a5');
    expect(r.materia).toBe('01_PENAL');
    expect(r.jurisdiccion).toBe('HN');
    expect(r.es_norma_vigente).toBe(true);
    expect(r.metadata.verificado).toBe(false);
    expect(typeof r.metadata.hash_texto_sha256).toBe('string');
  });

  it('usa --instrumento en metadata cuando se provee, o cae a --fuente si no', () => {
    const r1 = construirRegistro({ numArticulo: '1', contenido: 'x', aceptado: true }, opts);
    expect(r1.metadata.instrumento).toBe('Decreto 1-2020');
    const sinInstrumento = { ...opts, instrumento: undefined };
    const r2 = construirRegistro({ numArticulo: '1', contenido: 'x', aceptado: true }, sinInstrumento);
    expect(r2.metadata.instrumento).toBe('Ley de Prueba');
  });
});

describe('fallarDuro', () => {
  it('llama a process.exit(1) tras registrar el motivo', () => {
    expect(() => fallarDuro('motivo de prueba')).toThrow('process.exit(1)');
    expect(console.error).toHaveBeenCalled();
  });
});
