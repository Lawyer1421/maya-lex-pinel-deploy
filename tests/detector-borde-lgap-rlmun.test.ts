/**
 * Casos de borde BAJO del detector señalados al cierre del #177 (2026-11-27):
 *  - LGAP (D.146-86): un calificativo posterior («… Pública Financiera», «… Federal») nombra otra ley, no la hondureña.
 *  - RLMUN (Acuerdo 018-93): las locuciones preposicionales entre «Reglamento» y «Ley de Municipalidades» («conforme a», «en aplicación
 *    de», «de ejecución de»…) siguen siendo el Reglamento y nunca resuelven a la Ley.
 */
import { describe, expect, it } from 'vitest';
import { detectarIdentidadesDesdeTexto, detectarInstrumentoDesdeTexto } from '@/lib/legal-retrieval/exact-resolver';
import { identidadDeFuente } from '@/lib/legal-retrieval/instrument-identity';
import { clasificarIntencionInstrumental } from '@/lib/legal-retrieval/instrument-gate';
import { clasificarFragmentoClo, textoNombraInstrumento } from '@/lib/legal-retrieval/clo-guards';

const LGAP = 'LEY_GENERAL_ADMINISTRACION_PUBLICA' as const;
const RLMUN = 'REGLAMENTO_LEY_MUNICIPALIDADES' as const;

describe('LGAP: calificativos posteriores no son el D.146-86', () => {
  it.each([
    'artículo 5 de la Ley General de la Administración Pública Financiera',
    'artículo 5 de la Ley General de Administración Pública Financiera',
    'artículo 5 de la Ley General de la Administración Pública Federal',
    'artículo 5 de la Ley General de la Administración Pública Estatal',
    'artículo 5 de la Ley General de la Administración Pública Municipal',
    'artículo 5 de la Ley General de la Administración Pública Descentralizada',
  ])('«%s» → sin identidad (fail-close)', (q) => {
    expect(detectarInstrumentoDesdeTexto(q)).toBeNull();
    expect(clasificarIntencionInstrumental(q).estado).toBe('SPECIFIC_UNRESOLVED');
  });

  it.each([
    'artículo 29 de la Ley General de la Administración Pública',
    'artículo 29 de la Ley General de la Administración Pública de Honduras',
    'la Ley General de la Administración Pública, en su artículo 29',
    '¿qué dice la Ley General de la Administración Pública sobre la desconcentración?',
    'art. 29 de la Ley General de la Administración Pública (Decreto 146-86)',
  ])('«%s» sigue siendo la LGAP', (q) => {
    expect(detectarInstrumentoDesdeTexto(q)).toBe(LGAP);
  });

  it('la fuente de una ley calificada no toma la identidad de la LGAP', () => {
    expect(identidadDeFuente('Ley General de la Administración Pública Financiera (Decreto No. 1-2000)')).not.toBe(LGAP);
    expect(identidadDeFuente('Ley General de la Administración Pública de Honduras (Decreto No. 146-86)')).toBe(LGAP);
  });
});

describe('RLMUN: locuciones preposicionales → siempre el Reglamento', () => {
  it.each([
    'art. 25 del Reglamento conforme a la Ley de Municipalidades',
    'art. 25 del Reglamento con arreglo a la Ley de Municipalidades',
    'art. 25 del Reglamento en aplicación de la Ley de Municipalidades',
    'art. 25 del Reglamento de aplicación de la Ley de Municipalidades',
    'art. 25 del Reglamento de ejecución de la Ley de Municipalidades',
    'art. 25 del Reglamento en desarrollo de la Ley de Municipalidades',
    'art. 25 del Reglamento General de Ejecución de la nueva Ley de Municipalidades',
    'art. 25 del reglamento en aplicacion de ley de municipalidades',
  ])('«%s» → el Reglamento, nunca la Ley', (q) => {
    expect(detectarIdentidadesDesdeTexto(q).map((i) => i.instrumento)).toEqual([RLMUN]);
    expect(clasificarIntencionInstrumental(q)).toMatchObject({ estado: 'SPECIFIC_RESOLVED', identidades: [RLMUN] });
    const texto = q.replace(/^art\. 25 del /, 'El ');
    expect(textoNombraInstrumento(texto, RLMUN)).toBe(true);
    expect(textoNombraInstrumento(texto, 'LEY_MUNICIPALIDADES')).toBe(false);
  });

  it('la Ley a secas (o citada junto al Reglamento) sigue siendo la Ley', () => {
    expect(detectarInstrumentoDesdeTexto('artículo 25 de la Ley de Municipalidades')).toBe('LEY_MUNICIPALIDADES');
    expect(detectarInstrumentoDesdeTexto('conforme a la Ley de Municipalidades, artículo 25')).toBe('LEY_MUNICIPALIDADES');
    const q = 'compare el Reglamento en aplicación de la Ley de Municipalidades con la Ley de Municipalidades';
    expect(detectarIdentidadesDesdeTexto(q).map((i) => i.instrumento)).toEqual([RLMUN, 'LEY_MUNICIPALIDADES']);
  });

  it('identidad por fuente con la locución (guardián CLO y catálogo coinciden)', () => {
    const fuente = 'Reglamento de Ejecución de la Ley de Municipalidades (Acuerdo No. 018-93)';
    expect(identidadDeFuente(fuente)).toBe(RLMUN);
    expect(clasificarFragmentoClo({ id: 'x', fuente, fuente_tipo: 'codigo', num_articulo: '25', jurisdiccion: 'HN', es_norma_vigente: true }).instrumentId).toBe(RLMUN);
  });
});
