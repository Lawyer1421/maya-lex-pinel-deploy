import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  ETAPAS_INGESTA, InstrumentRecordSchema, MATERIAS_LAUNCH_CORE, avanzar, estaDisponible, estadoDeMateria, estadoDeRegistro, generarMatriz, matrizAMarkdown,
  registrarVersion, registroVacio, siguienteEtapa, type EtapaIngesta, type InstrumentRecord,
} from '@/lib/legal-os/corpus-factory';

const RAIZ = join(__dirname, '..');
const humano = { kind: 'HUMAN' as const, name: 'CLO Prueba' };
const agente = { kind: 'AGENT' as const, name: 'corpus-agent' };
const H1 = 'a'.repeat(64);
const H2 = 'b'.repeat(64);

function llevarHasta(destino: EtapaIngesta, r = registroVacio({ id: 'X', title: 'X' })): InstrumentRecord {
  let cur = r;
  while (cur.ingestion_state !== destino) {
    const sig = siguienteEtapa(cur.ingestion_state)!;
    const aprobacion = sig === 'V4' || sig === 'V5' || sig === 'AVAILABLE' ? { approver: 'CLO Prueba', date: '2026-10-23', stage: sig } : undefined;
    const res = avanzar(cur, sig, humano, aprobacion);
    if (!res.ok) throw new Error(`no avanzó a ${sig}: ${res.motivo}`);
    cur = res.valor;
  }
  return cur;
}

describe('schema', () => {
  it('el registro vacío es todo UNKNOWN/null: nada inventado', () => {
    const r = registroVacio({ id: 'X', title: 'Instrumento X' });
    expect(r).toMatchObject({ decree: 'UNKNOWN', gaceta_number: 'UNKNOWN', gaceta_date: 'UNKNOWN', official_url: null, pdf_sha256: null, text_sha256: null, source_tier: null, verification_state: 'UNVERIFIED', ingestion_state: 'DISCOVER', presence: 'UNKNOWN' });
  });
  it('rechaza hashes mal formados, tiers fuera de 1–5 y fechas no ISO', () => {
    const base = registroVacio({ id: 'X', title: 'X' });
    expect(InstrumentRecordSchema.safeParse({ ...base, text_sha256: 'abc' }).success).toBe(false);
    expect(InstrumentRecordSchema.safeParse({ ...base, source_tier: 6 }).success).toBe(false);
    expect(InstrumentRecordSchema.safeParse({ ...base, gaceta_date: '23/10/2026' }).success).toBe(false);
    expect(InstrumentRecordSchema.safeParse({ ...base, text_sha256: H1, source_tier: 1 }).success).toBe(true);
  });
  it('cubre todos los campos del descubrimiento', () => {
    const claves = Object.keys(registroVacio({ id: 'X', title: 'X' }));
    for (const k of ['country', 'jurisdiction', 'matter', 'title', 'decree', 'publication', 'gaceta_number', 'gaceta_date', 'effective_date', 'official_url', 'pdf_sha256', 'text_sha256', 'source', 'source_tier', 'articles', 'reforms', 'derogations', 'interpretations', 'constitutional_effects', 'version', 'verification_state', 'ingestion_state']) {
      expect(claves, k).toContain(k);
    }
  });
});

describe('máquina de estados', () => {
  it('el orden de etapas es el del mandato', () => {
    expect(ETAPAS_INGESTA[0]).toBe('DISCOVER');
    expect(ETAPAS_INGESTA.at(-1)).toBe('AVAILABLE');
    expect(ETAPAS_INGESTA).toHaveLength(19);
    expect(siguienteEtapa('AVAILABLE')).toBeNull();
  });
  it('solo avanza un paso: no salta ni retrocede', () => {
    const r = registroVacio({ id: 'X', title: 'X' });
    expect(avanzar(r, 'HASH', humano)).toEqual({ ok: false, motivo: 'NO_ES_SIGUIENTE_PASO' });
    expect(avanzar(r, 'DISCOVER', humano)).toEqual({ ok: false, motivo: 'NO_ES_SIGUIENTE_PASO' });
    const ok = avanzar(r, 'DOWNLOAD', agente);
    expect(ok.ok && ok.valor.ingestion_state).toBe('DOWNLOAD');
  });
  it('las etapas automáticas las puede ejecutar una automatización', () => {
    const r = llevarHasta('QA');
    const res = avanzar(r, 'HUMAN_VERIFICATION', { kind: 'AUTOMATION', name: 'cron' });
    expect(res.ok && res.valor.verification_state).toBe('PENDING_VERIFICATION');
  });
  it('V4, V5 y AVAILABLE: un agente o automatización jamás, aunque traiga aprobación', () => {
    const hv = llevarHasta('HUMAN_VERIFICATION');
    const apr = { approver: 'Agente', date: '2026-10-23', stage: 'V4' as const };
    expect(avanzar(hv, 'V4', agente, apr)).toEqual({ ok: false, motivo: 'REQUIERE_ACTOR_HUMANO' });
    expect(avanzar(hv, 'V4', { kind: 'AUTOMATION', name: 'x' }, apr)).toEqual({ ok: false, motivo: 'REQUIERE_ACTOR_HUMANO' });
    const v5 = llevarHasta('V4', hv);
    expect(avanzar(v5, 'V5', agente, { ...apr, stage: 'V5' })).toEqual({ ok: false, motivo: 'REQUIERE_ACTOR_HUMANO' });
    const golden = llevarHasta('GOLDEN_TEST');
    expect(avanzar(golden, 'AVAILABLE', agente, { ...apr, stage: 'AVAILABLE' })).toEqual({ ok: false, motivo: 'REQUIERE_ACTOR_HUMANO' });
  });
  it('un humano sin registro de aprobación, o con uno inválido, tampoco', () => {
    const hv = llevarHasta('HUMAN_VERIFICATION');
    expect(avanzar(hv, 'V4', humano)).toEqual({ ok: false, motivo: 'REQUIERE_APROBACION' });
    expect(avanzar(hv, 'V4', humano, { approver: '  ', date: '2026-10-23', stage: 'V4' })).toEqual({ ok: false, motivo: 'APROBACION_INVALIDA' });
    expect(avanzar(hv, 'V4', humano, { approver: 'CLO', date: '23-10-2026', stage: 'V4' })).toEqual({ ok: false, motivo: 'APROBACION_INVALIDA' });
    expect(avanzar(hv, 'V4', humano, { approver: 'CLO', date: '2026-10-23', stage: 'V5' })).toEqual({ ok: false, motivo: 'APROBACION_INVALIDA' });
  });
  it('con humano + aprobación válida sube a V4 y deja la aprobación auditada; el original no cambia', () => {
    const hv = llevarHasta('HUMAN_VERIFICATION');
    const res = avanzar(hv, 'V4', humano, { approver: 'CLO Prueba', date: '2026-10-23', stage: 'V4' });
    expect(res.ok && res.valor).toMatchObject({ verification_state: 'V4', ingestion_state: 'V4', approvals: [{ stage: 'V4' }] });
    expect(hv.approvals).toEqual([]);
    expect(hv.verification_state).toBe('PENDING_VERIFICATION');
  });
  it('un registro rechazado no avanza', () => {
    const r = { ...llevarHasta('QA'), verification_state: 'REJECTED' as const };
    expect(avanzar(r, 'HUMAN_VERIFICATION', humano)).toEqual({ ok: false, motivo: 'VERIFICACION_RECHAZADA' });
  });
  it('AVAILABLE solo tras pasar por todas las etapas humanas con aprobación', () => {
    const fin = llevarHasta('AVAILABLE');
    expect(fin.approvals.map((a) => a.stage)).toEqual(['V4', 'V5', 'AVAILABLE']);
    expect(estaDisponible(fin)).toBe(true);
    expect(avanzar(fin, 'AVAILABLE', humano)).toEqual({ ok: false, motivo: 'ESTADO_TERMINAL' });
    // Un registro que dice AVAILABLE sin aprobaciones NO cuenta como disponible.
    expect(estaDisponible({ ...fin, approvals: [] })).toBe(false);
    expect(estaDisponible({ ...fin, verification_state: 'PENDING_VERIFICATION' })).toBe(false);
  });
});

describe('versiones append-only y jerarquía de fuentes', () => {
  const v1 = { ...registroVacio({ id: 'LEY', title: 'Ley' }), text_sha256: H1, source_tier: 1 as const };
  it('un hash nuevo crea otra versión sin tocar la anterior', () => {
    const res = registrarVersion([v1], { ...v1, text_sha256: H2 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.valor).toHaveLength(2);
    expect(res.valor[0]).toBe(v1);
    expect(res.valor[1]).toMatchObject({ version: 2, text_sha256: H2, ingestion_state: 'DISCOVER', verification_state: 'UNVERIFIED', approvals: [] });
  });
  it('el mismo hash es duplicado y no se registra', () => {
    expect(registrarVersion([v1], { ...v1 })).toEqual({ ok: false, motivo: 'DUPLICADO_EXACTO' });
  });
  it('una fuente de rango inferior (o sin tier) no reemplaza a una oficial', () => {
    expect(registrarVersion([v1], { ...v1, text_sha256: H2, source_tier: 5 })).toEqual({ ok: false, motivo: 'FUENTE_DE_RANGO_INFERIOR' });
    expect(registrarVersion([v1], { ...v1, text_sha256: H2, source_tier: null })).toEqual({ ok: false, motivo: 'FUENTE_DE_RANGO_INFERIOR' });
  });
  it('una fuente igual o superior sí se registra; sin hash o de otro instrumento no', () => {
    const t2 = { ...v1, source_tier: 2 as const };
    expect(registrarVersion([t2], { ...t2, text_sha256: H2, source_tier: 1 }).ok).toBe(true);
    expect(registrarVersion([t2], { ...t2, text_sha256: H2 }).ok).toBe(true);
    expect(registrarVersion([v1], { ...v1, text_sha256: null })).toEqual({ ok: false, motivo: 'TEXTO_SIN_HASH' });
    expect(registrarVersion([v1], { ...v1, id: 'OTRA', text_sha256: H2 })).toEqual({ ok: false, motivo: 'ID_DISTINTO' });
  });
  it('cuando no había fuente con tier, una oficial puede entrar', () => {
    const sinTier = { ...v1, source_tier: null };
    expect(registrarVersion([sinTier], { ...v1, text_sha256: H2 }).ok).toBe(true);
  });
});

describe('matriz de brechas', () => {
  const presente = (id: string, matter: InstrumentRecord['matter'], extra: Partial<InstrumentRecord> = {}) => registroVacio({ id, title: id, matter, presence: 'PRESENT', ...extra });
  it('estados por registro', () => {
    expect(estadoDeRegistro(registroVacio({ id: 'a', title: 'a', presence: 'ABSENT_VERIFIED' }))).toBe('MISSING');
    expect(estadoDeRegistro(registroVacio({ id: 'a', title: 'a' }))).toBe('PENDING_VERIFICATION');
    expect(estadoDeRegistro(presente('a', 'CIVIL'))).toBe('PARTIAL');
    expect(estadoDeRegistro(presente('a', 'CIVIL', { outdated: true }))).toBe('OUTDATED');
    expect(estadoDeRegistro(llevarHasta('AVAILABLE', presente('a', 'CIVIL')))).toBe('AVAILABLE');
  });
  it('AVAILABLE no se alcanza por declaración: ingestion_state AVAILABLE sin verificación humana queda PARTIAL', () => {
    const falso = { ...presente('a', 'CIVIL'), ingestion_state: 'AVAILABLE' as const, verification_state: 'V5' as const };
    expect(estadoDeRegistro(falso)).toBe('PARTIAL');
  });
  it('agregación por materia', () => {
    expect(estadoDeMateria([])).toBe('PENDING_VERIFICATION');
    expect(estadoDeMateria(['AVAILABLE', 'AVAILABLE'])).toBe('AVAILABLE');
    expect(estadoDeMateria(['AVAILABLE', 'MISSING'])).toBe('PARTIAL');
    expect(estadoDeMateria(['MISSING', 'MISSING'])).toBe('MISSING');
    expect(estadoDeMateria(['PARTIAL', 'OUTDATED'])).toBe('OUTDATED');
    expect(estadoDeMateria(['PENDING_VERIFICATION', 'PENDING_VERIFICATION'])).toBe('PENDING_VERIFICATION');
  });
  it('genera una fila por cada materia del launch-core, también sin inventario', () => {
    const m = generarMatriz([presente('c', 'CIVIL')]);
    expect(m.map((f) => f.materia)).toEqual([...MATERIAS_LAUNCH_CORE]);
    expect(m.find((f) => f.materia === 'CIVIL')?.estado).toBe('PARTIAL');
    expect(m.find((f) => f.materia === 'AML')?.estado).toBe('PENDING_VERIFICATION');
    expect(matrizAMarkdown(m, 'x.json')).toMatch(/Resumen: AVAILABLE=0/);
  });
});

describe('semilla del inventario', () => {
  const seed = z.object({ records: z.array(InstrumentRecordSchema) }).passthrough().parse(JSON.parse(readFileSync(join(RAIZ, 'docs/launch/data/corpus-seed.json'), 'utf8')));
  const inv = JSON.parse(readFileSync(join(RAIZ, 'docs/corpus/MAYALEX_CORPUS_MASTER_INVENTORY_V1.json'), 'utf8'));
  it('contiene exactamente los instrumentos del inventario y las 7 ausencias verificadas', () => {
    expect(seed.records).toHaveLength(inv.instruments.length + inv.absent_verified.length);
    expect(seed.records.filter((r) => r.presence === 'ABSENT_VERIFIED')).toHaveLength(7);
    for (const i of inv.instruments) {
      const r = seed.records.find((x) => x.id === i.canonical_id)!;
      expect(r.measures).toEqual({ rows: i.rows ?? null, distinct_articles: i.distinct_articles ?? null });
    }
  });
  it('no inventa: sin Gaceta, URL, hashes, tier ni verificación; nada AVAILABLE', () => {
    for (const r of seed.records) {
      expect(r).toMatchObject({ gaceta_number: 'UNKNOWN', gaceta_date: 'UNKNOWN', effective_date: 'UNKNOWN', official_url: null, pdf_sha256: null, text_sha256: null, source_tier: null, verification_state: 'UNVERIFIED', ingestion_state: 'DISCOVER' });
      expect(r.approvals).toEqual([]);
      expect(estadoDeRegistro(r)).not.toBe('AVAILABLE');
    }
  });
  it('el markdown commiteado coincide con el generado', () => {
    const esperado = matrizAMarkdown(generarMatriz(seed.records), 'docs/launch/data/corpus-seed.json');
    expect(readFileSync(join(RAIZ, 'docs/launch/CORPUS_GAP_MATRIX_HN.generated.md'), 'utf8')).toBe(esperado);
  });
  it('Legal OS corpus-factory no importa el gateway', () => {
    for (const f of ['schema', 'pipeline', 'gap-matrix', 'index']) expect(readFileSync(join(RAIZ, 'lib/legal-os/corpus-factory', `${f}.ts`), 'utf8')).not.toMatch(/ai-gateway/);
  });
});
