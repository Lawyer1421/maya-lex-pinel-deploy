/**
 * A04, paso 3 de la secuencia D3 (03_RESOLUCION_TEXTUAL_A04.md §3): aplica a la v2 (25d7cc59…) las 63 correcciones firmadas por el CLO el
 * 2026-11-16 (correcciones_cotejo_resolucion.json) con `aplicarCorrecciones` de tools/corpus/transcripcion-gaceta.ts → v3.
 * Las 7 letras de la pág. 41 que la v2 ya contenía (P04–P06 y P08–P11) no cambian el texto: se registran en el manifiesto.
 *
 * Uso (raíz del repo): npx tsx <este archivo> <v2 en bytes LF>
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aplicarCorrecciones, type CorreccionCotejo } from '../../../../../tools/corpus/transcripcion-gaceta';

const SHA_V2 = '25d7cc59fe3542df3d0de666eab4a47e217ef5398fe2bae6920f683168f40685';
const aqui = dirname(fileURLToPath(import.meta.url));
const base = readFileSync(process.argv[2]);
if (createHash('sha256').update(base).digest('hex') !== SHA_V2) throw new Error('la base no es la v2 25d7cc59… (¿bytes CRLF? usar git show)');

const correcciones: CorreccionCotejo[] = JSON.parse(readFileSync(join(aqui, 'correcciones_cotejo_resolucion.json'), 'utf8'));
const t = aplicarCorrecciones({ texto: base.toString('utf8'), quitadas: [], sha256: SHA_V2 }, correcciones);
if (t.texto.includes('\r')) throw new Error('el texto contiene CR');

const registroSinCambio = ['P04 «se»', 'P05 «comprendidos(as)»', 'P06 «compañero(a)»', 'P08 «edad»', 'P09 «sus»', 'P10 «los»', 'P11 «verbalmente»'].map((x) => ({
  linea: x, marca: 'LECTURA_POR_CONTEXTO_CLO', nota: 'La letra inicial no se ve en la imagen (pág. 41, borde izquierdo); la v2 ya la contenía. Aprobada por el CLO el 2026-11-16.',
}));

writeFileSync(join(aqui, 'A04_transcripcion_candidata_v3.txt'), t.texto);
writeFileSync(join(aqui, 'A04_transcripcion_candidata_v3_manifiesto.json'), `${JSON.stringify({
  estado: 'TEXTO_RESUELTO_CON_ENCABEZADOS',
  advertencia: 'v3: incorpora las 63 resoluciones firmadas por el CLO el 2026-11-16. Aún conserva los encabezados de página y el sumario de la pág. 1 (pasos 4 y 5).',
  base: { archivo: 'A04_transcripcion_candidata_v2.txt', sha256_lf: SHA_V2 },
  transcripcion_sha256: t.sha256,
  caracteres: t.texto.length,
  correcciones_de_cotejo: t.aplicadas,
  lecturas_por_contexto_sin_cambio_de_texto: registroSinCambio,
}, null, 2)}\n`);
console.log(`v3: ${t.texto.length} caracteres · sha256 ${t.sha256} · correcciones aplicadas: ${t.aplicadas.length}`);
