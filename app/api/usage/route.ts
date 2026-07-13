/**
 * GET /api/usage
 * Devuelve el estado actual de uso del rate limit para el usuario.
 * El frontend lo llama al cargar la página para mostrar el contador.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserIdentifierVerificado, getRateLimitStatus } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const userIdentifier = await getUserIdentifierVerificado(req);

  try {
    const status = await getRateLimitStatus(userIdentifier);
    return NextResponse.json(status);
  } catch (error) {
    console.error('[Usage API] Error:', error);
    // En caso de error, devuelve valores por defecto (no bloquear el UI)
    return NextResponse.json({
      used: 0,
      limit: 3,
      tier: 'free',
      resetAt: '',
    });
  }
}
