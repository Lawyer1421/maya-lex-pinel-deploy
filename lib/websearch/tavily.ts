/**
 * lib/websearch/tavily.ts
 * Cliente Tavily Search API para búsqueda web real.
 * Docs: https://docs.tavily.com/reference/api-reference
 *
 * Seguridad:
 *   - URL del endpoint hardcodeada (SSRF imposible)
 *   - API key solo desde env var, nunca expuesta en logs
 *   - Query sanitizada y truncada antes del envío
 *   - AbortController con timeout configurable
 */

// URL fija — nunca derivada de input de usuario (anti-SSRF)
const TAVILY_ENDPOINT = 'https://api.tavily.com/search';

// Score mínimo de relevancia (Tavily 0–1); resultados por debajo son ruido
const SCORE_MINIMO_DEFAULT = 0.3;

// Máximo de chars por snippet para no saturar el system prompt
const MAX_SNIPPET_CHARS = 450;

// ── Tipos ───────────────────────────────────────────────────────────────────

export interface TavilyResult {
  title:   string;
  url:     string;
  snippet: string;
  score:   number;
  dominio: string;
}

export interface OpcionesBusqueda {
  maxResultados?: number;   // default 5
  timeoutMs?:    number;    // default 3500
  umbralScore?:  number;    // default 0.3
}

interface TavilyApiResponse {
  query:   string;
  results: Array<{
    title:   string;
    url:     string;
    content: string;
    score:   number;
  }>;
}

// ── Función principal ────────────────────────────────────────────────────────

/**
 * Ejecuta búsqueda en Tavily y devuelve resultados filtrados y deduplicados.
 * Lanza Error si TAVILY_API_KEY no está configurada o si la API responde con error.
 * El llamador debe envolver en try/catch para activar fallback.
 */
export async function buscarWeb(
  consulta: string,
  opciones: OpcionesBusqueda = {}
): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error('TAVILY_API_KEY no configurada');
  }

  const {
    maxResultados = 5,
    timeoutMs    = 3500,
    umbralScore  = SCORE_MINIMO_DEFAULT,
  } = opciones;

  // Sanitizar: truncar a 400 chars, eliminar caracteres de control
  const query = consulta.replace(/[\x00-\x1F\x7F]/g, ' ').trim().slice(0, 400);
  if (!query) return [];

  // Pedir algunos extra para compensar el filtrado posterior
  const maxApi = Math.min(maxResultados + 3, 8);

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), timeoutMs);

  let rawResults: TavilyApiResponse['results'] = [];

  try {
    const response = await fetch(TAVILY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        // Tavily acepta Bearer header (v2) y campo api_key en body (v1)
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        api_key:             apiKey,      // compatibilidad v1
        query,
        search_depth:        'basic',     // 'advanced' es más lento y costoso
        topic:               'general',
        max_results:         maxApi,
        include_answer:      false,       // no necesitamos la síntesis de Tavily
        include_images:      false,
        include_raw_content: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`Tavily ${response.status}: ${errText.slice(0, 120)}`);
    }

    const data = (await response.json()) as TavilyApiResponse;
    rawResults = data.results ?? [];
  } finally {
    clearTimeout(timeoutId);
  }

  // ── Filtrar por score mínimo ──────────────────────────────────────────────
  const filtrados = rawResults.filter((r) => (r.score ?? 0) >= umbralScore);

  // ── Deduplicar por URL normalizada (sin query params) ────────────────────
  const vistos  = new Set<string>();
  const final: TavilyResult[] = [];

  for (const r of filtrados) {
    const urlNorm = normalizarUrl(r.url);
    if (vistos.has(urlNorm)) continue;
    vistos.add(urlNorm);

    final.push({
      title:   (r.title ?? '').trim(),
      url:     r.url,
      snippet: limpiarSnippet(r.content ?? ''),
      score:   r.score,
      dominio: extraerDominio(r.url),
    });

    if (final.length >= maxResultados) break;
  }

  return final;
}

// ── Formateador de contexto para system prompt ───────────────────────────────

/**
 * Convierte los resultados Tavily en un bloque de texto estructurado
 * listo para inyectarse en el system prompt como contexto complementario.
 *
 * Incluye:
 *   - Los datos de cada fuente (título, URL, snippet)
 *   - Instrucciones de citación para el modelo
 *   - Jerarquía de fuentes (corpus interno > web)
 */
export function formatearContextoWeb(resultados: TavilyResult[]): string {
  if (!resultados.length) return '';

  const bloques = resultados
    .map((r, i) =>
      [
        `[Web ${i + 1}] ${r.title}`,
        `  Dominio: ${r.dominio}`,
        `  URL:     ${r.url}`,
        `  Fragmento: "${r.snippet}"`,
      ].join('\n')
    )
    .join('\n\n');

  return [
    '## FUENTES WEB EXTERNAS (búsqueda Tavily en tiempo real)',
    '',
    '> JERARQUÍA OBLIGATORIA:',
    '> 1. Corpus normativo interno (RAG) — fuente primaria, SIEMPRE prevalece.',
    '> 2. Fuentes web externas — SOLO complemento; no substituyen la base interna.',
    '> Si hay contradicción entre fuente web y corpus interno: prioriza corpus y señala la discrepancia.',
    '',
    bloques,
    '',
    '### INSTRUCCIONES DE CITACIÓN (obligatorio si usas alguna fuente web):',
    '- Cita en línea como [Web N] al usar información de un resultado.',
    '- Distingue explícitamente: norma interna verificada vs. referencia web.',
    '- Al final de tu respuesta incluye la sección exacta (solo las fuentes que hayas citado):',
    '',
    '🌐 **Fuentes web consultadas:**',
    '(formato: [Web N] Título — URL)',
  ].join('\n');
}

/**
 * Texto compacto para notificar al modelo que la búsqueda web falló.
 * Se añade al system prompt para que el modelo lo informe de forma discreta.
 */
export const AVISO_BUSQUEDA_FALLIDA =
  '\n\n> [NOTA SISTEMA]: La búsqueda web externa no estuvo disponible (timeout o error). ' +
  'Al final de tu respuesta informa brevemente al usuario: ' +
  '"🌐 Búsqueda web: no disponible en este momento — respuesta basada en corpus interno."';

// ── Helpers internos ─────────────────────────────────────────────────────────

function normalizarUrl(url: string): string {
  try {
    const u = new URL(url);
    // Ignorar query params y hash para deduplicación
    return `${u.hostname}${u.pathname}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function extraerDominio(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function limpiarSnippet(texto: string): string {
  return texto
    .replace(/\s+/g, ' ')          // colapsar espacios/saltos
    .trim()
    .slice(0, MAX_SNIPPET_CHARS);
}
