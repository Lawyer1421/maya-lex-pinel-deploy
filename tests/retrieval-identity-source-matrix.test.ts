import { describe, it, expect } from 'vitest';
import {
  detectarInstrumentoDesdeTexto,
  identidadDeFuente,
  type InstrumentoNormalizado,
} from '@/lib/legal-retrieval/exact-resolver';

/**
 * Matriz identidad-de-fuente ↔ identidad-de-consulta por instrumento.
 *
 * Las cadenas de `fuente` son literales que ya existen en fixtures, artefactos
 * o pruebas del repositorio (no inventadas). Cada consulta de ejemplo debe
 * resolver al mismo instrumento que su fuente real.
 *
 * Desajustes conocidos, NO corregidos ampliando regex (ver bloque final):
 * las fuentes normativas CPC_TEXTO_BASE_D211-2006 y CPC_COMENTADO_ROMERO_2024
 * no contienen el nombre del instrumento, así que identidadDeFuente no las
 * reconoce como Código Procesal Civil.
 */

interface EntradaMatriz {
  instrumento: InstrumentoNormalizado;
  fuentesReales: string[];
  consulta: string;
}

const MATRIZ: EntradaMatriz[] = [
  {
    instrumento: 'CODIGO_PROCESAL_PENAL',
    fuentesReales: ['Código Procesal Penal de Honduras (Decreto 9-99-E)', 'Codigo Procesal Penal'],
    consulta: 'artículo 173 del Código Procesal Penal',
  },
  {
    instrumento: 'CODIGO_PENAL',
    fuentesReales: ['Codigo Penal'],
    consulta: 'artículo 1 del Código Penal',
  },
  {
    instrumento: 'CODIGO_PROCESAL_CIVIL',
    fuentesReales: ['Codigo Procesal Civil'],
    consulta: 'artículo 5 del Código Procesal Civil',
  },
  {
    instrumento: 'CODIGO_CIVIL',
    fuentesReales: ['Código Civil de Honduras (Decreto del Poder Ejecutivo del 8 de febrero de 1906)', 'Codigo Civil'],
    consulta: 'artículo 5 del Código Civil',
  },
  {
    instrumento: 'CODIGO_TRABAJO',
    fuentesReales: ['Codigo del Trabajo'],
    consulta: 'artículo 10 del Código de Trabajo',
  },
  {
    instrumento: 'CODIGO_FAMILIA',
    fuentesReales: ['Codigo de Familia'],
    consulta: 'artículo 10 del Código de Familia',
  },
  {
    instrumento: 'CODIGO_NOTARIADO',
    fuentesReales: ['Código del Notariado de Honduras (Decreto 353-2005)', 'Código del Notariado (Decreto 353-2005)'],
    consulta: 'artículo 10 del Código del Notariado',
  },
  {
    instrumento: 'REGLAMENTO_NOTARIADO',
    fuentesReales: ['Reglamento del Código del Notariado (Resolución PCSJ-17-2012)'],
    consulta: 'artículo 1 del Reglamento del Código del Notariado',
  },
  {
    instrumento: 'CODIGO_TRIBUTARIO',
    fuentesReales: ['Codigo Tributario (Decreto 170-2016 - Consolidado SAR corte 2019)'],
    consulta: 'artículo 1 del Código Tributario',
  },
  {
    instrumento: 'LEY_JUSTICIA_CONSTITUCIONAL',
    fuentesReales: ['Ley sobre Justicia Constitucional'],
    consulta: 'artículo 1 de la Ley sobre Justicia Constitucional',
  },
  {
    instrumento: 'CONSTITUCION',
    fuentesReales: ['Constitucion de la Republica de Honduras (Decreto 131-1982 - Consolidado TSC corte 2004)'],
    consulta: 'artículo 1 de la Constitución de la República',
  },
  {
    instrumento: 'CODIGO_COMERCIO',
    fuentesReales: ['Codigo de Comercio (Decreto No. 73-1950, Congreso Nacional de Honduras)'],
    consulta: 'artículo 1 del Código de Comercio',
  },
];

describe('matriz identidad de fuente real ↔ consulta, por instrumento', () => {
  it.each(MATRIZ.flatMap((e) => e.fuentesReales.map((f) => [e.instrumento, f] as const)))(
    '%s — la fuente real "%s" se identifica como ese instrumento',
    (instrumento, fuente) => {
      expect(identidadDeFuente(fuente)).toBe(instrumento);
    },
  );

  it.each(MATRIZ.map((e) => [e.instrumento, e.consulta] as const))(
    '%s — la consulta de ejemplo "%s" resuelve a ese instrumento',
    (instrumento, consulta) => {
      expect(detectarInstrumentoDesdeTexto(consulta)).toBe(instrumento);
    },
  );

  it('ningún instrumento de la matriz se confunde con otro en sus fuentes reales', () => {
    for (const e of MATRIZ) {
      for (const f of e.fuentesReales) {
        const otra = MATRIZ.filter((x) => x.instrumento !== e.instrumento).find((x) => identidadDeFuente(f) === x.instrumento);
        expect(otra, `${f} colisiona con ${otra?.instrumento}`).toBeUndefined();
      }
    }
  });
});

describe('desajustes conocidos (no corregidos; se reportan)', () => {
  it('CPC_TEXTO_BASE_D211-2006 (fuente normativa real del CPC) no declara el instrumento en la fuente', () => {
    // La consulta "Código Procesal Civil" sí resuelve CODIGO_PROCESAL_CIVIL,
    // pero esta fuente no lo confirma: queda fuera de una consulta explícita.
    expect(detectarInstrumentoDesdeTexto('artículo 5 del Código Procesal Civil')).toBe('CODIGO_PROCESAL_CIVIL');
    expect(identidadDeFuente('CPC_TEXTO_BASE_D211-2006')).toBeNull();
  });

  it('CPC_COMENTADO_ROMERO_2024 (doctrina) tampoco declara el instrumento en la fuente', () => {
    expect(identidadDeFuente('CPC_COMENTADO_ROMERO_2024')).toBeNull();
  });
});
