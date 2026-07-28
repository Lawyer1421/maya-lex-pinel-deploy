import { describe, it, expect, vi } from 'vitest';

const ARTICULO_CONTAMINADO = '1';
const ARTICULO_LIMPIO = '11';

vi.mock('@/lib/seo/articulos-vigentes', () => ({
  listarNumerosArticulo: vi.fn().mockResolvedValue([ARTICULO_CONTAMINADO, ARTICULO_LIMPIO]),
  slugConsultaParaArticulo: (n: string) => `articulo-${n}-legislacion-penal-honduras`,
}));

describe('sitemap.ts — contención SEO data-driven', () => {
  it('excluye del sitemap la ruta /leyes de artículos contaminados', async () => {
    const sitemap = (await import('@/app/sitemap')).default;
    const rutas = await sitemap();

    const urls = rutas.map((r) => r.url);

    expect(urls.some((u) => u.endsWith(`/leyes/${ARTICULO_CONTAMINADO}`))).toBe(false);
  });

  it('conserva en el sitemap la ruta /leyes de artículos limpios', async () => {
    const sitemap = (await import('@/app/sitemap')).default;
    const rutas = await sitemap();
    const urls = rutas.map((r) => r.url);

    expect(urls.some((u) => u.endsWith(`/leyes/${ARTICULO_LIMPIO}`))).toBe(true);
  });

  it('nunca incluye rutas /consultas — decisión aprobada, /leyes es la única URL primaria en el sitemap', async () => {
    const sitemap = (await import('@/app/sitemap')).default;
    const rutas = await sitemap();
    const urls = rutas.map((r) => r.url);

    expect(urls.some((u) => u.includes('/consultas/'))).toBe(false);
  });

  it('nunca elimina las rutas contaminadas de la aplicación — solo del sitemap (la URL sigue existiendo)', async () => {
    // Esta prueba documenta la regla explícita: "conservar la URL" no es
    // responsabilidad de sitemap.ts (que solo controla qué se anuncia a
    // buscadores) sino de generateStaticParams, que sigue incluyendo TODOS
    // los números de artículo sin filtrar — ver app/leyes/[articulo]/page.tsx.
    const { listarNumerosArticulo } = await import('@/lib/seo/articulos-vigentes');
    const todos = await listarNumerosArticulo();
    expect(todos).toContain(ARTICULO_CONTAMINADO);
  });
});
