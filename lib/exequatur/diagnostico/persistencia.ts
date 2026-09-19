/**
 * Persistencia Slice 3B — intentos / progreso.
 *
 * Escritura y lectura usan el cliente SSR (JWT de sesión + anon key) para
 * que RLS `user_id = auth.uid()` se aplique. Nunca service_role.
 * `user_id` sale SOLO de auth.getUser().id — se ignora cualquier id del form.
 *
 * Al leer se re-evalúa `respuestas` con evaluarDiagnostico: las columnas
 * de puntaje en DB no son autoridad.
 */
import { createSupabaseServerClient } from '@/lib/supabase-ssr';
import { buildUserIdentifierFromEmail } from '@/lib/rate-limit';
import { resolveExequaturAccess } from '@/lib/exequatur/access';
import { CURRICULUM_EXEQUATUR } from '@/lib/exequatur/curriculum/curriculum';
import { evaluarDiagnostico } from './evaluar';
import { BANCO_DIAGNOSTICO_EXEQUATUR } from './banco';
import type { ResultadoDiagnostico } from './types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function esUuid(valor: string): boolean {
  return UUID_RE.test(valor);
}

/** Solo acepta un UUID de intento. Query `objetivos`/`aciertos`/`total` no pasan por aquí. */
export function parsearIntentoQuery(crudo: string | undefined): string | null {
  if (typeof crudo !== 'string') return null;
  const trimmed = crudo.trim();
  return esUuid(trimmed) ? trimmed : null;
}

export interface SesionExequatur {
  userId: string;
  email: string | null;
}

export interface IntentoGuardado {
  id: string;
  resultado: ResultadoDiagnostico;
  createdAt: string;
}

interface FilaIntento {
  id: string;
  user_id: string;
  respuestas: Record<string, string> | null;
  created_at: string;
}

export async function resolverSesionExequatur(): Promise<SesionExequatur | null> {
  const supabaseAuth = await createSupabaseServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user?.id) return null;

  const access = await resolveExequaturAccess(
    buildUserIdentifierFromEmail(user.email ?? ''),
    user.email,
  );
  if (!access.granted) return null;

  return { userId: user.id, email: user.email ?? null };
}

function resultadoDesdeRespuestas(respuestas: Record<string, string>): ResultadoDiagnostico {
  return evaluarDiagnostico(respuestas);
}

function respuestasSeguras(crudo: unknown): Record<string, string> {
  if (!crudo || typeof crudo !== 'object' || Array.isArray(crudo)) return {};
  const seguro: Record<string, string> = {};
  for (const item of BANCO_DIAGNOSTICO_EXEQUATUR.items) {
    const valor = (crudo as Record<string, unknown>)[item.id];
    if (typeof valor === 'string' && valor.length > 0) {
      seguro[item.id] = valor;
    }
  }
  return seguro;
}

export async function guardarIntento(
  sesion: SesionExequatur,
  respuestas: Record<string, string>,
): Promise<IntentoGuardado | null> {
  const resultado = resultadoDesdeRespuestas(respuestas);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('exequatur_diagnostico_intentos')
    .insert({
      user_id: sesion.userId,
      banco_version: BANCO_DIAGNOSTICO_EXEQUATUR.version,
      curriculum_version: CURRICULUM_EXEQUATUR.version,
      respuestas,
      aciertos: resultado.aciertos.length,
      total: resultado.total,
      item_aciertos: resultado.aciertos,
      item_fallos: resultado.fallos,
      item_sin_respuesta: resultado.sinRespuesta,
      objetivos_pendientes: resultado.objetivosPendientes,
    })
    .select('id, created_at')
    .maybeSingle();

  if (error || !data?.id) {
    console.error(
      '[exequatur/persistencia] No se pudo guardar intento -- fail-closed:',
      error?.message ?? 'sin fila',
    );
    return null;
  }

  const { error: errorProgreso } = await supabase
    .from('exequatur_diagnostico_progreso')
    .upsert(
      {
        user_id: sesion.userId,
        ultimo_intento_id: data.id,
        objetivos_pendientes: resultado.objetivosPendientes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

  if (errorProgreso) {
    console.error(
      '[exequatur/persistencia] Intento guardado pero progreso no actualizado:',
      errorProgreso.message,
    );
  }

  return {
    id: data.id,
    resultado,
    createdAt: data.created_at,
  };
}

export async function cargarIntentoPropio(
  sesion: SesionExequatur,
  intentoId: string,
): Promise<IntentoGuardado | null> {
  if (!esUuid(intentoId)) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('exequatur_diagnostico_intentos')
    .select('id, user_id, respuestas, created_at')
    .eq('id', intentoId)
    .eq('user_id', sesion.userId)
    .maybeSingle();

  if (error || !data) return null;
  return filaAIntento(data as FilaIntento, sesion.userId);
}

export async function cargarUltimoIntentoPropio(
  sesion: SesionExequatur,
): Promise<IntentoGuardado | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('exequatur_diagnostico_intentos')
    .select('id, user_id, respuestas, created_at')
    .eq('user_id', sesion.userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return filaAIntento(data as FilaIntento, sesion.userId);
}

function filaAIntento(fila: FilaIntento, userId: string): IntentoGuardado | null {
  if (fila.user_id !== userId) return null;
  return {
    id: fila.id,
    resultado: resultadoDesdeRespuestas(respuestasSeguras(fila.respuestas)),
    createdAt: fila.created_at,
  };
}
