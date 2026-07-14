/**
 * lib/analytics/logger.ts
 * Logging asíncrono de consultas a Supabase.
 *
 * Contrato:
 *   - logConsulta() es VOID — nunca se espera (fire-and-forget)
 *   - Si Supabase no está configurado: silencioso (console.warn solo en dev)
 *   - Si Supabase falla: console.warn, nunca lanza excepción al caller
 *   - Anonimiza la pregunta antes de guardar (regex, sin spaCy)
 *
 * Uso en route.ts:
 *   import { logConsulta } from '@/lib/analytics/logger';
 *   logConsulta({ consulta_id, pregunta, modo, ... }); // sin await
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ── Anonimizador TypeScript (regex) ────────────────────────────────────────

function anonimizar(texto: string): string {
  return texto
    .replace(/\b\d{13}\b/g, '[DNI]')
    .replace(/\b\d{4}-\d{4}\b/g, '[TEL]')
    .replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
}

export function hashUsuario(id: string): string {
  return crypto
    .createHash('sha256')
    .update(`${id}_maya_lex_2026`)
    .digest('hex')
    .slice(0, 32);
}

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface ConsultaLog {
  consulta_id:     string;
  pregunta:        string;
  modo:            string;
  ruta_rag:        string;
  modelo:          string;
  proveedor:       string;
  tokens_input:    number;
  tokens_output:   number;
  tiempo_ms:       number;
  web_search_usado: boolean;
  usuario_hash:    string;
  tier_usuario:    string;
  exito:           boolean;
}

// ── Cliente Supabase (lazy, service_role) ─────────────────────────────────

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Log principal ──────────────────────────────────────────────────────────
//
// Devuelve la Promise (no la ejecuta como fire-and-forget interno) para que
// el caller la entregue a Next.js `after()`. En serverless, un fetch lanzado
// sin await ni after() puede ser abortado por el runtime en cuanto el
// response HTTP termina de enviarse — el INSERT nunca llega a completar
// aunque el código no arroje ningún error visible.

export function logConsulta(data: ConsultaLog): Promise<void> {
  const client = getClient();
  if (!client) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Analytics] Supabase no configurado — logging desactivado');
    }
    return Promise.resolve();
  }

  const row = {
    id:                   data.consulta_id,
    pregunta_anonimizada: anonimizar(data.pregunta).slice(0, 2000),
    modo:                 data.modo,
    ruta_rag:             data.ruta_rag,
    modelo:               data.modelo,
    proveedor:            data.proveedor,
    tokens_input:         data.tokens_input,
    tokens_output:        data.tokens_output,
    tiempo_ms:            data.tiempo_ms,
    web_search_usado:     data.web_search_usado,
    usuario_hash:         data.usuario_hash,
    tier_usuario:         data.tier_usuario,
    exito:                data.exito,
  };

  return (async () => {
    try {
      const { error } = await client.from('consultas').insert(row);
      if (error) {
        console.warn('[Analytics] Error al guardar consulta:', error.message);
      }
    } catch (err: unknown) {
      console.warn('[Analytics] Fallo inesperado:', err instanceof Error ? err.message : String(err));
    }
  })();
}
