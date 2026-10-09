import { tieneEncabezadoArticulo, type InstrumentoNormalizado } from '../exact-resolver';
import { rolRecuperacion, type IntencionConsulta } from './clo-policy';
import { evaluarRelevancia } from './relevance';
import type {
  ClaveOrdenLegal,
  ComponentesRecuperacion,
  LabCandidate,
  RankedCandidate,
} from './types';

/**
 * Pesos de la puntuación de recuperación. Sólo desempatan cuando todos los
 * campos del orden legal empatan. No son confianza, probabilidad, autoridad,
 * validez ni suficiencia.
 */
export const PESOS_RECUPERACION = {
  lexical: 1,
  semantic: 1,
  citation_completeness: 0.2,
} as const;

export const INVARIANTES_PUNTUACION_RECUPERACION = [
  'retrieval_order_score no es confianza jurídica',
  'retrieval_order_score no es probabilidad de corrección',
  'retrieval_order_score no es autoridad normativa',
  'retrieval_order_score no es validez jurídica',
  'retrieval_order_score no satisface suficiencia legal',
  'retrieval_order_score no compensa un nivel legal superior',
] as const;

export interface EventoPenalizacion {
  tipo: 'PENALIZA_MISMA_FUENTE_Y_ARTICULO';
  conservado: string;
  afectado: string;
}

export interface ContextoRanking {
  materia: string | null;
  intencion: IntencionConsulta;
  articulo?: string | null;
  instrumento?: InstrumentoNormalizado | null;
}

export interface ResultadoRanking {
  ranking: RankedCandidate[];
  eventos: EventoPenalizacion[];
  excluidosPorRol: LabCandidate[];
}

/**
 * Orden legal, después de las exclusiones duras y de la compuerta de rol:
 * identidad exacta, vigencia, relación verificada, jerarquía normativa,
 * jurisdicción, materia y penalización de espejo. Rol y relevancia no entran
 * aquí: el rol controla uso permitido, advertencias y suficiencia; la relevancia
 * controla suficiencia. Ninguno produce ventaja numérica de ranking.
 */
const ORDEN_NIVELES: (keyof ClaveOrdenLegal)[] = [
  'identidad_exacta',
  'vigencia',
  'relacion_verificada',
  'jerarquia_normativa',
  'jurisdiccion',
  'materia',
  'penalizacion_espejo',
];

function compararIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Orden lexicográfico: sólo el primer nivel que difiere decide. Mayor es mejor. */
export function compararOrdenLegal(a: ClaveOrdenLegal, b: ClaveOrdenLegal): number {
  for (const nivel of ORDEN_NIVELES) {
    if (a[nivel] !== b[nivel]) return b[nivel] - a[nivel];
  }
  return 0;
}

function compararCandidatos(a: RankedCandidate, b: RankedCandidate): number {
  const legal = compararOrdenLegal(a.legal_order_key, b.legal_order_key);
  if (legal !== 0) return legal;
  if (b.retrieval_order_score !== a.retrieval_order_score) {
    return b.retrieval_order_score - a.retrieval_order_score;
  }
  return compararIds(a.id, b.id);
}

function vigenciaInformativa(c: LabCandidate): RankedCandidate['vigencia_informativa'] {
  if (c.es_norma_vigente === true) return 'TRUE';
  if (c.es_norma_vigente === false) return 'FALSE';
  return 'UNKNOWN';
}

/** Vigencia sólo según el estado existente: TRUE > UNKNOWN > FALSE. Nunca se infiere. */
function valorVigencia(c: LabCandidate): number {
  if (c.es_norma_vigente === true) return 1;
  if (c.es_norma_vigente === false) return -1;
  return 0;
}

function componentesRecuperacion(c: LabCandidate): ComponentesRecuperacion {
  const numeroPresente = c.num_articulo !== null;
  const completitud =
    ((c.fuente.trim().length > 0 ? 1 : 0) +
      (numeroPresente ? 1 : 0) +
      (numeroPresente && tieneEncabezadoArticulo(c.contenido, c.num_articulo!) ? 1 : 0)) /
    3;
  return {
    lexical: c.lexical_score ?? 0,
    semantic: c.semantic_score ?? 0,
    citation_completeness: completitud,
  };
}

function puntuacionRecuperacion(comp: ComponentesRecuperacion): number {
  const total =
    PESOS_RECUPERACION.lexical * comp.lexical +
    PESOS_RECUPERACION.semantic * comp.semantic +
    PESOS_RECUPERACION.citation_completeness * comp.citation_completeness;
  return Math.round(total * 1e6) / 1e6;
}

/**
 * Ordena por orden legal lexicográfico. La puntuación de recuperación sólo
 * desempata cuando todo el orden legal empata. La compuerta de rol excluye EXCLUDED
 * y no ordena. La relevancia se calcula y se adjunta, pero no ordena.
 */
export function puntuarCandidatos(
  candidatos: readonly LabCandidate[],
  contexto: ContextoRanking,
): ResultadoRanking {
  const excluidosPorRol: LabCandidate[] = [];
  const base: RankedCandidate[] = [];

  for (const c of candidatos) {
    const asignado = rolRecuperacion(c, contexto.intencion);
    if (asignado.rol === 'EXCLUDED') {
      excluidosPorRol.push(c);
      continue;
    }
    const comp = componentesRecuperacion(c);
    const relevancia = evaluarRelevancia(c, {
      articulo: contexto.articulo ?? null,
      instrumento: contexto.instrumento ?? null,
      materia: contexto.materia,
    });
    base.push({
      ...c,
      rol_recuperacion: asignado.rol,
      relevancia_clo: relevancia,
      capa_clo: asignado.capa,
      advertencia_clo: asignado.advertencia,
      legal_order_key: {
        identidad_exacta: c.exact_match ? 1 : 0,
        vigencia: valorVigencia(c),
        relacion_verificada: 0,
        jerarquia_normativa: 0,
        jurisdiccion: c.jurisdiccion === 'HN' ? 1 : 0,
        materia: contexto.materia !== null && c.materia === contexto.materia ? 1 : 0,
        penalizacion_espejo: 0,
      },
      retrieval_components: comp,
      retrieval_order_score: puntuacionRecuperacion(comp),
      vigencia_informativa: vigenciaInformativa(c),
    });
  }

  base.sort(compararCandidatos);

  const vistos = new Map<string, RankedCandidate>();
  const eventos: EventoPenalizacion[] = [];
  for (const c of base) {
    if (c.num_articulo === null) continue;
    const clave = `${c.fuente}\u0000${c.num_articulo}`;
    const conservado = vistos.get(clave);
    if (!conservado) {
      vistos.set(clave, c);
      continue;
    }
    c.legal_order_key = { ...c.legal_order_key, penalizacion_espejo: -1 };
    eventos.push({ tipo: 'PENALIZA_MISMA_FUENTE_Y_ARTICULO', conservado: conservado.id, afectado: c.id });
  }

  base.sort(compararCandidatos);
  return { ranking: base, eventos, excluidosPorRol };
}
