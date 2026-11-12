/**
 * lib/stripe/firma.ts — verificación de la cabecera Stripe-Signature sin el SDK.
 *
 * Esquema de Stripe: «t=<unix>,v1=<hex>[,v1=<hex>…]». La firma es HMAC-SHA256(secreto, `${t}.${cuerpo_crudo}`). Se acepta si alguna v1
 * coincide (comparación en tiempo constante) y la marca de tiempo está dentro de la tolerancia (protección contra reenvíos).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const TOLERANCIA_FIRMA_SEG = 300;

export function firmaStripe(cuerpo: string, secreto: string, t: number): string {
  return createHmac('sha256', secreto).update(`${t}.${cuerpo}`, 'utf8').digest('hex');
}

export function verificarFirmaStripe(
  cuerpo: string,
  cabecera: string | null | undefined,
  secreto: string,
  ahoraSeg: number = Math.floor(Date.now() / 1000),
  toleranciaSeg: number = TOLERANCIA_FIRMA_SEG,
): boolean {
  if (!cabecera || !secreto) return false;
  let t: number | null = null;
  const firmas: string[] = [];
  for (const parte of cabecera.split(',')) {
    const [k, v] = parte.split('=', 2).map((s) => s?.trim());
    if (k === 't' && v && /^\d+$/.test(v)) t = Number(v);
    else if (k === 'v1' && v && /^[0-9a-f]{64}$/i.test(v)) firmas.push(v.toLowerCase());
  }
  if (t === null || firmas.length === 0) return false;
  if (Math.abs(ahoraSeg - t) > toleranciaSeg) return false;
  const esperada = Buffer.from(firmaStripe(cuerpo, secreto, t), 'hex');
  return firmas.some((f) => {
    const recibida = Buffer.from(f, 'hex');
    return recibida.length === esperada.length && timingSafeEqual(recibida, esperada);
  });
}
