import { describe, it, expect } from 'vitest';
import { clasificarFragmentoClo } from '@/lib/legal-retrieval/clo-guards';
import { identidadDeFuente } from '@/lib/legal-retrieval/instrument-identity';

const fila = (o: Record<string, unknown> = {}) => ({
  id: 'x', contenido: 'La demanda deberá contener...', num_articulo: '438', similarity: 0.8,
  fuente: 'CPC_TEXTO_BASE_D211-2006', fuente_tipo: null, jurisdiccion: null, es_norma_vigente: true, ...o,
}) as never;

describe('CPC_TEXTO_BASE_D211-2006: texto oficial del CPC (decisión del propietario 2-nov-2026)', () => {
  it('con metadatos ausentes y vigencia TRUE es PRIMARY del CPC', () => {
    const c = clasificarFragmentoClo(fila());
    expect(c.instrumentId).toBe('CODIGO_PROCESAL_CIVIL');
    expect(c.rol).toBe('PRIMARY');
    expect(c.bloqueos).toEqual([]);
  });
  it('la vigencia sigue siendo obligatoria: NULL o FALSE no es PRIMARY', () => {
    expect(clasificarFragmentoClo(fila({ es_norma_vigente: null })).rol).toBe('CONTEXT');
    expect(clasificarFragmentoClo(fila({ es_norma_vigente: false })).rol).toBe('CONTEXT');
  });
  it('un metadato declarado distinto no se pisa: jurisdicción extranjera bloquea', () => {
    expect(clasificarFragmentoClo(fila({ jurisdiccion: 'ES' })).rol).toBe('CONTEXT');
    expect(clasificarFragmentoClo(fila({ fuente_tipo: 'sentencia' })).rol).toBe('CONTEXT');
  });
  it('variantes del nombre no se reconocen (coincidencia exacta)', () => {
    expect(clasificarFragmentoClo(fila({ fuente: 'CPC_TEXTO_BASE_D211-2006_copia' })).rol).toBe('CONTEXT');
    expect(identidadDeFuente('CPC_TEXTO_BASE_D211-2006_copia')).toBeNull();
  });
  it('CPC_COMENTADO_ROMERO_2024 sigue siendo doctrina, aunque venga marcado como código HN vigente', () => {
    const c = clasificarFragmentoClo(fila({ fuente: 'CPC_COMENTADO_ROMERO_2024', fuente_tipo: 'codigo', jurisdiccion: 'HN' }));
    expect(c.rol).toBe('CONTEXT');
    expect(c.tipoFuente).toBe('DOCTRINA');
    expect(c.bloqueos).toContain('DOCTRINA_NO_ES_NORMA');
  });
  it('CPC_COMENTADO_ROMERO_2024 sin metadatos tampoco es PRIMARY', () => {
    expect(clasificarFragmentoClo(fila({ fuente: 'CPC_COMENTADO_ROMERO_2024', es_norma_vigente: null })).rol).toBe('CONTEXT');
    expect(identidadDeFuente('CPC_COMENTADO_ROMERO_2024')).toBeNull();
  });
  it('identidadDeFuente reconoce el texto oficial y conserva la fuente habitual', () => {
    expect(identidadDeFuente('CPC_TEXTO_BASE_D211-2006')).toBe('CODIGO_PROCESAL_CIVIL');
    expect(identidadDeFuente('Codigo Procesal Civil')).toBe('CODIGO_PROCESAL_CIVIL');
  });
  it('las fuentes comentadas con otros nombres (guion bajo) ya se reconocen como doctrina', () => {
    const c = clasificarFragmentoClo(fila({ fuente: 'CODIGO_PENAL_COMENTADO', fuente_tipo: 'codigo', jurisdiccion: 'HN' }));
    expect(c.tipoFuente).toBe('DOCTRINA');
  });
});
