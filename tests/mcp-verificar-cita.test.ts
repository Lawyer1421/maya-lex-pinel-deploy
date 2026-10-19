import { describe, it, expect } from 'vitest';
import { verificarCita, normalizarCita, NORMALIZACION_CITA, MAX_CARACTERES_CITA } from '@/lib/mcp/verificar-cita';

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

describe('verificarCita — tope de longitud (Auditor @ e1c0c40, P2-3)', () => {
  it('una cita de más de MAX_CARACTERES_CITA no se compara: cita_demasiado_larga', () => {
    const larga = 'palabra '.repeat(400); // 3.200 caracteres
    expect(verificarCita(larga, ART)).toEqual({ estado: 'cita_demasiado_larga', normalizacion: NORMALIZACION_CITA, max_caracteres: MAX_CARACTERES_CITA });
  });
  it('el tope se mide tras normalizar y el límite exacto sí se compara', () => {
    const justo = 'a'.repeat(MAX_CARACTERES_CITA);
    expect(verificarCita(justo, justo).estado).toBe('verificada');
    expect(verificarCita(`  ${justo}  \n`, justo).estado).toBe('verificada');
    expect(verificarCita(justo + 'a', justo + 'a').estado).toBe('cita_demasiado_larga');
  });
  it('cita en el tope contra un texto largo termina rápido', () => {
    const cita = Array.from({ length: 300 }, (_, i) => `w${i}`).join(' ').slice(0, MAX_CARACTERES_CITA);
    const texto = Array.from({ length: 20000 }, (_, i) => `t${i % 997}`).join(' ');
    const t0 = Date.now();
    expect(verificarCita(cita, texto).estado).toBe('texto_distinto');
    expect(Date.now() - t0).toBeLessThan(2000);
  });
  it('peor caso en el tope: palabras repetidas (todas las ventanas empatan) contra 20.000 palabras', () => {
    // Cada ventana del texto empata en coincidencias, así que el desempate por
    // alineación corre en todas (Auditor @ 72432ee, P3-4). Debe seguir acotado.
    const cita = `${'a '.repeat(998)}b`.slice(0, MAX_CARACTERES_CITA);
    expect(normalizarCita(cita).length).toBeLessThanOrEqual(MAX_CARACTERES_CITA);
    const texto = Array.from({ length: 20000 }, () => 'a').join(' ');
    const t0 = Date.now();
    const r = verificarCita(cita, texto);
    const ms = Date.now() - t0;
    expect(r.estado).toBe('texto_distinto');
    if (r.estado === 'texto_distinto') expect(r.palabras_faltantes).toEqual(['b']);
    expect(ms).toBeLessThan(5000);
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
  it('comillas tipográficas y rectas son iguales (dobles y simples)', () => {
    // Cada par sólo difiere en el tipo de comilla.
    expect(verificarCita('llama \u201Cacto\u201D notarial', 'Se llama "acto" notarial a').estado).toBe('verificada');
    expect(verificarCita('llama \u00ABacto\u00BB notarial', 'Se llama "acto" notarial a').estado).toBe('verificada');
    expect(verificarCita("llama \u2018acto\u2019 notarial", "Se llama 'acto' notarial a").estado).toBe('verificada');
    expect(verificarCita("llama 'acto' notarial", 'Se llama \u2018acto\u2019 notarial a').estado).toBe('verificada');
  });
  it('el guion suave (U+00AD, invisible) se elimina; no equivale a un guion', () => {
    const texto = 'investido de fe p\u00FA\u00ADblica';
    expect(verificarCita('fe p\u00FAblica', texto).estado).toBe('verificada');
    expect(verificarCita('fe p\u00FA-blica', texto).estado).toBe('texto_distinto');
    expect(NORMALIZACION_CITA).toContain('sin guion suave');
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
