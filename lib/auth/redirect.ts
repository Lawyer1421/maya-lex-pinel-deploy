export function buildAuthCallbackUrl(origin: string, nextPath: string): string {
  const normalizedOrigin = origin?.trim();
  const fallbackOrigin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mayalexhn.com';

  const baseOrigin = normalizedOrigin && normalizedOrigin.startsWith('http')
    ? normalizedOrigin
    : fallbackOrigin;

  const isPreviewHost = /(^|\.)vercel\.app$/i.test(new URL(baseOrigin).host) || /(^|\.)vercel\.dev$/i.test(new URL(baseOrigin).host);

  const effectiveOrigin = isPreviewHost ? (process.env.NEXT_PUBLIC_APP_URL ?? 'https://mayalexhn.com') : baseOrigin;
  const next = encodeURIComponent(nextPath.startsWith('/') ? nextPath : '/chat');

  return `${effectiveOrigin}/auth/callback?next=${next}`;
}
