import { describe, expect, it } from 'vitest';
import { dice, leerD35, normalizarCotejo, refluirGaceta, tipificarNotaCC } from '../scripts/olas/ola4-cc';
import { articuloDeNota, corregirErratas, extraer, leerD35CF, quitarEstructura, refluirCF, segmentar, tipificarNota } from '../scripts/olas/ola5-cf';

describe('OLA4 CC · La Gaceta 33,222 (D.35-2013)', () => {
  it('lee la lista oficial del art. 14 con la huella de producción: 324 artículos, incluye 252–260, no 307 ni 397', () => {
    const { derogados, reformados } = leerD35();
    expect(derogados.size).toBe(324);
    for (let n = 252; n <= 260; n++) expect(derogados.has(n)).toBe(true);
    expect(derogados.has(307)).toBe(false);
    expect(derogados.has(397)).toBe(false);
    expect(derogados.has(234)).toBe(false); // reformado, no derogado
    expect([...reformados.keys()]).toEqual(['37', '234', '271', '434', '511', '516', '559', '960', '963', '972', '973']);
  });
  it('un salto de columna a mitad de oración no abre párrafo', () => {
    expect(refluirGaceta('no podrán reclamarse sobre el\n\nhijo(a) que haya sido llevado.')).toBe('no podrán reclamarse sobre el hijo(a) que haya sido llevado.');
    expect(refluirGaceta('Primer párrafo.\n\nSegundo párrafo.')).toBe('Primer párrafo.\n\nSegundo párrafo.');
  });
  it('cotejo normalizado: ignora acentos, puntuación y epígrafes en mayúsculas', () => {
    expect(dice(normalizarCotejo('Él dijo: «sí».'), normalizarCotejo('el dijo si'))).toBe(1);
    expect(dice(normalizarCotejo('CAPITULO II\nTexto igual aquí'), normalizarCotejo('Texto igual aqui'))).toBe(1);
    expect(dice(normalizarCotejo('uno dos tres'), normalizarCotejo('cuatro cinco seis'))).toBe(0);
  });
  it('tipifica las notas de la edición PJ 2014', () => {
    expect(tipificarNotaCC('Artículo 1565. Derogado por decreto No.51-2011', 1565)).toBe('DEROGACION_TOTAL');
    expect(tipificarNotaCC('Artículo 2307. Véase, Convenio para Suprimir…', 2307)).toBe('REFERENCIA');
    expect(tipificarNotaCC('Artículo 2137. Reformado Decreto 37-90 … Artículo 2137. Véase Ley del Sistema Financiero', 2137)).toBe('REFORMA');
    expect(tipificarNotaCC('Párrafo Derogado por el Decreto N°. 211-2006', 553)).toBe('DEROGACION_PARCIAL');
    expect(tipificarNotaCC('Artículo 21 a 36 Derogados, Artículo 37 Reformado por Decreto No. 35-2013', 37)).toBe('REFORMA');
  });
});

describe('OLA5 CF · extracción de la edición CEDIJ', () => {
  const pagina = (cuerpo: string, notas: string) => `${cuerpo}\n\n${notas}\n\n                                                     7\n\n               CENTRO ELECTRÓNICO DE DOCUMENTACIÓN E INFORMACIÓN JUDICIAL\n`;
  it('separa notas al pie (con o sin espacio tras el número) de cabeceras, folios y cuerpo', () => {
    const { cuerpo, notas } = extraer(pagina('Artículo 10. Texto.\n3) Un numeral;', '1 Artículo 11. Reformado.\nsigue la nota.\n2Artículo 12. Derogado.') + '\f' + pagina('Artículo 13. Más.', ' 3 Artículo 13. Reformado.'));
    expect(notas.map((n) => n.num)).toEqual([1, 2, 3]);
    expect(notas[0].texto).toBe('Artículo 11. Reformado. sigue la nota.');
    expect(cuerpo).toContain('3) Un numeral;');
    expect(cuerpo).not.toMatch(/CENTRO ELECTR|^\s+7\s*$/m);
  });
  it('resuelve llamadas pegadas al número del artículo, al texto, duplicadas y en un epígrafe de título', () => {
    const texto = [
      'Artículo 1. Uno.', 'Artículo 21. Dos reformado.', 'Artículo 3. Tres; último párrafo Derogado.2',
      'Artículo 3-A33. Bis con voladito duplicado.', 'TÍTULO IV 4', 'Artículo 45. Derogado', 'Artículo 5. Fin.',
    ].join('\n');
    const a = segmentar(texto, 5);
    expect(a.map((x) => [x.numero, x.llamadas])).toEqual([['1', []], ['2', [1]], ['3', [2]], ['3-A', [3]], ['4', [4, 5]], ['5', []]]);
    expect(a[2].texto).toBe('Tres; último párrafo Derogado.');
  });
  it('una referencia «Artículo 5 de este Código» al inicio de línea no abre artículo', () => {
    const a = segmentar('Artículo 1. En tanto se crean los tribunales previstos en el\nArtículo 3 de este Código, conocerán.\nArtículo 2. Otro.', 0);
    expect(a.map((x) => x.numero)).toEqual(['1', '2']);
  });
  it('falla si quedan llamadas sin resolver', () => {
    expect(() => segmentar('Artículo 1. Uno.', 1)).toThrow(/se resolvieron 0 de 1/);
  });
  it('erratas de numeración confirmadas por la nota', () => {
    expect(corregirErratas('x\nArtículo 323.47Derogado\ny\nArtículo 332.55Derogado')).toBe('x\nArtículo 133.47Derogado\ny\nArtículo 142.55Derogado');
    expect(() => corregirErratas('nada')).toThrow(/0 apariciones/);
  });
  it('la nota nombra su artículo en las variantes de la edición', () => {
    expect(articuloDeNota('Artículo 119 A. Reformado por Adición')).toBe('119-A');
    expect(articuloDeNota('Artículo 175.-A. Adicionado mediante Decreto 124-92')).toBe('175-A');
    expect(articuloDeNota('Artículo 332- A. Reformado por Adición')).toBe('332-A');
    expect(articuloDeNota('Último párrafo Artículo 16. Derogado mediante Decreto 44-2017')).toBe('16');
    expect(articuloDeNota('Título IV de la Adopción Capítulo I … Derogado')).toBeNull();
    expect(tipificarNota('Título IV de la Adopción Capítulo I de las Disposiciones Generales. Derogado mediante Decreto 102-2018')).toBe('DEROGACION_DE_TITULO');
    expect(tipificarNota('Último párrafo Artículo 16. Derogado mediante Decreto 44-2017')).toBe('DEROGACION_PARCIAL');
    expect(tipificarNota('Artículo 70-A. Adicionado mediante Decreto 31-2015')).toBe('ADICION');
  });
  it('retira la estructura del final y reflujo de párrafos', () => {
    expect(quitarEstructura('Texto final.\n\nTÍTULO V\nDE LA PATRIA\nPOTESTAD CAPÍTULO\nI\n')).toEqual({ texto: 'Texto final.', ubicacion: ['TÍTULO V', 'DE LA PATRIA', 'POTESTAD CAPÍTULO', 'I'] });
    expect(quitarEstructura('Texto.\nSección Primera').ubicacion).toEqual(['Sección Primera']);
    expect(refluirCF('Son causas:\n1) Una cosa\nque sigue;\n2) Otra.\n\ny continúa aquí.')).toBe('Son causas:\n1) Una cosa que sigue;\n2) Otra. y continúa aquí.'.replace('Otra. y', 'Otra.\n\ny'));
  });
  it('lee los arts. 4, 5 y 13 del D.35-2013 con la huella de producción', () => {
    const d = leerD35CF();
    expect(d.reformados.size).toBe(62);
    expect(d.reformados.get('238')).toMatch(/^Son causas de divorcio:/);
    expect(d.derogados.has('131')).toBe(true);
  });
});
