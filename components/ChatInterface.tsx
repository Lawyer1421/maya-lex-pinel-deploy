'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMode } from '@/lib/system-prompt';
import MessageBubble from './MessageBubble';

// ── Tipos ────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: ChatMode;
  isStreaming?: boolean;
  timestamp: Date;
}

interface UsageInfo {
  inputTokens?: number;
  outputTokens?: number;
  remaining?: number;
  tier?: string;
}

// ── Constantes ───────────────────────────────────────────────────────
const MODE_LABELS: Record<ChatMode, { label: string; icon: string; description: string }> = {
  sala_ia: {
    label: 'Sala IA',
    icon: '⚡',
    description: 'Respuesta rápida para audiencias — max 150 palabras',
  },
  analisis: {
    label: 'Análisis',
    icon: '⚖️',
    description: 'Análisis jurídico profundo con doctrina y jurisprudencia',
  },
  documento: {
    label: 'Documento',
    icon: '📜',
    description: 'Generación completa de instrumentos legales',
  },
};

const SUGGESTIONS = [
  '¿Cuál es el plazo para apelar una sentencia civil en Honduras?',
  'Redacta un contrato de compraventa de bien inmueble',
  'Analiza los requisitos de la cesantía según el Código del Trabajo',
  'What are the requirements for a power of attorney in Honduras?',
  'Genera una escritura de constitución de SRL',
  'Plazo para presentar recurso de casación penal',
];

// ── Componente principal ──────────────────────────────────────────────
export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<ChatMode>('analisis');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [usage, setUsage] = useState<UsageInfo>({});
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  // ── Enviar mensaje ──────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text?: string) => {
      const userText = (text ?? input).trim();
      if (!userText || isLoading) return;

      setInput('');
      setError(null);
      setShowSuggestions(false);

      // Agregar mensaje del usuario
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userText,
        mode,
        timestamp: new Date(),
      };

      const assistantId = `assistant-${Date.now()}`;
      const assistantMsg: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        mode,
        isStreaming: true,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsLoading(true);
      setIsThinking(false);

      // Preparar historial para la API (sin el último assistant vacío)
      const history = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: userText },
      ];

      // Crear AbortController para cancelar si es necesario
      abortRef.current = new AbortController();

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history, mode }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();

          if (response.status === 429) {
            const resetTime = errorData.resetAt
              ? new Date(errorData.resetAt).toLocaleTimeString('es-HN')
              : 'mañana';
            setError(
              `${errorData.message} El límite se reinicia a las ${resetTime}.`
            );
          } else {
            setError(errorData.error || 'Error del servidor');
          }

          // Eliminar el mensaje de assistant vacío
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          setIsLoading(false);
          return;
        }

        // Procesar stream SSE
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (!data) continue;

            try {
              const event = JSON.parse(data);

              switch (event.type) {
                case 'thinking':
                  setIsThinking(true);
                  break;

                case 'text':
                  setIsThinking(false);
                  accumulated += event.text;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: accumulated }
                        : m
                    )
                  );
                  break;

                case 'done':
                  setUsage({
                    inputTokens: event.usage?.inputTokens,
                    outputTokens: event.usage?.outputTokens,
                    remaining: event.remaining,
                    tier: event.tier,
                  });
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, isStreaming: false }
                        : m
                    )
                  );
                  break;

                case 'error':
                  setError(event.message);
                  setMessages((prev) =>
                    prev.filter((m) => m.id !== assistantId)
                  );
                  break;
              }
            } catch {
              // Ignorar líneas mal formadas
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          // El usuario canceló
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content + '\n\n*[Respuesta cancelada]*', isStreaming: false }
                : m
            )
          );
        } else {
          setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        }
      } finally {
        setIsLoading(false);
        setIsThinking(false);
        abortRef.current = null;
      }
    },
    [input, isLoading, messages, mode]
  );

  // ── Cancelar generación ─────────────────────────────────────────────
  const cancelGeneration = () => {
    abortRef.current?.abort();
  };

  // ── Limpiar chat ────────────────────────────────────────────────────
  const clearChat = () => {
    setMessages([]);
    setError(null);
    setUsage({});
    setShowSuggestions(true);
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-navy">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="border-b border-white/10 bg-navy-light/50 backdrop-blur-sm px-4 py-3 flex items-center gap-3 flex-shrink-0">
        {/* Logo */}
        <div className="w-9 h-9 rounded-full bg-gradient-maya flex items-center justify-center flex-shrink-0 shadow-lg shadow-jade/20">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
          </svg>
        </div>

        {/* Título */}
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-gradient-maya leading-tight">MAYA LEX IA PINEL HN</h1>
          <p className="text-white/40 text-xs truncate">Asistente Jurídico · Honduras</p>
        </div>

        {/* Selector de modo */}
        <div className="flex items-center gap-1">
          {(Object.keys(MODE_LABELS) as ChatMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              title={MODE_LABELS[m].description}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all duration-200 ${
                mode === m
                  ? 'bg-jade text-white shadow-sm shadow-jade/30'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {MODE_LABELS[m].icon} {MODE_LABELS[m].label}
            </button>
          ))}
        </div>

        {/* Botón limpiar */}
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-white/30 hover:text-white/70 transition-colors p-1.5 rounded-lg hover:bg-white/5"
            title="Nueva consulta"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        )}
      </header>

      {/* ── Mensajes ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">

        {/* Pantalla inicial con sugerencias */}
        {showSuggestions && messages.length === 0 && (
          <div className="max-w-2xl mx-auto">
            {/* Bienvenida */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-maya mx-auto mb-4 flex items-center justify-center shadow-xl shadow-jade/20">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                </svg>
              </div>
              <h2 className="font-serif text-2xl font-bold text-gradient-maya mb-1">
                MAYA LEX IA PINEL HN
              </h2>
              <p className="text-white/50 text-sm">
                Asistente jurídico inteligente · 34 años de experiencia legal hondureña
              </p>
            </div>

            {/* Modo activo */}
            <div className="glass-card p-4 mb-6 text-center">
              <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Modo activo</p>
              <p className="text-jade font-semibold">
                {MODE_LABELS[mode].icon} {MODE_LABELS[mode].label} — {MODE_LABELS[mode].description}
              </p>
            </div>

            {/* Sugerencias */}
            <p className="text-white/40 text-xs text-center mb-3 uppercase tracking-widest">
              Consultas de ejemplo
            </p>
            <div className="grid gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left glass-card-hover p-3 text-sm text-white/70 hover:text-white transition-all duration-200"
                >
                  <span className="text-jade mr-2">→</span>
                  {s}
                </button>
              ))}
            </div>

            {/* Info tier gratuito */}
            <div className="mt-6 text-center">
              <p className="text-white/30 text-xs">
                Plan Gratuito: 3 consultas diarias · {' '}
                <a href="/pricing" className="text-gold hover:underline">Actualizar al Plan Pro →</a>
              </p>
            </div>
          </div>
        )}

        {/* Mensajes del chat */}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isThinking={isThinking && message.isStreaming === true}
          />
        ))}

        {/* Indicador "pensando" antes de la primera palabra */}
        {isThinking && messages[messages.length - 1]?.content === '' && (
          <div className="flex justify-start">
            <div className="glass-card px-4 py-3 max-w-xs">
              <div className="flex items-center gap-2 text-jade text-sm">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>Analizando consulta jurídica...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 text-sm text-red-300">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <div>
                  <p className="font-medium text-red-200 mb-1">Error</p>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Barra de estado (usage) ───────────────────────────────── */}
      {usage.remaining !== undefined && (
        <div className="px-4 py-1.5 border-t border-white/5 flex items-center justify-between text-xs text-white/30">
          <span>
            {usage.tier === 'free'
              ? `${usage.remaining} consultas restantes hoy (Plan Gratuito)`
              : usage.tier === 'pro'
              ? '✓ Plan Pro — consultas ilimitadas'
              : '✓ Acceso Admin'}
          </span>
          {usage.inputTokens && (
            <span>
              {usage.inputTokens?.toLocaleString()} / {usage.outputTokens?.toLocaleString()} tokens
            </span>
          )}
        </div>
      )}

      {/* ── Input ────────────────────────────────────────────────── */}
      <div className="border-t border-white/10 bg-navy-light/30 px-4 py-3 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2">
            {/* Textarea */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={
                  mode === 'sala_ia'
                    ? 'Art. 706 CPC · consulta rápida para audiencia...'
                    : mode === 'documento'
                    ? 'Redacta un contrato de... / Elabora una escritura de...'
                    : 'Consulta jurídica en español o inglés...'
                }
                disabled={isLoading}
                rows={1}
                className="w-full bg-navy/60 border border-white/10 focus:border-jade/60 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 resize-none outline-none transition-all duration-200 focus:ring-1 focus:ring-jade/30 disabled:opacity-50"
              />
            </div>

            {/* Botón enviar / cancelar */}
            {isLoading ? (
              <button
                onClick={cancelGeneration}
                className="flex-shrink-0 w-11 h-11 rounded-xl bg-red-600/80 hover:bg-red-600 flex items-center justify-center transition-colors"
                title="Cancelar"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim()}
                className="flex-shrink-0 w-11 h-11 rounded-xl bg-jade hover:bg-jade-light disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 shadow-lg shadow-jade/20 hover:shadow-jade/40 active:scale-95"
                title="Enviar (Enter)"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
              </button>
            )}
          </div>

          {/* Hint */}
          <p className="text-white/20 text-xs mt-2 text-center">
            Enter para enviar · Shift+Enter para nueva línea · Las respuestas son borradores profesionales
          </p>
        </div>
      </div>
    </div>
  );
}
