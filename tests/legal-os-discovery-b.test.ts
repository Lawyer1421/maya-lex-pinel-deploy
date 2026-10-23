import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { InstrumentRecordSchema } from '@/lib/legal-os/corpus-factory/schema';

const doc = JSON.parse(readFileSync(join(__dirname, '..', 'docs', 'launch', 'discovery', 'DISCOVERY_B_PENDING_MATTERS.json'), 'utf8'));
const MATERIAS = ['ADMINISTRATIVE', 'CUSTOMS', 'BANKING', 'AML', 'PROPERTY', 'TAX'];

describe('Discovery B (materias pendientes)', () => {
  it('todo registro cumple el esquema del Corpus Factory y cubre las materias pedidas', () => {
    expect(doc.records.length).toBeGreaterThan(0);
    for (const r of doc.records) expect(InstrumentRecordSchema.safeParse(r).success, r.id).toBe(true);
    expect(new Set(doc.records.map((r: { matter: string }) => r.matter))).toEqual(new Set(MATERIAS));
    expect(new Set(doc.records.map((r: { id: string }) => r.id)).size).toBe(doc.records.length);
  });
  it('nada se declara verificado ni con aprobación; todo es discovery-only y sin tier', () => {
    for (const r of doc.records) {
      expect(r.verification_state, r.id).toBe('UNVERIFIED');
      expect(r.ingestion_state).toBe('DISCOVER');
      expect(r.approvals).toEqual([]);
      expect(r.source_tier).toBeNull();
      expect(r.notes.join(' ')).toMatch(/discovery_only: true/);
    }
  });
  it('toda official_url no nula tiene fecha, estado HTTP 200 y content-type en fetch_log; sin URL no hay hash', () => {
    const descargas = new Map<string, { date?: string; http_status?: number; content_type?: string }>(
      doc.fetch_log.map((f: { url: string }) => [f.url, f]),
    );
    for (const r of doc.records) {
      if (r.official_url !== null) {
        const f = descargas.get(r.official_url);
        expect(f, `${r.id}: sin entrada en fetch_log`).toBeDefined();
        expect(f?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(f?.http_status).toBe(200);
        expect(f?.content_type).toBeTruthy();
      } else {
        expect(r.pdf_sha256, r.id).toBeNull();
        expect(r.text_sha256, r.id).toBeNull();
      }
    }
  });
  it('los hosts inalcanzables constan como UNREACHABLE con fecha y los datos reportados no están en campos estructurados', () => {
    for (const f of doc.fetch_log) {
      expect(f.result).toBe('UNREACHABLE');
      expect(f.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    for (const r of doc.records) {
      expect([r.decree, r.publication, r.gaceta_number, r.gaceta_date, r.effective_date]).toEqual(['UNKNOWN', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN']);
      expect(r.notes[0]).toMatch(/REPORTED_BY_WEB_SEARCH_UNVERIFIED/);
    }
  });
});
