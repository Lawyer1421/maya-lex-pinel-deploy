import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { segmentarArticulos, segmentarSerieCorrelativa } from '@/lib/legal-os/corpus-factory/staging';
import { construirLote } from '@/scripts/ingesta-lote-staging';

// Transcripción del A04 (D.35-2013) ya versionada en el lote: v5 (fa47cc72…). La segmentación no depende de las correcciones pendientes de la v6.
const A04 = readFileSync('docs/corpus/staging/2026-11-05-hn-001-a04-orientacion/transcripcion_candidata/A04_transcripcion_candidata_v5.txt', 'utf8');
const D284 = readFileSync('docs/corpus/staging/2026-11-15-hn-d284-2013-piloto/transcripcion/transcripcion_candidata.txt', 'utf8');
const SERIE = Array.from({ length: 19 }, (_, i) => String(i + 1));

describe('segmentación por serie correlativa: D.35-2013 (A04), arts. 1–19', () => {
  it('el segmentador general parte mal el decreto (por eso existe la opción)', () => {
    const numeros = segmentarArticulos(A04).articulos.map((a) => a.numero);
    expect(numeros).not.toEqual(SERIE);
    expect(numeros).toContain('973'); // art. 973 del Código Civil transcrito dentro del art. 6
    expect(numeros).not.toContain('18'); // rótulo espaciado «A R T I C U L O 18.-»
  });

  it('produce exactamente 19 artículos, numerados 1 a 19 y en orden', () => {
    const s = segmentarSerieCorrelativa(A04, 19);
    expect(s.articulos.map((a) => a.numero)).toEqual(SERIE);
    expect(s.articulos.map((a) => a.ordinal)).toEqual(SERIE.map(Number));
    expect(s.notas).toEqual([]);
    expect(s.preambulo).toMatch(/^D E C R E T O No\. 35-2013/);
    expect(s.preambulo).toContain('DECRETA:');
  });

  it('los artículos transcritos de otras leyes quedan dentro del artículo propio que los contiene', () => {
    const a = segmentarSerieCorrelativa(A04, 19).articulos;
    expect(a[5].texto).toMatch(/^Reformar los Artículos 37,234,271,434,/);
    expect(a[5].texto).toContain('"ARTICULO 963.- Hay siempre lugar a la representación:');
    expect(a[5].texto).toMatch(/ARTÍCULO 973\.-/);
    expect(a[0].texto).toContain('"ARTICULO 20.- Se prohibe la extracción de órganos,');
    expect(a[7].texto).toContain('A R T I C U L O 179-E.-'); // «179-E» no es el art. 17 del decreto
  });

  it('acepta los rótulos espaciados de los arts. 18 y 19 y no los funde en el art. 17', () => {
    const a = segmentarSerieCorrelativa(A04, 19).articulos;
    expect(a[16].texto).not.toMatch(/TRANSITORIO|entrará en vigencia/);
    expect(a[17].texto).toMatch(/^TRANSITORIO\.- A efecto de lograr el/);
    expect(a[18].texto).toMatch(/^El presente Decreto entrará en vigencia a/);
  });

  it('el fin de línea CRLF de la copia de Windows no cambia la segmentación ni los hashes', () => {
    const lf = segmentarSerieCorrelativa(A04.replace(/\r\n/g, '\n'), 19);
    const crlf = segmentarSerieCorrelativa(A04.replace(/\r?\n/g, '\r\n'), 19);
    expect(crlf.articulos.map((a) => a.sha256)).toEqual(lf.articulos.map((a) => a.sha256));
  });

  it('construirLote con serieCorrelativa: 19 genera 19 filas de HN:DECRETO_35_2013, sin repetidos ni saltos', () => {
    const { filas, excepciones } = construirLote({
      texto: A04, instrumentoRef: 'HN:DECRETO_35_2013', ingestBatch: 'PRUEBA_A04', fuente: 'prueba', fuenteTipo: 'ley', meta: {}, serieCorrelativa: 19,
    });
    expect(filas.map((f) => f.num_articulo)).toEqual(SERIE);
    expect(filas.map((f) => f.id)).toEqual(SERIE.map((n) => `PRUEBA_A04:DECRETO_35_2013:${n}`));
    expect(excepciones.filter((e) => ['NUMERO_REPETIDO', 'NUMERO_AUSENTE'].includes(e.codigo))).toEqual([]);
    for (const f of filas) expect(f).toMatchObject({ jurisdiccion: 'HN', es_norma_vigente: null, revision_pendiente: true, instrumento_id: 'DECRETO_35_2013' });
  });
});

describe('segmentación por serie correlativa: reglas y errores', () => {
  const texto = [
    'DECRETO No. 1-2099', 'DECRETA:', '',
    'ARTÍCULO 1.- Reformar el Artículo 5, que se leerá así:', '"ARTÍCULO 5.- Texto ajeno transcrito.', 'ARTÍCULO 2 de la ley citada no es encabezado si no es el siguiente: este sí lo es.',
    '', 'A R T I C U L O 3.- Texto del tercero.', '"ARTÍCULO 4.- Ajeno, entre comillas."', '', 'ARTÍCULO 4.- Vigencia.',
  ].join('\n');

  it('solo el siguiente número de la serie, al comienzo de línea y sin comillas, abre un artículo', () => {
    const s = segmentarSerieCorrelativa(texto, 4);
    expect(s.articulos.map((a) => a.numero)).toEqual(['1', '2', '3', '4']);
    expect(s.articulos[0].texto).toContain('"ARTÍCULO 5.- Texto ajeno transcrito.');
    expect(s.articulos[2].texto).toContain('"ARTÍCULO 4.- Ajeno, entre comillas."');
    expect(s.articulos[3].texto).toBe('Vigencia.');
  });

  it('una serie incompleta lanza error en lugar de devolver una segmentación parcial', () => {
    expect(() => segmentarSerieCorrelativa(texto, 5)).toThrow(/incompleta: no se halla el ARTÍCULO 5/);
    expect(() => segmentarSerieCorrelativa(texto.replace('A R T I C U L O 3.-', 'Texto'), 4)).toThrow(/ARTÍCULO 3/);
  });

  it('un artículo propio después del último declarado lanza error (la serie declarada es menor que la del texto)', () => {
    expect(() => segmentarSerieCorrelativa(texto, 3)).toThrow(/aparece un ARTÍCULO 4 propio después del 3/);
  });

  it('rechaza un total inválido', () => {
    expect(() => segmentarSerieCorrelativa(texto, 0)).toThrow(/inválida/);
  });
});

describe('el Decreto 284-2013 (piloto) no cambia', () => {
  it('sin la opción, construirLote segmenta igual que antes: 39 artículos con el segmentador general', () => {
    const general = segmentarArticulos(D284).articulos;
    const { filas } = construirLote({ texto: D284, instrumentoRef: 'HN:DECRETO_284_2013', ingestBatch: 'PRUEBA_D284', fuente: 'prueba', fuenteTipo: 'ley', meta: {} });
    expect(filas).toHaveLength(39);
    expect(filas.map((f) => f.num_articulo)).toEqual(general.map((a) => a.numero));
    expect(filas.map((f) => f.metadata.article_sha256)).toEqual(general.map((a) => a.sha256));
  });

  it('con la serie 1–39, el D.284-2013 da los mismos 39 artículos y el mismo texto (sin el guion de «N.-» que el general deja al inicio)', () => {
    // Bytes LF (los firmados): la copia de Windows puede venir en CRLF y el segmentador general no normaliza el fin de línea.
    const lf = D284.replace(/\r\n/g, '\n');
    const general = segmentarArticulos(lf).articulos;
    const serie = segmentarSerieCorrelativa(lf, 39).articulos;
    expect(serie.map((a) => a.numero)).toEqual(general.map((a) => a.numero));
    // La opción es solo para decretos modificatorios: el D.284-2013 (ya en staging) se sigue ingiriendo sin ella y sus hashes no cambian.
    expect(serie.map((a) => a.texto)).toEqual(general.map((a) => a.texto.replace(/^-\s*/, '')));
  });
});
