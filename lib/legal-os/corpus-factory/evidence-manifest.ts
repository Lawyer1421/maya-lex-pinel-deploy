/**
 * lib/legal-os/corpus-factory/evidence-manifest.ts
 * Pre-recepción de evidencia: un MANIFIESTO es metadato de un acto jurídico entregado SIN los bytes ni el texto (sin URL exacta, sin hashes).
 * No es un OfficialSourcePackage y NO puede avanzar al QA: su resultado máximo es NEEDS_SOURCE_BYTES (faltan los bytes/URL/texto para calcular
 * los hashes). No relaja el receptor estricto (validarPaquete/importarPaquetes siguen exigiendo URL https, texto y hashes coincidentes).
 * Reglas: lo no acreditado es UNKNOWN; nunca se resuelve una discrepancia de fechas; nunca se infiere una reforma no declarada;
 * nada es autoritativo, vigente ni verificado. Puro y offline.
 */
import { z } from 'zod';
import { REGISTRO_FUENTES, type RegistryEntry } from '../retrieval/official-source-registry';

const sha256 = z.string().regex(/^[0-9a-f]{64}$/, 'sha256 debe ser 64 hex en minúsculas');
const desconocido = z.union([z.string().trim().min(1), z.literal('UNKNOWN')]);
const fechaIso = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('UNKNOWN')]);

export const ACT_TYPES = ['ORIGINAL', 'AMENDMENT', 'ERRATA', 'DEROGATION', 'CONSOLIDATED'] as const;

export const EvidenceManifestSchema = z.object({
  package_id: z.string().trim().min(1),
  instrument_id: z.string().trim().min(1),
  instrument: z.string().trim().min(1),
  act_type: z.enum(ACT_TYPES),
  decree: desconocido.default('UNKNOWN'),
  decree_date: fechaIso.default('UNKNOWN'),
  gaceta_number: desconocido.default('UNKNOWN'),
  gaceta_date: fechaIso.default('UNKNOWN'),
  /** Fecha propuesta por el proveedor que NO está acreditada con la edición original: sigue siendo candidata. */
  gaceta_date_candidate: fechaIso.default('UNKNOWN'),
  /** Otras fechas que contradicen la candidata. Se conservan; el receptor nunca elige entre ellas. */
  gaceta_date_discrepancies: z.array(z.object({ fecha: z.string().min(1), origen: z.string().min(1) })).default([]),
  /** UNKNOWN o CHECK_FROM_ACT_TEXT (a leer del texto del acto). Un valor concreto se trata como afirmación sin acreditar. */
  effective_date: z.string().min(1).default('UNKNOWN'),
  official_sources: z.array(z.string().trim().min(1)).min(1),
  text_available: z.boolean(),
  pdf_sha256: z.union([sha256, z.literal('UNKNOWN')]).default('UNKNOWN'),
  text_sha256: z.union([sha256, z.literal('UNKNOWN')]).default('UNKNOWN'),
  verification_state: z.string().min(1),
  amends: z.string().trim().min(1).optional(),
  /** Artículos que el proveedor declara reformados por el acto (afirmación pendiente de contrastar con el texto). */
  amended_articles_claimed: z.array(z.string().trim().min(1)).default([]),
  amended_articles_evidence: z.string().optional(),
  legal_relationship: z.string().optional(),
  /** Otros instrumentos que el proveedor dice que el acto afecta (pistas; no se infiere qué artículos). */
  cross_instrument_effects_claimed: z.array(z.string().trim().min(1)).default([]),
  notes: z.array(z.string()).default([]),
});
export type EvidenceManifest = z.infer<typeof EvidenceManifestSchema>;

/** Campos que el receptor estricto exige y que un manifiesto no aporta. */
export const CAMPOS_REQUERIDOS_PARA_PAQUETE = [
  'source_url (https, URL exacta del documento)',
  'source_domain (host de esa URL)',
  'retrieved_at (fecha/hora ISO real de la consulta)',
  'retrieval_method',
  'retriever',
  'bytes_sha256 (sha256 del archivo original descargado)',
  'extracted_text (texto íntegro, sin editar)',
  'text_sha256 (sha256 de extracted_text, UTF-8)',
] as const;

export type EstadoManifiesto = 'NEEDS_SOURCE_BYTES' | 'REJECTED';
export type MotivoManifiesto = 'ESQUEMA_INVALIDO' | 'VERIFICACION_AUTOASIGNADA' | 'HASH_SIN_BYTES' | 'RELACION_INCOHERENTE';

export interface FuenteMencionada {
  texto: string;
  registro: string | null;
  verificacion: RegistryEntry['verification_status'] | 'NOT_IN_REGISTRY';
  tier: number | null;
  dominio: string | null;
}

export interface EvaluacionManifiesto {
  package_id: string;
  estado: EstadoManifiesto;
  razones: MotivoManifiesto[];
  detalle: string[];
  faltantes: string[];
  fuentes: FuenteMencionada[];
  advertencias: string[];
  /** Invariantes: ningún manifiesto es autoridad ni queda verificado. */
  autoritativo: false;
  vigencia: 'UNKNOWN';
  verification: 'PENDING_VERIFICATION';
  manifiesto: EvidenceManifest | null;
}

const MAPA_FUENTES: ReadonlyArray<[RegExp, string]> = [
  [/cedij|poder judicial/i, 'PJ_CEDIJ_LEGISLACION'],
  [/tribunal superior de cuentas|\btsc\b/i, 'TSC'],
  [/congreso nacional/i, 'CONGRESO_NACIONAL'],
  [/gaceta/i, 'GACETA_OFICIAL'],
];

export function clasificarFuenteMencionada(texto: string): FuenteMencionada {
  const id = MAPA_FUENTES.find(([re]) => re.test(texto))?.[1] ?? null;
  const e = id ? REGISTRO_FUENTES.find((x) => x.id === id) ?? null : null;
  return { texto, registro: e?.id ?? null, verificacion: e?.verification_status ?? 'NOT_IN_REGISTRY', tier: e?.source_tier ?? null, dominio: e?.domain ?? null };
}

export function evaluarManifiesto(entrada: unknown): EvaluacionManifiesto {
  const base = { autoritativo: false as const, vigencia: 'UNKNOWN' as const, verification: 'PENDING_VERIFICATION' as const };
  const parsed = EvidenceManifestSchema.safeParse(entrada);
  if (!parsed.success) {
    const id = typeof (entrada as { package_id?: unknown })?.package_id === 'string' ? (entrada as { package_id: string }).package_id : 'UNKNOWN';
    return { ...base, package_id: id, estado: 'REJECTED', razones: ['ESQUEMA_INVALIDO'], detalle: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`), faltantes: [], fuentes: [], advertencias: [], manifiesto: null };
  }
  const m = parsed.data;
  const razones: MotivoManifiesto[] = [];
  const detalle: string[] = [];
  const rechazar = (r: MotivoManifiesto, d: string): void => { razones.push(r); detalle.push(d); };
  const advertencias: string[] = [];

  if (m.verification_state !== 'UNVERIFIED' && m.verification_state !== 'PENDING_VERIFICATION') {
    rechazar('VERIFICACION_AUTOASIGNADA', `verification_state=${m.verification_state}: solo UNVERIFIED|PENDING_VERIFICATION`);
  }
  // Un hash sin los bytes/texto que lo respalden no puede comprobarse: no se acepta como acreditado.
  if ((m.pdf_sha256 !== 'UNKNOWN' || m.text_sha256 !== 'UNKNOWN') && !m.text_available) {
    rechazar('HASH_SIN_BYTES', 'se declara un hash pero text_available=false: no hay nada con qué comprobarlo');
  }
  if (m.act_type === 'AMENDMENT' && !m.amends) advertencias.push('AMENDMENT sin `amends`: no se sabe qué acto reforma (UNKNOWN).');
  if (m.act_type === 'ORIGINAL' && m.amends) rechazar('RELACION_INCOHERENTE', 'un acto ORIGINAL no puede declarar `amends`');
  if (m.amended_articles_claimed.length && m.act_type !== 'AMENDMENT') rechazar('RELACION_INCOHERENTE', 'solo un AMENDMENT puede declarar artículos reformados');

  if (m.gaceta_date === 'UNKNOWN' && m.gaceta_date_candidate !== 'UNKNOWN') advertencias.push(`Fecha de Gaceta solo CANDIDATA (${m.gaceta_date_candidate}); no acreditada con la edición original.`);
  if (m.gaceta_date_discrepancies.length) {
    advertencias.push(`DISCREPANCIA SIN RESOLVER: ${m.gaceta_date_discrepancies.map((d) => `${d.fecha} (${d.origen})`).join('; ')}. El receptor no elige; decide el CLO con la edición original de La Gaceta.`);
  }
  if (m.gaceta_date !== 'UNKNOWN' || m.gaceta_number !== 'UNKNOWN') advertencias.push('Número/fecha de Gaceta declarados por el proveedor; sin acreditar contra la edición original.');
  if (m.effective_date !== 'UNKNOWN' && m.effective_date !== 'CHECK_FROM_ACT_TEXT') advertencias.push(`effective_date=${m.effective_date} es una afirmación sin acreditar; se debe leer del texto del acto.`);
  if (m.amended_articles_claimed.length) advertencias.push(`Artículos reformados DECLARADOS (${m.amended_articles_claimed.length}): ${m.amended_articles_claimed.join(', ')}; pendiente de contrastar con el texto. No se infieren otras reformas.`);
  if (m.cross_instrument_effects_claimed.length) advertencias.push(`Efectos declarados sobre otros instrumentos (pista, sin artículos): ${m.cross_instrument_effects_claimed.join('; ')}.`);

  const fuentes = m.official_sources.map(clasificarFuenteMencionada);
  for (const f of fuentes) {
    if (f.verificacion === 'NOT_IN_REGISTRY') advertencias.push(`Fuente «${f.texto}»: no está en el registro de fuentes oficiales → solo descubrimiento.`);
    else if (f.verificacion !== 'VERIFIED') advertencias.push(`Fuente «${f.texto}»: ${f.registro} está ${f.verificacion} (sin dominio verificado).`);
  }

  const faltantes = [...CAMPOS_REQUERIDOS_PARA_PAQUETE] as string[];
  if (m.pdf_sha256 !== 'UNKNOWN') faltantes.splice(faltantes.findIndex((x) => x.startsWith('bytes_sha256')), 1, 'bytes_sha256 (declarado, no comprobable sin los bytes)');
  if (m.text_sha256 !== 'UNKNOWN') faltantes.splice(faltantes.findIndex((x) => x.startsWith('text_sha256')), 1, 'text_sha256 (declarado, no comprobable sin el texto)');

  if (razones.length) return { ...base, package_id: m.package_id, estado: 'REJECTED', razones, detalle, faltantes: [], fuentes, advertencias, manifiesto: m };
  return { ...base, package_id: m.package_id, estado: 'NEEDS_SOURCE_BYTES', razones: [], detalle: [], faltantes, fuentes, advertencias, manifiesto: m };
}

export function hojaCloManifiesto(e: EvaluacionManifiesto): string {
  const m = e.manifiesto;
  if (!m) return `# Hoja CLO — ${e.package_id}\n\n> **${e.estado}** — manifiesto inválido: ${e.detalle.join('; ')}\n`;
  const L = [
    `# Hoja de verificación CLO — ${m.instrument} · ${m.act_type} · ${m.package_id}`,
    '',
    `> **ESTADO: ${e.estado}.** Sin bytes ni texto: no hay QA, no hay candidato y no se puede aprobar nada. \`authoritative: false\` · vigencia: UNKNOWN · verificación: PENDING_VERIFICATION.`,
    '',
    '## 1. Lo que el proveedor DECLARA (sin acreditar)',
    `- instrument_id: ${m.instrument_id} · decreto: ${m.decree} · fecha del decreto: ${m.decree_date}`,
    `- Gaceta N.º: ${m.gaceta_number} · fecha de Gaceta: ${m.gaceta_date} · fecha de Gaceta candidata: ${m.gaceta_date_candidate}`,
    `- Vigencia / entrada en vigor: ${m.effective_date}`,
    `- Texto disponible según el proveedor: ${m.text_available ? 'sí' : 'no'} · pdf_sha256: ${m.pdf_sha256} · text_sha256: ${m.text_sha256}`,
    ...(m.amends ? [`- Reforma a: ${m.amends}`] : []),
    ...(m.amended_articles_claimed.length ? [`- Artículos reformados declarados: ${m.amended_articles_claimed.join(', ')}${m.amended_articles_evidence ? ` — evidencia citada: ${m.amended_articles_evidence}` : ''}`] : []),
    ...(m.legal_relationship ? [`- Relación jurídica declarada: ${m.legal_relationship}`] : []),
    '',
    '## 2. Fuentes mencionadas y su estado en el registro',
    '| Fuente citada | Registro | Verificación | Tier | Dominio |',
    '|---|---|---|---:|---|',
    ...e.fuentes.map((f) => `| ${f.texto} | ${f.registro ?? '—'} | ${f.verificacion} | ${f.tier ?? '—'} | ${f.dominio ?? '—'} |`),
    '',
    '## 3. Advertencias',
    ...(e.advertencias.length ? e.advertencias.map((a) => `- ${a}`) : ['- Ninguna.']),
    '',
    '## 4. Falta para poder procesar el paquete (NEEDS_SOURCE_BYTES)',
    ...e.faltantes.map((f) => `- [ ] ${f}`),
    '',
    '## 5. Decisión del CLO (solo una persona; nada de esto se decide aquí)',
    '- [ ] Identidad del acto confirmada contra la edición original de La Gaceta (decreto, número y fecha)',
    '- [ ] Discrepancia de fechas resuelta por el CLO (si la hay)',
    '- [ ] Fecha de entrada en vigor leída del texto del acto',
    '- [ ] Relación con otros actos (original / reforma) confirmada',
    '',
    'Nombre: ______________________   Fecha: ____-__-__',
  ];
  return `${L.join('\n')}\n`;
}

export interface ResultadoManifiestos {
  evaluaciones: EvaluacionManifiesto[];
  hojas: Record<string, string>;
}

export function procesarManifiestos(entradas: ReadonlyArray<{ archivo: string; contenido: unknown }>): ResultadoManifiestos {
  const evaluaciones = entradas.map((x) => evaluarManifiesto(x.contenido));
  const hojas: Record<string, string> = {};
  evaluaciones.forEach((e, i) => { hojas[e.package_id === 'UNKNOWN' ? `invalido-${i + 1}` : e.package_id] = hojaCloManifiesto(e); });
  return { evaluaciones, hojas };
}

export function informeManifiestosMd(r: ResultadoManifiestos): string {
  const n = (s: EstadoManifiesto): number => r.evaluaciones.filter((e) => e.estado === s).length;
  const L = [
    '# Informe de manifiestos de evidencia',
    '',
    `Manifiestos: ${r.evaluaciones.length} · NEEDS_SOURCE_BYTES: ${n('NEEDS_SOURCE_BYTES')} · REJECTED: ${n('REJECTED')}`,
    '',
    '> Un manifiesto no es un paquete: sin URL exacta, bytes y texto no hay hash, ni QA, ni candidato. Nada es autoritativo, vigente ni verificado.',
    '',
    '| Paquete | Instrumento | Acto | Estado | Advertencias |',
    '|---|---|---|---|---:|',
    ...r.evaluaciones.map((e) => `| ${e.package_id} | ${e.manifiesto?.instrument ?? '—'} | ${e.manifiesto?.act_type ?? '—'} | ${e.estado} | ${e.advertencias.length} |`),
  ];
  return `${L.join('\n')}\n`;
}
