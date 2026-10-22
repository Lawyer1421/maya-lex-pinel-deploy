import { describe, expect, it } from 'vitest';
import { GOLDEN_G1, PROCEDENCIA_G1 } from './golden/gateway-g1-casos';
import { parsearFechaDdMmmAaaa, validarProcedencia, validarProcedenciasGoldenSet } from './golden/procedencia-clo';

/**
 * H3 (dictamen CLO 22-oct-2026): procedencia discriminada del dictamen de cada caso.
 * Tipo 1: CLO_ISSUE_RULING (issue #74, 21-oct-2026), sin requisitos relajados.
 * Tipo 2: CLO_OFFICIAL_SOURCE_RULING (La Gaceta con SHA-256).
 */
const PENAL = 'G1-VIG-CODIGO-PENAL-130-2017';
const HOY = new Date(Date.UTC(2026, 9, 22));
const IDS = GOLDEN_G1.map((c) => c.id);
const penal = GOLDEN_G1.find((c) => c.id === PENAL)!;
const HASH_A = '54f6a4122f8b96a60631deb8c486284ff0744c0d09ea0ed332d8d5d1960ba132';
const HASH_B = '60b5b7865bdb0b868131005429017632fb168e286a1a9dfa5482378e8f58bbdb';

const oficial = (cambios: Record<string, unknown> = {}) => ({
  kind: 'CLO_OFFICIAL_SOURCE_RULING',
  verifiedAt: '22-oct-2026',
  officialSources: [{ publication: 'La Gaceta', number: '34,940', sha256: HASH_A }],
  goldenCaseId: PENAL,
  ...cambios,
});
const validaOficial = (p: unknown, ctx = { fechaCommit: HOY, idsGolden: IDS }) => validarProcedencia(PENAL, penal.clo_ruling_ref, p, ctx);

const issue = (id: string, cambios: Record<string, unknown> = {}) => ({ ...PROCEDENCIA_G1[id], ...cambios });
const CASO7 = 'G1-ART-TRIBUTARIO-214';
const validaIssue = (p: unknown) => {
  const c = GOLDEN_G1.find((x) => x.id === CASO7)!;
  return validarProcedencia(c.id, c.clo_ruling_ref, p, { fechaCommit: HOY, idsGolden: IDS });
};

describe('(a) los siete casos existentes pasan como CLO_ISSUE_RULING, con sus datos intactos', () => {
  const siete = GOLDEN_G1.filter((c) => c.id !== PENAL);
  it('son siete, todos del tipo 1, y el validador no objeta ninguno', () => {
    expect(siete).toHaveLength(7);
    for (const c of siete) {
      expect(PROCEDENCIA_G1[c.id].kind, c.id).toBe('CLO_ISSUE_RULING');
      expect(validarProcedencia(c.id, c.clo_ruling_ref, PROCEDENCIA_G1[c.id], { fechaCommit: HOY, idsGolden: IDS }), c.id).toEqual([]);
    }
  });
  it('su clo_ruling_ref no cambió: conserva fecha, URL del dictamen y código de caso', () => {
    for (const c of siete) {
      expect(c.clo_ruling_ref, c.id).toMatch(/21-oct-2026/);
      expect(c.clo_ruling_ref, c.id).toContain('issuecomment-6313691566');
      expect(c.clo_ruling_ref, c.id).toMatch(/\b[A-E]\d\b|punto 1/);
      expect(c.clo_ruling_ref, c.id).toMatch(/^Dictamen CLO 21-oct-2026, issue #74, /);
      expect(c.clo_ruling_ref, c.id).toMatch(/Confirmado en el prompt PR-G1 del CLO, 21-oct-2026\.$/);
    }
  });
  it('el código de caso declarado aparece literalmente en su clo_ruling_ref', () => {
    for (const c of siete) {
      const p = PROCEDENCIA_G1[c.id];
      if (p.kind !== 'CLO_ISSUE_RULING') throw new Error('inesperado');
      expect(c.clo_ruling_ref, c.id).toContain(p.caseCode === 'punto 1' ? 'punto 1' : `${p.caseCode} (`);
    }
  });
});

describe('(b) el caso Penal pasa como CLO_OFFICIAL_SOURCE_RULING (22-oct-2026, dos Gacetas)', () => {
  it('procedencia literal y válida', () => {
    const p = PROCEDENCIA_G1[PENAL];
    expect(p).toEqual({
      kind: 'CLO_OFFICIAL_SOURCE_RULING',
      verifiedAt: '22-oct-2026',
      officialSources: [
        { publication: 'La Gaceta', number: '34,940', sha256: HASH_A },
        { publication: 'La Gaceta', number: '35,247', sha256: HASH_B },
      ],
      goldenCaseId: PENAL,
      researchProvenance: 'Investigador Fuentes Oficiales HN',
    });
    expect(validaOficial(p)).toEqual([]);
  });
  it('no lleva código #74 ni URL del #74 (el dictamen no pertenece a esa procedencia)', () => {
    expect(penal.clo_ruling_ref).not.toMatch(/issuecomment|issue #74|\b[A-E]\d\b/);
  });
  it('el Golden Set completo valida sin errores', () => {
    expect(validarProcedenciasGoldenSet(GOLDEN_G1, PROCEDENCIA_G1, HOY)).toEqual([]);
  });
  it('con la fecha real del momento (el commit no es anterior) el Golden Set sigue válido', () => {
    expect(validarProcedenciasGoldenSet(GOLDEN_G1, PROCEDENCIA_G1, new Date())).toEqual([]);
  });
});

describe('(c) falla un CLO_OFFICIAL_SOURCE_RULING incompleto o mal formado', () => {
  it('sin fuentes', () => {
    expect(validaOficial(oficial({ officialSources: [] })).join('|')).toMatch(/G1-VIG-CODIGO-PENAL-130-2017: exige al menos 1 fuente oficial/);
    expect(validaOficial(oficial({ officialSources: undefined })).join('|')).toMatch(/al menos 1 fuente/);
  });
  it('una fuente sin número', () => {
    const e = validaOficial(oficial({ officialSources: [{ publication: 'La Gaceta', sha256: HASH_A }] }));
    expect(e.join('|')).toMatch(/officialSources\[0\]\.number/);
  });
  it('sha256 inválido: 63 caracteres, mayúsculas o no hexadecimal', () => {
    for (const malo of [HASH_A.slice(1), HASH_A.toUpperCase(), 'z'.repeat(64), HASH_A + '0', '']) {
      const e = validaOficial(oficial({ officialSources: [{ publication: 'La Gaceta', number: '34,940', sha256: malo }] }));
      expect(e.join('|'), malo).toMatch(/officialSources\[0\]\.sha256 debe tener 64 caracteres hexadecimales en minúscula/);
    }
  });
  it('publication distinto de La Gaceta', () => {
    const e = validaOficial(oficial({ officialSources: [{ publication: 'Diario', number: '34,940', sha256: HASH_A }] }));
    expect(e.join('|')).toMatch(/publication/);
  });
  it('goldenCaseId inexistente, ajeno al caso, o duplicado', () => {
    expect(validaOficial(oficial({ goldenCaseId: 'NO-EXISTE' })).join('|')).toMatch(/goldenCaseId NO-EXISTE no existe en el Golden Set/);
    expect(validaOficial(oficial({ goldenCaseId: undefined })).join('|')).toMatch(/falta goldenCaseId/);
    const duplicadoEnGolden = validaOficial(oficial(), { fechaCommit: HOY, idsGolden: [...IDS, PENAL] });
    expect(duplicadoEnGolden.join('|')).toMatch(/goldenCaseId G1-VIG-CODIGO-PENAL-130-2017 está duplicado en el Golden Set/);
    const copia = oficial();
    const duplicadoEntreProcedencias = validaOficial(oficial(), { fechaCommit: HOY, idsGolden: IDS, todasLasProcedencias: [copia, copia] } as never);
    expect(duplicadoEntreProcedencias.join('|')).toMatch(/duplicado entre las procedencias/);
    const delGolden = validarProcedenciasGoldenSet(GOLDEN_G1, { ...PROCEDENCIA_G1, 'CASO-FANTASMA': oficial({ goldenCaseId: 'CASO-FANTASMA' }) }, HOY);
    expect(delGolden.join('|')).toMatch(/CASO-FANTASMA: procedencia sin caso en el Golden Set/);
  });
  it('un caso sin procedencia falla y el mensaje nombra el caso', () => {
    const { [PENAL]: _fuera, ...sinPenal } = PROCEDENCIA_G1;
    expect(validarProcedenciasGoldenSet(GOLDEN_G1, sinPenal, HOY)).toEqual([`${PENAL}: falta la procedencia (objeto con kind)`]);
  });
});

describe('(d) fechas y researchProvenance', () => {
  it('parsea dd-mmm-aaaa reales y rechaza el resto', () => {
    expect(parsearFechaDdMmmAaaa('22-oct-2026')?.toISOString()).toBe('2026-10-22T00:00:00.000Z');
    for (const mala of ['2026-10-22', '22/10/2026', '22-OCT-2026', '22-octubre-2026', '31-feb-2026', '00-oct-2026', '22-xyz-2026', '', 22, undefined]) {
      expect(parsearFechaDdMmmAaaa(mala), String(mala)).toBeNull();
    }
  });
  it('falla un verifiedAt con formato inválido', () => {
    for (const mala of ['2026-10-22', '31-feb-2026', '22-oct-26', undefined]) {
      expect(validaOficial(oficial({ verifiedAt: mala })).join('|'), String(mala)).toMatch(/verifiedAt debe tener formato dd-mmm-aaaa/);
    }
  });
  it('falla un verifiedAt posterior a la fecha del commit; el mismo día pasa', () => {
    expect(validaOficial(oficial({ verifiedAt: '23-oct-2026' })).join('|')).toMatch(/verifiedAt no puede ser posterior a la fecha del commit/);
    expect(validaOficial(oficial({ verifiedAt: '22-oct-2026' }))).toEqual([]);
    expect(validaOficial(oficial({ verifiedAt: '21-oct-2026' }))).toEqual([]);
  });
  it('un caso cuya única procedencia es researchProvenance falla', () => {
    const soloInvestigador = { kind: 'CLO_OFFICIAL_SOURCE_RULING', researchProvenance: 'Investigador Fuentes Oficiales HN' };
    const e = validaOficial(soloInvestigador).join('|');
    expect(e).toMatch(/al menos 1 fuente oficial/);
    expect(e).toMatch(/verifiedAt/);
    expect(e).toMatch(/falta goldenCaseId/);
    expect(validaOficial({ researchProvenance: 'Investigador Fuentes Oficiales HN' }).join('|')).toMatch(/kind debe ser/);
  });
  it('researchProvenance no sustituye una fuente oficial aunque se agregue', () => {
    expect(validaOficial(oficial({ officialSources: [], researchProvenance: 'Investigador Fuentes Oficiales HN' })).join('|')).toMatch(/al menos 1 fuente/);
  });
});

describe('(e) regresión: el tipo 1 no pierde requisitos', () => {
  it('base válida', () => {
    expect(validaIssue(issue(CASO7))).toEqual([]);
  });
  it('sin issuecomment', () => {
    const c = GOLDEN_G1.find((x) => x.id === CASO7)!;
    const sin = c.clo_ruling_ref.replace('issuecomment-6313691566', 'issuecomment-1');
    const e = validarProcedencia(CASO7, sin, issue(CASO7, { rulingRef: sin }), { fechaCommit: HOY, idsGolden: IDS });
    expect(e.join('|')).toMatch(/G1-ART-TRIBUTARIO-214: rulingRef debe contener issuecomment-6313691566/);
  });
  it('con otra fecha', () => {
    expect(validaIssue(issue(CASO7, { verifiedAt: '22-oct-2026' })).join('|')).toMatch(/verifiedAt debe ser 21-oct-2026/);
  });
  it('sin código de caso válido', () => {
    for (const malo of ['', 'F1', 'A', 'a4', 'punto 2', undefined]) {
      expect(validaIssue(issue(CASO7, { caseCode: malo })).join('|'), String(malo)).toMatch(/caseCode debe ser/);
    }
  });
  it('un rulingRef distinto de la clo_ruling_ref del caso, o sin CLO, falla', () => {
    expect(validaIssue(issue(CASO7, { rulingRef: 'otra cosa issuecomment-6313691566 CLO' })).join('|')).toMatch(/clo_ruling_ref del caso/);
  });
});

describe('(f) una mezcla de campos de los dos tipos falla', () => {
  it('CLO_ISSUE_RULING con campos de fuente oficial', () => {
    const e = validaIssue(issue(CASO7, { officialSources: [{ publication: 'La Gaceta', number: '34,940', sha256: HASH_A }], goldenCaseId: CASO7 })).join('|');
    expect(e).toMatch(/mezcla de campos: officialSources, goldenCaseId no pertenece a CLO_ISSUE_RULING/);
  });
  it('CLO_OFFICIAL_SOURCE_RULING con campos del dictamen del #74', () => {
    const e = validaOficial(oficial({ rulingRef: 'issuecomment-6313691566', caseCode: 'C2' })).join('|');
    expect(e).toMatch(/mezcla de campos: rulingRef, caseCode no pertenece a CLO_OFFICIAL_SOURCE_RULING/);
  });
  it('una fuente con campos ajenos falla', () => {
    const e = validaOficial(oficial({ officialSources: [{ publication: 'La Gaceta', number: '34,940', sha256: HASH_A, url: 'x' }] })).join('|');
    expect(e).toMatch(/officialSources\[0\]: campo no permitido: url/);
  });
  it('un kind desconocido falla', () => {
    expect(validaOficial({ ...oficial(), kind: 'MIXTO' }).join('|')).toMatch(/kind debe ser/);
  });
});
