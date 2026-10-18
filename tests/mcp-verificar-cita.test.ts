import { describe, it, expect } from 'vitest';
import { verificarCita, normalizarCita, NORMALIZACION_CITA } from '@/lib/mcp/verificar-cita';

const ART = 'Artículo 1.- El Notario es el profesional del Derecho investido de fe pública,\n  facultado para autenticar y dar forma – en los términos de esta Ley – a los actos jurídicos.';

describe('verificarCita — tres estados exhaustivos (PLAN-MCP-SLICE-1 §2.3)', () => {
  it('verificada: la cita está en el texto tras la normalización declarada', () => {
    expect(verificarCita('investido de fe pública', ART)).toEqual({ estado: 'verificada', normalizacion: NORMALIZACION_CITA });
  });
  it('no_encontrada: sin texto resuelto (id inexistente o sin versión para la fecha)', () => {
    expect(verificarCita('cualquier cosa', null)).toEqual({ estado: 'no_encontrada', normalizacion: NORMALIZACION_CITA });
    expect(verificarCita('cualquier cosa', '  \n ').estado).toBe('no_encontrada');
  });
  it('texto_distinto: devuelve el pasaje más cercano, la similitud y las palabras faltantes', () => {
    const r = verificarCita('investido de fe notarial', ART);
    expect(r.estado).toBe('texto_distinto');
    if (r.estado !== 'texto_distinto') throw new Error('inesperado');
    expect(r.pasaje_cercano).toBe('investido de fe pública,');
    expect(r.similitud).toBe(0.75);
    expect(r.palabras_faltantes).toEqual(['notarial']);
  });
  it('texto_distinto sin ninguna palabra en común: pasaje null y similitud 0', () => {
    const r = verificarCita('zzz yyy', ART);
    expect(r).toMatchObject({ estado: 'texto_distinto', pasaje_cercano: null, similitud: 0 });
  });
  it('una cita vacía o sólo espacios nunca es verificada', () => {
    expect(verificarCita('', ART).estado).toBe('texto_distinto');
    expect(verificarCita('   \n', ART).estado).toBe('texto_distinto');
  });
});

describe('verificarCita — normalización', () => {
  it('tilde compuesta y descompuesta son iguales (NFC)', () => {
    const descompuesta = 'investido de fe pública';
    expect(verificarCita(descompuesta, ART).estado).toBe('verificada');
  });
  it('una palabra sin tilde NO es igual a la misma con tilde', () => {
    expect(verificarCita('investido de fe publica', ART).estado).toBe('texto_distinto');
  });
  it('espacios, saltos de línea y NBSP se colapsan', () => {
    expect(verificarCita('fe   pública, facultado\tpara', ART).estado).toBe('verificada');
  });
  it('guiones: en/em dash y guion simple son iguales', () => {
    expect(verificarCita('dar forma - en los términos de esta Ley - a los actos', ART).estado).toBe('verificada');
    expect(verificarCita('dar forma — en los términos', ART).estado).toBe('verificada');
  });
  it('comillas tipográficas y rectas son iguales', () => {
    expect(verificarCita('el “acto” notarial', 'Se llama "acto" notarial a').estado).toBe('texto_distinto');
    expect(verificarCita('llama «acto» notarial', 'Se llama "acto" notarial a').estado).toBe('verificada');
  });
  it('distingue mayúsculas y puntuación', () => {
    expect(verificarCita('el notario es', ART).estado).toBe('texto_distinto');
    expect(verificarCita('Artículo 1 El Notario', ART).estado).toBe('texto_distinto');
  });
  it('normalizarCita es idempotente y determinista', () => {
    const n = normalizarCita(ART);
    expect(normalizarCita(n)).toBe(n);
    expect(verificarCita('investido de fe notarial', ART)).toEqual(verificarCita('investido de fe notarial', ART));
  });
});
