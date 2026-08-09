import { describe, it, expect } from 'vitest';
import { esEstadoReintentable } from '@/components/EstadoPagoBanner';

/**
 * INCIDENTE DE PRODUCCIÓN — EstadoPagoBanner verificaba el pago una sola
 * vez al montar. Si el webhook (o la aprobación humana en PayPal) tardaba
 * más que esa única llamada, el usuario veía "no confirmado" de forma
 * estática y volvía a /pricing a reintentar desde cero — confirmado en
 * logs reales (7 intentos de create-subscription en ~10 minutos). El fix
 * agrega reintentos automáticos acotados mientras el estado es
 * APPROVAL_PENDING (transitorio por definición), respetando el rate limit
 * del propio servidor (10s) con margen.
 *
 * Esta prueba cubre la decisión real que evita reintentar sobre un error
 * que nunca se resolverá solo — no cubre el timer/useEffect en sí (este
 * proyecto no tiene infraestructura de pruebas de componentes React, ver
 * tests/paypal-checkout-v2.test.ts para el mismo criterio aplicado antes).
 */
describe('esEstadoReintentable', () => {
  it('APPROVAL_PENDING es transitorio — sí reintenta', () => {
    expect(esEstadoReintentable('APPROVAL_PENDING')).toBe(true);
  });

  it('ACTIVE, null, o cualquier otro estado es definitivo — no reintenta', () => {
    expect(esEstadoReintentable('ACTIVE')).toBe(false);
    expect(esEstadoReintentable(null)).toBe(false);
    expect(esEstadoReintentable('SUSPENDED')).toBe(false);
    expect(esEstadoReintentable('DESCONOCIDO')).toBe(false);
  });
});
