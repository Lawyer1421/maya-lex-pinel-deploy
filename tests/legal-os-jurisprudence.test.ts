import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ETAPAS_JURIS,
  JurisprudenceRecordSchema,
  avanzarJurisprudencia,
  claseDeHost,
  fijarValorPrecedencial,
  puedeIndexarPublicamente,
  validarRegistroJurisprudencia,
  type JurisprudenceRecord,
} from '@/lib/legal-os/jurisprudence';

const H = 'a'.repeat(64);
const sintetico = (extra: Record<string, unknown> = {}) => ({
  id: 'TEST.JURIS.1', court: 'Tribunal de Prueba', chamber: 'Sala de Prueba', case_number: 'TEST-000', date: '2000-01-01', matter: 'CIVIL',
  legal_issue: 'tema sintético', ratio: null, holding: null, cited_laws: ['TEST.LAW.A'], cited_articles: ['TEST.ART.1'],
  public_private_status: 'PUBLIC', source_url: 'https://legislacion.poderjudicial.gob.hn/sistemalegislacion/doc-sintetico', document_hash: H, ingestion_state: 'DISCOVER', ...extra,
});
const humano = { kind: 'HUMAN' as const, name: 'Persona de Prueba' };
const aprobacion = (e: string) => (['V4', 'V5', 'AVAILABLE'].includes(e) ? { approver: 'Persona de Prueba', date: '2026-10-23', stage: e as 'V4' } : undefined);

function recorrer(r: JurisprudenceRecord, hasta: number): JurisprudenceRecord {
  let cur = r;
  for (const e of ETAPAS_JURIS.slice(1, hasta)) {
    const x = avanzarJurisprudencia(cur, e, humano, aprobacion(e));
    if (!x.ok) throw new Error(`${e}: ${x.motivo}`);
    cur = x.valor;
  }
  return cur;
}
const completo = (extra: Record<string, unknown> = {}) => recorrer(JurisprudenceRecordSchema.parse(sintetico(extra)), ETAPAS_JURIS.length);

describe('jurisprudencia: esquema', () => {
  it('precedential_status es UNKNOWN por defecto', () => {
    expect(JurisprudenceRecordSchema.parse(sintetico()).precedential_status).toBe('UNKNOWN');
  });
  it('un estado precedencial sin verificación humana es inválido (nunca se infiere)', () => {
    expect(validarRegistroJurisprudencia(sintetico({ precedential_status: 'BINDING' })).valido).toBe(false);
  });
  it('solo una persona fija el valor precedencial; un agente es rechazado', () => {
    const r = JurisprudenceRecordSchema.parse(sintetico());
    const v = { verifier: 'Persona de Prueba', date: '2026-10-23', basis: 'revisión de prueba' };
    expect(fijarValorPrecedencial(r, 'BINDING', { kind: 'AGENT', name: 'bot' }, v)).toEqual({ ok: false, motivo: 'REQUIERE_ACTOR_HUMANO' });
    const ok = fijarValorPrecedencial(r, 'PERSUASIVE', humano, v);
    expect(ok.ok && ok.valor.precedential_status).toBe('PERSUASIVE');
  });
  it('hash inválido o fecha mal formada se rechazan', () => {
    expect(validarRegistroJurisprudencia(sintetico({ document_hash: 'xyz' })).valido).toBe(false);
    expect(validarRegistroJurisprudencia(sintetico({ date: '01/01/2000' })).valido).toBe(false);
  });
});

describe('jurisprudencia: host oficial', () => {
  it('solo hosts del registro verificado; http, credenciales y hosts parecidos se rechazan', () => {
    expect(claseDeHost('https://legislacion.poderjudicial.gob.hn/x')).toBe('PRIMARY_OFFICIAL');
    expect(claseDeHost('https://sejeinfo.poderjudicial.gob.hn/x')).toBe('SECONDARY_OFFICIAL');
    expect(claseDeHost('https://www.poderjudicial.gob.hn/x')).toBe('DISCOVERY_ONLY');
    for (const u of ['http://legislacion.poderjudicial.gob.hn/x', 'https://sij.poderjudicial.gob.hn/index', 'https://legislacion.poderjudicial.gob.hn.evil.com/x', 'https://user:pw@legislacion.poderjudicial.gob.hn/x', 'https://www.lagaceta.hn/', 'no es url']) {
      expect(claseDeHost(u), u).toBe('NO_VERIFICADO');
    }
    expect(validarRegistroJurisprudencia(sintetico({ source_url: 'https://www.lagaceta.hn/x' })).problemas).toContain('HOST_NO_OFICIAL_VERIFICADO');
  });
});

describe('jurisprudencia: indexación pública', () => {
  it('completo, público, host oficial primario y aprobaciones humanas: puede (con valor precedencial UNKNOWN)', () => {
    const r = completo();
    expect(r.precedential_status).toBe('UNKNOWN');
    expect(puedeIndexarPublicamente(r)).toEqual({ puede: true, motivos: [] });
  });
  it('privado o desconocido: nunca', () => {
    for (const s of ['PRIVATE', 'UNKNOWN']) {
      const aprobs = ['V4', 'V5', 'AVAILABLE'].map((stage) => ({ approver: 'P', date: '2026-10-23', stage }));
      const r = JurisprudenceRecordSchema.parse(sintetico({ public_private_status: s, ingestion_state: 'AVAILABLE', approvals: aprobs }));
      expect(puedeIndexarPublicamente(r).motivos).toContain('NO_ES_PUBLICA_VERIFICADA');
    }
  });
  it('host solo de descubrimiento: no se indexa', () => {
    const r = completo({ source_url: 'https://www.poderjudicial.gob.hn/Paginas/CSJHN.aspx' });
    expect(puedeIndexarPublicamente(r).motivos).toContain('HOST_SOLO_DESCUBRIMIENTO');
  });
  it('sin aprobación humana completa: no', () => {
    expect(puedeIndexarPublicamente(sintetico()).motivos).toContain('SIN_APROBACION_HUMANA_COMPLETA');
  });
  it('entrada inválida → no, sin lanzar', () => {
    expect(puedeIndexarPublicamente({ cualquier: 'cosa' }).puede).toBe(false);
    expect(puedeIndexarPublicamente(null).puede).toBe(false);
  });
});

describe('jurisprudencia: pipeline', () => {
  const r0 = JurisprudenceRecordSchema.parse(sintetico());
  it('un paso a la vez', () => {
    expect(avanzarJurisprudencia(r0, 'HASH', humano)).toEqual({ ok: false, motivo: 'NO_ES_SIGUIENTE_PASO' });
  });
  it('V4 exige humano + aprobación válida; agente y automatización son rechazados', () => {
    const r = recorrer(r0, ETAPAS_JURIS.indexOf('V4'));
    expect(r.ingestion_state).toBe('HUMAN_VERIFICATION');
    const ap = { approver: 'Persona de Prueba', date: '2026-10-23', stage: 'V4' as const };
    expect(avanzarJurisprudencia(r, 'V4', { kind: 'AGENT', name: 'a' }, ap)).toEqual({ ok: false, motivo: 'REQUIERE_ACTOR_HUMANO' });
    expect(avanzarJurisprudencia(r, 'V4', { kind: 'AUTOMATION', name: 'cron' }, ap)).toEqual({ ok: false, motivo: 'REQUIERE_ACTOR_HUMANO' });
    expect(avanzarJurisprudencia(r, 'V4', humano)).toEqual({ ok: false, motivo: 'REQUIERE_APROBACION' });
    expect(avanzarJurisprudencia(r, 'V4', humano, { ...ap, stage: 'V5' })).toEqual({ ok: false, motivo: 'APROBACION_INVALIDA' });
    expect(avanzarJurisprudencia(r, 'V4', humano, ap).ok).toBe(true);
  });
  it('un registro privado no llega a INDEX', () => {
    const priv = JurisprudenceRecordSchema.parse(sintetico({ public_private_status: 'PRIVATE' }));
    const r = recorrer(priv, ETAPAS_JURIS.indexOf('INDEX'));
    expect(avanzarJurisprudencia(r, 'INDEX', humano)).toEqual({ ok: false, motivo: 'PRIVADO_O_DESCONOCIDO' });
  });
  it('inmutable: avanzar devuelve un registro nuevo', () => {
    const x = avanzarJurisprudencia(r0, 'DOWNLOAD', humano);
    expect(x.ok && x.valor).not.toBe(r0);
    expect(r0.ingestion_state).toBe('DISCOVER');
  });
  it('no importa el gateway ni la red', () => {
    const f = readFileSync(join(__dirname, '..', 'lib', 'legal-os', 'jurisprudence', 'index.ts'), 'utf8');
    expect(f).not.toMatch(/ai-gateway|\bfetch\s*\(|process\.env/);
  });
});
