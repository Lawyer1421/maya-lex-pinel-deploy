/**
 * tools/corpus/transcripcion-gaceta.ts
 * Transcripción CANDIDATA de un acto publicado en La Gaceta, para cotejo humano contra las páginas escaneadas del PDF oficial.
 *
 * Por qué existe (piloto D.284-2013, 15-nov-2026): la copia oficial del TSC es un escaneo cuya capa OCR altera 28 de 39 artículos (art. 38:
 * «5» donde la imagen dice «54»). El CLO aprobó la opción (a) de D3: cargar una transcripción íntegra cotejada contra las páginas del PDF
 * oficial. Esta herramienta solo PREPARA esa transcripción a partir de un texto base y quita los encabezados de página de La Gaceta, que no
 * son texto de la ley y quedan intercalados en los artículos. No corrige palabras, no adivina caracteres y no declara nada cotejado: lo
 * cotejado lo firma una persona, y la ingesta (scripts/ingesta-lote-staging.ts) exige ese hash firmado.
 *
 * Reglas (deterministas): solo se quitan LÍNEAS COMPLETAS que coinciden con un encabezado de esa edición (`La Gaceta`, el rótulo de página
 * `A.`, el número de página, `REPÚBLICA DE HONDURAS - TEGUC…`, `Sección A Acuerdos y Leyes`, `…GALPA, M. D. C., <fecha>` y `No. <número>`).
 * Cada línea quitada queda registrada con su número de línea. Fin de línea normalizado a `\n` (el hash no depende de la plataforma).
 *
 * Uso: npx tsx tools/corpus/transcripcion-gaceta.ts <paquete.json con extracted_text> <fecha «5 DE JUNIO DEL 2014»> <número «33,445»> <salida_dir>
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface LineaQuitada { linea: number; texto: string }
export interface Transcripcion { texto: string; quitadas: LineaQuitada[]; sha256: string }

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Patrones de línea completa de los encabezados de página de una edición concreta de La Gaceta. */
export function patronesEncabezado(fecha: string, numero: string): RegExp[] {
  return [
    /^La (?:Gaceta|Caceta)$/,
    /^A\.$/,
    /^\d{1,3}$/,
    /^REP[ÚU]BLICA DE HONDURAS\s*-\s*TEGUC\w*$/i,
    /^Secci[óo]n A Acuerdos y Le[yv]es$/i,
    // «TEGUCIGALPA» llega cortado por el borde de columna (GALPA, IGALPA, ALPA, LPA…): basta el final «PA, M. D. C., <fecha>».
    new RegExp(`^[A-Z]*PA, M\\. D\\. C\\.?, ${escapar(fecha)}$`, 'i'),
    new RegExp(`^,?No\\. ${escapar(numero)}$`),
  ];
}

export function transcribirSinEncabezados(texto: string, fecha: string, numero: string): Transcripcion {
  const patrones = patronesEncabezado(fecha, numero);
  // El salto de página (\f) separa el número de página del encabezado siguiente: se trata como fin de línea.
  const lineas = texto.replace(/\r\n?/g, '\n').replace(/\f/g, '\n').split('\n');
  const quitadas: LineaQuitada[] = [];
  const quedan: string[] = [];
  lineas.forEach((l, i) => {
    if (patrones.some((p) => p.test(l.trim()))) quitadas.push({ linea: i + 1, texto: l.trim() });
    else quedan.push(l);
  });
  // Las líneas vacías que dejan los encabezados se reducen a una sola (separación de párrafo), sin tocar el texto.
  const limpio = quedan.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  return { texto: limpio, quitadas, sha256: createHash('sha256').update(limpio, 'utf8').digest('hex') };
}

function main(): void {
  const [paquete, fecha, numero, salida] = process.argv.slice(2);
  if (!paquete || !fecha || !numero || !salida) throw new Error('uso: ver cabecera del archivo');
  const pkg = JSON.parse(readFileSync(paquete, 'utf8'));
  if (typeof pkg.extracted_text !== 'string' || !pkg.extracted_text) throw new Error('el paquete no trae extracted_text');
  const t = transcribirSinEncabezados(pkg.extracted_text, fecha, numero);
  mkdirSync(salida, { recursive: true });
  writeFileSync(join(salida, 'transcripcion_candidata.txt'), t.texto);
  writeFileSync(join(salida, 'transcripcion_manifiesto.json'), `${JSON.stringify({
    estado: 'PENDIENTE_COTEJO_CLO',
    advertencia: 'Transcripción CANDIDATA: no está cotejada. Solo una persona la coteja contra las páginas escaneadas del PDF oficial y firma su sha256.',
    texto_base: { paquete, bytes_sha256: pkg.bytes_sha256 ?? null, text_sha256: pkg.text_sha256 ?? null, source_url: pkg.source_url ?? null },
    edicion: { fecha, numero },
    transcripcion_sha256: t.sha256,
    caracteres: t.texto.length,
    lineas_quitadas: t.quitadas,
  }, null, 2)}\n`);
  console.log(`transcripción candidata: ${t.texto.length} caracteres · sha256 ${t.sha256} · encabezados quitados: ${t.quitadas.length}`);
}

if (process.argv[1]?.endsWith('transcripcion-gaceta.ts')) main();
