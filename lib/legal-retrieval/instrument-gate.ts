/**
 * lib/legal-retrieval/instrument-gate.ts
 * P1 — intención instrumental (producción). Módulo puro: sin Supabase, sin red.
 *
 * Regla vinculante: EXPLICIT_INSTRUMENT_INTENT > MATERIA. La materia nunca
 * autoriza por sí sola un candidato semántico.
 *
 * Estados de la intención:
 * - NONE: no hay referencia a un instrumento particular. Sin filtro (comportamiento previo).
 * - SPECIFIC_RESOLVED: una identidad resuelta. Sólo fuentes que la confirman.
 * - MULTI_SPECIFIC_RESOLVED: varias identidades resueltas (comparación). Unión
 *   de las identidades; la respuesta exige evidencia de cada una. Si la
 *   comparación pide un artículo, cada instrumento debe aportar ese artículo;
 *   varios artículos no tienen correspondencia establecida y se abstiene.
 * - SPECIFIC_UNRESOLVED: una referencia inequívocamente identificada que no se
 *   resuelve a identidad. Fail-close: ningún candidato semántico es evidencia
 *   verificada, aunque haya otra identidad resuelta en la misma consulta.
 *
 * Qué cuenta como referencia específica sin resolver: una clase (ley, decreto,
 * resolución, acuerdo, código, reglamento) seguida de un identificador (número
 * o código, p. ej. "130-2017", "PCSJ-17-2012") o de un título reconocido
 * ("notarial", "notariado"). Todo lo demás es lenguaje temático o de actos
 * jurídicos y es NONE: materias ("ley civil", "en materia penal"), actos
 * ("acuerdo de pago", "resolución del contrato"), temas ("ley sobre el
 * divorcio"), verbos ("el código dice…") y mayúsculas o palabras desconocidas
 * sin identificador. Las identidades reconocidas (detectarIdentidadesDesdeTexto)
 * tienen precedencia sobre cualquier otra señal.
 */

import { detectarIdentidadesDesdeTexto, identidadDeFuente, type InstrumentoNormalizado } from './exact-resolver';

export type EstadoIntencionInstrumental =
  | 'NONE'
  | 'SPECIFIC_RESOLVED'
  | 'MULTI_SPECIFIC_RESOLVED'
  | 'SPECIFIC_UNRESOLVED';

export interface IntencionInstrumental {
  estado: EstadoIntencionInstrumental;
  /** Identidades resueltas, sin duplicados. Se conservan también en SPECIFIC_UNRESOLVED. */
  identidades: InstrumentoNormalizado[];
  /** Números de artículo que pide la consulta, sin duplicados (vacío si no pide ninguno). */
  articulos: string[];
}

export type PredicadoFuente = (fuente: string) => boolean;

const NORMALIZAR = (texto: string): string =>
  texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const CLASES_RE = /\b(codigo|reglamento|ley|decreto|resolucion|acuerdo)\b/g;
const ARTICULO_RE = /\bart(?:iculo|\.)?\s*(\d+)\b/g;

// Títulos reconocidos de instrumentos sectoriales. Un título reconocido sin
// resolver ("la ley notarial") es referencia específica. No se mapea a un
// instrumento concreto: la identidad sólo la resuelve el detector.
const TITULOS_RECONOCIDOS = new Set(['notarial', 'notariado']);

/**
 * true si lo que sigue a una clase de instrumento es una referencia específica
 * sin resolver: un identificador (dígitos, p. ej. "130-2017" o "de 2018") o un
 * título reconocido, dentro de las seis palabras siguientes y antes de cualquier
 * mención de artículo (el número de un artículo no identifica al instrumento).
 * Cualquier otra palabra (materia, acto, tema, verbo, mayúscula) no basta.
 */
function referenciaEspecifica(resto: string): boolean {
  const palabras: string[] = [];
  for (const p of (resto.split(/[?¿!¡,;:()]/)[0] ?? '').trim().split(/\s+/).map((t) => t.replace(/\.+$/, ''))) {
    if (!p) continue;
    if (/^art(iculo)?$/.test(p)) break;
    palabras.push(p);
    if (palabras.length === 6) break;
  }
  if (palabras.some((p) => /\d/.test(p))) return true;
  return palabras.some((p) => TITULOS_RECONOCIDOS.has(p));
}

/** Cuenta las referencias de clase que no están cubiertas por una identidad resuelta y son específicas. */
function contarReferenciasPendientes(
  texto: string,
  identidades: { inicio: number; fin: number }[],
): number {
  let pendientes = 0;
  for (const m of texto.matchAll(CLASES_RE)) {
    const inicio = m.index ?? 0;
    const fin = inicio + m[0].length;
    if (identidades.some((i) => i.inicio <= inicio && fin <= i.fin)) continue;
    if (referenciaEspecifica(texto.slice(fin))) pendientes++;
  }
  return pendientes;
}

/** Clasifica la intención instrumental de una consulta en uno de los cuatro estados. */
export function clasificarIntencionInstrumental(texto: string): IntencionInstrumental {
  const n = NORMALIZAR(texto);
  const detectadas = detectarIdentidadesDesdeTexto(n);
  const identidades = [...new Set(detectadas.map((d) => d.instrumento))];
  const articulos = [...new Set([...n.matchAll(ARTICULO_RE)].map((m) => m[1]))];
  if (contarReferenciasPendientes(n, detectadas) > 0) return { estado: 'SPECIFIC_UNRESOLVED', identidades, articulos };
  if (identidades.length === 0) return { estado: 'NONE', identidades, articulos };
  return {
    estado: identidades.length === 1 ? 'SPECIFIC_RESOLVED' : 'MULTI_SPECIFIC_RESOLVED',
    identidades,
    articulos,
  };
}

/**
 * Elegibilidad de un candidato semántico según la intención:
 * - NONE: sin filtro.
 * - SPECIFIC_RESOLVED / MULTI_SPECIFIC_RESOLVED: sólo fuentes cuya identidad
 *   real está entre las identidades resueltas. Una fuente sin identidad no entra.
 * - SPECIFIC_UNRESOLVED: nada entra (fail-close hasta resolver la identidad).
 */
export function elegibilidadSemantica(intencion: IntencionInstrumental): PredicadoFuente {
  if (intencion.estado === 'NONE') return () => true;
  if (intencion.estado === 'SPECIFIC_UNRESOLVED') return () => false;
  return (fuente) => {
    const identidad = identidadDeFuente(fuente);
    return identidad !== null && intencion.identidades.includes(identidad);
  };
}

/** Todos los fragmentos son elegibles y cada identidad resuelta aparece al menos una vez. */
function identidadesCubiertas(fragmentos: readonly { fuente: string }[], intencion: IntencionInstrumental): boolean {
  const elegible = elegibilidadSemantica(intencion);
  return (
    fragmentos.every((f) => elegible(f.fuente)) &&
    intencion.identidades.every((id) => fragmentos.some((f) => identidadDeFuente(f.fuente) === id))
  );
}

/**
 * Evidencia final que puede enviarse como contexto. Devuelve [] si no hay
 * cobertura completa. En una comparación con un artículo concreto, sólo cuentan
 * los fragmentos de ese artículo, uno por instrumento: un fragmento de otro
 * artículo no autoriza la comparación. Con más de un artículo pedido no hay
 * correspondencia establecida, así que se abstiene.
 */
export function evidenciaFinal<T extends { fuente: string; num_articulo?: string | null }>(
  fragmentos: readonly T[],
  intencion: IntencionInstrumental,
): T[] {
  if (!identidadesCubiertas(fragmentos, intencion)) return [];
  if (intencion.estado !== 'MULTI_SPECIFIC_RESOLVED' || intencion.articulos.length === 0) return [...fragmentos];
  if (intencion.articulos.length > 1) return [];
  const articulo = intencion.articulos[0];
  const delArticulo = fragmentos.filter((f) => f.num_articulo === articulo);
  return identidadesCubiertas(delArticulo, intencion) ? delArticulo : [];
}

/** true si todos los fragmentos dados sobreviven a la evidencia final (y hay al menos uno). */
export function evidenciaCubreIntencion(
  fragmentos: readonly { fuente: string; num_articulo?: string | null }[],
  intencion: IntencionInstrumental,
): boolean {
  return fragmentos.length > 0 && evidenciaFinal(fragmentos, intencion).length === fragmentos.length;
}

/**
 * Fragmentos del pase procedimental que pueden añadirse al contexto junto al
 * principal. Sólo se añaden los que sobreviven a la evidencia final de la unión:
 * elegibles y verificables del instrumento y, si la consulta pide un artículo,
 * de ese artículo. El pase procedimental no relaja ninguno de esos criterios.
 */
export function evidenciaProcedimentalPermitida<T extends { fuente: string; num_articulo?: string | null }>(
  principal: readonly T[],
  procedimental: readonly T[],
  intencion: IntencionInstrumental,
): T[] {
  const finalUnido = evidenciaFinal([...principal, ...procedimental], intencion);
  return procedimental.filter((f) => finalUnido.includes(f));
}
