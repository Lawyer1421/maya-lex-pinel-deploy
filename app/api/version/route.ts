/**
 * GET /api/version
 *
 * Metadata de despliegue — SIN secretos.
 * VERCEL_GIT_COMMIT_SHA a veces llega como "" (CLI / Git no cableado).
 * `??` no cubre eso; resolveCommitSha trata vacío como ausente.
 */
import { NextResponse } from 'next/server';
import { resolveCommitSha } from '@/lib/observability/version';

export const dynamic = 'force-dynamic';

const BUILD_TIME = process.env.APP_BUILD_TIME ?? new Date().toISOString();

export async function GET() {
  return NextResponse.json({
    commitSha: resolveCommitSha(),
    buildTime: BUILD_TIME,
    environment: process.env.APP_ENVIRONMENT ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
  });
}
