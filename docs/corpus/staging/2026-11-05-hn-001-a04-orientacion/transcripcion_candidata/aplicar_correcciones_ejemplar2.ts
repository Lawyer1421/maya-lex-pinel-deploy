/**
 * A04: aplica a la v6 firmada (7c8f40f8…) las 18 correcciones del cotejo con el ejemplar 2 (sello CEDIJ, SHA-256 b5db8bf7…a4aad34b9),
 * firmadas por el CLO el 2026-11-18 en 07_HOJA_DECISION_COTEJO_EJEMPLAR2.md (C06 «511», 15 lagunas [ilegible] y B08/B34 «al»), con
 * `aplicarCorrecciones` de tools/corpus/transcripcion-gaceta.ts → v7.
 * Se detiene si la base no es la v6, si una corrección no aparece exactamente una vez, si queda alguna laguna o si el resultado no es el
 * hash previsto. La v6 firmada no se modifica; staging (V4) y producción tampoco.
 *
 * Uso (raíz del repo): npx tsx <este archivo> <v6 en bytes LF>
 *   p. ej. git show HEAD:<ruta>/A04_transcripcion_candidata_v6.txt > /tmp/v6.txt (el checkout de Windows puede tener CRLF).
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aplicarCorrecciones, type CorreccionCotejo } from '../../../../../tools/corpus/transcripcion-gaceta';

const SHA_V6 = '7c8f40f844cc30f28f7bf6448151e995ed2df88bc3050a6f5b252a39709ce084';
const SHA_V7_PREVISTA = '460e493db5e97a9dba53345010281dc338642edee525b6cfbc9fee2f3ddab023';
const SHA_EJEMPLAR_2 = 'b5db8bf75ffba91eb79d0878b275527e5be68511e94915dcf7f8b92a4aad34b9';
const FIRMA = 'Abg. y Not. Fredy Omar Pinel Flores (propietario_despacho, CLO / Director Maya Lex), 2026-11-18';
// Firma D3 de la v7 (2026-11-18), asentada en ADJUDICACION_CLO_D35_2013.md §3. Es el texto de --cotejado-por de la ingesta.
const FIRMA_D3 = 'Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v7 (ADJUDICACION_CLO_D35_2013.md §3)';
const aqui = dirname(fileURLToPath(import.meta.url));
const base = readFileSync(process.argv[2]);
if (createHash('sha256').update(base).digest('hex') !== SHA_V6) throw new Error('la base no es la v6 7c8f40f8… (¿bytes CRLF? usar git show)');

const correcciones: CorreccionCotejo[] = JSON.parse(readFileSync(join(aqui, 'correcciones_cotejo_ejemplar2.json'), 'utf8'));
if (correcciones.length !== 18) throw new Error(`se esperaban 18 correcciones y hay ${correcciones.length}`);
const t = aplicarCorrecciones({ texto: base.toString('utf8'), quitadas: [], sha256: SHA_V6 }, correcciones);
if (t.texto.includes('\r')) throw new Error('el texto contiene CR');
const lagunas = (t.texto.match(/\[ilegible\]/g) ?? []).length;
if (lagunas !== 0) throw new Error(`quedan ${lagunas} lagunas [ilegible]`);
if (t.sha256 !== SHA_V7_PREVISTA) throw new Error(`la v7 (${t.sha256}) no es la prevista (${SHA_V7_PREVISTA})`);

writeFileSync(join(aqui, 'A04_transcripcion_candidata_v7.txt'), t.texto);
writeFileSync(join(aqui, 'A04_transcripcion_candidata_v7_manifiesto.json'), `${JSON.stringify({
  estado: 'TEXTO_DEFINITIVO_FIRMA_D3',
  advertencia: `v7: v6 (firma D3 del 2026-11-16) + 18 correcciones del cotejo con el ejemplar 2, firmadas por el CLO ${FIRMA} en 07_HOJA_DECISION_COTEJO_EJEMPLAR2.md. Cierra la lectura dual de C06 («511») y las 15 lagunas [ilegible]; B08 y B34 pasan a «al». Firma D3 sobre este sha256 el 2026-11-18. Staging (V4) sigue con la v6 hasta que el CLO aplique actualizacion_v7_staging.sql; producción (V4→V5) sin firmar.`,
  firma_d3: { firmante: FIRMA_D3, fecha: '2026-11-18', rol: 'propietario_despacho', sha256_lf: SHA_V7_PREVISTA, registro: '../ADJUDICACION_CLO_D35_2013.md §3' },
  base: { archivo: 'A04_transcripcion_candidata_v6.txt', sha256_lf: SHA_V6 },
  ejemplar_de_cotejo: { registro: '../06_SEGUNDO_EJEMPLAR_REGISTRO.md', sha256: SHA_EJEMPLAR_2, procedencia: 'NO_ACREDITADA', uso: 'COTEJO_VISUAL' },
  resolucion: { documento: '../07_HOJA_DECISION_COTEJO_EJEMPLAR2.md', tabla: '../paquete-revision/cotejo_ejemplar2_borde_derecho_88.csv', puntos: 18, correcciones: 18, firma: FIRMA },
  transcripcion_sha256: t.sha256,
  caracteres: t.texto.length,
  lagunas_ilegible: lagunas,
  correcciones_de_cotejo: t.aplicadas,
}, null, 2)}\n`);
console.log(`v7: ${t.texto.length} caracteres · sha256 ${t.sha256} · correcciones aplicadas: ${t.aplicadas.length} · lagunas: ${lagunas}`);
