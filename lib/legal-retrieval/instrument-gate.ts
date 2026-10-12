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
 * o código, p. ej. "130-2017", "PCSJ-17-2012"), de un título reconocido
 * ("notarial", "notariado") o de un título particular introducido por "de/del"
 * ("ley de Adopciones", "ley de Inquilinato"). Un año no identifica por sí solo.
 * Es NONE: los temas ("ley sobre el divorcio", "acerca de"), las materias
 * genéricas ("ley civil", "en materia penal"), los actos jurídicos ("resolución
 * del contrato", "acuerdo de pago"), los verbos ("el código dice…") y las
 * palabras sin identificador. Las identidades reconocidas
 * (detectarIdentidadesDesdeTexto) tienen precedencia sobre cualquier otra señal.
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

// Léxico de la frontera. Las palabras están normalizadas (sin acentos, minúsculas).

// Título reconocido e inequívoco: "la ley notarial" (C10). No se mapea a un
// instrumento: la identidad sólo la resuelve el detector.
const TITULOS_RECONOCIDOS = new Set(['notarial', 'notariado']);

// Calificadores territoriales de la clase "ley". No nombran un título.
const JURISDICCION_LEY = new Set(['honduras', 'hondurena', 'hondureno', 'nacional', 'republica']);

// Adjetivos que acompañan a un título ("Ley Especial de Adopciones").
const ADJETIVOS_TITULO = new Set(['especial', 'especiales', 'organica', 'organico', 'general', 'marco']);

// Artículos que pueden intercalarse tras "de" ("de la república", "de las 8 horas").
const ARTICULOS_DE = new Set(['la', 'el', 'los', 'las']);

// Actos jurídicos y materias: lo que sigue a "de/del" no es un título particular.
const ACTO_O_MATERIA = new Set([
  'contrato', 'contratos', 'pago', 'pagos', 'partes', 'parte', 'deuda', 'deudas',
  'obligacion', 'obligaciones', 'sociedad', 'sociedades', 'hipoteca', 'garantia',
  'fideicomiso', 'compraventa', 'arrendamiento', 'herencia', 'sucesion', 'familia',
  'derecho', 'derechos', 'materia', 'mora', 'cumplimiento', 'ejecucion', 'sentencia',
  'sentencias', 'juicio', 'proceso', 'procedimiento', 'recurso', 'apelacion', 'acto',
  'actos', 'bienes', 'propiedad', 'cosa', 'cosas', 'delito', 'delitos', 'falta', 'faltas',
]);

/** Año contextual: no identifica por sí solo un instrumento. */
const esAnio = (w: string): boolean => /^(19|20)\d{2}$/.test(w);

/** Identificador: contiene dígitos y no es sólo un año ("130-2017", "PCSJ-17-2012", "8"). */
const esIdentificador = (w: string): boolean => /\d/.test(w) && !esAnio(w);

/**
 * Identificadores documentales verificados: los números de decreto o resolución
 * que aparecen en el nombre real de la fuente de cada instrumento (fixtures y
 * artefactos del repositorio). Un código de la consulta sólo se absorbe si está
 * aquí; si no, es un conflicto ("Código Civil 130-2017" no identifica al Civil).
 * Minúsculas, como el texto normalizado.
 */
export const IDENTIFICADORES_DOCUMENTALES: Partial<Record<InstrumentoNormalizado, readonly string[]>> = {
  CODIGO_PROCESAL_PENAL: ['9-99-e'],      // Código Procesal Penal de Honduras (Decreto 9-99-E)
  // Código Penal = Decreto 130-2017: lib/normas-cpp.ts ("CÓDIGO PENAL HONDURAS (D.130-2017)"),
  // docs/retrieval/OFFICIAL_HONDURAS_SOURCE_REGISTRY.md ("Código Penal Decreto 130-2017").
  CODIGO_PENAL: ['130-2017'],
  CODIGO_NOTARIADO: ['353-2005'],         // Código del Notariado de Honduras (Decreto 353-2005)
  REGLAMENTO_NOTARIADO: ['pcsj-17-2012'], // Reglamento del Código del Notariado (Resolución PCSJ-17-2012)
  CODIGO_TRIBUTARIO: ['170-2016'],        // Codigo Tributario (Decreto 170-2016 - ...)
  CODIGO_COMERCIO: ['73-1950'],           // Codigo de Comercio (Decreto No. 73-1950, ...)
  CONSTITUCION: ['131-1982'],             // Constitucion de la Republica (Decreto 131-1982 - ...)
};

/** Código documental: token con guion y dígitos ("130-2017", "pcsj-17-2012"). */
const esCodigoDocumental = (w: string): boolean => /-/.test(w) && /\d/.test(w);

/**
 * true si lo que sigue a una clase de instrumento es una referencia específica
 * sin resolver. Se recorre la frase desde la clase, antes de cualquier mención de
 * artículo y en un máximo de seis palabras:
 * - tema ("sobre …", "acerca de …") → no es específica (NONE), para cualquier clase;
 * - identificador ("130-2017") o título reconocido ("notarial") → específica;
 * - "de/del" + título particular ("de Adopciones", "de Inquilinato", "de las 8
 *   horas") → específica; "de/del" + acto o materia ("del contrato", "de pago") o
 *   + año ("de 2018") → NONE;
 * - jurisdicción de la clase "ley" ("hondureña", "de Honduras") y adjetivos de
 *   título ("especial") se saltan;
 * - cualquier otra palabra (adjetivo temático, verbo, materia) → NONE.
 * Un año no identifica por sí solo al instrumento.
 */
/** Palabras que siguen a una clase: hasta puntuación, máximo seis, sin pasar a una mención de artículo. */
function tokensReferencia(resto: string): string[] {
  const t: string[] = [];
  for (const p of (resto.split(/[?¿!¡,;:()]/)[0] ?? '').trim().split(/\s+/).map((x) => x.replace(/\.+$/, ''))) {
    if (!p) continue;
    if (/^art(iculo)?$/.test(p)) break;
    t.push(p);
    if (t.length === 6) break;
  }
  return t;
}

// Clases en las que "de/del + X" puede ser un acto jurídico ("resolución del
// contrato", "acuerdo de pago"). En las demás clases, "de X" es un título particular.
const CLASES_CON_ACTOS = new Set(['resolucion', 'acuerdo']);

function referenciaEspecifica(resto: string, clase: string): boolean {
  const t = tokensReferencia(resto);
  const jurisdiccion = (w: string): boolean => clase === 'ley' && JURISDICCION_LEY.has(w);
  let i = 0;
  while (i < t.length) {
    const w = t[i];
    if (w === 'sobre' || (w === 'acerca' && (t[i + 1] === 'de' || t[i + 1] === 'del'))) return false;
    if (jurisdiccion(w) || ADJETIVOS_TITULO.has(w)) {
      i++;
      continue;
    }
    // Un año tras la clase ("ley 2018", "ley de 2018") es referencia específica sin
    // resolver. El año no identifica al instrumento: no se resuelve identidad con él.
    if (esAnio(w)) return true;
    if (esIdentificador(w) || TITULOS_RECONOCIDOS.has(w)) return true;
    if (w === 'de' || w === 'del') {
      let j = i + 1;
      while (j < t.length && ARTICULOS_DE.has(t[j])) j++;
      const x = t[j];
      if (x === undefined) return false;
      if (jurisdiccion(x)) {
        i = j + 1;
        continue;
      }
      if (esAnio(x)) return true;
      if (CLASES_CON_ACTOS.has(clase) && ACTO_O_MATERIA.has(x)) return false;
      return true;   // título particular: "de Adopciones", "de Propiedad", "de las 8 horas"
    }
    return false;
  }
  return false;
}

/** Cuenta las referencias de clase que no están cubiertas por una identidad resuelta y son específicas. */
/** Forma canónica de un código documental: "D.353-2005" y "d.353-2005" son "353-2005". */
const normalizarCodigo = (w: string): string => w.replace(/^d\./, '');

function contarReferenciasPendientes(
  cadena: string,
  identidades: { instrumento: InstrumentoNormalizado; inicio: number; fin: number }[],
): number {
  const resueltas = [...new Set(identidades.map((i) => i.instrumento))];
  const verificadoPara = (codigo: string, instrumento: InstrumentoNormalizado): boolean =>
    (IDENTIFICADORES_DOCUMENTALES[instrumento] ?? []).includes(codigo);
  let pendientes = 0;
  for (const m of cadena.matchAll(CLASES_RE)) {
    const inicio = m.index ?? 0;
    const fin = inicio + m[0].length;
    const cubierta = identidades.find((i) => i.inicio <= inicio && fin <= i.fin);
    const codigos = tokensReferencia(cadena.slice(fin)).filter(esCodigoDocumental).map(normalizarCodigo);
    if (codigos.length > 0) {
      // Código documental: se absorbe sólo si su correspondencia con una identidad
      // resuelta está verificada. Si la clase está cubierta, con su propia identidad;
      // si no, con cualquier identidad de la consulta. Si no, es conflicto.
      const candidatas = cubierta ? [cubierta.instrumento] : resueltas;
      const absorbido = codigos.every((c) => candidatas.some((id) => verificadoPara(c, id)));
      if (!absorbido) pendientes++;
      continue;
    }
    if (cubierta) continue;
    if (referenciaEspecifica(cadena.slice(fin), m[1])) pendientes++;
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
 * cobertura completa.
 *
 * Alcance del filtro por artículo: sólo para MULTI_SPECIFIC_RESOLVED (comparación)
 * con un único artículo pedido. Entonces cuentan sólo los fragmentos de ese
 * artículo, uno por instrumento; un fragmento de otro artículo no autoriza la
 * comparación. Con más de un artículo pedido no hay correspondencia establecida,
 * y se abstiene. Una identidad única (SPECIFIC_RESOLVED) no se filtra por
 * artículo: esa decisión se mantiene.
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
