import { describe, expect, it } from 'vitest';
import {
  afirmacionRespaldadaPorFragmento, clasificarFragmentoClo, evaluarSuficienciaR3, fragmentoCumpleR3, resumenEvidenciaClo, type ObjetivoConsulta,
} from '@/lib/legal-retrieval/clo-guards';
import { objetivosDeConsulta } from '@/lib/legal-retrieval/r3-objetivos';
import { extraerAfirmacionesCitadas, respuestaNombraFuente, textoNombraArticulo, textoNombraInstrumento } from '@/lib/legal-retrieval/clo-guards';
import { evaluarRespuestaChatR3 } from '@/lib/legal-retrieval/r3-chat';
import { construirCitas } from '@/lib/legal-retrieval/evidence-engine';
import { mapearFilaSemantica } from '@/lib/legal-retrieval/semantic-retriever';
import { formatearContextoRAG } from '@/lib/legal-retrieval/evidence-engine';
import type { FragmentoRAG } from '@/lib/legal-retrieval/types';

/**
 * R3 (texto oficial CLO, 29-oct-2026): suficiencia solo con una cita DIRECT validada a un fragmento PRIMARY, es_norma_vigente=TRUE, del mismo
 * instrumento y del mismo artículo consultados; un conteo de PRIMARY no basta; NULL = solo CONTEXT; FALSE = excluido, «NORMA NO VIGENTE, NO CITAR».
 */
const cpp173 = (o: Partial<FragmentoRAG> = {}): FragmentoRAG => ({
  id: 'cpp-173', contenido: 'ARTICULO 173.- La prisión preventiva procede cuando existan indicios racionales de participación y el delito tenga pena superior a cinco años.',
  num_articulo: '173', fuente: 'Codigo Procesal Penal', relevancia: 0.9, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, hash: 'h173', ...o,
});
const OBJ_173_CPP: ObjetivoConsulta[] = [{ instrumentId: 'CODIGO_PROCESAL_PENAL', articulo: '173' }];
const TXT = 'Según el artículo 173 del Código Procesal Penal, la prisión preventiva procede con indicios racionales de participación.';
const afirma = (texto: string, id = 'cpp-173', soporte: 'DIRECT' | 'INDIRECT' = 'DIRECT') => [{ claim_id: 'c1', texto, citas: [{ fragmentoId: id, soporte }] }];

describe('R3 — recuperación: un conteo de PRIMARY no basta', () => {
  it('un PRIMARY TRUE de OTRO artículo: hay primarios pero NO hay suficiencia', () => {
    const otro = cpp173({ id: 'cpp-10', num_articulo: '10', contenido: 'ARTICULO 10.- Otro texto.' });
    const r = resumenEvidenciaClo([otro], {}, OBJ_173_CPP);
    expect(r.primarios).toBe(1);
    expect(r.suficiente).toBe(false);
  });
  it('un PRIMARY TRUE del mismo artículo pero de OTRO instrumento: no hay suficiencia', () => {
    const penal = cpp173({ id: 'cp-173', fuente: 'Codigo Penal' });
    const r = resumenEvidenciaClo([penal], {}, OBJ_173_CPP);
    expect(r.primarios).toBe(1);
    expect(r.suficiente).toBe(false);
  });
  it('un fragmento con vigencia NULL es solo CONTEXT aunque declare rol PRIMARY: no hay suficiencia', () => {
    const nulo = { ...cpp173({ es_norma_vigente: null }), rol_evidencia: 'PRIMARY' } as FragmentoRAG;
    expect(clasificarFragmentoClo(nulo).rol).toBe('CONTEXT');
    const r = resumenEvidenciaClo([nulo], {}, OBJ_173_CPP);
    expect(r.primarios).toBe(0);
    expect(r.suficiente).toBe(false);
  });
  it('vigencia FALSE queda excluida y rotulada «NORMA NO VIGENTE, NO CITAR»', () => {
    const falso = cpp173({ es_norma_vigente: false });
    expect(clasificarFragmentoClo(falso).bloqueos).toContain('VIGENCIA_FALSE_EXCLUIDA');
    expect(resumenEvidenciaClo([falso], {}, OBJ_173_CPP).suficiente).toBe(false);
    const ctx = formatearContextoRAG({ fragmentos: [falso], articulos_encontrados: ['173'], backend: 'supabase' });
    expect(ctx).toContain('[NORMA NO VIGENTE, NO CITAR]');
  });
  it('el artículo correcto con TRUE del instrumento correcto SÍ da suficiencia a nivel de recuperación', () => {
    expect(resumenEvidenciaClo([cpp173()], {}, OBJ_173_CPP).suficiente).toBe(true);
  });
  it('no se impone un mínimo de dos fragmentos: uno solo basta', () => {
    expect(resumenEvidenciaClo([cpp173()], {}, OBJ_173_CPP).primarios).toBe(1);
    expect(resumenEvidenciaClo([cpp173()], {}, OBJ_173_CPP).suficiente).toBe(true);
  });
  it('consulta temática (sin instrumento ni artículo nombrados): rige PRIMARY + TRUE', () => {
    expect(fragmentoCumpleR3(cpp173(), [])).toBe(true);
    expect(fragmentoCumpleR3(cpp173({ es_norma_vigente: null }), [])).toBe(false);
  });
  it('un 72-A consultado no lo satisface el 72', () => {
    const f = cpp173({ id: 'n72', fuente: 'Código del Notariado de Honduras (Decreto 353-2005)', num_articulo: '72' });
    expect(fragmentoCumpleR3(f, [{ instrumentId: 'CODIGO_NOTARIADO', articulo: '72-A' }])).toBe(false);
  });
});

describe('R3 — respuesta: cita DIRECT validada que respalda la afirmación concreta', () => {
  it('cita DIRECT al artículo correcto con TRUE y afirmación respaldada → suficiencia', () => {
    const r = evaluarSuficienciaR3([cpp173()], afirma('La prisión preventiva procede si hay indicios racionales de participación (art. 173).'), OBJ_173_CPP, {}, TXT);
    expect(r).toEqual({ suficiente: true, motivo: 'OK', afirmacionesValidas: [{ claim_id: 'c1', fragmentoIds: ['cpp-173'] }] });
  });
  it('PRIMARY TRUE de otro artículo citado DIRECT → abstención', () => {
    const otro = cpp173({ id: 'cpp-10', num_articulo: '10' });
    const r = evaluarSuficienciaR3([otro], afirma('La prisión preventiva procede si hay indicios racionales de participación.', 'cpp-10'), OBJ_173_CPP, {}, TXT);
    expect(r).toMatchObject({ suficiente: false, motivo: 'OTRO_INSTRUMENTO_O_ARTICULO' });
  });
  it('PRIMARY con vigencia NULL citado DIRECT → abstención', () => {
    const r = evaluarSuficienciaR3([cpp173({ es_norma_vigente: null })], afirma('La prisión preventiva procede si hay indicios racionales de participación.'), OBJ_173_CPP, {}, TXT);
    expect(r).toMatchObject({ suficiente: false, motivo: 'SIN_PRIMARY_VIGENTE' });
  });
  it('vigencia FALSE citada DIRECT → abstención', () => {
    const r = evaluarSuficienciaR3([cpp173({ es_norma_vigente: false })], afirma('La prisión preventiva procede si hay indicios racionales de participación.'), OBJ_173_CPP, {}, TXT);
    expect(r).toMatchObject({ suficiente: false, motivo: 'SIN_PRIMARY_VIGENTE' });
  });
  it('solo INDIRECT, o sin citas, o sin afirmaciones → abstención', () => {
    expect(evaluarSuficienciaR3([cpp173()], afirma('La prisión preventiva procede si hay indicios racionales.', 'cpp-173', 'INDIRECT'), OBJ_173_CPP, {}, TXT)).toMatchObject({ suficiente: false, motivo: 'SIN_CITA_DIRECT' });
    expect(evaluarSuficienciaR3([cpp173()], [{ claim_id: 'c', texto: 'x', citas: [] }], OBJ_173_CPP, {}, TXT)).toMatchObject({ suficiente: false, motivo: 'SIN_CITA_DIRECT' });
    expect(evaluarSuficienciaR3([cpp173()], [], OBJ_173_CPP, {}, TXT)).toMatchObject({ suficiente: false, motivo: 'SIN_AFIRMACIONES' });
  });
  it('cita DIRECT a un fragmento que no se recuperó → abstención', () => {
    expect(evaluarSuficienciaR3([cpp173()], afirma('La prisión preventiva procede si hay indicios racionales.', 'inventado'), OBJ_173_CPP, {}, TXT)).toMatchObject({ suficiente: false });
  });
  it('la cita DIRECT debe respaldar la afirmación CONCRETA: una cifra o artículo que el fragmento no contiene la invalida', () => {
    const f = cpp173();
    expect(afirmacionRespaldadaPorFragmento('La pena debe superar los diez años.', f)).toBe(false);     // el texto dice cinco
    expect(afirmacionRespaldadaPorFragmento('La pena debe superar los cinco años.', f)).toBe(true);
    expect(afirmacionRespaldadaPorFragmento('El artículo 174 regula la prisión preventiva.', f)).toBe(false);
    expect(afirmacionRespaldadaPorFragmento('La prisión preventiva procede con indicios racionales de participación.', f)).toBe(true);
    expect(afirmacionRespaldadaPorFragmento('El imputado puede recusar al juez por parcialidad manifiesta.', f)).toBe(false);
    const r = evaluarSuficienciaR3([f], afirma('El imputado puede recusar al juez por parcialidad manifiesta.'), OBJ_173_CPP, {}, TXT);
    expect(r).toMatchObject({ suficiente: false, motivo: 'AFIRMACION_NO_RESPALDADA' });
  });
  it('una afirmación respaldada basta aunque otra no lo esté; solo la respaldada queda como válida', () => {
    const r = evaluarSuficienciaR3([cpp173()], [
      { claim_id: 'ok', texto: 'La prisión preventiva procede con indicios racionales de participación.', citas: [{ fragmentoId: 'cpp-173', soporte: 'DIRECT' }] },
      { claim_id: 'mal', texto: 'El imputado puede recusar al juez por parcialidad manifiesta.', citas: [{ fragmentoId: 'cpp-173', soporte: 'DIRECT' }] },
    ], OBJ_173_CPP, {}, TXT);
    expect(r.suficiente).toBe(true);
    expect(r.afirmacionesValidas.map((a) => a.claim_id)).toEqual(['ok']);
  });
});

describe('R3 — objetivos de la consulta (instrumento y artículo consultados)', () => {
  it('artículo + instrumento', () => {
    expect(objetivosDeConsulta('¿Qué dispone el artículo 173 del Código Procesal Penal?')).toEqual([{ instrumentId: 'CODIGO_PROCESAL_PENAL', articulo: '173' }]);
  });
  it('consulta temática: sin objetivos', () => {
    expect(objetivosDeConsulta('¿Cómo funciona la prescripción de la acción?')).toEqual([]);
  });
});

describe('A-1 (auditoría): un PRIMARY+TRUE sin artículo o sin instrumento identificados NUNCA da suficiencia', () => {
  it('sin número de artículo: no cumple R3 ni con consulta temática, ni con objetivo de solo instrumento', () => {
    const sinArt = cpp173({ id: 'sin-art', num_articulo: null });
    expect(clasificarFragmentoClo(sinArt).rol).toBe('PRIMARY');           // sigue siendo norma citable como contexto de lectura…
    expect(fragmentoCumpleR3(sinArt, [])).toBe(false);                    // …pero no basta como suficiencia
    expect(fragmentoCumpleR3(sinArt, [{ instrumentId: 'CODIGO_PROCESAL_PENAL', articulo: null }])).toBe(false);
    expect(resumenEvidenciaClo([sinArt], {}, []).suficiente).toBe(false);
    expect(evaluarSuficienciaR3([sinArt], afirma('La prisión preventiva procede con indicios racionales de participación.', 'sin-art'), [], {}, TXT)).toMatchObject({ suficiente: false });
  });
  it('consulta temática: la suficiencia exige instrumento Y artículo identificados y que la respuesta los nombre', () => {
    const f = cpp173();
    const ok = evaluarSuficienciaR3([f], afirma('La prisión preventiva procede con indicios racionales de participación.'), [], {}, TXT);
    expect(ok.suficiente).toBe(true);
    const sinNombrar = evaluarSuficienciaR3([f], afirma('La prisión preventiva procede con indicios racionales de participación.'), [], {}, 'La prisión preventiva procede con indicios racionales de participación.');
    expect(sinNombrar).toMatchObject({ suficiente: false, motivo: 'RESPUESTA_NO_NOMBRA_FUENTE' });
    const soloArticulo = evaluarSuficienciaR3([f], afirma('La prisión preventiva procede con indicios racionales de participación.'), [], {}, 'Según el artículo 173, la prisión preventiva procede con indicios racionales de participación.');
    expect(soloArticulo).toMatchObject({ suficiente: false, motivo: 'RESPUESTA_NO_NOMBRA_FUENTE' });
  });
  it('nombrar el artículo y el instrumento: variantes y falsos amigos', () => {
    expect(textoNombraArticulo('arts. 10 y 173 del CPP', '173')).toBe(true);
    expect(textoNombraArticulo('Art. 173', '173')).toBe(true);
    expect(textoNombraArticulo('el artículo 1730', '173')).toBe(false);
    expect(textoNombraArticulo('el artículo 72-A', '72-A')).toBe(true);
    expect(textoNombraArticulo('el artículo 72', '72-A')).toBe(false);
    expect(textoNombraArticulo('el artículo 72-A', '72')).toBe(false);
    expect(textoNombraInstrumento('Según el CPP', 'CODIGO_PROCESAL_PENAL')).toBe(true);
    expect(textoNombraInstrumento('Según el Código Procesal Penal', 'CODIGO_PENAL')).toBe(false);   // «código penal» no es subcadena de «código procesal penal»
    expect(textoNombraInstrumento('un cpp-x', 'CODIGO_PROCESAL_PENAL')).toBe(true);
    expect(textoNombraInstrumento('scppx', 'CODIGO_PROCESAL_PENAL')).toBe(false);
    expect(respuestaNombraFuente(TXT, cpp173())).toBe(true);
  });
});

describe('BAJO (auditoría): instrumento sin resolver → un número de artículo no basta para hacer match', () => {
  it('objetivo con artículo pero sin instrumento: no hay match con ningún fragmento', () => {
    const obj: ObjetivoConsulta[] = [{ instrumentId: null, articulo: '173' }];
    expect(fragmentoCumpleR3(cpp173(), obj)).toBe(false);
    expect(resumenEvidenciaClo([cpp173()], {}, obj).suficiente).toBe(false);
    expect(evaluarSuficienciaR3([cpp173()], afirma('La prisión preventiva procede con indicios racionales de participación.'), obj, {}, TXT)).toMatchObject({ suficiente: false, motivo: 'OTRO_INSTRUMENTO_O_ARTICULO' });
  });
  it('«artículo 173» sin nombrar instrumento produce un objetivo sin instrumento (abstención)', () => {
    const o = objetivosDeConsulta('¿Qué dice el artículo 173?');
    expect(o).toEqual([{ instrumentId: null, articulo: '173' }]);
    expect(resumenEvidenciaClo([cpp173()], {}, o).suficiente).toBe(false);
  });
});

describe('A-2 (decisión CLO): el chat principal aplica la misma R3', () => {
  const frags = [cpp173()];
  const pregunta = '¿Qué dispone el artículo 173 del Código Procesal Penal?';
  it('respuesta que nombra instrumento y artículo y se funda en el fragmento: se entrega, con SOLO las citas validadas', () => {
    const v = evaluarRespuestaChatR3({ texto: TXT, fragmentos: [...frags, cpp173({ id: 'cpp-10', num_articulo: '10', hash: 'h10' })], pregunta });
    expect(v.suficiente).toBe(true);
    if (v.suficiente) expect(v.citas.map((c) => c.articulo)).toEqual(['173']);
  });
  it('respuesta sin citar nada → abstención que dice qué falta', () => {
    const v = evaluarRespuestaChatR3({ texto: 'La prisión preventiva procede cuando hay indicios racionales de participación en el delito.', fragmentos: frags, pregunta });
    expect(v.suficiente).toBe(false);
    if (!v.suficiente) { expect(v.mensaje).toContain('Lo que falta para poder responder'); expect(v.citas).toEqual([]); }
  });
  it('respuesta que cita OTRO artículo → abstención', () => {
    const v = evaluarRespuestaChatR3({ texto: 'Según el artículo 10 del Código Procesal Penal, la prisión preventiva procede con indicios racionales de participación.', fragmentos: [...frags, cpp173({ id: 'cpp-10', num_articulo: '10', hash: 'h10', contenido: 'ARTICULO 10.- Otro texto distinto.' })], pregunta });
    expect(v.suficiente).toBe(false);
  });
  it('respuesta que nombra el artículo pero afirma lo que el texto no dice → abstención', () => {
    const v = evaluarRespuestaChatR3({ texto: 'Según el artículo 173 del Código Procesal Penal, el imputado puede recusar al juez por parcialidad manifiesta.', fragmentos: frags, pregunta });
    expect(v.suficiente).toBe(false);
  });
  it('extrae afirmaciones por párrafo y no cita fragmentos que el párrafo no nombra', () => {
    const a = extraerAfirmacionesCitadas(`${TXT}\n\nOtro párrafo sin ninguna referencia a norma alguna de las recuperadas.`, [cpp173(), cpp173({ id: 'cpp-10', num_articulo: '10' })]);
    expect(a.length).toBeGreaterThan(0);
    expect(a.every((x) => x.citas.length === 1 && x.citas[0].fragmentoId === 'cpp-173')).toBe(true);
  });
});

describe('N-1 (auditoría): un solo criterio de citas con flag_corpus_p21 encendido', () => {
  const p21 = (o: Partial<FragmentoRAG> = {}) => cpp173({ id: 'mayalex_normativos:codigo_comercio_bch_d73_50_x', ...o });
  it('anotarFragmentosClo sella la bandera: citas, contexto y clasificación coinciden con la recuperación', async () => {
    const { anotarFragmentosClo } = await import('@/lib/legal-retrieval/clo-guards');
    const off = anotarFragmentosClo([p21()], { corpusP21Habilitado: false });
    const on = anotarFragmentosClo([p21()], { corpusP21Habilitado: true });
    expect(clasificarFragmentoClo(off[0]).rol).toBe('CONTEXT');
    expect(construirCitas(off)).toEqual([]);
    expect(formatearContextoRAG({ fragmentos: off, articulos_encontrados: [], backend: 'supabase' })).toContain('NO CITAR COMO NORMA');
    expect(clasificarFragmentoClo(on[0]).rol).toBe('PRIMARY');            // sin pasar ctx: usa la bandera sellada
    expect(construirCitas(on)).toHaveLength(1);
    expect(formatearContextoRAG({ fragmentos: on, articulos_encontrados: [], backend: 'supabase' })).toContain('NORMA VIGENTE HONDURAS');
    expect(fragmentoCumpleR3(on[0], OBJ_173_CPP)).toBe(true);
  });
  it('un fragmento SIN sello ni contexto sigue apagado (fail-closed) y la bandera de la carga no se puede forzar a true por contexto explícito false', () => {
    expect(clasificarFragmentoClo(p21()).rol).toBe('CONTEXT');
    expect(clasificarFragmentoClo({ ...p21(), corpus_p21_habilitado: true }, { corpusP21Habilitado: false }).rol).toBe('CONTEXT');
  });
});

describe('N-2 (auditoría): la recuperación semántica lleva rol y desplazado_por al clasificador', () => {
  const fila = (extra: Record<string, unknown> = {}) => ({
    id: 'cpp-173', contenido: 'ARTICULO 173.- Texto.', num_articulo: '173', fuente: 'Codigo Procesal Penal', fuente_tipo: 'codigo', jurisdiccion: 'HN',
    es_norma_vigente: true, similarity: 0.9, ...extra,
  });
  it('sin metadata en la RPC (versión actual): el mapeo es el de siempre', () => {
    const f = mapearFilaSemantica(fila());
    expect(f.metadata_clo).toBeUndefined();
    expect(clasificarFragmentoClo(f).rol).toBe('PRIMARY');
  });
  it('con metadata_clo de la RPC ampliada: desplazado_por, rol distinto de PRIMARY y elegible_primary=false degradan a CONTEXT', () => {
    expect(clasificarFragmentoClo(mapearFilaSemantica(fila({ metadata_clo: { desplazado_por: 'D.99-2020' } }))).bloqueos).toContain('NORMA_DESPLAZADA');
    expect(clasificarFragmentoClo(mapearFilaSemantica(fila({ metadata_clo: { rol: 'CONTEXT' } }))).bloqueos).toContain('ROL_DECLARADO_CONTEXT');
    expect(clasificarFragmentoClo(mapearFilaSemantica(fila({ metadata_clo: { elegible_primary: false } }))).rol).toBe('CONTEXT');
    expect(clasificarFragmentoClo(mapearFilaSemantica(fila({ metadata_clo: { rol: 'PRIMARY', desplazado_por: null } }))).rol).toBe('PRIMARY');
  });
  it('la materia NO se toma de la RPC (Anexo 2.5)', () => {
    expect(mapearFilaSemantica(fila({ materia: '03_NOTARIAL' }) as never).materia).toBeUndefined();
  });
  it('el SQL de la RPC ampliada es una PROPUESTA no aplicada: vive en docs/, no en migrations', async () => {
    const { existsSync, readFileSync } = await import('node:fs');
    expect(existsSync('docs/retrieval/PROPUESTA_NO_APLICADA_buscar_biblioteca_v2_metadata_clo.sql')).toBe(true);
    expect(readFileSync('docs/retrieval/PROPUESTA_NO_APLICADA_buscar_biblioteca_v2_metadata_clo.sql', 'utf8')).toContain('PROPUESTA_NO_APLICADA');
  });
});
