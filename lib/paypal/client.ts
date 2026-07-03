/**
 * lib/paypal/client.ts
 * Utilidades compartidas para la integración PayPal:
 *   - URL base (live / sandbox)
 *   - Token OAuth con caché en memoria (evita 1 llamada por evento)
 *   - Validación SSRF del cert_url (OWASP A10)
 *   - Verificación de firma via postback a api-m.paypal.com
 *
 * OWASP: ninguna credencial está quemada en código.
 * Todas las vars de entorno se leen en tiempo de ejecución.
 */

// ── Constantes ──────────────────────────────────────────────────────────────

const PAYPAL_LIVE_BASE    = 'https://api-m.paypal.com';
const PAYPAL_SANDBOX_BASE = 'https://api-m.sandbox.paypal.com';

// Orígenes legítimos para el cert_url de PayPal (SSRF allowlist)
const ALLOWED_CERT_ORIGINS = new Set([
  'https://api.paypal.com',
  'https://api-m.paypal.com',
  'https://api.sandbox.paypal.com',
  'https://api-m.sandbox.paypal.com',
]);

// ── Base URL ─────────────────────────────────────────────────────────────────

export function getPayPalBaseUrl(): string {
  return process.env.PAYPAL_MODE === 'live' ? PAYPAL_LIVE_BASE : PAYPAL_SANDBOX_BASE;
}

export function isLiveMode(): boolean {
  return process.env.PAYPAL_MODE === 'live';
}

// ── SSRF defense — cert_url validation ───────────────────────────────────────

/**
 * Valida que cert_url proviene de un dominio oficial de PayPal.
 * Previene ataques SSRF donde un atacante envía su propio cert_url.
 */
export function validateCertUrl(certUrl: string): boolean {
  try {
    const u = new URL(certUrl);
    return u.protocol === 'https:' && ALLOWED_CERT_ORIGINS.has(u.origin);
  } catch {
    return false;
  }
}

// ── Token OAuth con caché ─────────────────────────────────────────────────────

let _cachedToken: string | null = null;
let _tokenExpiry  = 0;

/**
 * Obtiene un access token de PayPal con caché en memoria.
 * En producción con múltiples instancias serverless, cada instancia
 * tendrá su propia caché (aceptable: reduce llamadas ~90% en instancias calientes).
 */
export async function getAccessToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;

  const clientId     = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('[PayPal] PAYPAL_CLIENT_ID o PAYPAL_CLIENT_SECRET no configurados');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization:  `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`[PayPal] Error de autenticación OAuth: HTTP ${res.status}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  _cachedToken = data.access_token;
  _tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // margen 60 s
  return _cachedToken;
}

// ── Verificación de firma (postback oficial PayPal) ───────────────────────────

export interface WebhookSigHeaders {
  'paypal-auth-algo':         string;
  'paypal-cert-url':          string;
  'paypal-transmission-id':   string;
  'paypal-transmission-sig':  string;
  'paypal-transmission-time': string;
}

/**
 * Verifica la firma del webhook mediante el endpoint oficial de PayPal.
 * Lanza un error si PAYPAL_WEBHOOK_ID no está configurado (no hay bypass silencioso).
 *
 * Dev bypass: si PAYPAL_DEV_BYPASS_VERIFY=true Y PAYPAL_MODE !== 'live',
 * omite la verificación para pruebas locales.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  headers: WebhookSigHeaders
): Promise<boolean> {
  // Dev bypass — SOLO fuera de producción
  if (process.env.PAYPAL_DEV_BYPASS_VERIFY === 'true' && !isLiveMode()) {
    console.warn('[PayPal] ⚠️  BYPASS DE VERIFICACIÓN ACTIVO — solo para desarrollo local');
    return true;
  }

  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    throw new Error('[PayPal] PAYPAL_WEBHOOK_ID no configurado — error de configuración fatal');
  }

  // SSRF: validar cert_url antes de enviarlo al postback
  const certUrl = headers['paypal-cert-url'];
  if (!certUrl || !validateCertUrl(certUrl)) {
    console.error('[PayPal] cert_url rechazada (SSRF defense):', certUrl);
    return false;
  }

  const accessToken = await getAccessToken();
  const res = await fetch(`${getPayPalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo:         headers['paypal-auth-algo'],
      cert_url:          certUrl,
      transmission_id:   headers['paypal-transmission-id'],
      transmission_sig:  headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id:        webhookId,
      webhook_event:     JSON.parse(rawBody),
    }),
  });

  if (!res.ok) {
    throw new Error(`[PayPal] verify-webhook-signature HTTP ${res.status}`);
  }

  const data = await res.json() as { verification_status: string };
  return data.verification_status === 'SUCCESS';
}
