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
export function validarProcedencia(casoId: string, cloRulingRef: string, p: unknown, ctx: ContextoProcedencia): string[] {
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
    if (o.researchProvenance !== undefined && typeof o.researchProvenance !== 'string') falla('researchProvenance debe ser texto');
    return e;
  }

  return [`${casoId}: kind debe ser CLO_ISSUE_RULING o CLO_OFFICIAL_SOURCE_RULING`];
}

/** Valida todo el Golden Set: cada caso exige su procedencia completa y sin sobrantes. */
export function validarProcedenciasGoldenSet(
  casos: readonly { id: string; clo_ruling_ref: string }[],
  procedencias: Readonly<Record<string, unknown>>,
  fechaCommit: Date,
): string[] {
  const ctx: ContextoProcedencia = { fechaCommit, idsGolden: casos.map((c) => c.id), todasLasProcedencias: Object.values(procedencias) };
  const errores = casos.flatMap((c) => validarProcedencia(c.id, c.clo_ruling_ref, procedencias[c.id], ctx));
  for (const id of Object.keys(procedencias)) if (!ctx.idsGolden.includes(id)) errores.push(`${id}: procedencia sin caso en el Golden Set`);
  return errores;
}
