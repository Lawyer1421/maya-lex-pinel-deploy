/**
 * POST /api/chat
 * MAYA LEX IA PINEL HN — Streaming Chat con Claude API
 *
 * Request body:
 *   messages : { role: 'user'|'assistant', content: string }[]
 *   mode     : 'sala_ia' | 'analisis' | 'documento'
 *
 * Response: SSE stream
 *   data: { type: 'text', text: string }
 *   data: { type: 'done', usage: { input_tokens, output_tokens } }
 *   data: { type: 'error', message: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  checkAndIncrementRateLimit,
  getUserIdentifier,
} from '@/lib/rate-limit';
import { CLAUDE_CONFIG, ChatMode } from '@/lib/system-prompt';

// Cliente Anthropic — se crea lazily dentro del handler para garantizar
// que process.env.ANTHROPIC_API_KEY esté disponible en runtime
let _anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }
  return _anthropic;
}

// Tipos
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  mode?: ChatMode;
}

// Encoder para SSE
const encoder = new TextEncoder();

function sseEvent(data: object): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest) {
  // ─── 1. Parsear body ───────────────────────────────────────────────
  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Request body inválido' },
      { status: 400 }
    );
  }

  const { messages, mode = 'analisis' } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: 'messages es requerido y debe ser un array no vacío' },
      { status: 400 }
    );
  }

  // Validar modo
  const validModes: ChatMode[] = ['sala_ia', 'analisis', 'documento'];
  if (!validModes.includes(mode)) {
    return NextResponse.json(
      { error: `mode debe ser: ${validModes.join(', ')}` },
      { status: 400 }
    );
  }

  // Validar que la API key esté configurada
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    console.error('[Maya Lex] ANTHROPIC_API_KEY no encontrada en process.env');
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY no configurada en el servidor' },
      { status: 500 }
    );
  }

  // ─── 2. Rate Limiting ──────────────────────────────────────────────
  const userIdentifier = getUserIdentifier(req);
  const rateLimitResult = await checkAndIncrementRateLimit(userIdentifier);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: 'Límite diario alcanzado',
        message:
          rateLimitResult.tier === 'free'
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
            Math.ceil(
              (new Date(rateLimitResult.resetAt).getTime() - Date.now()) / 1000
            )
          ),
        },
      }
    );
  }

  // ─── 3. Configurar Claude según modo ─────────────────────────────
  const config = CLAUDE_CONFIG[mode];

  // Limpiar y validar mensajes para la API
  const claudeMessages: Anthropic.MessageParam[] = messages
    .filter((m) => m.content && m.content.trim())
    .map((m) => ({
      role: m.role,
      content: m.content.trim(),
    }));

  // ─── 4. Streaming Response ─────────────────────────────────────────
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Construir parámetros para Claude
        const params: Anthropic.MessageCreateParamsStreaming = {
          model: config.model,
          max_tokens: config.max_tokens,
          system: config.systemPrompt,
          messages: claudeMessages,
          stream: true,
        };

        // Agregar thinking para modos que lo soportan (opus-4-7)
        if (config.thinking) {
          // @ts-expect-error — thinking es soportado en claude-opus-4-7
          params.thinking = config.thinking;
        }

        if (process.env.DEBUG_CLAUDE === 'true') {
          console.log('[Maya Lex] Enviando a Claude:', {
            model: config.model,
            mode,
            messages: claudeMessages.length,
            userIdentifier,
          });
        }

        // Crear stream de Claude
        const claudeStream = await getAnthropicClient().messages.create(params);

        let inputTokens = 0;
        let outputTokens = 0;

        // Procesar eventos del stream
        for await (const event of claudeStream) {
          switch (event.type) {
            case 'message_start':
              inputTokens = event.message.usage.input_tokens;
              break;

            case 'content_block_start':
              // Ignorar bloques de thinking (no enviar al cliente)
              if (event.content_block.type === 'thinking') {
                // Solo enviamos indicador de "pensando"
                controller.enqueue(
                  sseEvent({ type: 'thinking', thinking: true })
                );
              }
              break;

            case 'content_block_delta':
              // Solo enviar texto al cliente (no thinking)
              if (event.delta.type === 'text_delta') {
                controller.enqueue(
                  sseEvent({ type: 'text', text: event.delta.text })
                );
              }
              break;

            case 'content_block_stop':
              break;

            case 'message_delta':
              outputTokens = event.usage.output_tokens;
              break;

            case 'message_stop':
              // Enviar evento final con métricas
              controller.enqueue(
                sseEvent({
                  type: 'done',
                  usage: { inputTokens, outputTokens },
                  remaining: rateLimitResult.remaining,
                  tier: rateLimitResult.tier,
                })
              );
              break;
          }
        }
      } catch (error) {
        console.error('[Maya Lex] Error Claude API:', error);

        let errorMessage = 'Error interno del servidor';

        if (error instanceof Anthropic.APIError) {
          if (error.status === 401) {
            errorMessage = 'API Key inválida. Contacta al administrador.';
          } else if (error.status === 429) {
            errorMessage =
              'Servicio temporalmente saturado. Intenta en unos segundos.';
          } else if (error.status === 529) {
            errorMessage =
              'Servicio de IA en mantenimiento. Intenta en unos minutos.';
          } else {
            errorMessage = `Error del servicio: ${error.message}`;
          }
        }

        controller.enqueue(
          sseEvent({ type: 'error', message: errorMessage })
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Desactiva buffering en Nginx
      'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      'X-RateLimit-Tier': rateLimitResult.tier,
    },
  });
}

// GET /api/chat — ping de estado
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'MAYA LEX IA PINEL HN',
    version: '1.1.0',
    models: {
      sala_ia: CLAUDE_CONFIG.sala_ia.model,
      analisis: CLAUDE_CONFIG.analisis.model,
      documento: CLAUDE_CONFIG.documento.model,
    },
  });
}
