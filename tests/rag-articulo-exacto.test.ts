import { describe, it, expect } from 'vitest';
import {
  detectarArticuloExacto,
  detectarMateriaDesdeTexto,
  detectarInstrumentoDesdeTexto,
  identidadDocumentalCoincide,
  resolverArticuloExacto,
  tieneEncabezadoArticulo,
  tieneIdentidadSinEncabezado,
  type FilaExactaDB,
  type InstrumentoNormalizado,
} from '@/lib/rag/search';

/**
 * P0-2B — recuperación determinista por artículo exacto.
 * Causa raíz real del fallo original: HF_API_TOKEN ausente en Preview
 * hacía fallar el embedding antes de siquiera llamar a Supabase, y
 * buscarRAG degradaba en silencio a fragmentos:[] -- el chat seguia
 * respondiendo, pero sin contexto del corpus ni citas.
 *
 * WAR ROOM (hotfix/production-rag-final-gate) -- hallazgo real contra
 * produccion: existen 9 filas con num_articulo='173' bajo materia
 * 01_PENAL, ninguna de las de Codigo Procesal Penal empieza en el
 * encabezado ("ARTICULO 173.-"), y la unica que si lo tiene esta
 * contaminada con artefactos de anonimizacion ([Cliente_Anonimo_2]).
 * Estas pruebas cubren el filtro de encabezado y la abstencion
 * cuando ningun candidato es citable de forma segura.
 *
 * HOTFIX FINAL -- unico bloqueo antes del deploy: `materia` es
 * demasiado ancha (Codigo Penal y Codigo Procesal Penal comparten
 * 01_PENAL), asi que "Articulo 173 del Codigo Penal" podia devolver el
 * registro del CPP. Estas pruebas cubren la identidad estricta de
 * instrumento: solo se acepta un candidato cuya fuente/metadata REAL
 * confirme el instrumento pedido -- nunca por materia, numero de
 * articulo, fuente_tipo o vigencia solamente.
 */

describe('detectarArticuloExacto', () => {
  it('detecta el número sin instrumento explícito', () => {
    expect(detectarArticuloExacto('¿Qué dice el artículo 173?')).toEqual({
      numero: '173',
      materiaDetectada: null,
      instrumento: null,
    });
  });

  it('detecta materia e instrumento Penal por palabra clave', () => {
    expect(detectarArticuloExacto('artículo 173 del Código Procesal Penal')).toEqual({
      numero: '173',
      materiaDetectada: '01_PENAL',
      instrumento: 'CODIGO_PROCESAL_PENAL',
    });
    expect(detectarArticuloExacto('Art. 22 CPP')).toEqual({
      numero: '22',
      materiaDetectada: '01_PENAL',
      instrumento: 'CODIGO_PROCESAL_PENAL',
    });
  });

  it('detecta materia e instrumento Civil por palabra clave', () => {
    expect(detectarArticuloExacto('art. 173 CPC')).toEqual({
      numero: '173',
      materiaDetectada: '02_CIVIL',
      instrumento: 'CODIGO_PROCESAL_CIVIL',
    });
    expect(detectarArticuloExacto('artículo 1 del Código Procesal Civil')).toEqual({
      numero: '1',
      materiaDetectada: '02_CIVIL',
      instrumento: 'CODIGO_PROCESAL_CIVIL',
    });
  });

  it('sin número de artículo → null (no dispara la ruta exacta)', () => {
    expect(detectarArticuloExacto('Explica las medidas cautelares en general')).toBeNull();
    expect(detectarArticuloExacto('¿Qué es el Código Procesal Penal?')).toBeNull();
  });

  it('variantes de escritura del número', () => {
    expect(detectarArticuloExacto('Articulo 9999')?.numero).toBe('9999');
    expect(detectarArticuloExacto('art 5')?.numero).toBe('5');
    expect(detectarArticuloExacto('ARTÍCULO   173')?.numero).toBe('173');
  });
});

describe('detectarMateriaDesdeTexto — reutilizada por la ruta semántica (Tarea 4)', () => {
  it('detecta penal sin necesidad de número de artículo', () => {
    expect(detectarMateriaDesdeTexto(
      'Según el corpus jurídico hondureño, explica las medidas cautelares personales aplicables en el proceso penal.'
    )).toBe('01_PENAL');
  });

  it('detecta civil sin número de artículo', () => {
    expect(detectarMateriaDesdeTexto('¿Qué establece el Código Procesal Civil sobre las medidas cautelares?')).toBe('02_CIVIL');
  });

  it('sin mención de materia → null', () => {
    expect(detectarMateriaDesdeTexto('¿Cuáles son los plazos de apelación?')).toBeNull();
  });
});

describe('detectarInstrumentoDesdeTexto — identidad estricta (HOTFIX FINAL)', () => {
  it('distingue Código Procesal Penal de Código Penal aunque ambos contengan "penal"', () => {
    expect(detectarInstrumentoDesdeTexto('artículo 173 del Código Procesal Penal')).toBe('CODIGO_PROCESAL_PENAL');
    expect(detectarInstrumentoDesdeTexto('artículo 173 del Código Penal')).toBe('CODIGO_PENAL');
    expect(detectarInstrumentoDesdeTexto('CPP artículo 173')).toBe('CODIGO_PROCESAL_PENAL');
  });

  it('distingue Código Procesal Civil de Código Civil', () => {
    expect(detectarInstrumentoDesdeTexto('artículo 5 del Código Procesal Civil')).toBe('CODIGO_PROCESAL_CIVIL');
    expect(detectarInstrumentoDesdeTexto('artículo 5 del Código Civil')).toBe('CODIGO_CIVIL');
    expect(detectarInstrumentoDesdeTexto('CPC artículo 5')).toBe('CODIGO_PROCESAL_CIVIL');
  });

  it('detecta Trabajo, Familia y Notariado', () => {
    expect(detectarInstrumentoDesdeTexto('artículo 10 del Código de Trabajo')).toBe('CODIGO_TRABAJO');
    expect(detectarInstrumentoDesdeTexto('artículo 10 del Código de Familia')).toBe('CODIGO_FAMILIA');
    expect(detectarInstrumentoDesdeTexto('artículo 10 del Código del Notariado')).toBe('CODIGO_NOTARIADO');
  });

  it('sin instrumento explícito → null', () => {
    expect(detectarInstrumentoDesdeTexto('¿Qué dice el artículo 173?')).toBeNull();
    expect(detectarInstrumentoDesdeTexto('explícame las medidas cautelares')).toBeNull();
  });
});

describe('identidadDocumentalCoincide', () => {
  const filaCPP: FilaExactaDB = {
    id: 'cpp', contenido: 'ARTICULO 173.- texto', num_articulo: '173',
    fuente: 'Código Procesal Penal de Honduras (Decreto 9-99-E)',
    fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL',
  };
  const filaCP: FilaExactaDB = {
    id: 'cp', contenido: 'ARTICULO 173.- texto', num_articulo: '173',
    fuente: 'Codigo Penal',
    fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL',
  };
  const filaSinFuente: FilaExactaDB = {
    id: 'sinfuente', contenido: 'ARTICULO 173.- texto', num_articulo: '173',
    fuente: null as unknown as string,
    fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL',
  };

  it('confirma CPP solo para la fila cuya fuente es realmente CPP', () => {
    expect(identidadDocumentalCoincide(filaCPP, 'CODIGO_PROCESAL_PENAL')).toBe(true);
    expect(identidadDocumentalCoincide(filaCP, 'CODIGO_PROCESAL_PENAL')).toBe(false);
  });

  it('confirma Código Penal solo para la fila cuya fuente es realmente Código Penal', () => {
    expect(identidadDocumentalCoincide(filaCP, 'CODIGO_PENAL')).toBe(true);
    expect(identidadDocumentalCoincide(filaCPP, 'CODIGO_PENAL')).toBe(false);
  });

  it('una fila sin fuente ni metadata nunca coincide con ningún instrumento', () => {
    expect(identidadDocumentalCoincide(filaSinFuente, 'CODIGO_PROCESAL_PENAL')).toBe(false);
    expect(identidadDocumentalCoincide(filaSinFuente, 'CODIGO_PENAL')).toBe(false);
  });

  it('acepta la identidad vía metadata.documento_origen cuando fuente está ausente', () => {
    const filaConMetadata: FilaExactaDB = {
      ...filaSinFuente,
      metadata: { documento_origen: 'Codigo Procesal penal de Honduras.pdf' },
    };
    expect(identidadDocumentalCoincide(filaConMetadata, 'CODIGO_PROCESAL_PENAL')).toBe(true);
  });
});

describe('tieneEncabezadoArticulo', () => {
  it('reconoce el encabezado real, con o sin tilde (formato CPP/CEDIJ ".-")', () => {
    expect(tieneEncabezadoArticulo('...preciso: 1)... ARTICULO 173.- Medidas cautelares aplicables...', '173')).toBe(true);
    expect(tieneEncabezadoArticulo('ARTÍCULO 173.- Medidas cautelares aplicables', '173')).toBe(true);
  });

  it('reconoce el formato Código Civil (Poder Judicial, punto + espacio, sin guion)', () => {
    expect(tieneEncabezadoArticulo('Artículo 1. La ley es una declaración de la voluntad soberana...', '1')).toBe(true);
    expect(tieneEncabezadoArticulo('Artículo 234. Los derechos concedidos a los padres...', '234')).toBe(true);
  });

  it('reconoce el formato stub del Civil (sin punto, Arts.21-36 sintetizados)', () => {
    expect(tieneEncabezadoArticulo('Artículo 126 Derogado', '126')).toBe(true);
    expect(tieneEncabezadoArticulo('Artículo 21. Derogado', '21')).toBe(true);
  });

  it('rechaza una mera mención de paso (jurisprudencia citando el número) — CPP y Civil', () => {
    expect(tieneEncabezadoArticulo('la defensa del imputado en el artículo 173 numeral 3 del Código Penal, encuadrando la conducta...', '173')).toBe(false);
    expect(tieneEncabezadoArticulo('según el artículo 1 del Código Civil, la ley es obligatoria...', '1')).toBe(false);
  });

  it('rechaza un fragmento mal segmentado que no contiene el encabezado en absoluto', () => {
    expect(tieneEncabezadoArticulo('www.poderjudicial.gob.hn [Página 59] Las medidas alternativas de la prisión preventiva no podrán imponerse...', '173')).toBe(false);
  });

  it('no confunde el número de otro artículo (ej. Art. 1730 no es Art. 173)', () => {
    expect(tieneEncabezadoArticulo('ARTICULO 1730.- Otra cosa completamente distinta', '173')).toBe(false);
    expect(tieneEncabezadoArticulo('Artículo 2130. Otro artículo civil distinto', '213')).toBe(false);
  });
});

function fila(overrides: Partial<FilaExactaDB>): FilaExactaDB {
  return {
    id: 'x', contenido: 'ARTICULO 173.- Texto del articulo', num_articulo: '173', fuente: 'TSC',
    fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL',
    ...overrides,
  };
}

const CPP: InstrumentoNormalizado = 'CODIGO_PROCESAL_PENAL';
const CP: InstrumentoNormalizado = 'CODIGO_PENAL';

const filaCPPLimpia = fila({
  id: 'cpp-limpia',
  fuente: 'Código Procesal Penal de Honduras (Decreto 9-99-E)',
  contenido: 'ARTICULO 173.- Medidas Cautelares Aplicables. Texto real del CPP.',
});

const filaCPLimpia = fila({
  id: 'cp-limpia',
  fuente: 'Codigo Penal',
  contenido: 'ARTICULO 173.- Clonación. Texto real del Código Penal.',
});

describe('resolverArticuloExacto', () => {
  it('sin filas → no encontrado, no ambiguo', () => {
    expect(resolverArticuloExacto([], '173', CPP)).toEqual({ fragmentos: [], ambiguo: false });
  });

  it('HOTFIX FINAL — sin instrumento solicitado, se abstiene aunque haya candidatos limpios', () => {
    const r = resolverArticuloExacto([filaCPPLimpia], '173', null);
    expect(r.fragmentos).toHaveLength(0);
    expect(r.ambiguo).toBe(false);
  });

  it('una sola fila con encabezado real e identidad confirmada → se usa directo, con hash y relevancia 1', () => {
    const r = resolverArticuloExacto([filaCPPLimpia], '173', CPP);
    expect(r.ambiguo).toBe(false);
    expect(r.fragmentos).toHaveLength(1);
    expect(r.fragmentos[0].hash).toMatch(/^[0-9a-f]{8}$/);
    expect(r.fragmentos[0].relevancia).toBe(1);
  });

  it('dos instrumentos distintos con el mismo número → ambiguo, no cita ninguno', () => {
    const r = resolverArticuloExacto([
      fila({ materia: '01_PENAL', contenido: 'ARTICULO 173.- Texto penal' }),
      fila({ materia: '02_CIVIL', contenido: 'ARTICULO 173.- Texto civil', fuente: 'Codigo Civil' }),
    ], '173', 'CODIGO_CIVIL' as InstrumentoNormalizado);
    // El primero no coincide con CODIGO_CIVIL (fuente 'TSC' no confirma
    // ningún instrumento) así que solo queda el segundo — no ambiguo.
    expect(r.ambiguo).toBe(false);
    expect(r.fragmentos).toHaveLength(1);
    expect(r.fragmentos[0].fuente).toBe('Codigo Civil');
  });

  it('dos filas de la MISMA materia (no ambiguo por definición) → usa la primera', () => {
    const r = resolverArticuloExacto([
      fila({ materia: '01_PENAL', id: 'a', fuente: 'Código Procesal Penal de Honduras (Decreto 9-99-E)' }),
      fila({ materia: '01_PENAL', id: 'b', fuente: 'Código Procesal Penal de Honduras (Decreto 9-99-E)' }),
    ], '173', CPP);
    expect(r.ambiguo).toBe(false);
    expect(r.fragmentos).toHaveLength(1);
  });

  it('descarta filas con artefactos de anonimización sin limpiar', () => {
    const r = resolverArticuloExacto([
      fila({ contenido: 'ARTICULO 173.- [Cliente_Anónimo_6] presentó su escrito...', fuente: 'Código Procesal Penal de Honduras (Decreto 9-99-E)' }),
    ], '173', CPP);
    expect(r.fragmentos).toHaveLength(0);
    expect(r.ambiguo).toBe(false);
  });

  it('WAR ROOM: descarta fragmentos sin el encabezado real, aunque estén etiquetados con ese num_articulo', () => {
    const r = resolverArticuloExacto([
      fila({ contenido: 'www.poderjudicial.gob.hn [Página 59] Las medidas alternativas de la prisión preventiva no podrán imponerse...', fuente: 'Código Procesal Penal de Honduras (Decreto 9-99-E)' }),
    ], '173', CPP);
    expect(r.fragmentos).toHaveLength(0);
    expect(r.ambiguo).toBe(false);
  });

  it('WAR ROOM: si el único candidato con encabezado real está contaminado, no cae al fragmento mal segmentado ni al contaminado — abstención', () => {
    const r = resolverArticuloExacto([
      fila({ id: 'headerless', contenido: 'presupuestos y finalidad. Las medidas cautelares tienen como...', fuente: 'Código Procesal Penal de Honduras (Decreto 9-99-E)' }),
      fila({ id: 'contaminado', contenido: 'ARTICULO 173.- ...presentarse ante un [Cliente_Anónimo_2] o autoridad...', fuente: 'Código Procesal Penal de Honduras (Decreto 9-99-E)' }),
    ], '173', CPP);
    expect(r.fragmentos).toHaveLength(0);
    expect(r.ambiguo).toBe(false);
  });

  it('WAR ROOM: un fragmento de jurisprudencia que solo menciona el número no cuenta como encabezado (instrumento FUERA de la allowlist de Opción C)', () => {
    // NOTA (P0 2026-09-05): este caso usaba originalmente CODIGO_PENAL (CP)
    // como instrumento. Desde que CODIGO_PENAL entró a la allowlist de
    // tieneIdentidadSinEncabezado (Opción C), este escenario exacto SÍ se
    // acepta para CODIGO_PENAL específicamente -- ver el test explícito de
    // ese trade-off aceptado más abajo. Aquí se usa CPP, que no está en la
    // allowlist, para conservar la garantía original que este test verifica.
    const r = resolverArticuloExacto([
      fila({ fuente_tipo: 'codigo', contenido: 'la defensa del imputado en el artículo 173 numeral 3 del Código Procesal Penal, encuadrando la conducta...', fuente: 'Código Procesal Penal de Honduras (Decreto 9-99-E)' }),
    ], '173', CPP);
    expect(r.fragmentos).toHaveLength(0);
  });

  // ── HOTFIX FINAL — pruebas obligatorias A-D (identidad estricta) ──────────

  it('A. CPP 173 + candidato CPP → ACCEPT', () => {
    const r = resolverArticuloExacto([filaCPPLimpia], '173', CPP);
    expect(r.fragmentos).toHaveLength(1);
    expect(r.fragmentos[0].fuente).toBe('Código Procesal Penal de Honduras (Decreto 9-99-E)');
  });

  it('B. Código Penal 173 + candidato CPP (sin candidato CP limpio) → REJECT, abstención', () => {
    const r = resolverArticuloExacto([filaCPPLimpia], '173', CP);
    expect(r.fragmentos).toHaveLength(0);
    expect(r.ambiguo).toBe(false);
  });

  it('C. CPP 173 + candidato sin identidad documental (fuente null) → REJECT, abstención', () => {
    const sinIdentidad = fila({ id: 'sin-identidad', fuente: null as unknown as string });
    const r = resolverArticuloExacto([sinIdentidad], '173', CPP);
    expect(r.fragmentos).toHaveLength(0);
    expect(r.ambiguo).toBe(false);
  });

  it('D. dos instrumentos de la misma materia → selecciona solo el solicitado (no ambiguo, no confunde)', () => {
    const r = resolverArticuloExacto([filaCPPLimpia, filaCPLimpia], '173', CPP);
    expect(r.ambiguo).toBe(false);
    expect(r.fragmentos).toHaveLength(1);
    expect(r.fragmentos[0].fuente).toBe('Código Procesal Penal de Honduras (Decreto 9-99-E)');
    expect(r.fragmentos[0].contenido).toContain('Medidas Cautelares');

    const rInverso = resolverArticuloExacto([filaCPPLimpia, filaCPLimpia], '173', CP);
    expect(rInverso.ambiguo).toBe(false);
    expect(rInverso.fragmentos).toHaveLength(1);
    expect(rInverso.fragmentos[0].fuente).toBe('Codigo Penal');
    expect(rInverso.fragmentos[0].contenido).toContain('Clonación');
  });

  it('E. ningún candidato coincide con el instrumento pedido → abstención, no ambiguo', () => {
    const r = resolverArticuloExacto([filaCPLimpia], '173', 'CODIGO_PROCESAL_CIVIL' as InstrumentoNormalizado);
    expect(r.fragmentos).toHaveLength(0);
    expect(r.ambiguo).toBe(false);
  });
});

// ── REGLAMENTO_NOTARIADO — guardia anti-colisión con CODIGO_NOTARIADO ────────
//
// La fuente real del Reglamento del Código del Notariado (Resolución
// PCSJ-17-2012) es literalmente "Reglamento del Código del Notariado (...)",
// que contiene "Código del Notariado" como subcadena. Sin (a) la precedencia
// de orden en RE_INSTRUMENTO (detección de texto) y (b) el negative
// lookbehind en RE_FUENTE_POR_INSTRUMENTO.CODIGO_NOTARIADO (identidad
// documental real), una fila del Reglamento se habría confirmado como
// CODIGO_NOTARIADO -- la misma clase de colisión no determinista del bug P1
// real de esta sesión (Decreto 77-2006 vs Código del Notariado).
const REGLAMENTO: InstrumentoNormalizado = 'REGLAMENTO_NOTARIADO';
const NOTARIADO: InstrumentoNormalizado = 'CODIGO_NOTARIADO';

const filaReglamentoNotariado = fila({
  id: 'reglamento-a1',
  num_articulo: '1',
  contenido: 'ARTICULO 1.- Texto real del Reglamento.',
  fuente: 'Reglamento del Código del Notariado (Resolución PCSJ-17-2012)',
  materia: '03_NOTARIAL',
});
const filaCodigoNotariado = fila({
  id: 'notariado-a1',
  num_articulo: '1',
  contenido: 'ARTICULO 1.- Texto real del Código del Notariado.',
  fuente: 'Código del Notariado (Decreto 353-2005)',
  materia: '03_NOTARIAL',
});

describe('detectarInstrumentoDesdeTexto / identidadDocumentalCoincide — REGLAMENTO_NOTARIADO', () => {
  it('detecta REGLAMENTO_NOTARIADO cuando la consulta menciona "reglamento", no CODIGO_NOTARIADO', () => {
    expect(detectarInstrumentoDesdeTexto('artículo 1 del Reglamento del Código del Notariado')).toBe('REGLAMENTO_NOTARIADO');
    expect(detectarInstrumentoDesdeTexto('artículo 5 del reglamento notariado')).toBe('REGLAMENTO_NOTARIADO');
  });

  it('sigue detectando CODIGO_NOTARIADO cuando la consulta NO menciona "reglamento"', () => {
    expect(detectarInstrumentoDesdeTexto('artículo 1 del Código del Notariado')).toBe('CODIGO_NOTARIADO');
  });

  it('el Reglamento NO confirma identidad de CODIGO_NOTARIADO pese a contener esa frase como subcadena de su fuente', () => {
    expect(identidadDocumentalCoincide(filaReglamentoNotariado, NOTARIADO)).toBe(false);
    expect(identidadDocumentalCoincide(filaCodigoNotariado, NOTARIADO)).toBe(true);
  });

  it('el Reglamento SÍ confirma identidad de REGLAMENTO_NOTARIADO; el Código base no', () => {
    expect(identidadDocumentalCoincide(filaReglamentoNotariado, REGLAMENTO)).toBe(true);
    expect(identidadDocumentalCoincide(filaCodigoNotariado, REGLAMENTO)).toBe(false);
  });

  it('resolverArticuloExacto: pedir el Código del Notariado nunca devuelve una fila del Reglamento, aunque sea la única candidata', () => {
    const r = resolverArticuloExacto([filaReglamentoNotariado], '1', NOTARIADO);
    expect(r.fragmentos).toHaveLength(0);
    expect(r.ambiguo).toBe(false);
  });

  it('resolverArticuloExacto: con ambas filas presentes, cada instrumento resuelve a la suya sin ambigüedad ni cruce', () => {
    const rNotariado = resolverArticuloExacto([filaCodigoNotariado, filaReglamentoNotariado], '1', NOTARIADO);
    expect(rNotariado.ambiguo).toBe(false);
    expect(rNotariado.fragmentos).toHaveLength(1);
    expect(rNotariado.fragmentos[0].fuente).toBe('Código del Notariado (Decreto 353-2005)');

    const rReglamento = resolverArticuloExacto([filaCodigoNotariado, filaReglamentoNotariado], '1', REGLAMENTO);
    expect(rReglamento.ambiguo).toBe(false);
    expect(rReglamento.fragmentos).toHaveLength(1);
    expect(rReglamento.fragmentos[0].fuente).toBe('Reglamento del Código del Notariado (Resolución PCSJ-17-2012)');
  });
});

// ── CONSTITUCION y LEY_JUSTICIA_CONSTITUCIONAL — guardia anti-colisión ───────
//
// La fuente real de la Ley sobre Justicia Constitucional contiene la palabra
// "Constitucional" -- si CONSTITUCION no exigiera un límite de palabra (\b)
// justo después de "constituci[oó]n", ambos instrumentos se confundirían
// (misma raíz "constituci"). Pruebas contra las fuentes REALES de producción
// (thgrhueckkjdutjvcufp, verificado 2026-09-05): "Constitucion de la
// Republica de Honduras (Decreto 131-1982 - Consolidado TSC corte 2004)" y
// "Ley sobre Justicia Constitucional".
const CONSTITUCION: InstrumentoNormalizado = 'CONSTITUCION';
const LJC: InstrumentoNormalizado = 'LEY_JUSTICIA_CONSTITUCIONAL';

const filaConstitucion = fila({
  id: 'constitucion-a1',
  num_articulo: '1',
  contenido: 'Honduras es un Estado de derecho, soberano, constituido como república libre, democrática e independiente para asegurar a sus habitantes el goce de la justicia, la libertad, la cultura y el bienestar económico y social.',
  fuente: 'Constitucion de la Republica de Honduras (Decreto 131-1982 - Consolidado TSC corte 2004)',
  materia: '07_CONSTITUCIONAL',
});

const filaLJC = fila({
  id: 'ljc-a1',
  num_articulo: '1',
  contenido: 'OBJETO DE LA LEY. La presente ley tiene por objeto desarrollar las garantías constitucionales y las de más ámbito, mediante los procesos de amparo, hábeas corpus, hábeas data e inconstitucionalidad.',
  fuente: 'Ley sobre Justicia Constitucional',
  materia: '07_CONSTITUCIONAL',
});

describe('detectarInstrumentoDesdeTexto / identidadDocumentalCoincide — CONSTITUCION y LEY_JUSTICIA_CONSTITUCIONAL', () => {
  it('detecta CONSTITUCION sin confundirse con "Constitucional"', () => {
    expect(detectarInstrumentoDesdeTexto('artículo 1 de la Constitución de Honduras')).toBe('CONSTITUCION');
    expect(detectarInstrumentoDesdeTexto('¿qué dice la Constitución sobre el artículo 11?')).toBe('CONSTITUCION');
  });

  it('detecta LEY_JUSTICIA_CONSTITUCIONAL, no CONSTITUCION, cuando la consulta la menciona por su nombre completo', () => {
    expect(detectarInstrumentoDesdeTexto('artículo 1 de la Ley sobre Justicia Constitucional')).toBe('LEY_JUSTICIA_CONSTITUCIONAL');
    expect(detectarInstrumentoDesdeTexto('artículo 1 de la Ley de Justicia Constitucional')).toBe('LEY_JUSTICIA_CONSTITUCIONAL');
  });

  it('identidadDocumentalCoincide: cada fuente confirma solo su propio instrumento, nunca el otro', () => {
    expect(identidadDocumentalCoincide(filaConstitucion, CONSTITUCION)).toBe(true);
    expect(identidadDocumentalCoincide(filaConstitucion, LJC)).toBe(false);
    expect(identidadDocumentalCoincide(filaLJC, LJC)).toBe(true);
    expect(identidadDocumentalCoincide(filaLJC, CONSTITUCION)).toBe(false);
  });

  it('resolverArticuloExacto: con ambas filas presentes, cada instrumento resuelve a la suya sin cruce', () => {
    const rConst = resolverArticuloExacto([filaConstitucion, filaLJC], '1', CONSTITUCION);
    expect(rConst.ambiguo).toBe(false);
    expect(rConst.fragmentos).toHaveLength(1);
    expect(rConst.fragmentos[0].fuente).toBe('Constitucion de la Republica de Honduras (Decreto 131-1982 - Consolidado TSC corte 2004)');

    const rLjc = resolverArticuloExacto([filaConstitucion, filaLJC], '1', LJC);
    expect(rLjc.ambiguo).toBe(false);
    expect(rLjc.fragmentos).toHaveLength(1);
    expect(rLjc.fragmentos[0].fuente).toBe('Ley sobre Justicia Constitucional');
  });
});

// ── tieneIdentidadSinEncabezado — ruta paralela, P0 2026-09-05 ───────────────
//
// Hallazgo: el `contenido` real de Constitución, Código de Familia, Código
// del Trabajo, Código Penal, Código Procesal Civil, Código Tributario y Ley
// sobre Justicia Constitucional NUNCA contiene el literal "Artículo N." --
// arranca directo en el título/cuerpo. tieneEncabezadoArticulo por sí solo
// deja estos 7 instrumentos sin resultado en la búsqueda exacta pese a que
// el router identifique el instrumento correctamente. Opción C (sí explícito
// de Fredy, 2026-09-05): una ruta paralela, allowlisteada explícitamente a
// estos 7, que confía en `num_articulo` cuando el encabezado textual no
// aparece -- sin relajar tieneEncabezadoArticulo para el resto del corpus.
describe('tieneIdentidadSinEncabezado — ruta paralela para instrumentos sin encabezado textual (P0 2026-09-05)', () => {
  it('false para un instrumento fuera de la allowlist, aunque num_articulo coincida', () => {
    expect(tieneIdentidadSinEncabezado(filaCPPLimpia, '173', CPP)).toBe(false);
    expect(tieneIdentidadSinEncabezado(fila({ num_articulo: '1' }), '1', 'CODIGO_CIVIL' as InstrumentoNormalizado)).toBe(false);
    expect(tieneIdentidadSinEncabezado(fila({ num_articulo: '1' }), '1', NOTARIADO)).toBe(false);
    expect(tieneIdentidadSinEncabezado(fila({ num_articulo: '1' }), '1', REGLAMENTO)).toBe(false);
  });

  it('true solo si el instrumento está en la allowlist Y num_articulo coincide exactamente', () => {
    expect(tieneIdentidadSinEncabezado(fila({ num_articulo: '1' }), '1', CONSTITUCION)).toBe(true);
    expect(tieneIdentidadSinEncabezado(fila({ num_articulo: '1' }), '1', 'CODIGO_FAMILIA' as InstrumentoNormalizado)).toBe(true);
    expect(tieneIdentidadSinEncabezado(fila({ num_articulo: '1' }), '1', 'CODIGO_TRABAJO' as InstrumentoNormalizado)).toBe(true);
    expect(tieneIdentidadSinEncabezado(fila({ num_articulo: '1' }), '1', 'CODIGO_PENAL' as InstrumentoNormalizado)).toBe(true);
    expect(tieneIdentidadSinEncabezado(fila({ num_articulo: '1' }), '1', 'CODIGO_PROCESAL_CIVIL' as InstrumentoNormalizado)).toBe(true);
    expect(tieneIdentidadSinEncabezado(fila({ num_articulo: '1' }), '1', 'CODIGO_TRIBUTARIO' as InstrumentoNormalizado)).toBe(true);
    expect(tieneIdentidadSinEncabezado(fila({ num_articulo: '1' }), '1', LJC)).toBe(true);
  });

  it('false si num_articulo NO coincide exactamente, aunque el instrumento esté en la allowlist', () => {
    expect(tieneIdentidadSinEncabezado(fila({ num_articulo: '2' }), '1', CONSTITUCION)).toBe(false);
    expect(tieneIdentidadSinEncabezado(fila({ num_articulo: null }), '1', CONSTITUCION)).toBe(false);
  });

  it('TRADE-OFF ACEPTADO de Opción C: para un instrumento allowlisteado, un fragmento que solo MENCIONA el número de paso (no es el artículo real) también pasa si num_articulo coincide -- a diferencia de un instrumento fuera de la allowlist (ver test equivalente con CPP arriba), donde tieneEncabezadoArticulo sigue rechazándolo', () => {
    const r = resolverArticuloExacto([
      fila({ fuente_tipo: 'codigo', num_articulo: '173', contenido: 'la defensa del imputado en el artículo 173 numeral 3 del Código Penal, encuadrando la conducta...', fuente: 'Codigo Penal' }),
    ], '173', 'CODIGO_PENAL' as InstrumentoNormalizado);
    // Esto es intencional, no un bug: Fredy autorizó explícitamente confiar
    // en num_articulo + fuente para estos 7 instrumentos porque su
    // `contenido` real nunca trae el encabezado textual de todos modos --
    // este mismo criterio no discrimina "mención de paso" de "texto real
    // del artículo" para ESTOS instrumentos específicamente. La identidad
    // documental (fuente) y la ausencia de artefactos de anonimización
    // siguen aplicándose sin excepción.
    expect(r.fragmentos).toHaveLength(1);
  });
});

// ── resolverArticuloExacto — Art.1 real de los 7 instrumentos allowlisteados ─
//
// Contenido reproducido de forma abreviada, tal como está almacenado hoy en
// producción (thgrhueckkjdutjvcufp), para probar la ruta sin encabezado
// contra la forma REAL de los datos, no contra un fixture idealizado.
describe('resolverArticuloExacto — Art.1 real (sin encabezado textual) de los 7 instrumentos allowlisteados', () => {
  it('Constitución Art.1 resuelve pese a no tener "Artículo 1." en el contenido', () => {
    const r = resolverArticuloExacto([filaConstitucion], '1', CONSTITUCION);
    expect(r.ambiguo).toBe(false);
    expect(r.fragmentos).toHaveLength(1);
    expect(r.fragmentos[0].contenido).toContain('Honduras es un Estado de derecho');
  });

  it('Constitución Art.11 (otro artículo real, también sin encabezado) resuelve', () => {
    const filaArt11 = fila({
      id: 'constitucion-a11',
      num_articulo: '11',
      contenido: 'Toda persona tiene derecho a circular libremente, salir, entrar y permanecer en el territorio nacional.',
      fuente: 'Constitucion de la Republica de Honduras (Decreto 131-1982 - Consolidado TSC corte 2004)',
      materia: '07_CONSTITUCIONAL',
    });
    const r = resolverArticuloExacto([filaArt11], '11', CONSTITUCION);
    expect(r.ambiguo).toBe(false);
    expect(r.fragmentos).toHaveLength(1);
    expect(r.fragmentos[0].contenido).toContain('circular libremente');
  });

  it('Código Penal Art.1 resuelve pese a no tener "Artículo 1." en el contenido', () => {
    const filaPenal = fila({
      id: 'penal-a1',
      num_articulo: '1',
      contenido: 'PRINCIPIO DE LEGALIDAD. Nadie puede ser castigado por acción u omisión que en el momento de producirse no esté calificada como delito.',
      fuente: 'Codigo Penal',
      materia: '01_PENAL',
    });
    const r = resolverArticuloExacto([filaPenal], '1', 'CODIGO_PENAL' as InstrumentoNormalizado);
    expect(r.ambiguo).toBe(false);
    expect(r.fragmentos).toHaveLength(1);
    expect(r.fragmentos[0].contenido).toContain('PRINCIPIO DE LEGALIDAD');
  });

  it('Código del Trabajo Art.1 resuelve pese a no tener "Artículo 1." en el contenido', () => {
    const filaTrabajo = fila({
      id: 'trabajo-a1',
      num_articulo: '1',
      contenido: 'El presente código regula las relaciones entre el capital y el trabajo, colocándolas sobre una base de justicia social.',
      fuente: 'Codigo del Trabajo',
      materia: '05_LABORAL',
    });
    const r = resolverArticuloExacto([filaTrabajo], '1', 'CODIGO_TRABAJO' as InstrumentoNormalizado);
    expect(r.ambiguo).toBe(false);
    expect(r.fragmentos).toHaveLength(1);
    expect(r.fragmentos[0].contenido).toContain('capital y el trabajo');
  });

  it('Código de Familia Art.68 resuelve pese a no tener "Artículo 68." en el contenido', () => {
    const filaFamilia = fila({
      id: 'familia-a68',
      num_articulo: '68',
      contenido: 'Si no hubiere capitulaciones matrimoniales cada cónyuge queda dueño y dispone libremente de sus bienes.',
      fuente: 'Codigo de Familia',
      materia: '06_FAMILIA',
    });
    const r = resolverArticuloExacto([filaFamilia], '68', 'CODIGO_FAMILIA' as InstrumentoNormalizado);
    expect(r.ambiguo).toBe(false);
    expect(r.fragmentos).toHaveLength(1);
    expect(r.fragmentos[0].contenido).toContain('capitulaciones matrimoniales');
  });

  it('Código Procesal Civil Art.1 resuelve pese a no tener "Artículo 1." en el contenido', () => {
    const filaCPC = fila({
      id: 'cpc-a1',
      num_articulo: '1',
      contenido: 'DERECHO DE ACCESO A LOS JUZGADOS Y TRIBUNALES. 1. Toda persona tiene derecho a plantear pretensiones ante los tribunales.',
      fuente: 'Codigo Procesal Civil',
      materia: '02_CIVIL',
    });
    const r = resolverArticuloExacto([filaCPC], '1', 'CODIGO_PROCESAL_CIVIL' as InstrumentoNormalizado);
    expect(r.ambiguo).toBe(false);
    expect(r.fragmentos).toHaveLength(1);
    expect(r.fragmentos[0].contenido).toContain('DERECHO DE ACCESO');
  });

  it('Código Tributario Art.1 resuelve pese a no tener "Artículo 1." en el contenido', () => {
    const filaTributario = fila({
      id: 'tributario-a1',
      num_articulo: '1',
      contenido: 'ÁMBITO DE APLICACIÓN. 1) Las disposiciones de este Código establecen los principios básicos y las normas fundamentales del sistema tributario.',
      fuente: 'Codigo Tributario (Decreto 170-2016 - Consolidado SAR corte 2019)',
      materia: '04_TRIBUTARIO',
    });
    const r = resolverArticuloExacto([filaTributario], '1', 'CODIGO_TRIBUTARIO' as InstrumentoNormalizado);
    expect(r.ambiguo).toBe(false);
    expect(r.fragmentos).toHaveLength(1);
    expect(r.fragmentos[0].contenido).toContain('ÁMBITO DE APLICACIÓN');
  });

  it('Ley sobre Justicia Constitucional Art.1 resuelve pese a no tener "Artículo 1." en el contenido', () => {
    const r = resolverArticuloExacto([filaLJC], '1', LJC);
    expect(r.ambiguo).toBe(false);
    expect(r.fragmentos).toHaveLength(1);
    expect(r.fragmentos[0].contenido).toContain('OBJETO DE LA LEY');
  });
});

// ── Regresión: la ruta sin encabezado NO se extiende fuera de la allowlist ──
//
// Confirma que Opción C no reabre el bug que tieneEncabezadoArticulo existe
// para prevenir: un candidato sin encabezado real de un instrumento FUERA de
// la allowlist sigue rechazándose, y los instrumentos ya verdes (Civil, CPP,
// Notariado, Reglamento) siguen resolviendo su Art.1 exactamente igual que
// antes de este cambio.
describe('resolverArticuloExacto — regresión: instrumentos fuera de la allowlist siguen exigiendo encabezado real', () => {
  it('un candidato de CODIGO_CIVIL sin encabezado real se rechaza (CODIGO_CIVIL no está en la allowlist)', () => {
    const filaCivilSinEncabezado = fila({
      id: 'civil-sin-encabezado',
      num_articulo: '1',
      contenido: 'La ley es una declaración de la voluntad soberana que, manifestada en la forma prescrita por la Constitución, manda, prohíbe o permite.',
      fuente: 'Codigo Civil',
      materia: '02_CIVIL',
    });
    const r = resolverArticuloExacto([filaCivilSinEncabezado], '1', 'CODIGO_CIVIL' as InstrumentoNormalizado);
    expect(r.fragmentos).toHaveLength(0);
    expect(r.ambiguo).toBe(false);
  });

  it('CPP, Código del Notariado y Reglamento con encabezado real siguen resolviendo exactamente igual (sin cambios)', () => {
    const rCPP = resolverArticuloExacto([filaCPPLimpia], '173', CPP);
    expect(rCPP.fragmentos).toHaveLength(1);

    const rNotariado = resolverArticuloExacto([filaCodigoNotariado], '1', NOTARIADO);
    expect(rNotariado.fragmentos).toHaveLength(1);

    const rReglamento = resolverArticuloExacto([filaReglamentoNotariado], '1', REGLAMENTO);
    expect(rReglamento.fragmentos).toHaveLength(1);
  });
});

// ── CODIGO_COMERCIO — Decreto 73-1950 (pliego P0 2026-09-05) ────────────────
//
// A diferencia del lote V2 sin encabezado (CONSTITUCION, CODIGO_FAMILIA,
// etc.), el contenido ingerido del Código de Comercio SÍ trae el encabezado
// real ("Articulo N") -- verificado contra la segmentación real de la fuente
// (scripts/ingesta-comercio.ts, dry-run 2026-09-05: 1,720 aceptados por
// tieneEncabezadoArticulo antes de resolver duplicados). No se agrega a
// INSTRUMENTOS_SIN_ENCABEZADO_TEXTUAL -- estas pruebas confirman que la ruta
// normal (sin Opción C) basta.
const COMERCIO: InstrumentoNormalizado = 'CODIGO_COMERCIO';

const filaComercio = fila({
  id: 'mayalex_normativos:codigo_comercio_1950_a1',
  num_articulo: '1',
  contenido:
    'Articulo 1\n\nLos comerciantes, los actos de comercio y las cosas mercantiles se regirán por las\ndisposiciones de este Código y de las demás leyes mercantiles en su defecto, por\nlos usos y costumbres mercantiles y a falta de éstos, por las normas del Código\nCivil.\n\nLos usos y costumbres especiales y locales prevalecerán sobre los generales.',
  fuente: 'Codigo de Comercio (Decreto No. 73-1950, Congreso Nacional de Honduras)',
  materia: '10_LEYES_REGLAMENTOS',
});

describe('detectarInstrumentoDesdeTexto / identidadDocumentalCoincide / resolverArticuloExacto — CODIGO_COMERCIO', () => {
  it('detecta CODIGO_COMERCIO desde el texto de la consulta', () => {
    expect(detectarInstrumentoDesdeTexto('artículo 1 del Código de Comercio')).toBe('CODIGO_COMERCIO');
    expect(detectarInstrumentoDesdeTexto('¿qué dice el Código de Comercio sobre las sociedades?')).toBe('CODIGO_COMERCIO');
  });

  it('identidadDocumentalCoincide confirma solo con la fuente real del Código de Comercio', () => {
    expect(identidadDocumentalCoincide(filaComercio, COMERCIO)).toBe(true);
    expect(identidadDocumentalCoincide(filaCPLimpia, COMERCIO)).toBe(false);
    expect(identidadDocumentalCoincide(filaComercio, CP)).toBe(false);
  });

  it('resolverArticuloExacto: Art.1 real (CON encabezado textual, sin Opción C) resuelve directo', () => {
    const r = resolverArticuloExacto([filaComercio], '1', COMERCIO);
    expect(r.ambiguo).toBe(false);
    expect(r.fragmentos).toHaveLength(1);
    expect(r.fragmentos[0].contenido).toContain('Los comerciantes, los actos de comercio');
    expect(r.fragmentos[0].fuente).toBe('Codigo de Comercio (Decreto No. 73-1950, Congreso Nacional de Honduras)');
  });

  it('tieneIdentidadSinEncabezado nunca aplica a CODIGO_COMERCIO (no está en la allowlist)', () => {
    expect(tieneIdentidadSinEncabezado(fila({ num_articulo: '1' }), '1', COMERCIO)).toBe(false);
  });

  it('REGRESIÓN — Constitución, Civil, CPP, Notariado y Reglamento no se ven afectados por agregar CODIGO_COMERCIO', () => {
    expect(resolverArticuloExacto([filaConstitucion], '1', CONSTITUCION).fragmentos).toHaveLength(1);
    expect(resolverArticuloExacto([filaCPPLimpia], '173', CPP).fragmentos).toHaveLength(1);
    expect(resolverArticuloExacto([filaCodigoNotariado], '1', NOTARIADO).fragmentos).toHaveLength(1);
    expect(resolverArticuloExacto([filaReglamentoNotariado], '1', REGLAMENTO).fragmentos).toHaveLength(1);
  });
});
