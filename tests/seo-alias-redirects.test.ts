import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';
import { ALIAS_REDIRECTS, RUTAS_MARKETING_PUBLICAS } from '@/lib/seo/rutas-publicas';

describe('aliases SEO históricos → slugs V2 reales', () => {
  it('redirige /precios y /planes a /pricing', () => {
    const destinos = ALIAS_REDIRECTS.filter((r) => r.destination === '/pricing').map((r) => r.source);
    expect(destinos).toEqual(expect.arrayContaining(['/precios', '/planes']));
  });

  it('redirige /cobertura a /cobertura-juridica', () => {
    const cobertura = ALIAS_REDIRECTS.find((r) => r.source === '/cobertura');
    expect(cobertura).toEqual({
      source: '/cobertura',
      destination: '/cobertura-juridica',
      permanent: true,
    });
  });

  it('todas las redirecciones son permanentes (308/301)', () => {
    expect(ALIAS_REDIRECTS.length).toBeGreaterThanOrEqual(3);
    for (const r of ALIAS_REDIRECTS) {
      expect(r.permanent).toBe(true);
      expect(r.source.startsWith('/')).toBe(true);
      expect(r.destination.startsWith('/')).toBe(true);
    }
  });

  it('los destinos de alias están en las rutas públicas del sitemap', () => {
    for (const r of ALIAS_REDIRECTS) {
      expect(RUTAS_MARKETING_PUBLICAS).toContain(r.destination);
    }
  });

  it('next.config.ts aplica ALIAS_REDIRECTS', () => {
    const src = readFileSync(resolve(process.cwd(), 'next.config.ts'), 'utf8');
    expect(src).toContain("from './lib/seo/rutas-publicas'");
    expect(src).toContain('...ALIAS_REDIRECTS');
  });
});
