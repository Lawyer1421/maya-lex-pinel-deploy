import { describe, expect, it } from 'vitest';
import { GOLDEN_G1, PROCEDENCIA_G1 } from './golden/gateway-g1-casos';
import { gacetasConFechaOPagina, parsearFechaDdMmmAaaa, validarProcedencia, validarProcedenciasGoldenSet, validarVerificacionFechaPagina } from './golden/procedencia-clo';

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
const validaOficial = (p: unknown, ctx = { fechaCommit: HOY, idsGolden: IDS }, ref: string = penal.clo_ruling_ref, gaceta: string | null = penal.gaceta) =>
  validarProcedencia(PENAL, ref, p, ctx, gaceta);
const ctxBase = { fechaCommit: HOY, idsGolden: IDS };
/** Fuentes del fixture real, para que los negativos de M2 cambien una sola cosa. */
const DOS_FUENTES = [
  { publication: 'La Gaceta', number: '34,940', sha256: HASH_A },
  { publication: 'La Gaceta', number: '35,247', sha256: HASH_B },
];
const oficialReal = (cambios: Record<string, unknown> = {}) => oficial({ officialSources: DOS_FUENTES, ...cambios });

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
      researchProvenance: 'Investigador Fuentes Oficiales HN, 22-oct-2026; cotejo CLO del PDF oficial ENAG',
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
    expect(validaOficial(oficialReal({ verifiedAt: '22-oct-2026' }))).toEqual([]);
    expect(validaOficial(oficialReal({ verifiedAt: '21-oct-2026' }))).toEqual([]);
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

describe('M2: fuentes y hashes deben coincidir con clo_ruling_ref y con la gaceta del caso', () => {
  const REF = penal.clo_ruling_ref;
  const nombra = (e: string[]) => e.every((x) => x.startsWith(`${PENAL}: `));
  it('positivo: el fixture real valida sin errores', () => {
    expect(validaOficial(oficialReal())).toEqual([]);
    expect(validarProcedenciasGoldenSet(GOLDEN_G1, PROCEDENCIA_G1, HOY)).toEqual([]);
  });
  it('clo_ruling_ref sin hashes', () => {
    const e = validaOficial(oficialReal(), ctxBase, 'texto sin hashes');
    expect(e.length).toBeGreaterThan(0);
    expect(nombra(e)).toBe(true);
    expect(e.join('|')).toMatch(/la Gaceta 34,940 de officialSources no aparece en clo_ruling_ref/);
  });
  it('con número pero sin hash', () => {
    const sinHash = 'Dictamen CLO 22-oct-2026: La Gaceta 34,940 y La Gaceta 35,247.';
    const e = validaOficial(oficialReal(), ctxBase, sinHash);
    expect(e.join('|')).toMatch(/el sha256 de la Gaceta 34,940 no aparece en clo_ruling_ref/);
    expect(nombra(e)).toBe(true);
  });
  it('hashes de otra Gaceta (intercambiados 34,940 ↔ 35,247)', () => {
    const cambiado = REF.replace(HASH_A, '@@A@@').replace(HASH_B, HASH_A).replace('@@A@@', HASH_B);
    expect(cambiado).not.toBe(REF);
    const e = validaOficial(oficialReal(), ctxBase, cambiado);
    expect(e.join('|')).toMatch(/el sha256 no está asociado a la Gaceta 34,940/);
    expect(e.join('|')).toMatch(/el sha256 no está asociado a la Gaceta 35,247/);
    expect(nombra(e)).toBe(true);
  });
  it('hash con un carácter distinto', () => {
    const alterado = REF.replace(HASH_A, HASH_A.slice(0, 63) + (HASH_A.endsWith('2') ? '3' : '2'));
    const e = validaOficial(oficialReal(), ctxBase, alterado);
    expect(e.join('|')).toMatch(/el sha256 de la Gaceta 34,940 no aparece en clo_ruling_ref/);
    expect(e.join('|')).toMatch(/cita un sha256 .* que no está en officialSources/);
    expect(nombra(e)).toBe(true);
  });
  it('Gaceta extra en clo_ruling_ref no listada en officialSources', () => {
    const e = validaOficial(oficialReal(), ctxBase, REF + ' Ver también La Gaceta 99,999.');
    expect(e.join('|')).toMatch(/cita la Gaceta 99,999, que no está en officialSources/);
    expect(nombra(e)).toBe(true);
  });
  it('un hash extra en clo_ruling_ref no listado en officialSources', () => {
    const e = validaOficial(oficialReal(), ctxBase, REF + ' ' + 'a'.repeat(64));
    expect(e.join('|')).toMatch(/cita un sha256 \(aaaaaaaaaaaa…\) que no está en officialSources/);
  });
  it('gaceta del caso distinta de officialSources', () => {
    for (const g of ['34,940', '34,940; 35,247; 36,000', '34,940; 35,248', null]) {
      const e = validaOficial(oficialReal(), ctxBase, REF, g);
      expect(e.join('|'), String(g)).toMatch(/la gaceta del caso .* no coincide con las Gacetas de officialSources/);
      expect(nombra(e)).toBe(true);
    }
  });
  it('el Golden Set completo señala el caso cuando se altera su gaceta', () => {
    const casos = GOLDEN_G1.map((c) => (c.id === PENAL ? { ...c, gaceta: '34,940' } : c));
    const e = validarProcedenciasGoldenSet(casos, PROCEDENCIA_G1, HOY);
    expect(e.length).toBeGreaterThan(0);
    expect(e.every((x) => x.startsWith(`${PENAL}: `))).toBe(true);
  });
});

describe('B1: fuentes oficiales duplicadas', () => {
  it('la misma Gaceta dos veces', () => {
    const e = validaOficial(oficial({ officialSources: [DOS_FUENTES[0], { ...DOS_FUENTES[0], sha256: HASH_B }] })).join('|');
    expect(e).toMatch(/G1-VIG-CODIGO-PENAL-130-2017: officialSources repite la Gaceta 34,940/);
  });
  it('el mismo sha256 con distinto número', () => {
    const e = validaOficial(oficial({ officialSources: [DOS_FUENTES[0], { ...DOS_FUENTES[1], sha256: HASH_A }] })).join('|');
    expect(e).toMatch(/G1-VIG-CODIGO-PENAL-130-2017: officialSources repite el sha256 54f6a4122f8b/);
  });
});

describe('B2: researchProvenance vacío o contaminado lo rechaza el validador', () => {
  for (const [nombre, valor, re] of [
    ['vacío', '', /researchProvenance debe ser texto no vacío/],
    ['solo espacios', '   ', /researchProvenance debe ser texto no vacío/],
    ['no es texto', 42, /researchProvenance debe ser texto no vacío/],
    ['con URL https', 'Investigador https://ejemplo.hn/x', /no puede contener una URL/],
    ['con URL www', 'Investigador www.ejemplo.hn', /no puede contener una URL/],
    ['con #74', 'Investigador, ver #74', /no puede referirse al issue #74/],
    ['con issues/74', 'Investigador, issues/74', /no puede referirse al issue #74/],
    ['con issuecomment-6313691566', 'Investigador issuecomment-6313691566', /no puede referirse al issue #74/],
  ] as Array<[string, unknown, RegExp]>) {
    it(`rechaza researchProvenance ${nombre}`, () => {
      expect(validaOficial(oficialReal({ researchProvenance: valor })).join('|')).toMatch(re);
    });
  }
  it('acepta el valor real y también su ausencia', () => {
    expect(validaOficial(oficialReal({ researchProvenance: 'Investigador Fuentes Oficiales HN, 22-oct-2026; cotejo CLO del PDF oficial ENAG' }))).toEqual([]);
    expect(validaOficial(oficialReal())).toEqual([]);
  });
});

describe('M1: fecha y página de La Gaceta citadas en referenciaCLO exigen verificacionFechaPagina', () => {
  const ref = penal.referenciaCLO;
  const ok = penal.verificacionFechaPagina;
  const valida = (v: unknown, r: string = ref) => validarVerificacionFechaPagina(PENAL, r, v);
  it('el caso Penal conserva sus fechas y páginas y lleva la verificación del 22-oct-2026', () => {
    expect(gacetasConFechaOPagina(ref)).toEqual([
      { gaceta: '34,940', fecha: '10-may-2019', pagina: '140-A' },
      { gaceta: '35,247', fecha: '9-may-2020', pagina: '2-A' },
    ]);
    expect(ok).toEqual({
      estado: 'VERIFICADO_CLO_PDF_OFICIAL',
      fecha: '22-oct-2026',
      detalle: [
        { gaceta: '34,940', fecha: '10-may-2019', pagina: '140-A', paginaPdf: 156 },
        { gaceta: '35,247', fecha: '9-may-2020', pagina: '2-A', paginaPdf: 2 },
      ],
    });
    expect(valida(ok)).toEqual([]);
  });
  it('todo caso del Golden Set que cite fecha o «pág.» tiene su verificación', () => {
    for (const c of GOLDEN_G1) {
      expect(validarVerificacionFechaPagina(c.id, c.referenciaCLO, c.verificacionFechaPagina), c.id).toEqual([]);
    }
    const conCita = GOLDEN_G1.filter((c) => gacetasConFechaOPagina(c.referenciaCLO).length > 0).map((c) => c.id);
    expect(conCita).toEqual([PENAL]);
  });
  it('falla si falta el campo', () => {
    expect(valida(undefined).join('|')).toMatch(/G1-VIG-CODIGO-PENAL-130-2017: referenciaCLO cita fecha o página de La Gaceta y falta verificacionFechaPagina/);
    const e = validarProcedenciasGoldenSet(GOLDEN_G1.map((c) => (c.id === PENAL ? { ...c, verificacionFechaPagina: undefined } : c)), PROCEDENCIA_G1, HOY);
    expect(e.join('|')).toMatch(/falta verificacionFechaPagina/);
  });
  it('falla si queda una Gaceta citada sin detalle', () => {
    const sin = { ...ok!, detalle: ok!.detalle.slice(0, 1) };
    expect(valida(sin).join('|')).toMatch(/la Gaceta 35,247 citada en referenciaCLO no tiene detalle/);
  });
  it('falla si una fecha no coincide', () => {
    const mal = { ...ok!, detalle: [{ ...ok!.detalle[0], fecha: '11-may-2019' }, ok!.detalle[1]] };
    expect(valida(mal).join('|')).toMatch(/la fecha de la Gaceta 34,940 \(10-may-2019\) no coincide/);
  });
  it('falla si una página no coincide', () => {
    const mal = { ...ok!, detalle: [ok!.detalle[0], { ...ok!.detalle[1], pagina: '3-A' }] };
    expect(valida(mal).join('|')).toMatch(/la página de la Gaceta 35,247 \(2-A\) no coincide/);
  });
  it('falla si el estado no es VERIFICADO_CLO_PDF_OFICIAL o la fecha no es dd-mmm-aaaa', () => {
    expect(valida({ ...ok, estado: 'PENDIENTE' }).join('|')).toMatch(/estado debe ser VERIFICADO_CLO_PDF_OFICIAL/);
    expect(valida({ ...ok, fecha: '2026-10-22' }).join('|')).toMatch(/fecha debe tener formato dd-mmm-aaaa/);
  });
  it('un caso que cita una página nueva sin verificación falla (no se puede colar otra cita)', () => {
    expect(valida(undefined, 'Gaceta 30,904, pág. 5').join('|')).toMatch(/falta verificacionFechaPagina/);
    expect(valida(undefined, 'Gaceta 30,904')).toEqual([]);
  });
});
