import { normalizarTexto } from './normalize';
import type { LabRow, RolRecuperacion } from './types';

/**
 * Decisión CLO vinculante (2026-10-09). Sólo laboratorio: no es esquema de
 * producción ni modifica el corpus. Cambiar un rol requiere una nueva
 * adjudicación CLO registrada.
 */
export const DECISION_CLO = {
  fecha: '2026-10-09',
  registro: 'docs/corpus/MAYALEX_CANONICAL_ADJUDICATION_REGISTER_V1.md',
  politica_ranking: 'HYBRID',
  confianza_juridica_numerica_permitida: false,
  regla_vinculante:
    'Mientras E2, E5 o E6 permanezcan OPEN en el registro, ninguna unidad de esas capas puede ser PRIMARY ni satisfacer suficiencia por sí sola.',
} as const;

export type CapaAbierta = 'E2' | 'E5' | 'E6';

export const ADVERTENCIA_E2 =
  'estado legal no adjudicado; posible derogación por D.77-2006 pendiente de Gaceta 31,091';
export const ADVERTENCIA_E5 =
  'CPC_TEXTO_BASE_D211-2006: rol temporal no adjudicado; sólo contexto histórico con consulta explícita';
export const ADVERTENCIA_E6 = 'estado canónico y completitud no medidos';

export const ARTICULOS_NOTARIADO_E2 = ['72', '73', '84', '87', '93'] as const;

const RE_CODIGO_NOTARIADO = /c[oó]digo\s+del\s+notariado/i;
const MARCADORES_HISTORICOS = [
  'historico',
  'historica',
  'original',
  'anterior',
  'temporal',
  'redaccion original',
  'version original',
];
const MENCIONES_CPC = ['cpc', 'codigo procesal civil', 'texto base', 'd211'];

export interface IntencionConsulta {
  historicaCPC: boolean;
}

/**
 * Intención histórica explícita: exige mención del CPC y un marcador textual
 * de tiempo o texto original. Nunca se infiere de similitud de embeddings.
 */
export function intencionHistoricaCPC(textoConsulta: string): boolean {
  const n = normalizarTexto(textoConsulta);
  const mencionaCPC = MENCIONES_CPC.some((m) => n.includes(m));
  const marcaHistorica = MARCADORES_HISTORICOS.some((m) => n.includes(m));
  return mencionaCPC && marcaHistorica;
}

export type CamposRol = Pick<LabRow, 'fuente' | 'fuente_tipo' | 'jurisdiccion' | 'es_norma_vigente' | 'num_articulo'>;

export function capaCLO(campos: CamposRol): CapaAbierta | null {
  const fuente = campos.fuente ?? '';
  if (RE_CODIGO_NOTARIADO.test(fuente) && (ARTICULOS_NOTARIADO_E2 as readonly string[]).includes(campos.num_articulo ?? '')) {
    return 'E2';
  }
  if (fuente.includes('CPC_TEXTO_BASE_D211-2006')) return 'E5';
  if (fuente.includes('Ley Especial de Adopciones de Honduras (Decreto 102-2018)')) return 'E6';
  return null;
}

export interface RolAsignado {
  rol: RolRecuperacion;
  capa: CapaAbierta | null;
  advertencia: string | null;
}

/**
 * Asigna rol a una unidad. PRIMARY exige estado existente y confiable
 * (código HN vigente y no perteneciente a una capa abierta). Todo lo demás
 * es CONTEXT, sin inferir autoridad a partir del texto.
 */
export function rolRecuperacion(campos: CamposRol, intencion: IntencionConsulta): RolAsignado {
  const capa = capaCLO(campos);
  if (capa === 'E5') {
    return intencion.historicaCPC
      ? { rol: 'CONTEXT', capa, advertencia: ADVERTENCIA_E5 }
      : { rol: 'EXCLUDED', capa, advertencia: ADVERTENCIA_E5 };
  }
  if (capa === 'E2') return { rol: 'CONTEXT', capa, advertencia: ADVERTENCIA_E2 };
  if (capa === 'E6') return { rol: 'SECONDARY', capa, advertencia: ADVERTENCIA_E6 };
  if (campos.fuente_tipo === 'codigo' && campos.es_norma_vigente === true && campos.jurisdiccion === 'HN') {
    return { rol: 'PRIMARY', capa: null, advertencia: null };
  }
  return { rol: 'CONTEXT', capa: null, advertencia: null };
}
