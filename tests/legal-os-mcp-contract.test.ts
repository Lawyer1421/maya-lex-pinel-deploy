import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PERFILES_CLIENTE, aEsquemaJson, describirHerramientas, herramientasParaCanal } from '@/lib/legal-os/tools';
import { CATALOGO } from '@/lib/legal-os/tools/catalog';

describe('descriptores MCP-ready', () => {
  const d = describirHerramientas();
  it('uno por herramienta del catálogo (15), serializables a JSON y con procedencia en la salida', () => {
    expect(d).toHaveLength(CATALOGO.length);
    expect(d.map((x) => x.name)).toEqual(CATALOGO.map((t) => t.name));
    for (const x of d) {
      expect(() => JSON.stringify(x), x.name).not.toThrow();
      expect(JSON.stringify(x.outputSchema), x.name).toContain('provenance');
      expect(x.inputSchema.type, x.name).toBe('object');
      expect(x.timeoutMs).toBeGreaterThan(0);
      expect(x.rateLimit.max).toBeGreaterThan(0);
    }
  });
  it('ningún esquema de entrada cae al comodín: el conversor cubre todo lo que usa el catálogo', () => {
    const props = (e: Record<string, unknown>) => Object.values((e.properties ?? {}) as Record<string, Record<string, unknown>>);
    for (const x of d) for (const p of props(x.inputSchema)) expect(Object.keys(p).length, x.name).toBeGreaterThan(0);
  });
  it('solo resolve_article y validate_citation figuran como implementadas', () => {
    expect(d.filter((x) => x.implemented).map((x) => x.name).sort()).toEqual(['resolve_article', 'validate_citation']);
  });
  it('las herramientas de escritura exigen aprobación (hoy no hay ninguna)', () => {
    for (const x of d) expect(x.requiresApproval).toBe(x.kind === 'WRITE');
  });
  it('conversor: tipos básicos', () => {
    const { z } = require('zod') as typeof import('zod');
    expect(aEsquemaJson(z.object({ a: z.string(), b: z.number().optional(), c: z.enum(['X', 'Y']) }))).toEqual({
      type: 'object', properties: { a: { type: 'string' }, b: { type: 'number' }, c: { type: 'string', enum: ['X', 'Y'] } }, required: ['a', 'c'], additionalProperties: false,
    });
  });
});

describe('perfiles de cliente: mismo backend, distintos canales', () => {
  it('el canal ChatGPT solo recibe lectura; ningún canal recibe documentos privados ni países no habilitados', () => {
    expect(PERFILES_CLIENTE.CHATGPT_APP.scopesMaximos).toEqual(['legal:read']);
    for (const p of Object.values(PERFILES_CLIENTE)) {
      expect(p.documentosPrivados).toBe(false);
      expect(p.paises).toEqual(['HN']);
    }
  });
  it('el canal ChatGPT no ve herramientas de redacción; la web sí', () => {
    expect(herramientasParaCanal('CHATGPT_APP').map((x) => x.name)).not.toContain('draft_from_evidence');
    expect(herramientasParaCanal('WEB').map((x) => x.name)).toContain('draft_from_evidence');
  });
  it('no añade servidor, red ni dependencias', () => {
    const t = readFileSync(join(__dirname, '..', 'lib', 'legal-os', 'tools', 'mcp-contract.ts'), 'utf8');
    expect(t).not.toMatch(/from '(?!zod'|\.\/)|\bfetch\s*\(|process\.env|node:http/);
  });
});
