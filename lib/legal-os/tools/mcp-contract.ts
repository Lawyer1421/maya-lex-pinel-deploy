/**
 * lib/legal-os/tools/mcp-contract.ts
 * P14 — contrato de herramientas «listo para MCP». Mismo backend jurídico, clientes distintos: web de MayaLex, app de ChatGPT, app móvil
 * y MayaLex C.A. Esto NO es un servidor MCP (no abre red ni añade dependencias): es el descriptor serializable (nombre, descripción, esquemas
 * JSON, alcances, límites) que un servidor MCP o un conector expondría, más el perfil de cliente que decide qué alcances puede recibir.
 */
import type { z } from 'zod';
import { CATALOGO, SCOPE_DRAFT, SCOPE_LEGAL_READ } from './catalog';
import type { ToolDefinition } from './types';

export type EsquemaJson = { [k: string]: unknown };

/** Conversor mínimo de zod → JSON Schema para el subconjunto que usa el catálogo. Lo desconocido se declara como `{}` (cualquier valor) y una prueba lo detecta. */
export function aEsquemaJson(esquema: z.ZodTypeAny): EsquemaJson {
  const def = (esquema as unknown as { _def: { typeName: string } & Record<string, unknown> })._def;
  switch (def.typeName) {
    case 'ZodString': return { type: 'string' };
    case 'ZodNumber': return { type: 'number' };
    case 'ZodBoolean': return { type: 'boolean' };
    case 'ZodLiteral': return { const: def.value };
    case 'ZodEnum': return { type: 'string', enum: def.values };
    case 'ZodNullable': return { anyOf: [aEsquemaJson(def.innerType as z.ZodTypeAny), { type: 'null' }] };
    case 'ZodOptional':
    case 'ZodDefault':
    case 'ZodEffects': return aEsquemaJson((def.innerType ?? def.schema) as z.ZodTypeAny);
    case 'ZodArray': return { type: 'array', items: aEsquemaJson(def.type as z.ZodTypeAny) };
    case 'ZodUnion': return { anyOf: (def.options as z.ZodTypeAny[]).map(aEsquemaJson) };
    case 'ZodObject': {
      const shape = (def.shape as () => Record<string, z.ZodTypeAny>)();
      const required = Object.entries(shape).filter(([, v]) => !v.isOptional()).map(([k]) => k);
      return { type: 'object', properties: Object.fromEntries(Object.entries(shape).map(([k, v]) => [k, aEsquemaJson(v)])), required, additionalProperties: false };
    }
    default: return {};
  }
}

export interface DescriptorHerramienta {
  name: string;
  description: string;
  kind: ToolDefinition['kind'];
  inputSchema: EsquemaJson;
  outputSchema: EsquemaJson;
  scopes: readonly string[];
  requiresApproval: boolean;
  timeoutMs: number;
  rateLimit: { max: number; windowMs: number };
  /** Declarada pero sin handler cableado: un cliente no debe ofrecerla como disponible. */
  implemented: boolean;
}

export function describirHerramientas(catalogo: readonly ToolDefinition[] = CATALOGO): DescriptorHerramienta[] {
  return catalogo.map((t) => ({
    name: t.name, description: t.description, kind: t.kind, inputSchema: aEsquemaJson(t.inputSchema), outputSchema: aEsquemaJson(t.outputSchema),
    scopes: t.scopes, requiresApproval: t.kind === 'WRITE', timeoutMs: t.timeoutMs, rateLimit: t.rateLimit,
    implemented: !/NOT_IMPLEMENTED|noImplementada/.test(t.handler.name) && t.handler.name !== 'noImplementada',
  }));
}

export type CanalCliente = 'WEB' | 'CHATGPT_APP' | 'MOBILE' | 'CENTROAMERICA';

export interface PerfilCliente {
  canal: CanalCliente;
  /** Alcances máximos que este canal puede recibir. Los de escritura/acción nunca se conceden por defecto. */
  scopesMaximos: readonly string[];
  /** Países que el canal puede consultar (solo los habilitados en el registro de jurisdicciones). */
  paises: readonly string[];
  /** Los documentos privados del usuario nunca viajan por este canal sin una ruta de privacidad aprobada. */
  documentosPrivados: false;
}

export const PERFILES_CLIENTE: Readonly<Record<CanalCliente, PerfilCliente>> = Object.freeze({
  WEB: { canal: 'WEB', scopesMaximos: [SCOPE_LEGAL_READ, SCOPE_DRAFT], paises: ['HN'], documentosPrivados: false },
  CHATGPT_APP: { canal: 'CHATGPT_APP', scopesMaximos: [SCOPE_LEGAL_READ], paises: ['HN'], documentosPrivados: false },
  MOBILE: { canal: 'MOBILE', scopesMaximos: [SCOPE_LEGAL_READ, SCOPE_DRAFT], paises: ['HN'], documentosPrivados: false },
  CENTROAMERICA: { canal: 'CENTROAMERICA', scopesMaximos: [SCOPE_LEGAL_READ], paises: ['HN'], documentosPrivados: false },
});

/** Herramientas que un canal puede ver: su alcance está dentro del máximo del canal y no exigen aprobación humana. */
export function herramientasParaCanal(canal: CanalCliente, catalogo: readonly ToolDefinition[] = CATALOGO): DescriptorHerramienta[] {
  const p = PERFILES_CLIENTE[canal];
  return describirHerramientas(catalogo).filter((d) => d.scopes.every((s) => p.scopesMaximos.includes(s)) && !d.requiresApproval);
}
