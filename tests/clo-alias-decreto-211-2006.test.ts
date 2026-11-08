import { describe, expect, it } from 'vitest';
import { anotarFragmentosClo, mencionesNoValidadas, textoNombraInstrumento } from '@/lib/legal-retrieval/clo-guards';

const mk = (n: string, contenido: string) => ({
  id: `v2civil:mayalex_procedimental:${n}`, contenido, num_articulo: n, fuente: 'Codigo Procesal Civil', relevancia: 1, fuente_tipo: 'codigo',
  jurisdiccion: 'HN', es_norma_vigente: true, materia: '02_CIVIL', coleccion_origen: 'mayalex_procedimental',
});
const frs = anotarFragmentosClo([mk('424', 'PROCEDENCIA Y REQUISITOS.\n1. Todo proceso judicial comenzará por medio de demanda escrita.')] as never);
const problemas = (t: string) => mencionesNoValidadas(t, frs, {});

describe('alias del CPC por su decreto (211-2006)', () => {
  it('reconoce «Decreto 211-2006», «Decreto No. 211-2006» y «D.211-2006» como el Código Procesal Civil', () => {
    for (const t of ['el Decreto 211-2006', 'el Decreto No. 211-2006', 'CPC (D.211-2006)', 'D. 211-2006']) expect(textoNombraInstrumento(t, 'CODIGO_PROCESAL_CIVIL')).toBe(true);
  });
  it('una respuesta con el artículo 424 y el decreto del CPC ya no se bloquea por instrumento desconocido', () => {
    expect(problemas('Artículo 424 CPC (D.211-2006): la demanda debe ser escrita.')).toEqual([]);
    expect(problemas('Según el Decreto 211-2006, artículo 424, la demanda debe ser escrita.')).toEqual([]);
  });
  it('sigue exigiendo respaldo del artículo: un artículo no recuperado se bloquea aunque se nombre el decreto', () => {
    expect(problemas('Artículo 625 CPC (D.211-2006): requisitos especiales.')).toEqual(['ARTICULO_SIN_FRAGMENTO:625']);
  });
  it('otro decreto sigue siendo desconocido y el decreto del CPC no avala a otro instrumento', () => {
    expect(problemas('Según el artículo 424 del Código Procesal Civil y el Decreto 999-2006.')).toContain('INSTRUMENTO_DESCONOCIDO');
    expect(problemas('Artículo 424 del Código Civil (D.211-2006).')).toContain('INSTRUMENTO_SIN_FRAGMENTO:CODIGO_CIVIL');
  });
  it('el nombre completo sigue pasando', () => {
    expect(problemas('Según el artículo 424 del Código Procesal Civil, la demanda debe ser escrita.')).toEqual([]);
  });
});
