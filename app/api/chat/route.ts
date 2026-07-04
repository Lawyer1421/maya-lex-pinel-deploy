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

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  checkAndIncrementRateLimit,
  getUserIdentifier,
} from '@/lib/rate-limit';
import {
  CLAUDE_CONFIG,
  CLAUDE_CONFIG_PENAL,
  ChatMode,
  ChatModePenal,
} from '@/lib/system-prompt';
import { buscarRAG, formatearContextoRAG } from '@/lib/rag/search';
import { clasificarConsulta, MENSAJE_ACLARACION } from '@/lib/router/clasificar_consulta';
import { seleccionarModeloOpenRouter } from '@/config/openrouter_config';
import { streamOpenRouter, type OpenRouterMessage } from '@/lib/openrouter/client';
import {
  buscarWeb,
  formatearContextoWeb,
  AVISO_BUSQUEDA_FALLIDA,
} from '@/lib/websearch/tavily';

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
const VALID_MODEL_OVERRIDES = new Set([
  'claude-opus-4-8',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
]);

const VALID_MODES: AnyMode[] = [
  'sala_ia', 'analisis', 'documento',
  'sala_penal', 'analisis_penal', 'escritos_penales',
];

function getConfig(mode: AnyMode) {
  if (mode in CLAUDE_CONFIG_PENAL) {
    return CLAUDE_CONFIG_PENAL[mode as ChatModePenal];
  }
  return CLAUDE_CONFIG[mode as ChatMode];
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
// ANTI-CONTAMINACIÓN: materia civil y penal NUNCA comparten colección.

const COLECCIONES_CIVIL: Record<string, string | null> = {
  A: 'mayalex_procedimental',  // plazos, recursos procesales civiles
  B: 'mayalex_normativos',     // artículos CPC / Código Civil
  C: 'mayalex_normativos',     // principal (+ segunda pasada con procedimental)
  D: null,
};

const COLECCIONES_PENAL: Record<string, string | null> = {
  A: 'cpp_honduras',           // procedimiento penal
  B: 'cpp_honduras',           // artículos CPP / CP
  C: 'cpp_honduras',           // combinado penal (una sola colección indexada)
  D: null,
};

// Modos de análisis que activan el router RAG
const MODOS_CON_ROUTER: AnyMode[] = [
  'analisis', 'analisis_penal', 'escritos_penales', 'documento',
];

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

  const { messages, mode = 'analisis', webSearch = false, modelOverride } = body;
  const safeModelOverride =
    modelOverride && VALID_MODEL_OVERRIDES.has(modelOverride) ? modelOverride : null;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: 'messages es requerido y debe ser un array no vacío' },
      { status: 400 }
    );
  }

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

  // 2. Rate Limiting
  const userIdentifier = getUserIdentifier(req);
  const rateLimitResult = await checkAndIncrementRateLimit(userIdentifier);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: 'Límite diario alcanzado',
        message: rateLimitResult.tier === 'free'
          ? `Has alcanzado el límite de ${3} consultas gratuitas por día. Actualiza al Plan Pro para consultas ilimitadas.`
          : 'Has alcanzado el límite diario.',
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
  const config = getConfig(mode);

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

  // 3c. Recuperar contexto RAG según RUTA (A=proc / B=norm / C=ambos / D=sin_rag)
  let systemConRAG = config.systemPrompt;

  if (ruta !== 'D' && usarRouter) {
    const colecciones = esModoPenal(mode) ? COLECCIONES_PENAL : COLECCIONES_CIVIL;
    const coleccionPrincipal = colecciones[ruta];

    if (coleccionPrincipal) {
      const ragResultado = await buscarRAG(ultimaPregunta as string, 5, coleccionPrincipal);
      let contextoRAG = formatearContextoRAG(ragResultado);

      // RUTA_C civil → segunda pasada con procedimental para completar el análisis
      if (ruta === 'C' && !esModoPenal(mode)) {
        const ragProc = await buscarRAG(ultimaPregunta as string, 3, 'mayalex_procedimental');
        const contextoProc = formatearContextoRAG(ragProc);
        if (contextoProc) {
          contextoRAG = contextoRAG
            ? `${contextoRAG}\n\n${contextoProc}`
            : contextoProc;
        }
      }

      if (contextoRAG) {
        // OWASP RAG: contexto como DATO, enmarcado explícitamente
        systemConRAG = `${config.systemPrompt}\n\n${contextoRAG}`;
      }
    }
  }

  // ── Búsqueda web real (Tavily) ────────────────────────────────────────────
  // Solo se ejecuta cuando webSearch === true; el resto del flujo permanece intacto.
  if (webSearch) {
    const queryBusqueda = extraerQueryParaBusqueda(ultimaPregunta);
    try {
      const resultadosWeb = await buscarWeb(queryBusqueda, {
        maxResultados: 5,
        timeoutMs:     3500,
        umbralScore:   0.3,
      });

      if (resultadosWeb.length > 0) {
        // Inyectar contexto web DESPUÉS del contexto RAG para mantener jerarquía
        systemConRAG += '\n\n' + formatearContextoWeb(resultadosWeb);
        console.log(
          `[WebSearch] Tavily OK | resultados=${resultadosWeb.length}` +
          ` | query="${queryBusqueda.slice(0, 55)}..."` +
          ` | mode=${mode} | ruta=${ruta}`
        );
      } else {
        // 0 resultados relevantes: flujo continúa con solo RAG (sin aviso al modelo)
        console.log(
          `[WebSearch] Tavily 0 resultados relevantes — RAG local` +
          ` | query="${queryBusqueda.slice(0, 55)}..."`
        );
      }
    } catch (err) {
      const msg       = err instanceof Error ? err.message : String(err);
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      const isNoKey   = msg.includes('TAVILY_API_KEY');

      console.warn(
        `[WebSearch] Fallback a RAG | motivo=${isTimeout ? 'TIMEOUT' : isNoKey ? 'SIN_APIKEY' : 'ERROR'}` +
        ` | ${isNoKey ? '' : msg.slice(0, 90)}`
      );

      // Notificar al modelo para que informe al usuario de forma discreta
      if (!isNoKey) {
        // Solo mostrar el aviso si había intención de búsqueda (la clave existe pero falló)
        systemConRAG += AVISO_BUSQUEDA_FALLIDA;
      }
    }
  }

  if (process.env.DEBUG_CLAUDE === 'true') {
    console.log(`[Router] mode=${mode} ruta=${ruta} proveedor=${PROVEEDOR_LLM}`);
  }

  // 4. Streaming Response
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // RUTA_D en modo de análisis → aclaración inmediata sin LLM ni RAG
        // Aplica cuando: (a) modo análisis + query ambigua [usarRouter=true, ruta=D]
        //                (b) modo análisis + query muy corta [usarRouter=false, ruta=D]
        // NO aplica a modos sala (sala_ia/sala_penal) que van directo al LLM.
        if (ruta === 'D' && MODOS_CON_ROUTER.includes(mode)) {
          controller.enqueue(sseEvent({ type: 'text', text: MENSAJE_ACLARACION }));
          controller.enqueue(sseEvent({
            type: 'done',
            usage: { inputTokens: 0, outputTokens: 0 },
            remaining: rateLimitResult.remaining,
            tier: rateLimitResult.tier,
          }));
          return;
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
                usage: { inputTokens, outputTokens },
                remaining: rateLimitResult.remaining,
                tier: rateLimitResult.tier,
                model: modelOR,
                ruta,
              }));
            },
            onError: (message) => {
              controller.enqueue(sseEvent({ type: 'error', message }));
            },
          });

        } else {
          // ── Anthropic Claude path (default) ─────────────────────────
          const params: Anthropic.MessageCreateParamsStreaming = {
            model: safeModelOverride ?? config.model,
            max_tokens: config.max_tokens,
            system: systemConRAG,
            messages: claudeMessages,
            stream: true,
          };

          if (config.thinking) {
            // @ts-expect-error — thinking es soportado en claude-opus-4-8
            params.thinking = config.thinking;
          }

          if (process.env.DEBUG_CLAUDE === 'true') {
            console.log('[Maya Lex] Enviando a Claude:', {
              model: config.model, mode, messages: claudeMessages.length, userIdentifier,
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
                  usage: { inputTokens, outputTokens },
                  remaining: rateLimitResult.remaining,
                  tier: rateLimitResult.tier,
                }));
                break;
            }
          }
        }
      } catch (error) {
        console.error('[Maya Lex] Error streaming:', error);

        let errorMessage = 'Error interno del servidor';
        if (error instanceof Anthropic.APIError) {
          if (error.status === 401)      errorMessage = 'API Key inválida. Contacta al administrador.';
          else if (error.status === 429) errorMessage = 'Servicio temporalmente saturado. Intenta en unos segundos.';
          else if (error.status === 529) errorMessage = 'Servicio de IA en mantenimiento. Intenta en unos minutos.';
          else                           errorMessage = `Error del servicio: ${error.message}`;
        }
        controller.enqueue(sseEvent({ type: 'error', message: errorMessage }));
      } finally {
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
