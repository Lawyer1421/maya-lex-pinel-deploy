import { describe, it, expect } from 'vitest';
import { PLANES_V2, autoStartTierDesde } from '@/components/v2/planes-data';
import { construirUrlLogin } from '@/app/components/PayPalSubscribeButton';

/**
 * OPERACIÓN FINAL — habilitar checkout PayPal V2 en /pricing.
 * Este proyecto no tiene infraestructura de pruebas de componentes React
 * (sin jsdom/@testing-library — confirmado: ningún test existente en este
 * repo renderiza un componente). Introducir esa infraestructura para un
 * solo hotfix sería abrir un frente nuevo. Estas pruebas cubren la LÓGICA
 * real que decide el comportamiento (qué plan es checkout vs enlace, qué
 * tier se usa, cómo se preserva el plan a través del login) — la parte
 * visual/interactiva (doble clic, mensaje de error en pantalla, carga) se
 * verifica en vivo contra el Preview desplegado.
 */

describe('PLANES_V2 — qué planes invocan PayPal y con qué tier (Pruebas 1, 2, 3, 7)', () => {
  it('1. Explorar es un enlace — nunca checkout, nunca invoca PayPal', () => {
    const explorar = PLANES_V2.find((p) => p.id === 'explorar')!;
    expect(explorar.ctaEstado).toBe('enlace');
    expect(explorar.paypalTier).toBeUndefined();
    expect(explorar.ctaHref).toBe('/chat');
  });

  it('2. Académico es checkout con el tier "academico" — nunca "pro"', () => {
    const academico = PLANES_V2.find((p) => p.id === 'academico')!;
    expect(academico.ctaEstado).toBe('checkout');
    expect(academico.paypalTier).toBe('academico');
  });

  it('3. Profesional es checkout con el tier "pro" — nunca "academico"', () => {
    const profesional = PLANES_V2.find((p) => p.id === 'profesional')!;
    expect(profesional.ctaEstado).toBe('checkout');
    expect(profesional.paypalTier).toBe('pro');
  });

  it('7. Bufete y Universidad son enlaces mailto — nunca checkout, nunca invocan PayPal', () => {
    const bufete = PLANES_V2.find((p) => p.id === 'bufete')!;
    const universidad = PLANES_V2.find((p) => p.id === 'universidad')!;
    for (const plan of [bufete, universidad]) {
      expect(plan.ctaEstado).toBe('enlace');
      expect(plan.paypalTier).toBeUndefined();
      expect(plan.ctaHref).toMatch(/^mailto:/);
    }
  });

  it('nombres y precios no fueron alterados por esta conexión de checkout', () => {
    expect(PLANES_V2.map((p) => [p.nombre, p.precio, p.periodo])).toEqual([
      ['Explorar', 'Gratis', ''],
      ['Académico', 'USD 9', '/mes'],
      ['Profesional', 'USD 15', '/mes'],
      ['Bufete', 'Personalizado', ''],
      ['Universidad', 'Personalizado', ''],
    ]);
  });
});

describe('autoStartTierDesde — validación del ?plan= al regresar del login (Prueba 5)', () => {
  it('acepta únicamente los dos tiers reales de PayPal', () => {
    expect(autoStartTierDesde('academico')).toBe('academico');
    expect(autoStartTierDesde('pro')).toBe('pro');
  });

  it('rechaza cualquier otro valor — nunca confía en la URL cruda', () => {
    expect(autoStartTierDesde('profesional')).toBeNull();
    expect(autoStartTierDesde('admin')).toBeNull();
    expect(autoStartTierDesde('')).toBeNull();
    expect(autoStartTierDesde(undefined)).toBeNull();
    expect(autoStartTierDesde('<script>alert(1)</script>')).toBeNull();
  });
});

describe('construirUrlLogin — el plan sobrevive al login (Prueba 4 y 5)', () => {
  it('codifica el plan dentro de next= para que /login lo devuelva intacto a /pricing', () => {
    const url = construirUrlLogin('academico');
    expect(url).toBe('/login?next=%2Fpricing%3Fplan%3Dacademico');

    // Round-trip: exactamente lo que /login lee vía nextDestino() y lo que
    // sanitizeNextPath()/auth/callback devuelven sin modificar (misma
    // fuente de verdad, no duplicada aquí — solo se confirma el contrato).
    const params = new URLSearchParams(url.split('?')[1]);
    const next = params.get('next')!;
    expect(next).toBe('/pricing?plan=academico');
    expect(next.startsWith('/')).toBe(true);   // pasa sanitizeNextPath: relativa
    expect(next.startsWith('//')).toBe(false); // no protocolo-relativa
    expect(next.includes('://')).toBe(false);  // sin esquema embebido
  });

  it('funciona igual para el tier "pro"', () => {
    const url = construirUrlLogin('pro');
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('next')).toBe('/pricing?plan=pro');
  });
});
