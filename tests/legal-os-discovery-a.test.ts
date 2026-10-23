import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { InstrumentRecordSchema } from '@/lib/legal-os/corpus-factory/schema';

const RAIZ = join(__dirname, '..');
const datos = JSON.parse(readFileSync(join(RAIZ, 'docs', 'launch', 'discovery', 'DISCOVERY_A_ABSENT_INSTRUMENTS.json'), 'utf8')) as Array<{
  record: unknown;
  discovery: { discovery_only: boolean; status: string; checked_on: string; official_url_fetch: null | { date: string; http_status: number; content_type: string }; leads: Array<{ url: string; fetched: boolean }> };
}>;

describe('Discovery A: instrumentos ausentes', () => {
  it('cubre los 7 instrumentos ausentes del inventario', () => {
    expect(datos.map((d) => (d.record as { id: string }).id).sort()).toEqual([
      'HN_CODIGO_COMERCIO_D73_1950', 'HN_CODIGO_NINEZ_ADOLESCENCIA_D73_96', 'HN_DECRETO_124_92', 'HN_DECRETO_284_2013', 'HN_DECRETO_31_2015',
      'HN_DECRETO_35_2013', 'HN_LEY_ORGANIZACION_ATRIBUCIONES_TRIBUNALES',
    ]);
  });
  it('todo registro cumple el esquema y es candidato sin verificar', () => {
    for (const d of datos) {
      const r = InstrumentRecordSchema.parse(d.record);
      expect(r.verification_state).toBe('PENDING_VERIFICATION');
      expect(r.ingestion_state).toBe('DISCOVER');
      expect(r.approvals).toEqual([]);
    }
  });
  it('todo official_url no nulo tiene fecha y estado HTTP de la consulta; sin consulta no hay URL, hash ni tier', () => {
    for (const d of datos) {
      const r = InstrumentRecordSchema.parse(d.record);
      if (r.official_url !== null) {
        expect(d.discovery.official_url_fetch?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(d.discovery.official_url_fetch?.http_status).toBe(200);
      } else {
        expect(d.discovery.official_url_fetch).toBeNull();
        expect(r.pdf_sha256).toBeNull();
        expect(r.text_sha256).toBeNull();
        expect(r.source_tier).toBeNull();
      }
    }
  });
  it('las pistas no consultadas no se presentan como obtenidas', () => {
    for (const d of datos) for (const l of d.discovery.leads) expect(l.fetched).toBe(false);
  });
});
