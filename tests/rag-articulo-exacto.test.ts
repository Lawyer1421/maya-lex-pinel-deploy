import { describe, it, expect } from 'vitest';
import {
  detectarArticuloExacto,
  detectarMateriaDesdeTexto,
  resolverArticuloExacto,
  tieneEncabezadoArticulo,
  type FilaExactaDB,
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
 */

describe('detectarArticuloExacto', () => {
  it('detecta el número sin instrumento explícito', () => {
    expect(detectarArticuloExacto('¿Qué dice el artículo 173?')).toEqual({
      numero: '173',
      materiaDetectada: null,
    });
  });

  it('detecta materia Penal por palabra clave', () => {
    expect(detectarArticuloExacto('artículo 173 del Código Procesal Penal')).toEqual({
      numero: '173',
      materiaDetectada: '01_PENAL',
    });
    expect(detectarArticuloExacto('Art. 22 CPP')).toEqual({
      numero: '22',
      materiaDetectada: '01_PENAL',
    });
  });

  it('detecta materia Civil por palabra clave', () => {
    expect(detectarArticuloExacto('art. 173 CPC')).toEqual({
      numero: '173',
      materiaDetectada: '02_CIVIL',
    });
    expect(detectarArticuloExacto('artículo 1 del Código Procesal Civil')).toEqual({
      numero: '1',
      materiaDetectada: '02_CIVIL',
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

describe('tieneEncabezadoArticulo', () => {
  it('reconoce el encabezado real, con o sin tilde', () => {
    expect(tieneEncabezadoArticulo('...preciso: 1)... ARTICULO 173.- Medidas cautelares aplicables...', '173')).toBe(true);
    expect(tieneEncabezadoArticulo('ARTÍCULO 173.- Medidas cautelares aplicables', '173')).toBe(true);
  });

  it('rechaza una mera mención de paso (jurisprudencia citando el número)', () => {
    expect(tieneEncabezadoArticulo('la defensa del imputado en el artículo 173 numeral 3 del Código Penal, encuadrando la conducta...', '173')).toBe(false);
  });

  it('rechaza un fragmento mal segmentado que no contiene el encabezado en absoluto', () => {
    expect(tieneEncabezadoArticulo('www.poderjudicial.gob.hn [Página 59] Las medidas alternativas de la prisión preventiva no podrán imponerse...', '173')).toBe(false);
  });

  it('no confunde el número de otro artículo (ej. Art. 1730 no es Art. 173)', () => {
    expect(tieneEncabezadoArticulo('ARTICULO 1730.- Otra cosa completamente distinta', '173')).toBe(false);
  });
});

function fila(overrides: Partial<FilaExactaDB>): FilaExactaDB {
  return {
    id: 'x', contenido: 'ARTICULO 173.- texto del articulo', num_articulo: '173', fuente: 'TSC',
    fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL',
    ...overrides,
  };
}

describe('resolverArticuloExacto', () => {
  it('sin filas → no encontrado, no ambiguo', () => {
    expect(resolverArticuloExacto([], '173')).toEqual({ fragmentos: [], ambiguo: false });
  });

  it('una sola fila con encabezado real → se usa directo, con hash y relevancia 1', () => {
    const r = resolverArticuloExacto([fila({})], '173');
    expect(r.ambiguo).toBe(false);
    expect(r.fragmentos).toHaveLength(1);
    expect(r.fragmentos[0].hash).toMatch(/^[0-9a-f]{8}$/);
    expect(r.fragmentos[0].relevancia).toBe(1);
  });

  it('dos instrumentos distintos con el mismo número → ambiguo, no cita ninguno', () => {
    const r = resolverArticuloExacto([
      fila({ materia: '01_PENAL', contenido: 'ARTICULO 173.- texto penal' }),
      fila({ materia: '02_CIVIL', contenido: 'ARTICULO 173.- texto civil' }),
    ], '173');
    expect(r.ambiguo).toBe(true);
    expect(r.fragmentos).toHaveLength(0);
  });

  it('dos filas de la MISMA materia (no ambiguo por definición) → usa la primera', () => {
    const r = resolverArticuloExacto([
      fila({ materia: '01_PENAL', id: 'a' }),
      fila({ materia: '01_PENAL', id: 'b' }),
    ], '173');
    expect(r.ambiguo).toBe(false);
    expect(r.fragmentos).toHaveLength(1);
  });

  it('descarta filas con artefactos de anonimización sin limpiar', () => {
    const r = resolverArticuloExacto([
      fila({ contenido: 'ARTICULO 173.- [Cliente_Anónimo_6] presentó su escrito...' }),
    ], '173');
    expect(r.fragmentos).toHaveLength(0);
    expect(r.ambiguo).toBe(false);
  });

  it('WAR ROOM: descarta fragmentos sin el encabezado real, aunque estén etiquetados con ese num_articulo', () => {
    const r = resolverArticuloExacto([
      fila({ contenido: 'www.poderjudicial.gob.hn [Página 59] Las medidas alternativas de la prisión preventiva no podrán imponerse...' }),
    ], '173');
    expect(r.fragmentos).toHaveLength(0);
    expect(r.ambiguo).toBe(false);
  });

  it('WAR ROOM: si el único candidato con encabezado real está contaminado, no cae al fragmento mal segmentado ni al contaminado — abstención', () => {
    const r = resolverArticuloExacto([
      fila({ id: 'headerless', contenido: 'presupuestos y finalidad. Las medidas cautelares tienen como...' }),
      fila({ id: 'contaminado', contenido: 'ARTICULO 173.- ...presentarse ante un [Cliente_Anónimo_2] o autoridad...' }),
    ], '173');
    expect(r.fragmentos).toHaveLength(0);
    expect(r.ambiguo).toBe(false);
  });

  it('WAR ROOM: un fragmento de jurisprudencia que solo menciona el número no cuenta como encabezado', () => {
    const r = resolverArticuloExacto([
      fila({ fuente_tipo: 'codigo', contenido: 'la defensa del imputado en el artículo 173 numeral 3 del Código Penal, encuadrando la conducta...' }),
    ], '173');
    expect(r.fragmentos).toHaveLength(0);
  });
});
