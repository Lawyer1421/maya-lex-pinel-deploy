/**
 * lib/legal-os/retrieval/official-source-registry.ts
 * Registro legible por máquina de dominios públicos oficiales de Honduras. Datos en docs/retrieval/official-source-registry.json.
 * Un dominio solo es VERIFIED si el registro de campo lo comprobó; `domain: null` = dominio desconocido (no se inventa, p. ej. La Gaceta).
 * Offline: sin red, sin base de datos.
 */
import { z } from 'zod';
import data from '../../../docs/retrieval/official-source-registry.json';

export const AuthorityLevelSchema = z.enum(['PRIMARY_PUBLICATION', 'OFFICIAL_COMPILATION', 'REGULATOR', 'DISCOVERY_ONLY']);
export const VerificationStatusSchema = z.enum(['VERIFIED', 'PENDING_VERIFICATION', 'UNREACHABLE', 'REJECTED_PRIVATE']);

export const RegistryEntrySchema = z.object({
  id: z.string().min(1),
  institution: z.string().min(1),
  domain: z.string().min(3).nullable(),
  authority_level: AuthorityLevelSchema,
  source_types: z.array(z.string()),
  source_tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).nullable(),
  autoritativa: z.boolean(),
  automatizable: z.boolean(),
  verification_status: VerificationStatusSchema,
  last_checked: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  notes: z.string(),
});
export type RegistryEntry = z.infer<typeof RegistryEntrySchema>;

const RegistrySchema = z
  .object({ version: z.number().int(), entries: z.array(RegistryEntrySchema) })
  .superRefine((r, ctx) => {
    const vistos = new Set<string>();
    for (const e of r.entries) {
      if (e.domain) {
        if (vistos.has(e.domain)) ctx.addIssue({ code: 'custom', message: `DOMINIO_DUPLICADO:${e.domain}` });
        vistos.add(e.domain);
      }
      if (e.verification_status === 'VERIFIED' && !e.domain) ctx.addIssue({ code: 'custom', message: `VERIFIED_SIN_DOMINIO:${e.id}` });
      if (e.verification_status === 'VERIFIED' && !e.last_checked) ctx.addIssue({ code: 'custom', message: `VERIFIED_SIN_FECHA:${e.id}` });
      if (e.verification_status !== 'VERIFIED' && e.autoritativa && e.domain) ctx.addIssue({ code: 'custom', message: `AUTORITATIVA_SIN_VERIFICAR:${e.id}` });
      if (e.verification_status === 'REJECTED_PRIVATE' && (e.autoritativa || e.source_tier !== null)) ctx.addIssue({ code: 'custom', message: `PRIVADO_CON_AUTORIDAD:${e.id}` });
      if (e.authority_level === 'DISCOVERY_ONLY' && e.autoritativa) ctx.addIssue({ code: 'custom', message: `DESCUBRIMIENTO_AUTORITATIVO:${e.id}` });
    }
  });

export const REGISTRO_FUENTES: readonly RegistryEntry[] = Object.freeze(RegistrySchema.parse(data).entries);

export function buscarPorDominio(host: string): RegistryEntry | null {
  const h = host.toLowerCase();
  return REGISTRO_FUENTES.find((e) => e.domain === h) ?? null;
}

/** Entradas con dominio comprobado. */
export const dominiosVerificados = (): RegistryEntry[] => REGISTRO_FUENTES.filter((e) => e.verification_status === 'VERIFIED' && e.domain);
/** Instituciones cuyo dominio oficial aún se desconoce. */
export const institucionesSinDominio = (): RegistryEntry[] => REGISTRO_FUENTES.filter((e) => e.domain === null);
