import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FUENTES_DOCTRINALES } from '@/lib/legal-retrieval/evidence-engine';
import { construirPanel, crearTarjeta, ETIQUETA, ordenarTarjetas } from '@/lib/legal-os/ux/source-cards';

const RAIZ = join(__dirname, '..');

describe('tarjetas de fuente: vigencia', () => {
  it('sin bandera → «Vigencia no verificada» con advertencia; nunca «vigente»', () => {
    for (const v of [undefined, null]) {
      const t = crearTarjeta({ fuente: 'Código X', articulo: '1', vigente: v });
      expect(t.validityLabel).toBe(ETIQUETA.noVerificada);
      expect(t.validity).toBe('NO_VERIFICADA');
      expect(t.warnings.join(' ')).toMatch(/no está verificada/);
      expect(t.validityLabel).not.toMatch(/vigente HN/i);
    }
  });
  it('forma antigua: `vigente: true` NO prueba verificación (es la marca del corpus) → «Vigencia no verificada»; false → no vigente', () => {
    expect(crearTarjeta({ fuente: 'A', vigente: true })).toMatchObject({ validity: 'NO_VERIFICADA', validityLabel: ETIQUETA.noVerificada });
    expect(crearTarjeta({ fuente: 'A', vigente: false })).toMatchObject({ validity: 'NO_VIGENTE', validityLabel: ETIQUETA.noVigente });
  });
  it('solo el estado VERIFIED del backend produce «Vigencia verificada»; PRESUMED se rotula presumida con advertencia', () => {
    expect(crearTarjeta({ fuente: 'A', validityState: 'VERIFIED' })).toMatchObject({ validity: 'VERIFICADA', validityLabel: 'Vigencia verificada' });
    const p = crearTarjeta({ fuente: 'A', validityState: 'PRESUMED', vigente: true });
    expect(p).toMatchObject({ validity: 'PRESUMIDA' });
    expect(p.validityLabel).not.toBe('Vigencia verificada');
    expect(p.warnings.join(' ')).toMatch(/no tiene verificación humana/);
    expect(crearTarjeta({ fuente: 'A', validityState: 'NOT_VERIFIED', vigente: true }).validity).toBe('NO_VERIFICADA');
    expect(crearTarjeta({ fuente: 'A', validityState: 'NOT_IN_FORCE' }).validity).toBe('NO_VIGENTE');
  });
  it('doctrina (FUENTES_DOCTRINALES) se rotula «Doctrina — no vinculante» aunque la bandera sea true', () => {
    const t = crearTarjeta({ fuente: 'CPC_COMENTADO_ROMERO_2024', articulo: '9', vigente: true }, { fuentesDoctrinales: FUENTES_DOCTRINALES });
    expect(t).toMatchObject({ doctrinal: true, validityLabel: 'Doctrina — no vinculante', validity: 'DOCTRINAL' });
  });
});

describe('tarjetas de fuente: enlaces oficiales', () => {
  it('solo hosts oficiales verificados con https', () => {
    const ok = crearTarjeta({ fuente: 'A', url: 'https://legislacion.poderjudicial.gob.hn/x.pdf' });
    expect(ok).toMatchObject({ officialUrl: 'https://legislacion.poderjudicial.gob.hn/x.pdf', tier: 2 });
    for (const url of ['https://lagaceta.hn/x', 'http://legislacion.poderjudicial.gob.hn/x', 'https://legislacion.poderjudicial.gob.hn.evil.com/x', 'https://ejemplo.com/ley', 'no-es-url']) {
      const t = crearTarjeta({ fuente: 'A', url });
      expect(t.officialUrl, url).toBeNull();
      expect(t.tier).toBeNull();
      expect(t.warnings.join(' ')).toMatch(/enlace/);
    }
  });
});

describe('panel', () => {
  const entrada = {
    answer: 'Texto de la respuesta',
    fuentes: [
      { fuente: 'Zeta', articulo: '10', vigente: true, hash: 'h3', texto: 'zz' },
      { fuente: 'Alfa', articulo: '2', vigente: true, hash: 'h1' },
      { fuente: 'Alfa', articulo: '10', vigente: null, hash: 'h2' },
      { fuente: 'Alfa', articulo: '2', vigente: true, hash: 'h1' },
      { fuente: 'Sentencia de prueba', kind: 'JUDGMENT' as const, vigente: null, hash: 'h4' },
      { fuente: 'CPC_COMENTADO_ROMERO_2024', articulo: '5', hash: 'h5' },
    ],
    fuentesDoctrinales: FUENTES_DOCTRINALES,
  };
  const p = construirPanel(entrada);
  it('orden determinista (normas antes que doctrina, instrumento, artículo numérico) y sin duplicados', () => {
    expect(p.sources.map((s) => s.title)).toEqual(['Alfa · Art. 2', 'Alfa · Art. 10', 'Zeta · Art. 10', 'Sentencia de prueba', 'CPC_COMENTADO_ROMERO_2024 · Art. 5']);
    expect(construirPanel({ ...entrada, fuentes: [...entrada.fuentes].reverse() }).sources.map((s) => s.id)).toEqual(p.sources.map((s) => s.id));
    expect(ordenarTarjetas(p.sources)).toEqual(p.sources);
  });
  it('fundamento legal solo con normas; sentencias y doctrina van a normativa relacionada', () => {
    expect(p.legalBasis.every((t) => !t.doctrinal && t.kind !== 'JUDGMENT')).toBe(true);
    expect(p.relatedLaw.map((t) => t.instrument)).toEqual(['Sentencia de prueba', 'CPC_COMENTADO_ROMERO_2024']);
  });
  it('tiene las 8 secciones y los vacíos son honestos', () => {
    expect(p.secciones.map((s) => s.id)).toEqual(['ANSWER', 'LEGAL_BASIS', 'SOURCES', 'CITATIONS', 'VALIDITY_VERSION', 'WARNINGS', 'RELATED_LAW', 'DEEP_ANALYSIS']);
    expect(p.secciones.find((s) => s.id === 'DEEP_ANALYSIS')?.vacio).toBe(true);
    const sinFuentes = construirPanel({ answer: 'x', fuentes: [] });
    expect(sinFuentes.warnings).toContain('Esta respuesta no cita fuentes del corpus.');
    expect(sinFuentes.secciones.find((s) => s.id === 'SOURCES')?.vacio).toBe(true);
  });
  it('citas con hash y advertencias deduplicadas', () => {
    expect(p.citations.map((c) => c.hash)).toEqual(['h1', 'h2', 'h3', 'h4', 'h5']);
    expect(new Set(p.warnings).size).toBe(p.warnings.length);
  });
});

describe('cableado', () => {
  it('MessageBubble conserva el markup anterior cuando la bandera está apagada (default)', () => {
    const src = readFileSync(join(RAIZ, 'components', 'MessageBubble.tsx'), 'utf8');
    expect(src).toMatch(/NEXT_PUBLIC_MAYALEX_SOURCE_CARDS === '1'/);
    expect(src).toMatch(/!TARJETAS_FUENTE && !message\.isStreaming/);
    expect(src).toMatch(/Norma vigente HN/);
  });
  it('el módulo de vista no importa red, servidor ni el gateway', () => {
    const src = readFileSync(join(RAIZ, 'lib', 'legal-os', 'ux', 'source-cards.ts'), 'utf8');
    expect(src).not.toMatch(/ai-gateway|supabase|process\.env|\bfetch\s*\(/);
  });
});
