import { describe, it, expect } from 'vitest';
import {
  detectarArticuloExacto,
  resolverArticuloExacto,
  type FilaExactaDB,
} from '@/lib/rag/search';

/**
 * P0-2B — recuperación determinista por artículo exacto.
 * Causa raíz real del fallo original: HF_API_TOKEN ausente en Preview
 * hacía fallar el embedding antes de siquiera llamar a Supabase, y
 * buscarRAG degradaba en silencio a cero fragmentos. Esta capa evita la
 * dependencia de embeddings para el caso "artículo N exacto".
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

function fila(overrides: Partial<FilaExactaDB>): FilaExactaDB {
  return {
    id: 'x', contenido: 'texto del articulo', num_articulo: '173', fuente: 'TSC',
    fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL',
    ...overrides,
  };
}

describe('resolverArticuloExacto', () => {
  it('sin filas → no encontrado, no ambiguo', () => {
    expect(resolverArticuloExacto([])).toEqual({ fragmentos: [], ambiguo: false });
  });

  it('una sola fila → se usa directo, con hash y relevancia 1', () => {
    const r = resolverArticuloExacto([fila({})]);
    expect(r.ambiguo).toBe(false);
    expect(r.fragmentos).toHaveLength(1);
    expect(r.fragmentos[0].hash).toMatch(/^[0-9a-f]{8}$/);
    expect(r.fragmentos[0].relevancia).toBe(1);
  });

  it('dos instrumentos distintos con el mismo número → ambiguo, no cita ninguno', () => {
    const r = resolverArticuloExacto([
      fila({ materia: '01_PENAL', contenido: 'texto penal' }),
      fila({ materia: '02_CIVIL', contenido: 'texto civil' }),
    ]);
    expect(r.ambiguo).toBe(true);
    expect(r.fragmentos).toHaveLength(0);
  });

  it('dos filas de la MISMA materia (no ambiguo por definición) → usa la primera', () => {
    const r = resolverArticuloExacto([
      fila({ materia: '01_PENAL', id: 'a' }),
      fila({ materia: '01_PENAL', id: 'b' }),
    ]);
    expect(r.ambiguo).toBe(false);
    expect(r.fragmentos).toHaveLength(1);
  });

  it('descarta filas con artefactos de anonimización sin limpiar', () => {
    const r = resolverArticuloExacto([
      fila({ contenido: '[Cliente_Anónimo_6] presentó su escrito...' }),
    ]);
    expect(r.fragmentos).toHaveLength(0);
    expect(r.ambiguo).toBe(false);
  });
});
