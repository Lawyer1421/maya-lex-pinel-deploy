import { describe, expect, it } from 'vitest';
import { buildLoginHref, resolveAuthIntent, SIGNUP_HREF } from '@/lib/marketing/cta';
import { RUTAS_MARKETING_PUBLICAS } from '@/lib/seo/rutas-publicas';
import { PREGUNTAS_FAQ_PORTADA, faqPageJsonLd } from '@/lib/marketing/faq';

describe('embudo de alta — Nivel 1', () => {
  it('el CTA de prueba abre signup, no /chat directo', () => {
    expect(SIGNUP_HREF).toBe('/login?next=/chat&intent=signup');
    expect(SIGNUP_HREF).not.toBe('/chat');
  });

  it('sin intent (o basura) se trata como alta — el visitante de anuncio no ve "ya tengo cuenta"', () => {
    expect(resolveAuthIntent(null)).toBe('signup');
    expect(resolveAuthIntent('signup')).toBe('signup');
    expect(resolveAuthIntent('login')).toBe('login');
    expect(resolveAuthIntent('admin')).toBe('signup');
  });

  it('buildLoginHref no acepta open redirect', () => {
    expect(buildLoginHref('https://evil.com', 'signup')).toBe(
      '/login?next=%2Fchat&intent=signup'
    );
    expect(buildLoginHref('/pricing?plan=pro', 'login')).toContain('intent=login');
  });
});

describe('sitemap de campaña', () => {
  it('anuncia 17 páginas de marketing y excluye /login', () => {
    expect(RUTAS_MARKETING_PUBLICAS).toHaveLength(17);
    expect(RUTAS_MARKETING_PUBLICAS).toContain('/privacidad');
    expect(RUTAS_MARKETING_PUBLICAS).toContain('/terminos');
    expect(RUTAS_MARKETING_PUBLICAS).not.toContain('/login');
  });

  it('el sitemap generado no indexa /login', async () => {
    const sitemap = (await import('@/app/sitemap')).default;
    const urls = (await sitemap()).map((r) => r.url);
    expect(urls.some((u) => u.endsWith('/login'))).toBe(false);
    expect(urls.some((u) => u.endsWith('/privacidad'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/terminos'))).toBe(true);
  });
});

describe('FAQ JSON-LD', () => {
  it('incluye la cláusula de no asesoría jurídica', () => {
    const json = faqPageJsonLd('https://mayalexhn.com');
    expect(json['@type']).toBe('FAQPage');
    expect(PREGUNTAS_FAQ_PORTADA.some((p) => /no sustituye|no constituye asesoría|ni constituye asesoría/i.test(p.respuesta))).toBe(true);
  });
});

describe('metadata de marca — no ceder crédito a Claude en el <title>', () => {
  it('layout no dice PINEL HN ni Powered by Claude AI', async () => {
    const { metadata } = await import('@/app/layout');
    const title = typeof metadata.title === 'object' && metadata.title && 'default' in metadata.title
      ? metadata.title.default
      : metadata.title;
    const description = String(metadata.description ?? '');
    expect(String(title)).not.toMatch(/PINEL HN/i);
    expect(description).not.toMatch(/Powered by Claude/i);
    expect(metadata.openGraph?.images).toBeDefined();
  });
});
