/**
 * Fixtures de P0-1 (norma_version). SOLO fixtures de prueba: nada de esto se
 * siembra en ninguna base. Los eventos piloto no tienen texto verificado, así
 * que van con texto null y vigencia UNKNOWN. Los eventos sin día conocido llevan
 * precision_fecha='AÑO' explícito y no fabrican un día: vigente_desde_min y
 * vigente_desde_max acotan el año completo.
 */
import type { NormaVersion } from '@/lib/legal-retrieval/norma-version';

export const NOTARIADO = 'HN_NOTARIADO'; // Código del Notariado, D.353-2005
export const CPC = 'HN_CPC'; // Código Procesal Civil, D.211-2006

const NOTA_ANIO =
  'FIXTURE: día desconocido; precision_fecha=AÑO. vigente_desde es el límite inferior del año (= vigente_desde_min), no un día conocido.';

/** Fila base: sin texto, UNKNOWN, no elegible. */
export function fila(p: Partial<NormaVersion> & Pick<NormaVersion, 'instrumento_id' | 'unidad' | 'version_id' | 'vigente_desde'>): NormaVersion {
  return {
    etiqueta: null,
    texto: null,
    texto_hash: null,
    vigente_hasta: null,
    vigente_desde_min: null,
    vigente_desde_max: null,
    tipo_evento: 'ORIGINAL',
    instrumento_modificador: null,
    gaceta_numero: null,
    fecha_publicacion: null,
    fecha_vigencia: null,
    estado_vigencia: 'UNKNOWN',
    nivel_verificacion: 'SECUNDARIA',
    elegible_primary: false,
    fuente: null,
    fuente_pdf_hash: null,
    adjudicacion_ref: null,
    precision_fecha: 'AÑO',
    nota: null,
    ...p,
  };
}

interface Evento extends Partial<NormaVersion> {
  version_id: string;
  vigente_desde: string;
}

/** Encadena eventos de una unidad: cada versión cierra donde empieza la siguiente. */
export function cadena(instrumento_id: string, unidad: string, eventos: readonly Evento[]): NormaVersion[] {
  return eventos.map((e, i) =>
    fila({
      ...e,
      instrumento_id,
      unidad,
      vigente_hasta: i + 1 < eventos.length ? eventos[i + 1].vigente_desde : null,
    }),
  );
}

const anio = (y: number): Pick<NormaVersion, 'vigente_desde' | 'vigente_desde_min' | 'vigente_desde_max' | 'precision_fecha'> => ({
  vigente_desde: `${y}-01-01`,
  vigente_desde_min: `${y}-01-01`,
  vigente_desde_max: `${y}-12-31`,
  precision_fecha: 'AÑO',
});

const ORIGINAL_NOTARIADO = { version_id: 'orig-353-2005', tipo_evento: 'ORIGINAL' as const, ...anio(2005), nota: NOTA_ANIO };
const ORIGINAL_CPC = { version_id: 'orig-211-2006', tipo_evento: 'ORIGINAL' as const, ...anio(2006), nota: NOTA_ANIO };

const D77_2006 = {
  version_id: 'd77-2006',
  tipo_evento: 'DEROGACION_EXPRESA' as const,
  instrumento_modificador: 'D.77-2006',
  vigente_desde: '2006-07-23',
  vigente_desde_min: '2006-07-23',
  vigente_desde_max: '2006-07-25',
  precision_fecha: 'RANGO' as const,
  nota: 'FIXTURE: la fuente secundaria da 23 o 25 de julio de 2006.',
};

const RI_137_06 = {
  version_id: 'ri-137-06',
  tipo_evento: 'INCONSTITUCIONALIDAD' as const,
  instrumento_modificador: 'RI-137-06',
  vigente_desde: '2007-08-07',
  precision_fecha: 'DIA' as const,
  nota: 'FIXTURE: inconstitucionalidad del 7-ago-2007 (fuente secundaria).',
};

const D40_2008 = {
  version_id: 'd40-2008',
  tipo_evento: 'DEROGACION_EXPRESA' as const,
  instrumento_modificador: 'D.40-2008',
  ...anio(2008),
  nota: NOTA_ANIO,
};

const D59_2015 = {
  version_id: 'd59-2015',
  tipo_evento: 'TEXTO_NUEVO_MISMO_NUMERO' as const,
  instrumento_modificador: 'D.59-2015',
  gaceta_numero: '33,801',
  nivel_verificacion: 'PRIMARIA_IMAGEN' as const, // Gaceta 33,801
  ...anio(2015),
  nota: NOTA_ANIO,
};

/** Notariado: unidades derogadas por D.77-2006 (72 y 73 además reciben texto nuevo en 2015). */
const derogadas77 = ['84', '87', '12.11', '76.5'];

export const FIXTURES_NOTARIADO: NormaVersion[] = [
  ...cadena(NOTARIADO, '72', [ORIGINAL_NOTARIADO, D77_2006, D59_2015]),
  ...cadena(NOTARIADO, '73', [ORIGINAL_NOTARIADO, D77_2006, D59_2015]),
  // 72-A: sin versión anterior en el fixture; el tipo ADICION es un supuesto del fixture.
  ...cadena(NOTARIADO, '72-A', [{ ...D59_2015, tipo_evento: 'ADICION' as const }]),
  ...derogadas77.flatMap((u) => cadena(NOTARIADO, u, [ORIGINAL_NOTARIADO, D77_2006])),
  // RI-137-06: inconstitucionalidad del 59.11 y de los arts. 60-71.
  ...['59.11', ...Array.from({ length: 12 }, (_, i) => String(60 + i))].flatMap((u) =>
    cadena(NOTARIADO, u, [ORIGINAL_NOTARIADO, RI_137_06]),
  ),
  // D.40-2008 deroga el 59.15.
  ...cadena(NOTARIADO, '59.15', [ORIGINAL_NOTARIADO, D40_2008]),
];

/** CPC: D.21-2015 reforma 400.2 y 783.1 (Gaceta 33,882); D.168-2009 reforma el art. 932. */
const D21_2015 = {
  version_id: 'd21-2015',
  tipo_evento: 'REFORMA' as const,
  instrumento_modificador: 'D.21-2015',
  gaceta_numero: '33,882',
  ...anio(2015),
  nota: NOTA_ANIO,
};
const D168_2009 = {
  version_id: 'd168-2009',
  tipo_evento: 'REFORMA' as const,
  instrumento_modificador: 'D.168-2009',
  ...anio(2009),
  nota: NOTA_ANIO,
};

export const FIXTURES_CPC: NormaVersion[] = [
  ...cadena(CPC, '400.2', [ORIGINAL_CPC, D21_2015]),
  ...cadena(CPC, '783.1', [ORIGINAL_CPC, D21_2015]),
  ...cadena(CPC, '932', [ORIGINAL_CPC, D168_2009]),
];

export const FIXTURES_PILOTO: NormaVersion[] = [...FIXTURES_NOTARIADO, ...FIXTURES_CPC];
