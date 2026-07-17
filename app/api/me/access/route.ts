/**
 * GET /api/me/access
 *
 * Fuente única de "estado de acceso" del usuario autenticado — la
 * misma que debe usar cualquier superficie de la interfaz (encabezado,
 * Mi Cuenta, área de consultas, facturación). Nunca decide desde el
 * frontend: siempre re-consulta entitlements/legado en el servidor.
 *
 * accessGranted/plan vienen de resolveAccessWithEntitlements()
 * (entitlement-first, con fallback al gate legado) — no de
 * localStorage, no de parámetros de la URL.
 */
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-ssr';
import { createServerSupabaseClient } from '@/lib/supabase';
import { resolveAccessWithEntitlements } from '@/lib/entitlements';
import { buildUserIdentifierFromEmail } from '@/lib/rate-limit';

export async function GET() {
  const supabaseAuth = await createSupabaseServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: 'Sesión requerida' }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  const userIdentifier = buildUserIdentifierFromEmail(user.email);

  const resolved = await resolveAccessWithEntitlements({
    supabase, userId: user.id, userIdentifier,
  });

  return NextResponse.json(resolved);
}
