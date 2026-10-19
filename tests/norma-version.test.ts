import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  resolverVersion,
  calcularVigenteDesde,
  detectarSolapes,
  esFechaIso,
  identificaDecretoOFallo,
  motivoRechazoVinculo,
  rechazoVinculo,
  anioEnCursoUTC,
  normalizarModificador,
  SIGLAS_VINCULO_V1,
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
  it('después de una reforma cerrada y sin sucesora falla cerrado', () => {
    const reforma = fila({ ...verificada({ version_id: 'r', vigente_desde: '2020-01-01', tipo_evento: 'REFORMA', instrumento_modificador: 'D.10-2019' }), instrumento_id: 'SINT', unidad: 'H', vigente_hasta: '2021-01-01' });
    expect(resolverVersion('SINT', 'H', '2030-01-01', [reforma])).toEqual({
      estado: 'FALLO_CERRADO', motivo: 'POSTERIOR_A_VERSION_CERRADA', mensaje: 'no hay texto verificado para esa fecha',
    });
  });
  it('después de una ORIGINAL cerrada y sin sucesora: CONTEXT con VIGENCIA_CERRADA_SIN_EVENTO (dictamen CLO 18-oct-2026)', () => {
    const r = resolverVersion('SINT', 'H', '2030-01-01', [versiones[0]]);
    expect(r.estado).toBe('CONTEXT');
    if (r.estado === 'FALLO_CERRADO') throw new Error('inesperado');
    expect(r.version.version_id).toBe('a');
    expect(codigoDe(r)).toContain('VIGENCIA_CERRADA_SIN_EVENTO');
    expect(codigoDe(r)).not.toContain('NORMA_NO_VIGENTE');
    expect(r.curacionDatos).toEqual([expect.objectContaining({ version_id: 'a', motivo: 'VIGENCIA_CERRADA_SIN_EVENTO' })]);
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

describe('resolverVersion — RANGO, UNKNOWN, FALSE, no elegible o sin texto nunca son PRIMARY', () => {
  it('fecha en RANGO (D.77-2006): devuelve la versión con advertencia, no PRIMARY', () => {
    const r = resolverVersion(NOTARIADO, '72', '2006-07-24', FIXTURES_PILOTO);
    expect(r.estado).toBe('CONTEXT');
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
    expect(resolverVersion('SINT', 'R', '2010-01-01', vs).estado).toBe('CONTEXT');
  });
  it('vigencia UNKNOWN con texto no es PRIMARY', () => {
    const vs = cadena('SINT', 'U', [verificada({ version_id: 'u1', vigente_desde: '2020-01-01', estado_vigencia: 'UNKNOWN' })]);
    const r = resolverVersion('SINT', 'U', '2021-01-01', vs);
    expect(r.estado).toBe('CONTEXT');
    expect(codigoDe(r)).toContain('VIGENCIA_UNKNOWN');
  });
  it('vigencia FALSE con texto no es PRIMARY', () => {
    const vs = cadena('SINT', 'F', [verificada({ version_id: 'f1', vigente_desde: '2020-01-01', estado_vigencia: 'FALSE' })]);
    expect(resolverVersion('SINT', 'F', '2021-01-01', vs).estado).toBe('CONTEXT');
  });
  it('elegible_primary=false impide PRIMARY aunque el resto esté completo', () => {
    const vs = cadena('SINT', 'E', [verificada({ version_id: 'e1', vigente_desde: '2020-01-01', elegible_primary: false })]);
    const r = resolverVersion('SINT', 'E', '2021-01-01', vs);
    expect(r.estado).toBe('CONTEXT');
    expect(codigoDe(r)).toContain('NO_ELEGIBLE_PRIMARY');
  });
  it('una versión completa y verificada sí es PRIMARY (camino positivo)', () => {
    const vs = cadena('SINT', 'OK', [verificada({ version_id: 'ok1', vigente_desde: '2020-01-01' })]);
    const r = resolverVersion('SINT', 'OK', '2021-01-01', vs);
    expect(r).toMatchObject({ estado: 'PRIMARY', advertencias: [] });
  });
});

describe('resolverVersion — TRUE_PRESUNTA es elegible PRIMARY con aviso (CLO)', () => {
  const presunta = (instrumento: string, nivel: NormaVersion['nivel_verificacion']) =>
    cadena(instrumento, '1', [
      verificada({
        version_id: 'cedij-1',
        vigente_desde: '2015-03-01',
        estado_vigencia: 'TRUE_PRESUNTA',
        nivel_verificacion: nivel,
        fuente: 'CEDIJ',
      }),
    ]);

  it.each([
    [NOTARIADO, 'SECUNDARIA' as const],
    [NOTARIADO, 'PRIMARIA_TEXTO' as const],
    [CPC, 'SECUNDARIA' as const],
    [CPC, 'PRIMARIA_IMAGEN' as const],
  ])('%s con TRUE_PRESUNTA + fuente CEDIJ (%s) devuelve PRIMARY con aviso', (instrumento, nivel) => {
    const r = resolverVersion(instrumento, '1', '2020-06-01', presunta(instrumento, nivel));
    expect(r.estado).toBe('PRIMARY');
    if (r.estado === 'FALLO_CERRADO') throw new Error('inesperado');
    expect(r.version.fuente).toBe('CEDIJ');
    expect(r.advertencias.map((a) => a.codigo)).toContain('VIGENCIA_PRESUNTA');
    if (nivel === 'SECUNDARIA') expect(r.advertencias.map((a) => a.codigo)).toContain('VERIFICACION_SECUNDARIA');
  });

  it('el aviso no se pierde: PRIMARY por TRUE_PRESUNTA nunca viene con advertencias vacías', () => {
    const r = resolverVersion(CPC, '1', '2020-06-01', presunta(CPC, 'SECUNDARIA'));
    expect(r.estado === 'PRIMARY' && r.advertencias.length).toBeGreaterThan(0);
  });

  it('TRUE_PRESUNTA sigue sujeta a las exclusiones: sin texto, no elegible o RANGO no son PRIMARY', () => {
    const base = { version_id: 'x', vigente_desde: '2015-03-01', estado_vigencia: 'TRUE_PRESUNTA' as const, fuente: 'CEDIJ' };
    const sinTexto = cadena(CPC, '1', [verificada({ ...base, texto: null })]);
    const noElegible = cadena(CPC, '1', [verificada({ ...base, elegible_primary: false })]);
    const rango = cadena(CPC, '1', [
      verificada({ ...base, precision_fecha: 'RANGO', vigente_desde_min: '2015-03-01', vigente_desde_max: '2015-03-03' }),
    ]);
    for (const vs of [sinTexto, noElegible, rango]) {
      expect(resolverVersion(CPC, '1', '2020-06-01', vs).estado).toBe('CONTEXT');
    }
  });

  it('UNKNOWN y FALSE siguen sin ser PRIMARY aunque tengan texto, fuente CEDIJ y elegible_primary', () => {
    for (const estado of ['UNKNOWN', 'FALSE'] as const) {
      const vs = cadena(NOTARIADO, '1', [verificada({ version_id: 'x', vigente_desde: '2015-03-01', estado_vigencia: estado, fuente: 'CEDIJ' })]);
      expect(resolverVersion(NOTARIADO, '1', '2020-06-01', vs).estado).toBe('CONTEXT');
    }
  });
});

describe('precedencia entre fuentes (CLO: SI_PRIMARY_CON_AVISO)', () => {
  const imagen = fila({
    ...verificada({ version_id: 'gaceta-img', vigente_desde: '2015-03-01', nivel_verificacion: 'PRIMARIA_IMAGEN', fuente: 'La Gaceta' }),
    instrumento_id: NOTARIADO,
    unidad: '1',
  });
  const cedij = fila({
    ...verificada({ version_id: 'cedij-1', vigente_desde: '2015-03-01', estado_vigencia: 'TRUE_PRESUNTA', nivel_verificacion: 'SECUNDARIA', fuente: 'CEDIJ' }),
    instrumento_id: NOTARIADO,
    unidad: '1',
  });

  it('con PRIMARIA_IMAGEN y SECUNDARIA para el mismo artículo y fecha, gana la imagen y la secundaria pasa a contexto', () => {
    for (const orden of [[imagen, cedij], [cedij, imagen]]) {
      const r = resolverVersion(NOTARIADO, '1', '2020-06-01', orden);
      expect(r.estado).toBe('PRIMARY');
      if (r.estado === 'FALLO_CERRADO') throw new Error('inesperado');
      expect(r.version.version_id).toBe('gaceta-img');
      expect(r.contexto.map((v) => v.version_id)).toEqual(['cedij-1']);
      expect(r.contexto[0].nivel_verificacion).toBe('SECUNDARIA');
    }
  });
  it('sin imagen, la SECUNDARIA (CEDIJ) sigue siendo PRIMARY con VERIFICACION_SECUNDARIA y sin contexto', () => {
    const r = resolverVersion(NOTARIADO, '1', '2020-06-01', [cedij]);
    expect(r.estado).toBe('PRIMARY');
    if (r.estado === 'FALLO_CERRADO') throw new Error('inesperado');
    expect(r.contexto).toEqual([]);
    expect(r.advertencias.map((a) => a.codigo)).toEqual(expect.arrayContaining(['VERIFICACION_SECUNDARIA', 'VIGENCIA_PRESUNTA']));
  });
  it('imagen superior SIN texto (sólo falta texto) no bloquea: la SECUNDARIA se sirve como PRIMARY con VERIFICACION_SECUNDARIA', () => {
    for (const texto of [null, '', '   ']) {
      const imagenSinTexto = { ...imagen, texto, elegible_primary: false };
      const r = resolverVersion(NOTARIADO, '1', '2020-06-01', [imagenSinTexto, cedij]);
      expect(r.estado).toBe('PRIMARY');
      if (r.estado === 'FALLO_CERRADO') throw new Error('inesperado');
      expect(r.version.version_id).toBe('cedij-1');
      expect(r.advertencias.map((a) => a.codigo)).toContain('VERIFICACION_SECUNDARIA');
      expect(r.contexto.map((v) => v.version_id)).toEqual(['gaceta-img']); // la sin texto no desplaza: queda como contexto
    }
  });
  it('fuente superior sin texto ANTERIOR a CEDIJ puede ceder: la inferior sigue PRIMARY', () => {
    const imagenAnteriorSinTexto = {
      ...imagen,
      version_id: 'gaceta-anterior-sin-texto',
      vigente_desde: '2014-01-01',
      texto: null,
      elegible_primary: false,
    };
    const r = resolverVersion(NOTARIADO, '1', '2020-06-01', [imagenAnteriorSinTexto, cedij]);
    expect(r.estado).toBe('PRIMARY');
    if (r.estado === 'FALLO_CERRADO') throw new Error('inesperado');
    expect(r.version.version_id).toBe('cedij-1');
    expect(r.advertencias.map((a) => a.codigo)).toContain('VERIFICACION_SECUNDARIA');
    expect(r.advertencias.map((a) => a.codigo)).not.toContain('REFORMA_POSTERIOR_SIN_TEXTO');
    expect(r.contexto.map((v) => v.version_id)).toEqual(['gaceta-anterior-sin-texto']);
  });

  it('fuente superior sin texto POSTERIOR a CEDIJ bloquea PRIMARY: inferior queda CONTEXT con aviso CLO límite 3', () => {
    const reformaPosteriorSinTexto = {
      ...imagen,
      version_id: 'reforma-posterior-sin-texto',
      vigente_desde: '2018-01-01',
      texto: null,
      elegible_primary: false,
      tipo_evento: 'REFORMA' as const,
    };
    const r = resolverVersion(NOTARIADO, '1', '2020-06-01', [reformaPosteriorSinTexto, cedij]);
    expect(r.estado).toBe('CONTEXT');
    if (r.estado === 'FALLO_CERRADO') throw new Error('inesperado');
    expect(r.version.version_id).toBe('cedij-1');
    expect(r.advertencias.map((a) => a.codigo)).toEqual(
      expect.arrayContaining(['VERIFICACION_SECUNDARIA', 'REFORMA_POSTERIOR_SIN_TEXTO']),
    );
    expect(r.contexto.map((v) => v.version_id)).toEqual(['reforma-posterior-sin-texto']);
  });

  it('la cadena de rangos también salta a una PRIMARIA_TEXTO con texto cuando la imagen no tiene texto', () => {
    const imagenSinTexto = { ...imagen, texto: null, elegible_primary: false };
    const textoPrimario = fila({
      ...verificada({ version_id: 'prim-texto', vigente_desde: '2015-03-01', nivel_verificacion: 'PRIMARIA_TEXTO' }),
      instrumento_id: NOTARIADO,
      unidad: '1',
    });
    const r = resolverVersion(NOTARIADO, '1', '2020-06-01', [imagenSinTexto, cedij, textoPrimario]);
    expect(r.estado).toBe('PRIMARY');
    if (r.estado === 'FALLO_CERRADO') throw new Error('inesperado');
    expect(r.version.version_id).toBe('prim-texto');
    expect(r.advertencias.map((a) => a.codigo)).not.toContain('VERIFICACION_SECUNDARIA');
    expect(r.contexto.map((v) => v.version_id).sort()).toEqual(['cedij-1', 'gaceta-img']);
  });
  it.each([
    ['vigencia FALSE', { estado_vigencia: 'FALSE' as const }],
    ['vigencia UNKNOWN', { estado_vigencia: 'UNKNOWN' as const }],
    ['fecha en RANGO', { precision_fecha: 'RANGO' as const, vigente_desde_min: '2015-03-01', vigente_desde_max: '2015-03-03' }],
    ['elegible_primary=false (con texto)', { elegible_primary: false }],
  ])('imagen superior CON texto y %s por causa jurídica: gana, devuelve CONTEXT y NO cae a la inferior', (_motivo, cambio) => {
    const imagenJuridica = { ...imagen, ...cambio };
    const r = resolverVersion(NOTARIADO, '1', '2020-06-01', [imagenJuridica, cedij]);
    expect(r.estado).toBe('CONTEXT');
    if (r.estado === 'FALLO_CERRADO') throw new Error('inesperado');
    expect(r.version.version_id).toBe('gaceta-img');
    expect(r.contexto.map((v) => v.version_id)).toEqual(['cedij-1']);
  });
  it('imagen superior sin texto Y derogada (FALSE) o UNKNOWN bloquea: no se sirve texto inferior de una norma no vigente', () => {
    for (const estado_vigencia of ['FALSE', 'UNKNOWN'] as const) {
      const imagenDerogada = { ...imagen, texto: null, elegible_primary: false, estado_vigencia };
      const r = resolverVersion(NOTARIADO, '1', '2020-06-01', [imagenDerogada, cedij]);
      expect(r.estado).toBe('CONTEXT');
      if (r.estado === 'FALLO_CERRADO') throw new Error('inesperado');
      expect(r.version.version_id).toBe('gaceta-img');
    }
  });
  it('si ninguna fuente tiene texto, devuelve CONTEXT con la de mayor rango', () => {
    const a = { ...imagen, texto: null, elegible_primary: false };
    const b = { ...cedij, texto: null, elegible_primary: false };
    const r = resolverVersion(NOTARIADO, '1', '2020-06-01', [b, a]);
    expect(r.estado).toBe('CONTEXT');
    if (r.estado === 'FALLO_CERRADO') throw new Error('inesperado');
    expect(r.version.version_id).toBe('gaceta-img');
    expect(codigoDe(r)).toContain('TEXTO_NO_VERIFICADO');
  });
  it('la imagen sólo gana en las fechas que cubre: fuera de su ventana, rige la secundaria', () => {
    const imagenCerrada = { ...imagen, vigente_hasta: '2018-01-01' };
    const r = resolverVersion(NOTARIADO, '1', '2020-06-01', [imagenCerrada, cedij]);
    expect(r.estado).toBe('PRIMARY');
    if (r.estado === 'FALLO_CERRADO') throw new Error('inesperado');
    expect(r.version.version_id).toBe('cedij-1');
  });
  it('fuentes de distinto nivel para la misma fecha no cuentan como solape; dentro del mismo nivel sí', () => {
    expect(detectarSolapes([imagen, cedij])).toEqual([]);
    const otraSecundaria = { ...cedij, version_id: 'cedij-2' };
    expect(detectarSolapes([cedij, otraSecundaria])).toHaveLength(1);
    expect(codigoDe(resolverVersion(NOTARIADO, '1', '2020-06-01', [cedij, otraSecundaria]))).toBe('VERSIONES_SOLAPADAS');
  });
});

describe('reforma o fallo posterior a la edición CEDIJ no incorporado (marcado en datos)', () => {
  it('fila CEDIJ con elegible_primary=false y nota devuelve CONTEXT, no PRIMARY (sin detección automática)', () => {
    const vs = cadena(CPC, '932', [
      verificada({
        version_id: 'cedij-932',
        vigente_desde: '2015-03-01',
        estado_vigencia: 'TRUE_PRESUNTA',
        nivel_verificacion: 'SECUNDARIA',
        fuente: 'CEDIJ',
        elegible_primary: false,
        nota: 'Reforma posterior a la edición CEDIJ no incorporada en este texto.',
      }),
    ]);
    const r = resolverVersion(CPC, '932', '2020-06-01', vs);
    expect(r.estado).toBe('CONTEXT');
    if (r.estado === 'FALLO_CERRADO') throw new Error('inesperado');
    expect(r.version.nota).toMatch(/no incorporada/);
    expect(r.advertencias.map((a) => a.codigo)).toContain('NO_ELEGIBLE_PRIMARY');
  });
  it('el resolver no infiere el marcado: la misma fila con elegible_primary=true sí es PRIMARY', () => {
    const vs = cadena(CPC, '932', [
      verificada({ version_id: 'cedij-932', vigente_desde: '2015-03-01', estado_vigencia: 'TRUE_PRESUNTA', nivel_verificacion: 'SECUNDARIA', fuente: 'CEDIJ' }),
    ]);
    expect(resolverVersion(CPC, '932', '2020-06-01', vs).estado).toBe('PRIMARY');
  });
});

describe('fixtures piloto — fuente D.59-2015 y fechas sin día conocido', () => {
  it('D.59-2015 (arts. 72, 72-A, 73) es PRIMARIA_IMAGEN, Gaceta 33,801', () => {
    for (const u of ['72', '72-A', '73']) {
      const v = FIXTURES_PILOTO.find((f) => f.instrumento_id === NOTARIADO && f.unidad === u && f.instrumento_modificador === 'D.59-2015');
      expect(v, `falta D.59-2015 en ${u}`).toBeDefined();
      expect(v).toMatchObject({ nivel_verificacion: 'PRIMARIA_IMAGEN', gaceta_numero: '33,801' });
    }
  });
  it('72-A queda como ADICION sin versión anterior', () => {
    const vs = FIXTURES_PILOTO.filter((f) => f.instrumento_id === NOTARIADO && f.unidad === '72-A');
    expect(vs).toHaveLength(1);
    expect(vs[0].tipo_evento).toBe('ADICION');
  });
  it('todo evento sin día conocido declara precision_fecha=AÑO y acota el año completo; no inventa un día', () => {
    const sinDia = FIXTURES_PILOTO.filter((f) => f.precision_fecha === 'AÑO');
    expect(sinDia.length).toBeGreaterThan(0);
    for (const v of sinDia) {
      const y = v.vigente_desde.slice(0, 4);
      expect(v.vigente_desde_min).toBe(`${y}-01-01`);
      expect(v.vigente_desde_max).toBe(`${y}-12-31`);
      expect(v.vigente_desde).toBe(v.vigente_desde_min);
      expect(v.nota).toMatch(/precision_fecha=AÑO/);
    }
  });
  it('los eventos con día se marcan DIA (RI-137-06) o RANGO (D.77-2006); nada más', () => {
    const porModificador = (m: string) => FIXTURES_PILOTO.filter((f) => f.instrumento_modificador === m);
    expect(new Set(porModificador('RI-137-06').map((f) => f.precision_fecha))).toEqual(new Set(['DIA']));
    expect(new Set(porModificador('D.77-2006').map((f) => f.precision_fecha))).toEqual(new Set(['RANGO']));
    for (const m of ['D.40-2008', 'D.59-2015', 'D.21-2015', 'D.168-2009']) {
      expect(new Set(porModificador(m).map((f) => f.precision_fecha))).toEqual(new Set(['AÑO']));
    }
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
        if (r.estado === 'CONTEXT') {
          resueltas++;
          expect(r.advertencias.map((a) => a.codigo)).toContain('TEXTO_NO_VERIFICADO');
        }
      }
    }
    expect(resueltas).toBeGreaterThan(0);
  });
  it('una fila incoherente (texto null, TRUE, elegible_primary=true) tampoco es PRIMARY', () => {
    const vs = [fila({ instrumento_id: 'SINT', unidad: 'N', version_id: 'n1', vigente_desde: '2020-01-01', texto: null, estado_vigencia: 'TRUE', elegible_primary: true, nivel_verificacion: 'PRIMARIA_TEXTO', precision_fecha: 'DIA' })];
    expect(resolverVersion('SINT', 'N', '2021-01-01', vs).estado).toBe('CONTEXT');
  });
  it('texto vacío o sólo espacios tampoco es PRIMARY (CLO)', () => {
    for (const texto of ['', '   ', '\n\t']) {
      const vs = cadena('SINT', 'V', [verificada({ version_id: 'v1', vigente_desde: '2020-01-01', texto })]);
      const r = resolverVersion('SINT', 'V', '2021-01-01', vs);
      expect(r.estado).toBe('CONTEXT');
      expect(codigoDe(r)).toContain('TEXTO_NO_VERIFICADO');
    }
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
    expect(desde.estado).toBe('CONTEXT');
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
    expect(r.estado).toBe('CONTEXT');
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
  it('la versión nueva conserva Gaceta 33,801 y fuente PRIMARIA_IMAGEN, pero sin texto no es PRIMARY', () => {
    const r = resolverVersion(NOTARIADO, '73', '2016-01-01', FIXTURES_PILOTO);
    if (r.estado === 'FALLO_CERRADO') throw new Error('inesperado');
    expect(r.version).toMatchObject({ tipo_evento: 'TEXTO_NUEVO_MISMO_NUMERO', gaceta_numero: '33,801', nivel_verificacion: 'PRIMARIA_IMAGEN' });
    expect(r.estado).toBe('CONTEXT');
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
    expect(despues.estado).toBe('CONTEXT');
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

describe('dictamen CLO 17-oct-2026 — reforma posterior de cualquier nivel', () => {
  const FECHA = '2020-06-01';
  type Res = ReturnType<typeof resolverVersion>;
  const sinFallo = (r: Res) => {
    if (r.estado === 'FALLO_CERRADO') throw new Error('inesperado');
    return r;
  };
  const cods = (r: Res) => sinFallo(r).advertencias.map((a) => a.codigo);
  const avisos = (r: Res) => {
    const x = sinFallo(r) as unknown as { avisosContexto: { version_id: string; advertencia: { codigo: string; mensaje: string } }[] };
    return x.avisosContexto;
  };
  const nv = (p: Partial<NormaVersion> & Pick<NormaVersion, 'version_id' | 'vigente_desde'>) =>
    fila({ ...verificada(p), instrumento_id: NOTARIADO, unidad: '1' });

  const img2015 = (extra: Partial<NormaVersion> = {}) =>
    nv({ version_id: 'img-2015', vigente_desde: '2015-03-01', nivel_verificacion: 'PRIMARIA_IMAGEN', fuente: 'La Gaceta', ...extra });
  const cedij2019 = (extra: Partial<NormaVersion> = {}) =>
    nv({
      version_id: 'cedij-2019',
      vigente_desde: '2019-01-01',
      nivel_verificacion: 'SECUNDARIA',
      fuente: 'CEDIJ',
      tipo_evento: 'REFORMA',
      instrumento_modificador: 'D.999-2019',
      texto: 'TEXTO REFORMADO 2019 (CEDIJ)',
      estado_vigencia: 'TRUE_PRESUNTA',
      elegible_primary: true,
      ...extra,
    });

  describe('caso (a): la posterior cumple todo y se promueve a PRIMARY', () => {
    it('CEDIJ posterior bajo imagen: PRIMARY cedij-2019 con avisos y la anterior en contexto', () => {
      for (const orden of [[img2015(), cedij2019()], [cedij2019(), img2015()]]) {
        const r = sinFallo(resolverVersion(NOTARIADO, '1', FECHA, orden));
        expect(r.estado).toBe('PRIMARY');
        expect(r.version.version_id).toBe('cedij-2019');
        expect(cods(r)).toEqual(expect.arrayContaining(['VERIFICACION_SECUNDARIA', 'VIGENCIA_PRESUNTA']));
        expect(r.contexto.map((v) => v.version_id)).toEqual(['img-2015']);
        const a = avisos(r).filter((x) => x.version_id === 'img-2015');
        expect(a.map((x) => x.advertencia.codigo)).toContain('REFORMA_POSTERIOR');
      }
    });
    it('el aviso REFORMA_POSTERIOR nombra la versión posterior, su nivel y su vigente_desde', () => {
      const r = sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [img2015(), cedij2019()]));
      const adv = avisos(r).find((x) => x.advertencia.codigo === 'REFORMA_POSTERIOR')!.advertencia as unknown as Record<string, unknown>;
      expect(adv.mensaje).toEqual(expect.stringContaining('cedij-2019'));
      expect(adv.mensaje).toEqual(expect.stringContaining('SECUNDARIA'));
      expect(adv.mensaje).toEqual(expect.stringContaining('2019-01-01'));
      expect(adv.version_posterior).toBe('cedij-2019');
      expect(adv.rige_desde).toBe('2019-01-01');
    });
    it('PRIMARIA_TEXTO posterior bajo una imagen: PRIMARY y SIN VERIFICACION_SECUNDARIA', () => {
      const posterior = cedij2019({ nivel_verificacion: 'PRIMARIA_TEXTO', estado_vigencia: 'TRUE', fuente: null });
      const r = sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [img2015(), posterior]));
      expect(r.estado).toBe('PRIMARY');
      expect(r.version.version_id).toBe('cedij-2019');
      expect(cods(r)).not.toContain('VERIFICACION_SECUNDARIA');
      expect(r.contexto.map((v) => v.version_id)).toEqual(['img-2015']);
      expect(avisos(r).map((x) => [x.version_id, x.advertencia.codigo])).toContainEqual(['img-2015', 'REFORMA_POSTERIOR']);
    });
    it.each(['TEXTO_NUEVO_MISMO_NUMERO', 'ADICION'] as const)('tipo_evento %s con modificador también vincula la reforma', (tipo_evento) => {
      const r = sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [img2015(), cedij2019({ tipo_evento })]));
      expect(r.estado).toBe('PRIMARY');
      expect(r.version.version_id).toBe('cedij-2019');
    });
    it('G\': CEDIJ reforma 2019 CON instrumento_modificador sobre imagen con texto es PRIMARY (caso a)', () => {
      const r = sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [img2015(), cedij2019({ instrumento_modificador: 'D.999-2019' })]));
      expect(r.estado).toBe('PRIMARY');
      expect(r.version.version_id).toBe('cedij-2019');
    });
  });

  describe('caso (b): si la posterior falla cualquier condición, CONTEXT de la anterior', () => {
    const esperaContext = (posterior: NormaVersion) => {
      const r = sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [img2015(), posterior]));
      expect(r.estado).toBe('CONTEXT');
      expect(r.version.version_id).toBe('img-2015');
      expect(cods(r)).toContain('REFORMA_POSTERIOR');
      expect(r.contexto.map((v) => v.version_id)).toEqual(['cedij-2019']);
      expect(avisos(r).length).toBeGreaterThan(0);
      return r;
    };

    it('posterior en RANGO: CONTEXT, nunca PRIMARY, version = img-2015', () => {
      esperaContext(cedij2019({ precision_fecha: 'RANGO', vigente_desde_min: '2019-01-01', vigente_desde_max: '2019-01-03' }));
    });
    it('posterior sin evento de reforma vinculado: instrumento_modificador null', () => {
      esperaContext(cedij2019({ instrumento_modificador: null }));
    });
    it('posterior sin evento de reforma vinculado: tipo_evento ORIGINAL aunque haya modificador', () => {
      esperaContext(cedij2019({ tipo_evento: 'ORIGINAL', instrumento_modificador: 'D.999-2019' }));
    });
    it.each([
      ['UNKNOWN', { estado_vigencia: 'UNKNOWN' as const }],
      ['FALSE', { estado_vigencia: 'FALSE' as const }],
      ['elegible_primary=false', { elegible_primary: false }],
      ['texto vacío', { texto: '' }],
      ['texto solo espacios', { texto: '   ' }],
    ])('posterior con %s: CONTEXT', (_m, cambio) => {
      esperaContext(cedij2019(cambio));
    });
    it('posterior con texto null: CONTEXT con REFORMA_POSTERIOR y REFORMA_POSTERIOR_SIN_TEXTO', () => {
      const r = esperaContext(cedij2019({ texto: null, elegible_primary: false }));
      expect(cods(r)).toContain('REFORMA_POSTERIOR_SIN_TEXTO');
    });
  });

  describe('casos reproducidos por el Auditor sobre 2a809f4', () => {
    it('F: reforma PRIMARIA_TEXTO 2019 sin texto bajo imagen con texto: CONTEXT img-2015', () => {
      const reforma = nv({
        version_id: 'txt-reforma-2019',
        vigente_desde: '2019-01-01',
        nivel_verificacion: 'PRIMARIA_TEXTO',
        tipo_evento: 'REFORMA',
        instrumento_modificador: 'D.999-2019',
        texto: null,
        elegible_primary: false,
      });
      const r = sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [img2015(), reforma]));
      expect(r.estado).toBe('CONTEXT');
      expect(r.version.version_id).toBe('img-2015');
      expect(cods(r)).toEqual(expect.arrayContaining(['REFORMA_POSTERIOR', 'REFORMA_POSTERIOR_SIN_TEXTO']));
      expect(r.contexto.map((v) => v.version_id)).toEqual(['txt-reforma-2019']);
    });
    it('F2: la reforma 2019 es SECUNDARIA (CEDIJ) sin texto: CONTEXT img-2015', () => {
      const r = sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [img2015(), cedij2019({ texto: null, elegible_primary: false })]));
      expect(r.estado).toBe('CONTEXT');
      expect(r.version.version_id).toBe('img-2015');
      expect(cods(r)).toEqual(expect.arrayContaining(['REFORMA_POSTERIOR', 'REFORMA_POSTERIOR_SIN_TEXTO']));
    });
    it('G: CEDIJ reforma con texto, TRUE_PRESUNTA y elegible pero SIN instrumento_modificador: CONTEXT, nunca PRIMARY', () => {
      const r = sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [img2015(), cedij2019({ instrumento_modificador: null })]));
      expect(r.estado).toBe('CONTEXT');
      expect(r.version.version_id).toBe('img-2015');
      expect(cods(r)).toContain('REFORMA_POSTERIOR');
    });
  });

  describe('regresión de los casos previos del Auditor', () => {
    const imgOrig = () => nv({ version_id: 'img-orig', vigente_desde: '2015-03-01', vigente_hasta: '2019-01-01', nivel_verificacion: 'PRIMARIA_IMAGEN' });
    const cedij2015 = () =>
      nv({ version_id: 'cedij-2015', vigente_desde: '2015-03-01', nivel_verificacion: 'SECUNDARIA', estado_vigencia: 'TRUE_PRESUNTA', fuente: 'CEDIJ' });

    it('A: imagen de reforma 2019 sin texto sobre cedij-2015: CONTEXT cedij-2015 con REFORMA_POSTERIOR_SIN_TEXTO', () => {
      const imgReforma = nv({
        version_id: 'img-reforma-2019',
        vigente_desde: '2019-01-01',
        nivel_verificacion: 'PRIMARIA_IMAGEN',
        tipo_evento: 'REFORMA',
        texto: null,
        elegible_primary: false,
      });
      const r = sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [imgOrig(), imgReforma, cedij2015()]));
      expect(r.estado).toBe('CONTEXT');
      expect(r.version.version_id).toBe('cedij-2015');
      expect(cods(r)).toContain('REFORMA_POSTERIOR_SIN_TEXTO');
    });
    it('B: igual con PRIMARIA_TEXTO como inferior: CONTEXT', () => {
      const imgReforma = nv({
        version_id: 'img-reforma-2019',
        vigente_desde: '2019-01-01',
        nivel_verificacion: 'PRIMARIA_IMAGEN',
        tipo_evento: 'REFORMA',
        texto: null,
        elegible_primary: false,
      });
      const inferior = nv({ version_id: 'txt-2015', vigente_desde: '2015-03-01', nivel_verificacion: 'PRIMARIA_TEXTO' });
      const r = sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [imgOrig(), imgReforma, inferior]));
      expect(r.estado).toBe('CONTEXT');
      expect(cods(r)).toContain('REFORMA_POSTERIOR_SIN_TEXTO');
    });
    it('D: imagen superior sin texto con el MISMO vigente_desde cede: PRIMARY cedij con VERIFICACION_SECUNDARIA', () => {
      const imgSinTexto = nv({ version_id: 'img-sin-texto', vigente_desde: '2015-03-01', nivel_verificacion: 'PRIMARIA_IMAGEN', texto: null, elegible_primary: false });
      const r = sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [imgSinTexto, cedij2015()]));
      expect(r.estado).toBe('PRIMARY');
      expect(r.version.version_id).toBe('cedij-2015');
      expect(cods(r)).toContain('VERIFICACION_SECUNDARIA');
      expect(cods(r)).not.toContain('REFORMA_POSTERIOR');
      expect(cods(r)).not.toContain('REFORMA_POSTERIOR_SIN_TEXTO');
    });
    it('E: fecha anterior a la reforma de 2019: PRIMARY de la versión anterior (cedij-2015), sin avisos de reforma', () => {
      const imgSinTexto2015 = nv({ version_id: 'img-orig-sin-texto', vigente_desde: '2015-03-01', vigente_hasta: '2019-01-01', nivel_verificacion: 'PRIMARIA_IMAGEN', texto: null, elegible_primary: false });
      const imgReforma = nv({ version_id: 'img-reforma-2019', vigente_desde: '2019-01-01', nivel_verificacion: 'PRIMARIA_IMAGEN', tipo_evento: 'REFORMA', texto: null, elegible_primary: false });
      const r = sinFallo(resolverVersion(NOTARIADO, '1', '2017-06-01', [imgSinTexto2015, imgReforma, cedij2015()]));
      expect(r.estado).toBe('PRIMARY');
      expect(r.version.version_id).toBe('cedij-2015');
      expect(cods(r)).not.toContain('REFORMA_POSTERIOR');
      expect(cods(r)).not.toContain('REFORMA_POSTERIOR_SIN_TEXTO');
    });
    it('E\': con la imagen original con texto y fecha anterior a la reforma, PRIMARY de la imagen', () => {
      const imgReforma = nv({ version_id: 'img-reforma-2019', vigente_desde: '2019-01-01', nivel_verificacion: 'PRIMARIA_IMAGEN', tipo_evento: 'REFORMA', texto: null, elegible_primary: false });
      const r = sinFallo(resolverVersion(NOTARIADO, '1', '2017-06-01', [imgOrig(), imgReforma, cedij2015()]));
      expect(r.estado).toBe('PRIMARY');
      expect(r.version.version_id).toBe('img-orig');
      expect(cods(r)).not.toContain('REFORMA_POSTERIOR');
    });
  });

  describe('fallo CLO 17-oct (interpretaciones): la causa jurídica de la anterior NO impide promover', () => {
    it.each([
      ['FALSE', { estado_vigencia: 'FALSE' as const }],
      ['UNKNOWN', { estado_vigencia: 'UNKNOWN' as const }],
      ['RANGO', { precision_fecha: 'RANGO' as const, vigente_desde_min: '2015-03-01', vigente_desde_max: '2015-03-03' }],
    ])('img-2015 con %s + CEDIJ reforma vinculada y elegible: PRIMARY cedij-2019', (_m, cambio) => {
      const r = sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [img2015(cambio), cedij2019()]));
      expect(r.estado).toBe('PRIMARY');
      expect(r.version.version_id).toBe('cedij-2019');
      expect(cods(r)).toContain('VERIFICACION_SECUNDARIA');
      expect(r.contexto.map((v) => v.version_id)).toEqual(['img-2015']);
      expect(avisos(r).map((a) => a.advertencia.codigo)).toEqual(['REFORMA_POSTERIOR']);
    });
    it('la causa de la anterior sí rige para fechas previas a la vigencia de la posterior', () => {
      const r = sinFallo(resolverVersion(NOTARIADO, '1', '2017-06-01', [img2015({ estado_vigencia: 'FALSE', vigente_hasta: '2019-01-01' }), cedij2019()]));
      expect(r.estado).toBe('CONTEXT');
      expect(r.version.version_id).toBe('img-2015');
      expect(cods(r)).toContain('NORMA_NO_VIGENTE');
    });
  });

  describe('caso piloto: Notariado arts. 72 y 73 derogados (D.77-2006) y texto nuevo del D.59-2015', () => {
    const cadenaPiloto = (unidad: string) =>
      cadena(NOTARIADO, unidad, [
        verificada({ version_id: 'orig-353-2005', vigente_desde: '2005-01-01', tipo_evento: 'ORIGINAL' }),
        {
          version_id: 'd77-2006',
          vigente_desde: '2006-07-23',
          vigente_desde_min: '2006-07-23',
          vigente_desde_max: '2006-07-25',
          precision_fecha: 'RANGO',
          tipo_evento: 'DEROGACION_EXPRESA',
          instrumento_modificador: 'D.77-2006',
          estado_vigencia: 'FALSE',
          nivel_verificacion: 'SECUNDARIA',
        },
        verificada({
          version_id: 'd59-2015',
          vigente_desde: '2015-09-01',
          tipo_evento: 'TEXTO_NUEVO_MISMO_NUMERO',
          instrumento_modificador: 'D.59-2015',
          gaceta_numero: '33,801',
          nivel_verificacion: 'PRIMARIA_IMAGEN',
          texto: 'TEXTO NUEVO D.59-2015 (sintético)',
        }),
      ]);

    it.each(['72', '73'])('art. %s: D.59-2015 sale PRIMARY y la derogación previa rige sólo antes', (unidad) => {
      const vs = cadenaPiloto(unidad);
      const despues = sinFallo(resolverVersion(NOTARIADO, unidad, '2016-01-01', vs));
      expect(despues.estado).toBe('PRIMARY');
      expect(despues.version).toMatchObject({ version_id: 'd59-2015', instrumento_modificador: 'D.59-2015' });
      const antes = sinFallo(resolverVersion(NOTARIADO, unidad, '2010-01-01', vs));
      expect(antes.estado).toBe('CONTEXT');
      expect(antes.version).toMatchObject({ version_id: 'd77-2006', estado_vigencia: 'FALSE' });
    });

    it('con la derogación registrada como versión abierta de otro nivel, D.59-2015 igual sale PRIMARY', () => {
      const derogacionAbierta = fila({
        instrumento_id: NOTARIADO,
        unidad: '72',
        version_id: 'd77-2006-img',
        vigente_desde: '2006-07-23',
        tipo_evento: 'DEROGACION_EXPRESA',
        instrumento_modificador: 'D.77-2006',
        estado_vigencia: 'FALSE',
        nivel_verificacion: 'PRIMARIA_IMAGEN',
        precision_fecha: 'DIA',
      });
      const d59Texto = fila({
        ...verificada({
          version_id: 'd59-2015-txt',
          vigente_desde: '2015-09-01',
          tipo_evento: 'TEXTO_NUEVO_MISMO_NUMERO',
          instrumento_modificador: 'D.59-2015',
          nivel_verificacion: 'PRIMARIA_TEXTO',
        }),
        instrumento_id: NOTARIADO,
        unidad: '72',
      });
      const r = sinFallo(resolverVersion(NOTARIADO, '72', '2016-01-01', [derogacionAbierta, d59Texto]));
      expect(r.estado).toBe('PRIMARY');
      expect(r.version.version_id).toBe('d59-2015-txt');
      expect(r.contexto.map((v) => v.version_id)).toEqual(['d77-2006-img']);
    });
  });

  describe('DEROGACION_EXPRESA e INCONSTITUCIONALIDAD posteriores bloquean y no promueven texto', () => {
    it.each(['DEROGACION_EXPRESA', 'INCONSTITUCIONALIDAD'] as const)('%s posterior: CONTEXT con la propia posterior FALSE; el texto anterior a contexto', (tipo_evento) => {
      const bloqueo = cedij2019({ version_id: 'bloqueo-2019', tipo_evento, instrumento_modificador: 'RI-50-2019', estado_vigencia: 'FALSE', texto: null, elegible_primary: false });
      const r = sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [img2015(), bloqueo]));
      expect(r.estado).toBe('CONTEXT');
      expect(r.version.version_id).toBe('bloqueo-2019');
      expect(cods(r)).toContain('NORMA_NO_VIGENTE');
      expect(r.contexto.map((v) => v.version_id)).toEqual(['img-2015']);
      expect(avisos(r)).toEqual([expect.objectContaining({ version_id: 'img-2015', advertencia: expect.objectContaining({ codigo: 'REFORMA_POSTERIOR' }) })]);
    });
    it.each(['DEROGACION_EXPRESA', 'INCONSTITUCIONALIDAD'] as const)('%s posterior con texto y datos incoherentes (TRUE, elegible) tampoco promueve', (tipo_evento) => {
      const bloqueo = cedij2019({ version_id: 'bloqueo-2019', tipo_evento, instrumento_modificador: 'D.10-2019', estado_vigencia: 'TRUE', elegible_primary: true });
      const r = sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [img2015(), bloqueo]));
      expect(r.estado).toBe('CONTEXT');
      expect(r.version.version_id).toBe('bloqueo-2019');
    });
  });

  describe('vinculación: instrumento_modificador debe identificar un decreto o fallo concreto con número', () => {
    it.each([
      'pendiente', 'Pendiente', 'Decreto pendiente', 's/n', 'S/N', 'Decreto s/n', 'varios', 'Varios decretos', 'decreto', '   ', '',
      // Auditor @ 8da6465 y dictamen CLO 18-oct-2026 (lista blanca; la Gaceta sola nunca vincula).
      'Gaceta 33,801', '2019', 'Decreto del 2019', 'Decreto No. ___ 2019', 'N/D 2019', 'sin número (2019)', 'Sin numero 2019',
      'por definir 1', 'TBD-1', 'D.59-2015 Gaceta 33,801', 'Acuerdo 679', 'Resolución PCSJ',
      // Auditor @ 86cf62f, P2(a) y (c): siglas que no son resolución, «s/n» y «n/d» con otra grafía, año y número imposibles.
      'Oficio-12-2019', 'Circular-1-2019', 'Memo-1-2019', 'Ley-12-2019', 'ND-1-2019', 'NA-1-2019', 'SN-1-2019',
      'Sin-Numero-1-2019', 'S.N.-1-2019', 'N.D. 2019', 'D.59-9999', 'D.59-1700', 'D.0-00', 'Decreto 000-2015',
      // Addendum CLO 18-oct-2026 (Auditor @ 20eeac7): sólo siglas verificadas (PCSJ, PCM, RI); año entre 1821 y vigente_desde.
      'Acta-1-2019', 'Dictamen-1-2019', 'LG-32958-2012', 'Oficios-12-2019', 'XX-1-2019', 'PEND-1-2019',
      'STSS-001-2020', 'Resolución CNBS-1-2019', 'Resolución XX-1-2019', 'Acuerdo 679-2014', 'Acuerdo Ministerial 12-2018',
      'D.59-1820', 'D.59-2099', 'D.10-2020',
      // Revisión cruzada: «NO» pegado a una sigla no se quita.
      'NOPCSJ-17-2012', 'NORI-137-06', 'NOPCM-5-2020',
    ])(
      'modificador «%s» no vincula: CONTEXT de la anterior con REFORMA_POSTERIOR',
      (instrumento_modificador) => {
        const r = sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [img2015(), cedij2019({ instrumento_modificador })]));
        expect(r.estado).toBe('CONTEXT');
        expect(r.version.version_id).toBe('img-2015');
        expect(cods(r)).toContain('REFORMA_POSTERIOR');
      },
    );
    it('modificador null no vincula', () => {
      const r = sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [img2015(), cedij2019({ instrumento_modificador: null })]));
      expect(r.estado).toBe('CONTEXT');
      expect(r.version.version_id).toBe('img-2015');
    });
    it('un modificador escrito fuera de la lista blanca va a curacionDatos (VINCULO_NO_IDENTIFICADO)', () => {
      const r = sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [img2015(), cedij2019({ instrumento_modificador: 'Acuerdo 679-2014' })]));
      expect(r.curacionDatos).toEqual([expect.objectContaining({ version_id: 'cedij-2019', motivo: 'VINCULO_NO_IDENTIFICADO' })]);
      // Criterio CLO 18-oct-2026 sobre #69: un evento sin instrumento también va a curación.
      expect(sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [img2015(), cedij2019({ instrumento_modificador: null })])).curacionDatos).toEqual([
        expect.objectContaining({ version_id: 'cedij-2019', motivo: 'SIN_INSTRUMENTO_MODIFICADOR' }),
      ]);
      expect(sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [img2015(), cedij2019()])).curacionDatos).toEqual([]);
    });
    it('un año igual al de vigente_desde vincula; uno posterior no', () => {
      expect(identificaDecretoOFallo('D.999-2019', '2019-01-01')).toBe(true);
      expect(identificaDecretoOFallo('D.999-2020', '2019-12-31')).toBe(false);
      expect(identificaDecretoOFallo('D.59-1821', '2015-09-01')).toBe(true);
      expect(identificaDecretoOFallo('RI-137-06', '2007-08-07')).toBe(true);
    });
    it('normalizarModificador: espacios, guiones, «Número/No./N°/Nº» y mayúsculas; no expande años', () => {
      expect(normalizarModificador('  ri   137 – 06 ')).toBe('RI-137-06');
      expect(normalizarModificador('Decreto Número 59-2015')).toBe('DECRETO 59-2015');
      expect(normalizarModificador('Decreto Nº 59 - 2015')).toBe('DECRETO 59-2015');
      expect(normalizarModificador('Resolución No. PCSJ-17-2012')).toBe('RESOLUCIÓN PCSJ-17-2012');
    });
    it('la lista blanca V1 de siglas es dato exportado: PCSJ, PCM y RI', () => {
      expect(SIGLAS_VINCULO_V1.map((s) => s.sigla)).toEqual(['PCSJ', 'PCM', 'RI']);
      for (const s of SIGLAS_VINCULO_V1) expect(s.fuente).toMatch(/CLO/);
    });
    it.each([
      // Decreto (legislativo) y su normalización
      'D.59-2015', 'D. 59-2015', 'Decreto 59-2015', 'Decreto Número 59-2015', 'Decreto No. 59-2015', 'Decreto N° 59-2015',
      'Decreto 168-2009', 'Decreto Legislativo 59-2015', '  D.59-2015  ',
      // Decreto Ejecutivo (PCM) y Acuerdo Ejecutivo
      'D59-2015', 'D 59-2015', 'PCM-005-2020', 'Decreto Ejecutivo PCM-005-2020', 'AE 679-2014', 'A.E. 679-2014',
      'Acuerdo Ejecutivo 679-2014', 'Acuerdo Ejecutivo No. 679-2014', 'Acuerdo Ejecutivo 001-2020',
      // Resolución PCSJ
      'PCSJ-17-2012', 'Resolución PCSJ-17-2012', 'Resolucion No. PCSJ-17-2012',
      // Sentencia o expediente RI
      'RI-137-06', 'RI 137-06', 'Sentencia RI 137-06', 'Sentencia RI-137-06', 'Fallo RI-137-06', 'Expediente RI-137-06',
      'N° RI 137-06', 'Resolución N° PCSJ 17-2012', 'Decreto Ejecutivo Número PCM 005-2020',
    ])('modificador «%s» sí vincula: PRIMARY la posterior', (instrumento_modificador) => {
      // vigente_desde 2021: todos los años de la lista son anteriores o iguales.
      const r = sinFallo(resolverVersion(NOTARIADO, '1', '2022-06-01', [img2015(), cedij2019({ instrumento_modificador, vigente_desde: '2021-01-01' })]));
      expect(r.estado).toBe('PRIMARY');
      expect(r.version.version_id).toBe('cedij-2019');
    });
  });

  describe('sin reviviscencia automática (reforma posterior con vigencia cerrada)', () => {
    const reformaCerrada = () => cedij2019({ vigente_hasta: '2021-01-01' });

    it('durante la vigencia de la reforma, la reforma es PRIMARY', () => {
      const r = sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [img2015(), reformaCerrada()]));
      expect(r.estado).toBe('PRIMARY');
      expect(r.version.version_id).toBe('cedij-2019');
    });
    it('después de cerrar la reforma, el texto anterior no revive: FALLO_CERRADO con aviso SIN_REVIVISCENCIA', () => {
      const r = resolverVersion(NOTARIADO, '1', '2022-06-01', [img2015(), reformaCerrada()]);
      expect(r.estado).toBe('FALLO_CERRADO');
      if (r.estado !== 'FALLO_CERRADO') throw new Error('inesperado');
      expect(r.motivo).toBe('SIN_REVIVISCENCIA');
      expect(r.mensaje).toBe('no hay texto verificado para esa fecha');
      expect(r.advertencias).toEqual([
        expect.objectContaining({ codigo: 'SIN_REVIVISCENCIA', version_posterior: 'cedij-2019', rige_desde: '2019-01-01' }),
      ]);
    });
    it('el día exacto en que cierra la reforma ya no revive el texto anterior', () => {
      expect(resolverVersion(NOTARIADO, '1', '2021-01-01', [img2015(), reformaCerrada()]).estado).toBe('FALLO_CERRADO');
    });
    it('un evento posterior expreso que restablece el texto sí vuelve a dar PRIMARY', () => {
      const restablece = nv({
        version_id: 'txt-restablece-2021',
        vigente_desde: '2021-01-01',
        nivel_verificacion: 'PRIMARIA_TEXTO',
        tipo_evento: 'TEXTO_NUEVO_MISMO_NUMERO',
        instrumento_modificador: 'D.300-2020',
        texto: 'TEXTO RESTABLECIDO (sintético)',
      });
      const r = sinFallo(resolverVersion(NOTARIADO, '1', '2022-06-01', [img2015(), reformaCerrada(), restablece]));
      expect(r.estado).toBe('PRIMARY');
      expect(r.version.version_id).toBe('txt-restablece-2021');
    });
    it('una fuente superior cerrada que empezó a la vez que la inferior no impide servir la inferior', () => {
      const cedijMisma = cedij2019({ version_id: 'cedij-2015', vigente_desde: '2015-03-01', tipo_evento: 'ORIGINAL', instrumento_modificador: null });
      const r = sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [img2015({ vigente_hasta: '2018-01-01' }), cedijMisma]));
      expect(r.estado).toBe('PRIMARY');
      expect(r.version.version_id).toBe('cedij-2015');
    });
  });

  describe('dictamen CLO 18-oct-2026: VIGENCIA_CERRADA_SIN_EVENTO frente a SIN_REVIVISCENCIA', () => {
    const edicionCerrada = (extra: Partial<NormaVersion> = {}) =>
      cedij2019({ version_id: 'cedij-ed-2016', vigente_desde: '2016-01-01', vigente_hasta: '2019-01-01', tipo_evento: 'ORIGINAL', instrumento_modificador: null, ...extra });

    it('ORIGINAL posterior cerrada sin evento: CONTEXT (no FALSE, no FALLO_CERRADO), aviso y curación', () => {
      const r = sinFallo(resolverVersion(NOTARIADO, '1', '2022-06-01', [img2015(), edicionCerrada()]));
      expect(r.estado).toBe('CONTEXT');
      expect(r.version.version_id).toBe('img-2015');
      expect(r.version.estado_vigencia).toBe('TRUE');
      expect(cods(r)).toContain('VIGENCIA_CERRADA_SIN_EVENTO');
      expect(cods(r)).not.toContain('SIN_REVIVISCENCIA');
      expect(cods(r)).not.toContain('NORMA_NO_VIGENTE');
      expect(r.contexto.map((v) => v.version_id)).toEqual(['cedij-ed-2016']);
      expect(avisos(r)).toEqual([
        expect.objectContaining({ version_id: 'cedij-ed-2016', advertencia: expect.objectContaining({ codigo: 'VIGENCIA_CERRADA_SIN_EVENTO' }) }),
      ]);
      expect(r.curacionDatos).toEqual([
        { version_id: 'cedij-ed-2016', motivo: 'VIGENCIA_CERRADA_SIN_EVENTO', mensaje: expect.stringContaining('2019-01-01') },
      ]);
    });
    it('REFORMA posterior cerrada sin vínculo identificado también es VIGENCIA_CERRADA_SIN_EVENTO, no SIN_REVIVISCENCIA', () => {
      const r = sinFallo(resolverVersion(NOTARIADO, '1', '2022-06-01', [img2015(), cedij2019({ vigente_hasta: '2021-01-01', instrumento_modificador: 'sin número (2019)' })]));
      expect(r.estado).toBe('CONTEXT');
      expect(cods(r)).toContain('VIGENCIA_CERRADA_SIN_EVENTO');
      expect(r.curacionDatos.map((c) => [c.version_id, c.motivo])).toEqual([
        ['cedij-2019', 'VIGENCIA_CERRADA_SIN_EVENTO'],
        ['cedij-2019', 'VINCULO_NO_IDENTIFICADO'],
      ]);
    });
    it('REFORMA posterior cerrada con decreto identificado: FALLO_CERRADO SIN_REVIVISCENCIA, sin curación', () => {
      const r = resolverVersion(NOTARIADO, '1', '2022-06-01', [img2015(), cedij2019({ vigente_hasta: '2021-01-01' })]);
      expect(r.estado).toBe('FALLO_CERRADO');
      if (r.estado !== 'FALLO_CERRADO') throw new Error('inesperado');
      expect(r.motivo).toBe('SIN_REVIVISCENCIA');
      expect('curacionDatos' in r).toBe(false);
    });
    it('con una cerrada real y otra sin evento, manda SIN_REVIVISCENCIA', () => {
      const r = resolverVersion(NOTARIADO, '1', '2022-06-01', [img2015(), edicionCerrada({ vigente_hasta: '2017-01-01' }), cedij2019({ version_id: 'txt-2018', vigente_desde: '2018-01-01', vigente_hasta: '2020-01-01', nivel_verificacion: 'PRIMARIA_TEXTO', instrumento_modificador: 'D.10-2018' })]);
      expect(codigoDe(r)).toBe('SIN_REVIVISCENCIA');
    });
    it('antes del cierre de la edición ORIGINAL rige la regla de versión posterior, sin aviso de vigencia cerrada ni curación', () => {
      const r = sinFallo(resolverVersion(NOTARIADO, '1', '2017-06-01', [img2015(), edicionCerrada()]));
      expect(r.estado).toBe('CONTEXT');
      expect(r.version.version_id).toBe('img-2015');
      expect(cods(r)).toContain('REFORMA_POSTERIOR');
      expect(cods(r)).not.toContain('VIGENCIA_CERRADA_SIN_EVENTO');
      expect(r.curacionDatos).toEqual([]);
    });
  });

  describe('regla CLO 18-oct-2026: años de 2 cifras y formatos', () => {
    // resolverVersion lee el año en curso del reloj: se fija en 2026 para que los tests no dependan de la fecha.
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-18T12:00:00Z'));
    });
    afterEach(() => {
      vi.useRealTimers();
    });
    it('el año en curso se inyecta en resolverVersion (resultado reproducible sin depender del reloj)', () => {
      const vs = [img2015({ vigente_desde: '1980-01-01' }), cedij2019({ instrumento_modificador: 'RI-12-27', vigente_desde: '2000-01-01' })];
      // 2026: «27» se lee 1927 (≤ 2000) -> vincula. 2027: se lee 2027 (> 2000) -> no vincula y va a curación.
      expect(sinFallo(resolverVersion(NOTARIADO, '1', '2030-06-01', vs, { anioEnCurso: 2026 })).estado).toBe('PRIMARY');
      const r2027 = sinFallo(resolverVersion(NOTARIADO, '1', '2030-06-01', vs, { anioEnCurso: 2027 }));
      expect(r2027.estado).toBe('CONTEXT');
      expect(r2027.curacionDatos).toContainEqual(expect.objectContaining({ version_id: 'cedij-2019', motivo: 'VINCULO_NO_IDENTIFICADO' }));
      // Sin opciones se usa el reloj (fijado en 2026 en este describe).
      expect(sinFallo(resolverVersion(NOTARIADO, '1', '2030-06-01', vs)).estado).toBe('PRIMARY');
      expect(anioEnCursoUTC()).toBe(2026);
    });
    it('un año en curso inválido nunca permite leer un año de 2 cifras', () => {
      expect(identificaDecretoOFallo('Decreto 59-15', '2016-01-01', Number.NaN)).toBe(false);
      expect(identificaDecretoOFallo('PCSJ-17-12', '2016-01-01', Number.NaN)).toBe(false);
      expect(identificaDecretoOFallo('Decreto 59-2015', '2016-01-01', Number.NaN)).toBe(true);
    });
    const posterior = (instrumento_modificador: string, vigente_desde: string) =>
      cedij2019({ instrumento_modificador, vigente_desde });
    const resolver = (mod: string, vigente_desde: string) =>
      sinFallo(resolverVersion(NOTARIADO, '1', '2030-06-01', [img2015({ vigente_desde: '1980-01-01' }), posterior(mod, vigente_desde)]));

    it('Decreto 144-83 vincula (leído como 1983)', () => {
      expect(identificaDecretoOFallo('Decreto 144-83', '1984-01-01', 2026)).toBe(true);
      expect(resolver('Decreto 144-83', '1984-01-01').estado).toBe('PRIMARY');
    });
    it('Decreto 59-15 en un evento de 2016 no vincula: 1915 y 2015 caben, ANIO_2_CIFRAS_AMBIGUO', () => {
      // Antes (#69) se rechazaba por «desde 2000 se exigen 4 cifras»; el criterio CLO sobre #69 lo
      // reemplaza por la desambiguación contra vigente_desde: aquí quedan los dos candidatos.
      expect(identificaDecretoOFallo('Decreto 59-15', '2016-01-01', 2026)).toBe(false);
      expect(rechazoVinculo('Decreto 59-15', '2016-01-01', 2026)?.motivo).toBe('ANIO_2_CIFRAS_AMBIGUO');
      const r = resolver('Decreto 59-15', '2016-01-01');
      expect(r.estado).toBe('CONTEXT');
      expect(r.curacionDatos).toContainEqual(expect.objectContaining({ version_id: 'cedij-2019', motivo: 'ANIO_2_CIFRAS_AMBIGUO' }));
    });
    it('Decreto 59-99 en un evento de 1998 no vincula (1999 > 1998) y va a curación', () => {
      expect(identificaDecretoOFallo('Decreto 59-99', '1998-06-01', 2026)).toBe(false);
      expect(identificaDecretoOFallo('Decreto 59-99', '1999-06-01', 2026)).toBe(true);
      expect(resolver('Decreto 59-99', '1998-06-01').curacionDatos).toContainEqual(expect.objectContaining({ motivo: 'VINCULO_NO_IDENTIFICADO' }));
    });
    it('RI-137-06 en un evento de 2007 vincula (leído como 2006)', () => {
      expect(identificaDecretoOFallo('RI-137-06', '2007-08-07', 2026)).toBe(true);
      expect(resolver('RI-137-06', '2007-08-07').estado).toBe('PRIMARY');
    });
    it('RI-137-06 en un evento de 2005 no vincula y va a curación', () => {
      expect(identificaDecretoOFallo('RI-137-06', '2005-01-01', 2026)).toBe(false);
      expect(resolver('RI-137-06', '2005-01-01').curacionDatos).toContainEqual(expect.objectContaining({ motivo: 'VINCULO_NO_IDENTIFICADO' }));
    });
    it('RI con YY mayor que el año en curso se lee 19YY', () => {
      expect(identificaDecretoOFallo('RI-12-99', '2000-01-01', 2026)).toBe(true); // 1999
      expect(identificaDecretoOFallo('RI-12-27', '2000-01-01', 2026)).toBe(true); // 1927
      expect(identificaDecretoOFallo('RI-12-26', '2000-01-01', 2026)).toBe(false); // 2026 > 2000
    });
    it('el año de 2 cifras no se expande en el texto: la normalización conserva «06»', () => {
      expect(normalizarModificador('RI 137-06')).toBe('RI-137-06');
    });
    it.each(['AE 679-2014', 'A.E. 679-2014', 'D59-2015', 'D.59-2015', 'D 59-2015', 'Fallo RI-137-06', 'Sentencia RI-137-06', 'Expediente RI-137-06'])(
      '%s vincula',
      (mod) => {
        expect(identificaDecretoOFallo(mod, '2016-01-01', 2026)).toBe(true);
      },
    );
    it.each(['DE 12-2018', 'D.E. 12-2018', 'Decreto Ejecutivo 12-2018'])('%s (Decreto Ejecutivo sin PCM) no vincula y va a curación', (mod) => {
      expect(motivoRechazoVinculo(mod, '2019-01-01', 2026)).toBe('Decreto Ejecutivo sin sigla PCM');
      const r = resolver(mod, '2019-01-01');
      expect(r.estado).toBe('CONTEXT');
      expect(r.curacionDatos).toContainEqual(expect.objectContaining({ version_id: 'cedij-2019', motivo: 'VINCULO_NO_IDENTIFICADO' }));
    });
    it('la curación de vínculos alcanza a cualquier fila de evento, no sólo a la posterior', () => {
      // Fila antigua cerrada con vínculo rechazado + vigente válida: se sirve la vigente y la antigua va a curación.
      const antigua = nv({ version_id: 'ref-2010', vigente_desde: '2010-01-01', vigente_hasta: '2015-03-01', tipo_evento: 'REFORMA', instrumento_modificador: 'Acuerdo 12-2010' });
      const vigente = img2015({ tipo_evento: 'REFORMA', instrumento_modificador: 'D.21-2015' });
      const r = sinFallo(resolverVersion(NOTARIADO, '1', '2016-01-01', [antigua, vigente]));
      expect(r.estado).toBe('PRIMARY');
      expect(r.curacionDatos).toEqual([expect.objectContaining({ version_id: 'ref-2010', motivo: 'VINCULO_NO_IDENTIFICADO' })]);
    });
    it('un FALLO_CERRADO también lleva los vínculos rechazados; sin ellos no trae curacionDatos', () => {
      const rechazada = nv({ version_id: 'ref-2010', vigente_desde: '2010-01-01', vigente_hasta: '2011-01-01', tipo_evento: 'REFORMA', instrumento_modificador: 'DE 1-2010' });
      const r = resolverVersion(NOTARIADO, '1', '2005-01-01', [rechazada]);
      expect(r.estado).toBe('FALLO_CERRADO');
      if (r.estado !== 'FALLO_CERRADO') throw new Error('inesperado');
      expect(r.curacionDatos).toEqual([expect.objectContaining({ version_id: 'ref-2010', motivo: 'VINCULO_NO_IDENTIFICADO' })]);
      const ok = resolverVersion(NOTARIADO, '1', '2005-01-01', [img2015()]);
      expect('curacionDatos' in ok).toBe(false);
    });
  });

  describe('criterio CLO 18-oct-2026 sobre #69: desambiguación de años de 2 cifras y eventos sin instrumento', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-18T12:00:00Z'));
    });
    afterEach(() => {
      vi.useRealTimers();
    });
    const resolver = (mod: string | null, vigente_desde: string, tipo_evento: NormaVersion['tipo_evento'] = 'REFORMA') =>
      sinFallo(
        resolverVersion(NOTARIADO, '1', '2030-06-01', [
          img2015({ vigente_desde: '1900-01-01' }),
          cedij2019({ instrumento_modificador: mod, vigente_desde, tipo_evento }),
        ]),
      );

    it('«Decreto 59-15» con un evento de 2016: ambiguo, curación ANIO_2_CIFRAS_AMBIGUO, no vincula', () => {
      const r = resolver('Decreto 59-15', '2016-01-01');
      expect(r.estado).toBe('CONTEXT');
      expect(r.version.version_id).toBe('img-2015');
      expect(r.curacionDatos).toContainEqual(expect.objectContaining({ version_id: 'cedij-2019', motivo: 'ANIO_2_CIFRAS_AMBIGUO' }));
    });
    it('«Decreto 59-15» con un evento de 1916 vincula como 1915 (2015 > 1916)', () => {
      expect(rechazoVinculo('Decreto 59-15', '1916-01-01', 2026)).toBeNull();
      const r = resolver('Decreto 59-15', '1916-01-01');
      expect(r.estado).toBe('PRIMARY');
      expect(r.version.version_id).toBe('cedij-2019');
      expect(r.curacionDatos).toEqual([]);
    });
    it('«Decreto 144-83» vincula como 1983 (2083 > vigente_desde)', () => {
      expect(rechazoVinculo('Decreto 144-83', '1984-01-01', 2026)).toBeNull();
      expect(resolver('Decreto 144-83', '1984-01-01').estado).toBe('PRIMARY');
      // Con un evento de 1982, ni 1983 ni 2083 caben: no vincula.
      expect(rechazoVinculo('Decreto 144-83', '1982-01-01', 2026)?.motivo).toBe('VINCULO_NO_IDENTIFICADO');
    });
    it('«PCM-008-97» vincula como 1997', () => {
      expect(rechazoVinculo('PCM-008-97', '1998-01-01', 2026)).toBeNull();
      expect(resolver('PCM-008-97', '1998-01-01').estado).toBe('PRIMARY');
    });
    it('«PCM 05-20» con un evento de 2021: ambiguo (1920 y 2020), curación, no vincula', () => {
      expect(rechazoVinculo('PCM 05-20', '2021-01-01', 2026)?.motivo).toBe('ANIO_2_CIFRAS_AMBIGUO');
      const r = resolver('PCM 05-20', '2021-01-01');
      expect(r.estado).toBe('CONTEXT');
      expect(r.curacionDatos).toContainEqual(expect.objectContaining({ motivo: 'ANIO_2_CIFRAS_AMBIGUO' }));
    });
    it('AE y PCSJ siguen el mismo criterio que Decreto y PCM', () => {
      expect(rechazoVinculo('AE 1-85', '1990-01-01', 2026)).toBeNull();
      expect(rechazoVinculo('AE 1-15', '2016-01-01', 2026)?.motivo).toBe('ANIO_2_CIFRAS_AMBIGUO');
      expect(rechazoVinculo('PCSJ-17-12', '2013-01-01', 2026)?.motivo).toBe('ANIO_2_CIFRAS_AMBIGUO');
      expect(rechazoVinculo('PCSJ-17-12', '1913-01-01', 2026)).toBeNull();
    });
    it('con 4 cifras no cambia nada: rango 1821..vigente_desde', () => {
      expect(rechazoVinculo('Decreto 59-2015', '2016-01-01', 2026)).toBeNull();
      expect(rechazoVinculo('Decreto 59-1820', '2016-01-01', 2026)?.motivo).toBe('VINCULO_NO_IDENTIFICADO');
      expect(rechazoVinculo('Decreto 59-2017', '2016-01-01', 2026)?.motivo).toBe('VINCULO_NO_IDENTIFICADO');
    });
    it.each(['2015-01-01', '2016-06-01', '2030-01-01'])('«RI-137-15» con un evento de %s vincula como 2015 (RI no cambia)', (vigente_desde) => {
      expect(rechazoVinculo('RI-137-15', vigente_desde, 2026)).toBeNull();
      expect(resolver('RI-137-15', vigente_desde).estado).toBe('PRIMARY');
    });
    it('«RI-137-15» con un evento de 2014 no vincula (2015 > 2014)', () => {
      expect(rechazoVinculo('RI-137-15', '2014-01-01', 2026)?.motivo).toBe('VINCULO_NO_IDENTIFICADO');
    });

    it('instrumento_modificador nulo: curación SIN_INSTRUMENTO_MODIFICADOR y FALLO_CERRADO sin promover', () => {
      // Hoy (#69) esta unidad ya da FALLO_CERRADO SIN_REVIVISCENCIA: la reforma D.10-2019 cerró en 2021 y la
      // edición CEDIJ de 2021 no tiene instrumento, así que no restablece ni promueve su texto.
      const vs = [
        img2015(),
        nv({ version_id: 'ref-2019', vigente_desde: '2019-01-01', vigente_hasta: '2021-01-01', nivel_verificacion: 'PRIMARIA_TEXTO', tipo_evento: 'REFORMA', instrumento_modificador: 'D.10-2019' }),
        cedij2019({ version_id: 'cedij-2021', vigente_desde: '2021-01-01', instrumento_modificador: null }),
      ];
      const r = resolverVersion(NOTARIADO, '1', '2022-06-01', vs);
      expect(r.estado).toBe('FALLO_CERRADO');
      if (r.estado !== 'FALLO_CERRADO') throw new Error('inesperado');
      expect(r.motivo).toBe('SIN_REVIVISCENCIA');
      expect(r.curacionDatos).toEqual([expect.objectContaining({ version_id: 'cedij-2021', motivo: 'SIN_INSTRUMENTO_MODIFICADOR' })]);
      // Con el instrumento identificado, la misma fila sí restablece el texto (contraste).
      const conInstrumento = vs.map((v) => (v.version_id === 'cedij-2021' ? { ...v, instrumento_modificador: 'D.5-2021' } : v));
      const ok = sinFallo(resolverVersion(NOTARIADO, '1', '2022-06-01', conInstrumento));
      expect(ok.estado).toBe('PRIMARY');
      expect(ok.version.version_id).toBe('cedij-2021');
    });
    it('instrumento_modificador vacío o sólo espacios: misma curación, no vincula', () => {
      for (const mod of ['', '   ']) {
        const r = resolver(mod, '2019-01-01');
        expect(r.estado).toBe('CONTEXT');
        expect(r.version.version_id).toBe('img-2015');
        expect(r.curacionDatos).toContainEqual(expect.objectContaining({ version_id: 'cedij-2019', motivo: 'SIN_INSTRUMENTO_MODIFICADOR' }));
      }
    });
    it.each(['DEROGACION_EXPRESA', 'INCONSTITUCIONALIDAD'] as const)('%s sin instrumento sigue bloqueando y va a curación', (tipo_evento) => {
      const bloqueo = cedij2019({ version_id: 'bloqueo-2019', tipo_evento, instrumento_modificador: null, estado_vigencia: 'FALSE', texto: null, elegible_primary: false });
      const r = sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [img2015(), bloqueo]));
      expect(r.estado).toBe('CONTEXT');
      expect(r.version.version_id).toBe('bloqueo-2019');
      expect(r.contexto.map((v) => v.version_id)).toEqual(['img-2015']);
      expect(r.curacionDatos).toEqual([expect.objectContaining({ version_id: 'bloqueo-2019', motivo: 'SIN_INSTRUMENTO_MODIFICADOR' })]);
    });
    it('VIGENCIA_CERRADA_SIN_EVENTO y SIN_INSTRUMENTO_MODIFICADOR conviven en la misma cola', () => {
      const r = sinFallo(resolverVersion(NOTARIADO, '1', '2022-06-01', [img2015(), cedij2019({ vigente_hasta: '2021-01-01', instrumento_modificador: null })]));
      expect(r.curacionDatos.map((c) => [c.version_id, c.motivo])).toEqual([
        ['cedij-2019', 'VIGENCIA_CERRADA_SIN_EVENTO'],
        ['cedij-2019', 'SIN_INSTRUMENTO_MODIFICADOR'],
      ]);
    });
  });

  describe('FECHA_EN_RANGO_INCIERTO ⇒ CONTEXT para AÑO y RANGO, bordes inclusive', () => {
    const anio = img2015({ vigente_desde: '2015-01-01', vigente_desde_min: '2015-01-01', vigente_desde_max: '2015-12-31', precision_fecha: 'AÑO' });
    it.each(['2015-01-01', '2015-06-30', '2015-12-31'])('AÑO, fecha %s dentro del margen: CONTEXT con FECHA_EN_RANGO_INCIERTO', (f) => {
      const r = sinFallo(resolverVersion(NOTARIADO, '1', f, [anio]));
      expect(r.estado).toBe('CONTEXT');
      expect(cods(r)).toContain('FECHA_EN_RANGO_INCIERTO');
    });
    it('AÑO, día siguiente al borde superior: PRIMARY sin FECHA_EN_RANGO_INCIERTO', () => {
      const r = sinFallo(resolverVersion(NOTARIADO, '1', '2016-01-01', [anio]));
      expect(r.estado).toBe('PRIMARY');
      expect(cods(r)).not.toContain('FECHA_EN_RANGO_INCIERTO');
    });
    const rango = img2015({ vigente_desde: '2006-07-23', vigente_desde_min: '2006-07-23', vigente_desde_max: '2006-07-25', precision_fecha: 'RANGO', elegible_primary: false });
    it.each(['2006-07-23', '2006-07-24', '2006-07-25'])('RANGO, fecha %s dentro del margen: CONTEXT con FECHA_EN_RANGO_INCIERTO', (f) => {
      const r = sinFallo(resolverVersion(NOTARIADO, '1', f, [rango]));
      expect(r.estado).toBe('CONTEXT');
      expect(cods(r)).toContain('FECHA_EN_RANGO_INCIERTO');
    });
    it('RANGO, fuera del margen: sigue CONTEXT (RANGO nunca es PRIMARY) pero sin FECHA_EN_RANGO_INCIERTO', () => {
      const r = sinFallo(resolverVersion(NOTARIADO, '1', '2006-07-26', [rango]));
      expect(r.estado).toBe('CONTEXT');
      expect(cods(r)).not.toContain('FECHA_EN_RANGO_INCIERTO');
      expect(cods(r)).toContain('FECHA_EN_RANGO');
    });
  });

  describe('reglas que se mantienen', () => {
    it('texto null, vacío o solo espacios nunca es PRIMARY (incluso con posterior vinculada)', () => {
      for (const texto of [null, '', '   ']) {
        const sola = sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [img2015({ texto })]));
        expect(sola.estado).toBe('CONTEXT');
        const conPosterior = sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [img2015(), cedij2019({ texto })]));
        expect(conPosterior.estado).toBe('CONTEXT');
      }
    });
    it('PRIMARIA_IMAGEN gana a CEDIJ en la misma fecha (sin posterior): PRIMARY imagen, cedij en contexto, sin REFORMA_POSTERIOR', () => {
      const cedijMisma = cedij2019({ version_id: 'cedij-2015', vigente_desde: '2015-03-01', tipo_evento: 'ORIGINAL', instrumento_modificador: null });
      const r = sinFallo(resolverVersion(NOTARIADO, '1', FECHA, [cedijMisma, img2015()]));
      expect(r.estado).toBe('PRIMARY');
      expect(r.version.version_id).toBe('img-2015');
      expect(r.contexto.map((v) => v.version_id)).toEqual(['cedij-2015']);
      expect(cods(r)).not.toContain('REFORMA_POSTERIOR');
      expect(avisos(r)).toEqual([]);
    });
    it('fecha anterior a la reforma: PRIMARY de la versión anterior y avisosContexto vacío', () => {
      const imgCerrada = img2015({ vigente_hasta: '2019-01-01' });
      const r = sinFallo(resolverVersion(NOTARIADO, '1', '2017-06-01', [imgCerrada, cedij2019()]));
      expect(r.estado).toBe('PRIMARY');
      expect(r.version.version_id).toBe('img-2015');
      expect(avisos(r)).toEqual([]);
    });
    it('FECHA_EN_RANGO_INCIERTO se mantiene', () => {
      const r = sinFallo(resolverVersion(NOTARIADO, '1', '2015-03-02', [img2015({ vigente_desde_min: '2015-03-01', vigente_desde_max: '2015-03-03' })]));
      expect(r.estado).toBe('CONTEXT');
      expect(cods(r)).toContain('FECHA_EN_RANGO_INCIERTO');
    });
  });
});
