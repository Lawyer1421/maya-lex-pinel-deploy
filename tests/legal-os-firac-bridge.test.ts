import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FiracSkillSchema, type FiracSkill } from '@/lib/legal-os/skills/firac-schema';
import { crearPuenteCorpus, esEvidenciaSellada, esResultadoDelPuente, esSellado, type Recuperador } from '@/lib/legal-os/skills/corpus-bridge';
import { evaluarFirac, FiracEvaluationError } from '@/lib/legal-os/skills/firac-evaluator';
import { fragmentoNorma, puenteDePrueba, recuperadorFeliz } from './helpers/firac-puente';

const DIR = join(process.cwd(), 'tests', 'fixtures', 'skills');
const plantilla = (n: string): FiracSkill => FiracSkillSchema.parse(JSON.parse(readFileSync(join(DIR, `${n}.json`), 'utf8')));
const hojas = (s: FiracSkill) => s.firac.rules.flatMap((r) => r.elements ?? [r]);

describe('puente del corpus: verificación por base', () => {
  it('con el corpus respaldando todo, cada base queda VERIFICADA y cada casilla recibe evidencia sellada PRIMARY', async () => {
    const t = plantilla('mercantil');
    const r = await puenteDePrueba().verificarPlantilla(t);
    expect(esResultadoDelPuente(r)).toBe(true);
    expect(r.snapshot_id).toBe('snap-prueba-1');
    for (const h of hojas(t)) {
      const ver = r.verificaciones.filter((v) => v.casilla === h.id);
      expect(ver.every((v) => v.estado === 'VERIFICADA' && v.verification === 'VERIFICADO_CORPUS'), h.id).toBe(true);
      expect(r.evidencia[h.id].length).toBeGreaterThan(0);
      for (const e of r.evidencia[h.id]) { expect(esEvidenciaSellada(e)).toBe(true); expect(e.source_role).toBe('PRIMARY'); expect(e.snapshot_id).toBe('snap-prueba-1'); }
    }
  });

  it('numerales y «y siguientes» se listan como alcance NO verificado y nunca se afirman', async () => {
    const r = await puenteDePrueba().verificarPlantilla(plantilla('notarial'));
    const comp = r.verificaciones.find((v) => v.casilla === 'NOT-COMPARECENCIA')!;
    expect(comp.articulos_verificados).toEqual(['16 num. 1', '29 num. 1', '29 num. 2']);
    expect(comp.alcance_no_verificado.join(' ')).toMatch(/numeral 1 del art\. 16/);
    const adm = (await puenteDePrueba().verificarPlantilla(plantilla('mercantil'))).verificaciones.find((v) => v.casilla === 'MER-ADMIN')!;
    expect(adm.alcance_no_verificado.join(' ')).toMatch(/y siguientes/);
  });

  it('fail-closed: sin fragmentos, sin PRIMARY vigente o con el recuperador caído, la base NO se verifica ni da evidencia', async () => {
    const t = plantilla('mercantil');
    const casos: Array<[string, Recuperador]> = [
      ['vacío', async () => []],
      ['no vigente', async ({ instrumentId, articulo }) => [fragmentoNorma(instrumentId, articulo, { es_norma_vigente: false })]],
      ['vigencia nula', async ({ instrumentId, articulo }) => [fragmentoNorma(instrumentId, articulo, { es_norma_vigente: null })]],
      ['otro artículo', async ({ instrumentId }) => [fragmentoNorma(instrumentId, '999')]],
      ['otro instrumento', async ({ articulo }) => [fragmentoNorma('CODIGO_PROCESAL_CIVIL', articulo)]],
      ['doctrina', async ({ instrumentId, articulo }) => [fragmentoNorma(instrumentId, articulo, { fuente_tipo: 'doctrina' })]],
      ['jurisdicción ajena', async ({ instrumentId, articulo }) => [fragmentoNorma(instrumentId, articulo, { jurisdiccion: 'GT' })]],
      ['sin id', async ({ instrumentId, articulo }) => [fragmentoNorma(instrumentId, articulo, { id: undefined })]],
      ['hash alterado', async ({ instrumentId, articulo }) => [fragmentoNorma(instrumentId, articulo, { hash: 'deadbeef' })]],
      ['recuperador caído', async () => { throw new Error('caído'); }],
    ];
    for (const [nombre, rec] of casos) {
      const r = await crearPuenteCorpus(rec, 'snap').verificarPlantilla(t);
      expect(r.verificaciones.some((v) => v.verification !== null), nombre).toBe(false);
      expect(Object.keys(r.evidencia), nombre).toEqual([]);
    }
  });

  it('no se fía de un rol_evidencia declarado en el fragmento: se recalcula', async () => {
    const rec: Recuperador = async ({ instrumentId, articulo }) => [fragmentoNorma(instrumentId, articulo, { rol_evidencia: 'PRIMARY', fuente_tipo: 'doctrina' })];
    expect(Object.keys((await crearPuenteCorpus(rec, 's').verificarPlantilla(plantilla('mercantil'))).evidencia)).toEqual([]);
  });

  it('una base con varios artículos solo se verifica si se verifican todos (PARCIAL no da evidencia)', async () => {
    const rec: Recuperador = async ({ instrumentId, articulo }) => (articulo === '67' ? [] : [fragmentoNorma(instrumentId, articulo)]);
    const r = await crearPuenteCorpus(rec, 's').verificarPlantilla(plantilla('mercantil'));
    const v = r.verificaciones.find((x) => x.casilla === 'MER-RAZON-SOCIAL')!;
    expect(v.estado).toBe('PARCIAL');
    expect(v.verification).toBeNull();
    expect(v.articulos_verificados).toEqual(['66']);
    expect(v.articulos_sin_verificar).toEqual(['67']);
    expect(r.evidencia['MER-RAZON-SOCIAL']).toBeUndefined();
    expect(r.evidencia['MER-SOCIOS']).toBeDefined();
  });

  it('una casilla con varias bases exige TODAS verificadas (facultades: Notariado + CPC)', async () => {
    const rec: Recuperador = async ({ instrumentId, articulo }) => (instrumentId === 'CODIGO_PROCESAL_CIVIL' ? [] : [fragmentoNorma(instrumentId, articulo)]);
    const r = await crearPuenteCorpus(rec, 's').verificarPlantilla(plantilla('notarial'));
    expect(r.evidencia['NOT-FACULTADES']).toBeUndefined();
    expect(r.evidencia['NOT-IDENTIDAD']).toBeDefined();
  });

  it('base sin artículos o con instrumento fuera de la lista cerrada: no verificable', async () => {
    const t = structuredClone(plantilla('mercantil'));
    t.firac.rules[2].basis[0].articles = [];
    t.firac.rules[3].basis[0].instrument = 'Ley Inventada';
    const r = await puenteDePrueba().verificarPlantilla(t);
    expect(r.verificaciones.find((v) => v.casilla === 'MER-CAPITAL')!.estado).toBe('SIN_ARTICULOS');
    expect(r.verificaciones.find((v) => v.casilla === 'MER-EXHIBICION')!.estado).toBe('INSTRUMENTO_NO_MAPEADO');
  });

  it('exige un snapshot_id', () => {
    expect(() => crearPuenteCorpus(recuperadorFeliz, '  ')).toThrow();
  });
});

describe('puente del corpus: nadie más puede fabricar el respaldo', () => {
  it('lo que sale del puente está congelado y sellado; una copia o un literal NO', async () => {
    const r = await puenteDePrueba().verificarPlantilla(plantilla('mercantil'));
    const ev = r.evidencia['MER-SOCIOS'][0];
    expect(esSellado(ev)).toBe(true);
    expect(Object.isFrozen(ev)).toBe(true);
    expect(Object.isFrozen(r)).toBe(true);
    for (const copia of [{ ...ev }, structuredClone(ev), JSON.parse(JSON.stringify(ev)), { chunk_id: 'x', source_role: 'PRIMARY', snapshot_id: 's' }]) expect(esSellado(copia)).toBe(false);
    expect(esResultadoDelPuente(JSON.parse(JSON.stringify(r)))).toBe(false);
    expect(() => { (ev as { chunk_id: string }).chunk_id = 'otro'; }).toThrow();
  });

  it('el evaluador rechaza evidencia que no esté sellada (aunque tenga la forma correcta)', async () => {
    const t = plantilla('mercantil');
    const falsa = { 'MER-SOCIOS': [{ chunk_id: 'inventado', source_role: 'PRIMARY' as const, snapshot_id: 's' }] };
    const cod = (f: () => unknown) => { try { f(); } catch (e) { return (e as FiracEvaluationError).codigo; } return null; };
    // @ts-expect-error: TypeScript ya impide pasar evidencia sin sello
    expect(cod(() => evaluarFirac({ template: t, facts: { 'MER-SOCIOS': { satisfied: true } }, evidence: falsa }))).toBe('EVIDENCIA_NO_SELLADA');
    const real = await puenteDePrueba().verificarPlantilla(t);
    const copiada = { 'MER-SOCIOS': real.evidencia['MER-SOCIOS'].map((e) => ({ ...e })) };
    expect(cod(() => evaluarFirac({ template: t, facts: { 'MER-SOCIOS': { satisfied: true } }, evidence: copiada }))).toBe('EVIDENCIA_NO_SELLADA');
  });

  it('de punta a punta: puente → evaluador deja las casillas respaldadas en MET con la evidencia de la instantánea', async () => {
    const t = plantilla('procesal_civil');
    const puente = await puenteDePrueba().verificarPlantilla(t);
    const facts = Object.fromEntries(hojas(t).map((h) => [h.id, { satisfied: true }]));
    const r = evaluarFirac({ template: t, facts, evidence: puente.evidencia });
    expect(r.skill.firac.conclusion.verdict).toBe('CUMPLE');
    expect(hojas(r.skill).every((h) => h.status === 'MET' && h.evidence.every((e) => e.snapshot_id === 'snap-prueba-1'))).toBe(true);
    // si el corpus no respalda la norma, los mismos hechos no resuelven nada
    const sin = await crearPuenteCorpus(async () => [], 's').verificarPlantilla(t);
    const r2 = evaluarFirac({ template: t, facts, evidence: sin.evidencia });
    expect(r2.skill.firac.conclusion.verdict).toBe('NO_CONCLUYENTE');
  });

  it('el esquema no admite «verificado contra el corpus» como valor almacenable en una plantilla', () => {
    const o = JSON.parse(readFileSync(join(DIR, 'mercantil.json'), 'utf8'));
    o.firac.rules[0].basis[0].verification = 'VERIFICADO_CORPUS';
    expect(FiracSkillSchema.safeParse(o).success).toBe(false);
  });
});
