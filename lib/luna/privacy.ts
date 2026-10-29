/**
 * lib/luna/privacy.ts
 * Privacidad de la modalidad «consulta jurídica general» (CLO 29-oct-2026). Capa ESTRICTA sobre el privacy gate del gateway
 * (PII, RTN/DNI, expediente, nombres, texto largo/documental, señal jurídica): añade lo que el gate base deja pasar a propósito para
 * consultas públicas — primera persona sobre hechos particulares, montos y fechas de un caso. Determinista, sin red, sin LLM.
 * Fail-closed y con falsos positivos aceptados: rechazar manda la consulta al proveedor actual SIN llamar a OpenAI.
 * El resultado nombra una razón-código; nunca el texto ni el dato detectado.
 */
import { privacyGate } from '../ai-gateway/shadow/privacy-gate';

export type ResultadoPrivacidadLuna = { estado: 'PASS' } | { estado: 'REJECT'; razon: string };

const sinTildes = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const PRIMERA_PERSONA =
  /\b(?:yo|me|mi|mis|mio|mia|mios|mias|conmigo|nosotros|nosotras|nos|nuestro|nuestra|nuestros|nuestras|soy|somos|estoy|estamos|tengo|tenemos|quiero|queremos|necesito|necesitamos|debo|debemos|puedo|podemos|fui|fuimos|hice|hicimos|vendi|compre|firme|demande|presente|pague|cobre|despidieron|despidio|denuncie|alquile|heredo|heredamos)\b/;
// Pretérito de 1.ª persona del singular con tilde («firmé», «vendí»); el texto se evalúa sin quitar tildes para esto.
const PRETERITO_1SG = /(?<!\p{L})\p{L}{3,}(?:é|í)(?!\p{L})/u;
const PRETERITO_NO_PERSONAL = new Set(['porque', 'aqui', 'alli', 'asi', 'mediante', 'jose', 'cafe', 'bebe']);

const MONTO = /(?:\b(?:l|lps?|usd|us|eur)\.?\s*[$]?\s*\d)|[$€]\s*\d|\d[\d.,]*\s*(?:lempiras?|lps?|dolares?|usd|euros?|mil\b|millones?\b)|\b(?:monto|suma|cantidad|valor|precio|deuda|salario|sueldo)\s+(?:de|por|es|fue|son)?\s*[l$]?\s*\d/;

const MESES = '(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)';
const FECHA_CONCRETA = new RegExp(
  [
    String.raw`\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b`,
    String.raw`\b\d{4}-\d{1,2}-\d{1,2}\b`,
    String.raw`\b\d{1,2}\s+de\s+${MESES}\b`,
    String.raw`\b${MESES}\s+(?:de\s+)?\d{4}\b`,
    String.raw`\b(?:ayer|anteayer|hoy|manana|el\s+(?:mes|ano)\s+pasado|la\s+semana\s+pasada|el\s+pasado\s+\w+)\b`,
    String.raw`\bhace\s+\d+\s+(?:dias?|semanas?|meses|anos?)\b`,
  ].join('|'),
);

const NUMERO_DE_CASO = /\b(?:exp(?:ediente)?|causa|caso|juicio|proceso|recurso|amparo|folio|tomo|asiento|matricula|escritura|poder|sentencia|auto|oficio|denuncia)s?\b\.?\s*(?:n[o°º]\.?|num(?:ero)?\.?|#)?\s*\d/;

export function privacidadConsultaGeneral(texto: unknown): ResultadoPrivacidadLuna {
  const base = privacyGate(texto);
  if (base.estado !== 'PASS') return { estado: 'REJECT', razon: `BASE_${base.etapa}_${base.razon}` };
  const t = (texto as string).trim();
  const plano = sinTildes(t);

  if (PRIMERA_PERSONA.test(plano)) return { estado: 'REJECT', razon: 'PRIMERA_PERSONA' };
  const m = PRETERITO_1SG.exec(t.toLowerCase());
  if (m && !PRETERITO_NO_PERSONAL.has(sinTildes(m[0]))) return { estado: 'REJECT', razon: 'PRETERITO_PRIMERA_PERSONA' };
  if (MONTO.test(plano)) return { estado: 'REJECT', razon: 'MONTO' };
  if (FECHA_CONCRETA.test(plano)) return { estado: 'REJECT', razon: 'FECHA_DE_CASO' };
  if (NUMERO_DE_CASO.test(plano)) return { estado: 'REJECT', razon: 'NUMERO_DE_CASO' };
  return { estado: 'PASS' };
}
