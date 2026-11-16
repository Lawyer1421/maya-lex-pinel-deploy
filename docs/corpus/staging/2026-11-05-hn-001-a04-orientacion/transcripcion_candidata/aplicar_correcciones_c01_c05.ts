/**
 * A04: aplica las correcciones de cotejo firmadas (C01–C05) a la transcripción candidata 977f0489… con `aplicarCorrecciones` de
 * tools/corpus/transcripcion-gaceta.ts (cada `buscar` debe aparecer exactamente una vez; si no, se detiene).
 *
 * No usa el `main` de esa herramienta porque este no parte del `extracted_text` de un paquete y quitaría los encabezados. Aquí la base es la
 * candidata de reconstrucción geométrica, y solo cambian las palabras firmadas. Los encabezados se quitan en un paso aparte.
 *
 * Uso (raíz del repo):
 *   git show <commit>:docs/corpus/staging/2026-11-05-hn-001-a04-orientacion/transcripcion_candidata/A04_transcripcion_candidata.txt > base_lf.txt
 *   npx tsx docs/corpus/staging/2026-11-05-hn-001-a04-orientacion/transcripcion_candidata/aplicar_correcciones_c01_c05.ts base_lf.txt
 * Escribe A04_transcripcion_candidata_v2.txt (bytes LF) y su manifiesto en la misma carpeta.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aplicarCorrecciones, type CorreccionCotejo } from '../../../../../tools/corpus/transcripcion-gaceta';

const BASE_SHA = '977f0489225d5cdf058f852b43b0f8af87b5db30f3128828386fcd2c17066355';
const aqui = dirname(fileURLToPath(import.meta.url));

const base = readFileSync(process.argv[2]);
const sha = createHash('sha256').update(base).digest('hex');
if (sha !== BASE_SHA) throw new Error(`la base no es 977f0489… (es ${sha}); ¿bytes CRLF? usar git show`);
const correcciones: CorreccionCotejo[] = JSON.parse(readFileSync(join(aqui, 'correcciones_cotejo_c01_c05.json'), 'utf8'));
const t = aplicarCorrecciones({ texto: base.toString('utf8'), quitadas: [], sha256: BASE_SHA }, correcciones);
if (t.texto.includes('\r')) throw new Error('el texto corregido contiene CR');

writeFileSync(join(aqui, 'A04_transcripcion_candidata_v2.txt'), t.texto);
writeFileSync(join(aqui, 'A04_transcripcion_candidata_v2_manifiesto.json'), `${JSON.stringify({
  estado: 'PENDIENTE_COTEJO_CLO',
  advertencia: 'Transcripción CANDIDATA v2: incorpora solo las correcciones firmadas C01–C05. No está cotejada en su conjunto: el CLO la coteja contra las 46 páginas y firma su sha256 (D3).',
  base: { archivo: 'A04_transcripcion_candidata.txt', sha256_lf: BASE_SHA },
  pdf: { fuente: 'https://www.tsc.gob.hn/web/leyes/Codigo_niñezyadolescencia_2013.pdf', bytes_sha256: 'fbd87f3396e5d0b6601a246008a1ae5bd870841b795d75ac42076245a154f2ff' },
  transcripcion_sha256: t.sha256,
  caracteres: t.texto.length,
  correcciones_de_cotejo: t.aplicadas,
  pendiente: [
    'C06: lectura dual «11» (lista) / «511» (rótulo): no se modifica',
    'Pág. 41: 11 líneas con el carácter inicial ausente (ILEGIBLE_EN_ESTE_EJEMPLAR)',
    'Borde derecho: 43 parciales y 12 ilegibles parciales (2 de los 88 están fuera del acto, en la pág. 46, columna derecha)',
    'Encabezados de página aún dentro del texto: se quitan en un paso aparte antes de la firma D3',
  ],
}, null, 2)}\n`);
console.log(`v2: ${t.texto.length} caracteres · sha256 ${t.sha256} · correcciones aplicadas: ${t.aplicadas.length}`);
