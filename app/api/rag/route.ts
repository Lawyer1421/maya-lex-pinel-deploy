/**
 * /api/rag — DESHABILITADO SIEMPRE (orden CLO 28-oct-2026, P25). Sin interruptor por variable de entorno.
 *
 * Motivo: sin autenticación ni límite de uso, el middleware lo deja pasar, usa service_role (salta RLS), el llamador elige cualquier colección,
 * devuelve el texto completo y consume el token de HuggingFace. Ver docs/security/API_RAG_DISABLED.md.
 *
 * Este archivo NO importa nada: ni el cliente de Supabase con service_role, ni la búsqueda (lib/rag/search), ni el embedding. La lógica original
 * quedó en lib/rag/api-rag-legacy.ts, sin enrutar. Todos los métodos HTTP responden 410 Gone en JSON.
 */

export const dynamic = 'force-dynamic';

const CUERPO = { error: 'endpoint deshabilitado por seguridad', code: 'API_RAG_DESHABILITADO' } as const;

function gone(_req?: Request): Response {
  return new Response(JSON.stringify(CUERPO), {
    status: 410,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export const GET = gone;
export const POST = gone;
export const PUT = gone;
export const PATCH = gone;
export const DELETE = gone;
export const HEAD = gone;
export const OPTIONS = gone;
