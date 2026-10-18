import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parsearArgs,
  segmentarGenerico,
  construirRegistro,
  fallarDuro,
  precedidoPorComillaDeSustituto,
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

  it('--reject-quoted-heading es opt-in (default false) y se mapea a OpcionesCLI', () => {
    expect(parsearArgs(argsBase).rejectQuotedSubstituteHeading).toBe(false);
    expect(parsearArgs([...argsBase, '--reject-quoted-heading']).rejectQuotedSubstituteHeading).toBe(true);
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
// mano (ver cabecera de ingestar-ley.ts). Comercio y Notariado (dry-run)
// reutilizan segmentarGenerico. Este allowlist documenta esos consumidores
// autorizados -- no es un ejercicio de la lógica afinada de Civil/CPP.
// ─────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────
// Propiedad D.82-2004 PRIORITY 2 — Art.2 quoted substitute inside Art.140.
// The generic extractor accepted «ARTÍCULO 2.- El monto del impuesto…»
// (Ley de Impuesto de Tradición, Decreto 76/1957) as a second Propiedad
// Art.2. Opt-in rejectQuotedSubstituteHeading; default false so other
// corpora are unchanged.
// ─────────────────────────────────────────────────────────────────────────
const FIXTURE_PROPIEDAD_ART2 =
  'ARTÍCULO 2.- Las disposiciones de esta Ley comprenden la\n' +
  'propiedad mueble, inmueble, mercantil, intelectual, derechos reales y\n' +
  'otros derechos con el propósito de hacer expedito.\n\n' +
  'ARTÍCULO 140.- Reformar el Artículo 2 de la Ley de Impuesto de\n' +
  'Tradición de Bienes Inmuebles contenida en el Decreto No. 76 del 9 de\n' +
  'abril de 1957, el que deberá leerse así:\n' +
  '«ARTÍCULO 2.- El monto del impuesto de tradición de bienes\n' +
  'inmuebles será de uno y medio por ciento (1,5%) del valor de la\n' +
  'transacción. Estos actos o contratos quedarán exentos del pago de\n' +
  'impuestos y de la tasa de registro.\n\n' +
  'ARTÍCULO 141.- La presente Ley deroga el Artículo 6 de la Ley de\n' +
  'Papel Sellado y Timbres.';

describe('segmentarGenerico — rejectQuotedSubstituteHeading (Propiedad D.82-2004 Art.2)', () => {
  it('acepta el Art.2 real de Propiedad: “Las disposiciones de esta Ley…”', () => {
    const aceptados = segmentarGenerico(FIXTURE_PROPIEDAD_ART2, {
      rejectQuotedSubstituteHeading: true,
    }).filter((c) => c.aceptado);
    const art2 = aceptados.filter((c) => c.numArticulo === '2');
    expect(art2).toHaveLength(1);
    expect(art2[0]?.contenido).toContain('Las disposiciones de esta Ley');
    expect(art2[0]?.contenido).not.toContain('El monto del impuesto de tradición');
  });

  it('rechaza el Art.2 citado con « tras el marco de reforma de Art.140', () => {
    const chunks = segmentarGenerico(FIXTURE_PROPIEDAD_ART2, {
      rejectQuotedSubstituteHeading: true,
    });
    const quoted = chunks.find(
      (c) => c.numArticulo === '2' && c.contenido.includes('El monto del impuesto'),
    );
    expect(quoted?.aceptado).toBe(false);
    const aceptados = chunks.filter((c) => c.aceptado);
    expect(aceptados.map((c) => c.numArticulo)).toEqual(['2', '140', '141']);
    const art140 = aceptados.find((c) => c.numArticulo === '140');
    expect(art140?.contenido).toContain('deberá leerse así');
    expect(art140?.contenido).toContain('«ARTÍCULO 2.- El monto del impuesto');
  });

  it('sigue rechazando la mención a mitad de oración “Reformar el Artículo 2 de la Ley…”', () => {
    const texto = 'ARTÍCULO 140.- Reformar el Artículo 2 de la Ley de Impuesto de Tradición de Bienes Inmuebles.';
    const chunks = segmentarGenerico(texto, { rejectQuotedSubstituteHeading: true });
    const aceptados = chunks.filter((c) => c.aceptado);
    expect(aceptados.map((c) => c.numArticulo)).toEqual(['140']);
    const mencion = chunks.filter((c) => c.numArticulo === '2');
    expect(mencion.length).toBeGreaterThan(0);
    expect(mencion.every((c) => c.aceptado === false)).toBe(true);
  });

  it('default false no cambia el comportamiento: el Art.2 citado con « sigue aceptándose (otros corpus intactos)', () => {
    const sinFlag = segmentarGenerico(FIXTURE_PROPIEDAD_ART2).filter((c) => c.aceptado);
    const conFalse = segmentarGenerico(FIXTURE_PROPIEDAD_ART2, {
      rejectQuotedSubstituteHeading: false,
    }).filter((c) => c.aceptado);
    expect(sinFlag.map((c) => c.numArticulo)).toEqual(conFalse.map((c) => c.numArticulo));
    expect(sinFlag.filter((c) => c.numArticulo === '2')).toHaveLength(2);
    expect(sinFlag.find((c) => c.contenido.includes('El monto del impuesto'))?.aceptado).toBe(true);
  });

  it('« basta para rechazar; " y “ solo con marco de reforma (Art.49 OCR U+201C no es cita)', () => {
    const asciiConMarco =
      'el que deberá leerse así:\n"ARTÍCULO 7.- Cuerpo citado con comilla ASCII.\nARTÍCULO 8.- Encabezado real.';
    const tipograficaConMarco =
      'Reformar el Artículo 7 de la Ley X, el que deberá leerse así:\n\u201CARTÍCULO 7.- Cuerpo citado.\nARTÍCULO 8.- Encabezado real.';
    for (const texto of [asciiConMarco, tipograficaConMarco]) {
      const aceptados = segmentarGenerico(texto, { rejectQuotedSubstituteHeading: true }).filter(
        (c) => c.aceptado,
      );
      expect(aceptados.map((c) => c.numArticulo)).toEqual(['8']);
    }
    // Propiedad Art.49: line-start U+201C is an OCR artifact, not a substitute quote.
    const art49Ocr = 'aceptado.\n\u201CARTÍCULO 49.- En las zonas catastradas donde el registro opere.\nARTÍCULO 50.- Siguiente.';
    const aceptados49 = segmentarGenerico(art49Ocr, { rejectQuotedSubstituteHeading: true }).filter(
      (c) => c.aceptado,
    );
    expect(aceptados49.map((c) => c.numArticulo)).toEqual(['49', '50']);
  });

  it('ignora whitespace entre la comilla de apertura y el match', () => {
    const texto =
      'ARTÍCULO 1.- Primero.\n« \nARTÍCULO 2.- El monto del impuesto citado.\nARTÍCULO 3.- Tercero.';
    const aceptados = segmentarGenerico(texto, { rejectQuotedSubstituteHeading: true }).filter(
      (c) => c.aceptado,
    );
    expect(aceptados.map((c) => c.numArticulo)).toEqual(['1', '3']);
  });
});

describe('precedidoPorComillaDeSustituto', () => {
  it('« es suficiente; " / “ requieren marco de reforma; no inventa positivos', () => {
    expect(precedidoPorComillaDeSustituto('«ARTÍCULO', 1)).toBe(true);
    expect(precedidoPorComillaDeSustituto('« \nARTÍCULO', 3)).toBe(true);
    expect(precedidoPorComillaDeSustituto('"ARTÍCULO', 1)).toBe(false);
    expect(precedidoPorComillaDeSustituto('\u201CARTÍCULO', 1)).toBe(false);
    const asciiConMarco = 'deberá leerse así:\n"ARTÍCULO';
    expect(precedidoPorComillaDeSustituto(asciiConMarco, asciiConMarco.indexOf('ARTÍCULO'))).toBe(true);
    expect(precedidoPorComillaDeSustituto('ARTÍCULO', 0)).toBe(false);
    expect(precedidoPorComillaDeSustituto('. ARTÍCULO', 2)).toBe(false);
  });
});

// Art.108: combined two-column OCR dropped the heading; page-14 re-OCR recovered
// it. Use recovered text — do not invent. If the heading is still absent, do not
// synthesize ARTÍCULO 108.
const ART108_FROM_PAGE14_REOCR =
  'ARTÍCULO 108.- Los planos de lotificación y urbanización de los\n' +
  'asentamientos humanos regularizados por el Instituto de la Propiedad\n' +
  '(IP) serán remitidos por éste a la corporación municipal correspondiente\n' +
  'para que gratuitamente sezn incorporados en los catastros municipales,\n' +
  'planes reguladores y mapas de zonificación,\n\n' +
  'Los mismos tendrán la consideración de planos municipales\n' +
  'aprobados.\n';

describe('segmentarGenerico — Art.108 recovered from page-14 re-OCR (technical, not invented)', () => {
  it('acepta el Art.108 recuperado (planos de lotificación…) entre 107 y 109', () => {
    const texto =
      'ARTÍCULO 107.- Para resolver cualquier disputa entre los pobladores.\n\n' +
      ART108_FROM_PAGE14_REOCR +
      '\nARTÍCULO 109.- Los planos que prepare el Instituto de la Propiedad.';
    const aceptados = segmentarGenerico(texto, { rejectQuotedSubstituteHeading: true }).filter(
      (c) => c.aceptado,
    );
    expect(aceptados.map((c) => c.numArticulo)).toEqual(['107', '108', '109']);
    const art108 = aceptados.find((c) => c.numArticulo === '108');
    expect(art108?.contenido).toContain('Los planos de lotificación y urbanización');
    expect(art108?.contenido).toContain('sezn incorporados'); // recovered OCR, not corrected
  });

  it('no inventa un Art.108 cuando el OCR no trae la etiqueta', () => {
    const ocrGap =
      'ARTÍCULO 107.- Para resolver cualquier disputa entre los pobladores.\n' +
      '(IP) serán remitidos por éste a la corporación municipal correspondiente.\n' +
      'ARTÍCULO 109.- Los planos que prepare el Instituto de la Propiedad.';
    const aceptados = segmentarGenerico(ocrGap, { rejectQuotedSubstituteHeading: true }).filter(
      (c) => c.aceptado,
    );
    expect(aceptados.map((c) => c.numArticulo)).toEqual(['107', '109']);
    expect(aceptados.some((c) => c.numArticulo === '108')).toBe(false);
    expect(ocrGap).not.toMatch(/art[ií]culo\s*108/i);
  });
});

describe('alcance del fix -- no toca otras fuentes', () => {
  it('segmentarGenerico solo la consumen scripts de ingesta autorizados', async () => {
    const { execFileSync } = await import('node:child_process');
    const salida = execFileSync(
      'git',
      ['grep', '-l', 'segmentarGenerico', '--', 'scripts/'],
      { encoding: 'utf8', cwd: process.cwd() },
    ).trim();
    const archivos = salida.split('\n').map((f) => f.trim()).sort();
    expect(archivos).toEqual([
      'scripts/ingesta-comercio.ts',
      'scripts/ingesta-notariado.ts',
      'scripts/ingestar-ley.ts',
    ]);
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
    expect(typeof r.metadata.hash_texto_sha256).toBe('string');
  });

  // ADR-001 (enmienda Control Plane, P1/HIGH): una extracción exitosa nunca
  // implica VIGENTE. Antes de este fix, es_norma_vigente:true era el default
  // hardcodeado -- este test es la regresión que lo bloquea hacia adelante.
  it('FAIL-CLOSED: nunca marca es_norma_vigente=true sin evidencia jurídica, y deja el estado real explícito en metadata', () => {
    const r = construirRegistro({ numArticulo: '5', contenido: 'Artículo 5.- Texto.', aceptado: true }, opts);
    expect(r.es_norma_vigente).toBe(false);
    expect(r.metadata.verificado).toBe(false);
    expect(r.metadata.fecha_verificacion).toBeNull();
    expect(r.metadata.vigencia_state).toBe('NO_VERIFICADO');
  });

  it('expone content_sha256 como alias del hash de contenido (Canonical Ingestion Contract) sin eliminar el nombre legacy', () => {
    const r = construirRegistro({ numArticulo: '5', contenido: 'Artículo 5.- Texto.', aceptado: true }, opts);
    expect(r.metadata.content_sha256).toBe(r.metadata.hash_texto_sha256);
    expect(typeof r.metadata.content_sha256).toBe('string');
    expect((r.metadata.content_sha256 as string).length).toBe(64); // sha256 hex
  });

  it('el hash de contenido es determinístico: mismo texto -> mismo hash en corridas repetidas', () => {
    const r1 = construirRegistro({ numArticulo: '9', contenido: 'Mismo texto exacto.', aceptado: true }, opts);
    const r2 = construirRegistro({ numArticulo: '9', contenido: 'Mismo texto exacto.', aceptado: true }, opts);
    expect(r1.id).toBe(r2.id);
    expect(r1.metadata.content_sha256).toBe(r2.metadata.content_sha256);
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
