/**
 * GET /api/diagnostico-preview
 * Verificación DIRECTA y redactada del entorno de un deployment Preview,
 * leída desde el runtime real de Vercel (no inferida desde fuera).
 *
 * Seguridad:
 * - Responde SOLO cuando VERCEL_ENV === 'preview' (en producción y desarrollo: 404).
 * - Nunca devuelve valores de credenciales — únicamente booleanos de presencia
 *   y el project ref de Supabase en forma redactada (el ref ya es público por
 *   diseño: NEXT_PUBLIC_SUPABASE_URL viaja en el bundle del cliente).
 * - Los refs esperados están fijados en el código para que la comparación
 *   ocurra en el servidor y la respuesta sea un veredicto, no un dato.
 */

const REF_STAGING_ESPERADO = 'aicakncgtuiiuomflkqj';
const REF_PRODUCCION_CONOCIDA = 'thgrhueckkjdutjvcufp';

function redactarRef(ref: string | null): string | null {
  if (!ref) return null;
  return `${ref.slice(0, 5)}…${ref.slice(-4)}`;
}

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview') {
    return new Response('Not found', { status: 404 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const ref = supabaseUrl.match(/^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/)?.[1] ?? null;

  return Response.json({
    entornoVercel: process.env.VERCEL_ENV,
    ramaGit: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    commitGit: (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7) || null,
    supabase: {
      refRedactado: redactarRef(ref),
      esStagingEsperado: ref === REF_STAGING_ESPERADO,
      esProduccionConocida: ref === REF_PRODUCCION_CONOCIDA,
      serviceRolePresente: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      anonKeyPresente: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    },
    paypal: {
      modo: process.env.PAYPAL_MODE ?? null,
      clientIdPresente: Boolean(process.env.PAYPAL_CLIENT_ID),
      clientSecretPresente: Boolean(process.env.PAYPAL_CLIENT_SECRET),
    },
  });
}
