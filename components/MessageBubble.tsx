'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ── Tipos ────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: string;
  isStreaming?: boolean;
  timestamp: Date;
}

interface MessageBubbleProps {
  message: Message;
  isThinking?: boolean;
}

// ── Componente ───────────────────────────────────────────────────────
export default function MessageBubble({ message, isThinking }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const timeStr = message.timestamp.toLocaleTimeString('es-HN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[80%] lg:max-w-[65%]">
          {/* Burbuja del usuario */}
          <div className="bg-jade/20 border border-jade/30 rounded-2xl rounded-tr-sm px-4 py-3 text-white text-sm leading-relaxed">
            {message.content}
          </div>
          {/* Timestamp */}
          <div className="flex justify-end items-center gap-1.5 mt-1 px-1">
            <span className="text-white/25 text-xs">{timeStr}</span>
            {message.mode && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                message.mode === 'sala_ia'
                  ? 'text-gold/60 bg-gold/10'
                  : message.mode === 'documento'
                  ? 'text-white/40 bg-white/5'
                  : 'text-jade/60 bg-jade/10'
              }`}>
                {message.mode === 'sala_ia' ? '⚡' : message.mode === 'documento' ? '📜' : '⚖️'}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Mensaje del asistente ──────────────────────────────────────────
  return (
    <div className="flex justify-start animate-slide-up">
      <div className="max-w-[85%] lg:max-w-[75%] w-full">
        {/* Header del asistente */}
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="w-6 h-6 rounded-full bg-gradient-maya flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
            </svg>
          </div>
          <span className="text-jade text-xs font-semibold">MAYA LEX</span>
          {isThinking && (
            <span className="text-white/40 text-xs flex items-center gap-1">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              analizando...
            </span>
          )}
        </div>

        {/* Contenido del mensaje */}
        {message.content ? (
          <div className="glass-card px-5 py-4 text-sm">
            <div className="prose-legal">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Encabezados con color gold
                  h1: ({ children }) => (
                    <h1 className="font-serif text-xl font-bold text-gold border-b border-gold/20 pb-2 mb-4">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="font-serif text-lg font-bold text-gold mt-6 mb-3">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="font-semibold text-jade-light mt-4 mb-2">
                      {children}
                    </h3>
                  ),
                  // Párrafos
                  p: ({ children }) => (
                    <p className="text-white/85 leading-relaxed mb-3">
                      {children}
                    </p>
                  ),
                  // Listas
                  ul: ({ children }) => (
                    <ul className="list-none space-y-1.5 mb-4">
                      {children}
                    </ul>
                  ),
                  li: ({ children }) => (
                    <li className="flex gap-2 text-white/80">
                      <span className="text-jade mt-1 flex-shrink-0">·</span>
                      <span>{children}</span>
                    </li>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside space-y-1.5 mb-4 text-white/80 marker:text-jade">
                      {children}
                    </ol>
                  ),
                  // Código inline
                  code: ({ children, className }) => {
                    const isBlock = className?.includes('language-');
                    if (isBlock) {
                      return (
                        <div className="bg-navy border border-white/10 rounded-lg p-3 my-3 overflow-x-auto">
                          <code className="text-gold text-xs font-mono">{children}</code>
                        </div>
                      );
                    }
                    return (
                      <code className="bg-navy/60 text-gold px-1.5 py-0.5 rounded text-xs font-mono">
                        {children}
                      </code>
                    );
                  },
                  // Blockquote (avisos legales)
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-gold/40 pl-4 my-4 text-white/60 text-xs italic">
                      {children}
                    </blockquote>
                  ),
                  // Tablas
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="w-full text-xs border-collapse">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border border-white/10 bg-navy px-3 py-2 text-left text-gold font-semibold">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-white/10 px-3 py-2 text-white/75">
                      {children}
                    </td>
                  ),
                  // Negritas y cursivas
                  strong: ({ children }) => (
                    <strong className="text-jade-light font-semibold">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="text-white/70 italic">{children}</em>
                  ),
                  // Separadores
                  hr: () => <hr className="border-white/10 my-4" />,
                  // Links
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-jade-light hover:underline"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>

            {/* Cursor parpadeante mientras transmite */}
            {message.isStreaming && message.content && (
              <span className="inline-block w-0.5 h-4 bg-jade animate-pulse ml-0.5" />
            )}
          </div>
        ) : (
          // Skeleton mientras espera la primera palabra
          message.isStreaming && (
            <div className="glass-card px-5 py-4">
              <div className="space-y-2">
                <div className="h-3 bg-white/10 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-white/10 rounded animate-pulse w-1/2" />
              </div>
            </div>
          )
        )}

        {/* Footer del mensaje */}
        {!message.isStreaming && message.content && (
          <div className="flex items-center gap-3 mt-1.5 px-1">
            <span className="text-white/25 text-xs">{timeStr}</span>

            {/* Botón copiar */}
            <button
              onClick={() => navigator.clipboard.writeText(message.content)}
              className="text-white/25 hover:text-white/60 transition-colors"
              title="Copiar respuesta"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
              </svg>
            </button>

            {/* Aviso legal mini */}
            <span className="text-white/20 text-xs">
              ⚠️ Borrador profesional · requiere revisión
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
