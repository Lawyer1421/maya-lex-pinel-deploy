import { identidadDocumentalCoincide } from '../exact-resolver';
import { normalizarTexto } from './normalize';
import { aFilaExacta } from './exact-lab';
import type { LabRow, RolRecuperacion } from './types';

/**
 * Decisión CLO vinculante (2026-10-09, versión final V4.0-A.2). Sólo
 * laboratorio: no es esquema de producción ni modifica el corpus.
 */
export const DECISION_CLO = {
  fecha: '2026-10-09',
  version: 'V4.0-A.2',
  registro: 'docs/corpus/MAYALEX_CANONICAL_ADJUDICATION_REGISTER_V1.md',
  politica_ranking: 'HYBRID',
  confianza_juridica_numerica_permitida: false,
  primary_solo_crea_suficiencia: false,
  umbral_numerico_de_relevancia_adjudicado: false,
  regla_vinculante:
    'RETRIEVAL_ROLE ≠ RELEVANCE ≠ SUFFICIENCY. Ninguna unidad de E2, E5 o E6 puede ser PRIMARY ni satisfacer suficiencia por sí sola mientras esas capas estén OPEN.',
} as const;

/** E2 abierta: la excepción D6b del Notariado caduca al cerrar E2. */
export const E2_ABIERTA = true;

export type CapaAbierta = 'E2' | 'E5' | 'E6';

export const ADVERTENCIA_E2 =
  'Estado legal no adjudicado; posible derogación por el Decreto 77-2006, pendiente de verificación con el texto oficial de La Gaceta.';
export const ADVERTENCIA_E5 =
  'CPC_TEXTO_BASE_D211-2006: rol temporal no adjudicado; sólo contexto histórico con consulta explícita';
export const ADVERTENCIA_E6 =
  'Estado canónico y completitud permanecen no resueltos y no medidos.';

export const ARTICULOS_NOTARIADO_E2 = ['72', '73', '84', '87', '93'] as const;

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
 * Intención histórica explícita: exige mención del CPC y un marcador textual.
 * Nunca se infiere de similitud de embeddings.
 */
export function intencionHistoricaCPC(textoConsulta: string): boolean {
  const n = normalizarTexto(textoConsulta);
  const mencionaCPC = MENCIONES_CPC.some((m) => n.includes(m));
  const marcaHistorica = MARCADORES_HISTORICOS.some((m) => n.includes(m));
  return mencionaCPC && marcaHistorica;
}

export type CamposRol = Pick<LabRow, 'fuente' | 'fuente_tipo' | 'jurisdiccion' | 'es_norma_vigente' | 'num_articulo'>;

/**
 * Identidad por instrumento (identidadDocumentalCoincide de producción) más
 * número de artículo. El número solo nunca basta.
 */
export function esNotariadoE2(fila: CamposRol & { contenido?: string; id?: string; materia?: string | null }): boolean {
  if (!ARTICULOS_NOTARIADO_E2.includes((fila.num_articulo ?? '') as (typeof ARTICULOS_NOTARIADO_E2)[number])) {
    return false;
  }
  const filaExacta = aFilaExacta({
    id: fila.id ?? '',
    contenido: fila.contenido ?? '',
    num_articulo: fila.num_articulo,
    fuente: fila.fuente,
    fuente_tipo: fila.fuente_tipo,
    jurisdiccion: fila.jurisdiccion,
    es_norma_vigente: fila.es_norma_vigente,
    materia: fila.materia ?? null,
  });
  return identidadDocumentalCoincide(filaExacta, 'CODIGO_NOTARIADO');
}

export function capaCLO(campos: CamposRol & { contenido?: string; id?: string; materia?: string | null }): CapaAbierta | null {
  if (esNotariadoE2(campos)) return 'E2';
  const fuente = campos.fuente ?? '';
  if (fuente.includes('CPC_TEXTO_BASE_D211-2006')) return 'E5';
  if (fuente.includes('Ley Especial de Adopciones de Honduras (Decreto 102-2018)')) return 'E6';
  return null;
}

/** Excepción de E2 a D6b: sólo mientras E2 esté abierta y la identidad coincida. */
export function excepcionE2AD6b(campos: CamposRol & { contenido?: string; id?: string; materia?: string | null }): boolean {
  return E2_ABIERTA && capaCLO(campos) === 'E2';
}

export interface RolAsignado {
  rol: RolRecuperacion;
  capa: CapaAbierta | null;
  advertencia: string | null;
}

/**
 * Asigna rol. PRIMARY requiere código HN, vigencia booleana TRUE y ninguna capa
 * abierta. UNKNOWN nunca es PRIMARY. FALSE no llega aquí en consulta normal.
 */
export function rolRecuperacion(
  campos: CamposRol & { contenido?: string; id?: string; materia?: string | null },
  intencion: IntencionConsulta,
): RolAsignado {
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
