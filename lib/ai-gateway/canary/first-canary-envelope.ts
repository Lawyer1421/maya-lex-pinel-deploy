/**
 * lib/ai-gateway/canary/first-canary-envelope.ts
 * G6-D: ENVOLVENTE DE PRIVACIDAD DEL PRIMER CANARY. Política mucho más restrictiva que el privacy gate general.
 *
 * El primer canary no necesita aceptar todas las preguntas que MayaLex aceptará algún día. Solo es elegible una pregunta que:
 *   1. pasa privacyGate (PASS);
 *   2. está escrita ÍNTEGRAMENTE con un vocabulario CERRADO de ~150 palabras (interrogativos, palabras función, verbos de consulta
 *      normativa, instrumentos del registro) más referencias numéricas de artículo/decreto/año;
 *   3. es una sola línea corta, sin comillas, paréntesis libres, correos ni adjuntos.
 * Como cualquier palabra fuera del vocabulario rechaza, un nombre propio (en mayúscula o minúscula), una dirección, un documento pegado o
 * un tema libre NO pueden entrar: no depende de reconocer nombres. Es fail-closed por construcción. El costo es una cobertura muy estrecha:
 * solo preguntas por artículo exacto, vigencia, derogación y reforma de un instrumento del registro.
 *
 * Este módulo no activa nada: solo decide si una pregunta SERÍA elegible. Nada en producción lo importa.
 */
import { privacyGate } from '../shadow/privacy-gate';

const sinTildes = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export const LONGITUD_MAXIMA_ENVOLVENTE = 160;

/** Interrogativos y palabras función. Sin pronombres personales (mi, me, yo, nosotros): una consulta en primera persona no es abstracta. */
const FUNCION = [
  'que', 'cual', 'cuales', 'cuando', 'como', 'si', 'el', 'la', 'los', 'las', 'un', 'una', 'del', 'de', 'al', 'en', 'y', 'o', 'se', 'es', 'esta', 'sigue',
  'siguen', 'desde', 'hasta', 'por', 'para', 'segun', 'sobre', 'con',
];
/** Verbos y nombres de consulta normativa. */
const CONSULTA = [
  'dice', 'establece', 'regula', 'senala', 'dispone', 'preve', 'contempla', 'deroga', 'derogo', 'reforma', 'modifica', 'abroga', 'vigente', 'vigencia',
  'derogado', 'derogada', 'reformado', 'reformada', 'modificado', 'modificada', 'abrogado', 'abrogada', 'entro', 'entra', 'vigor', 'publico', 'publicado',
  'publicada', 'texto', 'ultimo', 'primer', 'primero', 'existe', 'numero', 'articulo', 'articulos', 'art', 'decreto', 'ley', 'bis', 'transitorio',
  'transitorios', 'disposicion', 'disposiciones', 'actual', 'original',
];
/** Instrumentos del registro (frases cerradas). */
export const INSTRUMENTOS_ENVOLVENTE: readonly string[] = [
  'codigo penal', 'codigo procesal penal', 'codigo civil', 'codigo procesal civil', 'codigo de comercio', 'codigo de trabajo', 'codigo de familia',
  'codigo tributario', 'codigo del notariado', 'constitucion de la republica', 'constitucion', 'ley de procedimiento administrativo',
  'ley de municipalidades', 'ley de propiedad', 'ley electoral', 'ley de justicia constitucional', 'codigo de la ninez y la adolescencia',
  'ley organica del poder judicial',
];

/**
 * Denominaciones que NO son el nombre de un instrumento (dictamen CLO 21-oct-2026, issue #74, caso D1): solo pueden aparecer como término a
 * corregir hacia la denominación oficial, nunca como instrumento válido del registro. Normalizadas (sin tildes, minúsculas).
 */
export const TERMINOS_A_CORREGIR: Readonly<Record<string, string>> = Object.freeze({
  'ley del notariado': 'Código del Notariado (D.353-2005)',
  'reglamento de la ley del notariado': 'Reglamento del Código del Notariado (PCSJ-17-2012)',
});

/** El término a corregir que contiene la pregunta (el más largo primero), con su denominación oficial, o null. */
export function terminoACorregir(pregunta: string): { termino: string; correccion: string } | null {
  const t = ` ${normalizar(pregunta).replace(/[.,]+(?=\s|$)/g, ' ').replace(/\s+/g, ' ')} `;
  const hallado = Object.keys(TERMINOS_A_CORREGIR).sort((a, b) => b.length - a.length).find((k) => t.includes(` ${k} `));
  return hallado ? { termino: hallado, correccion: TERMINOS_A_CORREGIR[hallado] } : null;
}

const PALABRAS = new Set<string>([...FUNCION, ...CONSULTA, ...INSTRUMENTOS_ENVOLVENTE.flatMap((i) => i.split(' '))]);
const NUMERO_ARTICULO = /^\d{1,4}(?:-[a-z]{1,3})?$/;
const NUMERO_DECRETO = /^\d{1,3}-\d{4}$/;
const ANIO = /^(?:19|20)\d{2}$/;

export type MotivoEnvolvente =
  | 'PRIVACY_GATE' | 'VACIA' | 'DEMASIADO_LARGA' | 'CARACTERES_NO_PERMITIDOS' | 'PALABRA_FUERA_DEL_VOCABULARIO' | 'NUMERO_NO_PERMITIDO'
  | 'SIN_ANCLA_NORMATIVA' | 'SIN_INTERROGATIVO' | 'INSTRUMENTO_DESCONOCIDO' | 'TERMINO_A_CORREGIR';

export type ResultadoEnvolvente = { elegible: true; tokens: number } | { elegible: false; motivo: MotivoEnvolvente };

/** Normaliza: sin tildes, minúsculas, signos de interrogación fuera y «(decreto N-YYYY)» abierto. */
function normalizar(pregunta: string): string {
  return sinTildes(pregunta)
    .replace(/\((?:decreto|d\.)\s*(\d{1,3}-\d{4})\)/g, ' decreto $1 ')
    .replace(/[¿?¡!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function evaluarEnvolvente(pregunta: unknown): ResultadoEnvolvente {
  if (typeof pregunta !== 'string' || pregunta.trim() === '') return { elegible: false, motivo: 'VACIA' };
  if (pregunta.length > LONGITUD_MAXIMA_ENVOLVENTE) return { elegible: false, motivo: 'DEMASIADO_LARGA' };
  if (privacyGate(pregunta).estado !== 'PASS') return { elegible: false, motivo: 'PRIVACY_GATE' };
  const t = normalizar(pregunta);
  // Solo letras, dígitos, espacios, guion, punto final y coma: nada de comillas, dos puntos, arrobas, paréntesis sueltos ni saltos de línea.
  if (!/^[a-z0-9\s\-.,]+$/.test(t)) return { elegible: false, motivo: 'CARACTERES_NO_PERMITIDOS' };
  const tokens = t.replace(/[.,]+(?=\s|$)/g, ' ').split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 24) return { elegible: false, motivo: 'DEMASIADO_LARGA' };

  let ancla = false;
  for (const tk of tokens) {
    if (/\d/.test(tk)) {
      if (NUMERO_DECRETO.test(tk) || NUMERO_ARTICULO.test(tk) || ANIO.test(tk)) { ancla = true; continue; }
      return { elegible: false, motivo: 'NUMERO_NO_PERMITIDO' };
    }
    if (!PALABRAS.has(tk)) return { elegible: false, motivo: 'PALABRA_FUERA_DEL_VOCABULARIO' };
  }
  const texto = ` ${tokens.join(' ')} `;
  if (!ancla && !/ (?:articulo|decreto|ley|codigo|constitucion)/.test(texto)) return { elegible: false, motivo: 'SIN_ANCLA_NORMATIVA' };
  if (!/^(?:que|cual|cuales|cuando|como|si|existe|sigue|esta|es) /.test(tokens.join(' '))) return { elegible: false, motivo: 'SIN_INTERROGATIVO' };
  // «Ley del Notariado» no es un instrumento: se corrige hacia el Código del Notariado y la consulta no entra al canary tal cual.
  if (terminoACorregir(pregunta)) return { elegible: false, motivo: 'TERMINO_A_CORREGIR' };
  // «código»/«ley» deben formar un instrumento del registro; «decreto N-YYYY» se admite por número.
  const sinNumeros = ` ${tokens.filter((x) => !/\d/.test(x)).join(' ')} `;
  const menciona = /\b(?:codigo|ley|constitucion|reglamento)\b/.test(sinNumeros);
  if (menciona && !INSTRUMENTOS_ENVOLVENTE.some((i) => sinNumeros.includes(` ${i} `))) return { elegible: false, motivo: 'INSTRUMENTO_DESCONOCIDO' };
  return { elegible: true, tokens: tokens.length };
}

/** Las 13 condiciones del mandato G6-D, cada una comprobada por separado para el informe de auditoría. */
export const CONDICIONES_ENVOLVENTE = [
  'privacyGate_PASS', 'consulta_juridica_abstracta', 'sin_documento_pegado', 'sin_nombres_privados', 'sin_DNI', 'sin_RTN', 'sin_email', 'sin_telefono',
  'sin_direccion_privada', 'sin_cuentas', 'sin_expediente_privado', 'sin_archivos', 'sin_contexto_privado_del_cliente',
] as const;
export type CondicionEnvolvente = (typeof CONDICIONES_ENVOLVENTE)[number];

export function condicionesEnvolvente(pregunta: string): Record<CondicionEnvolvente, boolean> {
  const t = normalizar(pregunta);
  const r = evaluarEnvolvente(pregunta);
  const gramatica = r.elegible;
  const sinDigitosLibres = !/\d{5,}/.test(t) && !/\d[\s-]\d/.test(t.replace(/\d{1,3}-\d{4}/g, ''));
  return {
    privacyGate_PASS: privacyGate(pregunta).estado === 'PASS',
    consulta_juridica_abstracta: gramatica,
    sin_documento_pegado: !/[\r\n]/.test(pregunta) && pregunta.length <= LONGITUD_MAXIMA_ENVOLVENTE,
    sin_nombres_privados: gramatica, // el vocabulario cerrado hace imposible un nombre propio
    sin_DNI: !/\b\d{4}[-\s]?\d{4}[-\s]?\d{5}\b/.test(pregunta) && sinDigitosLibres,
    sin_RTN: !/\b\d{4}[-\s]?\d{4}[-\s]?\d{6}\b/.test(pregunta) && sinDigitosLibres,
    sin_email: !/@|\b(?:arroba|punto com)\b/i.test(pregunta),
    sin_telefono: !/(?:\+?504)?[\s-]?[2-9]\d{3}[\s-]?\d{4}\b/.test(pregunta.replace(/\b\d{1,3}-\d{4}\b/g, '')),
    sin_direccion_privada: gramatica && !/\b(?:colonia|barrio|residencial|aldea|avenida|calle|bloque|casa)\b/.test(t),
    sin_cuentas: !/\b(?:cuenta|tarjeta|iban)\b/.test(t) && !/\d{9,}/.test(t),
    sin_expediente_privado: !/\b(?:expediente|folio|tomo|causa|legajo|protocolo)\b/.test(t),
    sin_archivos: !/\b(?:adjunto|adjunta|archivo|pdf|documento|escaneo|foto)\b/.test(t),
    sin_contexto_privado_del_cliente: !/\b(?:mi|mis|me|nuestro|nuestra|cliente|yo)\b/.test(t) && gramatica,
  };
}

export const todasLasCondicionesEnvolvente = (pregunta: string): boolean => Object.values(condicionesEnvolvente(pregunta)).every(Boolean);
