/**
 * lib/email/resend.ts
 * Envío de correos transaccionales de Maya Lex vía Resend.
 *
 * Requiere:
 *   RESEND_API_KEY   — Vercel → Settings → Environment Variables
 *   Dominio mayalexhn.com verificado en Resend (SPF/MX/DMARC/DKIM)
 *
 * Nota: el login (enlace mágico) NO pasa por aquí — usa el SMTP
 * personalizado configurado directamente en Supabase Auth. Este
 * helper es para correos que el backend de Next.js envía por su
 * cuenta (confirmaciones de suscripción, avisos, notificaciones).
 */
import { Resend } from 'resend';

const REMITENTE_DEFAULT = 'Maya Lex IA <notificaciones@mayalexhn.com>';

let _resend: Resend | null = null;
function getClient(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY no configurada en el servidor');
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

export interface EnviarCorreoParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

/**
 * Envía un correo transaccional. Nunca lanza — registra el error y
 * devuelve { ok: false } para que el caller decida si es crítico.
 * No usar para el flujo de login (ver nota arriba).
 */
export async function enviarCorreo(
  params: EnviarCorreoParams
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const resend = getClient();
    const { data, error } = await resend.emails.send({
      from: params.from ?? REMITENTE_DEFAULT,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
    });

    if (error) {
      console.error('[Resend] Error al enviar correo:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data!.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Resend] Fallo inesperado:', msg);
    return { ok: false, error: msg };
  }
}
