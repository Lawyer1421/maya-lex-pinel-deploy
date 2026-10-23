/**
 * lib/legal-os/pipeline/guards.ts
 * Compuertas de entrada deterministas, ANTES de recuperar o llamar a ningún modelo. Todas fallan cerrado.
 */
import { detectarInstrumentoDesdeTexto } from '../../legal-retrieval/exact-resolver';
import { resolverJurisdiccion } from '../jurisdiction/registry';
import type { IntentResult } from '../types';

export type MotivoBloqueo =
  | 'INYECCION_DE_PROMPT'
  | 'DATOS_PERSONALES_SOLICITADOS'
  | 'PAIS_NO_HABILITADO'
  | 'JURISDICCION_AMBIGUA'
  | 'FUERA_DE_ALCANCE'
  | 'ACLARACION_REQUERIDA';

const RE_INYECCION = /\b(ignora|olvida|descarta|omite)\b[^.?!]{0,40}\b(instrucciones|reglas|indicaciones|prompt)\b|\bsystem prompt\b|\bmodo desarrollador\b|\bsin (?:citar|verificar)\b[^.?!]{0,40}\b(fuentes|vigencia)\b|\bact[uú]a como\b[^.?!]{0,30}\bsin restricciones\b/i;
const RE_DATOS_PERSONALES = /\b(dime|dame|busca|averigua|encuentra|proporciona|n[uú]mero de identidad|domicilio|direcci[oó]n|tel[eé]fono|dni|rtn)\b[^.?!]{0,60}\b(n[uú]mero de identidad|dni|rtn|domicilio|direcci[oó]n|tel[eé]fono|correo)\b[^.?!]{0,40}\b(de|del)\b[^.?!]{0,30}\b(mi cliente|cliente|persona|vecino|demandado|imputado|<[^>]+>|[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+ [A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/i;
const RE_FUERA_DE_TEMA = /\b(?:receta\s+de\s+(?!m[eé]dic)\w+|f[uú]tbol|hor[oó]scopo|chiste)\b/i;
const RE_ARTICULO = /\bart(?:[ií]culo|\.)?\s*(?:\d+|<[^>]+>)/i;

export interface ResultadoCompuerta {
  bloqueado: boolean;
  motivo?: MotivoBloqueo;
}

const ok: ResultadoCompuerta = { bloqueado: false };
const no = (motivo: MotivoBloqueo): ResultadoCompuerta => ({ bloqueado: true, motivo });

/** Evalúa la pregunta cruda con su intención ya clasificada. El orden importa: lo más peligroso primero. */
export function evaluarEntrada(pregunta: string, intent: IntentResult): ResultadoCompuerta {
  if (RE_INYECCION.test(pregunta)) return no('INYECCION_DE_PROMPT');
  if (RE_DATOS_PERSONALES.test(pregunta)) return no('DATOS_PERSONALES_SOLICITADOS');
  const j = resolverJurisdiccion(pregunta);
  if (j.estado === 'PAIS_NO_HABILITADO') return no('PAIS_NO_HABILITADO');
  if (j.estado === 'AMBIGUA') return no('JURISDICCION_AMBIGUA');
  if (intent.task === 'OUT_OF_SCOPE' || RE_FUERA_DE_TEMA.test(pregunta)) return no('FUERA_DE_ALCANCE');
  // «artículo N» sin instrumento: no se adivina cuál; se pide aclaración (abstención).
  if (RE_ARTICULO.test(pregunta) && detectarInstrumentoDesdeTexto(pregunta) === null) return no('ACLARACION_REQUERIDA');
  return ok;
}

const RE_DECRETO = /\bdecreto\s+(?:n[oº.]*\s*)?(\d{1,4})\s*[-/]\s*(\d{2,4})/gi;

/** Decretos citados en la pregunta, normalizados «N-AAAA» (el año puede venir en 2 o 4 cifras: se conserva tal cual). */
export function decretosCitados(pregunta: string): string[] {
  return [...pregunta.matchAll(RE_DECRETO)].map((m) => `${Number(m[1])}-${m[2]}`);
}
