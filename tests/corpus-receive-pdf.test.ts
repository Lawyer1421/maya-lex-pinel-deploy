import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  PERFILES, analizarPaginas, constaEnTexto, decretosEnEncabezado, dentroDe, evaluarIdentidad, loteValido, normalizar, recibir, sha256,
  type OpcionesRecepcion,
} from '../tools/corpus/receive-pdf';

const hayPoppler = ['pdftotext', 'pdfinfo'].every((b) => spawnSync(b, ['-v'], { stdio: 'ignore' }).status !== null);
/** En CI (REQUIRE_POPPLER=1) la falta de Poppler es un FALLO, nunca una omisión silenciosa de las pruebas con PDF real. */
const exigirPoppler = process.env.REQUIRE_POPPLER === '1';

describe('receive-pdf: entorno de pruebas', () => {
  it('poppler-utils (pdftotext y pdfinfo) está instalado cuando se exige (CI)', () => {
    if (exigirPoppler) expect(hayPoppler, 'REQUIRE_POPPLER=1 pero faltan pdftotext/pdfinfo: instale poppler-utils').toBe(true);
  });
});

/** PDF sintético con N páginas y tabla xref correcta. Contenido SINTÉTICO para pruebas. */
function pdfSintetico(paginas: string[][]): Buffer {
  const objs: string[] = [];
  const kids = paginas.map((_, i) => `${3 + i * 2} 0 R`).join(' ');
  objs.push('<< /Type /Catalog /Pages 2 0 R >>');
  objs.push(`<< /Type /Pages /Kids [${kids}] /Count ${paginas.length} >>`);
  const fuente = 3 + paginas.length * 2;
  paginas.forEach((lineas, i) => {
    const flujo = lineas.length ? `BT /F1 10 Tf 12 TL 40 760 Td ${lineas.map((l) => `(${l.replace(/[()\\]/g, '')}) Tj T*`).join(' ')} ET` : '';
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${4 + i * 2} 0 R /Resources << /Font << /F1 ${fuente} 0 R >> >> >>`);
    objs.push(`<< /Length ${flujo.length} >>\nstream\n${flujo}\nendstream`);
  });
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  let out = '%PDF-1.4\n';
  const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((x) => `${String(x).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

const relleno = (n: number, prefijo = 'Linea'): string[] =>
  Array.from({ length: n }, (_, i) => `${prefijo} ${i + 1}: texto sintetico de relleno suficiente para superar el minimo de caracteres por pagina en la prueba.`);

const CABECERA_NINEZ = ['CODIGO DE LA NINEZ Y DE LA ADOLESCENCIA', 'DECRETO No. 73-96', 'TEXTO SINTETICO DE PRUEBA, NO ES UNA LEY REAL'];
const CUERPO_NINEZ = [
  'ARTICULO 1.- Los ninos y las ninas, los adolescentes y los menores son titulares de derechos; la familia protege su desarrollo.',
  'ARTICULO 2.- Para los efectos de este documento sintetico se considera nino toda persona menor de doce anos de edad cumplidos.',
  'ARTICULO 3.- La familia, la sociedad y el Estado aseguran la proteccion integral de la ninez y la adolescencia sin discriminacion.',
  'ARTICULO 4.- Este articulo existe solo para que la segmentacion encuentre varios articulos en el documento sintetico de prueba.',
];
const paginaNinez = (extra = 0): string[] => [...CABECERA_NINEZ, ...CUERPO_NINEZ, ...relleno(extra)];

const URL_CEDIJ = 'https://legislacion.poderjudicial.gob.hn/sistemalegislacion/Anexos/ninez-sintetico.pdf';
const URL_NO_VALIDADA = 'https://example.invalid/sintetico/ninez.pdf';

function opciones(raiz: string, archivo: string, extra: Partial<OpcionesRecepcion> = {}): OpcionesRecepcion {
  return { archivo, paquete: 'HN-001-A03', url: URL_CEDIJ, retriever: 'test', fecha: '2026-11-01T12:00:00Z', metodo: 'MANUAL_BROWSER', lote: 'lote-prueba', raiz, ...extra };
}
const nuevaRaiz = (): string => mkdtempSync(join(tmpdir(), 'rcv-'));
const escribir = (raiz: string, nombre: string, datos: Buffer | string): string => { const r = join(raiz, nombre); writeFileSync(r, datos); return r; };
const archivosEn = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir) : []);

describe('receive-pdf: funciones puras', () => {
  it('normaliza sin tildes ni mayúsculas', () => {
    expect(normalizar('  CÓDIGO   de la NIÑEZ ')).toBe('codigo de la ninez');
  });
  it('decreto y Gaceta solo constan si están en el texto (tolera 33,445 y 33445)', () => {
    expect(constaEnTexto('La Gaceta No. 33,445 del 5 de junio', '33,445')).toBe(true);
    expect(constaEnTexto('La Gaceta 33445', '33,445')).toBe(true);
    expect(constaEnTexto('La Gaceta 28,053', '33,445')).toBe(false);
  });
  it('sha256 coincide con el valor conocido', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('los cuatro perfiles existen y las páginas son huellas del ejemplar, no requisitos de validez', () => {
    expect(Object.keys(PERFILES).sort()).toEqual(['HN-001-A01', 'HN-001-A02', 'HN-001-A03', 'HN-001-A04']);
    expect(PERFILES['HN-001-A01'].huellaPaginas).toBe(419);
    expect(PERFILES['HN-001-A02'].huellaPaginas).toBe(17);
  });
  it('lote y rutas: rechaza recorridos de directorio', () => {
    expect(loteValido('2026-11-hn-001')).toBe(true);
    for (const malo of ['../x', 'a/b', '..', '.oculto', '', 'a\\b', 'x'.repeat(81)]) expect(loteValido(malo)).toBe(false);
    expect(dentroDe('/a/b', '/a/b/c/d')).toBe(true);
    expect(dentroDe('/a/b', '/a/b/../c')).toBe(false);
    expect(dentroDe('/a/b', '/otra')).toBe(false);
  });
});

describe('receive-pdf: identidad normativa', () => {
  const comercio = (cab: string) => `${cab}\nlos comerciantes y las sociedades mercantiles se inscriben en el registro mercantil. ${'x '.repeat(50)}`;
  it('confirma título + número + contexto', () => {
    const t = `${CABECERA_NINEZ.join('\n')}\n${CUERPO_NINEZ.join('\n')}`;
    expect(evaluarIdentidad(t, PERFILES['HN-001-A03']).estado).toBe('CONFIRMADA');
  });
  it('la palabra «comercio» sola NO basta', () => {
    const r = evaluarIdentidad('Cámara de comercio. El comercio internacional crece cada año.', PERFILES['HN-001-A01']);
    expect(r.estado).toBe('NO_CONFIRMADA');
    expect(r.hallazgos.join(' ')).toMatch(/título|número|contexto/i);
  });
  it('un número de decreto aislado NO basta', () => {
    const r = evaluarIdentidad('Informe interno. Ver decreto 284-2013 citado al pasar en una nota.', PERFILES['HN-001-A02']);
    expect(r.estado).not.toBe('CONFIRMADA');
  });
  it('título correcto pero sin el número del instrumento → no confirmada', () => {
    const r = evaluarIdentidad(comercio('CODIGO DE COMERCIO'), PERFILES['HN-001-A01']);
    expect(r.estado).toBe('NO_CONFIRMADA');
    expect(r.hallazgos.join(' ')).toMatch(/número/);
  });
  it('encabezado con otro instrumento → ambigua', () => {
    const r = evaluarIdentidad(comercio('CODIGO DE COMERCIO DECRETO No. 73-50 CODIGO DE LA NINEZ'), PERFILES['HN-001-A01']);
    expect(r.estado).toBe('AMBIGUA');
  });
  it('encabezado con otro decreto → ambigua; el decreto reformado sí se permite en la reforma', () => {
    expect(evaluarIdentidad(comercio('CODIGO DE COMERCIO DECRETO No. 73-50 DECRETO No. 99-2005'), PERFILES['HN-001-A01']).estado).toBe('AMBIGUA');
    const reforma = 'DECRETO No. 284-2013 reforma el Codigo de Comercio, Decreto No. 73-50. Articulo 1. Articulo 2. Decreto del Congreso.';
    expect(evaluarIdentidad(reforma, PERFILES['HN-001-A02']).estado).toBe('CONFIRMADA');
    expect(decretosEnEncabezado(normalizar('Decreto No. 73-1950 y decreto 284-2013'))).toEqual(['73-50', '284-2013']);
  });
});

describe('receive-pdf: extracción por página', () => {
  const pag = (n: number, c = 'a') => c.repeat(n);
  it('detecta una página faltante (menos páginas de texto que el PDF)', () => {
    const t = [pag(1200), pag(1200)].join('\f') + '\f';
    const r = analizarPaginas(t, 3);
    expect(r.bloqueantes.join(' ')).toMatch(/2 páginas de texto y el PDF tiene 3/);
  });
  it('detecta páginas vacías aunque el promedio global sea alto', () => {
    const t = [pag(3000), pag(0), pag(3000), pag(3000)].join('\f') + '\f';
    const r = analizarPaginas(t, 4);
    expect(r.vacias).toEqual([2]);
    expect(r.bloqueantes.join(' ')).toMatch(/Páginas sin texto/);
  });
  it('detecta una racha de páginas truncadas; una sola página corta es solo aviso', () => {
    const base = Array.from({ length: 10 }, () => pag(2000));
    const racha = [...base]; racha[3] = pag(100); racha[4] = pag(100);
    expect(analizarPaginas(racha.join('\f') + '\f', 10).bloqueantes.join(' ')).toMatch(/texto muy corto/);
    const una = [...base]; una[9] = pag(100);
    const r = analizarPaginas(una.join('\f') + '\f', 10);
    expect(r.bloqueantes).toEqual([]);
    expect(r.avisos.join(' ')).toMatch(/cortas/);
  });
  it('detecta codificación dañada', () => {
    const t = [pag(2000), `${pag(500)}${'�'.repeat(100)}`].join('\f') + '\f';
    expect(analizarPaginas(t, 2).danadas).toEqual([2]);
  });
});

describe.skipIf(!hayPoppler && !exigirPoppler)('receive-pdf: recepción de un archivo (requiere poppler-utils)', () => {
  it('CLO_PENDING: PDF íntegro, identidad confirmada, dominio verificado y QA correcto; hash real y paquete en el inbox', () => {
    const raiz = nuevaRaiz();
    const pdf = pdfSintetico([paginaNinez(4), paginaNinez(4)]);
    const { recibo, codigo } = recibir(opciones(raiz, escribir(raiz, 'ninez.pdf', pdf)));
    expect(recibo.estado).toBe('CLO_PENDING');
    expect(codigo).toBe(0);
    expect(recibo.bytes_sha256).toBe(sha256(pdf));
    expect(recibo.identidad?.estado).toBe('CONFIRMADA');
    expect(recibo.requiere_revision).toBe(false);
    const paquete = JSON.parse(readFileSync(join(raiz, 'docs/corpus/inbox/lote-prueba/HN-001-A03.json'), 'utf8'));
    expect(paquete.text_sha256).toBe(sha256(paquete.extracted_text));
    expect(paquete.verification_state).toBe('UNVERIFIED');
    expect(paquete.source_tier).toBeNull();
    expect(paquete.decree).toBe('73-96'); // consta en el texto
    expect(archivosEn(join(raiz, 'docs/corpus/staging/lote-prueba/receipts')).length).toBe(1);
    expect(readFileSync(join(raiz, 'docs/corpus/staging/lote-prueba/receipts', archivosEn(join(raiz, 'docs/corpus/staging/lote-prueba/receipts'))[0]), 'utf8')).toMatch(/no prueba que la publicación sea auténtica/);
  });

  it('SOURCE_HOLD: fuente no validada (dominio fuera del registro)', () => {
    const raiz = nuevaRaiz();
    const { recibo, codigo } = recibir(opciones(raiz, escribir(raiz, 'n.pdf', pdfSintetico([paginaNinez(4)])), { url: URL_NO_VALIDADA }));
    expect(recibo.estado).toBe('SOURCE_HOLD');
    expect(codigo).toBe(3);
    expect(recibo.estado).not.toBe('CLO_PENDING');
  });

  it('QA_FAILED: documento sin artículos', () => {
    const raiz = nuevaRaiz();
    const sinArticulos = [...CABECERA_NINEZ, 'los ninos, adolescentes, menores y la familia viven en comunidad.', ...relleno(6)];
    const { recibo, codigo } = recibir(opciones(raiz, escribir(raiz, 'n.pdf', pdfSintetico([sinArticulos]))));
    expect(recibo.estado).toBe('QA_FAILED');
    expect(codigo).toBe(4);
  });

  it('PDF incompleto (descarga cortada) → INPUT_REJECTED y nada escrito en el inbox', () => {
    const raiz = nuevaRaiz();
    const pdf = pdfSintetico([paginaNinez(4), paginaNinez(4)]);
    const { recibo, codigo } = recibir(opciones(raiz, escribir(raiz, 'cortado.pdf', pdf.subarray(0, Math.floor(pdf.length / 2)))));
    expect(recibo.estado).toBe('INPUT_REJECTED');
    expect(recibo.motivo).toMatch(/incompleto/);
    expect(codigo).toBe(1);
    expect(existsSync(join(raiz, 'docs/corpus/inbox'))).toBe(false);
  });

  it('página faltante/vacía → RECEIVED para revisión; el receptor NO se ejecuta y el paquete queda en pending-review', () => {
    const raiz = nuevaRaiz();
    let llamadas = 0;
    const receptor = () => { llamadas++; return { codigo: 0, mensaje: 'no debería llamarse' }; };
    const pdf = pdfSintetico([paginaNinez(30), [], paginaNinez(30)]);
    const { recibo, codigo } = recibir(opciones(raiz, escribir(raiz, 'n.pdf', pdf), { receptor }));
    expect(recibo.estado).toBe('RECEIVED');
    expect(codigo).toBe(5);
    expect(recibo.requiere_revision).toBe(true);
    expect(recibo.motivos_revision.join(' ')).toMatch(/Páginas sin texto/);
    expect(llamadas).toBe(0);
    expect(existsSync(join(raiz, 'docs/corpus/inbox/lote-prueba/HN-001-A03.json'))).toBe(false);
    expect(archivosEn(join(raiz, 'docs/corpus/inbox/lote-prueba/pending-review')).length).toBe(1);
  });

  it('identidad ambigua → RECEIVED, nunca presentado como verificado', () => {
    const raiz = nuevaRaiz();
    const ambiguo = ['CODIGO DE LA NINEZ Y DE LA ADOLESCENCIA', 'DECRETO No. 73-96', 'CODIGO DE COMERCIO', ...CUERPO_NINEZ, ...relleno(5)];
    const { recibo } = recibir(opciones(raiz, escribir(raiz, 'a.pdf', pdfSintetico([ambiguo])), { receptor: () => { throw new Error('no debe llamarse'); } }));
    expect(recibo.estado).toBe('RECEIVED');
    expect(recibo.identidad?.estado).toBe('AMBIGUA');
  });

  it('páginas distintas de la huella → RECEIVED (otra edición posible), no INPUT_REJECTED ni aceptación automática; --revisado lo reanuda', () => {
    const raiz = nuevaRaiz();
    const comercio = ['CODIGO DE COMERCIO', 'DECRETO No. 73-50', 'Los comerciantes y las sociedades mercantiles se inscriben en el registro mercantil.',
      'ARTICULO 1.- Los comerciantes estan obligados a llevar contabilidad en la forma que este documento sintetico dispone.',
      'ARTICULO 2.- Las sociedades mercantiles se constituyen por escritura publica segun este documento sintetico de prueba.',
      'ARTICULO 3.- El registro mercantil es publico; este articulo existe solo para la segmentacion del documento de prueba.', ...relleno(5)];
    const archivo = escribir(raiz, 'c.pdf', pdfSintetico([comercio]));
    const base = { paquete: 'HN-001-A01', url: URL_NO_VALIDADA };
    const a = recibir(opciones(raiz, archivo, { ...base, receptor: () => { throw new Error('no debe llamarse'); } }));
    expect(a.recibo.estado).toBe('RECEIVED');
    expect(a.recibo.motivos_revision.join(' ')).toMatch(/huella del ejemplar identificado \(419\)/);
    expect(a.recibo.identidad?.estado).toBe('CONFIRMADA');
    const b = recibir(opciones(raiz, archivo, { ...base, revisado: 'Revisada contra la edicion oficial; es otra edicion de la misma norma.' }));
    expect(b.recibo.estado).toBe('SOURCE_HOLD'); // procesada, pero dominio no validado
    expect(b.recibo.revision_humana_declarada).toMatch(/otra edicion/);
    expect(archivosEn(join(raiz, 'docs/corpus/staging/lote-prueba/receipts')).length).toBe(2); // el primer recibo no se sobrescribió
  });

  it('--revisado exige un motivo humano real', () => {
    const raiz = nuevaRaiz();
    const { recibo } = recibir(opciones(raiz, escribir(raiz, 'n.pdf', pdfSintetico([paginaNinez(4)])), { revisado: 'ok' }));
    expect(recibo.estado).toBe('INPUT_REJECTED');
  });

  it('errores del receptor: queda RECEIVED, sin paquete en el inbox', () => {
    const raiz = nuevaRaiz();
    const { recibo, codigo } = recibir(opciones(raiz, escribir(raiz, 'n.pdf', pdfSintetico([paginaNinez(4)])), { receptor: () => { throw new Error('fallo simulado'); } }));
    expect(recibo.estado).toBe('RECEIVED');
    expect(recibo.error_receptor).toBe('fallo simulado');
    expect(codigo).toBe(5);
    expect(existsSync(join(raiz, 'docs/corpus/inbox/lote-prueba/HN-001-A03.json'))).toBe(false);
  });

  it('un informe viejo del receptor no se toma por el de esta corrida', () => {
    const raiz = nuevaRaiz();
    const salida = join(raiz, 'docs/corpus/staging/lote-prueba');
    mkdirSync(salida, { recursive: true });
    const viejo = join(salida, 'BATCH_REPORT.json');
    writeFileSync(viejo, JSON.stringify({ items: [{ importacion: 'SOURCE_VALIDATED', candidato: { estado: 'CLO_PENDING' } }] }));
    const antes = new Date(Date.now() - 3_600_000);
    utimesSync(viejo, antes, antes);
    const { recibo } = recibir(opciones(raiz, escribir(raiz, 'n.pdf', pdfSintetico([paginaNinez(4)])), { receptor: () => ({ codigo: 0, mensaje: 'sin escribir informe' }) }));
    expect(recibo.estado).toBe('RECEIVED');
    expect(recibo.estado).not.toBe('CLO_PENDING');
  });

  it('receptor que rechaza el paquete → INPUT_REJECTED', () => {
    const raiz = nuevaRaiz();
    const { recibo } = recibir(opciones(raiz, escribir(raiz, 'n.pdf', pdfSintetico([paginaNinez(4)])), { receptor: () => ({ codigo: 1, mensaje: 'rechazado' }) }));
    expect(recibo.estado).toBe('INPUT_REJECTED');
  });

  it('no sobrescribe: otro archivo con el mismo paquete y distinto hash se rechaza; el idéntico es idempotente', () => {
    const raiz = nuevaRaiz();
    const a = escribir(raiz, 'a.pdf', pdfSintetico([paginaNinez(4)]));
    expect(recibir(opciones(raiz, a)).recibo.estado).toBe('CLO_PENDING');
    const previo = readFileSync(join(raiz, 'docs/corpus/inbox/lote-prueba/HN-001-A03.json'), 'utf8');
    const b = escribir(raiz, 'b.pdf', pdfSintetico([paginaNinez(5)]));
    const r = recibir(opciones(raiz, b));
    expect(r.recibo.estado).toBe('INPUT_REJECTED');
    expect(r.recibo.motivo).toMatch(/no se sobrescribe/);
    expect(readFileSync(join(raiz, 'docs/corpus/inbox/lote-prueba/HN-001-A03.json'), 'utf8')).toBe(previo);
    expect(recibir(opciones(raiz, a)).recibo.estado).not.toBe('INPUT_REJECTED'); // mismo archivo: idempotente
  });

  it('rutas: un --lote con recorrido de directorio se rechaza y no escribe fuera', () => {
    const raiz = nuevaRaiz();
    const { recibo } = recibir(opciones(raiz, escribir(raiz, 'n.pdf', pdfSintetico([paginaNinez(4)])), { lote: '../../fuera' }));
    expect(recibo.estado).toBe('INPUT_REJECTED');
    expect(existsSync(join(raiz, 'docs'))).toBe(false);
  });

  it('un enlace simbólico en docs/corpus que sale del directorio esperado se rechaza', () => {
    const raiz = nuevaRaiz();
    const fuera = nuevaRaiz();
    mkdirSync(join(raiz, 'docs/corpus'), { recursive: true });
    symlinkSync(fuera, join(raiz, 'docs/corpus/inbox'));
    const { recibo } = recibir(opciones(raiz, escribir(raiz, 'n.pdf', pdfSintetico([paginaNinez(4)]))));
    expect(recibo.estado).toBe('INPUT_REJECTED');
    expect(recibo.motivo).toMatch(/fuera de docs\/corpus|ruta/);
    expect(archivosEn(fuera)).toEqual([]);
  });

  it('límites: archivo grande, enlace simbólico de entrada, no-PDF, paquete desconocido y URL no https', () => {
    const raiz = nuevaRaiz();
    const pdf = escribir(raiz, 'n.pdf', pdfSintetico([paginaNinez(4)]));
    expect(recibir(opciones(raiz, pdf, { maxMb: 0.0001 })).recibo.motivo).toMatch(/excede el límite/);
    symlinkSync(pdf, join(raiz, 'enlace.pdf'));
    expect(recibir(opciones(raiz, join(raiz, 'enlace.pdf'))).recibo.motivo).toMatch(/enlace simbólico/);
    expect(recibir(opciones(raiz, escribir(raiz, 'f.pdf', '<html>403 Forbidden</html>'))).recibo.motivo).toMatch(/no es un PDF/);
    expect(recibir(opciones(raiz, pdf, { paquete: 'HN-001-A99' })).recibo.motivo).toMatch(/paquete desconocido/);
    expect(recibir(opciones(raiz, pdf, { url: 'http://example.invalid/x.pdf' })).recibo.motivo).toMatch(/https/);
  });

  it('escaneo sin texto → INPUT_REJECTED sin inventar texto ni hacer OCR', () => {
    const raiz = nuevaRaiz();
    const { recibo } = recibir(opciones(raiz, escribir(raiz, 'e.pdf', pdfSintetico([['NINEZ ADOLESCENCIA']]))));
    expect(recibo.estado).toBe('INPUT_REJECTED');
    expect(recibo.motivo).toMatch(/texto casi vacío/);
  });
});
