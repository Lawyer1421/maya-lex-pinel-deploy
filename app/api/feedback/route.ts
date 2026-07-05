/**
 * POST /api/feedback
 * Guarda el rating del usuario (👍/👎) de una respuesta de Maya Lex.
 *
 * Body: { consulta_id: string, util: boolean, comentario?: string }
 * Response: { ok: true } | { error: string }
 *
 * Seguridad:
 *   - No requiere auth (feedback anónimo intencional)
 *   - consulta_id se valida como UUID v4 antes de insertar
 *   - Usa service_role solo en servidor (nunca expuesta al cliente)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  let body: { consulta_id?: string; util?: boolean; comentario?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { consulta_id, util, comentario } = body;

  if (!consulta_id || !UUID_RE.test(consulta_id)) {
    return NextResponse.json({ error: 'consulta_id inválido' }, { status: 400 });
  }
  if (typeof util !== 'boolean') {
    return NextResponse.json({ error: 'util debe ser boolean' }, { status: 400 });
  }

  const client = getClient();
  if (!client) {
    // Supabase no configurado — acepta pero no persiste (no romper UX)
    return NextResponse.json({ ok: true });
  }

  const { error } = await client.from('feedback').insert({
    consulta_id,
    util,
    comentario: comentario?.trim().slice(0, 500) ?? null,
  });

  if (error) {
    console.warn('[Feedback] Error al guardar:', error.message);
    return NextResponse.json({ error: 'No se pudo guardar el feedback' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
