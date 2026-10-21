import { describe, expect, it } from 'vitest';
import { FREE_DAILY_LIMIT_COPY, esRespuestaFreeDailyLimit } from '@/lib/free-daily-limit-ui';

describe('tarjeta FREE_DAILY_LIMIT', () => {
  it('tiene título, ambos planes y precios USD 9 / USD 15', () => {
    expect(FREE_DAILY_LIMIT_COPY.titulo).toBe('Ya usaste tu consulta gratis de hoy');
    expect(FREE_DAILY_LIMIT_COPY.reinicio).toBe('Vuelve mañana o suscríbete');
    expect(FREE_DAILY_LIMIT_COPY.planes).toHaveLength(2);
    const academico = FREE_DAILY_LIMIT_COPY.planes.find((p) => p.id === 'academico');
    const premium = FREE_DAILY_LIMIT_COPY.planes.find((p) => p.id === 'premium');
    expect(academico).toMatchObject({
      label: 'Académico',
      precio: 'USD 9/mes',
      paypalTier: 'academico',
    });
    expect(premium).toMatchObject({
      label: 'Premium',
      precio: 'USD 15/mes',
      paypalTier: 'pro',
    });
    expect(FREE_DAILY_LIMIT_COPY.crearCuenta).toBe('Crear cuenta');
    expect(FREE_DAILY_LIMIT_COPY.crearCuentaHref).toBe('/login');
  });

  it('reconoce el cuerpo 429 de FREE_DAILY_LIMIT', () => {
    expect(esRespuestaFreeDailyLimit({
      code: 'FREE_DAILY_LIMIT',
      resetAt: '2026-10-20T06:00:00.000Z',
      plans: ['academico', 'premium'],
    })).toBe(true);
    expect(esRespuestaFreeDailyLimit({ error: 'Límite diario alcanzado' })).toBe(false);
  });
});
