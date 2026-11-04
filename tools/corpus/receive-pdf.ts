/**
 * tools/corpus/receive-pdf.ts — procedimiento único de recepción de un PDF de fuente oficial (Corpus Supply HN).
 *
 *   npx tsx tools/corpus/receive-pdf.ts <archivo.pdf> --paquete HN-001-A01 --url <URL exacta de descarga> \
 *       --retriever "<quién lo descargó>" --fecha 2026-11-05T14:00:00Z [--metodo MANUAL_BROWSER|CURL|API|OTHER] \
 *       [--lote 2026-11-hn-001-tranche-a] [--max-mb 200] [--revisado "<motivo de la revisión documental humana>"]
 *
 * ESTADOS (nunca implican verificación, autoridad ni vigencia):
 *   INPUT_REJECTED  El archivo no se aceptó (no es un PDF, está incompleto, cifrado, ilegible, demasiado grande, es un escaneo sin texto, o el
 *                   receptor rechazó el paquete). No se escribe paquete.
 *   RECEIVED        Se recibió y se calculó su hash, pero NO avanzó: algo exige revisión documental humana (páginas distintas de la huella del
 *                   ejemplar, identidad ambigua o no confirmada, extracción sospechosa) o falló el receptor. El paquete queda en
 *                   inbox/<lote>/pending-review/ y el receptor NO se ejecuta. Un RECIBIDO no es un documento verificado.
 *   SOURCE_HOLD     El receptor lo procesó, pero el dominio de origen no está verificado en el registro. No llega al CLO.
 *   QA_FAILED       El receptor lo procesó y falló un chequeo BLOCKER de calidad. No llega al CLO.
 *   CLO_PENDING     Fuente validada + QA sin bloqueos: listo para que una persona (el CLO) lo adjudique. Sigue sin ser V4/V5 ni vigente.
 * Códigos de salida: 0 CLO_PENDING · 1 INPUT_REJECTED · 2 uso · 3 SOURCE_HOLD · 4 QA_FAILED · 5 RECEIVED (revisión humana).
 *
 * SHA-256: demuestra la INTEGRIDAD de los bytes recibidos (que no cambiaron desde que se hashearon). NO prueba la AUTENTICIDAD JURÍDICA de la
 * publicación: un PDF íntegro puede ser una copia no oficial, una edición distinta o un texto desactualizado. Eso lo decide el cotejo humano.
 *
 * Offline: sin red, sin Supabase, sin corpus. Requiere `pdfinfo` y `pdftotext` (poppler-utils). No hace OCR.
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { main as procesarLote, type ResultadoCli } from './process-batch';

export type EstadoRecepcion = 'INPUT_REJECTED' | 'RECEIVED' | 'SOURCE_HOLD' | 'QA_FAILED' | 'CLO_PENDING';
export type TipoDocumento = 'LAW' | 'DECREE' | 'CODE' | 'REGULATION' | 'REFORM';

export interface PerfilPaquete {
  nombre: string;
  tipo: TipoDocumento;
  /** Huella del EJEMPLAR identificado por quien lo vio. Una diferencia NO invalida otras ediciones oficiales: bloquea la aceptación automática. */
  huellaPaginas: number | null;
  /** Alguno debe aparecer en el encabezado (primeros caracteres del texto). */
  titulo: readonly RegExp[];
  /** Alguno debe aparecer en el encabezado ampliado. */
  numero: readonly RegExp[];
  /** Términos de contexto documental que deben figurar en el texto completo (al menos `minimo`). */
  contexto: { terminos: readonly string[]; minimo: number };
  /** Si aparece alguno en el encabezado, la identidad es ambigua (otro instrumento). */
  incompatibles: readonly { etiqueta: string; patron: RegExp }[];
  /** Decreto propio y decretos que pueden mencionarse legítimamente en el encabezado (formato `N-AA` o `N-AAAA`). */
  decreto: string | null;
  numerosPermitidos: readonly string[];
  /** Edición consolidada o que reproduce otros actos: no se exige que el encabezado mencione solo su decreto. */
  consolidado: boolean;
  /** Valor que se copia al paquete SOLO si consta en el texto. */
  gaceta: string | null;
}

const OTROS_CODIGOS = [
  { etiqueta: 'Código de la Niñez', patron: /codigo de la ninez/ },
  { etiqueta: 'Código Penal', patron: /codigo penal/ },
  { etiqueta: 'Código Procesal', patron: /codigo procesal/ },
  { etiqueta: 'Código del Trabajo', patron: /codigo del trabajo/ },
  { etiqueta: 'Código de Familia', patron: /codigo de familia/ },
] as const;

/** Los cuatro paquetes del Tramo A. Las huellas de páginas son observaciones de terceros sobre un ejemplar, no acreditaciones. */
export const PERFILES: Readonly<Record<string, PerfilPaquete>> = Object.freeze({
  'HN-001-A01': {
    nombre: 'Código de Comercio', tipo: 'CODE', huellaPaginas: 419,
    titulo: [/codigo de comercio/], numero: [/\b73\s*[-–]\s*(?:19)?50\b/, /\bdecreto (?:legislativo |ley )?(?:no\.? ?|numero )?73\b/],
    contexto: { terminos: ['comerciante', 'sociedades mercantiles', 'sociedad anonima', 'registro mercantil', 'comercio'], minimo: 3 },
    incompatibles: OTROS_CODIGOS, decreto: '73-50', numerosPermitidos: [], consolidado: false, gaceta: null,
  },
  'HN-001-A02': {
    nombre: 'Decreto 284-2013 (reforma al Código de Comercio)', tipo: 'REFORM', huellaPaginas: 17,
    titulo: [/decreto.{0,25}284\s*[-–]\s*2013/], numero: [/\b284\s*[-–]\s*2013\b/],
    contexto: { terminos: ['codigo de comercio', 'articulo', 'decreto'], minimo: 3 },
    incompatibles: OTROS_CODIGOS, decreto: '284-2013', numerosPermitidos: ['73-50', '51-2011'], consolidado: false, gaceta: '33,445', // 51-2011: la ley que el propio decreto reforma, citada en sus considerandos (comprobado en el PDF real)
  },
  'HN-001-A03': {
    nombre: 'Código de la Niñez y de la Adolescencia', tipo: 'CODE', huellaPaginas: null,
    titulo: [/codigo de la ninez y (?:de )?la adolescencia/], numero: [/\b73\s*[-–]\s*96\b/],
    contexto: { terminos: ['nino', 'adolescente', 'menor', 'familia'], minimo: 3 },
    incompatibles: [{ etiqueta: 'Código de Comercio', patron: /codigo de comercio/ }], decreto: '73-96', numerosPermitidos: [], consolidado: true, gaceta: null,
  },
  'HN-001-A04': {
    nombre: 'Decreto 35-2013 (reforma al Código de la Niñez)', tipo: 'REFORM', huellaPaginas: null,
    titulo: [/decreto.{0,25}35\s*[-–]\s*2013/, /reforma.{0,60}codigo de la ninez/], numero: [/\b35\s*[-–]\s*2013\b/],
    contexto: { terminos: ['ninez', 'adolescencia', 'gaceta'], minimo: 2 },
    incompatibles: [{ etiqueta: 'Código de Comercio', patron: /codigo de comercio/ }], decreto: '35-2013', numerosPermitidos: ['73-96'], consolidado: true, gaceta: '33,222',
  },
});

/** Mínimo global de caracteres por página: por debajo es casi seguro un escaneo sin texto (se rechaza, no se hace OCR). */
export const MIN_CARACTERES_POR_PAGINA = 300;
export const MAX_MB_POR_DEFECTO = 200;
export const MAX_MB_TOPE = 500;
const ENCABEZADO_CHARS = 6000;
const ENCABEZADO_AMPLIADO_CHARS = 25000;
const PAGINA_VACIA_MAX = 20;
const PAGINA_DEBIL_FRACCION = 0.25;
const MEDIANA_MIN_PARA_DEBIL = 800;

export const sha256 = (datos: Buffer | string): string => createHash('sha256').update(datos).digest('hex');

/** Minúsculas, sin tildes y con espacios simples, para comparar identidad. */
export const normalizar = (s: string): string =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** ¿El valor (decreto/Gaceta) consta en el texto? Compara sin separadores de miles para tolerar «33,445» y «33445». */
export function constaEnTexto(texto: string, valor: string): boolean {
  const t = normalizar(texto);
  const v = normalizar(valor);
  return t.includes(v) || t.replace(/[.,]/g, '').includes(v.replace(/[.,]/g, ''));
}

// ── Identidad ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface ResultadoIdentidad {
  estado: 'CONFIRMADA' | 'AMBIGUA' | 'NO_CONFIRMADA';
  hallazgos: string[];
}

const canonDecreto = (n: string, a: string): string => `${Number(n)}-${a.length === 4 && a.startsWith('19') ? a.slice(2) : a}`;

/** Números de decreto citados en un encabezado normalizado, en forma canónica `N-AA`/`N-AAAA`. */
export function decretosEnEncabezado(encabezado: string): string[] {
  const re = /decreto(?: legislativo| ley| ejecutivo)?[\s.:,-]{0,4}(?:no\.?|numero)?\s*(\d{1,4})\s*[-–]\s*(\d{2,4})/g;
  const out = new Set<string>();
  for (const m of encabezado.matchAll(re)) out.add(canonDecreto(m[1], m[2]));
  return [...out];
}

/** Identidad por título, número, contexto documental y discrepancias. Una coincidencia aislada de palabra o número no basta. */
export function evaluarIdentidad(texto: string, perfil: PerfilPaquete): ResultadoIdentidad {
  const todo = normalizar(texto);
  const encabezado = todo.slice(0, ENCABEZADO_CHARS);
  const ampliado = todo.slice(0, ENCABEZADO_AMPLIADO_CHARS);
  const hallazgos: string[] = [];
  let ambigua = false;

  if (!perfil.titulo.some((r) => r.test(encabezado))) hallazgos.push('El título del instrumento no figura en el encabezado del documento.');
  if (!perfil.numero.some((r) => r.test(ampliado))) hallazgos.push(`El número del instrumento (${perfil.decreto ?? 'sin decreto'}) no figura en el encabezado ampliado.`);
  const presentes = perfil.contexto.terminos.filter((t) => todo.includes(normalizar(t)));
  if (presentes.length < perfil.contexto.minimo) {
    hallazgos.push(`Contexto documental insuficiente: ${presentes.length} de los ${perfil.contexto.minimo} términos mínimos (${perfil.contexto.terminos.join(', ')}).`);
  }
  for (const inc of perfil.incompatibles) {
    if (inc.patron.test(encabezado)) { ambigua = true; hallazgos.push(`El encabezado menciona otro instrumento (${inc.etiqueta}): identidad ambigua.`); }
  }
  if (!perfil.consolidado && perfil.decreto) {
    const permitidos = new Set([perfil.decreto, ...perfil.numerosPermitidos]);
    const ajenos = decretosEnEncabezado(encabezado).filter((d) => !permitidos.has(d));
    if (ajenos.length > 0) { ambigua = true; hallazgos.push(`El encabezado cita otros decretos (${ajenos.join(', ')}): identidad ambigua.`); }
  }
  return { estado: ambigua ? 'AMBIGUA' : hallazgos.length > 0 ? 'NO_CONFIRMADA' : 'CONFIRMADA', hallazgos };
}

// ── Extracción por página ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface AnalisisPaginas {
  paginasPdf: number;
  paginasTexto: number;
  vacias: number[];
  debiles: number[];
  danadas: number[];
  mediana: number;
  /** Bloquean la aceptación automática (revisión humana). */
  bloqueantes: string[];
  /** Solo informativos. */
  avisos: string[];
}

const mediana = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const muestra = (xs: number[]): string => (xs.length <= 15 ? xs.join(', ') : `${xs.slice(0, 15).join(', ')}… (+${xs.length - 15})`);

/** El promedio global no garantiza una extracción íntegra: se mide cada página (pdftotext separa las páginas con \f). */
export function analizarPaginas(texto: string, paginasPdf: number): AnalisisPaginas {
  const partes = texto.split('\f');
  if (partes.length > 1 && partes[partes.length - 1].trim() === '') partes.pop();
  const noBlancos = partes.map((p) => p.replace(/\s/g, '').length);
  const med = mediana(noBlancos);
  const vacias: number[] = [];
  const debiles: number[] = [];
  const danadas: number[] = [];
  partes.forEach((p, i) => {
    const n = i + 1;
    if (noBlancos[i] < PAGINA_VACIA_MAX) vacias.push(n);
    else if (med >= MEDIANA_MIN_PARA_DEBIL && noBlancos[i] < med * PAGINA_DEBIL_FRACCION) debiles.push(n);
    const raros = (p.match(/�/g)?.length ?? 0) + (p.match(/\(cid:\d+\)/g)?.length ?? 0) * 5;
    if (p.length > 0 && raros / p.length > 0.02) danadas.push(n);
  });
  const bloqueantes: string[] = [];
  const avisos: string[] = [];
  if (partes.length !== paginasPdf) bloqueantes.push(`La extracción devolvió ${partes.length} páginas de texto y el PDF tiene ${paginasPdf}: extracción incompleta o truncada.`);
  if (vacias.length > 0) bloqueantes.push(`Páginas sin texto (< ${PAGINA_VACIA_MAX} caracteres): ${muestra(vacias)}. Pueden ser páginas en blanco intencionales o texto no extraído.`);
  const consecutivas = debiles.some((p, i) => debiles[i + 1] === p + 1);
  if (consecutivas || debiles.length > Math.max(3, Math.ceil(paginasPdf * 0.03))) {
    bloqueantes.push(`Páginas con texto muy corto frente a la mediana (${Math.round(med)} caracteres): ${muestra(debiles)}. Posible texto truncado.`);
  } else if (debiles.length > 0) {
    avisos.push(`Páginas cortas (posible fin de capítulo): ${muestra(debiles)}.`);
  }
  if (danadas.length > 0) bloqueantes.push(`Páginas con codificación dañada (caracteres de reemplazo o (cid:)): ${muestra(danadas)}.`);
  return { paginasPdf, paginasTexto: partes.length, vacias, debiles, danadas, mediana: med, bloqueantes, avisos };
}

// ── Rutas y límites ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const LOTE_VALIDO = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;

export function loteValido(lote: string): boolean {
  return LOTE_VALIDO.test(lote) && !lote.includes('..');
}

/** ¿`ruta` está dentro de `base` (sin salir por `..` ni por enlaces simbólicos ya existentes)? */
export function dentroDe(base: string, ruta: string): boolean {
  const rel = relative(resolve(base), resolve(ruta));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

/**
 * Crea (si hace falta) un directorio bajo `<raiz>/docs/corpus`, componente a componente, comprobando ANTES de crear o entrar que ningún
 * componente existente (enlace simbólico incluido) resuelva fuera de `docs/corpus`.
 */
function directorioSeguro(raiz: string, ...partes: string[]): string {
  const base = resolve(raiz, 'docs/corpus');
  const destino = resolve(base, ...partes);
  if (!dentroDe(base, destino)) throw new Error(`ruta fuera del directorio esperado: ${destino}`);
  mkdirSync(base, { recursive: true });
  const baseReal = realpathSync(base);
  let actual = base;
  for (const parte of relative(base, destino).split(/[\\/]/).filter(Boolean)) {
    actual = join(actual, parte);
    if (existsSync(actual)) {
      if (!dentroDe(baseReal, realpathSync(actual))) throw new Error(`el directorio resuelve fuera de docs/corpus: ${actual}`);
    } else {
      mkdirSync(actual);
    }
  }
  return destino;
}

/** Escritura que nunca sobrescribe: falla si el archivo existe. */
function escribirNuevo(ruta: string, contenido: string): void {
  writeFileSync(ruta, contenido, { flag: 'wx' });
}

// ── Recibo ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface Recibo {
  paquete: string;
  estado: EstadoRecepcion;
  motivo: string | null;
  requiere_revision: boolean;
  motivos_revision: string[];
  revision_humana_declarada: string | null;
  archivo: string;
  bytes: number;
  bytes_sha256: string | null;
  paginas: number | null;
  extracto: { desde: number; hasta: number } | null;
  metodo_extraccion: string;
  delimitacion: { ultima_solo_izquierda: boolean; cierre: { frase: string; hallado: boolean } | null; no_contiene: Array<{ frase: string; aparece: boolean }> } | null;
  huella_paginas: number | null;
  caracteres: number | null;
  text_sha256: string | null;
  identidad: ResultadoIdentidad | null;
  analisis_paginas: AnalisisPaginas | null;
  decreto_consta: boolean | null;
  gaceta_consta: boolean | null;
  resultado_receptor: string | null;
  error_receptor: string | null;
  paquete_en: string | null;
}

/**
 * Extracción para páginas de DOS columnas (p. ej. La Gaceta): el orden de lectura por defecto entrelaza las columnas y desordena los artículos.
 * Se extrae cada página recortada a su mitad izquierda y luego a su mitad derecha, y se conserva el \f entre páginas para el control por página.
 * Es un método distinto de la extracción simple: queda registrado en el recibo y el texto (y su hash) corresponde a este método.
 */
export function extraerTextoDosColumnas(ruta: string, desde: number, hasta: number, ultimaSoloIzquierda = false): { texto: string; avisos: string[] } {
  const info = ejecutar('pdfinfo', ['-f', String(desde), '-l', String(hasta), ruta]);
  const tam = new Map<number, { w: number; h: number }>();
  for (const m of info.stdout.matchAll(/^Page\s+(\d+)\s+size:\s+([\d.]+)\s+x\s+([\d.]+)\s+pts/gm)) tam.set(Number(m[1]), { w: Number(m[2]), h: Number(m[3]) });
  const avisos: string[] = [];
  const paginas: string[] = [];
  for (let n = desde; n <= hasta; n++) {
    const d = tam.get(n);
    if (!d) throw new Error(`pdfinfo no devolvió el tamaño de la página ${n}`);
    const mitad = Math.floor(d.w / 2);
    const recorte = (x: number, w: number): string => {
      const r = ejecutar('pdftotext', ['-enc', 'UTF-8', '-f', String(n), '-l', String(n), '-x', String(x), '-y', '0', '-W', String(w), '-H', String(Math.ceil(d.h)), ruta, '-']);
      if (r.status !== 0) throw new Error(`pdftotext falló en la página ${n}${r.stderr ? `: ${r.stderr.split('\n')[0]}` : ''}`);
      avisos.push(...r.stderr.split('\n').filter((l) => /Syntax (Error|Warning)/i.test(l)));
      return r.stdout.replace(/\f/g, '').replace(/\s+$/, '');
    };
    // Cuando un acto termina en la columna izquierda de la última página y el siguiente empieza en la derecha, esa página se toma solo por la izquierda.
    paginas.push(ultimaSoloIzquierda && n === hasta ? recorte(0, mitad).trim() : `${recorte(0, mitad)}\n${recorte(mitad, Math.ceil(d.w) - mitad)}`.trim());
  }
  return { texto: `${paginas.join('\f')}\f`, avisos };
}

export interface OpcionesRecepcion {
  archivo: string;
  paquete: string;
  url: string;
  retriever: string;
  fecha: string;
  metodo: 'MANUAL_BROWSER' | 'CURL' | 'API' | 'OTHER';
  lote: string;
  raiz: string;
  maxMb?: number;
  /**
   * Rango de páginas pertinente cuando el PDF reproduce VARIOS actos (p. ej. una edición de La Gaceta): solo ese extracto se identifica, se
   * analiza y se segmenta. El SHA-256 de los bytes sigue siendo el del archivo completo. Lo fija una persona tras leer el documento.
   */
  paginasPertinentes?: { desde: number; hasta: number };
  /** Con --columnas 2: la ÚLTIMA página del rango se toma solo por su columna izquierda (el acto termina allí y el siguiente empieza en la derecha). */
  ultimaSoloIzquierda?: boolean;
  /** Frase del cierre documental del acto (p. ej. la firma): debe figurar en el extracto; si no, queda para revisión. */
  cierre?: string;
  /** Frases del acto SIGUIENTE (p. ej. «107-2013»): si aparecen en el extracto, queda para revisión (el corte no fue limpio). */
  noContiene?: string[];
  /** 2 = páginas de dos columnas (La Gaceta): extrae columna izquierda y luego derecha. Por defecto, lectura simple. */
  columnas?: 1 | 2;
  /** Motivo declarado por la persona que revisó el documento; levanta SOLO los bloqueos de revisión, nunca los rechazos de entrada. */
  revisado?: string;
  /** Solo para pruebas: sustituye al receptor offline. */
  receptor?: (argv: string[]) => ResultadoCli;
}

const CODIGOS_SALIDA: Readonly<Record<EstadoRecepcion, number>> = { CLO_PENDING: 0, INPUT_REJECTED: 1, SOURCE_HOLD: 3, QA_FAILED: 4, RECEIVED: 5 };

function ejecutar(bin: string, args: string[]): { stdout: string; stderr: string; status: number | null } {
  const r = spawnSync(bin, args, { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, timeout: 180_000 });
  if (r.error) throw r.error;
  return { stdout: r.stdout ?? '', stderr: r.stderr ?? '', status: r.status };
}

export function paginasDe(ruta: string): { paginas: number; cifrado: boolean; avisos: string[] } {
  const r = ejecutar('pdfinfo', [ruta]);
  const p = /^Pages:\s+(\d+)/m.exec(r.stdout);
  const e = /^Encrypted:\s+(\w+)/m.exec(r.stdout);
  if (r.status !== 0 || !p) throw new Error(`pdfinfo no pudo abrir el archivo${r.stderr ? `: ${r.stderr.split('\n')[0]}` : ''}`);
  const avisos = r.stderr.split('\n').filter((l) => /Syntax (Error|Warning)|xref|damaged/i.test(l));
  return { paginas: Number(p[1]), cifrado: e?.[1]?.toLowerCase() === 'yes', avisos };
}

export function extraerTexto(ruta: string, rango?: { desde: number; hasta: number }): { texto: string; avisos: string[] } {
  const r = ejecutar('pdftotext', ['-enc', 'UTF-8', ...(rango ? ['-f', String(rango.desde), '-l', String(rango.hasta)] : []), ruta, '-']);
  if (r.status !== 0) throw new Error(`pdftotext falló${r.stderr ? `: ${r.stderr.split('\n')[0]}` : ''}`);
  return { texto: r.stdout, avisos: r.stderr.split('\n').filter((l) => /Syntax (Error|Warning)/i.test(l)) };
}

function reciboVacio(o: OpcionesRecepcion, perfil: PerfilPaquete | undefined): Recibo {
  return {
    paquete: o.paquete, estado: 'INPUT_REJECTED', motivo: null, requiere_revision: false, motivos_revision: [], revision_humana_declarada: o.revisado ?? null,
    archivo: o.archivo, bytes: 0, bytes_sha256: null, paginas: null, extracto: o.paginasPertinentes ?? null, delimitacion: null, metodo_extraccion: o.columnas === 2 ? 'pdftotext por columnas (2): izquierda y luego derecha de cada página' : 'pdftotext (orden de lectura por defecto)', huella_paginas: perfil?.huellaPaginas ?? null, caracteres: null, text_sha256: null,
    identidad: null, analisis_paginas: null, decreto_consta: null, gaceta_consta: null, resultado_receptor: null, error_receptor: null, paquete_en: null,
  };
}

export function recibir(o: OpcionesRecepcion): { recibo: Recibo; codigo: number } {
  const perfil = PERFILES[o.paquete];
  const recibo = reciboVacio(o, perfil);
  const finalizar = (estado: EstadoRecepcion, motivo: string | null): { recibo: Recibo; codigo: number } => {
    recibo.estado = estado;
    recibo.motivo = motivo;
    try { escribirRecibo(o, recibo); } catch (e) { recibo.motivo = `${motivo ?? ''} (además no se pudo escribir el recibo: ${e instanceof Error ? e.message : String(e)})`; }
    return { recibo, codigo: CODIGOS_SALIDA[estado] };
  };
  const rechazar = (motivo: string) => finalizar('INPUT_REJECTED', motivo);

  // 1. Argumentos, rutas y límites (antes de leer nada).
  if (!perfil) return rechazar(`paquete desconocido: ${o.paquete} (válidos: ${Object.keys(PERFILES).join(', ')})`);
  if (!loteValido(o.lote)) return rechazar('--lote inválido: solo letras, números, punto, guion y guion bajo (sin rutas ni "..")');
  if (!/^https:\/\//.test(o.url)) return rechazar('la URL de origen debe ser https y exacta (la del documento, no la portada)');
  try { new URL(o.url); } catch { return rechazar('la URL de origen no es una URL válida'); }
  if (Number.isNaN(Date.parse(o.fecha)) || Date.parse(o.fecha) > Date.now()) return rechazar('--fecha debe ser una fecha ISO real y no futura');
  if (o.revisado !== undefined && o.revisado.trim().length < 10) return rechazar('--revisado exige un motivo humano de al menos 10 caracteres');
  const maxMb = Math.min(o.maxMb ?? MAX_MB_POR_DEFECTO, MAX_MB_TOPE);
  if (!(maxMb > 0)) return rechazar('--max-mb debe ser positivo');
  if (!existsSync(o.archivo)) return rechazar('el archivo no existe');
  const lst = lstatSync(o.archivo);
  if (lst.isSymbolicLink()) return rechazar('el archivo es un enlace simbólico: entregue el PDF real');
  if (!statSync(o.archivo).isFile()) return rechazar('la ruta no es un archivo regular');
  if (lst.size > maxMb * 1024 * 1024) return rechazar(`el archivo (${(lst.size / 1048576).toFixed(1)} MB) excede el límite de ${maxMb} MB`);

  // 2. Integridad de los bytes.
  const bytes = readFileSync(o.archivo);
  recibo.bytes = bytes.length;
  if (bytes.length === 0) return rechazar('archivo vacío');
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') return rechazar('no es un PDF (no empieza por %PDF-); puede ser una página HTML guardada');
  recibo.bytes_sha256 = sha256(bytes);
  if (!bytes.subarray(Math.max(0, bytes.length - 2048)).toString('latin1').includes('%%EOF')) {
    return rechazar('PDF incompleto: no termina en %%EOF (descarga cortada). Descargar de nuevo');
  }

  let info: { paginas: number; cifrado: boolean; avisos: string[] };
  try { info = paginasDe(o.archivo); } catch (e) { return rechazar(`PDF ilegible: ${e instanceof Error ? e.message : String(e)}`); }
  recibo.paginas = info.paginas;
  if (info.cifrado) return rechazar('PDF cifrado: se necesita la versión sin cifrar de la fuente');

  // 3. Texto íntegro y control por página.
  const rango = o.paginasPertinentes;
  if (rango && !(Number.isInteger(rango.desde) && Number.isInteger(rango.hasta) && rango.desde >= 1 && rango.hasta >= rango.desde && rango.hasta <= info.paginas)) {
    return rechazar(`rango de páginas pertinente inválido (${rango.desde}-${rango.hasta}) para un PDF de ${info.paginas} páginas`);
  }
  const paginasExtracto = rango ? rango.hasta - rango.desde + 1 : info.paginas;
  let extraccion: { texto: string; avisos: string[] };
  try { extraccion = o.columnas === 2 ? extraerTextoDosColumnas(o.archivo, rango?.desde ?? 1, rango?.hasta ?? info.paginas, o.ultimaSoloIzquierda === true) : extraerTexto(o.archivo, rango); } catch (e) { return rechazar(e instanceof Error ? e.message : String(e)); }
  const texto = extraccion.texto;
  recibo.caracteres = texto.length;
  if (texto.length / paginasExtracto < MIN_CARACTERES_POR_PAGINA) {
    return rechazar(`texto casi vacío (${texto.length} caracteres en ${paginasExtracto} páginas): probable PDF escaneado; hace falta una versión con texto. No se hace OCR ni se inventa texto`);
  }
  recibo.text_sha256 = sha256(texto);
  const paginas = analizarPaginas(texto, paginasExtracto);
  recibo.analisis_paginas = paginas;

  // 4. Motivos que exigen revisión documental humana (bloquean la aceptación automática, no declaran inválido el documento).
  const motivos: string[] = [];
  if (perfil.huellaPaginas !== null && !rango && info.paginas !== perfil.huellaPaginas) {
    motivos.push(`Páginas ${info.paginas} ≠ huella del ejemplar identificado (${perfil.huellaPaginas}): puede ser otra edición oficial; el CLO decide si es la misma norma.`);
  }
  if (rango) motivos.push(`Extracto de las páginas ${rango.desde}–${rango.hasta} de ${info.paginas}: el rango pertinente lo fijó una persona y debe cotejarse; el resto del PDF (otros actos) queda fuera del paquete.`);
  for (const a of [...info.avisos, ...extraccion.avisos].slice(0, 3)) motivos.push(`El lector PDF reportó: ${a}`);
  motivos.push(...paginas.bloqueantes);
  // Delimitación documental de un acto dentro de un PDF con varios: cierre presente y sin texto del acto siguiente.
  if (o.ultimaSoloIzquierda || o.cierre || (o.noContiene && o.noContiene.length > 0)) {
    const cola = normalizar(texto).slice(-5000);
    const cierre = o.cierre ? { frase: o.cierre, hallado: cola.includes(normalizar(o.cierre)) } : null;
    const noContiene = (o.noContiene ?? []).map((f) => ({ frase: f, aparece: normalizar(texto).includes(normalizar(f)) }));
    recibo.delimitacion = { ultima_solo_izquierda: o.ultimaSoloIzquierda === true, cierre, no_contiene: noContiene };
    if (o.ultimaSoloIzquierda && o.columnas !== 2) motivos.push('--ultima-solo-izquierda solo tiene sentido con --columnas 2.');
    if (cierre && !cierre.hallado) motivos.push(`Cierre documental no hallado en el extracto: «${cierre.frase}». El corte puede ser anterior al cierre y firma del acto.`);
    for (const n of noContiene) if (n.aparece) motivos.push(`El extracto contiene «${n.frase}» (texto del acto siguiente): el corte no fue limpio.`);
  }
  const identidad = evaluarIdentidad(texto, perfil);
  recibo.identidad = identidad;
  if (identidad.estado !== 'CONFIRMADA') motivos.push(`Identidad ${identidad.estado}: ${identidad.hallazgos.join(' ')}`);
  recibo.motivos_revision = motivos;
  recibo.requiere_revision = motivos.length > 0;
  recibo.decreto_consta = perfil.decreto ? constaEnTexto(texto, perfil.decreto) : null;
  recibo.gaceta_consta = perfil.gaceta ? constaEnTexto(texto, perfil.gaceta) : null;

  const paquete = {
    source_url: o.url,
    source_domain: new URL(o.url).host,
    retrieved_at: new Date(o.fecha).toISOString(),
    document_name: perfil.nombre,
    document_type: perfil.tipo,
    decree: perfil.decreto && recibo.decreto_consta ? perfil.decreto : 'UNKNOWN',
    gaceta: perfil.gaceta && recibo.gaceta_consta ? perfil.gaceta : 'UNKNOWN',
    gaceta_date: 'UNKNOWN',
    bytes_sha256: recibo.bytes_sha256,
    text_sha256: recibo.text_sha256,
    extracted_text: texto,
    retrieval_method: o.metodo,
    source_tier: null,
    retriever: o.retriever,
    verification_state: 'UNVERIFIED',
  };
  const contenido = `${JSON.stringify(paquete, null, 2)}\n`;

  try {
    // 5. Revisión documental pendiente: queda disponible, pero el receptor NO se ejecuta.
    if (recibo.requiere_revision && !o.revisado) {
      const dir = directorioSeguro(o.raiz, 'inbox', o.lote, 'pending-review');
      const ruta = join(dir, `${o.paquete}.${recibo.bytes_sha256.slice(0, 12)}.json`);
      if (!existsSync(ruta)) escribirNuevo(ruta, contenido);
      recibo.paquete_en = relative(o.raiz, ruta);
      return finalizar('RECEIVED', 'Recibido: requiere revisión documental humana antes de procesarse. No está verificado ni se envió al receptor. Tras revisarlo, repetir el comando con --revisado "<motivo>".');
    }

    // 6. Sin sobrescrituras: un paquete distinto con el mismo nombre en el inbox se rechaza.
    const inbox = directorioSeguro(o.raiz, 'inbox', o.lote);
    const rutaInbox = join(inbox, `${o.paquete}.json`);
    if (existsSync(rutaInbox)) {
      const previo = JSON.parse(readFileSync(rutaInbox, 'utf8')) as { bytes_sha256?: string };
      if (previo.bytes_sha256 !== recibo.bytes_sha256) {
        return rechazar(`ya existe ${relative(o.raiz, rutaInbox)} con otro hash; no se sobrescribe. Use otro --lote para una edición distinta`);
      }
    }

    // 7. Receptor offline sobre un paquete temporal; solo si termina bien se copia al inbox.
    const salida = directorioSeguro(o.raiz, 'staging', o.lote);
    const tmp = mkdtempSync(join(tmpdir(), 'rcv-pkg-'));
    const inicio = Date.now() - 2000;
    let resultado: ResultadoCli;
    try {
      const rutaTmp = join(tmp, `${o.paquete}.json`);
      writeFileSync(rutaTmp, contenido);
      try { resultado = (o.receptor ?? procesarLote)([rutaTmp, '--out', salida]); } catch (e) {
        recibo.error_receptor = e instanceof Error ? e.message : String(e);
        return finalizar('RECEIVED', 'El receptor offline falló; el paquete no se promovió ni se copió al inbox. Revisar el error y reintentar.');
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
    recibo.resultado_receptor = resultado.mensaje;

    const reporte = join(salida, 'BATCH_REPORT.json');
    const item = existsSync(reporte) && statSync(reporte).mtimeMs >= inicio ? (JSON.parse(readFileSync(reporte, 'utf8')) as { items?: Array<{ importacion?: string; razones?: string[]; candidato?: { estado?: string } | null }> }).items?.[0] : undefined;
    if (resultado.codigo !== 0 || item?.importacion === 'REJECTED') {
      return rechazar(`el receptor rechazó el paquete: ${item?.razones?.join('; ') || resultado.mensaje}`);
    }
    if (!item?.candidato?.estado) {
      return finalizar('RECEIVED', item?.importacion === 'DUPLICATE'
        ? 'Duplicado exacto de un documento ya recibido: no se reprocesó.'
        : 'El receptor no generó un candidato de staging; el documento queda solo recibido.');
    }
    const estadoCandidato = item.candidato.estado as EstadoRecepcion;
    if (estadoCandidato !== 'CLO_PENDING' && estadoCandidato !== 'SOURCE_HOLD' && estadoCandidato !== 'QA_FAILED') {
      return finalizar('RECEIVED', `Estado de candidato no reconocido (${String(item.candidato.estado)}); queda solo recibido.`);
    }
    if (!existsSync(rutaInbox)) escribirNuevo(rutaInbox, contenido);
    recibo.paquete_en = relative(o.raiz, rutaInbox);
    const aviso = o.revisado ? ` Revisión documental humana declarada: «${o.revisado.trim()}».` : '';
    return finalizar(estadoCandidato, `${resultado.mensaje}.${aviso}`);
  } catch (e) {
    return rechazar(`error de escritura o de ruta: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function escribirRecibo(o: OpcionesRecepcion, r: Recibo): void {
  const dir = directorioSeguro(o.raiz, 'staging', o.lote, 'receipts');
  const sello = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const base = `${r.paquete}-${sello}-${(r.bytes_sha256 ?? 'sinhash').slice(0, 12)}`;
  let ruta = join(dir, `${base}.md`);
  for (let n = 2; existsSync(ruta); n++) ruta = join(dir, `${base}-${n}.md`); // nunca se sobrescribe un recibo previo
  const p = r.analisis_paginas;
  const md = [
    `# Recibo de recepción · ${r.paquete}`,
    '',
    `**Estado: ${r.estado}**${r.motivo ? ` — ${r.motivo}` : ''}`,
    '',
    '> RECEIVED/SOURCE_HOLD/QA_FAILED/CLO_PENDING describen en qué punto del trámite está el archivo. Ninguno significa verificado, autoritativo ni vigente. El SHA-256 prueba que los bytes recibidos no cambiaron; **no prueba que la publicación sea auténtica ni oficial**.',
    '',
    '| Comprobación | Resultado |',
    '|---|---|',
    `| Archivo | ${r.archivo} (${r.bytes} bytes) |`,
    `| bytes_sha256 (integridad de bytes) | ${r.bytes_sha256 ?? 'NO CALCULADO'} |`,
    `| Método de extracción | ${r.metodo_extraccion} |`,
    ...(r.delimitacion ? [`| Delimitación del acto | última página solo columna izquierda: ${r.delimitacion.ultima_solo_izquierda ? 'sí' : 'no'} · cierre ${r.delimitacion.cierre ? `«${r.delimitacion.cierre.frase}» ${r.delimitacion.cierre.hallado ? 'HALLADO' : 'NO hallado'}` : 'no verificado'} · acto siguiente: ${r.delimitacion.no_contiene.length ? r.delimitacion.no_contiene.map((n) => `«${n.frase}» ${n.aparece ? 'APARECE' : 'ausente'}`).join(', ') : 'no verificado'} |`] : []),
    `| Extracto pertinente | ${r.extracto ? `páginas ${r.extracto.desde}–${r.extracto.hasta} de ${r.paginas}` : 'documento completo'} |`,
    `| Páginas (pdfinfo) | ${r.paginas ?? '—'} (huella del ejemplar identificado: ${r.huella_paginas ?? 'no declarada'}) |`,
    `| Páginas con texto extraído | ${p ? p.paginasTexto : '—'} · vacías: ${p?.vacias.length ?? '—'} · débiles: ${p?.debiles.length ?? '—'} · dañadas: ${p?.danadas.length ?? '—'} |`,
    `| Caracteres de texto | ${r.caracteres ?? '—'} |`,
    `| text_sha256 | ${r.text_sha256 ?? 'NO CALCULADO'} |`,
    `| Identidad | ${r.identidad ? `${r.identidad.estado}${r.identidad.hallazgos.length ? ` — ${r.identidad.hallazgos.join(' ')}` : ''}` : 'no evaluada'} |`,
    `| Decreto consta en el texto | ${r.decreto_consta ?? 'n/a'} |`,
    `| Gaceta consta en el texto | ${r.gaceta_consta ?? 'n/a'} |`,
    `| Requiere revisión documental | ${r.requiere_revision ? 'SÍ' : 'no'}${r.revision_humana_declarada ? ` (revisión humana declarada: ${r.revision_humana_declarada})` : ''} |`,
    `| Receptor offline | ${r.resultado_receptor ?? r.error_receptor ?? 'no ejecutado'} |`,
    `| Paquete | ${r.paquete_en ?? 'no escrito'} |`,
    '',
    ...(r.motivos_revision.length ? ['## Motivos de revisión documental', ...r.motivos_revision.map((m) => `- ${m}`), ''] : []),
    ...(p?.avisos.length ? ['## Avisos', ...p.avisos.map((m) => `- ${m}`), ''] : []),
    'V4/V5 solo los da el CLO con cotejo documental y aprobación registrada.',
    '',
  ].join('\n');
  escribirNuevo(ruta, md);
}

function valor(argv: readonly string[], nombre: string): string | undefined {
  const i = argv.indexOf(nombre);
  return i >= 0 ? argv[i + 1] : undefined;
}

export function cli(argv: readonly string[]): number {
  const banderasConValor = new Set(['--paquete', '--url', '--retriever', '--fecha', '--metodo', '--lote', '--max-mb', '--revisado', '--paginas', '--columnas', '--cierre', '--no-contiene']);
  const archivo = argv.find((a, k) => !a.startsWith('--') && !(k > 0 && banderasConValor.has(argv[k - 1])));
  const paquete = valor(argv, '--paquete');
  const url = valor(argv, '--url');
  const retriever = valor(argv, '--retriever');
  const fecha = valor(argv, '--fecha');
  if (!archivo || !paquete || !url || !retriever || !fecha) {
    console.error('uso: receive-pdf <archivo.pdf> --paquete HN-001-A0N --url <URL exacta> --retriever "<quién>" --fecha <ISO> [--metodo MANUAL_BROWSER|CURL|API|OTHER] [--lote nombre] [--max-mb N] [--paginas DESDE-HASTA] [--columnas 2 [--ultima-solo-izquierda]] [--cierre "<frase>"] [--no-contiene "<frase>"]… [--revisado "<motivo>"]');
    return 2;
  }
  const metodo = (valor(argv, '--metodo') ?? 'MANUAL_BROWSER') as OpcionesRecepcion['metodo'];
  const lote = valor(argv, '--lote') ?? '2026-11-hn-001-tranche-a';
  const mb = valor(argv, '--max-mb');
  const noContiene = argv.flatMap((a, k) => (a === '--no-contiene' && argv[k + 1] ? [argv[k + 1]] : []));
  const col = valor(argv, '--columnas');
  if (col && col !== '1' && col !== '2') { console.error('--columnas debe ser 1 o 2'); return 2; }
  const pag = valor(argv, '--paginas');
  const m = pag ? /^(\d+)-(\d+)$/.exec(pag) : null;
  if (pag && !m) { console.error('--paginas debe tener la forma DESDE-HASTA (p. ej. 12-19)'); return 2; }
  const { recibo, codigo } = recibir({
    archivo: resolve(archivo), paquete, url, retriever, fecha, metodo, lote, raiz: process.cwd(),
    maxMb: mb ? Number(mb) : undefined, revisado: valor(argv, '--revisado'),
    paginasPertinentes: m ? { desde: Number(m[1]), hasta: Number(m[2]) } : undefined,
    columnas: col === '2' ? 2 : undefined,
    ultimaSoloIzquierda: argv.includes('--ultima-solo-izquierda'),
    cierre: valor(argv, '--cierre'),
    noContiene: noContiene.length ? noContiene : undefined,
  });
  console.log(`${recibo.paquete}: ${recibo.estado}${recibo.motivo ? ` — ${recibo.motivo}` : ''}`);
  if (recibo.bytes_sha256) console.log(`bytes_sha256 ${recibo.bytes_sha256}  páginas ${recibo.paginas}`);
  return codigo;
}

if (process.argv[1] && /receive-pdf\.ts$/.test(process.argv[1])) process.exitCode = cli(process.argv.slice(2));
