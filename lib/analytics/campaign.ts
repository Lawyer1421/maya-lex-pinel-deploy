/**
 * Eventos de embudo para la campaña de lanzamiento.
 * No lanza si gtag no existe (SSR / bloqueadores).
 */

export type CampaignEvent =
  | 'cta_probar_gratis'
  | 'signup_view'
  | 'login_view'
  | 'signup_google_click'
  | 'signup_magic_link_submit'
  | 'signup_magic_link_sent'
  | 'whatsapp_click';

export function trackCampaignEvent(
  event: CampaignEvent,
  params?: Record<string, string | number | boolean>
): void {
  if (typeof window === 'undefined') return;
  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== 'function') return;
  gtag('event', event, params ?? {});
}
