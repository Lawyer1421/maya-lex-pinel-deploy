import { describe, it, expect } from 'vitest';
import { formatearContextoRAG, type FragmentoRAG, type ResultadoRAG } from '@/lib/rag/search';

/**
 * Salvaguarda D6(a) (Operación "Facultades Completas", 2026-08-27).
 *
 * Hallazgo de la verificación de seguridad de Fase 1: un fragmento con
 * es_norma_vigente=false + fuente_tipo='codigo' + jurisdiccion='HN' (ej. un
 * artículo derogado del Código de Familia, ya confirmado en producción) no
 * encajaba en ninguna de las tres etiquetas existentes y llegaba al contexto
 * del modelo SIN ninguna advertencia -- indistinguible de un fragmento
 * normal. Esta prueba fija ese contrato: NINGÚN fragmento queda sin etiqueta.
 */

function fragmento(overrides: Partial<FragmentoRAG>): FragmentoRAG {
  return {
    contenido: 'texto de prueba',
    num_articulo: '120',
    fuente: 'Codigo de Familia',
    relevancia: 0.9,
    fuente_tipo: 'codigo',
    jurisdiccion: 'HN',
    es_norma_vigente: false,
    ...overrides,
  };
}

function resultado(fragmentos: FragmentoRAG[]): ResultadoRAG {
  return { fragmentos, articulos_encontrados: [], backend: 'supabase' };
}

describe('formatearContextoRAG — ninguna etiqueta queda en null', () => {
  it('es_norma_vigente=true → [NORMA VIGENTE HONDURAS]', () => {
    const ctx = formatearContextoRAG(resultado([fragmento({ es_norma_vigente: true })]));
    expect(ctx).toContain('[NORMA VIGENTE HONDURAS]');
  });

  it('jurisdicción distinta de HN → [DOCTRINA/JURISPRUDENCIA COMPARADA]', () => {
    const ctx = formatearContextoRAG(resultado([fragmento({ jurisdiccion: 'ES' })]));
    expect(ctx).toContain('[DOCTRINA/JURISPRUDENCIA COMPARADA — ES]');
  });

  it('fuente_tipo sentencia/doctrina → [DOCTRINA/JURISPRUDENCIA — NO ES NORMA VIGENTE]', () => {
    const ctx = formatearContextoRAG(resultado([fragmento({ fuente_tipo: 'sentencia' })]));
    expect(ctx).toContain('[DOCTRINA/JURISPRUDENCIA — NO ES NORMA VIGENTE]');
  });

  it('el caso encontrado en la auditoría (codigo + HN + no vigente) ya NO queda sin etiqueta', () => {
    const ctx = formatearContextoRAG(
      resultado([fragmento({ fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: false })])
    );
    expect(ctx).toContain('[FUENTE SIN CLASIFICAR — NO CITAR COMO NORMA VIGENTE]');
  });

  it('metadata ausente/desconocida por completo también cae en la etiqueta de seguridad, nunca sin etiqueta', () => {
    const ctx = formatearContextoRAG(
      resultado([fragmento({ fuente_tipo: null, jurisdiccion: null, es_norma_vigente: null })])
    );
    expect(ctx).toContain('[FUENTE SIN CLASIFICAR — NO CITAR COMO NORMA VIGENTE]');
  });
});
