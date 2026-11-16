/**
 * A04, paso 5 de la secuencia D3: quita de la v4 la cabecera y el sumario de la pág. 1 de La Gaceta 33,222 como RANGOS DE LÍNEAS DECLARADOS
 * (nunca por patrón) → v5. Cada rango lleva el SHA-256 de su contenido exacto: si la v4 cambia, el script se detiene en lugar de quitar otra cosa.
 * Las líneas vacías que quedan se reducen a una sola, como hace transcribirSinEncabezados. Ambos rangos fueron ratificados por el CLO el 2026-11-16.
 *
 * Uso (raíz del repo): npx tsx <este archivo> <v4 en bytes LF>
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHA_V4 = 'a81d0571536ff5305dc4353b3c0957448453c689a26166856e12b12bad305d6b';
const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
const aqui = dirname(fileURLToPath(import.meta.url));
const base = readFileSync(process.argv[2]);
if (sha(base) !== SHA_V4) throw new Error('la base no es la v4 a81d0571… (¿bytes CRLF? usar git show)');

/** Rangos 1-indexados e inclusivos sobre las líneas de la v4. `sha256` es el del bloque `lineas.join('\n')`. */
const RANGOS = [
  { desde: 1, hasta: 12, motivo: 'Cabecera del Diario Oficial antes del decreto: «DIARIO OFICIAL DE LA REPUBLICA», historia de la imprenta, «E.N.A.G», «AÑO CXXXVi TEGUCIGALPA…», «Sección / Poder Legislativo» y un «*» de ruido del escaneo', sha256: 'b1bbcbb2de0e4bcbaf804b59db678b18ff0869db3cbeb6d9ac8ece09df8c903f' },
  { desde: 43, hasta: 71, motivo: 'Resto de la cabecera y sumario de la edición, intercalados entre «DECRETA: … correspondientes:» y el título previo al art. 1: «DE HONDURAS», historia del Diario Oficial, «DE ARTES GRÁFICAS», fecha y número, «SUMARIO», decretos de la edición, Poder Ejecutivo, «Sección B», «Desprendióle para su comodidad»', sha256: '11b05ca795e6d7d88d4eb5d5548609ae7e4b7b88c88232632418c2aac52780b2' },
];

const lineas = base.toString('utf8').split('\n');
const bloques = RANGOS.map((r) => lineas.slice(r.desde - 1, r.hasta).join('\n'));
RANGOS.forEach((r, k) => {
  if (sha(bloques[k]) !== r.sha256) throw new Error(`el rango ${r.desde}–${r.hasta} no es el declarado (sha ${sha(bloques[k])})`);
});
const fuera = new Set(RANGOS.flatMap((r) => Array.from({ length: r.hasta - r.desde + 1 }, (_, i) => r.desde + i)));
const texto = lineas.filter((_, i) => !fuera.has(i + 1)).join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';

writeFileSync(join(aqui, 'A04_transcripcion_candidata_v5.txt'), texto);
writeFileSync(join(aqui, 'A04_transcripcion_candidata_v5_manifiesto.json'), `${JSON.stringify({
  estado: 'TEXTO_FINAL_PARA_COTEJO_D3',
  advertencia: 'v5: texto fijado (resoluciones firmadas del 2026-11-16), sin encabezados de página ni cabecera/sumario de la pág. 1. Los dos rangos quitados en este paso fueron ratificados expresamente por el CLO (Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho, 2026-11-16). Solo la firma D3 del CLO sobre este sha256 lo declara cotejado.',
  base: { archivo: 'A04_transcripcion_candidata_v4.txt', sha256_lf: SHA_V4 },
  transcripcion_sha256: sha(texto),
  caracteres: texto.length,
  rangos_quitados: RANGOS.map((r, k) => ({ ...r, lineas: lineas.slice(r.desde - 1, r.hasta) })),
}, null, 2)}\n`);
console.log(`v5: ${texto.length} caracteres · sha256 ${sha(texto)} · rangos: ${RANGOS.map((r) => `${r.desde}–${r.hasta} (${r.sha256.slice(0, 12)})`).join(', ')}`);
