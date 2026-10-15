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
 * palabras sin identificador. Las denominaciones institucionales ("CNBS", "Consejo
 * de Ministros", "Esquipulas") son específicas sin resolver sólo si figuran en el
 * fixture cerrado CLO_PR62_DENOMINACIONES_V2 (sin heurística de mayúsculas ni de
 * nombres propios) Y siguen a «resolución/acuerdo/decreto/reglamento» + de/del
 * (alcance V2). Un órgano mencionado sin clase de instrumento ("según la CSJ", "el
 * Ministerio Público") no activa el fixture: se conserva la identidad detectada, o NONE.
 * Sólo las entradas que contienen la clase ("Acuerdo de Escazú") o «Paz de Esquipulas»
 * se detectan solas. Las identidades reconocidas (detectarIdentidadesDesdeTexto)
 * tienen precedencia sobre cualquier otra señal.
 *
 * Códigos documentales: un código verificado (IDENTIFICADORES_DOCUMENTALES) puede
 * identificar al instrumento cuando aparece sin nombre en la consulta, si su
 * correspondencia es única. Si la consulta ya nombra una identidad, el código debe
 * estar verificado para ella; si no, es conflicto y queda SPECIFIC_UNRESOLVED.
 */

import { detectarIdentidadesDesdeTexto, identidadDeFuente, type InstrumentoNormalizado } from './exact-resolver';
import denominacionesClo from './fixtures/clo-pr62-denominaciones-v2.json';

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

// Adjetivos que acompañan a un título ("Ley Especial de Adopciones", "Ley Marco de …").
const ADJETIVOS_TITULO = new Set(['especial', 'especiales', 'organica', 'organico', 'general', 'marco']);

// Artículos que pueden intercalarse tras "de" ("de la república", "de las 8 horas").
const ARTICULOS_DE = new Set(['la', 'el', 'los', 'las']);

// Clases de decisiones y acuerdos. Lo que sigue a "de/del" es lenguaje genérico
// ("resolución del juez", "acuerdo de voluntades", "resolución del contrato"), salvo
// que sea un identificador verificable, un año o un título reconocido. En las demás
// clases, "de X" es un título particular.
const CLASES_GENERICAS_DE = new Set(['resolucion', 'acuerdo']);

/** Año contextual: no identifica por sí solo un instrumento. */
const esAnio = (w: string): boolean => /^(19|20)\d{2}$/.test(w);

/** Identificador: contiene dígitos y no es sólo un año ("130-2017", "PCSJ-17-2012", "8"). */
const esIdentificador = (w: string): boolean => /\d/.test(w) && !esAnio(w);

/**
 * Identificadores documentales verificados: los números de decreto o resolución
 * que aparecen en el nombre real de la fuente de cada instrumento (fixtures y
 * artefactos del repositorio). Minúsculas, como el texto normalizado.
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

/**
 * Denominaciones del fixture CLO_PR62_DENOMINACIONES_V2. Comparación insensible a
 * mayúsculas, minúsculas y tildes, por palabra completa y sólo contra el fixture.
 * Una palabra en mayúsculas que no figura en la lista NO es sigla. Toda entrada
 * nueva requiere revisión CLO (y subir la versión del fixture). Ninguna entrada
 * aporta identidad: la identidad sólo sale del registro canónico.
 */
interface EntradaDenominacion {
  readonly institucional: boolean;
  /** Se detecta sola (sin clase de acto antes): contiene la clase, o es «Paz de Esquipulas». */
  readonly autonoma: boolean;
  readonly patron: RegExp;
}

const ENTRADAS_DENOMINACION: readonly EntradaDenominacion[] = (() => {
  const escapar = (t: string): string => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const construir = (frase: string, institucional: boolean): EntradaDenominacion => {
    const cuerpo = NORMALIZAR(frase).trim().split(/\s+/).map(escapar).join('\\s+');
    const autonoma = /(?:resolucion|acuerdo)|^paz de esquipulas$/.test(NORMALIZAR(frase).trim());
    // Palabra completa: ni letra ni dígito pegados a los lados ("ip" no es "tipo").
    return { institucional, autonoma, patron: new RegExp(`(?<![\\p{L}\\p{N}])${cuerpo}(?![\\p{L}\\p{N}])`, 'gu') };
  };
  const { siglas, nombres } = denominacionesClo.institucionales;
  return [
    ...[...siglas, ...nombres].map((f) => construir(f, true)),
    ...denominacionesClo.genericos.map((f) => construir(f, false)),
  ];
})();

/** Entradas que se detectan solas: contienen la clase de acto, o son el tratado «Paz de Esquipulas». */
const ENTRADAS_AUTONOMAS: readonly EntradaDenominacion[] = ENTRADAS_DENOMINACION.filter(
  (e) => e.institucional && e.autonoma,
);

/**
 * Coincidencias (inicio, fin, institucional) del fixture que sobreviven al solapamiento.
 * Conflicto entre coincidencias que se solapan: gana la más larga ("Sala de lo
 * Constitucional" es institucional; "la sala" sola es genérica → NONE). A igual
 * longitud gana la institucional (fail-close). Una mención genérica no anula
 * ninguna otra señal: sólo desempata frente a una coincidencia institucional más corta.
 */
function coincidenciasElegidas(
  texto: string,
  entradas: readonly EntradaDenominacion[],
): { inicio: number; fin: number; institucional: boolean }[] {
  const coincidencias: { inicio: number; fin: number; institucional: boolean }[] = [];
  for (const { institucional, patron } of entradas) {
    for (const m of texto.matchAll(patron)) {
      const inicio = m.index ?? 0;
      coincidencias.push({ inicio, fin: inicio + m[0].length, institucional });
    }
  }
  coincidencias.sort(
    (a, b) => b.fin - b.inicio - (a.fin - a.inicio) || Number(b.institucional) - Number(a.institucional),
  );
  const elegidas: typeof coincidencias = [];
  for (const c of coincidencias) {
    if (elegidas.some((e) => c.inicio < e.fin && e.inicio < c.fin)) continue;
    elegidas.push(c);
  }
  return elegidas;
}

/** Clase de acto seguida de de/del (+ artículos): lo que sigue es la denominación del órgano. */
const CLASE_ACTO_DE_RE = /\b(?:resolucion|acuerdo|decreto|reglamento)\s+(?:de|del)\s+(?:(?:la|el|los|las)\s+)*/g;

/**
 * true si la consulta atribuye un acto a una denominación institucional del fixture.
 * Alcance (V2): el fixture sólo se aplica a la denominación que sigue a
 * «resolución/acuerdo/decreto/reglamento» + de/del (+ artículos). Un órgano mencionado
 * sin clase de instrumento no activa el fixture (se conserva la identidad detectada, o
 * NONE). Las entradas que contienen la clase («Acuerdo de Escazú») y «Paz de Esquipulas»
 * se detectan solas, en cualquier posición. Si tras la clase viene una identidad reconocida,
 * la cadena sigue tras ese tramo: «resolución del Código del Notariado de la CNBS» sigue
 * siendo SPECIFIC_UNRESOLVED (fail-close).
 */
function mencionaDenominacionInstitucional(
  textoNormalizado: string,
  identidades: readonly { inicio: number; fin: number }[] = [],
): boolean {
  if (coincidenciasElegidas(textoNormalizado, ENTRADAS_AUTONOMAS).some((c) => c.institucional)) return true;
  for (const clase of textoNormalizado.matchAll(CLASE_ACTO_DE_RE)) {
    let desde = (clase.index ?? 0) + clase[0].length;
    // Identidad reconocida justo tras la clase («resolución del Código del Notariado de la CNBS»):
    // la cadena sigue tras el tramo identificado, anclada a su final (fail-close).
    // Con las identidades en blanco, entre «clase de/del» y el final del tramo sólo quedan espacios.
    const identificada = identidades.find(
      (i) =>
        i.inicio >= (clase.index ?? 0) &&
        textoNormalizado.slice(clase.index, i.fin).replace(/^\S+\s+(?:de|del)\b/, '').trim() === '',
    );
    if (identificada) {
      const enlace = /^\s*(?:de|del)\s+(?:(?:la|el|los|las)\s+)*/.exec(textoNormalizado.slice(identificada.fin));
      if (!enlace) continue;
      desde = identificada.fin + enlace[0].length;
    }
    const resto = textoNormalizado.slice(desde).split(/[?¿!¡,;:()]/)[0] ?? '';
    // La denominación debe empezar justo después de la clase; gana la coincidencia más larga.
    if (coincidenciasElegidas(resto, ENTRADAS_DENOMINACION).some((c) => c.institucional && c.inicio === 0)) {
      return true;
    }
  }
  return false;
}

/**
 * Texto normalizado con las menciones ya cubiertas por una identidad reconocida en
 * blanco. Así una mención identificada no genera una referencia pendiente adicional,
 * pero las demás menciones de la consulta siguen contando. Los índices de las
 * identidades son del texto normalizado, el mismo que se recibe aquí.
 */
function sinMencionesIdentificadas(
  textoNormalizado: string,
  identidades: readonly { inicio: number; fin: number }[],
): string {
  let salida = textoNormalizado;
  for (const { inicio, fin } of identidades) {
    salida = salida.slice(0, inicio) + ' '.repeat(fin - inicio) + salida.slice(fin);
  }
  return salida;
}

/** Código documental: token con guion y dígitos ("130-2017", "pcsj-17-2012"). */
const esCodigoDocumental = (w: string): boolean => /-/.test(w) && /\d/.test(w);

/** Forma canónica de un código documental: "D.353-2005" y "d.353-2005" son "353-2005". */
const normalizarCodigo = (w: string): string => w.replace(/^d\./, '');

/** Instrumento de cada código verificado, sólo cuando el código identifica a un único instrumento. */
const CODIGO_A_INSTRUMENTO: ReadonlyMap<string, InstrumentoNormalizado> = (() => {
  const porCodigo = new Map<string, InstrumentoNormalizado[]>();
  for (const [instrumento, codigos] of Object.entries(IDENTIFICADORES_DOCUMENTALES)) {
    for (const codigo of codigos ?? []) {
      porCodigo.set(codigo, [...(porCodigo.get(codigo) ?? []), instrumento as InstrumentoNormalizado]);
    }
  }
  const unicos = new Map<string, InstrumentoNormalizado>();
  for (const [codigo, instrumentos] of porCodigo) {
    if (instrumentos.length === 1) unicos.set(codigo, instrumentos[0]);
  }
  return unicos;
})();

const verificadoPara = (codigo: string, instrumento: InstrumentoNormalizado): boolean =>
  (IDENTIFICADORES_DOCUMENTALES[instrumento] ?? []).includes(codigo);

/**
 * Palabras que siguen a una clase: hasta puntuación, máximo seis, sin pasar a una
 * mención de artículo.
 */
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

/**
 * true si lo que sigue a una clase de instrumento es una referencia específica
 * sin resolver. Se recorre la frase desde la clase, antes de cualquier mención de
 * artículo y en un máximo de seis palabras:
 * - tema ("sobre …", "acerca de …") → no es específica (NONE), para cualquier clase;
 * - año, identificador ("130-2017") o título reconocido ("notarial") → específica;
 * - "de/del" + título particular ("de Adopciones", "de Propiedad", "de las 8
 *   horas") → específica en las clases ley, decreto, reglamento y código. En las
 *   clases resolución y acuerdo, "de/del" + palabra genérica ("del juez", "de la
 *   Sala", "de voluntades", "del contrato") es NONE; sólo son específicas un
 *   identificador verificable o un título reconocido. "de/del" + año es específica;
 * - jurisdicción de la clase "ley" ("hondureña", "de Honduras") y adjetivos de
 *   título ("especial", "marco") se saltan;
 * - cualquier otra palabra (adjetivo temático, verbo, materia) → NONE.
 * Un año no identifica por sí solo al instrumento.
 */
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
      if (CLASES_GENERICAS_DE.has(clase)) {
        return esIdentificador(x) || TITULOS_RECONOCIDOS.has(x);
      }
      return true;
    }
    return false;
  }
  return false;
}

/** Códigos documentales que aparecen en un texto, en forma canónica. */
const codigosEn = (texto: string): string[] =>
  texto
    .split(/[\s?¿!¡,;:()+]+/)
    .map((x) => x.replace(/\.+$/, ''))
    .map(normalizarCodigo)
    .filter(esCodigoDocumental);

/** Resultado del análisis de referencias de una consulta. */
interface AnalisisReferencias {
  /** Referencias específicas sin resolver (o conflictos). */
  pendientes: number;
  /** Identidades que se resuelven por código documental verificado y sin nombre en la consulta. */
  porCodigo: InstrumentoNormalizado[];
}

/**
 * Analiza las referencias de clase y los códigos documentales de la consulta.
 *
 * - Código dentro de la referencia de una clase ya identificada por nombre: se
 *   absorbe sólo si está verificado para esa identidad; si no, es conflicto.
 * - Código dentro de una clase sin identidad propia: si la consulta nombra
 *   identidades, se absorbe sólo si está verificado para alguna de ellas; si no,
 *   es conflicto. Si la consulta no nombra ninguna, el código identifica al
 *   instrumento sólo cuando su correspondencia es única; si no, queda pendiente.
 * - Código suelto (fuera de toda referencia de clase): con identidades nombradas,
 *   mismas reglas de conflicto; sin ellas, identifica sólo con correspondencia
 *   única, y un código desconocido no identifica nada.
 * - Clase sin código: se aplica referenciaEspecifica (títulos, años, temas).
 */
function analizarReferencias(
  cadena: string,
  identidades: { instrumento: InstrumentoNormalizado; inicio: number; fin: number }[],
): AnalisisReferencias {
  const nombradas = [...new Set(identidades.map((i) => i.instrumento))];
  let pendientes = 0;
  const porCodigo: InstrumentoNormalizado[] = [];
  // Códigos ya asignados a una referencia de clase; el resto son sueltos.
  const enReferencias: string[] = [];

  /** Asigna un código a una identidad por correspondencia única, o lo marca pendiente. */
  const resolverSinNombre = (codigo: string): void => {
    const inst = CODIGO_A_INSTRUMENTO.get(codigo);
    if (inst) porCodigo.push(inst);
    else pendientes++;
  };

  for (const m of cadena.matchAll(CLASES_RE)) {
    const inicio = m.index ?? 0;
    const fin = inicio + m[0].length;
    const cubierta = identidades.find((i) => i.inicio <= inicio && fin <= i.fin);
    const codigos = tokensReferencia(cadena.slice(fin)).filter(esCodigoDocumental).map(normalizarCodigo);
    enReferencias.push(...codigos);

    if (codigos.length > 0) {
      if (cubierta) {
        if (!codigos.every((c) => verificadoPara(c, cubierta.instrumento))) pendientes++;
      } else if (nombradas.length > 0) {
        if (!codigos.every((c) => nombradas.some((id) => verificadoPara(c, id)))) pendientes++;
      } else {
        for (const c of codigos) resolverSinNombre(c);
      }
      continue;
    }
    if (cubierta) continue;
    if (referenciaEspecifica(cadena.slice(fin), m[1])) pendientes++;
  }

  // Códigos sueltos: los que no pertenecen a ninguna referencia de clase.
  const sueltos = codigosEn(cadena);
  for (const c of enReferencias) {
    const k = sueltos.indexOf(c);
    if (k !== -1) sueltos.splice(k, 1);
  }
  for (const c of sueltos) {
    if (nombradas.length > 0) {
      if (!nombradas.some((id) => verificadoPara(c, id))) pendientes++;
    } else {
      const inst = CODIGO_A_INSTRUMENTO.get(c);
      if (inst) porCodigo.push(inst);
    }
  }

  return { pendientes, porCodigo: [...new Set(porCodigo)] };
}

/** Clasifica la intención instrumental de una consulta en uno de los cuatro estados. */
export function clasificarIntencionInstrumental(texto: string): IntencionInstrumental {
  const n = NORMALIZAR(texto);
  const detectadas = detectarIdentidadesDesdeTexto(n);
  const { pendientes, porCodigo } = analizarReferencias(n, detectadas);
  const institucional = mencionaDenominacionInstitucional(sinMencionesIdentificadas(n, detectadas), detectadas) ? 1 : 0;
  const identidades = [...new Set([...detectadas.map((d) => d.instrumento), ...porCodigo])];
  const articulos = [...new Set([...n.matchAll(ARTICULO_RE)].map((m) => m[1]))];
  if (pendientes + institucional > 0) return { estado: 'SPECIFIC_UNRESOLVED', identidades, articulos };
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
 * principal. Sólo se añaden los que sobreviven a la evidencia final de la unión.
 * Siempre exige que sean elegibles y verificables del instrumento. El filtro por
 * artículo sólo se aplica en comparaciones (MULTI) con un único artículo pedido
 * (ver evidenciaFinal); con identidad única o NONE no se filtra por artículo. El
 * pase procedimental no relaja ninguno de estos criterios.
 */
export function evidenciaProcedimentalPermitida<T extends { fuente: string; num_articulo?: string | null }>(
  principal: readonly T[],
  procedimental: readonly T[],
  intencion: IntencionInstrumental,
): T[] {
  const finalUnido = evidenciaFinal([...principal, ...procedimental], intencion);
  return procedimental.filter((f) => finalUnido.includes(f));
}
