/**
 * GET /api/luna/elegible
 * ¿Debe la interfaz mostrar el interruptor «Consulta jurídica general» a este usuario? Solo si Luna está encendida por entorno (LUNA_ENABLED y
 * demás compuertas de entorno) Y la bandera flag_luna_responses incluye su correo VERIFICADO en el servidor. Responde únicamente un booleano:
 * nunca valores de entorno, listas de correos ni motivos. Ante cualquier error, false (el interruptor no se muestra). Sin caché.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedEmail } from '@/lib/rate-limit';
import { isFlagEnabledForUser } from '@/lib/flags';
import { motorLuna } from '@/lib/luna/engine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cabeceras = { 'Cache-Control': 'no-store' };
  try {
    if (!motorLuna().habilitada()) return NextResponse.json({ elegible: false }, { headers: cabeceras });
    const email = await getVerifiedEmail(req);
    if (!email) return NextResponse.json({ elegible: false }, { headers: cabeceras });
    return NextResponse.json({ elegible: await isFlagEnabledForUser('flag_luna_responses', email) }, { headers: cabeceras });
  } catch {
    return NextResponse.json({ elegible: false }, { headers: cabeceras });
  }
}
