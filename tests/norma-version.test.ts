import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  resolverVersion,
  calcularVigenteDesde,
  detectarSolapes,
  esFechaIso,
  type NormaVersion,
} from '@/lib/legal-retrieval/norma-version';
import { CPC, FIXTURES_PILOTO, NOTARIADO, cadena, fila } from './fixtures/norma-version-piloto';

/** Versión con texto verificado y elegible: el único camino a PRIMARY. */
const verificada = (p: Partial<NormaVersion> & Pick<NormaVersion, 'version_id' | 'vigente_desde'>): Partial<NormaVersion> & typeof p => ({
  texto: 'TEXTO SINTETICO',
  estado_vigencia: 'TRUE',
  nivel_verificacion: 'PRIMARIA_TEXTO',
  elegible_primary: true,
  precision_fecha: 'DIA',
  ...p,
});

const codigoDe = (r: ReturnType<typeof resolverVersion>) =>
  r.estado === 'FALLO_CERRADO' ? r.motivo : r.advertencias.map((a) => a.codigo);

describe('calcularVigenteDesde', () => {
  it('usa la fecha de vigencia del decreto, no la de publicación', () => {
    expect(calcularVigenteDesde({ fecha_vigencia: '2024-03-01', fecha_publicacion: '2024-02-01' })).toBe('2024-03-01');
  });
  it('si el decreto calla, son 20 días después de publicar', () => {
    expect(calcularVigenteDesde({ fecha_publicacion: '2026-01-10' })).toBe('2026-01-30');
    expect(calcularVigenteDesde({ fecha_publicacion: '2026-01-20' })).toBe('2026-02-09');
    expect(calcularVigenteDesde({ fecha_publicacion: '2024-02-15' })).toBe('2024-03-06'); // año bisiesto
  });
  it('sin ninguna de las dos fechas no inventa una', () => {
    expect(calcularVigenteDesde({})).toBeNull();
  });
});

describe('resolverVersion — vacatio legis', () => {
  const versiones = [
    ...cadena('SINT', '1', [
      verificada({ version_id: 'v1', vigente_desde: '2020-01-01' }),
      verificada({ version_id: 'v2', vigente_desde: '2024-03-01', fecha_publicacion: '2024-02-01', tipo_evento: 'REFORMA' }),
    ]),
  ];

  it('en vacatio devuelve la versión anterior y avisa desde cuándo rige la nueva', () => {
    const r = resolverVersion('SINT', '1', '2024-02-15', versiones);
    expect(r.estado).toBe('PRIMARY');
    if (r.estado === 'FALLO_CERRADO') throw new Error('inesperado');
    expect(r.version.version_id).toBe('v1');
    const aviso = r.advertencias.find((a) => a.codigo === 'VACATIO_LEGIS');
    expect(aviso).toMatchObject({ version_nueva: 'v2', rige_desde: '2024-03-01' });
  });
  it('antes de la publicación no hay aviso de vacatio', () => {
    const r = resolverVersion('SINT', '1', '2024-01-31', versiones);
    expect(codigoDe(r)).not.toContain('VACATIO_LEGIS');
  });
  it('el día que rige, sirve la versión nueva sin aviso', () => {
    const r = resolverVersion('SINT', '1', '2024-03-01', versiones);
    expect(r.estado).toBe('PRIMARY');
    if (r.estado === 'FALLO_CERRADO') throw new Error('inesperado');
    expect(r.version.version_id).toBe('v2');
    expect(codigoDe(r)).not.toContain('VACATIO_LEGIS');
  });
});

describe('resolverVersion — hueco y fallo cerrado', () => {
  const versiones = [
    fila({ ...verificada({ version_id: 'a', vigente_desde: '2020-01-01' }), instrumento_id: 'SINT', unidad: 'H', vigente_hasta: '2021-01-01' }),
    fila({ ...verificada({ version_id: 'b', vigente_desde: '2022-01-01' }), instrumento_id: 'SINT', unidad: 'H' }),
  ];

  it('una fecha en el hueco entre versiones falla cerrado (no usa la más cercana)', () => {
    const r = resolverVersion('SINT', 'H', '2021-06-01', versiones);
    expect(r).toEqual({ estado: 'FALLO_CERRADO', motivo: 'HUECO_ENTRE_VERSIONES', mensaje: 'no hay texto verificado para esa fecha' });
  });
  it('el límite superior es exclusivo: el día de vigente_hasta ya no rige', () => {
    expect(codigoDe(resolverVersion('SINT', 'H', '2021-01-01', versiones))).toBe('HUECO_ENTRE_VERSIONES');
    expect(resolverVersion('SINT', 'H', '2020-12-31', versiones).estado).toBe('PRIMARY');
  });
  it('antes de la primera versión falla cerrado', () => {
    expect(codigoDe(resolverVersion('SINT', 'H', '2019-12-31', versiones))).toBe('ANTERIOR_A_PRIMERA_VERSION');
  });
  it('después de una versión cerrada y sin sucesora falla cerrado', () => {
    expect(codigoDe(resolverVersion('SINT', 'H', '2030-01-01', [versiones[0]]))).toBe('POSTERIOR_A_VERSION_CERRADA');
  });
  it('sin versiones para la unidad falla cerrado', () => {
    expect(codigoDe(resolverVersion('SINT', 'NO-EXISTE', '2024-01-01', versiones))).toBe('SIN_VERSIONES');
    expect(codigoDe(resolverVersion('OTRO', 'H', '2024-01-01', versiones))).toBe('SIN_VERSIONES');
  });
  it('fecha inválida falla cerrado', () => {
    for (const f of ['2024-13-01', '2024-02-30', '2024-2-1', 'ayer', '']) {
      expect(codigoDe(resolverVersion('SINT', 'H', f, versiones))).toBe('FECHA_INVALIDA');
    }
    expect(esFechaIso('2024-02-29')).toBe(true);
    expect(esFechaIso('2023-02-29')).toBe(false);
  });
  it('el fallo siempre dice «no hay texto verificado para esa fecha»', () => {
    const r = resolverVersion('SINT', 'H', '2021-06-01', versiones);
    expect(r.estado === 'FALLO_CERRADO' && r.mensaje).toBe('no hay texto verificado para esa fecha');
  });
});

describe('resolverVersion — RANGO, UNKNOWN y TRUE_PRESUNTA nunca son PRIMARY', () => {
  it('fecha en RANGO (D.77-2006): devuelve la versión con advertencia, no PRIMARY', () => {
    const r = resolverVersion(NOTARIADO, '72', '2006-07-24', FIXTURES_PILOTO);
    expect(r.estado).toBe('NO_PRIMARY');
    if (r.estado === 'FALLO_CERRADO') throw new Error('inesperado');
    expect(r.version.version_id).toBe('d77-2006');
    expect(codigoDe(r)).toEqual(expect.arrayContaining(['FECHA_EN_RANGO', 'FECHA_EN_RANGO_INCIERTO']));
  });
  it('RANGO con texto, vigencia TRUE y elegible_primary=true sigue sin ser PRIMARY', () => {
    const vs = cadena('SINT', 'R', [
      verificada({
        version_id: 'r1',
        vigente_desde: '2006-07-23',
        vigente_desde_min: '2006-07-23',
        vigente_desde_max: '2006-07-25',
        precision_fecha: 'RANGO',
      }),
    ]);
    expect(resolverVersion('SINT', 'R', '2010-01-01', vs).estado).toBe('NO_PRIMARY');
  });
  it('vigencia UNKNOWN con texto no es PRIMARY', () => {
    const vs = cadena('SINT', 'U', [verificada({ version_id: 'u1', vigente_desde: '2020-01-01', estado_vigencia: 'UNKNOWN' })]);
    const r = resolverVersion('SINT', 'U', '2021-01-01', vs);
    expect(r.estado).toBe('NO_PRIMARY');
    expect(codigoDe(r)).toContain('VIGENCIA_UNKNOWN');
  });
  it('TRUE_PRESUNTA y verificación sólo secundaria no son PRIMARY', () => {
    const presunta = cadena('SINT', 'P', [verificada({ version_id: 'p1', vigente_desde: '2020-01-01', estado_vigencia: 'TRUE_PRESUNTA' })]);
    expect(resolverVersion('SINT', 'P', '2021-01-01', presunta).estado).toBe('NO_PRIMARY');
    const secundaria = cadena('SINT', 'S', [verificada({ version_id: 's1', vigente_desde: '2020-01-01', nivel_verificacion: 'SECUNDARIA' })]);
    expect(resolverVersion('SINT', 'S', '2021-01-01', secundaria).estado).toBe('NO_PRIMARY');
  });
  it('elegible_primary=false impide PRIMARY aunque el resto esté completo', () => {
    const vs = cadena('SINT', 'E', [verificada({ version_id: 'e1', vigente_desde: '2020-01-01', elegible_primary: false })]);
    const r = resolverVersion('SINT', 'E', '2021-01-01', vs);
    expect(r.estado).toBe('NO_PRIMARY');
    expect(codigoDe(r)).toContain('NO_ELEGIBLE_PRIMARY');
  });
  it('una versión completa y verificada sí es PRIMARY (camino positivo)', () => {
    const vs = cadena('SINT', 'OK', [verificada({ version_id: 'ok1', vigente_desde: '2020-01-01' })]);
    const r = resolverVersion('SINT', 'OK', '2021-01-01', vs);
    expect(r).toMatchObject({ estado: 'PRIMARY', advertencias: [] });
  });
});

describe('resolverVersion — texto null nunca devuelve PRIMARY', () => {
  it('ninguna fila de los fixtures piloto, en ninguna fecha, sale como PRIMARY', () => {
    const fechas = ['2005-06-01', '2006-07-22', '2006-07-24', '2007-08-07', '2008-06-01', '2009-06-30', '2012-01-01', '2015-06-01', '2016-01-01', '2026-10-16'];
    const claves = new Set(FIXTURES_PILOTO.map((v) => `${v.instrumento_id}|${v.unidad}`));
    let resueltas = 0;
    for (const k of claves) {
      const [inst, unidad] = k.split('|');
      for (const f of fechas) {
        const r = resolverVersion(inst, unidad, f, FIXTURES_PILOTO);
        expect(r.estado).not.toBe('PRIMARY');
        if (r.estado === 'NO_PRIMARY') {
          resueltas++;
          expect(r.advertencias.map((a) => a.codigo)).toContain('TEXTO_NO_VERIFICADO');
        }
      }
    }
    expect(resueltas).toBeGreaterThan(0);
  });
  it('una fila incoherente (texto null, TRUE, elegible_primary=true) tampoco es PRIMARY', () => {
    const vs = [fila({ instrumento_id: 'SINT', unidad: 'N', version_id: 'n1', vigente_desde: '2020-01-01', texto: null, estado_vigencia: 'TRUE', elegible_primary: true, nivel_verificacion: 'PRIMARIA_TEXTO', precision_fecha: 'DIA' })];
    expect(resolverVersion('SINT', 'N', '2021-01-01', vs).estado).toBe('NO_PRIMARY');
  });
  it('texto vacío no se confunde con texto null (sólo null bloquea)', () => {
    const vs = cadena('SINT', 'V', [verificada({ version_id: 'v1', vigente_desde: '2020-01-01', texto: '' })]);
    expect(resolverVersion('SINT', 'V', '2021-01-01', vs).estado).toBe('PRIMARY');
  });
});

describe('resolverVersion — inconstitucionalidad y derogación', () => {
  it('RI-137-06: desde el 7-ago-2007 rige el evento de inconstitucionalidad, no el texto original', () => {
    const antes = resolverVersion(NOTARIADO, '60', '2007-08-06', FIXTURES_PILOTO);
    const desde = resolverVersion(NOTARIADO, '60', '2007-08-07', FIXTURES_PILOTO);
    if (antes.estado === 'FALLO_CERRADO' || desde.estado === 'FALLO_CERRADO') throw new Error('inesperado');
    expect(antes.version.tipo_evento).toBe('ORIGINAL');
    expect(desde.version.tipo_evento).toBe('INCONSTITUCIONALIDAD');
    expect(desde.version.instrumento_modificador).toBe('RI-137-06');
    expect(desde.estado).toBe('NO_PRIMARY');
  });
  it('cubre el 59.11 y los arts. 60 a 71', () => {
    for (const u of ['59.11', ...Array.from({ length: 12 }, (_, i) => String(60 + i))]) {
      const r = resolverVersion(NOTARIADO, u, '2008-01-01', FIXTURES_PILOTO);
      if (r.estado === 'FALLO_CERRADO') throw new Error(`falló ${u}`);
      expect(r.version.tipo_evento).toBe('INCONSTITUCIONALIDAD');
    }
  });
  it('una versión con vigencia FALSE y texto no es PRIMARY y avisa que la norma no regía', () => {
    const vs = cadena('SINT', 'D', [verificada({ version_id: 'd1', vigente_desde: '2020-01-01', estado_vigencia: 'FALSE', tipo_evento: 'DEROGACION_EXPRESA' })]);
    const r = resolverVersion('SINT', 'D', '2021-01-01', vs);
    expect(r.estado).toBe('NO_PRIMARY');
    expect(codigoDe(r)).toContain('NORMA_NO_VIGENTE');
  });
  it('D.40-2008 deroga el 59.15 a partir de 2008', () => {
    const r = resolverVersion(NOTARIADO, '59.15', '2010-01-01', FIXTURES_PILOTO);
    if (r.estado === 'FALLO_CERRADO') throw new Error('inesperado');
    expect(r.version.instrumento_modificador).toBe('D.40-2008');
    expect(r.version.tipo_evento).toBe('DEROGACION_EXPRESA');
  });
});

describe('resolverVersion — texto nuevo con el mismo número', () => {
  it('art. 72: original → derogación D.77-2006 → texto nuevo D.59-2015, cada fecha su versión', () => {
    const id = (f: string) => {
      const r = resolverVersion(NOTARIADO, '72', f, FIXTURES_PILOTO);
      if (r.estado === 'FALLO_CERRADO') throw new Error(`falló ${f}`);
      return r.version.version_id;
    };
    expect(id('2005-06-01')).toBe('orig-353-2005');
    expect(id('2010-01-01')).toBe('d77-2006');
    expect(id('2016-01-01')).toBe('d59-2015');
  });
  it('la versión nueva conserva Gaceta 33,801 y verificación primaria, pero sin texto no es PRIMARY', () => {
    const r = resolverVersion(NOTARIADO, '73', '2016-01-01', FIXTURES_PILOTO);
    if (r.estado === 'FALLO_CERRADO') throw new Error('inesperado');
    expect(r.version).toMatchObject({ tipo_evento: 'TEXTO_NUEVO_MISMO_NUMERO', gaceta_numero: '33,801', nivel_verificacion: 'PRIMARIA_TEXTO' });
    expect(r.estado).toBe('NO_PRIMARY');
  });
  it('72-A no tiene versión anterior a 2015: antes falla cerrado', () => {
    expect(codigoDe(resolverVersion(NOTARIADO, '72-A', '2010-01-01', FIXTURES_PILOTO))).toBe('ANTERIOR_A_PRIMERA_VERSION');
  });
});

describe('resolverVersion — CPC', () => {
  it('art. 932 reformado por D.168-2009: después de la reforma no se sirve el original', () => {
    const antes = resolverVersion(CPC, '932', '2008-06-01', FIXTURES_PILOTO);
    const despues = resolverVersion(CPC, '932', '2012-01-01', FIXTURES_PILOTO);
    if (antes.estado === 'FALLO_CERRADO' || despues.estado === 'FALLO_CERRADO') throw new Error('inesperado');
    expect(antes.version.tipo_evento).toBe('ORIGINAL');
    expect(despues.version).toMatchObject({ version_id: 'd168-2009', tipo_evento: 'REFORMA', instrumento_modificador: 'D.168-2009' });
    expect(despues.estado).toBe('NO_PRIMARY');
    expect(codigoDe(despues)).toEqual(expect.arrayContaining(['TEXTO_NO_VERIFICADO', 'VIGENCIA_UNKNOWN']));
  });
  it('art. 932: dentro del margen de 2009 avisa de la incertidumbre de la fecha', () => {
    const r = resolverVersion(CPC, '932', '2009-06-30', FIXTURES_PILOTO);
    expect(codigoDe(r)).toContain('FECHA_EN_RANGO_INCIERTO');
  });
  it('D.21-2015 reforma 400.2 y 783.1 (Gaceta 33,882)', () => {
    for (const u of ['400.2', '783.1']) {
      const r = resolverVersion(CPC, u, '2016-01-01', FIXTURES_PILOTO);
      if (r.estado === 'FALLO_CERRADO') throw new Error(`falló ${u}`);
      expect(r.version).toMatchObject({ instrumento_modificador: 'D.21-2015', gaceta_numero: '33,882', tipo_evento: 'REFORMA' });
    }
  });
});

describe('sin versiones solapadas', () => {
  it('los fixtures piloto no tienen solapes', () => {
    expect(detectarSolapes(FIXTURES_PILOTO)).toEqual([]);
  });
  it('detecta dos versiones de la misma unidad que se solapan', () => {
    const vs = [
      fila({ instrumento_id: 'SINT', unidad: 'X', version_id: 'a', vigente_desde: '2020-01-01', vigente_hasta: '2022-01-01' }),
      fila({ instrumento_id: 'SINT', unidad: 'X', version_id: 'b', vigente_desde: '2021-06-01' }),
    ];
    expect(detectarSolapes(vs)).toHaveLength(1);
    expect(codigoDe(resolverVersion('SINT', 'X', '2021-07-01', vs))).toBe('VERSIONES_SOLAPADAS');
  });
  it('versiones contiguas (hasta de una = desde de la otra) no se solapan', () => {
    const vs = [
      fila({ instrumento_id: 'SINT', unidad: 'X', version_id: 'a', vigente_desde: '2020-01-01', vigente_hasta: '2022-01-01' }),
      fila({ instrumento_id: 'SINT', unidad: 'X', version_id: 'b', vigente_desde: '2022-01-01' }),
    ];
    expect(detectarSolapes(vs)).toEqual([]);
  });
  it('unidades distintas no cuentan como solape', () => {
    const vs = [
      fila({ instrumento_id: 'SINT', unidad: 'X', version_id: 'a', vigente_desde: '2020-01-01' }),
      fila({ instrumento_id: 'SINT', unidad: 'Y', version_id: 'a', vigente_desde: '2020-01-01' }),
    ];
    expect(detectarSolapes(vs)).toEqual([]);
  });
});

describe('migración norma_version (SQL)', () => {
  const sql = readFileSync(join(__dirname, '..', 'supabase', 'migrations', '20261016000000_norma_version.sql'), 'utf8');
  it('declara las columnas pedidas', () => {
    for (const c of ['etiqueta', 'elegible_primary', 'nota', 'vigente_desde_min', 'vigente_desde_max', 'texto_hash', 'fuente_pdf_hash', 'adjudicacion_ref', 'precision_fecha']) {
      expect(sql).toMatch(new RegExp(`\\b${c}\\b`));
    }
  });
  it('lleva CHECK para tipo_evento, estado_vigencia, nivel_verificacion y precision_fecha', () => {
    for (const c of ['tipo_evento_chk', 'estado_vigencia_chk', 'nivel_verificacion_chk', 'precision_fecha_chk']) {
      expect(sql).toContain(`norma_version_${c}`);
    }
    for (const v of ['TEXTO_NUEVO_MISMO_NUMERO', 'DESPLAZAMIENTO_ESPECIAL', 'TRUE_PRESUNTA', 'PRIMARIA_IMAGEN', "'RANGO'"]) {
      expect(sql).toContain(v);
    }
  });
  it('activa RLS con lectura autenticada y sin políticas de escritura', () => {
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/FOR SELECT\s+TO authenticated/);
    expect(sql).not.toMatch(/FOR (INSERT|UPDATE|DELETE|ALL)/);
    expect(sql).not.toMatch(/GRANT (INSERT|UPDATE|DELETE|ALL)/);
  });
  it('impide solapes con exclusion constraint e indexa (instrumento_id, unidad, vigente_desde)', () => {
    expect(sql).toMatch(/EXCLUDE USING gist/);
    expect(sql).toMatch(/\(instrumento_id, unidad, vigente_desde\)/);
  });
  it('no siembra datos', () => {
    expect(sql).not.toMatch(/INSERT\s+INTO/i);
  });
  it('trae su script de rollback', () => {
    const rb = readFileSync(join(__dirname, '..', 'supabase', 'rollbacks', '20261016000000_norma_version_rollback.sql'), 'utf8');
    expect(rb).toMatch(/DROP TABLE IF EXISTS public\.norma_version/);
  });
});
