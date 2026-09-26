/**
 * lib/observability/langfuse.ts
 *
 * Observabilidad opcional del pipeline de IA de Maya Lex vía Langfuse.
 *
 * FAIL-OPEN por diseño, sin excepción: Langfuse caído, sin credenciales,
 * timeout, o cualquier error de esta capa NUNCA debe afectar la respuesta
 * jurídica de /api/chat. Cada función pública de este archivo atrapa sus
 * propios errores y nunca lanza -- mismo contrato que logConsulta() en
 * lib/analytics/logger.ts (fire-and-forget, se entrega a `after()`).
 *
 * Activación fail-closed en configuración (mismo criterio que lib/flags.ts):
 * requiere LANGFUSE_ENABLED=true Y las 3 credenciales presentes. Si falta
 * cualquiera de las 4, la observabilidad queda desactivada por completo --
 * nunca a medias, nunca con una credencial vacía enviada al SDK.
 *
 * PRIVACIDAD P0 (obligatorio, no relajable sin política explícita aprobada):
 * esta capa NUNCA envía a Langfuse el texto de la pregunta del usuario, el
 * contenido de fragmentos RAG recuperados, ni la respuesta del modelo.
 * Solo METADATA operativa: conteos, booleanos, IDs, tiempos, nombres de
 * modelo/proveedor. El identificador de usuario es el mismo hash
 * unidireccional que ya usa el logger de analítica (hashUsuario) -- nunca
 * el correo ni el identificador crudo. No hay función en este archivo que
 * acepte contenido de documento, prompt o respuesta como parámetro -- si en
 * el futuro se decide enviar contenido (con política de privacidad
 * explícita aprobada), debe pasar por una función de sanitización central
 * nueva, no agregarse ad-hoc a `metadata`.
 */
import { Langfuse } from 'langfuse';

const REQUEST_TIMEOUT_MS = 4000;

let _client: Langfuse | null | undefined; // undefined = aún no evaluado

/**
 * true solo si LANGFUSE_ENABLED='true' Y las 3 credenciales están presentes.
 * Fail-closed: cualquier variable faltante desactiva la observabilidad por
 * completo, nunca parcialmente.
 */
export function isLangfuseConfigured(): boolean {
  return (
    process.env.LANGFUSE_ENABLED === 'true' &&
    Boolean(process.env.LANGFUSE_PUBLIC_KEY?.trim()) &&
    Boolean(process.env.LANGFUSE_SECRET_KEY?.trim()) &&
    Boolean(process.env.LANGFUSE_BASE_URL?.trim())
  );
}

function getClient(): Langfuse | null {
  if (_client !== undefined) return _client;

  if (!isLangfuseConfigured()) {
    _client = null;
    return null;
  }

  try {
    _client = new Langfuse({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY!.trim(),
      secretKey: process.env.LANGFUSE_SECRET_KEY!.trim(),
      baseUrl: process.env.LANGFUSE_BASE_URL!.trim(),
      requestTimeout: REQUEST_TIMEOUT_MS,
      environment: process.env.APP_ENVIRONMENT ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
      release: process.env.APP_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'unknown',
    });
  } catch (err) {
    console.warn(
      '[Langfuse] Error al inicializar el cliente -- observabilidad desactivada:',
      err instanceof Error ? err.message : String(err),
    );
    _client = null;
  }
  return _client;
}

/**
 * Únicamente para tests/diagnóstico: reporta si las credenciales están
 * PRESENTES o AUSENTES, nunca sus valores. Ver Fase J del directive --
 * "PRESENT / MISSING", nunca imprimir la clave real.
 */
export function reportarEstadoCredenciales(): Record<'LANGFUSE_PUBLIC_KEY' | 'LANGFUSE_SECRET_KEY' | 'LANGFUSE_BASE_URL', 'PRESENT' | 'MISSING'> {
  const estado = (v: string | undefined) => (v && v.trim() ? 'PRESENT' : 'MISSING') as 'PRESENT' | 'MISSING';
  return {
    LANGFUSE_PUBLIC_KEY: estado(process.env.LANGFUSE_PUBLIC_KEY),
    LANGFUSE_SECRET_KEY: estado(process.env.LANGFUSE_SECRET_KEY),
    LANGFUSE_BASE_URL: estado(process.env.LANGFUSE_BASE_URL),
  };
}

/**
 * Datos de una consulta ya completada, listos para trazar. Deliberadamente
 * SIN campos de contenido (pregunta, fragmentos, respuesta) -- ver nota de
 * privacidad arriba. `userHash` debe venir ya hasheado por el caller
 * (hashUsuario de lib/analytics/logger.ts), nunca el identificador crudo.
 */
export interface DatosTrazaConsulta {
  consultaId: string;
  userHash: string;
  mode: string;
  tier: string;
  provider: string;
  model: string;
  ruta: string;
  retrievalStrategy: string;
  retrievedDocumentCount: number;
  citationCount: number;
  rerankUsed: boolean;
  webSearchRequested: boolean;
  webSearchResultsUsed: boolean;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  classificationLatencyMs?: number;
  retrievalLatencyMs?: number;
  success: boolean;
  errorType?: string;
}

/**
 * Construye el trace `mayalex.query` con sus spans hijos y lo envía a
 * Langfuse. NUNCA lanza -- cualquier fallo se registra con console.warn y se
 * ignora. Diseñada para invocarse vía `after()` (Next.js), igual que
 * logConsulta(), para no bloquear ni retrasar la respuesta en streaming.
 *
 * Spans creados SOLO si existe la operación real correspondiente en
 * app/api/chat/route.ts (no se inventan pasos): query.classification,
 * rag.retrieve, legal.web_search (solo si se solicitó), llm.generation,
 * citation.validation, response.finalize. Los sub-pasos internos de RAG
 * (exact_match / semantic_search / rerank) no son observables sin instrumentar
 * lib/rag/search.ts directamente -- decisión deliberada de no tocar ese
 * archivo en esta implementación mínima; `rerank_used` y `retrieval_strategy`
 * quedan como metadata del span rag.retrieve en su lugar.
 */
export function registrarTrazaConsulta(data: DatosTrazaConsulta): Promise<void> {
  const client = getClient();
  if (!client) return Promise.resolve();

  return (async () => {
    try {
      const trace = client.trace({
        id: data.consultaId,
        name: 'mayalex.query',
        userId: data.userHash,
        tags: [data.mode, data.tier, data.provider],
        metadata: {
          mode: data.mode,
          subscription_tier: data.tier,
          success: data.success,
        },
      });

      if (data.classificationLatencyMs !== undefined) {
        trace.span({
          name: 'query.classification',
          metadata: { ruta: data.ruta },
          endTime: new Date(),
        }).end();
      }

      trace.span({
        name: 'rag.retrieve',
        metadata: {
          retrieval_strategy: data.retrievalStrategy,
          retrieved_document_count: data.retrievedDocumentCount,
          rerank_used: data.rerankUsed,
        },
      }).end();

      if (data.webSearchRequested) {
        trace.span({
          name: 'legal.web_search',
          metadata: { results_used: data.webSearchResultsUsed },
        }).end();
      }

      trace.generation({
        name: 'llm.generation',
        model: data.model,
        metadata: { provider: data.provider },
        usage: {
          input: data.inputTokens,
          output: data.outputTokens,
          unit: 'TOKENS',
        },
      }).end();

      trace.span({
        name: 'citation.validation',
        metadata: { citation_count: data.citationCount },
      }).end();

      trace.span({
        name: 'response.finalize',
        metadata: {
          success: data.success,
          error_type: data.errorType ?? null,
          latency_ms: data.latencyMs,
        },
      }).end();

      await client.flushAsync();
    } catch (err) {
      console.warn(
        '[Langfuse] Fallo al registrar traza (no afecta la respuesta de /api/chat):',
        err instanceof Error ? err.message : String(err),
      );
    }
  })();
}
