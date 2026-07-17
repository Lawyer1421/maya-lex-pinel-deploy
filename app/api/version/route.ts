/**
 * GET /api/version
 *
 * Metadata de despliegue — SIN secretos. Útil para confirmar qué
 * versión del código está corriendo en producción sin depender de que
 * Vercel esté integrado con GitHub (no lo está en este proyecto: los
 * deploys se hacen con `vercel --prod` directo, así que
 * VERCEL_GIT_COMMIT_SHA normalmente viene vacío — ver informe de la
 * puerta de preproducción).
 *
 * Para que commitSha sea preciso, inyectar APP_COMMIT_SHA en el momento
 * del deploy, p.ej.:
 *   vercel --prod -e APP_COMMIT_SHA=$(git rev-parse HEAD)
 * Sin eso, cae a VERCEL_GIT_COMMIT_SHA (si algún día se integra Git) o
 * a 'unknown'.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Se evalúa una sola vez al arrancar la función serverless — aproxima el
// momento del build/deploy, no un timestamp exacto de compilación.
const BUILD_TIME = process.env.APP_BUILD_TIME ?? new Date().toISOString();

export async function GET() {
  return NextResponse.json({
    commitSha:   process.env.APP_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'unknown',
    buildTime:   BUILD_TIME,
    environment: process.env.APP_ENVIRONMENT ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
  });
}
