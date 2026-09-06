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

// ─────────────────────────────────────────────────────────────────────────
// Post-mortem 2026-09-05 -- Código de Comercio: ~62/1674 filas llegaron a
// producción con contenido truncado antes de detectarse. Causa raíz: el
// límite de cada artículo se fijaba en el índice del SIGUIENTE match crudo
// de "artículo N", sin importar si ese match terminaba siendo un
// encabezado real o una cita cruzada dentro del cuerpo del propio
// artículo. Ver comentarios en segmentarGenerico (hallazgos 1, 2 y 3).
// ─────────────────────────────────────────────────────────────────────────
describe('segmentarGenerico — no trunca un artículo real por una cita cruzada en su propio cuerpo', () => {
  it('conserva el resto del artículo cuando termina citando OTRO artículo (caso real: Art.65 del Código de Comercio)', () => {
    // Reproduce la forma exacta del bug real: Art.65 cita a los artículos
    // 41-43 justo antes de que empiece el encabezado de Art.66 -- antes
    // del fix, Art.65 quedaba truncado en "...Sociedad en Comandita los".
    const texto =
      'Articulo 65\n\nSon aplicables a la Sociedad en Comandita los artículos 41 a 43.\n\n' +
      'Articulo 66\n\nSociedad de responsabilidad limitada es la que existe.';
    const chunks = segmentarGenerico(texto, { exigirOrtografiaSinTilde: true });
    const art65 = chunks.find((c) => c.numArticulo === '65' && c.aceptado);
    expect(art65?.contenido).toContain('los artículos 41 a 43.');
    expect(art65?.contenido).not.toMatch(/Comandita los$/);
  });

  it('conserva el resto del artículo cuando cita a un artículo ANTERIOR ya usado (caso real: Art.33 cita al Art.31)', () => {
    // El caso más difícil: la cita ("Artículo 31.") reutiliza un número
    // que YA tiene su propio encabezado real más arriba -- sin el fix,
    // Art.33 quedaba truncado en "...se estará a lo dispuesto por el", y
    // la cita fantasma no dejaba rastro en ningún lado (ni en Art.33 ni
    // como fila propia).
    const texto =
      'Articulo 31\n\nLa repartición de utilidades reales.\n\n' +
      'Articulo 33\n\nLas cantidades indebidamente pagadas se estará a lo dispuesto por el Artículo 31.\n\n' +
      'Articulo 34\n\nEl embargo practicado por acreedores.';
    const chunks = segmentarGenerico(texto, { exigirOrtografiaSinTilde: true });
    const art33 = chunks.find((c) => c.numArticulo === '33' && c.aceptado);
    expect(art33?.contenido).toContain('dispuesto por el Artículo 31.');
    const art31 = chunks.filter((c) => c.numArticulo === '31' && c.aceptado);
    expect(art31).toHaveLength(1); // la cita NO crea un segundo "31" real
  });

  it('no crea un artículo fantasma cuando una cita de cierre queda pegada al siguiente encabezado real', () => {
    // "artículo 29." no deja ningún cuerpo propio antes de "Articulo 128"
    // -- antes del fix, esto se aceptaba como un "29" independiente
    // (cuerpo vacío) Y truncaba el artículo que lo contenía.
    const texto =
      'Articulo 29\n\nNo producirán ningún efecto legal las estipulaciones reales.\n\n' +
      'Articulo 127\n\nDerechos especiales, observándose siempre lo dispuesto en el\nartículo 29.\n\n' +
      'Articulo 128\n\nLa exhibición material de los títulos.';
    const chunks = segmentarGenerico(texto, { exigirOrtografiaSinTilde: true });
    const ocurrencias29 = chunks.filter((c) => c.numArticulo === '29' && c.aceptado);
    expect(ocurrencias29).toHaveLength(1); // solo el Art.29 real, sin fantasma
    const art127 = chunks.find((c) => c.numArticulo === '127' && c.aceptado);
    expect(art127?.contenido).toContain('el\nartículo 29.');
  });

  it('no crea un artículo fantasma cuando la cita cierra oración justo antes del siguiente encabezado (mayúscula coincidente)', () => {
    // El caso de fondo (hallazgo 3): "artículo 43. Ni la escritura..." pasa
    // el heurístico de tieneEncabezadoArticulo porque "Ni" empieza con
    // mayúscula como cualquier oración nueva -- sin `exigirOrtografiaSinTilde`
    // esto se aceptaba como un "43" propio, robándole contenido real a
    // Art.76 (el artículo que en verdad contiene esa cita).
    const texto =
      'Articulo 43\n\nLos socios no pueden ceder sus derechos reales.\n\n' +
      'Articulo 76\n\nEn los aumentos de capital, en los casos y con los requisitos que señala el\n' +
      'artículo 43. Ni la escritura social ni la asamblea pueden privar a los socios.\n\n' +
      'Articulo 77\n\nLa sociedad llevará un libro especial.';
    const chunks = segmentarGenerico(texto, { exigirOrtografiaSinTilde: true });
    const ocurrencias43 = chunks.filter((c) => c.numArticulo === '43' && c.aceptado);
    expect(ocurrencias43).toHaveLength(1);
    const art76 = chunks.find((c) => c.numArticulo === '76' && c.aceptado);
    expect(art76?.contenido).toContain('Ni la escritura social ni la asamblea');
  });

  it('exigirOrtografiaSinTilde es opt-in: sin la opción, una fuente que use "Artículo" (con tilde) para sus encabezados reales sigue funcionando igual que antes', () => {
    // Ver describe de arriba: "acepta el formato stub sin punto" ya
    // ejercita esto sin la opción. Esta prueba lo deja explícito: la
    // MISMA fuente sintética con tildes deja de aceptarse si una fuente
    // *distinta* (como Comercio) activa la opción -- por eso es opt-in,
    // no el default.
    const texto = 'Artículo 21 Derogado\nArtículo 22 Derogado';
    const sinOpcion = segmentarGenerico(texto).filter((c) => c.aceptado);
    const conOpcion = segmentarGenerico(texto, { exigirOrtografiaSinTilde: true }).filter((c) => c.aceptado);
    expect(sinOpcion.map((c) => c.numArticulo)).toEqual(['21', '22']);
    expect(conOpcion).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Regresión Civil/Notariado: ninguno de los dos usa segmentarGenerico.
// ingesta-civil.ts e ingesta-cpp.ts tienen su propia segmentación afinada a
// mano (ver cabecera de ingestar-ley.ts); el Código de Comercio 2005/2012
// de Notariado se ingirió con scripts ad-hoc fuera de este archivo. Este
// fix no puede regresionarlos porque no comparten código con ellos -- se
// deja esta prueba como documentación explícita de ese hecho, no como
// ejercicio de su lógica (que vive en otros archivos).
// ─────────────────────────────────────────────────────────────────────────
describe('alcance del fix -- no toca otras fuentes', () => {
  it('segmentarGenerico es consumida únicamente por ingesta-comercio.ts en este repo', async () => {
    const { execFileSync } = await import('node:child_process');
    const salida = execFileSync(
      'git',
      ['grep', '-l', 'segmentarGenerico', '--', 'scripts/'],
      { encoding: 'utf8', cwd: process.cwd() },
    ).trim();
    const archivos = salida.split('\n').map((f) => f.trim()).sort();
    expect(archivos).toEqual(['scripts/ingesta-comercio.ts', 'scripts/ingestar-ley.ts']);
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
