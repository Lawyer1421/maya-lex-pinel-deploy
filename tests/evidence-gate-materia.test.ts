import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectarMateriaDesdeTexto,
  detectarMateriaSemanticaAmpliada,
  MATERIA_MERCANTIL_SIN_CORPUS,
} from '@/lib/legal-retrieval/exact-resolver';

/**
 * MISSION M1 — EG-1 Evidence Gate materia correctness (2026-09-28).
 *
 * Defecto probado antes de esta fase (ver commit anterior a esta prueba):
 * fuera de penal/civil, `materiaSemantica` en lib/rag/search.ts quedaba
 * `undefined` para cualquier consulta -- un fragmento de materia
 * completamente ajena (ej. constitucional) podía colar por similitud pura y
 * contar como SEMANTIC_SUCCESS, bloqueando tanto la abstención fail-closed
 * como OFFICIAL_FALLBACK_REQUIRED. Caso real:
 * docs/observability/RETRIEVAL_V3_GOLDEN_CASE_SRL_HONDURAS.md.
 */

describe('EG-1 — detectarMateriaDesdeTexto NUNCA cambia (ruta de artículo exacto)', () => {
  it('sigue sin detectar mercantil/notarial/constitucional -- solo penal/civil', () => {
    expect(detectarMateriaDesdeTexto('requisitos para constituir una Sociedad de Responsabilidad Limitada')).toBeNull();
    expect(detectarMateriaDesdeTexto('necesito una escritura pública ante notario')).toBeNull();
    expect(detectarMateriaDesdeTexto('quiero interponer un amparo')).toBeNull();
  });

  it('penal/civil sin cambios', () => {
    expect(detectarMateriaDesdeTexto('artículo 173 del código procesal penal')).toBe('01_PENAL');
    expect(detectarMateriaDesdeTexto('artículo 1 del código civil')).toBe('02_CIVIL');
  });
});

describe('EG-1 — CASE C/G: detectarMateriaSemanticaAmpliada (caso dorado S. de R.L.)', () => {
  it('la consulta dorada exacta resuelve al sentinel mercantil, no a undefined', () => {
    const materia = detectarMateriaSemanticaAmpliada(
      '¿Cuáles son los requisitos para constituir una Sociedad de Responsabilidad Limitada en Honduras?',
    );
    expect(materia).toBe(MATERIA_MERCANTIL_SIN_CORPUS);
    expect(materia).not.toBeNull();
  });

  it('no confunde "constituir" (mercantil) con "constitución" (constitucional)', () => {
    expect(detectarMateriaSemanticaAmpliada('requisitos para constituir una sociedad anónima')).toBe(MATERIA_MERCANTIL_SIN_CORPUS);
    expect(detectarMateriaSemanticaAmpliada('requisitos de reforma a la constitución de la república')).toBe('07_CONSTITUCIONAL');
  });

  it('notarial y constitucional resuelven a su materia real', () => {
    expect(detectarMateriaSemanticaAmpliada('¿qué requisitos exige el notario para una escritura pública?')).toBe('03_NOTARIAL');
    expect(detectarMateriaSemanticaAmpliada('quiero interponer un recurso de amparo')).toBe('07_CONSTITUCIONAL');
  });

  it('penal/civil siguen ganando primero (delegan a detectarMateriaDesdeTexto sin cambio)', () => {
    expect(detectarMateriaSemanticaAmpliada('artículo 173 del código procesal penal')).toBe('01_PENAL');
    expect(detectarMateriaSemanticaAmpliada('artículo 1 del código civil')).toBe('02_CIVIL');
  });

  it('materias sin cobertura (laboral, tributario, familia, agrario) siguen resolviendo null -- gap documentado, no regresión', () => {
    expect(detectarMateriaSemanticaAmpliada('¿cuáles son mis prestaciones laborales al terminar el contrato?')).toBeNull();
    expect(detectarMateriaSemanticaAmpliada('¿cómo se calcula el impuesto sobre la renta?')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buscarRAG end-to-end: prueba que el sentinel realmente llega a SQL y por lo
// tanto la fila de materia ajena NUNCA se devuelve -- mismo patrón de mocking
// que tests/retrieval-outcome.test.ts.
// ─────────────────────────────────────────────────────────────────────────────

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  process.env.RAG_BACKEND = 'supabase';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';
  delete process.env.COHERE_API_KEY;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('[CASE C] consulta mercantil contaminada -> OFFICIAL_FALLBACK_REQUIRED, nunca SEMANTIC_SUCCESS', () => {
  it('el RPC recibe materia_filtro=sentinel y no hay fragmentos -> OFFICIAL_FALLBACK_REQUIRED', async () => {
    const rpcMock = vi.fn(async (_fn: string, args: Record<string, unknown>) => {
      // Simula la DB real: ninguna fila tiene el sentinel como materia, así
      // que CUALQUIER materia_filtro distinto de las reales devuelve vacío.
      if (args.materia_filtro === MATERIA_MERCANTIL_SIN_CORPUS) {
        return { data: [], error: null };
      }
      // Si el fix no estuviera aplicado (materia_filtro=null), esto es lo que
      // causaba el defecto: una fila de materia ajena (constitucional) se
      // devolvía igual por similitud pura.
      return {
        data: [{
          id: 'ljc-1', contenido: 'La Ley sobre Justicia Constitucional regula el amparo.',
          num_articulo: '1', fuente: 'Ley sobre Justicia Constitucional', fuente_tipo: 'codigo',
          jurisdiccion: 'HN', es_norma_vigente: true, similarity: 0.55,
        }],
        error: null,
      };
    });
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ rpc: rpcMock }) }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));

    const { buscarRAG } = await import('@/lib/rag/search');
    const resultado = await buscarRAG(
      '¿Cuáles son los requisitos para constituir una Sociedad de Responsabilidad Limitada en Honduras?',
      5,
      'mayalex_normativos',
    );

    // El RPC sí fue llamado con el sentinel -- prueba que el filtro llegó a SQL.
    expect(rpcMock).toHaveBeenCalled();
    const llamadaConFiltro = rpcMock.mock.calls.find(
      (c) => (c[1] as Record<string, unknown>).materia_filtro === MATERIA_MERCANTIL_SIN_CORPUS,
    );
    expect(llamadaConFiltro).toBeDefined();

    // Cero fragmentos (la fila constitucional NUNCA llega) -> OFFICIAL_FALLBACK_REQUIRED.
    expect(resultado.fragmentos).toHaveLength(0);
    expect(resultado.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
    expect(resultado.outcome?.state).not.toBe('SEMANTIC_SUCCESS');
  });
});

describe('[CASE G] fragmento de materia ajena con similitud alta -- no cuenta solo por score', () => {
  it('similarity=0.95 (muy alta) no salva a un fragmento fuera de materia_filtro', async () => {
    const rpcMock = vi.fn(async (_fn: string, args: Record<string, unknown>) => {
      if (args.materia_filtro === MATERIA_MERCANTIL_SIN_CORPUS) return { data: [], error: null };
      return {
        data: [{
          id: 'ljc-2', contenido: 'Texto de alta similitud vectorial pero materia ajena.',
          num_articulo: '5', fuente: 'Ley sobre Justicia Constitucional', fuente_tipo: 'codigo',
          jurisdiccion: 'HN', es_norma_vigente: true, similarity: 0.95,
        }],
        error: null,
      };
    });
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ rpc: rpcMock }) }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));

    const { buscarRAG } = await import('@/lib/rag/search');
    const resultado = await buscarRAG('requisitos para constituir una sociedad mercantil en Honduras', 5, 'mayalex_normativos');

    expect(resultado.fragmentos).toHaveLength(0);
    expect(resultado.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
  });
});

describe('[CASE D] consulta notarial de materia correcta -- sigue funcionando (sin regresión)', () => {
  it('materia_filtro=03_NOTARIAL y hay fila real -> SEMANTIC_SUCCESS', async () => {
    const rpcMock = vi.fn(async (_fn: string, args: Record<string, unknown>) => {
      if (args.materia_filtro === '03_NOTARIAL') {
        return {
          data: [{
            id: 'not-1', contenido: 'La escritura pública debe cumplir los siguientes requisitos formales.',
            num_articulo: '10', fuente: 'Codigo del Notariado', fuente_tipo: 'codigo',
            jurisdiccion: 'HN', es_norma_vigente: true, similarity: 0.8,
          }],
          error: null,
        };
      }
      return { data: [], error: null };
    });
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ rpc: rpcMock }) }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));

    const { buscarRAG } = await import('@/lib/rag/search');
    const resultado = await buscarRAG('¿qué requisitos formales exige una escritura pública ante notario?', 5, 'mayalex_normativos');

    expect(resultado.fragmentos).toHaveLength(1);
    expect(resultado.outcome?.state).toBe('SEMANTIC_SUCCESS');
  });
});

describe('[CASE F] consulta penal -- aislamiento sin cambios (materia explícita gana, nunca llama a la función ampliada)', () => {
  it('materia=01_PENAL pasado explícitamente por el caller no se ve afectado por la detección ampliada', async () => {
    const rpcMock = vi.fn(async (_fn: string, args: Record<string, unknown>) => {
      if (args.materia_filtro === '01_PENAL') {
        return {
          data: [{
            id: 'penal-1', contenido: 'Medidas cautelares aplicables en el proceso penal.',
            num_articulo: '173', fuente: 'Código Procesal Penal de Honduras', fuente_tipo: 'codigo',
            jurisdiccion: 'HN', es_norma_vigente: true, similarity: 0.7,
          }],
          error: null,
        };
      }
      return { data: [], error: null };
    });
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ rpc: rpcMock }) }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));

    const { buscarRAG } = await import('@/lib/rag/search');
    // Consulta sin ningún número de artículo explícito -- toma la ruta semántica.
    const resultado = await buscarRAG('¿qué medidas cautelares proceden en un proceso?', 5, 'mayalex_normativos', '01_PENAL');

    expect(resultado.fragmentos).toHaveLength(1);
    expect(resultado.outcome?.state).toBe('SEMANTIC_SUCCESS');
    const llamada = rpcMock.mock.calls[0][1] as Record<string, unknown>;
    expect(llamada.materia_filtro).toBe('01_PENAL');
  });
});
