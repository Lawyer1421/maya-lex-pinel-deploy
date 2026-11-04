import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { constaEnTexto, identidadFaltante, normalizar, recibir, sha256, PERFILES } from '../tools/corpus/receive-pdf';

const hayPoppler = (() => {
  try { execFileSync('pdftotext', ['-v'], { stdio: 'ignore' }); execFileSync('pdfinfo', ['-v'], { stdio: 'ignore' }); return true; } catch { return false; }
})();

/** PDF mínimo de una página con texto, con tabla xref correcta. Contenido SINTÉTICO para pruebas. */
function pdfSintetico(lineas: string[]): Buffer {
  const flujo = `BT /F1 10 Tf 12 TL 40 760 Td ${lineas.map((l) => `(${l.replace(/[()\\]/g, '')}) Tj T*`).join(' ')} ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${flujo.length} >>\nstream\n${flujo}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((x) => `${String(x).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

const LINEAS_NINEZ = [
  'CODIGO DE LA NINEZ Y DE LA ADOLESCENCIA - TEXTO SINTETICO DE PRUEBA, NO ES UNA LEY REAL',
  'ARTICULO 1.- Este documento es ficticio y existe solo para probar el procedimiento de recepcion de PDF.',
  'ARTICULO 2.- Segundo articulo sintetico con texto suficiente para que la extraccion supere el minimo de caracteres.',
  'ARTICULO 3.- Tercer articulo sintetico con mas texto de relleno para el control de calidad de la segmentacion.',
  'ARTICULO 4.- Cuarto articulo sintetico; la adolescencia y la ninez aparecen aqui para confirmar la identidad.',
  'ARTICULO 5.- Quinto articulo sintetico. Fin del documento de prueba, sin valor juridico alguno de ninguna clase.',
];

function opciones(raiz: string, archivo: string, paquete = 'HN-001-A03') {
  return {
    archivo, paquete, url: 'https://example.invalid/sintetico/ninez.pdf', retriever: 'test', fecha: '2026-11-01T12:00:00Z',
    metodo: 'MANUAL_BROWSER' as const, lote: 'lote-prueba', raiz,
  };
}

describe('receive-pdf: funciones puras', () => {
  it('normaliza sin tildes ni mayúsculas y comprueba la identidad', () => {
    expect(normalizar('  CÓDIGO   de la NIÑEZ ')).toBe('codigo de la ninez');
    expect(identidadFaltante('Código de la Niñez y de la Adolescencia', ['ninez', 'adolescencia'])).toEqual([]);
    expect(identidadFaltante('Código Penal', ['ninez'])).toEqual(['ninez']);
  });
  it('decreto y Gaceta solo constan si están en el texto (tolera 33,445 y 33445)', () => {
    expect(constaEnTexto('La Gaceta No. 33,445 del 5 de junio', '33,445')).toBe(true);
    expect(constaEnTexto('La Gaceta 33445', '33,445')).toBe(true);
    expect(constaEnTexto('La Gaceta 28,053', '33,445')).toBe(false);
  });
  it('sha256 coincide con el valor conocido', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('los cuatro perfiles del Tramo A existen y priorizan lo declarado', () => {
    expect(Object.keys(PERFILES).sort()).toEqual(['HN-001-A01', 'HN-001-A02', 'HN-001-A03', 'HN-001-A04']);
    expect(PERFILES['HN-001-A01'].paginasEsperadas).toBe(419);
    expect(PERFILES['HN-001-A02'].paginasEsperadas).toBe(17);
  });
});

describe.skipIf(!hayPoppler)('receive-pdf: recepción de un archivo (requiere poppler-utils)', () => {
  it('acepta un PDF íntegro: hash real, texto, identidad, paquete y receptor offline', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'rcv-'));
    const pdf = pdfSintetico(LINEAS_NINEZ);
    const archivo = join(raiz, 'ninez.pdf');
    writeFileSync(archivo, pdf);
    const { recibo, codigo } = recibir(opciones(raiz, archivo));
    expect(recibo.motivo).toBeNull();
    expect(codigo).toBe(0);
    expect(recibo.estado).toBe('ACEPTADO');
    expect(recibo.bytes_sha256).toBe(sha256(pdf));
    expect(recibo.paginas).toBe(1);
    const paquete = JSON.parse(readFileSync(join(raiz, 'docs/corpus/inbox/lote-prueba/HN-001-A03.json'), 'utf8'));
    expect(paquete.text_sha256).toBe(sha256(paquete.extracted_text));
    expect(paquete.bytes_sha256).toBe(sha256(pdf));
    expect(paquete.verification_state).toBe('UNVERIFIED');
    expect(paquete.source_tier).toBeNull();
    expect(paquete.decree).toBe('UNKNOWN'); // 73-96 no consta en el texto sintético: no se infiere
    expect(existsSync(join(raiz, 'docs/corpus/staging/lote-prueba/records.json'))).toBe(true);
    expect(existsSync(join(raiz, 'docs/corpus/staging/lote-prueba/receipts/HN-001-A03.md'))).toBe(true);
  });
  it('se detiene si el archivo no es un PDF (p. ej. una página HTML guardada)', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'rcv-'));
    const archivo = join(raiz, 'falso.pdf');
    writeFileSync(archivo, '<html><body>403 Forbidden</body></html>');
    const { recibo, codigo } = recibir(opciones(raiz, archivo));
    expect(codigo).toBe(1);
    expect(recibo.estado).toBe('DETENIDO');
    expect(recibo.motivo).toMatch(/no es un PDF/);
    expect(existsSync(join(raiz, 'docs/corpus/inbox/lote-prueba/HN-001-A03.json'))).toBe(false);
  });
  it('se detiene si el número de páginas difiere del esperado', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'rcv-'));
    const archivo = join(raiz, 'comercio.pdf');
    writeFileSync(archivo, pdfSintetico(LINEAS_NINEZ));
    const { recibo, codigo } = recibir(opciones(raiz, archivo, 'HN-001-A01'));
    expect(codigo).toBe(1);
    expect(recibo.motivo).toMatch(/páginas 1 ≠ esperadas 419/);
  });
  it('se detiene si la identidad no consta en el texto', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'rcv-'));
    const archivo = join(raiz, 'otro.pdf');
    writeFileSync(archivo, pdfSintetico(LINEAS_NINEZ.map((l) => l.replace(/NINEZ|ninez/g, 'XXXX'))));
    const { recibo } = recibir(opciones(raiz, archivo));
    expect(recibo.estado).toBe('DETENIDO');
    expect(recibo.motivo).toMatch(/identidad no confirmada/);
  });
  it('se detiene con texto casi vacío (PDF escaneado) sin inventar texto', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'rcv-'));
    const archivo = join(raiz, 'escaneado.pdf');
    writeFileSync(archivo, pdfSintetico(['NINEZ ADOLESCENCIA']));
    const { recibo } = recibir(opciones(raiz, archivo));
    expect(recibo.estado).toBe('DETENIDO');
    expect(recibo.motivo).toMatch(/texto casi vacío/);
  });
  it('rechaza un paquete desconocido y una URL no https', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'rcv-'));
    const archivo = join(raiz, 'x.pdf');
    writeFileSync(archivo, pdfSintetico(LINEAS_NINEZ));
    expect(recibir(opciones(raiz, archivo, 'HN-001-A99')).recibo.motivo).toMatch(/paquete desconocido/);
    expect(recibir({ ...opciones(raiz, archivo), url: 'http://example.invalid/x.pdf' }).recibo.motivo).toMatch(/https/);
  });
});
