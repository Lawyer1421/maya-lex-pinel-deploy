import { describe, it, expect } from 'vitest';
import manifest from '@/data/corpus-editorial-status.json';
import { listarNumerosArticulo, slugConsultaParaArticulo, numeroArticuloDesdeSlug } from '@/lib/seo/articulos-vigentes';

// Determinismo del build: la lista de rutas de /leyes y /consultas debe salir
// del manifest local versionado, sin depender de la red. Estas pruebas se
// ejecutan SIN variables de entorno de Supabase — si listarNumerosArticulo
// volviera a depender de la red, fallarían de inmediato.

describe('listarNumerosArticulo — determinista, sin red', () => {
  it('devuelve exactamente los artículos del manifest editorial', async () => {
    const numeros = await listarNumerosArticulo();
    expect(numeros).toHaveLength(Object.keys(manifest.articulos).length);
    expect(new Set(numeros)).toEqual(new Set(Object.keys(manifest.articulos)));
  });

  it('devuelve 198 artículos (conteo auditado del corpus penal publicable)', async () => {
    expect(await listarNumerosArticulo()).toHaveLength(198);
  });

  it('orden numérico estable entre llamadas (mismo array, misma serialización)', async () => {
    const a = await listarNumerosArticulo();
    const b = await listarNumerosArticulo();
    expect(a).toEqual(b);
    const ordenado = [...a].sort((x, y) => Number(x) - Number(y));
    expect(a).toEqual(ordenado);
  });

  it('todo número de artículo produce un slug de /consultas reversible', async () => {
    for (const n of await listarNumerosArticulo()) {
      expect(numeroArticuloDesdeSlug(slugConsultaParaArticulo(n))).toBe(n);
    }
  });
});
