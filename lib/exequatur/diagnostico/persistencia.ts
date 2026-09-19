/**
 * Persistencia Slice 3B — Modelo B (intentos append-only + progreso 1:1).
 *
 * Cliente exclusivo: createSupabaseServerClient() (JWT de sesión + anon).
 * service_role está prohibido para estas tablas.
 * user_id = auth.getUser().id (Modelo B / FK auth.users). Nunca email.
 *
 * `respuestas` retiene [{ item_id, selected_option }]. Al leer se re-evalúa.
 * Los logs de error no imprimen la carga de respuestas.
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

export interface RespuestaPersistida {
  item_id: string;
  selected_option: string;
}

interface FilaIntento {
  id: string;
  user_id: string;
  respuestas: unknown;
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

export function serializarRespuestas(
  respuestas: Record<string, string>,
): RespuestaPersistida[] {
  const carga: RespuestaPersistida[] = [];
  for (const item of BANCO_DIAGNOSTICO_EXEQUATUR.items) {
    const selected = respuestas[item.id];
    if (typeof selected === 'string' && selected.length > 0) {
      carga.push({ item_id: item.id, selected_option: selected });
    }
  }
  return carga;
}

export function respuestasSeguras(crudo: unknown): Record<string, string> {
  const ids = new Set(BANCO_DIAGNOSTICO_EXEQUATUR.items.map((item) => item.id));
  const seguro: Record<string, string> = {};

  if (Array.isArray(crudo)) {
    for (const fila of crudo) {
      if (!fila || typeof fila !== 'object') continue;
      const itemId = (fila as { item_id?: unknown }).item_id;
      const option = (fila as { selected_option?: unknown }).selected_option;
      if (
        typeof itemId === 'string' &&
        ids.has(itemId) &&
        typeof option === 'string' &&
        option.length > 0
      ) {
        seguro[itemId] = option;
      }
    }
    return seguro;
  }

  if (!crudo || typeof crudo !== 'object') return {};
  for (const item of BANCO_DIAGNOSTICO_EXEQUATUR.items) {
    const valor = (crudo as Record<string, unknown>)[item.id];
    if (typeof valor === 'string' && valor.length > 0) {
      seguro[item.id] = valor;
    }
  }
  return seguro;
}

function resultadoDesdeRespuestas(respuestas: Record<string, string>): ResultadoDiagnostico {
  return evaluarDiagnostico(respuestas);
}

function logPersistencia(mensaje: string, errorMessage?: string): void {
  console.error(`[exequatur/persistencia] ${mensaje}`, errorMessage ?? 'sin detalle');
}

export async function guardarIntento(
  sesion: SesionExequatur,
  respuestas: Record<string, string>,
): Promise<IntentoGuardado | null> {
  const resultado = resultadoDesdeRespuestas(respuestas);
  const supabase = await createSupabaseServerClient();
  const carga = serializarRespuestas(respuestas);

  const { data, error } = await supabase
    .from('exequatur_diagnostico_intentos')
    .insert({
      user_id: sesion.userId,
      banco_version: BANCO_DIAGNOSTICO_EXEQUATUR.version,
      curriculum_version: CURRICULUM_EXEQUATUR.version,
      respuestas: carga,
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
    logPersistencia('No se pudo guardar intento -- fail-closed', error?.message);
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
    logPersistencia('Intento guardado pero progreso no actualizado', errorProgreso.message);
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
