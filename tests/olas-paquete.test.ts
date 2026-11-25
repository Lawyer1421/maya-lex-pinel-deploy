import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sanear, refluir, problemasDeIntegridad, tipificarNota, clasificar, articulosDeNota, aplicarEfectosPosteriores } from '../scripts/olas/ola1-cpp';
import { escribirPaquete, generarPs1, validarFilas, sha256, REF_PROD, REF_STAGING, type ConfigOla, type FilaOla } from '../scripts/olas/paquete-ola';
import { estaFirmado, planificar } from '../scripts/olas/ejecutar-sql';

describe('OLA1 CPP · saneamiento', () => {
  it('retira llamadas de nota del encabezado solo si son notas del artículo', () => {
    const r = sanear('311', 'Artículo 311.50, 51 Lecturas y Reproducción.\nTexto.', new Set([50, 51]));
    expect(r.contenido).toBe('Lecturas y Reproducción. Texto.');
    expect(() => sanear('311', 'Artículo 311.50, 51 Lecturas.', new Set([50]))).toThrow(/no son notas de este artículo/);
  });
  it('reconoce las variantes de encabezado bis', () => {
    expect(sanear('127-A', 'Artículo 127-A.-16 Sin perjuicio de lo que.', new Set([16])).contenido).toBe('Sin perjuicio de lo que.');
    expect(sanear('219-A', 'Artículo 219.-A. Incautación.', new Set()).contenido).toBe('Incautación.');
  });
  it('retira la llamada en el texto y extrae la nota con asterisco como constancia', () => {
    const r = sanear('27', 'Artículo 27. Delitos.\n\n3) Derogado;5\n\n4) La estafa.', new Set([5]));
    expect(r.contenido).toBe('Delitos.\n\n3) Derogado;\n\n4) La estafa.');
    const a = sanear('227', 'Artículo 227. Exentos:\n\n2) Secretarios;\n\n*Consejo Nacional Electoral, creado por\nDecreto 200-2018.\n\n6) Ante el *Tribunal Supremo Electoral;', new Set());
    expect(a.contenido).not.toMatch(/\*|Consejo Nacional/);
    expect(a.asteriscos).toEqual(['Consejo Nacional Electoral, creado por Decreto 200-2018.']);
  });
  it('no toca números que no son llamadas del artículo (art. 183 «1,2 y 3»)', () => {
    expect(sanear('183', 'Artículo 183. En los numerales 1,2 y 3 de este artículo.', new Set([23])).contenido).toBe('En los numerales 1,2 y 3 de este artículo.');
  });
  it('refluye líneas de maquetación conservando párrafos y numerales', () => {
    expect(refluir('Uno dos\ntres.\n1) a\nb;\n2) c.\n\nOtro\npárrafo.')).toBe('Uno dos tres.\n1) a b;\n2) c.\n\nOtro párrafo.');
  });
  it('la integridad detecta residuos', () => {
    expect(problemasDeIntegridad('1', 'Texto con llamada;5 y más texto suficiente.', false)).toContain('llamada de nota residual');
    expect(problemasDeIntegridad('1', 'Texto sin cierre de oración suficiente largo', false)).toContain('termina sin puntuación de cierre');
    expect(problemasDeIntegridad('373', 'Derogado', true)).toEqual([]);
  });
});

describe('OLA1 CPP · constancias y clasificación', () => {
  it('tipifica las notas', () => {
    expect(tipificarNota('Artículo 217. Interpretar … La anterior interpretación queda sin valor y efecto mediante Decreto No.43-2023')).toBe('INTERPRETACION_SIN_EFECTO');
    expect(tipificarNota('Artículo 274. Interpretado en el sentido …')).toBe('INTERPRETACION_AUTENTICA');
    expect(tipificarNota('Artículo 27 numeral 3) derogado por Decreto 35-2013')).toBe('DEROGACION_PARCIAL');
    expect(tipificarNota('Artículo 223. Derogado por Decreto 243-2011')).toBe('DEROGACION_TOTAL');
    expect(tipificarNota('Artículo 227. numeral 6) Reformado tácitamente por Decreto 412-2002')).toBe('REFORMA_TACITA');
  });
  it('art. 274: la interpretación del D.93-2021 queda sin efecto por el art. 4 del D.43-2023', () => {
    const c = aplicarEfectosPosteriores('274', [{ nota: 39, tipo: 'INTERPRETACION_AUTENTICA', texto: 'Interpretado…', decretos: ['93-2021'] }]);
    expect(c.map((x) => x.tipo)).toEqual(['INTERPRETACION_SIN_EFECTO', 'INTERPRETACION_SIN_EFECTO']);
    expect(c[1].texto).toMatch(/art\. 4 del Decreto No\. 43-2023 \(Gaceta No\. 36,290/);
    expect(clasificar(false, c)).toMatchObject({ vigencia: 'VIGENTE', rol: null });
    expect(() => aplicarEfectosPosteriores('274', [])).toThrow(/se esperaba 1 constancia/);
  });
  it('expande rangos de artículos bis', () => {
    expect(articulosDeNota({ num: 78, texto: '78 «CAPÍTULO VII». Artículos 440-A al 440-C. Reforma por Adición' }, new Map())).toEqual(['440-A', '440-B', '440-C']);
  });
  it('derogado nunca es PRIMARY; reforma tácita va a CONTEXT', () => {
    expect(clasificar(true, [])).toMatchObject({ vigencia: 'DEROGADO', rol: 'CONTEXT' });
    expect(clasificar(false, [{ nota: 33, tipo: 'REFORMA_TACITA', texto: '', decretos: [] }])).toMatchObject({ vigencia: 'VIGENTE', rol: 'CONTEXT' });
    expect(clasificar(false, [])).toMatchObject({ vigencia: 'VIGENTE', rol: null });
  });
});

const CFG: ConfigOla = { ola: 'OLAT', normId: 'HN:CODIGO_PROCESAL_PENAL', instrumentoId: 'CODIGO_PROCESAL_PENAL', ingestBatch: 'OLAT_01', fechaCorte: '2026-11-24', adjudicacion: 'P.md' };
function fila(n: string, vig: 'VIGENTE' | 'DEROGADO' = 'VIGENTE'): FilaOla {
  const contenido = vig === 'DEROGADO' ? 'Derogado' : `Texto ${n}.`;
  return { id: `OLAT_01:CODIGO_PROCESAL_PENAL:${n}`, coleccion: 'mayalex_normativos', materia: '01_PENAL', contenido, num_articulo: n, fuente: 'F',
    metadata: { norm_id: CFG.normId }, jurisdiccion: 'HN', fuente_tipo: 'codigo', instrumento_id: CFG.instrumentoId, num_articulo_norm: n,
    hash_contenido: sha256(contenido), ingest_batch: 'OLAT_01', clasificacion: vig === 'DEROGADO' ? { vigencia: 'DEROGADO', rol: 'CONTEXT', motivo: 'd' } : { vigencia: 'VIGENTE', rol: null, motivo: 'p' } };
}
const vec = (s: number) => { const v = Array.from({ length: 384 }, (_, i) => Math.sin(i * s + 1)); const n = Math.hypot(...v); return v.map((x) => x / n); };

describe('paquete de ola · generador, ejecutor y .ps1', () => {
  it('rechaza un derogado PRIMARY y un hash incorrecto', () => {
    expect(() => validarFilas(CFG, [{ ...fila('1', 'DEROGADO'), clasificacion: { vigencia: 'DEROGADO', rol: null, motivo: '' } }])).toThrow(/nunca es PRIMARY/);
    expect(() => validarFilas(CFG, [{ ...fila('1'), hash_contenido: 'x' }])).toThrow(/hash_contenido/);
  });

  const dir = mkdtempSync(join(tmpdir(), 'ola-'));
  const filas = [fila('1'), fila('2', 'DEROGADO')];
  const { archivos } = escribirPaquete({ cfg: CFG, filas, embeddings: new Map(filas.map((f, i) => [f.id, vec(i + 2)])), salida: dir });
  const manifiesto = { ola: 'OLAT', ingest_batch: 'OLAT_01', pliego: 'pliego.md', refs: { staging: REF_STAGING, prod: REF_PROD }, archivos };
  const urlProd = `postgresql://postgres.${REF_PROD}:x@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;

  it('genera SQL con postcondiciones y nunca toca otros lotes', () => {
    expect(archivos.map((a) => a.ruta)).toContain('prod/03_activacion_v5_prod.sql');
    expect(archivos.find((a) => a.ruta === 'staging/01_insert_staging.sql')!.requiereFirma).toBe(false);
    expect(archivos.find((a) => a.ruta === 'prod/01_datos_prod.sql')!.requiereFirma).toBe(true);
  });
  it('el ejecutor exige el ref correcto en la URL', () => {
    expect(() => planificar({ manifiesto, dirManifiesto: dir, raiz: dir, destino: 'prod', ref: REF_PROD, url: urlProd.replace(REF_PROD, REF_STAGING), desde: 0, hasta: 98 })).toThrow(/no apunta|otro destino/);
    expect(() => planificar({ manifiesto, dirManifiesto: dir, raiz: dir, destino: 'prod', ref: REF_STAGING, url: urlProd, desde: 0, hasta: 98 })).toThrow(/no es el de prod/);
  });
  it('el ejecutor exige pliego firmado que cite las huellas de los SQL', () => {
    expect(() => planificar({ manifiesto, dirManifiesto: dir, raiz: dir, destino: 'prod', ref: REF_PROD, url: urlProd, desde: 0, hasta: 98 })).toThrow(/pliego/);
    writeFileSync(join(dir, 'pliego.md'), 'borrador sin firma');
    expect(() => planificar({ manifiesto, dirManifiesto: dir, raiz: dir, destino: 'prod', ref: REF_PROD, url: urlProd, desde: 0, hasta: 98 })).toThrow(/no está firmado/);
    const huellas = archivos.filter((a) => a.destino === 'prod').map((a) => a.sha256).join('\n');
    // Regresión: un pliego PENDIENTE cuyas instrucciones mencionan la frase no cuenta como firmado.
    writeFileSync(join(dir, 'pliego.md'), `**Estado:** PENDIENTE DE FIRMA\n> Para firmar, sustituya por \`D1–D8 FIRMADAS\`.\n${huellas}`);
    expect(() => planificar({ manifiesto, dirManifiesto: dir, raiz: dir, destino: 'prod', ref: REF_PROD, url: urlProd, desde: 0, hasta: 98 })).toThrow(/no está firmado/);
    writeFileSync(join(dir, 'pliego.md'), `**Estado:** D1–D8 FIRMADAS (fecha, CLO)\n${huellas}`);
    expect(planificar({ manifiesto, dirManifiesto: dir, raiz: dir, destino: 'prod', ref: REF_PROD, url: urlProd, desde: 0, hasta: 98 })).toHaveLength(4);
  });
  it('la firma solo se lee en la línea de estado', () => {
    expect(estaFirmado('**Estado:** D1–D8 FIRMADAS (2026-11-24)')).toBe(true);
    expect(estaFirmado('**Estado:** **D1–D8 FIRMADAS**')).toBe(true);
    expect(estaFirmado('**Estado:** PENDIENTE DE FIRMA\n… por `D1–D8 FIRMADAS` …')).toBe(false);
    expect(estaFirmado('D1–D8 FIRMADAS')).toBe(false);
    // Fórmula propia de los dictámenes de corrección (manifiesto.firma).
    expect(estaFirmado('**Estado:** C1 FIRMADA (2026-11-25)', 'C1 FIRMADA')).toBe(true);
    expect(estaFirmado('**Estado:** C1 FIRMADA (2026-11-25)')).toBe(false);
    expect(estaFirmado('**Estado:** C1 FIRMADAS', 'C1 FIRMADA')).toBe(false);
    expect(estaFirmado('**Estado:** PENDIENTE DE FIRMA\n… `C1 FIRMADA` …', 'C1 FIRMADA')).toBe(false);
  });
  it('el staging oculto (pasos 1–3) no requiere firma; la huella alterada aborta', () => {
    const urlStg = `postgresql://postgres:x@db.${REF_STAGING}.supabase.co:5432/postgres`;
    expect(planificar({ manifiesto: { ...manifiesto, pliego: 'no-existe.md' }, dirManifiesto: dir, raiz: dir, destino: 'staging', ref: REF_STAGING, url: urlStg, desde: 1, hasta: 3 })).toHaveLength(3);
    mkdirSync(join(dir, 'staging'), { recursive: true });
    writeFileSync(join(dir, 'staging/01_insert_staging.sql'), 'alterado');
    expect(() => planificar({ manifiesto, dirManifiesto: dir, raiz: dir, destino: 'staging', ref: REF_STAGING, url: urlStg, desde: 1, hasta: 3 })).toThrow(/huella distinta/);
  });
  it('el .ps1 lee la URL oculta y borra las variables en finally', () => {
    const ps1 = generarPs1({ cfg: CFG, destino: 'prod', manifiestoRel: 'manifiesto_paquete.json', raizRel: '../..', pasos: archivos.filter((a) => a.destino === 'prod') });
    expect(ps1).toMatch(/Read-Host 'DATABASE_URL \(entrada oculta\)' -AsSecureString/);
    expect(ps1).toMatch(/finally \{[\s\S]*Remove-Item Env:DATABASE_URL[\s\S]*ZeroFreeBSTR/);
    expect(ps1).toContain(REF_PROD);
    expect(ps1).not.toMatch(/postgresql:\/\//);
  });
});
