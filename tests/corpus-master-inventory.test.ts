import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { todasLasSkillsDeLanzamiento } from '../lib/legal-os/skills/seeds-lanzamiento';

const leer = (f: string): string => fs.readFileSync(path.join(process.cwd(), 'docs/corpus', f), 'utf8');
const inv = JSON.parse(leer('MAYALEX_CORPUS_MASTER_INVENTORY_HN.json'));

describe('inventario maestro del corpus HN (solo lectura)', () => {
  it('declara cero escrituras y cero verificaciones', () => {
    expect(inv.production_writes).toBe(0);
    expect(inv.totales.VERIFIED_humano).toBe(0);
    expect(inv.totales.V4).toBe(0);
    expect(inv.totales.V5).toBe(0);
    expect(inv.totales.clo_approvals_registradas).toBe(0);
  });
  it('los totales por materia y por colección suman las filas totales', () => {
    const t = inv.totales;
    const suma = (o: Record<string, number>): number => Object.values(o).reduce((a, b) => a + b, 0);
    expect(suma(t.por_materia)).toBe(t.filas_biblioteca_vectores);
    expect(suma(t.por_coleccion)).toBe(t.filas_biblioteca_vectores);
  });
  it('ningún instrumento figura como verificado, con V4/V5 ni con aprobación CLO', () => {
    for (const i of inv.instrumentos) {
      expect(i.verification_state).toBe('PENDING_VERIFICATION');
      expect(i.v4_v5).toBe('NONE');
      expect(i.clo_approval).toBe('NONE');
      expect(i.source_url).toBe('UNKNOWN');
    }
    expect(inv.totales.instrumentos_identificados).toBe(inv.instrumentos.length);
  });
  it('los ausentes y descubiertos no están en el Exact Resolver ni vectorizados', () => {
    for (const a of inv.ausentes_verificados) { expect(a.exact_resolver).toBe(false); expect(a.filas).toBe(0); }
    for (const d of inv.descubiertos_sin_filas) expect(d.exact_resolver).toBe(false);
  });
  it('la solicitud de suministro cubre cada P0 del inventario y cita skills reales', () => {
    const req = leer('CORPUS_SUPPLY_REQUEST_HN.md');
    for (let n = 1; n <= 17; n++) expect(req).toContain(`P0-${String(n).padStart(3, '0')}`);
    const ids = new Set(todasLasSkillsDeLanzamiento().map((s) => s.skill_id));
    const citadas = [...req.matchAll(/HN\.[A-Z_]+(?:\.[A-Z_]+)*/g)].map((m) => m[0]);
    expect(citadas.length).toBeGreaterThan(0);
    for (const c of citadas) expect(ids.has(c)).toBe(true);
  });
  it('el inventario en Markdown enlaza el JSON y la solicitud, y no declara vigencia', () => {
    const md = leer('MAYALEX_CORPUS_MASTER_INVENTORY_HN.md');
    expect(md).toContain('CORPUS_SUPPLY_REQUEST_HN.md');
    expect(md).toContain('MAYALEX_CORPUS_MASTER_INVENTORY_HN.json');
    expect(md).not.toMatch(/AVAILABLE_VERIFIED\s*[:=]\s*[1-9]/);
  });
});
