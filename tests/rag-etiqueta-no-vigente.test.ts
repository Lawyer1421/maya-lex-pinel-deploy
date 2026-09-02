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

  it('el caso encontrado en la auditoría (codigo + HN + no vigente) recibe su etiqueta específica, corregida el 2026-08-28', () => {
    const ctx = formatearContextoRAG(
      resultado([fragmento({ fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: false })])
    );
    // Corrección: ya no cae al fallback genérico "FUENTE SIN CLASIFICAR" --
    // es una afirmación conocida y verificada (derogado), no una ausencia de
    // metadata. El fallback genérico queda reservado para metadata realmente
    // ausente/ambigua (ver prueba siguiente).
    expect(ctx).toContain('[NO VIGENTE — NO CITAR COMO NORMA]');
    expect(ctx).not.toContain('FUENTE SIN CLASIFICAR');
  });

  it('metadata ausente/desconocida por completo también cae en la etiqueta de seguridad, nunca sin etiqueta', () => {
    const ctx = formatearContextoRAG(
      resultado([fragmento({ fuente_tipo: null, jurisdiccion: null, es_norma_vigente: null })])
    );
    expect(ctx).toContain('[FUENTE SIN CLASIFICAR — NO CITAR COMO NORMA VIGENTE]');
  });

  it('FUENTES_DOCTRINALES (auditoría CLO 2026-09-02) → etiqueta explícita "NO VINCULANTE" en el contexto inyectado al modelo', () => {
    const ctx = formatearContextoRAG(
      resultado([
        fragmento({
          fuente: 'CPC_COMENTADO_ROMERO_2024',
          fuente_tipo: null,
          jurisdiccion: 'HN',
          es_norma_vigente: null,
        }),
      ])
    );
    expect(ctx).toContain(
      '[FUENTE DOCTRINAL / COMENTARIO ACADÉMICO - NO VINCULANTE: CPC_COMENTADO_ROMERO_2024]'
    );
    expect(ctx).not.toContain('FUENTE SIN CLASIFICAR');
  });

  it('FUENTES_DOCTRINALES gana incluso si es_norma_vigente=true llega por error de ingesta futura', () => {
    const ctx = formatearContextoRAG(
      resultado([
        fragmento({
          fuente: 'CPC_COMENTADO_ROMERO_2024',
          fuente_tipo: 'codigo',
          jurisdiccion: 'HN',
          es_norma_vigente: true,
        }),
      ])
    );
    expect(ctx).toContain(
      '[FUENTE DOCTRINAL / COMENTARIO ACADÉMICO - NO VINCULANTE: CPC_COMENTADO_ROMERO_2024]'
    );
    // La línea del FRAGMENTO específico no debe llevar la etiqueta de norma
    // vigente (esa cadena sí aparece, sin corchetes de fragmento, dentro de
    // la instrucción fija del pie de contexto -- por eso se verifica la
    // línea, no el string completo).
    const lineaFragmento = ctx.split('\n').find((l) => l.startsWith('[FRAGMENTO'));
    expect(lineaFragmento).not.toContain('NORMA VIGENTE HONDURAS');
  });
});
