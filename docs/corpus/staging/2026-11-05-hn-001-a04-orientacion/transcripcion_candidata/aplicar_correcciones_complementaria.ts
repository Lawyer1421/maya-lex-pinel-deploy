/**
 * A04: aplica a la v5 (fa47cc72…) las 436 correcciones de la resolución complementaria (04_RESOLUCION_COMPLEMENTARIA_A04.md), firmadas por el
 * CLO el 2026-11-16 sin excepciones (464 casillas), con `aplicarCorrecciones` de tools/corpus/transcripcion-gaceta.ts → v6 definitiva.
 * Se detiene si la base no es la v5, si una corrección no aparece exactamente una vez o si el resultado no es el hash previsto y auditado.
 *
 * Uso (raíz del repo): npx tsx <este archivo> <v5 en bytes LF>
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aplicarCorrecciones, type CorreccionCotejo } from '../../../../../tools/corpus/transcripcion-gaceta';

const SHA_V5 = 'fa47cc72000a34c4dc56acc9af4ee53b32cc359f72202e4cddd56e0ca78c5b0e';
const SHA_V6_PREVISTA = '7c8f40f844cc30f28f7bf6448151e995ed2df88bc3050a6f5b252a39709ce084';
const FIRMA = 'Abg. y Not. Fredy Omar Pinel Flores (propietario_despacho, CLO / Director Maya Lex), 2026-11-16';
const aqui = dirname(fileURLToPath(import.meta.url));
const base = readFileSync(process.argv[2]);
if (createHash('sha256').update(base).digest('hex') !== SHA_V5) throw new Error('la base no es la v5 fa47cc72… (¿bytes CRLF? usar git show)');

const correcciones: CorreccionCotejo[] = JSON.parse(readFileSync(join(aqui, 'correcciones_cotejo_complementaria.json'), 'utf8'))
  .map((c: CorreccionCotejo) => ({ ...c, detectado_por: c.detectado_por.replace(/PENDIENTE de la firma del CLO en/, `firmado por el CLO ${FIRMA} en`) }));
if (correcciones.length !== 436) throw new Error(`se esperaban 436 correcciones y hay ${correcciones.length}`);
const t = aplicarCorrecciones({ texto: base.toString('utf8'), quitadas: [], sha256: SHA_V5 }, correcciones);
if (t.texto.includes('\r')) throw new Error('el texto contiene CR');
if (t.sha256 !== SHA_V6_PREVISTA) throw new Error(`la v6 (${t.sha256}) no es la prevista y auditada (${SHA_V6_PREVISTA})`);

writeFileSync(join(aqui, 'A04_transcripcion_candidata_v6.txt'), t.texto);
writeFileSync(join(aqui, 'A04_transcripcion_candidata_v6_manifiesto.json'), `${JSON.stringify({
  estado: 'TEXTO_DEFINITIVO_PARA_FIRMA_D3',
  advertencia: `v6: v5 + resolución complementaria (464 casillas, G1–G10) firmada por el CLO ${FIRMA}, sin excepciones. Las 15 lagunas [ilegible] se mantienen. Solo la firma D3 del CLO sobre este sha256 lo declara cotejado.`,
  base: { archivo: 'A04_transcripcion_candidata_v5.txt', sha256_lf: SHA_V5 },
  resolucion: { documento: '../04_RESOLUCION_COMPLEMENTARIA_A04.md', tabla: '../RESOLUCION_COMPLEMENTARIA_A04.csv', casillas: 464, correcciones: 436 },
  transcripcion_sha256: t.sha256,
  caracteres: t.texto.length,
  lagunas_ilegible: (t.texto.match(/\[ilegible\]/g) ?? []).length,
  correcciones_de_cotejo: t.aplicadas,
}, null, 2)}\n`);
console.log(`v6: ${t.texto.length} caracteres · sha256 ${t.sha256} · correcciones aplicadas: ${t.aplicadas.length}`);
