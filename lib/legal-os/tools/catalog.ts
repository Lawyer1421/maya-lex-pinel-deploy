/**
 * lib/legal-os/tools/catalog.ts
 * Catálogo de herramientas. Solo `resolve_article` y `validate_citation` están cableadas (funciones puras, sin base de datos ni red);
 * el resto son descriptores tipados cuyo handler responde NOT_IMPLEMENTED hasta que se cableen con su propia misión.
 */
import { z } from 'zod';
import { detectarArticuloExacto, detectarInstrumentoDesdeTexto } from '../../legal-retrieval/exact-resolver';
import { MAX_CARACTERES_CITA, NORMALIZACION_CITA, verificarCita } from '../../mcp/verificar-cita';
import { ToolError, salidaConProcedencia, type ToolDefinition } from './types';

export const SCOPE_LEGAL_READ = 'legal:read';
export const SCOPE_DRAFT = 'legal:draft';

const LIMITE_LECTURA = { max: 60, windowMs: 60_000 } as const;
const LIMITE_BUSQUEDA = { max: 30, windowMs: 60_000 } as const;

const noImplementada = async (): Promise<never> => {
  throw new ToolError('NOT_IMPLEMENTED', 'herramienta declarada pero aún no cableada');
};

const texto = z.string().trim().min(1).max(2_000);
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const pais = z.string().regex(/^[A-Z]{2}$/).default('HN');
const hallazgos = z.array(z.object({ id: z.string(), titulo: z.string(), url: z.string().optional() }).strict());

interface DescStub {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
  scopes?: readonly string[];
  timeoutMs?: number;
  rateLimit?: { max: number; windowMs: number };
}

function stub(d: DescStub): ToolDefinition {
  return { kind: 'READ', scopes: [SCOPE_LEGAL_READ], timeoutMs: 5_000, rateLimit: LIMITE_BUSQUEDA, handler: noImplementada, ...d };
}

const resolveArticle: ToolDefinition = {
  name: 'resolve_article',
  description: 'Detecta, de forma sintáctica, qué artículo e instrumento nombra un texto. No verifica existencia ni vigencia.',
  kind: 'READ',
  inputSchema: z.object({ text: texto }).strict(),
  outputSchema: salidaConProcedencia({
    resolved: z.boolean(),
    articleNumber: z.string().nullable(),
    matter: z.string().nullable(),
    instrument: z.string().nullable(),
    note: z.literal('detección sintáctica: no verifica existencia, texto ni vigencia'),
  }),
  scopes: [SCOPE_LEGAL_READ],
  timeoutMs: 1_000,
  rateLimit: LIMITE_LECTURA,
  handler: async (input: { text: string }, { ctx }) => {
    const d = detectarArticuloExacto(input.text);
    return {
      resolved: d !== null,
      articleNumber: d?.numero ?? null,
      matter: d?.materiaDetectada ?? null,
      instrument: d?.instrumento ?? detectarInstrumentoDesdeTexto(input.text),
      note: 'detección sintáctica: no verifica existencia, texto ni vigencia' as const,
      provenance: { source: 'lib/legal-retrieval/exact-resolver', tier: 'DERIVED' as const, retrievedAt: new Date(ctx.now()).toISOString() },
    };
  },
};

const validateCitation: ToolDefinition = {
  name: 'validate_citation',
  description: 'Compara una cita textual con el texto normativo aportado por el llamador (sin IA). El texto debe provenir de una versión PRIMARIA resuelta.',
  kind: 'READ',
  inputSchema: z.object({ citation: z.string().min(1).max(MAX_CARACTERES_CITA * 2), text: z.string().max(200_000).nullable() }).strict(),
  outputSchema: salidaConProcedencia({
    estado: z.enum(['verificada', 'no_encontrada', 'cita_demasiado_larga', 'texto_distinto']),
    normalizacion: z.string(),
    max_caracteres: z.number().optional(),
    pasaje_cercano: z.string().nullable().optional(),
    similitud: z.number().optional(),
    palabras_faltantes: z.array(z.string()).optional(),
  }),
  scopes: [SCOPE_LEGAL_READ],
  timeoutMs: 2_000,
  rateLimit: LIMITE_LECTURA,
  handler: async (input: { citation: string; text: string | null }, { ctx }) => ({
    ...verificarCita(input.citation, input.text),
    provenance: { source: `lib/mcp/verificar-cita (${NORMALIZACION_CITA})`, tier: 'DERIVED' as const, retrievedAt: new Date(ctx.now()).toISOString() },
  }),
};

const busqueda = (name: string, description: string) =>
  stub({ name, description, inputSchema: z.object({ query: texto, country: pais, limit: z.number().int().min(1).max(20).default(5) }).strict(), outputSchema: salidaConProcedencia({ results: hallazgos }) });

export const CATALOGO: readonly ToolDefinition[] = Object.freeze([
  busqueda('search_law', 'Busca en el corpus legal por texto.'),
  resolveArticle,
  stub({ name: 'get_law_version', description: 'Versión vigente de un artículo en una fecha.', inputSchema: z.object({ instrumentId: texto, article: texto, asOf: fecha, country: pais }).strict(), outputSchema: salidaConProcedencia({ versionId: z.string(), validFrom: z.string(), validTo: z.string().nullable(), text: z.string(), state: z.enum(['TRUE', 'TRUE_PRESUNTA', 'FALSE', 'UNKNOWN']) }) }),
  busqueda('search_reforms', 'Reformas y derogaciones que afectan a un instrumento.'),
  busqueda('search_gaceta', 'Busca publicaciones del Diario Oficial La Gaceta.'),
  busqueda('search_jurisprudence', 'Busca jurisprudencia oficial pública.'),
  stub({ name: 'get_case', description: 'Obtiene una sentencia pública por identificador.', inputSchema: z.object({ caseId: texto, country: pais }).strict(), outputSchema: salidaConProcedencia({ court: z.string(), chamber: z.string().nullable(), date: z.string(), summary: z.string(), url: z.string() }) }),
  validateCitation,
  stub({ name: 'build_timeline', description: 'Línea de tiempo de versiones de un instrumento.', inputSchema: z.object({ instrumentId: texto, country: pais }).strict(), outputSchema: salidaConProcedencia({ events: z.array(z.object({ date: z.string(), kind: z.string(), reference: z.string() }).strict()) }) }),
  stub({ name: 'compare_versions', description: 'Compara dos versiones de un artículo.', inputSchema: z.object({ instrumentId: texto, article: texto, fromDate: fecha, toDate: fecha }).strict(), outputSchema: salidaConProcedencia({ changed: z.boolean(), diff: z.string() }) }),
  busqueda('search_treaties', 'Busca tratados internacionales ratificados.'),
  busqueda('search_regulations', 'Busca reglamentos y normas de instituciones reguladoras.'),
  stub({ name: 'legal_skill', description: 'Describe una Legal Skill por identificador.', inputSchema: z.object({ skillId: z.string().regex(/^[A-Z]{2}(\.[A-Z_]+)+$/) }).strict(), outputSchema: salidaConProcedencia({ skillId: z.string(), version: z.string(), status: z.string() }) }),
  stub({ name: 'legal_definition', description: 'Definición legal con su fuente normativa.', inputSchema: z.object({ term: texto, country: pais }).strict(), outputSchema: salidaConProcedencia({ term: z.string(), definition: z.string(), citations: z.array(z.string()) }) }),
  stub({
    name: 'draft_from_evidence',
    description: 'Borrador a partir de evidencia validada. No es asesoría jurídica.',
    scopes: [SCOPE_LEGAL_READ, SCOPE_DRAFT],
    timeoutMs: 30_000,
    rateLimit: { max: 10, windowMs: 60_000 },
    inputSchema: z.object({ instruction: texto, evidenceIds: z.array(z.string()).min(1).max(50) }).strict(),
    outputSchema: salidaConProcedencia({ draft: z.string(), disclaimer: z.literal('draft, not legal advice'), citedEvidenceIds: z.array(z.string()) }),
  }),
]);

export const NOMBRES_CATALOGO = CATALOGO.map((t) => t.name);

/** Registra el catálogo completo en un bus. */
export function registrarCatalogo(bus: { register(def: ToolDefinition): void }): void {
  for (const t of CATALOGO) bus.register(t);
}
