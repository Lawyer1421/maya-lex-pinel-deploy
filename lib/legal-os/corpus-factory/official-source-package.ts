/**
 * lib/legal-os/corpus-factory/official-source-package.ts
 * Contrato de importación para material oficial investigado FUERA de este entorno (investigación humana o de ChatGPT).
 * Importar NO otorga autoridad: EXTERNAL DISCOVERY → PACKAGE → HASH VALIDATION → SOURCE VALIDATION → CORPUS QA → CLO → V4/V5.
 * Offline: solo calcula hashes; no hace red ni toca bases de datos.
 */
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { buscarPorDominio } from '../retrieval/official-source-registry';
import { SourceTierSchema } from './schema';

const sha256 = z.string().regex(/^[0-9a-f]{64}$/, 'sha256 debe ser 64 hex en minúsculas');
const desconocido = z.union([z.string().trim().min(1), z.literal('UNKNOWN')]);

export const OfficialSourcePackageSchema = z.object({
  source_url: z.string().url(),
  source_domain: z.string().min(3),
  retrieved_at: z.string().min(8),
  document_name: z.string().trim().min(1),
  document_type: z.enum(['LAW', 'DECREE', 'CODE', 'REGULATION', 'REFORM', 'JUDGMENT', 'TREATY', 'OTHER']),
  decree: desconocido.default('UNKNOWN'),
  gaceta: desconocido.default('UNKNOWN'),
  gaceta_date: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('UNKNOWN')]).default('UNKNOWN'),
  bytes_sha256: sha256,
  text_sha256: sha256,
  extracted_text: z.string(),
  retrieval_method: z.enum(['MANUAL_BROWSER', 'CURL', 'API', 'OTHER']),
  source_tier: SourceTierSchema.nullable(),
  retriever: z.string().trim().min(1),
  verification_state: z.string().min(1),
});
export type OfficialSourcePackage = z.infer<typeof OfficialSourcePackageSchema>;

export type MotivoRechazoPaquete =
  | 'ESQUEMA_INVALIDO' | 'HASH_MISMATCH' | 'BYTES_HASH_MISMATCH' | 'URL_NO_HTTPS' | 'DOMINIO_NO_COINCIDE' | 'FUENTE_PRIVADA_RECHAZADA'
  | 'TIER_EXCEDE_REGISTRO' | 'TEXTO_DEMASIADO_CORTO' | 'FECHA_FUTURA' | 'FECHA_INVALIDA' | 'VERIFICACION_AUTOASIGNADA';

export type Tier = 1 | 2 | 3 | 4 | 5;

export type ResultadoPaquete =
  | { estado: 'REJECTED'; razones: MotivoRechazoPaquete[]; detalle: string[] }
  | { estado: 'DISCOVERED_UNVERIFIED' | 'SOURCE_VALIDATED'; paquete: OfficialSourcePackage; tierConcedido: Tier | null; autoritativo: false; advertencias: string[] };

export interface OpcionesValidacion {
  /** Bytes del archivo original: si se aportan, se verifica bytes_sha256. */
  bytes?: Uint8Array;
  now?: Date;
  minTextLength?: number;
}

export const MIN_TEXTO_POR_DEFECTO = 80;

export const sha256Texto = (t: string): string => createHash('sha256').update(t, 'utf8').digest('hex');
export const sha256Bytes = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex');

export function validarPaquete(entrada: unknown, opts: OpcionesValidacion = {}): ResultadoPaquete {
  const parsed = OfficialSourcePackageSchema.safeParse(entrada);
  if (!parsed.success) return { estado: 'REJECTED', razones: ['ESQUEMA_INVALIDO'], detalle: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
  const p = parsed.data;
  const razones: MotivoRechazoPaquete[] = [];
  const detalle: string[] = [];
  const rechazar = (m: MotivoRechazoPaquete, d: string) => { razones.push(m); detalle.push(d); };

  if (sha256Texto(p.extracted_text) !== p.text_sha256) rechazar('HASH_MISMATCH', 'sha256(extracted_text UTF-8) no coincide con text_sha256');
  if (opts.bytes && sha256Bytes(opts.bytes) !== p.bytes_sha256) rechazar('BYTES_HASH_MISMATCH', 'sha256(bytes) no coincide con bytes_sha256');
  if (p.extracted_text.trim().length < (opts.minTextLength ?? MIN_TEXTO_POR_DEFECTO)) rechazar('TEXTO_DEMASIADO_CORTO', 'texto vacío o absurdamente corto');

  let host = '';
  try {
    const u = new URL(p.source_url);
    host = u.hostname.toLowerCase();
    if (u.protocol !== 'https:') rechazar('URL_NO_HTTPS', 'la fuente debe ser https');
    if (u.username || u.password) rechazar('DOMINIO_NO_COINCIDE', 'URL con credenciales embebidas');
  } catch {
    rechazar('ESQUEMA_INVALIDO', 'source_url no se puede analizar');
  }
  if (host && p.source_domain.toLowerCase() !== host) rechazar('DOMINIO_NO_COINCIDE', `source_domain ${p.source_domain} ≠ host de la URL ${host}`);

  const ahora = (opts.now ?? new Date()).getTime();
  const t = Date.parse(p.retrieved_at);
  if (Number.isNaN(t)) rechazar('FECHA_INVALIDA', 'retrieved_at no es una fecha ISO');
  else if (t > ahora) rechazar('FECHA_FUTURA', 'retrieved_at está en el futuro');

  // Un paquete jamás se autoverifica.
  if (p.verification_state !== 'UNVERIFIED' && p.verification_state !== 'PENDING_VERIFICATION') {
    rechazar('VERIFICACION_AUTOASIGNADA', `verification_state=${p.verification_state}: solo UNVERIFIED|PENDING_VERIFICATION`);
  }

  const reg = host ? buscarPorDominio(host) : null;
  let estado: 'DISCOVERED_UNVERIFIED' | 'SOURCE_VALIDATED' = 'DISCOVERED_UNVERIFIED';
  let concedido: Tier | null = null;
  const advertencias: string[] = [];
  if (reg?.verification_status === 'REJECTED_PRIVATE') {
    rechazar('FUENTE_PRIVADA_RECHAZADA', `${host} es una fuente privada rechazada (${reg.institution})`);
  } else if (reg?.verification_status === 'VERIFIED' && reg.source_tier !== null && reg.authority_level !== 'DISCOVERY_ONLY') {
    estado = 'SOURCE_VALIDATED';
    concedido = reg.source_tier;
  } else if (reg) {
    advertencias.push(`${host}: ${reg.verification_status}/${reg.authority_level} → solo descubrimiento`);
  } else if (host) {
    advertencias.push(`${host} no está en el registro de fuentes oficiales → solo descubrimiento`);
  }
  // Tier 1 es el más alto: declarar un número menor que el concedido es pretender más autoridad de la que el registro da.
  if (p.source_tier !== null && (concedido === null || p.source_tier < concedido)) {
    rechazar('TIER_EXCEDE_REGISTRO', `el paquete declara tier ${p.source_tier} y el registro concede ${concedido ?? 'ninguno'}`);
  }

  if (razones.length) return { estado: 'REJECTED', razones, detalle };
  if (estado === 'SOURCE_VALIDATED') advertencias.push('SOURCE_VALIDATED no es autoridad: faltan CORPUS_QA → CLO → V4/V5 (humanos).');
  return { estado, paquete: p, tierConcedido: concedido, autoritativo: false, advertencias };
}
