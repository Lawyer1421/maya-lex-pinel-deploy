/**
 * lib/legal-os/shadow/config.ts
 * Interruptor del shadow de Legal OS. APAGADO por defecto. Este shadow es SIMULADO: no llama a ningún modelo ni a la red, no escribe
 * en bases de datos y su único efecto observable es una línea de log con la traza redactada. Aun así, solo corre si se enciende de
 * forma explícita, y en producción únicamente con una segunda bandera (cambiar variables de Vercel es decisión de Fredy).
 */
export interface EntornoShadow {
  LEGAL_OS_SHADOW?: string;
  LEGAL_OS_SHADOW_ALLOW_PROD?: string;
  VERCEL_ENV?: string;
}

export function legalOsShadowHabilitado(env: EntornoShadow = process.env as EntornoShadow): boolean {
  if (env.LEGAL_OS_SHADOW !== '1') return false;
  if (env.VERCEL_ENV === 'production' && env.LEGAL_OS_SHADOW_ALLOW_PROD !== '1') return false;
  return true;
}
