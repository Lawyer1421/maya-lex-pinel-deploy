/**
 * JSON Schema estricto de la salida del modelo (PR-G1, dictamen CLO 21-oct-2026)
 * y su validación determinística. additionalProperties: false en todos los
 * objetos, enums cerrados y todos los campos obligatorios: lo que no cumpla el
 * esquema es INVALID, nunca se completa con valores por defecto.
 */
import { z } from 'zod';

export const MODEL_OUTPUT_JSON_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'MayaLexShadowGatewayOutput',
  type: 'object',
  additionalProperties: false,
  required: ['decision', 'claims', 'abstention_reason'],
  properties: {
    decision: { type: 'string', enum: ['ANSWER', 'ABSTAIN'] },
    claims: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['claim_id', 'text', 'citations'],
        properties: {
          claim_id: { type: 'string', minLength: 1 },
          text: { type: 'string', minLength: 1 },
          citations: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['chunk_id', 'support'],
              properties: {
                chunk_id: { type: 'string', minLength: 1 },
                support: { type: 'string', enum: ['DIRECT', 'INDIRECT'] },
              },
            },
          },
        },
      },
    },
    abstention_reason: { type: ['string', 'null'] },
  },
} as const;

const citacionSchema = z
  .object({
    chunk_id: z.string().min(1),
    support: z.enum(['DIRECT', 'INDIRECT']),
  })
  .strict();

const claimSchema = z
  .object({
    claim_id: z.string().min(1),
    text: z.string().min(1),
    citations: z.array(citacionSchema),
  })
  .strict();

/** Espejo en zod de MODEL_OUTPUT_JSON_SCHEMA (un test comprueba que coinciden). */
export const modelOutputSchema = z
  .object({
    decision: z.enum(['ANSWER', 'ABSTAIN']),
    claims: z.array(claimSchema),
    abstention_reason: z.union([z.string(), z.null()]),
  })
  .strict();

export type ModelOutput = z.infer<typeof modelOutputSchema>;

export type ParseoSalida = { ok: true; salida: ModelOutput } | { ok: false; motivo: string };

/**
 * Valida la salida cruda del modelo. Acepta un objeto o un string JSON. Además
 * del esquema exige coherencia: ABSTAIN lleva motivo no vacío y ninguna claim;
 * ANSWER lleva abstention_reason null.
 */
export function parsearSalidaModelo(raw: unknown): ParseoSalida {
  let valor = raw;
  if (typeof raw === 'string') {
    try {
      valor = JSON.parse(raw);
    } catch {
      return { ok: false, motivo: 'la salida no es JSON válido' };
    }
  }
  const r = modelOutputSchema.safeParse(valor);
  if (!r.success) {
    return { ok: false, motivo: `no cumple el esquema: ${r.error.issues.map((i) => i.path.join('.') || '(raíz)').join(', ')}` };
  }
  const s = r.data;
  if (s.decision === 'ABSTAIN') {
    if (s.abstention_reason === null || s.abstention_reason.trim() === '') {
      return { ok: false, motivo: 'ABSTAIN sin abstention_reason' };
    }
    if (s.claims.length > 0) return { ok: false, motivo: 'ABSTAIN con claims' };
  } else if (s.abstention_reason !== null) {
    return { ok: false, motivo: 'ANSWER con abstention_reason' };
  }
  const ids = s.claims.map((c) => c.claim_id);
  if (new Set(ids).size !== ids.length) return { ok: false, motivo: 'claim_id repetido' };
  return { ok: true, salida: s };
}
