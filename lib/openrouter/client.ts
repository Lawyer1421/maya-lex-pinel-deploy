/**
 * OpenRouter — Cliente de streaming SSE (token por token)
 *
 * OpenRouter implementa la API compatible con OpenAI.
 * Se usa fetch nativo para máxima compatibilidad con Next.js App Router
 * y Edge Runtime (sin dependencias adicionales de npm).
 *
 * Seguridad (OWASP RAG):
 * - El contexto RAG se trata como DATO, no como instrucción ejecutable.
 * - El system prompt maestro endurecido siempre precede al contexto recuperado.
 * - La API Key se mantiene en variables de entorno del servidor (nunca expuesta al cliente).
 */

import { OPENROUTER_BASE_URL } from '@/config/openrouter_config';

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone:  (usage: { inputTokens: number; outputTokens: number }) => void;
  onError: (message: string) => void;
}

/**
 * Abre un stream SSE hacia OpenRouter y entrega tokens via callbacks.
 * Los callbacks tienen la misma firma que el loop de eventos de Anthropic,
 * lo que permite intercambiar proveedores sin modificar el ReadableStream externo.
 */
export async function streamOpenRouter(
  model: string,
  messages: OpenRouterMessage[],
  callbacks: StreamCallbacks,
): Promise<void> {
  const { onToken, onDone, onError } = callbacks;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    onError('OPENROUTER_API_KEY no configurada. Añádela en .env.local (desarrollo) o en Vercel (producción).');
    return;
  }

  let response: Response;
  try {
    response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
        // OpenRouter recomienda estos headers para identificar el origen
        'HTTP-Referer':  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        'X-Title':       'Maya Lex IA Pinel HN',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });
  } catch (err) {
    onError(`Error de conexión con OpenRouter: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Sin detalle');
    onError(`OpenRouter HTTP ${response.status}: ${errText}`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError('Stream vacío de OpenRouter (body null)');
    return;
  }

  const decoder = new TextDecoder();
  let inputTokens  = 0;
  let outputTokens = 0;
  let buffer       = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Acumular en buffer para manejar líneas SSE fragmentadas
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // La última línea puede estar incompleta — volver al buffer
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();

        if (payload === '[DONE]') {
          onDone({ inputTokens, outputTokens });
          return;
        }

        try {
          const parsed = JSON.parse(payload);
          const token = parsed.choices?.[0]?.delta?.content;
          if (typeof token === 'string' && token.length > 0) {
            onToken(token);
          }
          // Algunos modelos incluyen usage en el último chunk
          if (parsed.usage) {
            inputTokens  = parsed.usage.prompt_tokens     ?? inputTokens;
            outputTokens = parsed.usage.completion_tokens ?? outputTokens;
          }
        } catch {
          // Ignorar líneas SSE malformadas (keep-alive, comentarios, etc.)
        }
      }
    }

    // Fallback: stream terminó sin [DONE] (comportamiento de algunos modelos)
    onDone({ inputTokens, outputTokens });
  } finally {
    reader.releaseLock();
  }
}
