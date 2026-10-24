import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { avanzar, hojaClo, procesarLote, qaTexto, segmentarArticulos, type CandidatoStaging } from '@/lib/legal-os/corpus-factory';
import { main } from '../tools/corpus/process-batch';

const h = (t: string) => createHash('sha256').update(t, 'utf8').digest('hex');
const AHORA = new Date('2026-10-24T00:00:00Z');
const TEXTO = 'PREÁMBULO SINTÉTICO de prueba.\nARTÍCULO 1.- Texto SINTÉTICO del primer artículo de la ley ficticia de prueba.\nARTÍCULO 2.- Texto SINTÉTICO del segundo artículo, conforme al artículo 1 de esta ley ficticia.\nARTÍCULO 3.- Texto SINTÉTICO del tercer artículo de la ley ficticia de prueba.';
// Dominio VERIFICADO del registro + contenido SINTÉTICO: solo para ejercitar el camino CLO_PENDING en pruebas (nunca se commitea como paquete real).
const pkg = (o: Record<string, unknown> = {}) => ({
  source_url: 'https://legislacion.poderjudicial.gob.hn/sistemalegislacion/prueba-sintetica', source_domain: 'legislacion.poderjudicial.gob.hn', retrieved_at: '2026-10-01T12:00:00Z',
  document_name: 'Ley Sintética Verificable', document_type: 'LAW', decree: 'UNKNOWN', gaceta: 'UNKNOWN', gaceta_date: 'UNKNOWN', bytes_sha256: h('bytes'), text_sha256: h(TEXTO),
  extracted_text: TEXTO, retrieval_method: 'MANUAL_BROWSER', source_tier: null, retriever: 'chatgpt-research', verification_state: 'UNVERIFIED', ...o,
});

describe('segmentación', () => {
  it('detecta encabezados, ignora remisiones («conforme al artículo 1…») y conserva el preámbulo', () => {
    const s = segmentarArticulos(TEXTO);
    expect(s.articulos.map((a) => a.numero)).toEqual(['1', '2', '3']);
    expect(s.preambulo).toMatch(/^PREÁMBULO/);
    expect(s.articulos[1].texto).toContain('conforme al artículo 1 de esta ley');
  });
  it('texto en una sola línea, ARTÍCULO ÚNICO y sufijos tipo 12-A', () => {
    expect(segmentarArticulos('ARTÍCULO 1.- Uno uno uno. ARTÍCULO 2.- Dos dos dos.').articulos).toHaveLength(2);
    expect(segmentarArticulos('ARTÍCULO ÚNICO.- Solo uno.').articulos[0].numero).toBe('ÚNICO');
    expect(segmentarArticulos('ARTÍCULO 12-A.- Texto bis.').articulos[0].numero).toBe('12-A');
  });
  it('hash por artículo determinista y sensible al contenido', () => {
    const a = segmentarArticulos(TEXTO).articulos[0].sha256;
    expect(segmentarArticulos(TEXTO).articulos[0].sha256).toBe(a);
    expect(segmentarArticulos(TEXTO.replace('primer', 'PRIMER')).articulos[0].sha256).not.toBe(a);
  });
});

describe('QA', () => {
  const informe = (texto: string, tipo: 'LAW' | 'JUDGMENT' = 'LAW') => qaTexto({ extracted_text: texto, text_sha256: h(texto), document_type: tipo, source_domain: 'x.example' }, segmentarArticulos(texto));
  const falla = (r: ReturnType<typeof informe>, id: string) => r.chequeos.find((c) => c.id === id)!.ok === false;
  it('mojibake y ruido son BLOCKER; sin artículos en una ley es BLOCKER, en una sentencia no', () => {
    expect(falla(informe('ARTÃ­CULO 1.- texto con codificaciÃ³n rota de la ley que se pegó mal aquí mismo'), 'ENCODING')).toBe(true);
    expect(informe('ARTÃ­CULO 1.- texto con codificaciÃ³n rota').apto_para_clo).toBe(false);
    expect(informe('@@@ ### %%% 12345 ;;; ... --- ||| ### @@@ ### 99999 %%% ;;; ... ---').apto_para_clo).toBe(false);
    expect(falla(informe('Texto de una ley sin ningún encabezado de artículo, solo párrafos corridos de prueba.'), 'ARTICLES_DETECTED')).toBe(true);
    expect(falla(informe('Sentencia de prueba sin artículos, solo considerandos de prueba para el caso.', 'JUDGMENT'), 'ARTICLES_DETECTED')).toBe(false);
  });
  it('saltos y repetidos de numeración son WARNING (el CLO decide), no bloquean', () => {
    const r = informe('ARTÍCULO 1.- Uno uno uno uno. ARTÍCULO 3.- Tres tres tres tres. ARTÍCULO 3.- Tres otra vez otra vez.');
    expect(falla(r, 'SEQUENCE_CONTINUOUS')).toBe(true);
    expect(falla(r, 'NO_DUPLICATE_NUMBERS')).toBe(true);
    expect(r.apto_para_clo).toBe(true);
  });
  it('detecta material sintético', () => {
    expect(falla(informe(TEXTO), 'FIXTURE')).toBe(true);
  });
});

describe('lote: fuente verificada → CLO_PENDING; nada queda autoritativo', () => {
  const lote = procesarLote([{ archivo: 'a.json', contenido: pkg() }], [], { now: AHORA });
  const c = lote.candidatos[0];
  it('llega a CLO_PENDING con hoja para el CLO, marcado como fixture, y el registro queda en HUMAN_VERIFICATION', () => {
    expect(c.estado).toBe('CLO_PENDING');
    expect(c.fixture).toBe(true);
    expect(c.articulos).toHaveLength(3);
    expect(lote.records[0]).toMatchObject({ ingestion_state: 'HUMAN_VERIFICATION', verification_state: 'PENDING_VERIFICATION', approvals: [] });
    expect(lote.hojas[c.candidate_id]).toMatch(/Esta hoja no aprueba nada/);
    expect(lote.hojas[c.candidate_id]).toContain('- [ ] V4');
  });
  it('invariantes de tipo: authoritative=false, vigencia UNKNOWN, verificación pendiente', () => {
    const x: CandidatoStaging = c;
    expect([x.authoritative, x.vigencia, x.verification]).toEqual([false, 'UNKNOWN', 'PENDING_VERIFICATION']);
  });
  it('la automatización NO puede dar V4/V5/AVAILABLE: solo una persona con aprobación', () => {
    const rec = lote.records[0];
    const sig = avanzar(rec, 'V4', { kind: 'AUTOMATION', name: 'corpus-staging' });
    expect(sig).toEqual({ ok: false, motivo: 'REQUIERE_ACTOR_HUMANO' });
    expect(avanzar(rec, 'V4', { kind: 'AGENT', name: 'bot' }, { approver: 'bot', date: '2026-10-24', stage: 'V4' })).toEqual({ ok: false, motivo: 'REQUIERE_ACTOR_HUMANO' });
  });
  it('fuente no verificada → SOURCE_HOLD (no llega al CLO) y se queda en QA', () => {
    const l = procesarLote([{ archivo: 'b.json', contenido: pkg({ source_url: 'https://example.invalid/x.pdf', source_domain: 'example.invalid' }) }], [], { now: AHORA });
    expect(l.candidatos[0].estado).toBe('SOURCE_HOLD');
    expect(l.records[0].ingestion_state).toBe('QA');
  });
  it('QA con BLOCKER → QA_FAILED (no llega al CLO)', () => {
    const t = 'Ley sin encabezados de artículo, solo párrafos corridos de prueba suficientemente largos para pasar el mínimo.';
    const l = procesarLote([{ archivo: 'c.json', contenido: pkg({ extracted_text: t, text_sha256: h(t) }) }], [], { now: AHORA });
    expect(l.candidatos[0].estado).toBe('QA_FAILED');
    expect(l.records[0].ingestion_state).toBe('QA');
  });
  it('hash alterado → rechazado antes de segmentar; duplicado exacto → no reprocesa', () => {
    expect(procesarLote([{ archivo: 'd.json', contenido: pkg({ extracted_text: TEXTO + ' x' }) }], [], { now: AHORA }).items[0].importacion).toBe('REJECTED');
    const dos = procesarLote([{ archivo: 'e.json', contenido: pkg() }, { archivo: 'f.json', contenido: pkg() }], [], { now: AHORA });
    expect(dos.items.map((i) => i.importacion)).toEqual(['IMPORTED_SOURCE_VALIDATED', 'DUPLICATE']);
    expect(dos.candidatos).toHaveLength(1);
  });
  it('un texto nuevo del mismo documento crea la versión 2 (append-only) y la versión 1 no se toca', () => {
    const t2 = TEXTO.replace('primer', 'PRIMER');
    const l = procesarLote([{ archivo: 'g.json', contenido: pkg({ extracted_text: t2, text_sha256: h(t2) }) }], lote.records, { now: AHORA });
    expect(l.records.map((r) => r.version)).toEqual([1, 2]);
    expect(l.records[0]).toEqual(lote.records[0]);
  });
  it('determinista', () => {
    expect(JSON.stringify(procesarLote([{ archivo: 'a.json', contenido: pkg() }], [], { now: AHORA }))).toBe(JSON.stringify(lote));
  });
});

describe('jurisprudencia: corpus separado de la legislación', () => {
  it('un paquete JUDGMENT nunca produce candidato de legislación ni registro de corpus', () => {
    const t = 'SENTENCIA SINTÉTICA de prueba. La sala ficticia resuelve un caso ficticio con fundamentos ficticios para la prueba.';
    const l = procesarLote([{ archivo: 'j.json', contenido: pkg({ document_type: 'JUDGMENT', document_name: 'Sentencia Sintética', extracted_text: t, text_sha256: h(t) }) }], [], { now: AHORA });
    expect(l.candidatos).toEqual([]);
    expect(l.records).toEqual([]);
    expect(l.items[0]).toMatchObject({ destino: 'JURISPRUDENCE_RECORD' });
    expect(l.items[0].jurisprudencia_id).toMatch(/^JUR_/);
  });
});

describe('CLI process-batch', () => {
  it('procesa el lote sintético del repositorio y escribe SOLO dentro de --out', () => {
    const out = mkdtempSync(join(tmpdir(), 'staging-'));
    const r = main(['tools/corpus/examples/batch-synthetic', '--out', out]);
    expect(r.codigo).toBe(1); // hay un paquete con hash alterado a propósito
    expect(readdirSync(out).sort()).toEqual(['BATCH_REPORT.json', 'BATCH_REPORT.md', 'candidates', 'records.json', 'worksheets']);
    expect(readdirSync(join(out, 'candidates'))).toHaveLength(1);
    const reporte = readFileSync(join(out, 'BATCH_REPORT.md'), 'utf8');
    expect(reporte).toMatch(/SOURCE_HOLD: 1/);
    expect(reporte).toMatch(/jurisprudencia \(corpus aparte\): 1/);
    expect(reporte).toMatch(/rechazados: 1/);
  });
  it('reejecutar el mismo lote no duplica (idempotente)', () => {
    const out = mkdtempSync(join(tmpdir(), 'staging-'));
    main(['tools/corpus/examples/batch-synthetic', '--out', out]);
    const antes = readFileSync(join(out, 'records.json'), 'utf8');
    main(['tools/corpus/examples/batch-synthetic', '--out', out]);
    expect(readFileSync(join(out, 'records.json'), 'utf8')).toBe(antes);
  });
  it('entrada inexistente o ausente → código 2', () => {
    expect(main([]).codigo).toBe(2);
    expect(main(['no/existe']).codigo).toBe(2);
    expect(existsSync('no/existe')).toBe(false);
  });
  it('ni el módulo de staging ni el CLI tocan red, base de datos o entorno', () => {
    for (const f of ['lib/legal-os/corpus-factory/staging.ts', 'tools/corpus/process-batch.ts']) {
      expect(readFileSync(join(__dirname, '..', f), 'utf8'), f).not.toMatch(/\bfetch\s*\(|supabase|process\.env|node:https?|ai-gateway/i);
    }
  });
});
