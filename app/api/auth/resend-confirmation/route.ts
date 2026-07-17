/**
 * POST /api/auth/resend-confirmation
 *
 * Reenvía el correo de confirmación de Supabase Auth. Rate limit: 1 cada
 * 60s por correo normalizado (trim+lowercase). Respuesta genérica en
 * todos los casos de "no se pudo" para no confirmar/negar si una cuenta
 * existe (protección contra enumeración).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const RESEND_WINDOW_MS = 60 * 1000;

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'Correo requerido' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: attempt } = await supabase
    .from('auth_resend_attempts').select('last_attempt_at').eq('email_normalized', email).maybeSingle();

  if (attempt?.last_attempt_at) {
    const elapsed = Date.now() - new Date(attempt.last_attempt_at).getTime();
    if (elapsed < RESEND_WINDOW_MS) {
      return NextResponse.json({ error: 'Espere antes de reenviar de nuevo.' }, { status: 429 });
    }
  }
  await supabase.from('auth_resend_attempts').upsert(
    { email_normalized: email, last_attempt_at: new Date().toISOString() },
    { onConflict: 'email_normalized' }
  );

  // No revela si el correo existe o no — siempre responde éxito genérico
  // salvo el rate limit ya manejado arriba.
  await supabase.auth.resend({ type: 'signup', email });

  return NextResponse.json({ ok: true });
}
