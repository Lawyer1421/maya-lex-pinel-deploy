/**
 * POST /api/chat
 * MAYA PENAL / MAYA LEX IA — Streaming Chat
 *
 * Proveedores soportados (LLM_PROVIDER en .env.local):
 *   'anthropic'  → Claude API (default, producción actual)
 *   'openrouter' → OpenRouter multimodel (experimental-openrouter)
 *
 * Enrutador inteligente RAG (solo modos de análisis):
 *   RUTA_A → solo colección procedimental  (plazos, recursos procesales)
 *   RUTA_B → solo colección normativa      (texto de artículos)
 *   RUTA_C → ambas colecciones             (análisis jurídico completo)
 *   RUTA_D → sin RAG                       (consulta ambigua → aclaración inmediata)
 *
 * Modos MAYA LEX:   'sala_ia' | 'analisis' | 'documento'
 * Modos MAYA PENAL: 'sala_penal' | 'analisis_penal' | 'escritos_penales'
 *
 * SSE events:
 *   data: { type: 'text',     text: string }
 *   data: { type: 'thinking', thinking: true }      ← solo Anthropic Claude
 *   data: { type: 'done',     usage, remaining, tier, model?, ruta? }
 *   data: { type: 'error',    message: string }
 *
 * Seguridad (OWASP RAG):
 *   - Contexto RAG inyectado como DATO, nunca como instrucción ejecutable.
 *   - System prompt maestro siempre precede y enmarca el contexto recuperado.
 *   - ANTI-CONTAMINACIÓN: materia 02_CIVIL y 01_PENAL nunca se mezclan.
 */

import { NextRequest, NextResponse, after } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  reserveRateLimit,
  releaseRateLimit,
  RateLimitStoreError,
  esFalloProveedorQueDevuelveCuota,
  esFalloOpenRouterQueDevuelveCuota,
  getVerifiedEmail,
  getUserIdentifier,
  buildUserIdentifierFromEmail,
  FREE_DAILY_LIMIT_CODE,
} from '@/lib/rate-limit';
import { isFlagEnabledForUser } from '@/lib/flags';
import {
  CLAUDE_CONFIG,
  CLAUDE_CONFIG_PENAL,
  ChatMode,
  ChatModePenal,
  construirSystemConCache,
  textoDeSystem,
} from '@/lib/system-prompt';
import {
  ALLOWLIST_MODELOS,
  resolverConfigModo,
  resolverModeloCliente,
  thinkingParaModelo,
  type ModoChat,
} from '@/lib/model-config';
import { recortarHistorialDesdeEnv } from '@/lib/chat-history';
import { type FragmentoRAG, type RetrievalOutcome } from '@/lib/rag/search';
import { recuperarEvidenciaCorpus, decidirAbstencion } from '@/lib/legal-retrieval/retrieval-session';
// Fase 1C: Cita/construirCitas se movieron a lib/legal-retrieval/evidence-engine.ts
// (extracción 1:1, sin cambio de comportamiento). Re-exportados más abajo
// para que los consumidores actuales (tests que importan desde
// '@/app/api/chat/route') no requieran ningún cambio de import.
import { construirCitas, type Cita } from '@/lib/legal-retrieval/evidence-engine';
import { despacharShadow } from '@/lib/ai-gateway/shadow/dispatcher';
import { motorLuna } from '@/lib/luna/engine';
import { despacharLegalOsShadow } from '@/lib/legal-os/shadow';
// Fase 1D — MAYALEX_RETRIEVAL_RUNTIME_CONTRACT.md: mensajes distintos para
// CONFIGURATION_ERROR/RETRIEVAL_ERROR (nunca "no existe la ley" cuando en
// realidad el propio sistema no pudo consultarla) y el builder para el
// estado NOT_REQUIRED en las rutas donde el router nunca invoca buscarRAG.
import {
  buildRetrievalOutcome,
  MENSAJE_RETRIEVAL_ERROR,
} from '@/lib/legal-retrieval/retrieval-outcome';
// Fase 1E.2 — Preview/canary, detrás de flag_official_source_fallback (OFF
// por default): wiring de OFFICIAL_FALLBACK_REQUIRED al Official Source
// Router (CEDIJ, solo legislación). Ver
// lib/legal-retrieval/official-sources/fallback-orchestrator.ts para toda la
// lógica de decisión -- route.ts solo la invoca e interpreta el resultado.
import {
  attemptOfficialFallback,
  construirMensajeFallbackOficial,
} from '@/lib/legal-retrieval/official-sources/fallback-orchestrator';
import { clasificarConsulta, MENSAJE_ACLARACION } from '@/lib/router/clasificar_consulta';
import { seleccionarModeloOpenRouter } from '@/config/openrouter_config';
import { streamOpenRouter, type OpenRouterMessage } from '@/lib/openrouter/client';
import {
  buscarWeb,
  formatearContextoWeb,
  AVISO_BUSQUEDA_FALLIDA,
} from '@/lib/websearch/tavily';
import { logConsulta, hashUsuario } from '@/lib/analytics/logger';
import { buscarPlantilla, formatearContextoPlantilla } from '@/lib/self-learning/buscar-plantilla';
import { clasificarFuenteExterna } from '@/lib/legal-retrieval/clo-guards';

// ── Cliente Anthropic — lazy init ──────────────────────────────────────────

let _anthropic: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return _anthropic;
}

// Proveedor LLM activo (controlado por LLM_PROVIDER en .env.local / Vercel)
const PROVEEDOR_LLM = (process.env.LLM_PROVIDER ?? 'anthropic') as 'anthropic' | 'openrouter';

// ── Tipos ──────────────────────────────────────────────────────────────────

type AnyMode = ChatMode | ChatModePenal;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  mode?: AnyMode;
  webSearch?: boolean;
  modelOverride?: string | null;
}

// Modelos permitidos como override (lista blanca — previene inyección)
const VALID_MODEL_OVERRIDES = ALLOWLIST_MODELOS;

const VALID_MODES: AnyMode[] = [
  'sala_ia', 'analisis', 'documento',
  'sala_penal', 'analisis_penal', 'escritos_penales',
];

function getConfig(mode: AnyMode) {
  const resuelto = resolverConfigModo(mode as ModoChat);
  if (mode in CLAUDE_CONFIG_PENAL) {
    return { ...CLAUDE_CONFIG_PENAL[mode as ChatModePenal], ...resuelto };
  }
  return { ...CLAUDE_CONFIG[mode as ChatMode], ...resuelto };
}

function esModoPenal(mode: AnyMode): boolean {
  return mode in CLAUDE_CONFIG_PENAL;
}

/**
 * Extrae la consulta limpia del usuario para usarla como query de búsqueda web.
 * Si el mensaje incluye adjuntos (formato buildApiContent de ChatInterface),
 * toma solo el texto tras el marcador "**Consulta del usuario:**".
 * Trunca a 350 chars para no saturar la API de búsqueda.
 */
function extraerQueryParaBusqueda(contenido: string | unknown): string {
  const texto = typeof contenido === 'string' ? contenido : '';
  const MARCADOR = '**Consulta del usuario:**\n';
  const idx = texto.indexOf(MARCADOR);
  const query = idx >= 0 ? texto.slice(idx + MARCADOR.length) : texto;
  return query.trim().slice(0, 350);
}

// ── Colecciones ChromaDB por RUTA y materia ────────────────────────────────
// ANTI-CONTAMINACIÓN: la materia penal se aísla con el filtro de metadato
// materia='01_PENAL' dentro de mayalex_normativos (la colección cpp_honduras
// nunca fue poblada — auditoría QA 2026-07-08). Los 3,358 chunks penales
// viven en mayalex_normativos etiquetados con materia: 01_PENAL.

const COLECCIONES_CIVIL: Record<string, string | null> = {
  A: 'mayalex_procedimental',  // plazos, recursos procesales civiles
  B: 'mayalex_normativos',     // artículos CPC / Código Civil
  C: 'mayalex_normativos',     // principal (+ segunda pasada con procedimental)
  D: null,
};

const COLECCIONES_PENAL: Record<string, string | null> = {
  A: 'mayalex_normativos',     // procedimiento penal (filtro materia=01_PENAL)
  B: 'mayalex_normativos',     // artículos CPP / CP  (filtro materia=01_PENAL)
  C: 'mayalex_normativos',     // combinado penal     (filtro materia=01_PENAL)
  D: null,
};

// Filtro de metadato que garantiza el aislamiento penal dentro de la colección
const MATERIA_PENAL = '01_PENAL';

// Modos de análisis que activan el router RAG
const MODOS_CON_ROUTER: AnyMode[] = [
  'analisis', 'analisis_penal', 'escritos_penales', 'documento',
];

// ── Citas estructuradas para trazabilidad en UI (P0-4) ──────────────────────
// Movido a lib/legal-retrieval/evidence-engine.ts (Fase 1C, extracción 1:1,
// sin cambio de comportamiento -- ver MAYALEX_RETRIEVAL_V3_ARCHITECTURE.md).
// Re-exportado (import arriba) para que los consumidores actuales (tests que
// importan `construirCitas`/`Cita` desde '@/app/api/chat/route') no
// requieran ningún cambio de import.
export { construirCitas, type Cita };

// ── Encoder SSE ────────────────────────────────────────────────────────────

const encoder = new TextEncoder();
function sseEvent(data: object): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

// ── Handler principal ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Parsear body
  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body inválido' }, { status: 400 });
  }

  const { messages: messagesRaw, mode = 'analisis', webSearch = false, modelOverride } = body;

  if (!messagesRaw || !Array.isArray(messagesRaw) || messagesRaw.length === 0) {
    return NextResponse.json(
      { error: 'messages es requerido y debe ser un array no vacío' },
      { status: 400 }
    );
  }
  const messages = recortarHistorialDesdeEnv(messagesRaw);

  if (!VALID_MODES.includes(mode)) {
    return NextResponse.json(
      { error: `mode debe ser uno de: ${VALID_MODES.join(', ')}` },
      { status: 400 }
    );
  }

  if (PROVEEDOR_LLM === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      console.error('[Maya Lex] ANTHROPIC_API_KEY no encontrada en process.env');
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY no configurada en el servidor' },
        { status: 500 }
      );
    }
  }

  // 2. Cuota — reserva atómica ANTES de RAG y Anthropic.
  // Se devuelve solo ante 5xx/timeout del proveedor, aclaración o abstención.
  const verifiedEmail = await getVerifiedEmail(req);
  const userIdentifier = verifiedEmail
    ? buildUserIdentifierFromEmail(verifiedEmail)
    : getUserIdentifier(req);
  let rateLimitResult;
  try {
    rateLimitResult = await reserveRateLimit(userIdentifier);
  } catch (err) {
    if (err instanceof RateLimitStoreError) {
      return NextResponse.json(
        { error: 'Servicio de cuota no disponible', code: 'RATE_LIMIT_UNAVAILABLE' },
        { status: 503 },
      );
    }
    throw err;
  }

  if (!rateLimitResult.allowed) {
    const esFree = rateLimitResult.tier === 'free';
    return NextResponse.json(
      esFree
        ? {
            code: FREE_DAILY_LIMIT_CODE,
            resetAt: rateLimitResult.resetAt,
            plans: ['academico', 'premium'] as const,
            error: 'Límite diario alcanzado',
            message: 'Ya usaste tu consulta gratis de hoy.',
          }
        : {
            error: 'Límite diario alcanzado',
            message: 'Has alcanzado el límite diario.',
            resetAt: rateLimitResult.resetAt,
            upgradeUrl: '/pricing',
          },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetAt,
          'Retry-After': String(
            Math.ceil((new Date(rateLimitResult.resetAt).getTime() - Date.now()) / 1000)
          ),
        },
      }
    );
  }

  // 3. Configurar según modo
  const config    = getConfig(mode);
  const modeloEfectivo = resolverModeloCliente(
    mode as ModoChat,
    modelOverride && VALID_MODEL_OVERRIDES.has(modelOverride) ? modelOverride : null,
    rateLimitResult.tier,
  );
  const consultaId = crypto.randomUUID();
  const inicioMs   = Date.now();

  const claudeMessages: Anthropic.MessageParam[] = messages
    .filter((m) => m.content && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.trim() }));

  // 3b. Clasificar consulta con el enrutador inteligente
  const ultimaPregunta = claudeMessages
    .filter(m => m.role === 'user')
    .at(-1)?.content ?? '';

  const usarRouter = (
    MODOS_CON_ROUTER.includes(mode) &&
    typeof ultimaPregunta === 'string' &&
    ultimaPregunta.length > 10
  );

  const ruta = usarRouter
    ? clasificarConsulta(ultimaPregunta as string, mode)
    : 'D';

  // 3c. Recuperar contexto RAG (A/B/C/D) y búsqueda web (Tavily) EN PARALELO.
  // Antes eran dos awaits secuenciales (RAG completo, luego Tavily) que sumaban
  // su latencia total antes de emitir el primer token del streaming. Son
  // independientes entre sí — solo el ORDEN DE INYECCIÓN en el prompt importa
  // (RAG antes que web, jerarquía OWASP RAG), no el orden de ejecución.
  let dinamicoSystem = '';

  // Fase 1D: `outcome` es opcional y aditivo -- ningún consumidor existente
  // de RagOut se rompe por no leerlo.
  interface RagOut { texto: string; fragmentos: FragmentoRAG[]; outcome?: RetrievalOutcome }

  const ragPromise: Promise<RagOut> = (async () => {
    // Estos dos caminos son exactamente los casos "sala_ia"/"sala_penal" (no
    // están en MODOS_CON_ROUTER, así que usarRouter=false) y cualquier ruta
    // sin colección asignada -- ninguno de los dos invoca jamás a buscarRAG.
    // NOT_REQUIRED documenta explícitamente que la ausencia de evidencia AQUÍ
    // es una decisión de diseño, no una falla de retrieval (§11 de la
    // directiva de Fase 1D: no convertir el modo sala en un flujo RAG lento).
    if (!(ruta !== 'D' && usarRouter)) return { texto: '', fragmentos: [], outcome: buildRetrievalOutcome('NOT_REQUIRED') };
    const esPenal = esModoPenal(mode);
    const colecciones = esPenal ? COLECCIONES_PENAL : COLECCIONES_CIVIL;
    const coleccionPrincipal = colecciones[ruta];
    // Modo penal: filtrar por materia dentro de la colección compartida
    const materiaFiltro = esPenal ? MATERIA_PENAL : undefined;
    if (!coleccionPrincipal) return { texto: '', fragmentos: [], outcome: buildRetrievalOutcome('NOT_REQUIRED') };

    // Rerank Cohere detrás de `flag_rerank` (Decisión C). OFF por default →
    // corte por similitud pgvector. Se resuelve una vez por request y solo
    // cuando el RAG realmente corre (RUTA != D).
    const rerankHabilitado = await isFlagEnabledForUser('flag_rerank', verifiedEmail);
    // flag_corpus_p21 (CLO 28-oct-2026): gate del corpus P21. Fila ausente o error de lectura = apagado; con el flag apagado esas filas no se recuperan.
    const corpusP21Habilitado = await isFlagEnabledForUser('flag_corpus_p21', verifiedEmail);

    // Colección principal + pasada procedimental de RUTA_C civil (sólo añade
    // fragmentos elegibles y verificables; ver evidenciaProcedimentalPermitida).
    // El outcome devuelto es el de la colección principal: es el que determina
    // si el retrieval "funcionó" para el gate fail-closed más abajo.
    return recuperarEvidenciaCorpus({
      pregunta: ultimaPregunta as string,
      coleccionPrincipal,
      materiaFiltro,
      pasadaProcedimental: ruta === 'C' && !esPenal,
      rerank: rerankHabilitado,
      corpusP21: corpusP21Habilitado,
    });
  })();

  // Solo se ejecuta cuando webSearch === true; el resto del flujo permanece intacto.
  const webPromise: Promise<string> = (async () => {
    if (!webSearch) return '';
    const queryBusqueda = extraerQueryParaBusqueda(ultimaPregunta);
    try {
      const resultadosWeb = await buscarWeb(queryBusqueda, {
        maxResultados: 5,
        timeoutMs:     3500,
        umbralScore:   0.3,
      });

      if (resultadosWeb.length > 0) {
        console.log(
          `[WebSearch] Tavily OK | resultados=${resultadosWeb.length}` +
          ` | query="${queryBusqueda.slice(0, 55)}..."` +
          ` | mode=${mode} | ruta=${ruta}`
        );
        // Inyectado DESPUÉS del contexto RAG para mantener jerarquía (ver abajo)
        // CLO 28-oct-2026 (Anexo 2.6): el contexto web pasa por el clasificador y NUNCA es PRIMARY: no entra a las citas ni cuenta como evidencia.
        const claseWeb = clasificarFuenteExterna('WEB');
        console.info(`[RAG][CLO] externo=WEB rol=${claseWeb.rol} motivos=${claseWeb.bloqueos.join(',')}`);
        return '\n\n' + formatearContextoWeb(resultadosWeb);
      }
      // 0 resultados relevantes: flujo continúa con solo RAG (sin aviso al modelo)
      console.log(
        `[WebSearch] Tavily 0 resultados relevantes — RAG local` +
        ` | query="${queryBusqueda.slice(0, 55)}..."`
      );
      return '';
    } catch (err) {
      const msg       = err instanceof Error ? err.message : String(err);
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      const isNoKey   = msg.includes('TAVILY_API_KEY');

      console.warn(
        `[WebSearch] Fallback a RAG | motivo=${isTimeout ? 'TIMEOUT' : isNoKey ? 'SIN_APIKEY' : 'ERROR'}` +
        ` | ${isNoKey ? '' : msg.slice(0, 90)}`
      );

      // Notificar al modelo para que informe al usuario de forma discreta —
      // solo si había intención de búsqueda (la clave existe pero falló)
      return isNoKey ? '' : AVISO_BUSQUEDA_FALLIDA;
    }
  })();

  const [ragData, contextoWeb] = await Promise.all([ragPromise, webPromise]);
  const contextoRAG = ragData.texto;
  const citas = construirCitas(ragData.fragmentos);

  // 3d. FAIL-CLOSED (WAR ROOM FINAL): decisión determinista, ANTES de invocar
  // al LLM. Si la consulta exige evidencia verificable del corpus y la
  // recuperación (exacta o semántica, ya filtrada por contaminación/materia/
  // encabezado) no trajo ningún fragmento válido, no se llama al modelo —
  // se abstiene en código. No aplica a conversación general que no exige
  // fundamentación documental (modos "sala", o rutas sin router).
  //
  // MISSION M1 follow-up (2026-09-28) — PROCEDURAL_PASS_CAN_MASK_PRIMARY_
  // INSUFFICIENCY, probado: `ragData.fragmentos` es el array COMBINADO de la
  // colección principal + la segunda pasada procedimental de ruta C civil
  // (ver ragPromise arriba, "RUTA_C civil → segunda pasada con procedimental
  // para completar el análisis"). Esa segunda pasada es una colección
  // pequeña, complementaria, sin ningún chequeo de identidad ni garantía de
  // filtro de materia para consultas cuya materia no se puede detectar -- si
  // la colección PRINCIPAL correctamente resolvía OFFICIAL_FALLBACK_REQUIRED
  // (cero evidencia real) pero la procedimental aportaba aunque fuera un solo
  // fragmento irrelevante, el array combinado tenía longitud >=1 y todo el
  // bloque de abstención/fallback oficial de abajo se saltaba -- el LLM
  // respondía con ese fragmento marcado "[NORMA VIGENTE HONDURAS]" como si
  // fuera evidencia real (ver tests/evidence-gate-procedural-masking.test.ts,
  // caso dorado S. de R.L.). `ragResultado.outcome.evidenceCount` (ver
  // lib/rag/search.ts) siempre refleja SOLO la colección principal, nunca la
  // procedimental -- es la señal correcta para esta decisión. `fragmentos`
  // (combinado) se sigue usando sin cambio para el contexto/citas cuando la
  // colección principal SÍ tuvo éxito -- la procedimental sigue enriqueciendo
  // una respuesta ya bien fundamentada, solo deja de poder crear evidencia
  // por sí sola cuando la principal no encontró nada.
  //
  // Todo call site real de buscarRAG (lib/rag/search.ts) construye `outcome`
  // sin excepción -- pero se conserva `ragData.fragmentos.length === 0` como
  // fallback explícito para el caso (hoy solo posible en un mock de prueba
  // incompleto, nunca en código real) de que `outcome` esté ausente, en vez
  // de tratar esa ausencia como "cero evidencia" por defecto.
  const rutaCorpusObligatoria = ruta !== 'D' && usarRouter;
  const { evidenciaInsuficiente, mensajeAbstencion, codigoAbstencion } = decidirAbstencion(
    ultimaPregunta as string, rutaCorpusObligatoria, ragData,
  );

  // Fase 1D (MAYALEX_RETRIEVAL_RUNTIME_CONTRACT.md, invariante central:
  // NO_VERIFIED_EVIDENCE != RETRIEVAL_FAILED). CASE 2/3 (NO_VERIFIED_EVIDENCE
  // / OFFICIAL_FALLBACK_REQUIRED, sin instrumentar todavía ningún adapter
  // externo) conservan exactamente el mensaje/código de abstención actual:
  // el corpus funcionó, simplemente no encontró nada verificable. CASE 4/5
  // (CONFIGURATION_ERROR / RETRIEVAL_ERROR) usan un mensaje distinto y
  // explícito -- el propio sistema no pudo consultar las fuentes, eso NUNCA
  // debe presentarse como si el derecho no existiera (ver decidirAbstencion).
  const outcomeState = ragData.outcome?.state;

  // PR-G2 (AI Gateway, modo sombra): despacho fire-and-forget DESPUÉS del
  // Evidence Gate. No se espera, no recibe la respuesta ni la modifica; con el
  // kill switch apagado (default) no hace nada. Ver lib/ai-gateway/shadow.
  // G6-E: defensa en profundidad. `despacharShadow` ya se protege por dentro, pero ningún fallo del shadow puede llegar a producción.
  try {
    despacharShadow({
      queryId: consultaId,
      pregunta: ultimaPregunta as string,
      fragmentos: ragData.fragmentos,
      decision: evidenciaInsuficiente ? 'ABSTAIN' : 'ANSWER',
      retrievalState: outcomeState,
    });
  } catch {
    // El shadow es subordinado: se ignora cualquier error.
  }

  // Legal OS en SOMBRA (simulado: sin modelo, sin red, sin escrituras). Apagado salvo LEGAL_OS_SHADOW=1 (y nunca en producción sin
  // LEGAL_OS_SHADOW_ALLOW_PROD=1). Usa la evidencia que producción YA recuperó; no altera estado, cuerpo, gate ni abstención.
  try {
    despacharLegalOsShadow({
      queryId: consultaId,
      pregunta: ultimaPregunta as string,
      fragmentos: ragData.fragmentos,
      decisionProduccion: evidenciaInsuficiente ? 'ABSTAIN' : 'ANSWER',
      retrievalState: outcomeState,
    });
  } catch {
    // El shadow es subordinado: se ignora cualquier error.
  }

  if (contextoRAG) {
    // OWASP RAG: contexto como DATO, enmarcado explícitamente — DESPUÉS del caché
    dinamicoSystem = contextoRAG;
  }
  dinamicoSystem += contextoWeb;

  // ── Plantillas notariales del archivo profesional (solo modo 'documento') ──
  // Piloto validado 2026-07-15/16 — 12 poderes genéricos, sin PII.
  if (mode === 'documento') {
    try {
      const resultadosPlantilla = await buscarPlantilla(ultimaPregunta as string, { limite: 2 });
      const contextoPlantilla = formatearContextoPlantilla(resultadosPlantilla);
      if (contextoPlantilla) {
        // CLO 28-oct-2026 (Anexo 2.6): las plantillas notariales (modo documento) pasan por el clasificador y NUNCA son PRIMARY.
        const clasePlantilla = clasificarFuenteExterna('PLANTILLA_NOTARIAL');
        console.info(`[RAG][CLO] externo=PLANTILLA_NOTARIAL rol=${clasePlantilla.rol} motivos=${clasePlantilla.bloqueos.join(',')}`);
        dinamicoSystem += (dinamicoSystem ? '\n\n' : '') + contextoPlantilla;
        console.log(
          `[Plantillas] Inyectada(s) ${resultadosPlantilla.filter(r => r.similarity >= 0.75).length} plantilla(s)` +
          ` | mejor similitud=${resultadosPlantilla[0]?.similarity.toFixed(2) ?? 'n/a'}`
        );
      }
    } catch (err) {
      console.warn('[Plantillas] Error no crítico:', err instanceof Error ? err.message : String(err));
    }
  }

  const systemBlocks = construirSystemConCache(config.systemPrompt, dinamicoSystem);
  const systemConRAG = textoDeSystem(systemBlocks);

  if (process.env.DEBUG_CLAUDE === 'true') {
    console.log(`[Router] mode=${mode} ruta=${ruta} proveedor=${PROVEEDOR_LLM}`);
  }

  // 4. Streaming Response
  const stream = new ReadableStream({
    async start(controller) {
      let devolverReserva = false;
      try {
        // RUTA_D en modo de análisis → aclaración inmediata sin LLM ni RAG
        // Aplica cuando: (a) modo análisis + query ambigua [usarRouter=true, ruta=D]
        //                (b) modo análisis + query muy corta [usarRouter=false, ruta=D]
        // NO aplica a modos sala (sala_ia/sala_penal) que van directo al LLM.
        if (ruta === 'D' && MODOS_CON_ROUTER.includes(mode)) {
          controller.enqueue(sseEvent({ type: 'text', text: MENSAJE_ACLARACION }));
          controller.enqueue(sseEvent({
            type: 'done',
            consulta_id: consultaId,
            usage: { inputTokens: 0, outputTokens: 0 },
            remaining: rateLimitResult.remaining,
            tier: rateLimitResult.tier,
            citas: [],
          }));
          after(() => logConsulta({
            consulta_id: consultaId, pregunta: ultimaPregunta as string,
            modo: mode, ruta_rag: ruta, modelo: 'aclaracion', proveedor: 'sistema',
            tokens_input: 0, tokens_output: 0, tiempo_ms: Date.now() - inicioMs,
            web_search_usado: webSearch, usuario_hash: hashUsuario(userIdentifier),
            tier_usuario: rateLimitResult.tier, exito: true,
          }));
          devolverReserva = true;
          return;
        }

        // FAIL-CLOSED: evidencia de corpus exigida y no encontrada → abstención
        // determinista, sin invocar al LLM. No revela reglas internas, system
        // prompt ni configuración — solo el mensaje genérico y citas vacías.
        if (evidenciaInsuficiente) {
          // Fase 1E.2 (Preview/canary, detrás de flag_official_source_fallback,
          // OFF por default en Production y en Preview hasta que el fundador
          // siembre la fila -- ver lib/flags.ts): solo se intenta cuando el
          // estado es exactamente OFFICIAL_FALLBACK_REQUIRED (semántica
          // ejecutó bien, corpus interno insuficiente) -- NUNCA para
          // NO_VERIFIED_EVIDENCE (artículo exacto explícito inexistente o
          // ambiguo, ver shouldAttemptOfficialFallback), y como mucho UN
          // intento, con timeout ya existente del adapter (§11: riesgo de
          // latencia añadida de hasta ~16s en el peor caso -- dos peticiones
          // HTTP de 8s cada una -- solo en este camino de abstención, nunca
          // en el camino normal de respuesta).
          let mensajeFinal = mensajeAbstencion;
          let codigoFinal: string = codigoAbstencion;
          if (outcomeState === 'OFFICIAL_FALLBACK_REQUIRED') {
            const fallbackHabilitado = await isFlagEnabledForUser('flag_official_source_fallback', verifiedEmail);
            const fallback = await attemptOfficialFallback({
              retrievalState: outcomeState,
              ruta,
              flagEnabled: fallbackHabilitado,
              rawQuery: ultimaPregunta as string,
            });
            if (fallback.attempted) {
              if (fallback.status === 'SUCCESS' && fallback.evidenceCount > 0) {
                // §4/§6: metadata oficial encontrada, NUNCA se presenta como
                // texto de artículo ni como NORMA VIGENTE HONDURAS -- solo
                // proveniencia (título/fuente/URL).
                mensajeFinal = construirMensajeFallbackOficial(fallback.evidence);
                codigoFinal = 'OFFICIAL_SOURCE_FOUND_METADATA_ONLY';
              } else if (fallback.status === 'SOURCE_UNAVAILABLE' || fallback.status === 'INVALID_RESPONSE' || fallback.status === 'RATE_LIMITED') {
                // §12: nunca colapsa con "no hay evidencia" -- es un fallo de
                // infraestructura de la fuente externa, no una afirmación de
                // que la ley no existe.
                mensajeFinal = MENSAJE_RETRIEVAL_ERROR;
                codigoFinal = 'RETRIEVAL_ERROR';
              }
              // NO_RESULTS / UNSUPPORTED_QUERY -> se preserva la abstención
              // segura ya calculada (mensajeAbstencion/codigoAbstencion).
            }
          }

          controller.enqueue(sseEvent({ type: 'text', text: mensajeFinal }));
          controller.enqueue(sseEvent({
            type: 'done',
            consulta_id: consultaId,
            usage: { inputTokens: 0, outputTokens: 0 },
            remaining: rateLimitResult.remaining,
            tier: rateLimitResult.tier,
            citas: [],
            codigo: codigoFinal,
          }));
          after(() => logConsulta({
            consulta_id: consultaId, pregunta: ultimaPregunta as string,
            modo: mode, ruta_rag: ruta, modelo: 'abstencion_corpus', proveedor: 'sistema',
            tokens_input: 0, tokens_output: 0, tiempo_ms: Date.now() - inicioMs,
            web_search_usado: webSearch, usuario_hash: hashUsuario(userIdentifier),
            tier_usuario: rateLimitResult.tier, exito: true,
          }));
          devolverReserva = true;
          return;
        }

        // ── Luna (P26, Responses API de OpenAI) ───────────────────────────
        // Doble llave, APAGADA por defecto: LUNA_ENABLED=1 en el entorno Y flag_luna_responses para este usuario. Solo en
        // consultas que exigen corpus (router A/B/C) y que ya pasaron el Evidence Gate. Si Luna no responde (SKIPPED/ERROR:
        // sin credencial, modelo no disponible, presupuesto, privacidad, salida inválida) la consulta sigue por el proveedor
        // vigente sin cambio alguno. Luna nunca escribe en el corpus.
        if (rutaCorpusObligatoria && motorLuna().habilitada() && await isFlagEnabledForUser('flag_luna_responses', verifiedEmail)) {
          const luna = await motorLuna().responder({
            queryId: consultaId,
            pregunta: ultimaPregunta as string,
            fragmentos: ragData.fragmentos,
            tier: rateLimitResult.tier,
          });
          if (luna.estado === 'ANSWER' || luna.estado === 'ABSTAIN') {
            controller.enqueue(sseEvent({ type: 'text', text: luna.texto }));
            controller.enqueue(sseEvent({
              type: 'done',
              consulta_id: consultaId,
              usage: { inputTokens: luna.uso.inputTokens, outputTokens: luna.uso.outputTokens },
              remaining: rateLimitResult.remaining,
              tier: rateLimitResult.tier,
              model: luna.modelo,
              ruta,
              citas: luna.estado === 'ANSWER' ? citas : [],
              ...(luna.estado === 'ABSTAIN' ? { codigo: 'LUNA_ABSTENCION' } : {}),
            }));
            after(() => logConsulta({
              consulta_id: consultaId, pregunta: ultimaPregunta as string,
              modo: mode, ruta_rag: ruta, modelo: luna.modelo, proveedor: 'openai-luna',
              tokens_input: luna.uso.inputTokens, tokens_output: luna.uso.outputTokens,
              tiempo_ms: Date.now() - inicioMs,
              web_search_usado: webSearch, usuario_hash: hashUsuario(userIdentifier),
              tier_usuario: rateLimitResult.tier, exito: true,
            }));
            // Igual que la abstención determinista: una abstención no consume la cuota del usuario.
            if (luna.estado === 'ABSTAIN') devolverReserva = true;
            return;
          }
        }

        // ── OpenRouter path ──────────────────────────────────────────────
        if (PROVEEDOR_LLM === 'openrouter') {
          const modelOR = seleccionarModeloOpenRouter(ruta, mode);

          const messagesOR: OpenRouterMessage[] = [
            { role: 'system', content: systemConRAG },
            ...claudeMessages.map(m => ({
              role: m.role as 'user' | 'assistant',
              content: m.content as string,
            })),
          ];

          await streamOpenRouter(modelOR, messagesOR, {
            onToken: (token) => {
              controller.enqueue(sseEvent({ type: 'text', text: token }));
            },
            onDone: ({ inputTokens, outputTokens }) => {
              controller.enqueue(sseEvent({
                type: 'done',
                consulta_id: consultaId,
                usage: { inputTokens, outputTokens },
                remaining: rateLimitResult.remaining,
                tier: rateLimitResult.tier,
                model: modelOR,
                ruta,
                citas,
              }));
              after(() => logConsulta({
                consulta_id: consultaId, pregunta: ultimaPregunta as string,
                modo: mode, ruta_rag: ruta, modelo: modelOR, proveedor: 'openrouter',
                tokens_input: inputTokens, tokens_output: outputTokens,
                tiempo_ms: Date.now() - inicioMs,
                web_search_usado: webSearch, usuario_hash: hashUsuario(userIdentifier),
                tier_usuario: rateLimitResult.tier, exito: true,
              }));
            },
            onError: (message) => {
              if (esFalloOpenRouterQueDevuelveCuota(message)) {
                devolverReserva = true;
              }
              controller.enqueue(sseEvent({ type: 'error', message }));
            },
          });

        } else {
          // ── Anthropic Claude path (default) ─────────────────────────
          const params: Anthropic.MessageCreateParamsStreaming = {
            model: modeloEfectivo,
            max_tokens: config.max_tokens,
            system: systemBlocks,
            messages: claudeMessages,
            stream: true,
          };

          const thinkingEfectivo = thinkingParaModelo(modeloEfectivo);
          if (thinkingEfectivo) {
            // @ts-expect-error — thinking adaptive solo en claude-sonnet-4-6
            params.thinking = thinkingEfectivo;
          }

          if (process.env.DEBUG_CLAUDE === 'true') {
            console.log('[Maya Lex] Enviando a Claude:', {
              model: modeloEfectivo, mode, messages: claudeMessages.length, userIdentifier,
            });
          }

          const claudeStream = await getAnthropicClient().messages.create(params);
          let inputTokens  = 0;
          let outputTokens = 0;

          for await (const event of claudeStream) {
            switch (event.type) {
              case 'message_start':
                inputTokens = event.message.usage.input_tokens;
                break;

              case 'content_block_start':
                if ((event.content_block as { type: string }).type === 'thinking') {
                  controller.enqueue(sseEvent({ type: 'thinking', thinking: true }));
                }
                break;

              case 'content_block_delta':
                if (event.delta.type === 'text_delta') {
                  controller.enqueue(sseEvent({ type: 'text', text: event.delta.text }));
                }
                break;

              case 'content_block_stop':
                break;

              case 'message_delta':
                outputTokens = event.usage.output_tokens;
                break;

              case 'message_stop':
                controller.enqueue(sseEvent({
                  type: 'done',
                  consulta_id: consultaId,
                  usage: { inputTokens, outputTokens },
                  remaining: rateLimitResult.remaining,
                  tier: rateLimitResult.tier,
                  citas,
                }));
                after(() => logConsulta({
                  consulta_id: consultaId, pregunta: ultimaPregunta as string,
                  modo: mode, ruta_rag: ruta,
                  modelo: modeloEfectivo, proveedor: 'anthropic',
                  tokens_input: inputTokens, tokens_output: outputTokens,
                  tiempo_ms: Date.now() - inicioMs,
                  web_search_usado: webSearch, usuario_hash: hashUsuario(userIdentifier),
                  tier_usuario: rateLimitResult.tier, exito: true,
                }));
                break;
            }
          }
        }
      } catch (error) {
        console.error('[Maya Lex] Error streaming:', error);
        if (esFalloProveedorQueDevuelveCuota(error)) {
          devolverReserva = true;
        }

        let errorMessage = 'Error interno del servidor';
        if (error instanceof Anthropic.APIError) {
          if (error.status === 401)      errorMessage = 'API Key inválida. Contacta al administrador.';
          else if (error.status === 429) errorMessage = 'Servicio temporalmente saturado. Intenta en unos segundos.';
          else if (error.status === 529) errorMessage = 'Servicio de IA en mantenimiento. Intenta en unos minutos.';
          else                           errorMessage = `Error del servicio: ${error.message}`;
        }
        controller.enqueue(sseEvent({ type: 'error', message: errorMessage }));
      } finally {
        if (devolverReserva) {
          try {
            await releaseRateLimit(userIdentifier);
          } catch (releaseErr) {
            console.error('[RateLimit] no se pudo devolver la reserva', releaseErr);
          }
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':           'text/event-stream',
      'Cache-Control':          'no-cache, no-transform',
      'Connection':             'keep-alive',
      'X-Accel-Buffering':      'no',
      'X-RateLimit-Remaining':  String(rateLimitResult.remaining),
      'X-RateLimit-Tier':       rateLimitResult.tier,
    },
  });
}

// GET /api/chat — ping de estado
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'MAYA PENAL / MAYA LEX IA PINEL HN',
    version: '2.1.0',
    proveedor: PROVEEDOR_LLM,
    modos_maya_lex: {
      sala_ia:   CLAUDE_CONFIG.sala_ia.model,
      analisis:  CLAUDE_CONFIG.analisis.model,
      documento: CLAUDE_CONFIG.documento.model,
    },
    modos_maya_penal: {
      sala_penal:       CLAUDE_CONFIG_PENAL.sala_penal.model,
      analisis_penal:   CLAUDE_CONFIG_PENAL.analisis_penal.model,
      escritos_penales: CLAUDE_CONFIG_PENAL.escritos_penales.model,
    },
    rutas_rag: {
      A: 'procedimental (plazos, recursos)',
      B: 'normativo (artículos, decreto)',
      C: 'combinado (A + B)',
      D: 'sin_rag (sala / consulta ambigua)',
    },
  });
}
