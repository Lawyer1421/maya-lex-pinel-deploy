/**
 * Procedencia del dictamen CLO de cada caso del Golden Set (H3, dictamen CLO 22-oct-2026).
 *
 * Dos procedencias legítimas y discriminadas; ningún campo de un tipo vale en el otro:
 *  - CLO_ISSUE_RULING: el dictamen del issue #74 del 21-oct-2026. Conserva los requisitos de H3 sin relajar ninguno.
 *  - CLO_OFFICIAL_SOURCE_RULING: dictamen CLO respaldado por fuentes oficiales (La Gaceta) con su SHA-256.
 *    `researchProvenance` sólo dice quién investigó: no es fuente oficial y no satisface ningún requisito.
 */
export type CloRulingSource =
  | {
      kind: 'CLO_ISSUE_RULING';
      verifiedAt: '21-oct-2026';
      /** Debe contener issuecomment-6313691566 y ser la clo_ruling_ref del caso. */
      rulingRef: string;
      /** [A-E]\d o «punto 1». */
      caseCode: string;
    }
  | {
      kind: 'CLO_OFFICIAL_SOURCE_RULING';
      /** dd-mmm-aaaa, fecha real, no posterior al commit. */
      verifiedAt: string;
      officialSources: Array<{ publication: 'La Gaceta'; number: string; sha256: string }>;
      goldenCaseId: string;
      researchProvenance?: string;
    };

export interface ContextoProcedencia {
  /** Fecha del commit que valida; verifiedAt no puede ser posterior. */
  fechaCommit: Date;
  /** Ids de todos los casos del Golden Set (para existencia y duplicados). */
  idsGolden: readonly string[];
  /** Todas las procedencias OFFICIAL del Golden Set (para duplicados de goldenCaseId). */
  todasLasProcedencias?: readonly unknown[];
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;

/** Convierte dd-mmm-aaaa (mes en español, 3 letras) a Date UTC; null si el formato o la fecha no son reales. */
export function parsearFechaDdMmmAaaa(s: unknown): Date | null {
  if (typeof s !== 'string') return null;
  const m = /^(\d{2})-([a-z]{3})-(\d{4})$/.exec(s);
  if (!m) return null;
  const mes = MESES.indexOf(m[2] as (typeof MESES)[number]);
  if (mes < 0) return null;
  const d = new Date(Date.UTC(Number(m[3]), mes, Number(m[1])));
  const real = d.getUTCFullYear() === Number(m[3]) && d.getUTCMonth() === mes && d.getUTCDate() === Number(m[1]);
  return real ? d : null;
}

const CLAVES_ISSUE = ['kind', 'verifiedAt', 'rulingRef', 'caseCode'];
const CLAVES_OFICIAL = ['kind', 'verifiedAt', 'officialSources', 'goldenCaseId', 'researchProvenance'];
const CLAVES_FUENTE = ['publication', 'number', 'sha256'];
const SHA256 = /^[0-9a-f]{64}$/;

/** Devuelve la lista de requisitos incumplidos; vacía si la procedencia es válida. Cada mensaje nombra el caso. */
export function validarProcedencia(casoId: string, cloRulingRef: string, p: unknown, ctx: ContextoProcedencia, gacetaCaso: string | null = null): string[] {
  const e: string[] = [];
  const falla = (req: string) => e.push(`${casoId}: ${req}`);
  if (typeof p !== 'object' || p === null || Array.isArray(p)) return [`${casoId}: falta la procedencia (objeto con kind)`];
  const o = p as Record<string, unknown>;

  if (o.kind === 'CLO_ISSUE_RULING') {
    const extra = Object.keys(o).filter((k) => !CLAVES_ISSUE.includes(k));
    if (extra.length) falla(`mezcla de campos: ${extra.join(', ')} no pertenece a CLO_ISSUE_RULING`);
    if (o.verifiedAt !== '21-oct-2026') falla('verifiedAt debe ser 21-oct-2026');
    if (typeof o.rulingRef !== 'string' || !o.rulingRef.includes('issuecomment-6313691566')) falla('rulingRef debe contener issuecomment-6313691566');
    if (typeof o.rulingRef !== 'string' || !/CLO/.test(o.rulingRef)) falla('rulingRef debe nombrar el dictamen CLO');
    if (o.rulingRef !== cloRulingRef) falla('rulingRef debe ser la clo_ruling_ref del caso');
    if (typeof o.caseCode !== 'string' || !/^(?:[A-E]\d|punto 1)$/.test(o.caseCode)) falla('caseCode debe ser [A-E]\\d o «punto 1»');
    return e;
  }

  if (o.kind === 'CLO_OFFICIAL_SOURCE_RULING') {
    const extra = Object.keys(o).filter((k) => !CLAVES_OFICIAL.includes(k));
    if (extra.length) falla(`mezcla de campos: ${extra.join(', ')} no pertenece a CLO_OFFICIAL_SOURCE_RULING`);
    const fecha = parsearFechaDdMmmAaaa(o.verifiedAt);
    if (!fecha) falla('verifiedAt debe tener formato dd-mmm-aaaa y ser una fecha real');
    else if (fecha.getTime() > Date.UTC(ctx.fechaCommit.getUTCFullYear(), ctx.fechaCommit.getUTCMonth(), ctx.fechaCommit.getUTCDate())) {
      falla('verifiedAt no puede ser posterior a la fecha del commit');
    }
    const fuentes = o.officialSources;
    if (!Array.isArray(fuentes) || fuentes.length < 1) falla('exige al menos 1 fuente oficial');
    else {
      fuentes.forEach((f, i) => {
        const ref = `officialSources[${i}]`;
        if (typeof f !== 'object' || f === null) return falla(`${ref} no es un objeto`);
        const fo = f as Record<string, unknown>;
        const ex = Object.keys(fo).filter((k) => !CLAVES_FUENTE.includes(k));
        if (ex.length) falla(`${ref}: campo no permitido: ${ex.join(', ')}`);
        if (fo.publication !== 'La Gaceta') falla(`${ref}.publication debe ser «La Gaceta»`);
        if (typeof fo.number !== 'string' || !/^\d{2},\d{3}$/.test(fo.number)) falla(`${ref}.number falta o no es un número de Gaceta literal (p. ej. 34,940)`);
        if (typeof fo.sha256 !== 'string' || !SHA256.test(fo.sha256)) falla(`${ref}.sha256 debe tener 64 caracteres hexadecimales en minúscula`);
      });
    }
    const id = o.goldenCaseId;
    if (typeof id !== 'string' || id === '') falla('falta goldenCaseId');
    else {
      const enGolden = ctx.idsGolden.filter((x) => x === id).length;
      if (enGolden === 0) falla(`goldenCaseId ${id} no existe en el Golden Set`);
      if (enGolden > 1) falla(`goldenCaseId ${id} está duplicado en el Golden Set`);
      if (id !== casoId) falla(`goldenCaseId ${id} no corresponde al caso`);
      const enProc = (ctx.todasLasProcedencias ?? []).filter((x) => (x as { goldenCaseId?: unknown })?.goldenCaseId === id).length;
      if (enProc > 1) falla(`goldenCaseId ${id} está duplicado entre las procedencias`);
    }
    if (o.researchProvenance !== undefined) {
      const rp = o.researchProvenance;
      if (typeof rp !== 'string' || rp.trim() === '') falla('researchProvenance debe ser texto no vacío');
      else if (/https?:\/\/|www\./i.test(rp)) falla('researchProvenance no puede contener una URL');
      else if (/#74|issues\/74|issuecomment-6313691566/i.test(rp)) falla('researchProvenance no puede referirse al issue #74');
    }
    if (Array.isArray(fuentes) && fuentes.length >= 1) e.push(...validarFuentesContraReferencia(casoId, fuentes, cloRulingRef, gacetaCaso));
    return e;
  }

  return [`${casoId}: kind debe ser CLO_ISSUE_RULING o CLO_OFFICIAL_SOURCE_RULING`];
}

const PATRON_HASH = /\b[0-9a-fA-F]{64}\b/g;

// ── Reconocimiento de Gacetas (N1) ───────────────────────────────────────────
// Reconoce «La Gaceta 34,940», «Gaceta 34.940», «gaceta 34940», «Gaceta No. 34 940», «Gaceta Nº 34,940»,
// y listas «Gacetas 34,940 y 35,247». Todo se normaliza a «NN,NNN». El número literal de officialSources
// sigue exigiéndose en esa forma; la tolerancia es solo para leer lo que cita clo_ruling_ref o referenciaCLO.
const NUM = String.raw`\d{2}[,. ]?\d{3}`;
const CABEZA_GACETA = new RegExp(String.raw`Gacetas?\s+(?:N(?:o|[°º])\.?\s*|n[úu]m(?:ero)?\.?\s*)?(${NUM})(?!\d)((?:\s*(?:,|;|y|e)\s*${NUM}(?!\d))*)`, 'gi');
const normalizaNumeroGaceta = (n: string): string => {
  const d = n.replace(/\D/g, '');
  return `${d.slice(0, 2)},${d.slice(2)}`;
};

interface CitaGaceta { numeros: string[]; inicio: number; }

/** Todas las Gacetas que cita un texto, con el índice donde empieza cada cita. */
function citasDeGaceta(texto: string): CitaGaceta[] {
  const out: CitaGaceta[] = [];
  for (const m of texto.matchAll(CABEZA_GACETA)) {
    const lista = [m[1], ...(m[2].match(new RegExp(NUM, 'g')) ?? [])];
    out.push({ numeros: lista.map(normalizaNumeroGaceta), inicio: m.index ?? 0 });
  }
  return out;
}

/** Números de Gaceta que cita un texto, normalizados a «NN,NNN». */
export function numerosDeGaceta(texto: string): string[] {
  return citasDeGaceta(texto).flatMap((c) => c.numeros);
}

const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** ¿Aparece «Gaceta N (SHA-256 h)» con el hash literal en minúscula? Tolera «No.», «Nº», separadores del número y «SHA256». */
function sha256AsociadoAGaceta(texto: string, numero: string, sha256: string): boolean {
  const [a, b] = numero.split(',');
  const re = new RegExp(
    String.raw`Gacetas?\s+(?:N(?:o|[°º])\.?\s*|n[úu]m(?:ero)?\.?\s*)?${a}[,. ]?${b}(?!\d)\s*\(\s*SHA-?256\s*[:=]?\s*${escapar(sha256)}\s*\)`,
    'i',
  );
  return re.test(texto);
}

/** Cruza officialSources con clo_ruling_ref y con la Gaceta del caso (M2) y rechaza duplicados (B1). */
function validarFuentesContraReferencia(casoId: string, fuentes: unknown[], cloRulingRef: string, gacetaCaso: string | null): string[] {
  const e: string[] = [];
  const falla = (req: string) => e.push(`${casoId}: ${req}`);
  const fo = fuentes.filter((f): f is { number: string; sha256: string } => typeof f === 'object' && f !== null && typeof (f as { number?: unknown }).number === 'string' && typeof (f as { sha256?: unknown }).sha256 === 'string');

  // B1: ni número ni sha256 repetidos.
  const numeros = fo.map((f) => f.number);
  const hashes = fo.map((f) => f.sha256);
  for (const n of new Set(numeros.filter((x, i) => numeros.indexOf(x) !== i))) falla(`officialSources repite la Gaceta ${n}`);
  for (const h of new Set(hashes.filter((x, i) => hashes.indexOf(x) !== i))) falla(`officialSources repite el sha256 ${h.slice(0, 12)}…`);

  // M2: cada fuente aparece en clo_ruling_ref, con su sha256 en el mismo segmento «La Gaceta N (SHA-256 h)».
  const citados = new Set(numerosDeGaceta(cloRulingRef));
  for (const f of fo) {
    if (!citados.has(f.number)) falla(`la Gaceta ${f.number} de officialSources no aparece en clo_ruling_ref`);
    else if (!cloRulingRef.includes(f.sha256)) falla(`el sha256 de la Gaceta ${f.number} no aparece en clo_ruling_ref`);
    else if (!sha256AsociadoAGaceta(cloRulingRef, f.number, f.sha256)) falla(`el sha256 no está asociado a la Gaceta ${f.number} en clo_ruling_ref (segmento «La Gaceta N (SHA-256 h)»)`);
  }
  // clo_ruling_ref no cita Gacetas ni hashes ausentes de officialSources (N1: en cualquiera de sus formatos).
  for (const n of citados) {
    if (!numeros.includes(n)) falla(`clo_ruling_ref cita la Gaceta ${n}, que no está en officialSources`);
  }
  for (const m of cloRulingRef.matchAll(PATRON_HASH)) {
    if (!hashes.includes(m[0])) falla(`clo_ruling_ref cita un sha256 (${m[0].slice(0, 12)}…) que no está en officialSources`);
  }
  // El conjunto de números de officialSources coincide con el campo gaceta del caso.
  const delCaso = new Set(numerosDeGaceta(`Gaceta ${gacetaCaso ?? ''}`).concat((gacetaCaso ?? '').match(/\d{2},\d{3}/g) ?? []));
  const deFuentes = new Set(numeros);
  const iguales = delCaso.size === deFuentes.size && [...delCaso].every((n) => deFuentes.has(n));
  if (!iguales) falla(`la gaceta del caso («${gacetaCaso ?? 'null'}») no coincide con las Gacetas de officialSources (${[...deFuentes].join(', ')})`);
  return e;
}

/** Verificación de fecha y página de La Gaceta citadas en referenciaCLO (M1). */
export interface VerificacionFechaPagina {
  estado: 'VERIFICADO_CLO_PDF_OFICIAL';
  fecha: string;
  detalle: Array<{ gaceta: string; fecha: string; pagina: string; paginaPdf: number }>;
}

// ── Fechas y páginas citadas (N2) ────────────────────────────────────────────
const MES_POR_NOMBRE: Record<string, string> = {
  ene: 'ene', enero: 'ene', feb: 'feb', febrero: 'feb', mar: 'mar', marzo: 'mar', abr: 'abr', abril: 'abr',
  may: 'may', mayo: 'may', jun: 'jun', junio: 'jun', jul: 'jul', julio: 'jul', ago: 'ago', agosto: 'ago',
  sep: 'sep', sept: 'sep', septiembre: 'sep', setiembre: 'sep', oct: 'oct', octubre: 'oct', nov: 'nov', noviembre: 'nov', dic: 'dic', diciembre: 'dic',
};
const NOMBRES_MES = Object.keys(MES_POR_NOMBRE).sort((x, y) => y.length - x.length).join('|');
const fechaCanonica = (d: number, mes: string, a: string) => `${d}-${mes}-${a}`;

/** Normaliza una fecha a «d-mmm-aaaa» (sin cero inicial), o null si no se reconoce. */
export function normalizaFecha(t: string): string | null {
  const s = t.trim().toLowerCase();
  let m = new RegExp(String.raw`^(\d{1,2})[-\s]+(?:de\s+)?(${NOMBRES_MES})\.?[-\s]+(?:de\s+)?(\d{4})$`).exec(s);
  if (m) return fechaCanonica(Number(m[1]), MES_POR_NOMBRE[m[2]], m[3]);
  m = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(s);
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return fechaCanonica(Number(m[1]), MESES[Number(m[2]) - 1], m[3]);
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return fechaCanonica(Number(m[3]), MESES[Number(m[2]) - 1], m[1]);
  return null;
}

/** Normaliza una página impresa: «140-A», «140A», «A.140», «A-140» → «140-A»; «156» → «156». */
export function normalizaPagina(t: string): string {
  const s = t.trim().toUpperCase().replace(/\s+/g, '');
  let m = /^(\d+)[-.]?([A-Z])$/.exec(s);
  if (m) return `${m[1]}-${m[2]}`;
  m = /^([A-Z])[-.]?(\d+)$/.exec(s);
  if (m) return `${m[2]}-${m[1]}`;
  return s;
}

const FECHA_EN_TEXTO = new RegExp(
  String.raw`\b(\d{1,2}[-\s]+(?:de\s+)?(?:${NOMBRES_MES})\.?[-\s]+(?:de\s+)?\d{4}|\d{1,2}[/.]\d{1,2}[/.]\d{4}|\d{4}-\d{2}-\d{2})\b`,
  'i',
);
const PAGINA_EN_TEXTO = /\b(?:p|pp|p[áa]g|p[áa]gs|p[áa]gina|p[áa]ginas)\s+([0-9]+(?:[-.]?[A-Za-z])?|[A-Za-z][-.]?[0-9]+)(?![\w])/i;

export interface CitaGacetaConDetalle { gaceta: string; fecha: string | null; pagina: string | null; ambigua: boolean }

/**
 * Gacetas de referenciaCLO que citan fecha o página: requieren verificacionFechaPagina.
 * El segmento de una cita va desde «Gaceta N» hasta el siguiente «;», «)», salto de línea, fin de oración o
 * la siguiente Gaceta. Dentro de él se busca cualquier fecha (dd-mmm-aaaa, «10 de mayo de 2019», dd/mm/aaaa,
 * aaaa-mm-dd) y cualquier página (p., pp., pág., página; «141-A», «A.140»), con o sin coma. Un segmento con
 * varias Gacetas y una fecha o página es ambiguo y se marca para exigir verificación de todas.
 */
export function gacetasConFechaOPagina(referenciaCLO: string): CitaGacetaConDetalle[] {
  // Las abreviaturas con punto no terminan una oración.
  const t = referenciaCLO.replace(/\b(p|pp|pág|págs|pag|pags|no|núm|num)\./gi, '$1 ');
  const cabezas = citasDeGaceta(t);
  const out: CitaGacetaConDetalle[] = [];
  cabezas.forEach((c, i) => {
    const desde = c.inicio;
    const hasta = cabezas[i + 1]?.inicio ?? t.length;
    const trozo = t.slice(desde, hasta);
    const corte = trozo.search(/[;)\n]|\.\s+(?=[A-ZÁÉÍÓÚÑ])/);
    const segmento = corte >= 0 ? trozo.slice(0, corte) : trozo;
    // Se descartan los números de la propia cita para no confundirlos con páginas ni fechas.
    const resto = segmento.replace(CABEZA_GACETA, ' ');
    const f = FECHA_EN_TEXTO.exec(resto);
    const p = PAGINA_EN_TEXTO.exec(resto);
    if (!f && !p) return;
    const fecha = f ? (normalizaFecha(f[1]) ?? f[1]) : null;
    const pagina = p ? normalizaPagina(p[1]) : null;
    for (const n of c.numeros) out.push({ gaceta: n, fecha, pagina, ambigua: c.numeros.length > 1 });
  });
  return out;
}

export function validarVerificacionFechaPagina(casoId: string, referenciaCLO: string, v: unknown): string[] {
  const citadas = gacetasConFechaOPagina(referenciaCLO);
  if (citadas.length === 0) return [];
  const e: string[] = [];
  const falla = (req: string) => e.push(`${casoId}: ${req}`);
  if (typeof v !== 'object' || v === null) return [`${casoId}: referenciaCLO cita fecha o página de La Gaceta y falta verificacionFechaPagina`];
  const o = v as Partial<VerificacionFechaPagina>;
  if (o.estado !== 'VERIFICADO_CLO_PDF_OFICIAL') falla('verificacionFechaPagina.estado debe ser VERIFICADO_CLO_PDF_OFICIAL');
  if (parsearFechaDdMmmAaaa(o.fecha) === null) falla('verificacionFechaPagina.fecha debe tener formato dd-mmm-aaaa');
  const detalle = Array.isArray(o.detalle) ? o.detalle : [];
  for (const c of citadas) {
    if (c.ambigua) falla(`la cita de la Gaceta ${c.gaceta} agrupa varias Gacetas con una sola fecha o página; cada Gaceta debe citarse por separado`);
    const d = detalle.find((x) => x?.gaceta === c.gaceta);
    if (!d) { falla(`la Gaceta ${c.gaceta} citada en referenciaCLO no tiene detalle en verificacionFechaPagina`); continue; }
    if (c.fecha !== null && (normalizaFecha(String(d.fecha)) ?? d.fecha) !== c.fecha) falla(`la fecha de la Gaceta ${c.gaceta} (${c.fecha}) no coincide con verificacionFechaPagina (${d.fecha})`);
    if (c.pagina !== null && normalizaPagina(String(d.pagina)) !== c.pagina) falla(`la página de la Gaceta ${c.gaceta} (${c.pagina}) no coincide con verificacionFechaPagina (${d.pagina})`);
    if (!Number.isInteger(d.paginaPdf) || d.paginaPdf < 1) falla(`la Gaceta ${c.gaceta} no tiene paginaPdf válida`);
  }
  return e;
}

/** Valida todo el Golden Set: cada caso exige su procedencia completa y sin sobrantes. */
export function validarProcedenciasGoldenSet(
  casos: readonly { id: string; clo_ruling_ref: string; gaceta: string | null; referenciaCLO?: string; verificacionFechaPagina?: unknown }[],
  procedencias: Readonly<Record<string, unknown>>,
  fechaCommit: Date,
): string[] {
  const ctx: ContextoProcedencia = { fechaCommit, idsGolden: casos.map((c) => c.id), todasLasProcedencias: Object.values(procedencias) };
  const errores = casos.flatMap((c) => [
    ...validarProcedencia(c.id, c.clo_ruling_ref, procedencias[c.id], ctx, c.gaceta),
    ...validarVerificacionFechaPagina(c.id, c.referenciaCLO ?? '', c.verificacionFechaPagina),
  ]);
  for (const id of Object.keys(procedencias)) if (!ctx.idsGolden.includes(id)) errores.push(`${id}: procedencia sin caso en el Golden Set`);
  return errores;
}
