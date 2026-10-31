import { describe, expect, it } from 'vitest';
import {
  afirmacionRespaldadaPorFragmento, clasificarFragmentoClo, evaluarSuficienciaR3, fragmentoCumpleR3, resumenEvidenciaClo, type ObjetivoConsulta,
} from '@/lib/legal-retrieval/clo-guards';
import { objetivosDeConsulta } from '@/lib/legal-retrieval/r3-objetivos';
import { mencionaNormaConcreta, mencionesNoValidadas, extraerAfirmacionesCitadas, respuestaNombraFuente, textoNombraArticulo, textoNombraInstrumento } from '@/lib/legal-retrieval/clo-guards';
import { oracionAfirmaContenidoNormativo } from '@/lib/legal-retrieval/clo-guards';
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
    const v = evaluarRespuestaChatR3({ texto: TXT, fragmentos: [...frags, cpp173({ id: 'cpp-10', num_articulo: '10', hash: 'h10' })], pregunta, conCorpus: true });
    expect(v.suficiente).toBe(true);
    if (v.suficiente) expect(v.citas.map((c) => c.articulo)).toEqual(['173']);
  });
  it('respuesta sin citar nada → abstención que dice qué falta', () => {
    const v = evaluarRespuestaChatR3({ texto: 'La prisión preventiva procede cuando hay indicios racionales de participación en el delito.', fragmentos: frags, pregunta, conCorpus: true });
    expect(v.suficiente).toBe(false);
    if (!v.suficiente) { expect(v.mensaje).toContain('Lo que falta para poder responder'); expect(v.citas).toEqual([]); }
  });
  it('respuesta que cita OTRO artículo → abstención', () => {
    const v = evaluarRespuestaChatR3({ texto: 'Según el artículo 10 del Código Procesal Penal, la prisión preventiva procede con indicios racionales de participación.', fragmentos: [...frags, cpp173({ id: 'cpp-10', num_articulo: '10', hash: 'h10', contenido: 'ARTICULO 10.- Otro texto distinto.' })], pregunta, conCorpus: true });
    expect(v.suficiente).toBe(false);
  });
  it('respuesta que nombra el artículo pero afirma lo que el texto no dice → abstención', () => {
    const v = evaluarRespuestaChatR3({ texto: 'Según el artículo 173 del Código Procesal Penal, el imputado puede recusar al juez por parcialidad manifiesta.', fragmentos: frags, pregunta, conCorpus: true });
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

describe('A-2b (re-auditoría): R4 — ninguna mención de artículo o instrumento sin respaldo; solo se emiten las oraciones validadas', () => {
  const pregunta173 = '¿Qué dispone el artículo 173 del Código Procesal Penal?';
  const valido = 'Según el artículo 173 del Código Procesal Penal, la prisión preventiva procede con indicios racionales de participación.';
  const inventado = 'El artículo 999 del Código Penal establece la pena de muerte.';
  const f173 = cpp173();

  it('un párrafo válido del art. 173 CPP + «el artículo 999 del Código Penal establece la pena de muerte» → abstención completa, nunca suficiente', () => {
    const v = evaluarRespuestaChatR3({ texto: `${valido}\n\n${inventado}`, fragmentos: [f173], pregunta: pregunta173, conCorpus: true });
    expect(v.suficiente).toBe(false);
    if (!v.suficiente) {
      expect(v.motivo).toBe('MENCION_NO_VALIDADA');
      expect(v.mensaje).toContain('Lo que falta para poder responder');
      expect(v.mensaje).not.toContain('pena de muerte');
      expect(v.citas).toEqual([]);
    }
  });
  it('lo mismo dentro del MISMO párrafo (la oración inventada no se cuela por compartir bloque con la válida)', () => {
    const v = evaluarRespuestaChatR3({ texto: `${valido} ${inventado}`, fragmentos: [f173], pregunta: pregunta173, conCorpus: true });
    expect(v.suficiente).toBe(false);
  });
  it('si el párrafo inventado no menciona artículo ni instrumento, sale SIN esa afirmación (solo lo validado)', () => {
    const v = evaluarRespuestaChatR3({ texto: `${valido}\n\nAdemás, toda persona merece compasión y respeto en cualquier proceso judicial.`, fragmentos: [f173], pregunta: pregunta173, conCorpus: true });
    expect(v.suficiente).toBe(true);
    if (v.suficiente) {
      expect(v.texto).toContain('artículo 173');
      expect(v.texto).not.toContain('compasión');
      expect(v.citas.map((c) => c.articulo)).toEqual(['173']);
    }
  });
  it('artículo del instrumento correcto pero que no se recuperó (art. 174 CPP) → abstención', () => {
    const v = evaluarRespuestaChatR3({ texto: `${valido}\n\nSegún el artículo 174 del Código Procesal Penal, el plazo es de seis meses.`, fragmentos: [f173], pregunta: pregunta173, conCorpus: true });
    expect(v.suficiente).toBe(false);
  });
  it('artículo sin instrumento nombrado en el bloque → abstención', () => {
    expect(mencionesNoValidadas('Según el artículo 173, la prisión preventiva procede.', [f173])).toContain('ARTICULO_SIN_FRAGMENTO:173');
  });
  it('instrumento mencionado sin ningún fragmento de ese instrumento → abstención; instrumento fuera de la tabla (Ley, Decreto) también', () => {
    expect(mencionesNoValidadas('El Código Penal sanciona el hurto.', [f173])).toContain('INSTRUMENTO_SIN_FRAGMENTO:CODIGO_PENAL');
    expect(mencionesNoValidadas('La Ley de Municipalidades regula el tema.', [f173])).toContain('INSTRUMENTO_DESCONOCIDO');
    expect(mencionesNoValidadas('El Decreto 99-2020 lo regula.', [f173])).toContain('INSTRUMENTO_DESCONOCIDO');
  });
  it('un nombre completo conocido («Código Procesal Penal») no se confunde con un instrumento desconocido', () => {
    expect(mencionesNoValidadas('Según el artículo 173 del Código Procesal Penal, procede.', [f173])).toEqual([]);
  });
  it('un fragmento que no es elegible (vigencia NULL) no valida ninguna mención', () => {
    expect(mencionesNoValidadas(valido, [cpp173({ es_norma_vigente: null })]).length).toBeGreaterThan(0);
  });
  it('lista de artículos: «arts. 173 y 999 del CPP» con solo el 173 recuperado → el 999 no está validado', () => {
    expect(mencionesNoValidadas('Los arts. 173 y 999 del CPP regulan la prisión preventiva.', [f173])).toContain('ARTICULO_SIN_FRAGMENTO:999');
  });
});

describe('D-1 (re-auditoría): la ruta D (sin corpus) retiene la salida; si nombra una norma, R3/R4 la abstiene', () => {
  const sinCorpus = (texto: string) => evaluarRespuestaChatR3({ texto, fragmentos: [], pregunta: 'pregunta general', conCorpus: false });
  it('«Según el artículo 173 del CPP…» sin fragmento → abstención que dice qué falta', () => {
    const v = sinCorpus('Según el artículo 173 del CPP, la prisión preventiva procede con indicios racionales de participación.');
    expect(v.suficiente).toBe(false);
    if (!v.suficiente) expect(v.motivo).toBe('SIN_FRAGMENTOS_PARA_NORMA');
  });
  it('nombra un instrumento sin artículo («el Código Penal sanciona…») → abstención', () => {
    expect(sinCorpus('El Código Penal sanciona con prisión el hurto de bienes ajenos.').suficiente).toBe(false);
  });
  it('afirma el contenido de «la ley» sin nombrarla → abstención', () => {
    expect(sinCorpus('La ley hondureña establece que la pena máxima es de cuarenta años.').suficiente).toBe(false);
  });
  it('una respuesta general sin citas ni normas concretas se entrega íntegra', () => {
    const t = 'En una audiencia conviene llegar con anticipación, llevar los documentos organizados y escuchar con atención a la jueza.';
    const v = sinCorpus(t);
    expect(v.suficiente).toBe(true);
    if (v.suficiente) { expect(v.texto).toBe(t); expect(v.citas).toEqual([]); }
  });
  it('mencionaNormaConcreta distingue lo general de lo normativo', () => {
    expect(mencionaNormaConcreta('Es importante mantener la calma durante la audiencia.')).toBe(false);
    expect(mencionaNormaConcreta('Véase el art. 12.')).toBe(true);
    expect(mencionaNormaConcreta('Según la Constitución, toda persona es inocente.')).toBe(true);
  });
});

describe('D-1 (auditoría 3): el detector de la ruta D cubre «Arto.», unidades, siglas, nombres en minúscula y verbos normativos', () => {
  const sinCorpus = (texto: string) => evaluarRespuestaChatR3({ texto, fragmentos: [], pregunta: 'pregunta general', conCorpus: false });
  const f173 = cpp173();
  const pregunta173 = '¿Qué dispone el artículo 173 del Código Procesal Penal?';
  const valido = 'Según el artículo 173 del Código Procesal Penal, la prisión preventiva procede con indicios racionales de participación.';

  it.each([
    'Según el Arto. 173, la prisión preventiva procede con indicios racionales.',
    'Conforme al Arto 173 la prisión preventiva procede con indicios racionales.',
    'Según el art. 173 la prisión preventiva procede con indicios racionales.',
    'Según los arts. 10 y 173 la prisión preventiva procede con indicios racionales.',
    'Según el artículo No. 173 la prisión preventiva procede con indicios racionales.',
    'El numeral 3 establece los requisitos para la prisión preventiva en estos casos.',
    'Revise el inciso b para conocer las excepciones aplicables a su situación.',
    'Según el D.L. 130-2017 la prisión preventiva procede con indicios racionales.',
    'Según el DL 130-2017 la prisión preventiva procede con indicios racionales.',
    'Según el D.E. 12-2020 se regula la materia de manera especial.',
    'La ley de municipalidades fija el procedimiento para obtener ese permiso.',
    'El decreto legislativo 130-2017 trata esa materia con detalle.',
    'El reglamento de la ley del notariado exige esos documentos para el trámite.',
  ])('se abstiene (mención normativa sin fragmento): %s', (t) => {
    const v = sinCorpus(t);
    expect(v.suficiente, t).toBe(false);
    if (!v.suficiente) expect(v.motivo).toBe('SIN_FRAGMENTOS_PARA_NORMA');
  });

  it.each([
    'El plazo para apelar es de tres días.',
    'El plazo para apelar es de 3 días hábiles.',
    'La pena es de cinco años de prisión para ese delito.',
    'Tiene tres días para apelar la resolución del juez.',
    'La ley fija la pena máxima en cuarenta años de reclusión.',
    'La norma establece que el trámite es gratuito para el interesado.',
    'El código dispone requisitos distintos según el tipo de contrato.',
    'La legislación sanciona con multa esa conducta de forma expresa.',
    'El tribunal fija el plazo de prescripción en cada caso concreto.',
  ])('contenido normativo sin artículo citado → se abstiene: %s', (t) => {
    expect(sinCorpus(t).suficiente, t).toBe(false);
  });

  it.each([
    'Conviene llegar temprano a la audiencia y organizar bien tus documentos.',
    'Mi consejo es que fijes tus objetivos y prepares con calma tu intervención.',
    'Respira, escucha con atención y responde con claridad cuando te pregunten.',
    'La preparación previa suele reducir la ansiedad antes de una audiencia.',
    'Establece una rutina de estudio con descansos de diez minutos cada hora.',
  ])('una respuesta general sin normas ni cantidades normativas se entrega: %s', (t) => {
    expect(sinCorpus(t).suficiente, t).toBe(true);
  });

  it('oracionAfirmaContenidoNormativo: verbo normativo + sustantivo jurídico, cantidad y plazo procesal', () => {
    expect(oracionAfirmaContenidoNormativo('El juez establece el plazo para contestar.')).toBe(true);
    expect(oracionAfirmaContenidoNormativo('Se sanciona con prisión de tres a cinco años.')).toBe(true);
    expect(oracionAfirmaContenidoNormativo('Hoy hace buen clima en la capital.')).toBe(false);
  });

  it('rutas con corpus: contenido normativo SIN artículo en otro párrafo → abstención completa', () => {
    const v = evaluarRespuestaChatR3({ texto: `${valido}\n\nEl plazo para apelar es de tres días.`, fragmentos: [f173], pregunta: pregunta173, conCorpus: true });
    expect(v.suficiente).toBe(false);
    if (!v.suficiente) { expect(v.motivo).toBe('MENCION_NO_VALIDADA'); expect(v.mensaje).not.toContain('tres días'); }
  });
  it('rutas con corpus: la oración normativa en el MISMO bloque que el artículo válido, pero que el fragmento no respalda → abstención', () => {
    const v = evaluarRespuestaChatR3({ texto: `${valido} Además, el plazo para apelar es de tres días.`, fragmentos: [f173], pregunta: pregunta173, conCorpus: true });
    expect(v.suficiente).toBe(false);
  });
  it('rutas con corpus: «Arto. 173» del instrumento correcto sí se valida y se entrega', () => {
    const v = evaluarRespuestaChatR3({ texto: 'Según el Arto. 173 del Código Procesal Penal, la prisión preventiva procede con indicios racionales de participación.', fragmentos: [f173], pregunta: pregunta173, conCorpus: true });
    expect(v.suficiente).toBe(true);
  });
  it('rutas con corpus: un numeral/inciso sin artículo validado en el bloque → abstención; colgado de un artículo validado, no', () => {
    expect(mencionesNoValidadas('El numeral 3 fija la regla para estos casos de prisión.', [f173])).toContain('UNIDAD_SIN_ARTICULO_VALIDADO');
    expect(mencionesNoValidadas('Según el artículo 173 del Código Procesal Penal, numeral 3, procede con indicios racionales.', [f173])).not.toContain('UNIDAD_SIN_ARTICULO_VALIDADO');
  });
  it('rutas con corpus: siglas y nombres en minúscula son instrumentos desconocidos', () => {
    expect(mencionesNoValidadas('El D.L. 130-2017 regula la materia.', [f173])).toContain('INSTRUMENTO_DESCONOCIDO');
    expect(mencionesNoValidadas('La ley de municipalidades regula la materia.', [f173])).toContain('INSTRUMENTO_DESCONOCIDO');
    expect(mencionesNoValidadas('Según el código procesal penal, art. 173, procede.', [f173])).not.toContain('INSTRUMENTO_DESCONOCIDO');
  });
});

describe('A-4b (auditoría 3): el respaldo exige cifras, artículo e instrumento coincidentes, no solo traslape de palabras', () => {
  const f = cpp173();
  it('instrumento distinto del fragmento → no respalda (aunque el resto coincida)', () => {
    expect(afirmacionRespaldadaPorFragmento('Según el Código Procesal Penal, la prisión preventiva procede con indicios racionales de participación.', f)).toBe(true);
    expect(afirmacionRespaldadaPorFragmento('Según el Código Penal, la prisión preventiva procede con indicios racionales de participación.', f)).toBe(false);
    expect(afirmacionRespaldadaPorFragmento('Según la Ley de Justicia Constitucional, la prisión preventiva procede con indicios racionales.', f)).toBe(false);
  });
  it('artículo: debe ser exactamente el del fragmento; que el número aparezca en su texto (una remisión) ya no basta', () => {
    const remite = cpp173({ id: 'cpp-10', num_articulo: '10', contenido: 'ARTICULO 10.- Lo dispuesto en el artículo 173 se aplicará a la prisión preventiva con indicios racionales.' });
    expect(afirmacionRespaldadaPorFragmento('El artículo 173 se aplica a la prisión preventiva con indicios racionales.', remite)).toBe(false);
    expect(afirmacionRespaldadaPorFragmento('El Arto. 173 regula la prisión preventiva con indicios racionales de participación.', f)).toBe(true);
    expect(afirmacionRespaldadaPorFragmento('El art. 174 regula la prisión preventiva con indicios racionales de participación.', f)).toBe(false);
  });
  it('cifras: dígitos y números en palabras deben figurar en el fragmento', () => {
    expect(afirmacionRespaldadaPorFragmento('Según el artículo 173 del Código Procesal Penal, la pena debe superar los cinco años.', f)).toBe(true);
    expect(afirmacionRespaldadaPorFragmento('Según el artículo 173 del Código Procesal Penal, la pena debe superar los 5 años.', f)).toBe(true);
    expect(afirmacionRespaldadaPorFragmento('Según el artículo 173 del Código Procesal Penal, la pena debe superar los diez años.', f)).toBe(false);
    expect(afirmacionRespaldadaPorFragmento('La pena debe superar los 12 años.', f)).toBe(false);
  });
  it('sin anclas verificables (ni cifra, ni artículo, ni instrumento) el traslape de palabras ya no alcanza con 60 %', () => {
    // 3 de 5 términos propios coinciden (60 %): antes bastaba; ahora sin anclas exige ≥ 75 %.
    expect(afirmacionRespaldadaPorFragmento('La prisión preventiva procede libremente siempre.', f)).toBe(false);
    // Con traslape alto y suficientes términos coincidentes, la afirmación sin anclas sigue valiendo.
    expect(afirmacionRespaldadaPorFragmento('La prisión preventiva procede cuando existan indicios racionales de participación.', f)).toBe(true);
  });
  it('una afirmación sin términos propios ni anclas no se respalda', () => {
    expect(afirmacionRespaldadaPorFragmento('Esto es así.', f)).toBe(false);
  });
  it('la afirmación que solo trae ancla de cifra y coincide, se respalda', () => {
    expect(afirmacionRespaldadaPorFragmento('Son cinco años.', f)).toBe(true);
  });
  it('evaluarSuficienciaR3: una cita DIRECT cuya afirmación nombra otro instrumento no cuenta', () => {
    const r = evaluarSuficienciaR3([f], afirma('Según el Código Penal, la prisión preventiva procede con indicios racionales de participación.'), OBJ_173_CPP, {}, TXT);
    expect(r).toMatchObject({ suficiente: false });
  });
});

describe('A-4b (re-auditoría 4): con artículo válido citado, la afirmación no puede contradecir ni añadir al fragmento', () => {
  const f = cpp173();
  it.each([
    'Según el artículo 173 del Código Procesal Penal, la prisión preventiva perpetua para delitos menores.',
    'Según el artículo 173 del Código Procesal Penal, la prisión preventiva no procede cuando existan indicios.',
    'Según el artículo 173 del Código Procesal Penal, aplica una pena inferior a cinco años.',
    'Según el artículo 173 del Código Procesal Penal, la prisión preventiva procede siempre, aun sin indicios.',
  ])('no respalda: %s', (txt) => {
    expect(afirmacionRespaldadaPorFragmento(txt, f)).toBe(false);
  });
  it('la misma cifra con otra unidad no respalda', () => {
    expect(afirmacionRespaldadaPorFragmento('Según el artículo 173 del Código Procesal Penal, la pena debe superar los cinco meses.', f)).toBe(false);
  });
  it('la paráfrasis fiel sigue respaldada', () => {
    expect(afirmacionRespaldadaPorFragmento('Según el artículo 173 del Código Procesal Penal, la prisión preventiva procede cuando existan indicios racionales de participación.', f)).toBe(true);
  });
});

describe('D-1 (re-auditoría 4): residuo del detector normativo de la ruta D', () => {
  it.each([
    'Conforme al artículo ciento setenta y tres la prisión preventiva procede en esos casos.',
    'El artículo veinte regula esa materia de forma especial.',
    'En ese supuesto el recurso no procede y debe usted esperar.',
    'Esa conducta está prohibida y es sancionada.',
    'La edad mínima es de 18 años para ese acto.',
    'El término es de 2 años contados desde la fecha.',
    'La cuantía es de 11,000 lempiras para ese trámite.',
    'La LCT establece las reglas de ese contrato.',
  ])('se abstiene sin fragmento: %s', (t) => {
    const v = evaluarRespuestaChatR3({ texto: t, fragmentos: [], pregunta: 'pregunta general', conCorpus: false });
    expect(v.suficiente, t).toBe(false);
    if (!v.suficiente) expect(v.motivo).toBe('SIN_FRAGMENTOS_PARA_NORMA');
  });
  it('una respuesta general sin norma concreta sigue pasando', () => {
    const t = 'Una audiencia es el acto en que las partes exponen sus argumentos ante el juez.';
    const v = evaluarRespuestaChatR3({ texto: t, fragmentos: [], pregunta: 'pregunta general', conCorpus: false });
    expect(v.suficiente).toBe(true);
  });
});
