/**
 * GET /api/usage
 * Devuelve el estado actual de uso del rate limit para el usuario.
 * El frontend lo llama al cargar la página para mostrar el contador.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserIdentifierVerificado, getRateLimitStatus } from '@/lib/rate-limit';
import { resolveCurrentAccess } from '@/lib/paypal/access';

export async function GET(req: NextRequest) {
  const userIdentifier = await getUserIdentifierVerificado(req);

  try {
    const [status, access] = await Promise.all([
      getRateLimitStatus(userIdentifier),
      resolveCurrentAccess(userIdentifier),
    ]);
    return NextResponse.json({
      ...status,
      canAttach: access.canAnalyzeDocuments,
    });
  } catch (error) {
    console.error('[Usage API] Error:', error);
    // En caso de error, devuelve valores por defecto (no bloquear el UI)
    return NextResponse.json({
      used: 0,
      limit: 3,
      tier: 'free',
      resetAt: '',
      canAttach: false,
    });
  }
}
