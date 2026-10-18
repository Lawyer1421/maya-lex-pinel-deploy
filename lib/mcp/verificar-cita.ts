/**
 * lib/mcp/verificar-cita.ts
 *
 * Herramienta `verificar_cita` del MCP v1 (docs/governance/PLAN-MCP-SLICE-1.md
 * §2.3, condición 2): comparación programática, SIN ningún paso de IA.
 *
 * Normalización declarada (se aplica igual a la cita y al texto):
 *  1. Unicode NFC: una tilde compuesta y una descompuesta son iguales. Una
 *     palabra SIN tilde no es igual a la misma palabra con tilde.
 *  2. El guion suave (U+00AD, invisible, sale de PDFs) se elimina. Guiones
 *     (‐ ‑ ‒ – — −) -> «-»; comillas tipográficas (“ ” « » „ ‘ ’ ‚) -> comillas
 *     rectas.
 *  3. Todo espacio en blanco (incluidos saltos de línea y NBSP) -> un espacio;
 *     sin espacios al inicio ni al final.
 * Distingue mayúsculas y puntuación: tras normalizar, la coincidencia es exacta.
 *
 * Tres estados, exhaustivos:
 *  - `verificada`: la cita normalizada es subcadena del texto normalizado.
 *  - `no_encontrada`: no hay texto resuelto (id canónico inexistente o sin
 *    versión para la fecha).
 *  - `texto_distinto`: hay texto pero la cita no coincide; se devuelve el pasaje
 *    más cercano (ventana de palabras con mayor coincidencia) para revisión
 *    humana.
 * Además, una entrada que supera MAX_CARACTERES_CITA se rechaza sin comparar
 * (`cita_demasiado_larga`): no es un veredicto sobre la cita, es un límite de
 * entrada que el handler debe devolver como error de validación.
 *
 * El texto lo resuelve el llamador vía norma_version (§2.2). Este módulo no
 * decide si ese texto es fuente primaria: quien lo cablee debe pasar sólo el
 * texto de un resultado PRIMARY, o informar el estado CONTEXT junto al veredicto.
 */

export const NORMALIZACION_CITA = 'NFC + sin guion suave + guiones + comillas + espacios';

/**
 * Tope de la cita en caracteres (tras normalizar). La búsqueda del pasaje
 * cercano crece con cita × texto; una cita más larga no se compara y vuelve
 * como `cita_demasiado_larga` (Auditor @ e1c0c40, P2-3).
 */
export const MAX_CARACTERES_CITA = 2000;

/** Palabras de la cita ausentes del pasaje que se devuelven como máximo. */
const MAX_PALABRAS_FALTANTES = 20;

export type ResultadoVerificacion =
  | { estado: 'verificada'; normalizacion: string }
  | { estado: 'no_encontrada'; normalizacion: string }
  /** La cita supera MAX_CARACTERES_CITA: no se compara (ni se verifica). */
  | { estado: 'cita_demasiado_larga'; normalizacion: string; max_caracteres: number }
  | {
      estado: 'texto_distinto';
      normalizacion: string;
      /** Pasaje del texto (normalizado) con más palabras en común con la cita; null si no comparte ninguna. */
      pasaje_cercano: string | null;
      /** Fracción de palabras de la cita presentes en el pasaje, 0..1, redondeada a 2 decimales. */
      similitud: number;
      /** Palabras de la cita que no aparecen en el pasaje (máx. 20, en orden). */
      palabras_faltantes: string[];
    };

export function normalizarCita(s: string): string {
  return s
    .normalize('NFC')
    .replace(/­/g, '')
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/[“”«»„]/g, '"')
    .replace(/[‘’‚]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Clave de comparación de una palabra para buscar el pasaje cercano (sin puntuación de borde). */
function clave(palabra: string): string {
  return palabra.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

function pasajeCercano(cita: string, texto: string): { pasaje: string | null; similitud: number; faltantes: string[] } {
  const palabrasCita = cita.split(' ');
  const palabrasTexto = texto.split(' ');
  const n = Math.min(palabrasCita.length, palabrasTexto.length);
  const necesarias = new Map<string, number>();
  for (const p of palabrasCita) {
    const k = clave(p);
    if (k) necesarias.set(k, (necesarias.get(k) ?? 0) + 1);
  }

  // Ventana deslizante de n palabras: cuenta coincidencias (multiconjunto).
  const enVentana = new Map<string, number>();
  let coincidencias = 0;
  const agregar = (k: string) => {
    const c = (enVentana.get(k) ?? 0) + 1;
    enVentana.set(k, c);
    if (c <= (necesarias.get(k) ?? 0)) coincidencias++;
  };
  const quitar = (k: string) => {
    const c = enVentana.get(k) ?? 0;
    if (c <= (necesarias.get(k) ?? 0) && c > 0) coincidencias--;
    enVentana.set(k, c - 1);
  };

  // Desempate entre ventanas con igual coincidencia: más palabras en la misma
  // posición que en la cita; luego, la primera.
  const alineadas = (inicio: number) => {
    let a = 0;
    for (let j = 0; j < n; j++) if (clave(palabrasTexto[inicio + j]) === clave(palabrasCita[j])) a++;
    return a;
  };

  let mejor = -1;
  let mejorInicio = 0;
  let mejorAlineadas = -1;
  for (let i = 0; i < palabrasTexto.length; i++) {
    agregar(clave(palabrasTexto[i]));
    if (i >= n) quitar(clave(palabrasTexto[i - n]));
    if (i < n - 1 || coincidencias < mejor || coincidencias === 0) continue;
    const inicio = i - n + 1;
    const a = alineadas(inicio);
    if (coincidencias > mejor || a > mejorAlineadas) {
      mejor = coincidencias;
      mejorInicio = inicio;
      mejorAlineadas = a;
    }
  }

  const totalCita = [...necesarias.values()].reduce((a, b) => a + b, 0);
  if (mejor <= 0 || totalCita === 0) {
    return { pasaje: null, similitud: 0, faltantes: palabrasCita.slice(0, MAX_PALABRAS_FALTANTES) };
  }
  const ventana = palabrasTexto.slice(mejorInicio, mejorInicio + n);
  const disponibles = new Map<string, number>();
  for (const p of ventana) disponibles.set(clave(p), (disponibles.get(clave(p)) ?? 0) + 1);
  const faltantes: string[] = [];
  for (const p of palabrasCita) {
    const k = clave(p);
    if (!k) continue;
    const c = disponibles.get(k) ?? 0;
    if (c > 0) disponibles.set(k, c - 1);
    else if (faltantes.length < MAX_PALABRAS_FALTANTES) faltantes.push(p);
  }
  return { pasaje: ventana.join(' '), similitud: Math.round((mejor / totalCita) * 100) / 100, faltantes };
}

/**
 * Verifica `cita` contra `texto` (el texto del artículo resuelto para la fecha,
 * o null si no hay versión). Determinista: misma entrada, misma salida.
 */
export function verificarCita(cita: string, texto: string | null): ResultadoVerificacion {
  if (texto === null || normalizarCita(texto) === '') {
    return { estado: 'no_encontrada', normalizacion: NORMALIZACION_CITA };
  }
  const c = normalizarCita(cita);
  if (c.length > MAX_CARACTERES_CITA) {
    return { estado: 'cita_demasiado_larga', normalizacion: NORMALIZACION_CITA, max_caracteres: MAX_CARACTERES_CITA };
  }
  const t = normalizarCita(texto);
  // Una cita vacía es subcadena de todo: nunca se verifica.
  if (c !== '' && t.includes(c)) return { estado: 'verificada', normalizacion: NORMALIZACION_CITA };

  const { pasaje, similitud, faltantes } = c === '' ? { pasaje: null, similitud: 0, faltantes: [] } : pasajeCercano(c, t);
  return {
    estado: 'texto_distinto',
    normalizacion: NORMALIZACION_CITA,
    pasaje_cercano: pasaje,
    similitud,
    palabras_faltantes: faltantes,
  };
}
