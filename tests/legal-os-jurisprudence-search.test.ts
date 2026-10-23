import { describe, expect, it } from 'vitest';
import {
  ETAPAS_JURIS, JurisprudenceRecordSchema, avanzarJurisprudencia, buscarJurisprudencia, construirIndiceJurisprudencia, fijarValorPrecedencial, type JurisprudenceRecord,
} from '@/lib/legal-os/jurisprudence';

const H = 'a'.repeat(64);
const humano = { kind: 'HUMAN' as const, name: 'Persona de Prueba' };
const aprob = (e: string) => (['V4', 'V5', 'AVAILABLE'].includes(e) ? { approver: 'Persona de Prueba', date: '2026-10-23', stage: e as 'V4' } : undefined);
const base = (extra: Record<string, unknown> = {}) => ({
  id: 'TEST.J.1', court: 'Tribunal de Prueba', chamber: 'Sala de Prueba', case_number: 'TEST-001', date: '2001-05-10', matter: 'CIVIL', legal_issue: 'Tema sintético uno',
  ratio: null, holding: null, cited_laws: ['TEST.LAW.A'], cited_articles: ['TEST.ART.1'], public_private_status: 'PUBLIC',
  source_url: 'https://legislacion.poderjudicial.gob.hn/sistemalegislacion/sintetico', document_hash: H, ingestion_state: 'DISCOVER', ...extra,
});
function disponible(extra: Record<string, unknown> = {}): JurisprudenceRecord {
  let cur = JurisprudenceRecordSchema.parse(base(extra));
  for (const e of ETAPAS_JURIS.slice(1)) {
    const x = avanzarJurisprudencia(cur, e, humano, aprob(e));
    if (!x.ok) throw new Error(`${e}: ${x.motivo}`);
    cur = x.valor;
  }
  return cur;
}

const a = disponible();
const b = disponible({ id: 'TEST.J.2', court: 'Otro Tribunal', chamber: 'Sala B', case_number: 'TEST-002', date: '2010-01-01', matter: 'LABOR', legal_issue: 'Despido sintético', cited_articles: ['TEST.ART.9'] });
const indice = construirIndiceJurisprudencia([a, b]);

describe('índice: solo lo indexable', () => {
  it('registros privados, desconocidos, sin aprobación o de host no verificado quedan fuera con su motivo', () => {
    const r = construirIndiceJurisprudencia([a, base({ id: 'P', public_private_status: 'PRIVATE' }), base({ id: 'U', public_private_status: 'UNKNOWN' }), base({ id: 'N' }), disponible({ id: 'H', source_url: 'https://ejemplo.invalid/x' })]);
    expect(r.registros.map((x) => x.id)).toEqual(['TEST.J.1']);
    expect(r.rechazados.map((x) => x.id).sort()).toEqual(['H', 'N', 'P', 'U'].sort());
  });
});

describe('búsqueda por dimensiones', () => {
  it('tribunal, sala, materia, caso, artículo citado y tema (sin acentos ni mayúsculas)', () => {
    expect(buscarJurisprudencia(indice, { court: 'tribunal de prueba' }).map((x) => x.id)).toEqual(['TEST.J.1']);
    expect(buscarJurisprudencia(indice, { chamber: 'sala b' }).map((x) => x.id)).toEqual(['TEST.J.2']);
    expect(buscarJurisprudencia(indice, { matter: 'LABOR' }).map((x) => x.id)).toEqual(['TEST.J.2']);
    expect(buscarJurisprudencia(indice, { caseNumber: 'test-001' }).map((x) => x.id)).toEqual(['TEST.J.1']);
    expect(buscarJurisprudencia(indice, { citedArticle: 'test.art.9' }).map((x) => x.id)).toEqual(['TEST.J.2']);
    expect(buscarJurisprudencia(indice, { legalIssue: 'DESPIDO sintético' }).map((x) => x.id)).toEqual(['TEST.J.2']);
  });
  it('rango de fechas inclusivo; una fecha UNKNOWN nunca satisface un filtro de fecha', () => {
    expect(buscarJurisprudencia(indice, { dateFrom: '2005-01-01' }).map((x) => x.id)).toEqual(['TEST.J.2']);
    expect(buscarJurisprudencia(indice, { dateTo: '2001-05-10' }).map((x) => x.id)).toEqual(['TEST.J.1']);
    const sinFecha = construirIndiceJurisprudencia([disponible({ id: 'D', date: 'UNKNOWN' })]);
    expect(buscarJurisprudencia(sinFecha, { dateFrom: '1900-01-01' })).toEqual([]);
    expect(buscarJurisprudencia(sinFecha, {})).toHaveLength(1);
  });
  it('sin filtros devuelve todo, ordenado y determinista', () => {
    expect(buscarJurisprudencia(indice, {}).map((x) => x.id)).toEqual(['TEST.J.1', 'TEST.J.2']);
  });
});

describe('la jurisprudencia no se confunde con la norma', () => {
  it('todo resultado es JURISPRUDENCE con etiqueta fija; sin verificación humana el valor precedencial es «no determinado»', () => {
    for (const r of buscarJurisprudencia(indice, {})) {
      expect(r.kind).toBe('JURISPRUDENCE');
      expect(r.authorityLabel).toBe('Jurisprudencia — no es fuente normativa');
      expect(r.precedential_status).toBe('UNKNOWN');
      expect(r.precedentialLabel).toBe('Valor precedencial no determinado');
    }
  });
  it('el valor precedencial solo aparece si una persona lo verificó', () => {
    const v = fijarValorPrecedencial(a, 'PERSUASIVE', humano, { verifier: 'Persona de Prueba', date: '2026-10-23', basis: 'revisión de prueba' });
    if (!v.ok) throw new Error(v.motivo);
    const r = buscarJurisprudencia(construirIndiceJurisprudencia([v.valor]), {});
    expect(r[0].precedential_status).toBe('PERSUASIVE');
    expect(r[0].precedentialLabel).toMatch(/verificado por una persona/);
  });
});
