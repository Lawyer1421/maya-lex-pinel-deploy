/**
 * A04, paso 4 de la secuencia D3: quita los encabezados de página de la v3 con `transcribirSinEncabezados` (tools/corpus/transcripcion-gaceta.ts),
 * con la opción `variantesEspaciadas` → v4. Cada línea quitada queda en el manifiesto con su número de línea en la v3. Además, como hace la
 * herramienta, convierte el salto de página (\f) en fin de línea y reduce a una sola línea vacía las que dejan los encabezados.
 *
 * Uso (raíz del repo): npx tsx <este archivo> <v3 en bytes LF>
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transcribirSinEncabezados } from '../../../../../tools/corpus/transcripcion-gaceta';

const SHA_V3 = '6b2958945d4e3cba8895eeceacf14550f3fb0e7e5ecbed0f3e768c811eca207d';
const aqui = dirname(fileURLToPath(import.meta.url));
const base = readFileSync(process.argv[2]);
if (createHash('sha256').update(base).digest('hex') !== SHA_V3) throw new Error('la base no es la v3 6b295894… (¿bytes CRLF? usar git show)');

const t = transcribirSinEncabezados(base.toString('utf8'), '6 DE SEPTIEMBRE DEL 2013', '33,222', { variantesEspaciadas: true });
writeFileSync(join(aqui, 'A04_transcripcion_candidata_v4.txt'), t.texto);
writeFileSync(join(aqui, 'A04_transcripcion_candidata_v4_manifiesto.json'), `${JSON.stringify({
  estado: 'SIN_ENCABEZADOS_CON_CABECERA_PAG1',
  advertencia: 'v4: la v3 sin encabezados de página. Aún conserva la cabecera y el sumario de la pág. 1 (paso 5).',
  base: { archivo: 'A04_transcripcion_candidata_v3.txt', sha256_lf: SHA_V3 },
  edicion: { fecha: '6 DE SEPTIEMBRE DEL 2013', numero: '33,222' },
  transcripcion_sha256: t.sha256,
  caracteres: t.texto.length,
  lineas_quitadas: t.quitadas,
}, null, 2)}\n`);
console.log(`v4: ${t.texto.length} caracteres · sha256 ${t.sha256} · encabezados quitados: ${t.quitadas.length}`);
