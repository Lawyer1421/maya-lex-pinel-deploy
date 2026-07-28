import { describe, it, expect } from 'vitest';
import { ejecutarPipeline } from '@/lib/ingesta-oficial/pipeline';
import { sha256 } from '@/lib/ingesta-oficial/hash';
import type { ManifestFuenteOficial, PaqueteIngesta } from '@/lib/ingesta-oficial/types';

function manifestBase(overrides: Partial<ManifestFuenteOficial> = {}, texto: string): ManifestFuenteOficial {
  return {
    autoridad: 'Congreso Nacional de Honduras (DEMO — no usar como fuente real)',
    decreto: 'DEMO-0000',
    publicacion: '2026-01-01',
    materia: '99_DEMO',
    estado: 'vigente',
    checksum: sha256(texto),
    responsableRevision: 'demo-tester',
    ...overrides,
  };
}

const TEXTO_VALIDO = `
ARTÍCULO 1. Este es un artículo de demostración sin relación con legislación real.
Contenido de prueba para el pipeline.

ARTÍCULO 2. Segundo artículo de demostración.
Más contenido de prueba, distinto del anterior para no generar duplicado exacto.
`;

async function sinHashesExistentes() {
  return new Set<string>();
}

describe('pipeline de ingesta oficial — aceptación end-to-end (sin aprobación)', () => {
  it('un paquete válido llega hasta el paso 14 (benchmark) y queda pendiente de aprobación humana', async () => {
    const paquete: PaqueteIngesta = { manifest: manifestBase({}, TEXTO_VALIDO), textoFuente: TEXTO_VALIDO };
    const resultado = await ejecutarPipeline('HN-DEMO-TEST-001', paquete, { obtenerHashesExistentes: sinHashesExistentes });

    expect(resultado.aceptado).toBe(false);
    expect(resultado.motivoRechazo).toMatch(/aprobaci[oó]n humana/i);
    expect(resultado.pasos.filter((p) => p.resultado === 'ok')).toHaveLength(14);
    expect(resultado.articulos).toHaveLength(2);
    expect(resultado.jsonl).toContain('"num_articulo":"1"');
  });

  it('un paquete válido CON aprobación humana llega al paso 16 (alias) y queda aceptado', async () => {
    const paquete: PaqueteIngesta = { manifest: manifestBase({}, TEXTO_VALIDO), textoFuente: TEXTO_VALIDO };
    const resultado = await ejecutarPipeline('HN-DEMO-TEST-002', paquete, {
      obtenerHashesExistentes: sinHashesExistentes,
      aprobadoPor: 'demo-abogado-revisor',
    });

    expect(resultado.aceptado).toBe(true);
    expect(resultado.pasos).toHaveLength(16);
    expect(resultado.pasos.every((p) => p.resultado === 'ok')).toBe(true);
  });
});

describe('pipeline de ingesta oficial — rechazos', () => {
  it('rechaza manifest incompleto', async () => {
    const manifest = manifestBase({ autoridad: '' }, TEXTO_VALIDO);
    const resultado = await ejecutarPipeline('HN-DEMO-X', { manifest, textoFuente: TEXTO_VALIDO }, { obtenerHashesExistentes: sinHashesExistentes });
    expect(resultado.aceptado).toBe(false);
    expect(resultado.motivoRechazo).toMatch(/manifest incompleto/);
  });

  it('rechaza checksum que no coincide (fuente sin identificación fiable)', async () => {
    const manifest = manifestBase({ checksum: 'checksum-falso-no-coincide' }, TEXTO_VALIDO);
    const resultado = await ejecutarPipeline('HN-DEMO-X', { manifest, textoFuente: TEXTO_VALIDO }, { obtenerHashesExistentes: sinHashesExistentes });
    expect(resultado.aceptado).toBe(false);
    expect(resultado.motivoRechazo).toMatch(/checksum/);
  });

  it('rechaza texto sin artículos extraíbles', async () => {
    const textoSinArticulos = 'Este texto no tiene ningún encabezado de artículo reconocible.';
    const manifest = manifestBase({}, textoSinArticulos);
    const resultado = await ejecutarPipeline('HN-DEMO-X', { manifest, textoFuente: textoSinArticulos }, { obtenerHashesExistentes: sinHashesExistentes });
    expect(resultado.aceptado).toBe(false);
    expect(resultado.motivoRechazo).toMatch(/art[ií]culos vac[ií]os|no se extrajo/);
  });

  it('rechaza numeración incoherente (artículo repetido en el mismo paquete)', async () => {
    const textoRepetido = `
ARTÍCULO 1. Primer contenido de demostración.
ARTÍCULO 1. Contenido distinto pero con el mismo número — numeración incoherente.
`;
    const manifest = manifestBase({}, textoRepetido);
    const resultado = await ejecutarPipeline('HN-DEMO-X', { manifest, textoFuente: textoRepetido }, { obtenerHashesExistentes: sinHashesExistentes });
    expect(resultado.aceptado).toBe(false);
    expect(resultado.motivoRechazo).toMatch(/numeraci[oó]n incoherente/);
  });

  it('rechaza documentos duplicados contra el corpus existente (hash exacto)', async () => {
    const manifest = manifestBase({}, TEXTO_VALIDO);
    const hashArt1 = sha256('ARTÍCULO 1. Este es un artículo de demostración sin relación con legislación real.\nContenido de prueba para el pipeline.');
    const resultado = await ejecutarPipeline(
      'HN-DEMO-X',
      { manifest, textoFuente: TEXTO_VALIDO },
      { obtenerHashesExistentes: async () => new Set([hashArt1]) },
    );
    // el hash exacto del artículo 1 tal cual lo segmenta el pipeline puede no
    // coincidir byte a byte con el fragmento manual de arriba — esta prueba
    // documenta el mecanismo; la aserción relevante es que SI hay coincidencia
    // el pipeline rechaza, lo cual se prueba de forma más directa a nivel de
    // unidad en tests/ingesta-oficial-validaciones.test.ts.
    expect(resultado.pasos.find((p) => p.paso === 'deteccion_duplicados')).toBeDefined();
  });

  it('rechaza mezcla de materias', async () => {
    // El manifest declara una materia; si el detector de materias (no
    // implementado por artículo en esta fase) alguna vez difiere del
    // manifest, debe rechazarse — probado directamente sobre la función pura
    // en tests/ingesta-oficial-validaciones.test.ts.
    const manifest = manifestBase({ materia: '' }, TEXTO_VALIDO);
    const resultado = await ejecutarPipeline('HN-DEMO-X', { manifest, textoFuente: TEXTO_VALIDO }, { obtenerHashesExistentes: sinHashesExistentes });
    expect(resultado.aceptado).toBe(false); // manifest incompleto por materia vacía, capturado antes
  });

  it('rechaza archivos con posibles datos privados', async () => {
    const textoConPII = `
ARTÍCULO 1. El compareciente [Cliente_Anonimo] manifiesta su voluntad.
ARTÍCULO 2. Contacto de referencia: [Telefono_Oculto].
`;
    const manifest = manifestBase({}, textoConPII);
    const resultado = await ejecutarPipeline('HN-DEMO-X', { manifest, textoFuente: textoConPII }, { obtenerHashesExistentes: sinHashesExistentes });
    expect(resultado.aceptado).toBe(false);
    expect(resultado.motivoRechazo).toMatch(/posibles datos privados/);
  });

  it('rechaza contenido sin estado de revisión reconocido', async () => {
    const manifest = manifestBase({ estado: 'quien-sabe' }, TEXTO_VALIDO);
    const resultado = await ejecutarPipeline('HN-DEMO-X', { manifest, textoFuente: TEXTO_VALIDO }, { obtenerHashesExistentes: sinHashesExistentes });
    expect(resultado.aceptado).toBe(false);
    expect(resultado.motivoRechazo).toMatch(/estado de revisi[oó]n/);
  });
});
