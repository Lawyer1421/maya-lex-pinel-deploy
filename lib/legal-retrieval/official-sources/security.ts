/**
 * lib/legal-retrieval/official-sources/security.ts
 * Retrieval v3 — Fase 1E. Controles de seguridad obligatorios (§8 de la
 * directiva) para cualquier adapter que consulte una fuente oficial externa.
 *
 * Server-side only (Node runtime de Next.js) -- nunca se expone a un
 * componente cliente. Ningún adapter debe hacer fetch() directo: todos pasan
 * por safeFetchOfficialHost(), que aplica:
 *   - allowlist de hosts (nunca una URL arbitraria suministrada por el usuario)
 *   - timeout
 *   - límite de tamaño de respuesta (defensa contra respuestas gigantes)
 *   - validación de Content-Type
 *   - validación de redirecciones (SOLO se sigue un redirect si el host de
 *     destino también está en la allowlist -- previene redirect-to-untrusted-host)
 *   - sin credenciales: nunca se envía ninguna cabecera de autenticación,
 *     ningún adapter de esta fase requiere ninguna.
 */

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5MB -- generoso para HTML, corta una respuesta anómala
const MAX_REDIRECTS = 3;

export type SafeFetchErrorCode =
  | 'HOST_NOT_ALLOWLISTED'
  | 'REDIRECT_TO_UNTRUSTED_HOST'
  | 'TOO_MANY_REDIRECTS'
  | 'TIMEOUT'
  | 'RESPONSE_TOO_LARGE'
  | 'UNEXPECTED_CONTENT_TYPE'
  | 'INVALID_RESPONSE'
  | 'NETWORK_ERROR'
  | 'HTTP_ERROR';

export class SafeFetchError extends Error {
  constructor(public readonly code: SafeFetchErrorCode, message: string) {
    super(message);
    this.name = 'SafeFetchError';
  }
}

export interface SafeFetchOptions {
  method?: 'GET' | 'POST';
  body?: string;
  headers?: Record<string, string>;
  allowedHosts: readonly string[];
  timeoutMs?: number;
  maxBytes?: number;
  /** Content-Type(s) aceptados, comparados por prefijo (ej. 'text/html'). */
  acceptedContentTypePrefixes: readonly string[];
}

function hostOf(url: string): string {
  return new URL(url).hostname.toLowerCase();
}

function assertAllowlisted(url: string, allowedHosts: readonly string[], errorCode: SafeFetchErrorCode): void {
  const host = hostOf(url);
  if (!allowedHosts.includes(host)) {
    throw new SafeFetchError(errorCode, `Host no permitido: ${host}`);
  }
}

/**
 * Lee el cuerpo de una respuesta con un límite duro de tamaño -- aborta el
 * stream en cuanto se supera `maxBytes`, sin esperar a que termine una
 * respuesta anómalamente grande.
 */
async function readBodyCapped(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return response.text();

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new SafeFetchError('RESPONSE_TOO_LARGE', `Respuesta excede ${maxBytes} bytes`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf-8');
}

/**
 * fetch() seguro para fuentes oficiales: allowlist de host de entrada Y de
 * cada redirección, timeout, tope de tamaño de respuesta, y validación de
 * Content-Type. Nunca lanza un error crudo de red/HTML hacia el caller sin
 * clasificar -- siempre SafeFetchError con un código seguro.
 */
export async function safeFetchOfficialHost(url: string, opts: SafeFetchOptions): Promise<{ body: string; finalUrl: string }> {
  assertAllowlisted(url, opts.allowedHosts, 'HOST_NOT_ALLOWLISTED');

  let currentUrl = url;
  for (let intento = 0; intento <= MAX_REDIRECTS; intento++) {
    let response: Response;
    try {
      response = await fetch(currentUrl, {
        method: opts.method ?? 'GET',
        body: opts.body,
        headers: opts.headers,
        redirect: 'manual',
        signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        throw new SafeFetchError('TIMEOUT', `Timeout consultando ${hostOf(currentUrl)}`);
      }
      throw new SafeFetchError('NETWORK_ERROR', err instanceof Error ? err.message : String(err));
    }

    // redirect: 'manual' -> los 3xx llegan como response.type='opaqueredirect'
    // (sin poder leer status/headers) en algunos runtimes, o como 3xx normal
    // con Location legible en otros -- se cubren ambos casos explícitamente.
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new SafeFetchError('INVALID_RESPONSE', 'Redirección sin cabecera Location');
      }
      const destino = new URL(location, currentUrl).toString();
      assertAllowlisted(destino, opts.allowedHosts, 'REDIRECT_TO_UNTRUSTED_HOST');
      currentUrl = destino;
      continue;
    }

    if (!response.ok) {
      throw new SafeFetchError('HTTP_ERROR', `HTTP ${response.status} en ${hostOf(currentUrl)}`);
    }

    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    const aceptado = opts.acceptedContentTypePrefixes.some((p) => contentType.startsWith(p));
    if (!aceptado) {
      throw new SafeFetchError('UNEXPECTED_CONTENT_TYPE', `Content-Type inesperado: ${contentType || '(ausente)'}`);
    }

    const body = await readBodyCapped(response, opts.maxBytes ?? DEFAULT_MAX_BYTES);
    return { body, finalUrl: currentUrl };
  }

  throw new SafeFetchError('TOO_MANY_REDIRECTS', `Más de ${MAX_REDIRECTS} redirecciones`);
}
