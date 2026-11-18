/**
 * A04: aplica a la v7 firmada (460e493d…) las 3 correcciones de 08_HOJA_DECISION_V8_ARTS_152_217.md (V8-1 «los(las)» en el art. 152;
 * V8-2 sin «x» y V8-3 «dictado el Ministerio Público.» en el art. 217), firmadas por el CLO el 2026-11-18 junto con V8-4 (se mantiene el
 * párrafo final del art. 217 del ejemplar TSC), con `aplicarCorrecciones` de tools/corpus/transcripcion-gaceta.ts → v8.
 * Se detiene si la base no es la v7, si una corrección no aparece exactamente una vez, si queda alguna laguna o si el resultado no es el
 * hash previsto. La v7 no se modifica.
 *
 * Uso (raíz del repo): npx tsx <este archivo> <v7 en bytes LF>
 *   p. ej. git show HEAD:<ruta>/A04_transcripcion_candidata_v7.txt > /tmp/v7.txt (el checkout de Windows puede tener CRLF).
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aplicarCorrecciones, type CorreccionCotejo } from '../../../../../tools/corpus/transcripcion-gaceta';

const SHA_V7 = '460e493db5e97a9dba53345010281dc338642edee525b6cfbc9fee2f3ddab023';
const SHA_V8_PREVISTA = '6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb';
const FIRMA = 'Abg. y Not. Fredy Omar Pinel Flores (propietario_despacho, CLO / Director Maya Lex), 2026-11-18';
// Firma D3 de la v8 (2026-11-18), asentada en ADJUDICACION_CLO_D35_2013.md §3. Es el texto de --cotejado-por de la ingesta.
const FIRMA_D3 = 'Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v8 (ADJUDICACION_CLO_D35_2013.md §3)';
const aqui = dirname(fileURLToPath(import.meta.url));
const base = readFileSync(process.argv[2]);
if (createHash('sha256').update(base).digest('hex') !== SHA_V7) throw new Error('la base no es la v7 460e493d… (¿bytes CRLF? usar git show)');

const correcciones: CorreccionCotejo[] = JSON.parse(readFileSync(join(aqui, 'correcciones_cotejo_v8.json'), 'utf8'));
if (correcciones.length !== 3) throw new Error(`se esperaban 3 correcciones y hay ${correcciones.length}`);
const t = aplicarCorrecciones({ texto: base.toString('utf8'), quitadas: [], sha256: SHA_V7 }, correcciones);
if (t.texto.includes('\r')) throw new Error('el texto contiene CR');
const lagunas = (t.texto.match(/\[ilegible\]/g) ?? []).length;
if (lagunas !== 0) throw new Error(`quedan ${lagunas} lagunas [ilegible]`);
if (t.sha256 !== SHA_V8_PREVISTA) throw new Error(`la v8 (${t.sha256}) no es la prevista (${SHA_V8_PREVISTA})`);

writeFileSync(join(aqui, 'A04_transcripcion_candidata_v8.txt'), t.texto);
writeFileSync(join(aqui, 'A04_transcripcion_candidata_v8_manifiesto.json'), `${JSON.stringify({
  estado: 'TEXTO_DEFINITIVO_FIRMA_D3',
  advertencia: `v8: v7 (firma D3 del 2026-11-18) + 3 correcciones del cotejo visual de los arts. 152 y 217 (V8-1 a V8-3) y V8-4 (se mantiene el párrafo final del art. 217 del ejemplar TSC; el ejemplar CEDIJ y el consolidado A03 lo omiten), firmadas por el CLO ${FIRMA} en 08_HOJA_DECISION_V8_ARTS_152_217.md. Firma D3 sobre este sha256 el 2026-11-18. Producción (V4→V5) sin firmar.`,
  base: { archivo: 'A04_transcripcion_candidata_v7.txt', sha256_lf: SHA_V7 },
  firma_d3: { firmante: FIRMA_D3, fecha: '2026-11-18', rol: 'propietario_despacho', sha256_lf: SHA_V8_PREVISTA, registro: '../ADJUDICACION_CLO_D35_2013.md §3' },
  resolucion: { documento: '../08_HOJA_DECISION_V8_ARTS_152_217.md', recortes: '../paquete-revision/recortes/v8/', puntos: 4, correcciones: 3, firma: FIRMA },
  transcripcion_sha256: t.sha256,
  caracteres: t.texto.length,
  lagunas_ilegible: lagunas,
  correcciones_de_cotejo: t.aplicadas,
}, null, 2)}\n`);
console.log(`v8: ${t.texto.length} caracteres · sha256 ${t.sha256} · correcciones aplicadas: ${t.aplicadas.length} · lagunas: ${lagunas}`);
