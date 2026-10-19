export const FREE_DAILY_LIMIT_COPY = {
  titulo: 'Ya usaste tu consulta gratis de hoy',
  reinicio: 'Vuelve mañana o suscríbete',
  crearCuenta: 'Crear cuenta',
  crearCuentaHref: '/login',
  planes: [
    {
      id: 'academico' as const,
      label: 'Académico',
      precio: 'USD 9/mes',
      paypalTier: 'academico' as const,
    },
    {
      id: 'premium' as const,
      label: 'Premium',
      precio: 'USD 15/mes',
      paypalTier: 'pro' as const,
    },
  ],
};

export function esRespuestaFreeDailyLimit(body: unknown): body is {
  code: 'FREE_DAILY_LIMIT';
  resetAt?: string;
  plans?: string[];
} {
  return Boolean(
    body &&
    typeof body === 'object' &&
    'code' in body &&
    (body as { code?: unknown }).code === 'FREE_DAILY_LIMIT',
  );
}
