/**
 * Resuelve el SHA del build. Cadena vacía no cuenta (prod devolvía "").
 */
export function resolveCommitSha(
  env: NodeJS.ProcessEnv = process.env
): string {
  const candidatos = [
    env.APP_COMMIT_SHA,
    env.VERCEL_GIT_COMMIT_SHA,
    env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  ];
  for (const valor of candidatos) {
    const limpio = valor?.trim();
    if (limpio) return limpio;
  }
  return 'unknown';
}
