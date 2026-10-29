import { describe, expect, it } from 'vitest';
import {
  afirmacionRespaldadaPorFragmento, clasificarFragmentoClo, evaluarSuficienciaR3, fragmentoCumpleR3, resumenEvidenciaClo, type ObjetivoConsulta,
} from '@/lib/legal-retrieval/clo-guards';
import { objetivosDeConsulta } from '@/lib/legal-retrieval/r3-objetivos';
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
    const r = evaluarSuficienciaR3([cpp173()], afirma('La prisión preventiva procede si hay indicios racionales de participación (art. 173).'), OBJ_173_CPP);
    expect(r).toEqual({ suficiente: true, motivo: 'OK', afirmacionesValidas: [{ claim_id: 'c1', fragmentoIds: ['cpp-173'] }] });
  });
  it('PRIMARY TRUE de otro artículo citado DIRECT → abstención', () => {
    const otro = cpp173({ id: 'cpp-10', num_articulo: '10' });
    const r = evaluarSuficienciaR3([otro], afirma('La prisión preventiva procede si hay indicios racionales de participación.', 'cpp-10'), OBJ_173_CPP);
    expect(r).toMatchObject({ suficiente: false, motivo: 'OTRO_INSTRUMENTO_O_ARTICULO' });
  });
  it('PRIMARY con vigencia NULL citado DIRECT → abstención', () => {
    const r = evaluarSuficienciaR3([cpp173({ es_norma_vigente: null })], afirma('La prisión preventiva procede si hay indicios racionales de participación.'), OBJ_173_CPP);
    expect(r).toMatchObject({ suficiente: false, motivo: 'SIN_PRIMARY_VIGENTE' });
  });
  it('vigencia FALSE citada DIRECT → abstención', () => {
    const r = evaluarSuficienciaR3([cpp173({ es_norma_vigente: false })], afirma('La prisión preventiva procede si hay indicios racionales de participación.'), OBJ_173_CPP);
    expect(r).toMatchObject({ suficiente: false, motivo: 'SIN_PRIMARY_VIGENTE' });
  });
  it('solo INDIRECT, o sin citas, o sin afirmaciones → abstención', () => {
    expect(evaluarSuficienciaR3([cpp173()], afirma('La prisión preventiva procede si hay indicios racionales.', 'cpp-173', 'INDIRECT'), OBJ_173_CPP)).toMatchObject({ suficiente: false, motivo: 'SIN_CITA_DIRECT' });
    expect(evaluarSuficienciaR3([cpp173()], [{ claim_id: 'c', texto: 'x', citas: [] }], OBJ_173_CPP)).toMatchObject({ suficiente: false, motivo: 'SIN_CITA_DIRECT' });
    expect(evaluarSuficienciaR3([cpp173()], [], OBJ_173_CPP)).toMatchObject({ suficiente: false, motivo: 'SIN_AFIRMACIONES' });
  });
  it('cita DIRECT a un fragmento que no se recuperó → abstención', () => {
    expect(evaluarSuficienciaR3([cpp173()], afirma('La prisión preventiva procede si hay indicios racionales.', 'inventado'), OBJ_173_CPP)).toMatchObject({ suficiente: false });
  });
  it('la cita DIRECT debe respaldar la afirmación CONCRETA: una cifra o artículo que el fragmento no contiene la invalida', () => {
    const f = cpp173();
    expect(afirmacionRespaldadaPorFragmento('La pena debe superar los diez años.', f)).toBe(false);     // el texto dice cinco
    expect(afirmacionRespaldadaPorFragmento('La pena debe superar los cinco años.', f)).toBe(true);
    expect(afirmacionRespaldadaPorFragmento('El artículo 174 regula la prisión preventiva.', f)).toBe(false);
    expect(afirmacionRespaldadaPorFragmento('La prisión preventiva procede con indicios racionales de participación.', f)).toBe(true);
    expect(afirmacionRespaldadaPorFragmento('El imputado puede recusar al juez por parcialidad manifiesta.', f)).toBe(false);
    const r = evaluarSuficienciaR3([f], afirma('El imputado puede recusar al juez por parcialidad manifiesta.'), OBJ_173_CPP);
    expect(r).toMatchObject({ suficiente: false, motivo: 'AFIRMACION_NO_RESPALDADA' });
  });
  it('una afirmación respaldada basta aunque otra no lo esté; solo la respaldada queda como válida', () => {
    const r = evaluarSuficienciaR3([cpp173()], [
      { claim_id: 'ok', texto: 'La prisión preventiva procede con indicios racionales de participación.', citas: [{ fragmentoId: 'cpp-173', soporte: 'DIRECT' }] },
      { claim_id: 'mal', texto: 'El imputado puede recusar al juez por parcialidad manifiesta.', citas: [{ fragmentoId: 'cpp-173', soporte: 'DIRECT' }] },
    ], OBJ_173_CPP);
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
