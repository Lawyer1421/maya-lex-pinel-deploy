import { describe, it, expect } from 'vitest';
import {
  obtenerEstadoEditorial,
  esContaminado,
  motivoEstado,
  filtrarLimpios,
  listarContaminados,
} from '@/lib/seo/estado-editorial';
import manifest from '@/data/corpus-editorial-status.json';

const ARTICULO_CONTAMINADO_CONOCIDO = '1'; // ver data/corpus-editorial-status.json
const ARTICULO_LIMPIO_CONOCIDO = '11';

describe('manifest de estado editorial', () => {
  it('cubre exactamente los 198 artículos auditados', () => {
    expect(Object.keys(manifest.articulos)).toHaveLength(198);
  });

  it('todo artículo tiene un estado válido y un motivo no vacío', () => {
    for (const [numero, entrada] of Object.entries(manifest.articulos)) {
      expect(['contaminado', 'limpio']).toContain(entrada.estado);
      expect(entrada.motivo.length).toBeGreaterThan(0);
      expect(numero.length).toBeGreaterThan(0);
    }
  });
});

describe('esContaminado / obtenerEstadoEditorial', () => {
  it('ruta contaminada → estado contaminado', () => {
    expect(esContaminado(ARTICULO_CONTAMINADO_CONOCIDO)).toBe(true);
    expect(obtenerEstadoEditorial(ARTICULO_CONTAMINADO_CONOCIDO)).toBe('contaminado');
  });

  it('ruta limpia → estado limpio', () => {
    expect(esContaminado(ARTICULO_LIMPIO_CONOCIDO)).toBe(false);
    expect(obtenerEstadoEditorial(ARTICULO_LIMPIO_CONOCIDO)).toBe('limpio');
  });

  it('artículo sin entrada en el manifest se trata como contaminado por seguridad', () => {
    expect(esContaminado('999999-no-existe')).toBe(true);
  });

  it('motivoEstado siempre devuelve un texto explicativo', () => {
    expect(motivoEstado(ARTICULO_CONTAMINADO_CONOCIDO)).toMatch(/anonimizaci[oó]n/i);
    expect(motivoEstado('999999-no-existe')).toMatch(/manifest/i);
  });
});

describe('filtrarLimpios / listarContaminados (usados por sitemap.ts)', () => {
  const muestra = [ARTICULO_CONTAMINADO_CONOCIDO, ARTICULO_LIMPIO_CONOCIDO, '999999-no-existe'];

  it('filtrarLimpios excluye contaminados y desconocidos', () => {
    expect(filtrarLimpios(muestra)).toEqual([ARTICULO_LIMPIO_CONOCIDO]);
  });

  it('listarContaminados devuelve contaminados y desconocidos (tratados como contaminados)', () => {
    expect(listarContaminados(muestra)).toEqual([ARTICULO_CONTAMINADO_CONOCIDO, '999999-no-existe']);
  });

  it('ninguna ruta contaminada aparece en el resultado de filtrarLimpios sobre el manifest completo', () => {
    const todos = Object.keys(manifest.articulos);
    const limpios = filtrarLimpios(todos);
    for (const numero of limpios) {
      expect(esContaminado(numero)).toBe(false);
    }
  });
});
