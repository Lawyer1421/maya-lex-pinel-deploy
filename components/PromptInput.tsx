'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// ── Tipos exportados ────────────────────────────────────────────────────────

export interface Attachment {
  id: string;
  filename: string;
  text: string;
}

export interface SendPayload {
  text: string;
  attachments: Attachment[];
  webSearch: boolean;
  modelOverride: string | null;
}

export interface PromptInputProps {
  onSend: (payload: SendPayload) => void;
  isLoading: boolean;
  onCancel: () => void;
  placeholder?: string;
}

// ── Modelos disponibles ─────────────────────────────────────────────────────

const MODELS = [
  {
    id: 'default',
    label: 'Predeterminado',
    sub: 'Óptimo según el modo activo',
  },
  {
    id: 'claude-opus-4-8',
    label: 'Claude Opus 4.8',
    sub: 'Máxima profundidad de razonamiento',
  },
  {
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    sub: 'Balance velocidad / precisión',
  },
] as const;

type ModelId = (typeof MODELS)[number]['id'];

// ── Helper SpeechRecognition (prefijo webkit) ────────────────────────────────
// SpeechRecognition no está tipada uniformemente en todos los targets de TS;
// usamos any acotado a este único helper para evitar errores de compilación.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySpeechRecognition = any;

function getSpeechRecognition(): (new () => AnySpeechRecognition) | undefined {
  if (typeof window === 'undefined') return undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | (new () => AnySpeechRecognition)
    | undefined;
}

// ── Componente ───────────────────────────────────────────────────────────────

export default function PromptInput({
  onSend,
  isLoading,
  onCancel,
  placeholder = 'Consulta jurídica en español o inglés...',
}: PromptInputProps) {
  const [text, setText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [modelOverride, setModelOverride] = useState<ModelId>('default');
  const [isListening, setIsListening] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<AnySpeechRecognition>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setShowModelPicker(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  // ── Enviar ───────────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    if ((!text.trim() && attachments.length === 0) || isLoading) return;
    onSend({
      text: text.trim(),
      attachments,
      webSearch,
      modelOverride: modelOverride === 'default' ? null : modelOverride,
    });
    setText('');
    setAttachments([]);
    setWebSearch(false);
    setModelOverride('default');
    textareaRef.current?.focus();
  }, [text, attachments, webSearch, modelOverride, isLoading, onSend]);

  // ── Adjuntos ─────────────────────────────────────────────────────────────

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (!files.length) return;
      setMenuOpen(false);
      setIsExtracting(true);

      for (const file of files) {
        try {
          let extracted = '';
          if (file.name.toLowerCase().endsWith('.txt')) {
            extracted = await file.text();
          } else {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch('/api/extract-text', { method: 'POST', body: fd });
            if (!res.ok) throw new Error('Error al extraer texto');
            const data = await res.json() as { text?: string };
            extracted = data.text ?? '';
          }
          setAttachments((prev) => [
            ...prev,
            { id: `att-${Date.now()}-${Math.random()}`, filename: file.name, text: extracted },
          ]);
        } catch (err) {
          console.error('[PromptInput] Extracción fallida:', file.name, err);
        }
      }

      setIsExtracting(false);
      e.target.value = '';
    },
    []
  );

  const removeAttachment = (id: string) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id));

  // ── Voz a texto (Web Speech API) ─────────────────────────────────────────

  const toggleVoice = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      alert('Web Speech API no disponible. Use Chrome o Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SR();
    recognition.lang = 'es-HN';
    recognition.continuous = true;
    recognition.interimResults = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transcript = Array.from(event.results as any[])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0].transcript as string)
        .join('');
      setText(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
    setMenuOpen(false);
  }, [isListening]);

  // ── Render ───────────────────────────────────────────────────────────────

  const activeModel = MODELS.find((m) => m.id === modelOverride) ?? MODELS[0];
  const canSend = (text.trim().length > 0 || attachments.length > 0) && !isLoading;

  return (
    <div className="w-full">

      {/* ── Chips: adjuntos ──────────────────────────────────────── */}
      {(attachments.length > 0 || isExtracting) && (
        <div className="flex flex-wrap gap-2 mb-2 px-1">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-1.5 bg-jade/10 border border-jade/25 rounded-lg px-2.5 py-1 text-xs text-jade"
            >
              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <span className="max-w-[140px] truncate font-medium">{att.filename}</span>
              <span className="text-white/35">({Math.round(att.text.length / 100) / 10}k)</span>
              <button
                onClick={() => removeAttachment(att.id)}
                className="ml-0.5 text-white/40 hover:text-red-400 transition-colors leading-none"
                title="Quitar adjunto"
              >
                ×
              </button>
            </div>
          ))}
          {isExtracting && (
            <div className="flex items-center gap-1.5 bg-gold/10 border border-gold/25 rounded-lg px-2.5 py-1 text-xs text-gold">
              <svg className="w-3 h-3 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Extrayendo texto...
            </div>
          )}
        </div>
      )}

      {/* ── Chips: flags activos ──────────────────────────────────── */}
      {(webSearch || modelOverride !== 'default') && (
        <div className="flex flex-wrap gap-2 mb-2 px-1">
          {webSearch && (
            <div className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/25 rounded-lg px-2 py-0.5 text-xs text-blue-400">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              Búsqueda web
              <button onClick={() => setWebSearch(false)} className="ml-0.5 text-white/40 hover:text-red-400">×</button>
            </div>
          )}
          {modelOverride !== 'default' && (
            <div className="flex items-center gap-1 bg-purple-500/10 border border-purple-500/25 rounded-lg px-2 py-0.5 text-xs text-purple-400">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 1-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
              {activeModel.label}
              <button onClick={() => setModelOverride('default')} className="ml-0.5 text-white/40 hover:text-red-400">×</button>
            </div>
          )}
        </div>
      )}

      {/* ── Fila principal del input ──────────────────────────────── */}
      <div className="flex items-end gap-2">

        {/* Botón "+" con menú desplegable */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => { setMenuOpen((v) => !v); setShowModelPicker(false); }}
            disabled={isLoading}
            title="Acciones"
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-light transition-all duration-200 select-none ${
              menuOpen
                ? 'bg-jade text-white shadow-lg shadow-jade/30'
                : 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 hover:border-white/20'
            } disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            <span
              className="transition-transform duration-200 leading-none"
              style={{ transform: menuOpen ? 'rotate(45deg)' : 'none' }}
            >
              +
            </span>
          </button>

          {/* Menú flotante */}
          {menuOpen && (
            <div className="absolute bottom-12 left-0 z-50 w-60 animate-fade-in"
              style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))' }}
            >
              <div className="glass-card border border-white/10 rounded-xl overflow-hidden py-1.5">

                {/* Subir documento */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <svg className="w-4 h-4 text-jade flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  <div className="text-left">
                    <p className="font-medium text-white/90 text-sm">Subir documento</p>
                    <p className="text-xs text-white/35">PDF · DOCX · TXT</p>
                  </div>
                </button>

                <div className="h-px bg-white/5 mx-3 my-0.5" />

                {/* Voz a texto */}
                <button
                  onClick={toggleVoice}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    isListening ? 'text-red-400 bg-red-500/10' : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <svg
                    className={`w-4 h-4 flex-shrink-0 ${isListening ? 'text-red-400 animate-pulse' : 'text-gold'}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                  </svg>
                  <div className="text-left">
                    <p className="font-medium text-white/90 text-sm">
                      {isListening ? 'Detener grabación' : 'Hablar consulta'}
                    </p>
                    <p className="text-xs text-white/35">
                      {isListening ? '● Escuchando...' : 'Voz a texto (es-HN)'}
                    </p>
                  </div>
                </button>

                <div className="h-px bg-white/5 mx-3 my-0.5" />

                {/* Búsqueda web */}
                <button
                  onClick={() => { setWebSearch((v) => !v); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <svg
                    className={`w-4 h-4 flex-shrink-0 ${webSearch ? 'text-blue-400' : 'text-white/35'}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                  <div className="text-left flex-1">
                    <p className="font-medium text-white/90 text-sm">Buscar complemento web</p>
                    <p className="text-xs text-white/35">Ampliar con fuentes externas</p>
                  </div>
                  {/* Toggle pill */}
                  <div className={`w-8 h-4 rounded-full transition-colors flex-shrink-0 relative ${webSearch ? 'bg-blue-500' : 'bg-white/10'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200 ${webSearch ? 'left-4' : 'left-0.5'}`} />
                  </div>
                </button>

                <div className="h-px bg-white/5 mx-3 my-0.5" />

                {/* Elegir modelo */}
                <button
                  onClick={() => setShowModelPicker((v) => !v)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <svg
                    className={`w-4 h-4 flex-shrink-0 ${modelOverride !== 'default' ? 'text-purple-400' : 'text-white/35'}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 1-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                  </svg>
                  <div className="text-left flex-1">
                    <p className="font-medium text-white/90 text-sm">Elegir modelo</p>
                    <p className="text-xs text-white/35">{activeModel.label}</p>
                  </div>
                  <svg
                    className={`w-3.5 h-3.5 text-white/25 flex-shrink-0 transition-transform duration-200 ${showModelPicker ? 'rotate-90' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>

                {/* Sub-menú modelos */}
                {showModelPicker && (
                  <div className="border-t border-white/5 pt-1 pb-0.5">
                    {MODELS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setModelOverride(m.id);
                          setMenuOpen(false);
                          setShowModelPicker(false);
                        }}
                        className={`w-full flex items-start gap-2.5 px-5 py-2 text-xs transition-colors ${
                          modelOverride === m.id
                            ? 'text-purple-300 bg-purple-500/10'
                            : 'text-white/55 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="mt-0.5 flex-shrink-0 text-base leading-none">
                          {modelOverride === m.id ? '●' : '○'}
                        </span>
                        <div className="text-left">
                          <p className="font-medium">{m.label}</p>
                          <p className="text-white/30">{m.sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

              </div>
            </div>
          )}
        </div>

        {/* Input de archivo (oculto) */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Textarea ───────────────────────────────────────────────── */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isListening ? '🎙 Escuchando...' : placeholder}
            disabled={isLoading}
            rows={1}
            className={`w-full bg-navy/60 border rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 resize-none outline-none transition-all duration-200 focus:ring-1 disabled:opacity-50 ${
              isListening
                ? 'border-red-500/50 focus:border-red-500/70 focus:ring-red-500/20'
                : 'border-white/10 focus:border-jade/60 focus:ring-jade/30'
            }`}
          />
        </div>

        {/* Botón enviar / cancelar ─────────────────────────────────── */}
        {isLoading ? (
          <button
            onClick={onCancel}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-600/80 hover:bg-red-600 flex items-center justify-center transition-colors"
            title="Cancelar generación"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!canSend}
            title="Enviar (Enter)"
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-jade hover:bg-jade-light disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 shadow-lg shadow-jade/20 hover:shadow-jade/40 active:scale-95"
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
  );
}
