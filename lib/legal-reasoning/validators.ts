/**
 * lib/legal-reasoning/validators.ts
 *
 * LR-K1 / LR-K2 — deterministic validators. Fail closed: a malformed or
 * incomplete structure is reported as invalid, never silently accepted or
 * repaired. No LLM extraction integration here (per directive, "no LLM
 * extraction integration yet unless strictly required for testing" -- it
 * isn't; these validators operate on already-constructed objects).
 */

import type {
  CaseFact,
  CaseFactOrigin,
  CaseFactStatus,
  MissingFact,
  CitationTrustRecord,
  CitationVerificationState,
} from './types';

export interface ResultadoValidacion {
  valido: boolean;
  errores: string[];
}

function ok(): ResultadoValidacion {
  return { valido: true, errores: [] };
}
function fail(errores: string[]): ResultadoValidacion {
  return { valido: false, errores };
}

// ─────────────────────────────────────────────────────────────────────────────
// LR-K1 — CASE FACT / MISSING FACT
// ─────────────────────────────────────────────────────────────────────────────

const ORIGENES_VALIDOS: ReadonlySet<CaseFactOrigin> = new Set([
  'USER_STATEMENT', 'USER_DOCUMENT', 'PROCEDURAL_RECORD',
]);

const ESTADOS_VALIDOS: ReadonlySet<CaseFactStatus> = new Set([
  'ALLEGED', 'ADMITTED', 'DISPUTED', 'DOCUMENTED', 'PROVEN', 'UNKNOWN',
]);

/**
 * Invariante I (ver docs/architecture/LR-1_LEGAL_REASONING.md): no hecho sin
 * origen. Además de exigir un `origin`/`status` del enum permitido, rechaza
 * explícitamente el literal "ASSUMED" en runtime -- no solo confiando en el
 * tipo estático -- porque un CaseFact puede llegar de una extracción externa
 * (ej. salida de LLM) sin pasar por el compilador.
 */
export function validarCaseFact(fact: CaseFact): ResultadoValidacion {
  const errores: string[] = [];
  if (!fact || typeof fact !== 'object') return fail(['CaseFact ausente o no es un objeto']);
  if (!fact.id) errores.push('CaseFact sin id');
  if (!fact.proposition || fact.proposition.trim().length === 0) errores.push('CaseFact sin proposition');

  const origin = fact.origin as unknown;
  if (!origin || !ORIGENES_VALIDOS.has(origin as CaseFactOrigin)) {
    errores.push(`CaseFact.origin inválido o ausente: ${String(origin)}`);
  }

  const status = fact.status as unknown;
  if (status === 'ASSUMED') {
    errores.push('CaseFact.status="ASSUMED" no está permitido -- invariante I, usar ExplicitInference en su lugar');
  } else if (!status || !ESTADOS_VALIDOS.has(status as CaseFactStatus)) {
    errores.push(`CaseFact.status inválido o ausente: ${String(status)}`);
  }

  return errores.length === 0 ? ok() : fail(errores);
}

export function validarMissingFact(mf: MissingFact): ResultadoValidacion {
  const errores: string[] = [];
  if (!mf || typeof mf !== 'object') return fail(['MissingFact ausente o no es un objeto']);
  if (!mf.id) errores.push('MissingFact sin id');
  if (!mf.description || mf.description.trim().length === 0) errores.push('MissingFact sin description');
  if (!Array.isArray(mf.blocksConclusions)) {
    errores.push('MissingFact.blocksConclusions debe ser un arreglo (puede ser vacío, nunca ausente)');
  }
  return errores.length === 0 ? ok() : fail(errores);
}

// ─────────────────────────────────────────────────────────────────────────────
// LR-K2 — CITATION TRUST I (identidad/proveniencia, NUNCA soporte de proposición)
// ─────────────────────────────────────────────────────────────────────────────

const ESTADOS_CITACION_VALIDOS: ReadonlySet<CitationVerificationState> = new Set([
  'VERIFIED', 'PARTIAL', 'UNRESOLVED', 'DISCOVERY_ONLY',
]);

/**
 * Invariante III: ninguna cita puede validarse como VERIFIED sin evidencia
 * verificada -- exige versionStatus="VERIFIED" Y un hash identificable.
 * UNRESOLVED/DISCOVERY_ONLY son estados legítimos y estables, nunca errores
 * por sí mismos; esta función solo rechaza la promoción indebida a VERIFIED.
 */
export function validarCitationTrustRecord(c: CitationTrustRecord): ResultadoValidacion {
  const errores: string[] = [];
  if (!c || typeof c !== 'object') return fail(['CitationTrustRecord ausente o no es un objeto']);
  if (!c.proposition || c.proposition.trim().length === 0) errores.push('CitationTrustRecord sin proposition');
  if (!c.fuente || c.fuente.trim().length === 0) errores.push('CitationTrustRecord sin fuente');

  const estado = c.verificationState as unknown;
  if (!estado || !ESTADOS_CITACION_VALIDOS.has(estado as CitationVerificationState)) {
    errores.push(`CitationTrustRecord.verificationState inválido o ausente: ${String(estado)}`);
  }

  if (c.verificationState === 'VERIFIED') {
    if (c.versionStatus !== 'VERIFIED') {
      errores.push('CitationTrustRecord.verificationState="VERIFIED" exige versionStatus="VERIFIED" -- invariante III');
    }
    if (!c.hash) {
      errores.push('CitationTrustRecord.verificationState="VERIFIED" exige evidencia identificable (hash) -- invariante III');
    }
  }

  return errores.length === 0 ? ok() : fail(errores);
}

/**
 * true solo si el registro está en un estado que la capa de respuesta puede
 * tratar como autoridad primaria verificada. DISCOVERY_ONLY, PARTIAL y
 * UNRESOLVED devuelven false sin excepción -- ninguno puede "aparentar" ser
 * VERIFIED, sin importar cuán completo luzca el resto del registro.
 */
export function esAutoritativaVerificada(c: CitationTrustRecord): boolean {
  return c.verificationState === 'VERIFIED' && validarCitationTrustRecord(c).valido;
}

/**
 * Invariante V (ninguna incertidumbre puede disfrazarse de verificación):
 * ninguna transición de estado hacia VERIFIED se considera válida a través
 * de esta función -- ese registro debe reconstruirse explícitamente con
 * evidencia real (fuera del alcance de este validador, que solo audita
 * transiciones, nunca las ejecuta). Sirve para que el código consumidor
 * pueda preguntar "¿esta transición sería una promoción automática
 * indebida?" antes de aceptar un cambio de estado propuesto externamente
 * (ej. por una extracción de LLM).
 */
export function esTransicionPromocionIndebida(
  estadoActual: CitationVerificationState,
  estadoPropuesto: CitationVerificationState,
): boolean {
  if (estadoActual === estadoPropuesto) return false;
  return estadoPropuesto === 'VERIFIED';
}
