/**
 * lib/legal-os/jurisprudence/index.ts
 * Esquema y reglas puras del pipeline de jurisprudencia (offline: sin red, sin base de datos, sin sentencias reales).
 *
 * Invariantes:
 *  - `precedential_status` es UNKNOWN por defecto y SOLO cambia con un registro de verificación humana. Jamás se infiere por
 *    similitud semántica.
 *  - Un registro privado o de estado público desconocido no entra a ningún índice público.
 *  - `source_url` debe estar en un host oficial verificado en docs/retrieval/OFFICIAL_HONDURAS_SOURCE_REGISTRY.md; un host solo de
 *    descubrimiento (DISCOVERY_ONLY) no basta para indexar.
 *  - V4/V5/AVAILABLE exigen actor humano y aprobación registrada (mismas reglas que corpus-factory).
 */
import { z } from 'zod';
import { ApprovalSchema, MateriaSchema, type Approval } from '../corpus-factory/schema';
import type { Actor } from '../corpus-factory/pipeline';

/** Hosts con clasificación verificada en vivo en el registro. SIJ (sij.poderjudicial.gob.hn) NO está: fue inalcanzable. */
export const HOSTS_OFICIALES: Readonly<Record<string, 'PRIMARY_OFFICIAL' | 'SECONDARY_OFFICIAL' | 'DISCOVERY_ONLY'>> = Object.freeze({
  'legislacion.poderjudicial.gob.hn': 'PRIMARY_OFFICIAL',
  'sejeinfo.poderjudicial.gob.hn': 'SECONDARY_OFFICIAL',
  'www.poderjudicial.gob.hn': 'DISCOVERY_ONLY',
});

export type ClaseHost = 'PRIMARY_OFFICIAL' | 'SECONDARY_OFFICIAL' | 'DISCOVERY_ONLY' | 'NO_VERIFICADO';

export function claseDeHost(url: string): ClaseHost {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return 'NO_VERIFICADO';
  }
  if (u.protocol !== 'https:' || u.username || u.password) return 'NO_VERIFICADO';
  return HOSTS_OFICIALES[u.hostname.toLowerCase()] ?? 'NO_VERIFICADO';
}

export const ETAPAS_JURIS = ['DISCOVER', 'DOWNLOAD', 'HASH', 'EXTRACT', 'PRIVACY_CHECK', 'METADATA', 'QA', 'HUMAN_VERIFICATION', 'V4', 'V5', 'INDEX', 'AVAILABLE'] as const;
export type EtapaJuris = (typeof ETAPAS_JURIS)[number];
const PASOS_HUMANOS: ReadonlySet<EtapaJuris> = new Set<EtapaJuris>(['V4', 'V5', 'AVAILABLE']);

const fechaIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const sha256 = z.string().regex(/^[0-9a-f]{64}$/);
const desconocido = z.union([z.string().trim().min(1), z.literal('UNKNOWN')]);

export const PrecedentialStatusSchema = z.enum(['UNKNOWN', 'BINDING', 'PERSUASIVE', 'NOT_PRECEDENT']);
export const PublicPrivateSchema = z.enum(['PUBLIC', 'PRIVATE', 'UNKNOWN']);

/** Registro humano que fija el valor precedencial. Sin él, el estado es UNKNOWN. */
export const PrecedentialVerificationSchema = z.object({ verifier: z.string().trim().min(1), date: fechaIso, basis: z.string().trim().min(1) });

export const JurisprudenceRecordSchema = z
  .object({
    id: z.string().min(1),
    court: desconocido,
    chamber: desconocido,
    case_number: desconocido,
    date: z.union([fechaIso, z.literal('UNKNOWN')]),
    matter: MateriaSchema,
    legal_issue: z.string().nullable(),
    ratio: z.string().nullable(),
    holding: z.string().nullable(),
    cited_laws: z.array(z.string().min(1)),
    cited_articles: z.array(z.string().min(1)),
    precedential_status: PrecedentialStatusSchema.default('UNKNOWN'),
    precedential_verification: PrecedentialVerificationSchema.nullable().default(null),
    public_private_status: PublicPrivateSchema.default('UNKNOWN'),
    source_url: z.string().url(),
    document_hash: sha256,
    ingestion_state: z.enum(ETAPAS_JURIS),
    approvals: z.array(ApprovalSchema).default([]),
  })
  .superRefine((r, ctx) => {
    if (r.precedential_status !== 'UNKNOWN' && !r.precedential_verification) {
      ctx.addIssue({ code: 'custom', path: ['precedential_status'], message: 'PRECEDENTIAL_STATUS_REQUIERE_VERIFICACION_HUMANA' });
    }
    if (r.precedential_status === 'UNKNOWN' && r.precedential_verification) {
      ctx.addIssue({ code: 'custom', path: ['precedential_verification'], message: 'VERIFICACION_SIN_ESTADO' });
    }
  });
export type JurisprudenceRecord = z.infer<typeof JurisprudenceRecordSchema>;

/** Valida un registro; devuelve problemas (vacío = válido). No lanza. */
export function validarRegistroJurisprudencia(entrada: unknown): { valido: boolean; problemas: string[] } {
  const r = JurisprudenceRecordSchema.safeParse(entrada);
  if (!r.success) return { valido: false, problemas: r.error.issues.map((i) => i.message || i.path.join('.')) };
  const problemas: string[] = [];
  if (claseDeHost(r.data.source_url) === 'NO_VERIFICADO') problemas.push('HOST_NO_OFICIAL_VERIFICADO');
  return { valido: problemas.length === 0, problemas };
}

/** Disponible = pipeline completo con las tres aprobaciones humanas (V4, V5, AVAILABLE). */
function aprobadoCompleto(r: JurisprudenceRecord): boolean {
  const e = new Set(r.approvals.map((a) => a.stage));
  return r.ingestion_state === 'AVAILABLE' && e.has('V4') && e.has('V5') && e.has('AVAILABLE');
}

/** ¿Puede entrar a un índice público? Fail-closed. El valor precedencial NO es requisito: UNKNOWN se indexa como «sin determinar». */
export function puedeIndexarPublicamente(entrada: unknown): { puede: boolean; motivos: string[] } {
  const v = validarRegistroJurisprudencia(entrada);
  if (!v.valido) return { puede: false, motivos: v.problemas };
  const r = JurisprudenceRecordSchema.parse(entrada);
  const motivos: string[] = [];
  if (r.public_private_status !== 'PUBLIC') motivos.push('NO_ES_PUBLICA_VERIFICADA');
  const clase = claseDeHost(r.source_url);
  if (clase !== 'PRIMARY_OFFICIAL' && clase !== 'SECONDARY_OFFICIAL') motivos.push('HOST_SOLO_DESCUBRIMIENTO');
  if (!aprobadoCompleto(r)) motivos.push('SIN_APROBACION_HUMANA_COMPLETA');
  return { puede: motivos.length === 0, motivos };
}

export type ResultadoAvance =
  | { ok: true; valor: JurisprudenceRecord }
  | { ok: false; motivo: 'NO_ES_SIGUIENTE_PASO' | 'REQUIERE_ACTOR_HUMANO' | 'REQUIERE_APROBACION' | 'APROBACION_INVALIDA' | 'ESTADO_TERMINAL' | 'PRIVADO_O_DESCONOCIDO' };

/** Avanza un paso. V4/V5/AVAILABLE: actor humano + aprobación. INDEX y AVAILABLE además exigen estado PUBLIC. Devuelve un registro nuevo. */
export function avanzarJurisprudencia(r: JurisprudenceRecord, a: EtapaJuris, actor: Actor, aprobacion?: Approval): ResultadoAvance {
  const i = ETAPAS_JURIS.indexOf(r.ingestion_state);
  if (i === ETAPAS_JURIS.length - 1) return { ok: false, motivo: 'ESTADO_TERMINAL' };
  if (ETAPAS_JURIS[i + 1] !== a) return { ok: false, motivo: 'NO_ES_SIGUIENTE_PASO' };
  if ((a === 'INDEX' || a === 'AVAILABLE') && r.public_private_status !== 'PUBLIC') return { ok: false, motivo: 'PRIVADO_O_DESCONOCIDO' };
  let sig: JurisprudenceRecord = { ...r, ingestion_state: a };
  if (PASOS_HUMANOS.has(a)) {
    if (actor.kind !== 'HUMAN' || !actor.name.trim()) return { ok: false, motivo: 'REQUIERE_ACTOR_HUMANO' };
    if (!aprobacion) return { ok: false, motivo: 'REQUIERE_APROBACION' };
    if (aprobacion.stage !== a || !ApprovalSchema.safeParse(aprobacion).success) return { ok: false, motivo: 'APROBACION_INVALIDA' };
    sig = { ...sig, approvals: [...r.approvals, aprobacion] };
  }
  return { ok: true, valor: JurisprudenceRecordSchema.parse(sig) };
}

/** Fija el valor precedencial. Solo una persona, con base escrita; un agente/automatización es rechazado. */
export function fijarValorPrecedencial(
  r: JurisprudenceRecord,
  estado: Exclude<z.infer<typeof PrecedentialStatusSchema>, 'UNKNOWN'>,
  actor: Actor,
  verificacion: z.infer<typeof PrecedentialVerificationSchema>,
): { ok: true; valor: JurisprudenceRecord } | { ok: false; motivo: 'REQUIERE_ACTOR_HUMANO' | 'VERIFICACION_INVALIDA' } {
  if (actor.kind !== 'HUMAN' || !actor.name.trim()) return { ok: false, motivo: 'REQUIERE_ACTOR_HUMANO' };
  if (!PrecedentialVerificationSchema.safeParse(verificacion).success) return { ok: false, motivo: 'VERIFICACION_INVALIDA' };
  return { ok: true, valor: JurisprudenceRecordSchema.parse({ ...r, precedential_status: estado, precedential_verification: verificacion }) };
}
