import { describe, it, expect, vi } from 'vitest';

// La primera importación de un page.tsx de Next.js implica transformar el
// árbol completo de dependencias (componentes, layout) — más lento que un
// test de unidad puro. 15s de margen evita falsos negativos por timeout.
vi.setConfig({ testTimeout: 15000 });

const ARTICULO_CONTAMINADO = '1';
const ARTICULO_LIMPIO = '11';

function datoFalso(numero: string) {
  return { numArticulo: numero, contenido: 'Texto de prueba sin relación con el corpus real.', fuente: null };
}

vi.mock('@/lib/seo/articulos-vigentes', () => ({
  listarNumerosArticulo: vi.fn().mockResolvedValue([ARTICULO_CONTAMINADO, ARTICULO_LIMPIO]),
  obtenerArticuloPorNumero: vi.fn(async (numero: string) => datoFalso(numero)),
  slugConsultaParaArticulo: (n: string) => `articulo-${n}-legislacion-penal-honduras`,
  numeroArticuloDesdeSlug: (slug: string) => {
    const m = slug.match(/^articulo-(.+)-legislacion-penal-honduras$/);
    return m ? m[1] : null;
  },
}));

describe('/leyes/[articulo] — robots noindex data-driven', () => {
  it('artículo contaminado → robots.index=false', async () => {
    const { generateMetadata } = await import('@/app/leyes/[articulo]/page');
    const meta = await generateMetadata({ params: Promise.resolve({ articulo: ARTICULO_CONTAMINADO }) });
    expect(meta.robots).toMatchObject({ index: false, follow: true });
  });

  it('artículo limpio → robots.index=true', async () => {
    const { generateMetadata } = await import('@/app/leyes/[articulo]/page');
    const meta = await generateMetadata({ params: Promise.resolve({ articulo: ARTICULO_LIMPIO }) });
    expect(meta.robots).toMatchObject({ index: true, follow: true });
  });

  it('canonical de /leyes apunta siempre a sí misma (es la URL primaria)', async () => {
    const { generateMetadata } = await import('@/app/leyes/[articulo]/page');
    const meta = await generateMetadata({ params: Promise.resolve({ articulo: ARTICULO_LIMPIO }) });
    expect(meta.alternates?.canonical).toContain(`/leyes/${ARTICULO_LIMPIO}`);
  });
});

describe('/consultas/[slug] — robots noindex + canonical hacia /leyes (data-driven)', () => {
  const slugContaminado = `articulo-${ARTICULO_CONTAMINADO}-legislacion-penal-honduras`;
  const slugLimpio = `articulo-${ARTICULO_LIMPIO}-legislacion-penal-honduras`;

  it('consulta contaminada → robots.index=false', async () => {
    const { generateMetadata } = await import('@/app/consultas/[slug]/page');
    const meta = await generateMetadata({ params: Promise.resolve({ slug: slugContaminado }) });
    expect(meta.robots).toMatchObject({ index: false, follow: true });
  });

  it('consulta limpia → robots.index=true', async () => {
    const { generateMetadata } = await import('@/app/consultas/[slug]/page');
    const meta = await generateMetadata({ params: Promise.resolve({ slug: slugLimpio }) });
    expect(meta.robots).toMatchObject({ index: true, follow: true });
  });

  it('canonical de /consultas apunta siempre a /leyes/{numero} (URL primaria), nunca a sí misma', async () => {
    const { generateMetadata } = await import('@/app/consultas/[slug]/page');
    const meta = await generateMetadata({ params: Promise.resolve({ slug: slugLimpio }) });
    expect(meta.alternates?.canonical).toContain(`/leyes/${ARTICULO_LIMPIO}`);
    expect(meta.alternates?.canonical).not.toContain('/consultas/');
  });

  it('esto se cumple incluso para la variante contaminada (canonical no oculta contaminación, solo declara duplicado)', async () => {
    const { generateMetadata } = await import('@/app/consultas/[slug]/page');
    const meta = await generateMetadata({ params: Promise.resolve({ slug: slugContaminado }) });
    expect(meta.alternates?.canonical).toContain(`/leyes/${ARTICULO_CONTAMINADO}`);
  });
});
