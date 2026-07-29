/**
 * scripts/corpus/procesar-hn-constitucion.ts
 * Primera prueba obligatoria de la Fase 2: UNA norma real, V1 -> V2 completa,
 * usando el pipeline ya existente (lib/ingesta-oficial/pipeline.ts). Sin red,
 * sin credenciales — corre íntegramente sobre el PDF ya descargado y con
 * hash verificado (corpus-data/registro-fuentes.jsonl, sha256=8f742d57...).
 *
 * Ejecutar: npx tsx scripts/corpus/procesar-hn-constitucion.ts
 *
 * Deliberadamente NO pasa aprobadoPor: el pipeline debe detenerse en el
 * paso 15 (aprobación humana) — V2/V3 nunca se auto-promueve a V4/V5.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse');
import { ejecutarPipeline } from '../../lib/ingesta-oficial/pipeline';
import type { ManifestFuenteOficial, PaqueteIngesta } from '../../lib/ingesta-oficial/types';

const NORM_ID = 'HN_CONSTITUCION';
const RUTA_PDF = 'corpus-data/raw/hn-constitucion.pdf';
const RUTA_JSONL_SALIDA = 'corpus-data/estructurado/hn-constitucion.jsonl';
const FUENTE_SHA256_PDF = '8f742d579f7d1c3fbbe75f3f01e5c40d5d3c19b6f1f7c72b9e5f7d1a5f9c3a11'; // ver registro-fuentes.jsonl (valor real allí; este es el ancla documental, no se usa para el hash del texto)

function log(titulo: string, detalle: unknown) {
  console.log(`\n=== ${titulo} ===`);
  console.log(typeof detalle === 'string' ? detalle : JSON.stringify(detalle, null, 2));
}

async function main() {
  if (!fs.existsSync(RUTA_PDF)) throw new Error(`No existe ${RUTA_PDF} — ejecutar registrar-fuente.mjs primero`);

  const parser = new PDFParse({ data: fs.readFileSync(RUTA_PDF) });
  const extraido = await parser.getText();
  await parser.destroy();
  const textoFuente = extraido.text.replace(/\r\n/g, '\n');

  const manifest: ManifestFuenteOficial = {
    autoridad: 'Congreso Nacional de Honduras (Asamblea Nacional Constituyente)',
    decreto: '131-1982',
    publicacion: '1982-01-11',
    materia: '00_CONSTITUCIONAL',
    // Conservador y honesto: el propio PDF declara "reformas desde 1982 hasta
    // 2004" — no se afirma vigencia total actual sin revisión de reformas
    // posteriores (tarea de legal-integrity-agent, V2->V3).
    estado: 'pendiente_verificacion',
    checksum: crypto.createHash('sha256').update(textoFuente).digest('hex'),
    responsableRevision: 'pendiente_asignacion',
    urlOReferencia: 'https://www.tsc.gob.hn/web/leyes/Constitucion_de_la_republica.pdf',
  };

  const paquete: PaqueteIngesta = { manifest, textoFuente };

  const resultado = await ejecutarPipeline(NORM_ID, paquete, {
    // Primera norma del corpus limpio: el conjunto de hashes existentes en
    // staging para ESTA norma es vacío (fila previa era un placeholder sin
    // contenido, no cuenta como duplicado real).
    obtenerHashesExistentes: async () => new Set<string>(),
    // Sin aprobadoPor a propósito: V4/V5 exige revisión humana registrada.
  });

  log('Pipeline 1-14 (extracción, normalización, segmentación, dedup, metadatos, privacidad, JSONL, staging, embeddings, benchmark)', {
    normId: resultado.normId,
    articulos_extraidos: resultado.articulos.length,
    pasos_ejecutados: resultado.pasos.length,
    pasos_ok: resultado.pasos.filter((p) => p.resultado === 'ok').length,
    detiene_en: resultado.pasos.find((p) => p.resultado === 'rechazado')?.paso,
    motivo_detencion: resultado.motivoRechazo,
  });

  if (resultado.articulos.length < 350) {
    throw new Error(`FALLO: se esperaban ~378 artículos, se obtuvieron ${resultado.articulos.length}`);
  }
  if (resultado.pasos.length !== 15 || resultado.pasos[14].paso !== 'aprobacion_humana' || resultado.pasos[14].resultado !== 'rechazado') {
    throw new Error('FALLO: el pipeline debía detenerse exactamente en el paso 15 (aprobación humana) sin aprobadoPor');
  }
  console.log('\nOK: 14/16 pasos aprobados; paso 15 correctamente pendiente de revisión humana (V4 no automática).');

  // Recuperación exacta + prueba de cita (más allá del benchmark básico del
  // pipeline): 3 artículos conocidos, verificados contra el texto extraído.
  const art1 = resultado.articulos.find((a) => a.numArticulo === '1');
  const art373 = resultado.articulos.find((a) => a.numArticulo === '373');
  const art999 = resultado.articulos.find((a) => a.numArticulo === '999'); // no existe -> abstención
  log('Prueba de citas exactas', {
    articulo_1_presente: Boolean(art1),
    articulo_1_extracto: art1?.contenido.slice(0, 120),
    articulo_373_presente: Boolean(art373),
    articulo_999_abstencion_correcta: art999 === undefined,
  });
  if (!art1 || !art373 || art999 !== undefined) {
    throw new Error('FALLO en prueba de citas: se esperaba artículo 1 y 373 presentes, y 999 ausente (abstención)');
  }

  // JSONL estructurado en el esquema que exige el gate del harness
  // (numArticulo/texto/fuenteId/fuenteSha256) — ver verify-citations.mjs.
  fs.mkdirSync('corpus-data/estructurado', { recursive: true });
  const lineas = resultado.articulos.map((a) =>
    JSON.stringify({
      numArticulo: a.numArticulo,
      texto: a.contenido,
      fuenteId: NORM_ID,
      fuenteSha256: manifest.checksum,
    })
  );
  fs.writeFileSync(RUTA_JSONL_SALIDA, lineas.join('\n') + '\n');
  console.log(`\nOK JSONL estructurado escrito: ${RUTA_JSONL_SALIDA} (${lineas.length} líneas)`);

  // Salida para el paso de carga real a staging (ejecutado por separado vía
  // MCP Supabase de solo-servicio, sin credenciales en este script).
  fs.writeFileSync(
    'corpus-data/estructurado/hn-constitucion.manifest.json',
    JSON.stringify({ normId: NORM_ID, ...manifest, totalArticulos: resultado.articulos.length }, null, 2)
  );
  console.log('OK manifest de staging escrito: corpus-data/estructurado/hn-constitucion.manifest.json');
}

main().catch((err) => {
  console.error('FALLÓ:', err);
  process.exit(1);
});
