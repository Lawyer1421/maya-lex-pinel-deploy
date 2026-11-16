/**
 * tools/corpus/transcripcion-gaceta.ts
 * Transcripción CANDIDATA de un acto publicado en La Gaceta, para cotejo humano contra las páginas escaneadas del PDF oficial.
 *
 * Por qué existe (piloto D.284-2013, 15-nov-2026): la copia oficial del TSC es un escaneo cuya capa OCR altera 28 de 39 artículos (art. 38:
 * «5» donde la imagen dice «54»). El CLO aprobó la opción (a) de D3: cargar una transcripción íntegra cotejada contra las páginas del PDF
 * oficial. Esta herramienta solo PREPARA esa transcripción a partir de un texto base y quita los encabezados de página de La Gaceta, que no
 * son texto de la ley y quedan intercalados en los artículos. Por sí sola no corrige palabras ni adivina caracteres: solo aplica las correcciones
 * de cotejo que una persona registró contra la imagen (ver CorreccionCotejo). No declara nada cotejado: lo cotejado lo firma una persona, y la
 * ingesta (scripts/ingesta-lote-staging.ts) exige ese hash firmado.
 *
 * Límite conocido: la extracción de texto elimina el guion al final de un renglón impreso al unir los renglones («No. 143-» / «2010» →
 * «1432010»). Una división silábica queda bien unida, pero un guion real (número-año, palabras compuestas) se pierde: eso solo lo detecta el
 * cotejo contra la imagen o las palabras del OCR que terminan en guion.
 *
 * Reglas (deterministas): solo se quitan LÍNEAS COMPLETAS que coinciden con un encabezado de esa edición (`La Gaceta`, el rótulo de página
 * `A.`, el número de página, `REPÚBLICA DE HONDURAS - TEGUC…`, `Sección A Acuerdos y Leyes`, `…GALPA, M. D. C., <fecha>` y `No. <número>`).
 * Cada línea quitada queda registrada con su número de línea. Fin de línea normalizado a `\n` (el hash no depende de la plataforma).
 *
 * Correcciones de cotejo (opcional): un JSON con la lista de CorreccionCotejo que una persona detectó contra la imagen. Es la ÚNICA vía para
 * cambiar una palabra del texto base; cada una se aplica solo si su texto aparece exactamente una vez y queda en el manifiesto.
 *
 * Uso: npx tsx tools/corpus/transcripcion-gaceta.ts <paquete.json con extracted_text> <fecha «5 DE JUNIO DEL 2014»> <número «33,445»> <salida_dir> [correcciones.json]
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

/**
 * Corrección de cotejo: una persona comparó la transcripción con la IMAGEN de la página y encontró que el texto base (la capa de texto del
 * PDF) no dice lo que está impreso. Es la única vía para cambiar una palabra: explícita, con su página y su autor, y registrada en el manifiesto.
 */
export interface CorreccionCotejo {
  articulo: string;
  pagina_pdf: number;
  buscar: string;
  reemplazar: string;
  motivo: string;
  detectado_por: string;
}

/** Aplica las correcciones: cada `buscar` debe aparecer EXACTAMENTE una vez (si no, la corrección es ambigua o ya no aplica y se detiene). */
export function aplicarCorrecciones(t: Transcripcion, correcciones: readonly CorreccionCotejo[]): Transcripcion & { aplicadas: (CorreccionCotejo & { linea: number })[] } {
  let texto = t.texto;
  const aplicadas: (CorreccionCotejo & { linea: number })[] = [];
  for (const c of correcciones) {
    if (!c.buscar || c.buscar === c.reemplazar || !c.motivo || !c.detectado_por || !(c.pagina_pdf > 0)) {
      throw new Error(`corrección incompleta para el art. ${c.articulo}: buscar, reemplazar distinto, motivo, detectado_por y pagina_pdf son obligatorios`);
    }
    const veces = texto.split(c.buscar).length - 1;
    if (veces !== 1) throw new Error(`la corrección del art. ${c.articulo} («${c.buscar}») aparece ${veces} veces: debe aparecer exactamente una`);
    const pos = texto.indexOf(c.buscar);
    aplicadas.push({ ...c, linea: texto.slice(0, pos).split('\n').length });
    texto = texto.slice(0, pos) + c.reemplazar + texto.slice(pos + c.buscar.length);
  }
  return { texto, quitadas: t.quitadas, aplicadas, sha256: createHash('sha256').update(texto, 'utf8').digest('hex') };
}

function main(): void {
  const [paquete, fecha, numero, salida, rutaCorrecciones] = process.argv.slice(2);
  if (!paquete || !fecha || !numero || !salida) throw new Error('uso: ver cabecera del archivo');
  const pkg = JSON.parse(readFileSync(paquete, 'utf8'));
  if (typeof pkg.extracted_text !== 'string' || !pkg.extracted_text) throw new Error('el paquete no trae extracted_text');
  const correcciones: CorreccionCotejo[] = rutaCorrecciones ? JSON.parse(readFileSync(rutaCorrecciones, 'utf8')) : [];
  const t = aplicarCorrecciones(transcribirSinEncabezados(pkg.extracted_text, fecha, numero), correcciones);
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
    correcciones_de_cotejo: t.aplicadas,
  }, null, 2)}\n`);
  console.log(`transcripción candidata: ${t.texto.length} caracteres · sha256 ${t.sha256} · encabezados quitados: ${t.quitadas.length} · correcciones de cotejo: ${t.aplicadas.length}`);
}

if (process.argv[1]?.endsWith('transcripcion-gaceta.ts')) main();
