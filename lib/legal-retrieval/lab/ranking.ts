import { tieneEncabezadoArticulo } from '../exact-resolver';
import { rolRecuperacion, type IntencionConsulta } from './clo-policy';
import type {
  ClaveOrdenLegal,
  ComponentesRecuperacion,
  LabCandidate,
  RankedCandidate,
  RolRecuperacion,
} from './types';

/**
 * Pesos de la puntuación de recuperación. Sólo desempatan dentro de un mismo
 * nivel legal. No son confianza, probabilidad ni autoridad, y nunca compensan
 * un nivel legal superior.
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
}

export interface ResultadoRanking {
  ranking: RankedCandidate[];
  eventos: EventoPenalizacion[];
  excluidosPorRol: LabCandidate[];
}

const ORDEN_NIVELES: (keyof ClaveOrdenLegal)[] = [
  'rol_gate',
  'identidad_exacta',
  'vigencia',
  'relacion_verificada',
  'jerarquia_normativa',
  'jurisdiccion_materia',
  'penalizacion_espejo',
];

const VALOR_ROL: Record<Exclude<RolRecuperacion, 'EXCLUDED'>, number> = {
  PRIMARY: 3,
  SECONDARY: 2,
  CONTEXT: 1,
};

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
 * Ordena por niveles legales. Orden: rol, identidad exacta, vigencia (sólo
 * estado existente), relación verificada (neutral: no hay capa), jerarquía
 * (neutral: no hay tabla adjudicada), jurisdicción y materia, penalización de
 * espejo. Sólo después puntúa la recuperación.
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
    base.push({
      ...c,
      rol_recuperacion: asignado.rol,
      capa_clo: asignado.capa,
      advertencia_clo: asignado.advertencia,
      legal_order_key: {
        rol_gate: VALOR_ROL[asignado.rol],
        identidad_exacta: c.exact_match ? 1 : 0,
        vigencia: valorVigencia(c),
        relacion_verificada: 0,
        jerarquia_normativa: 0,
        jurisdiccion_materia:
          (c.jurisdiccion === 'HN' ? 2 : 0) + (contexto.materia !== null && c.materia === contexto.materia ? 1 : 0),
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
