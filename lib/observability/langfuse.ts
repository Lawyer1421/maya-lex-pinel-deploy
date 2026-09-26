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

/** Ventana real [inicio,fin] en epoch-ms de una operación ya ocurrida -- nunca un instante fabricado post-hoc. */
export interface VentanaTiempo {
  inicio: number;
  fin: number;
}

/**
 * Datos de una consulta ya completada, listos para trazar. Deliberadamente
 * SIN campos de contenido (pregunta, fragmentos, respuesta) -- ver nota de
 * privacidad arriba. `userHash` debe venir ya hasheado por el caller
 * (hashUsuario de lib/analytics/logger.ts), nunca el identificador crudo.
 *
 * Corrección P1 (auditoría independiente, 2026-09-26, revisión 1/2): las
 * ventanas de tiempo son epoch-ms REALES capturados en los puntos exactos de
 * app/api/chat/route.ts donde cada operación ocurre -- no se reconstruyen ni
 * se cierran retroactivamente aquí. `requestStartAt`/`finalizeAt` anclan el
 * trace raíz a la duración real de principio a fin de la request.
 *
 * Corrección P1 (revisión 2/2, mismo día): RAG y búsqueda web corren en
 * paralelo dentro de un único `Promise.all` (route.ts) -- antes ambos spans
 * compartían la ventana del bloque combinado, haciendo pasar el wall-clock
 * conjunto por la duración individual de cada uno. Ahora `ragWindow` y
 * `webSearchWindow` son ventanas INDEPENDIENTES medidas dentro de cada
 * promesa (nunca se volvieron secuenciales), y `retrievalParallelWindow`
 * representa el wall-clock real de esperar a ambas -- se reporta solo como
 * metadata del trace raíz (`retrieval_parallel_latency_ms`), nunca como la
 * duración de un span individual.
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
  /** epoch-ms real del inicio de la request (mismo valor que `inicioMs` en route.ts). */
  requestStartAt: number;
  /** epoch-ms real de finalización (éxito o error) -- ancla el fin del trace raíz. */
  finalizeAt: number;
  /** undefined cuando el router no corrió (ruta='D' sin usarRouter) -- nunca se inventa una ventana. */
  classificationWindow?: VentanaTiempo;
  /** Wall-clock del bloque Promise.all([ragPromise, webPromise]) completo -- SOLO metadata del trace, nunca span individual. */
  retrievalParallelWindow: VentanaTiempo;
  /** undefined cuando RAG no ejecutó realmente (ruta='D', sin router, o sin colección) -- nunca se inventa una ventana. */
  ragWindow?: VentanaTiempo;
  /** undefined cuando webSearch=false -- nunca se inventa una ventana. */
  webSearchWindow?: VentanaTiempo;
  citationValidationWindow: VentanaTiempo;
  /** undefined cuando el LLM nunca se invocó (aclaración/abstención) -- nunca se inventa una ventana. */
  llmGenerationWindow?: VentanaTiempo;
  success: boolean;
  errorType?: string;
}

function duracionMs(v: VentanaTiempo): number {
  return v.fin - v.inicio;
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
 *
 * TIMING REAL (corrección P1, 2026-09-26): `startTime`/`endTime` de cada
 * span/generation se fijan en la CREACIÓN a partir de las ventanas reales
 * recibidas -- verificado contra los tipos de langfuse@3.39.2
 * (CreateSpanBody/CreateGenerationBody heredan startTime/endTime de
 * OptionalObservationBody, y FixTypes los expone como `Date`, no string).
 * Ya no se usa `.end()` para cerrar de forma instantánea/retroactiva -- las
 * duraciones visibles en Langfuse ahora corresponden a la duración real de
 * cada operación. Además, cada span lleva su `_latency_ms` explícito en
 * metadata como redundancia inequívoca, legible aunque no se use la UI.
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
        // TraceBody usa `timestamp` (un punto), no startTime/endTime como
        // span/generation -- verificado contra el schema real del SDK.
        timestamp: new Date(data.requestStartAt),
        tags: [data.mode, data.tier, data.provider],
        metadata: {
          mode: data.mode,
          subscription_tier: data.tier,
          success: data.success,
          total_latency_ms: data.finalizeAt - data.requestStartAt,
          // Wall-clock del bloque Promise.all([ragPromise, webPromise])
          // completo -- SOLO informativo a nivel trace. Nunca representa la
          // duración individual de rag.retrieve ni de legal.web_search, que
          // tienen sus propias ventanas medidas por separado más abajo.
          retrieval_parallel_latency_ms: duracionMs(data.retrievalParallelWindow),
        },
      });

      if (data.classificationWindow) {
        trace.span({
          name: 'query.classification',
          startTime: new Date(data.classificationWindow.inicio),
          endTime: new Date(data.classificationWindow.fin),
          metadata: {
            ruta: data.ruta,
            classification_latency_ms: duracionMs(data.classificationWindow),
          },
        });
      }

      // rag.retrieve: ventana PROPIA de la ejecución real de RAG (medida
      // dentro de ragPromise, route.ts) -- independiente de legal.web_search
      // aunque ambas corran en el mismo Promise.all. undefined cuando RAG no
      // ejecutó (ruta='D', sin router, o sin colección para la ruta) -- no
      // se crea el span ni se inventa una ventana cero.
      if (data.ragWindow) {
        trace.span({
          name: 'rag.retrieve',
          startTime: new Date(data.ragWindow.inicio),
          endTime: new Date(data.ragWindow.fin),
          metadata: {
            retrieval_strategy: data.retrievalStrategy,
            retrieved_document_count: data.retrievedDocumentCount,
            rerank_used: data.rerankUsed,
            rag_latency_ms: duracionMs(data.ragWindow),
          },
        });
      }

      // legal.web_search: ventana PROPIA de la llamada a Tavily (medida
      // dentro de webPromise, route.ts) -- independiente de rag.retrieve.
      // Solo existe si webSearch=true Y la promesa llegó a ejecutar la
      // llamada real (ventana siempre presente en ese caso, ver route.ts).
      if (data.webSearchRequested && data.webSearchWindow) {
        trace.span({
          name: 'legal.web_search',
          startTime: new Date(data.webSearchWindow.inicio),
          endTime: new Date(data.webSearchWindow.fin),
          metadata: {
            results_used: data.webSearchResultsUsed,
            web_search_latency_ms: duracionMs(data.webSearchWindow),
          },
        });
      }

      if (data.llmGenerationWindow) {
        trace.generation({
          name: 'llm.generation',
          model: data.model,
          startTime: new Date(data.llmGenerationWindow.inicio),
          endTime: new Date(data.llmGenerationWindow.fin),
          metadata: {
            provider: data.provider,
            llm_generation_latency_ms: duracionMs(data.llmGenerationWindow),
          },
          usage: {
            input: data.inputTokens,
            output: data.outputTokens,
            unit: 'TOKENS',
          },
        });
      }

      trace.span({
        name: 'citation.validation',
        startTime: new Date(data.citationValidationWindow.inicio),
        endTime: new Date(data.citationValidationWindow.fin),
        metadata: {
          citation_count: data.citationCount,
          citation_latency_ms: duracionMs(data.citationValidationWindow),
        },
      });

      // response.finalize es un punto real, no un intervalo con duración
      // propia (enqueue del evento SSE 'done'/'error' es prácticamente
      // instantáneo) -- start=end=finalizeAt es una representación honesta
      // de un instante, no una duración fabricada.
      trace.span({
        name: 'response.finalize',
        startTime: new Date(data.finalizeAt),
        endTime: new Date(data.finalizeAt),
        metadata: {
          success: data.success,
          error_type: data.errorType ?? null,
          total_latency_ms: data.finalizeAt - data.requestStartAt,
        },
      });

      await client.flushAsync();
    } catch (err) {
      console.warn(
        '[Langfuse] Fallo al registrar traza (no afecta la respuesta de /api/chat):',
        err instanceof Error ? err.message : String(err),
      );
    }
  })();
}
