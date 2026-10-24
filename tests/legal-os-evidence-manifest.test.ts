import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { evaluarManifiesto, procesarManifiestos } from '../lib/legal-os/corpus-factory/evidence-manifest';
import { validarPaquete } from '../lib/legal-os/corpus-factory/official-source-package';
import { main as procesarCli } from '../tools/corpus/process-manifests';

const DIR = path.join(process.cwd(), 'docs/corpus/inbox/2026-10-24-hn-001-tranche-a/manifests');
const cargar = (id: string): Record<string, unknown> => JSON.parse(fs.readFileSync(path.join(DIR, `${id}.json`), 'utf8'));
const IDS = ['HN-001-A01', 'HN-001-A02', 'HN-001-A03', 'HN-001-A04'];

describe('manifiestos de evidencia (Corpus Supply HN-001 / Tramo A)', () => {
  it('los 4 paquetes quedan en NEEDS_SOURCE_BYTES: no autoritativos, vigencia UNKNOWN, sin verificación', () => {
    for (const id of IDS) {
      const e = evaluarManifiesto(cargar(id));
      expect(e.estado).toBe('NEEDS_SOURCE_BYTES');
      expect(e.autoritativo).toBe(false);
      expect(e.vigencia).toBe('UNKNOWN');
      expect(e.verification).toBe('PENDING_VERIFICATION');
      expect(e.faltantes.join(' ')).toMatch(/source_url/);
      expect(e.faltantes.join(' ')).toMatch(/extracted_text/);
    }
  });
  it('el receptor estricto NO se relajó: rechaza los mismos manifiestos por esquema', () => {
    for (const id of IDS) {
      const r = validarPaquete(cargar(id));
      expect(r.estado).toBe('REJECTED');
      if (r.estado === 'REJECTED') expect(r.razones).toContain('ESQUEMA_INVALIDO');
    }
  });
  it('A01: la fecha de Gaceta sigue siendo solo candidata y la discrepancia no se resuelve', () => {
    const e = evaluarManifiesto(cargar('HN-001-A01'));
    expect(e.manifiesto?.gaceta_date).toBe('UNKNOWN');
    expect(e.manifiesto?.gaceta_date_candidate).toBe('1950-02-17');
    expect(e.manifiesto?.gaceta_date_discrepancies.map((d) => d.fecha)).toEqual(['1950-05-01']);
    expect(e.advertencias.join(' ')).toMatch(/DISCREPANCIA SIN RESOLVER/);
    expect(e.manifiesto?.effective_date).toBe('UNKNOWN');
  });
  it('A02: conserva exactamente los 12 artículos declarados y no infiere otros', () => {
    const e = evaluarManifiesto(cargar('HN-001-A02'));
    expect(e.manifiesto?.amended_articles_claimed).toEqual(['14', '15', '18', '157', '169', '189', '193', '210', '222', '224', '226', '228']);
    expect(e.manifiesto?.act_type).toBe('AMENDMENT');
    expect(e.manifiesto?.text_available).toBe(false);
  });
  it('A03 es acto originario y A04 es reforma integral distinta (no se confunden)', () => {
    const a3 = evaluarManifiesto(cargar('HN-001-A03')).manifiesto!;
    const a4 = evaluarManifiesto(cargar('HN-001-A04')).manifiesto!;
    expect(a3.act_type).toBe('ORIGINAL');
    expect(a3.decree).toBe('73-96');
    expect(a4.act_type).toBe('AMENDMENT');
    expect(a4.decree).toBe('35-2013');
    expect(a4.amends).toBe('Decreto 73-96');
    expect(a4.cross_instrument_effects_claimed).toContain('Código Civil');
  });
  it('las fuentes se clasifican contra el registro sin otorgar autoridad', () => {
    const e = evaluarManifiesto(cargar('HN-001-A03'));
    const cedij = e.fuentes.find((f) => /CEDIJ/.test(f.texto));
    expect(cedij?.verificacion).toBe('VERIFIED');
    const sen = evaluarManifiesto(cargar('HN-001-A01')).fuentes.find((f) => /SEN/.test(f.texto));
    expect(sen?.verificacion).toBe('NOT_IN_REGISTRY');
  });
  it('rechaza autoverificación, hash sin bytes y relaciones incoherentes', () => {
    const base = cargar('HN-001-A03');
    expect(evaluarManifiesto({ ...base, verification_state: 'VERIFIED' }).razones).toContain('VERIFICACION_AUTOASIGNADA');
    expect(evaluarManifiesto({ ...base, text_available: false, text_sha256: 'a'.repeat(64) }).razones).toContain('HASH_SIN_BYTES');
    expect(evaluarManifiesto({ ...base, amends: 'Decreto X' }).razones).toContain('RELACION_INCOHERENTE');
    expect(evaluarManifiesto({ ...base, act_type: 'ORIGINAL', amended_articles_claimed: ['1'] }).razones).toContain('RELACION_INCOHERENTE');
    expect(evaluarManifiesto({ package_id: 'X' }).razones).toContain('ESQUEMA_INVALIDO');
  });
  it('genera una hoja CLO por paquete sin casillas marcadas', () => {
    const r = procesarManifiestos(IDS.map((id) => ({ archivo: id, contenido: cargar(id) })));
    expect(Object.keys(r.hojas).sort()).toEqual(IDS);
    for (const h of Object.values(r.hojas)) {
      expect(h).toContain('NEEDS_SOURCE_BYTES');
      expect(h).not.toMatch(/\[x\]/i);
    }
  });
  it('el informe versionado coincide con el regenerado y el módulo no usa red ni base de datos', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'manifests-'));
    procesarCli([DIR, '--out', tmp]);
    const a = JSON.parse(fs.readFileSync(path.join(tmp, 'MANIFEST_REPORT.json'), 'utf8'));
    const b = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'docs/corpus/staging/hn-001-tranche-a/MANIFEST_REPORT.json'), 'utf8'));
    expect(a).toEqual(b);
    const src = fs.readFileSync(path.join(process.cwd(), 'lib/legal-os/corpus-factory/evidence-manifest.ts'), 'utf8');
    expect(src).not.toMatch(/fetch\(|process\.env|supabase|ai-gateway|node:http/i);
  });
});
