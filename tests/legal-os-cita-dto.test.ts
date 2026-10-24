// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { construirCitas, FUENTES_DOCTRINALES } from '@/lib/legal-retrieval/evidence-engine';
import type { FragmentoRAG } from '@/lib/legal-retrieval/types';
import { construirCitaDTO, esCitaDTOv2, type CitaDTOv2 } from '@/lib/legal-os/ux/cita-dto';
import { construirPanel, crearTarjeta } from '@/lib/legal-os/ux/source-cards';
import { AnswerPanel } from '@/components/legal/AnswerPanel';

const RAIZ = join(__dirname, '..');
const frag = (o: Partial<FragmentoRAG> = {}): FragmentoRAG => ({
  id: 'f1', contenido: 'Texto sintético del artículo.', num_articulo: '7', fuente: 'Codigo Penal', relevancia: 1, es_norma_vigente: true, hash: 'abcd1234', ...o,
});

/** Simula lo que haría el servidor: construirCitas → DTO v2 → JSON del evento SSE `done` → parse del cliente. */
function viaSSE(fragmentos: FragmentoRAG[], metaPorHash: Record<string, Parameters<typeof construirCitaDTO>[2]> = {}): CitaDTOv2[] {
  const citas = construirCitas(fragmentos);
  const dtos = citas.map((c) => construirCitaDTO(c, fragmentos.find((f) => f.hash === c.hash), metaPorHash[c.hash]));
  const evento = `data: ${JSON.stringify({ type: 'done', citas: dtos })}\n\n`;
  const payload = JSON.parse(evento.slice('data: '.length));
  return payload.citas;
}

describe('mapeador servidor → DTO v2', () => {
  it('la marca del corpus (es_norma_vigente=true) produce PRESUMED, nunca VERIFIED', () => {
    const [c] = viaSSE([frag()]);
    expect(c.validity_state).toBe('PRESUMED');
    expect(esCitaDTOv2(c)).toBe(true);
  });
  it('VERIFIED exige verificación humana con aprobador y fecha válida', () => {
    const h = 'abcd1234';
    expect(viaSSE([frag()], { [h]: { verificacionHumana: { aprobadoPor: 'CLO', fecha: '2026-10-23' } } })[0].validity_state).toBe('VERIFIED');
    for (const v of [{ aprobadoPor: '', fecha: '2026-10-23' }, { aprobadoPor: 'CLO', fecha: 'ayer' }, null]) {
      expect(viaSSE([frag()], { [h]: { verificacionHumana: v } })[0].validity_state, JSON.stringify(v)).toBe('PRESUMED');
    }
  });
  it('una verificación humana NO rescata una marca de corpus falsa o ausente', () => {
    const v = { verificacionHumana: { aprobadoPor: 'CLO', fecha: '2026-10-23' } };
    const dto = construirCitaDTO({ articulo: '1', texto: 't', fuente: 'X', vigente: false, hash: 'h' }, { es_norma_vigente: false }, v);
    expect(dto.validity_state).toBe('NOT_IN_FORCE');
    expect(construirCitaDTO({ articulo: '1', texto: 't', fuente: 'X', vigente: false, hash: 'h' }, { es_norma_vigente: null }, v).validity_state).toBe('NOT_VERIFIED');
  });
  it('la doctrina es DOCTRINE y NOT_VERIFIED aunque traiga verificación', () => {
    const [d] = [FUENTES_DOCTRINALES.values().next().value as string].map((fuente) =>
      construirCitaDTO({ articulo: '5', texto: 't', fuente, vigente: true, hash: 'h' }, { es_norma_vigente: true }, { verificacionHumana: { aprobadoPor: 'CLO', fecha: '2026-10-23' } }),
    );
    expect(d).toMatchObject({ kind: 'DOCTRINE', validity_state: 'NOT_VERIFIED' });
    expect(crearTarjeta(d)).toMatchObject({ doctrinal: true, validityLabel: 'Doctrina — no vinculante' });
  });
  it('official_url solo para hosts verificados del registro; el resto se descarta', () => {
    const base = { articulo: '1', texto: 't', fuente: 'X', vigente: true, hash: 'h' };
    const ok = construirCitaDTO(base, { es_norma_vigente: true }, { urlOficial: 'https://legislacion.poderjudicial.gob.hn/x.pdf' });
    expect(ok).toMatchObject({ official_url: 'https://legislacion.poderjudicial.gob.hn/x.pdf', source_tier: 2, source_authority: 'PODER_JUDICIAL' });
    for (const u of ['https://lagaceta.hn/x', 'http://legislacion.poderjudicial.gob.hn/x', 'https://evil.com/legislacion.poderjudicial.gob.hn', 'https://ejemplo.com/ley']) {
      expect(construirCitaDTO(base, { es_norma_vigente: true }, { urlOficial: u }).official_url, u).toBeNull();
    }
  });
});

describe('flujo completo hasta la tarjeta', () => {
  it('sin evidencia de verificación ninguna tarjeta dice «verificada»; con evidencia, solo esa', () => {
    const fr = [frag(), frag({ hash: 'zzzz9999', num_articulo: '8' })];
    const cli = viaSSE(fr, { zzzz9999: { verificacionHumana: { aprobadoPor: 'CLO', fecha: '2026-10-23' }, gaceta: '00,000', version: 'texto consolidado' } });
    const panel = construirPanel({ answer: 'r', fuentes: cli });
    const porHash = Object.fromEntries(panel.sources.map((s) => [s.hash, s]));
    expect(porHash['abcd1234'].validityLabel).not.toMatch(/verificada$/);
    expect(porHash['abcd1234'].validity).toBe('PRESUMIDA');
    expect(porHash['zzzz9999']).toMatchObject({ validity: 'VERIFICADA', validityLabel: 'Vigencia verificada', versionLabel: 'texto consolidado' });
  });
  it('la forma antigua de la cita (v1) nunca produce «Vigencia verificada»', () => {
    const panel = construirPanel({ answer: 'r', fuentes: construirCitas([frag()]) });
    expect(panel.sources[0].validity).toBe('NO_VERIFICADA');
    expect(JSON.stringify(panel)).not.toMatch(/Vigencia verificada/);
  });
});

describe('render del panel (servidor, sin navegador)', () => {
  const html = (fuentes: Parameters<typeof construirPanel>[0]['fuentes']) =>
    renderToString(createElement(AnswerPanel, { modelo: construirPanel({ answer: 'r', fuentes }) }));
  it('entradas no verificadas: el marcado no contiene «verificada» ni «Norma vigente»', () => {
    const marcado = html([...construirCitas([frag()]), ...viaSSE([frag({ hash: 'pres1234' })])]);
    expect(marcado).toMatch(/Vigencia no verificada|Vigencia presumida/);
    expect(marcado).not.toMatch(/Vigencia verificada/i);
    expect(marcado).not.toMatch(/Norma vigente/i);
  });
  it('con VERIFIED del backend el marcado sí lo dice; y el enlace oficial solo aparece con host verificado', () => {
    const [v] = viaSSE([frag()], { abcd1234: { verificacionHumana: { aprobadoPor: 'CLO', fecha: '2026-10-23' }, urlOficial: 'https://legislacion.poderjudicial.gob.hn/x.pdf' } });
    const marcado = html([v]);
    expect(marcado).toMatch(/Vigencia verificada/);
    expect(marcado).toMatch(/href="https:\/\/legislacion\.poderjudicial\.gob\.hn\/x\.pdf"/);
    const [sin] = viaSSE([frag()], { abcd1234: { urlOficial: 'https://lagaceta.hn/x' } });
    expect(html([sin])).not.toMatch(/href=/);
  });
});

describe('bandera apagada', () => {
  it('MessageBubble sigue usando el marcado anterior por defecto y el servidor no cambió', () => {
    const src = readFileSync(join(RAIZ, 'components', 'MessageBubble.tsx'), 'utf8');
    expect(src).toMatch(/NEXT_PUBLIC_MAYALEX_SOURCE_CARDS === '1'/);
    const ruta = readFileSync(join(RAIZ, 'app', 'api', 'chat', 'route.ts'), 'utf8');
    expect(ruta).not.toMatch(/construirCitaDTO|CitaDTOv2/);
  });
  it('el DTO y el mapeador no importan red, servidor ni el gateway', () => {
    const src = readFileSync(join(RAIZ, 'lib', 'legal-os', 'ux', 'cita-dto.ts'), 'utf8');
    expect(src).not.toMatch(/ai-gateway|supabase|process\.env|\bfetch\s*\(/);
  });
});
