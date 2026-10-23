/** Regenera docs/launch/CORPUS_GAP_MATRIX_HN.generated.md desde docs/launch/data/corpus-seed.json. Solo lee el seed y escribe ese archivo. Uso: npx tsx scripts/generate-corpus-gap-matrix.ts */
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { InstrumentRecordSchema } from '../lib/legal-os/corpus-factory/schema';
import { generarMatriz, matrizAMarkdown } from '../lib/legal-os/corpus-factory/gap-matrix';

export const SEED = 'docs/launch/data/corpus-seed.json';
export const DESTINO = 'docs/launch/CORPUS_GAP_MATRIX_HN.generated.md';

const raiz = process.cwd();
const seed = z.object({ records: z.array(InstrumentRecordSchema) }).passthrough().parse(JSON.parse(fs.readFileSync(path.join(raiz, SEED), 'utf8')));
fs.writeFileSync(path.join(raiz, DESTINO), matrizAMarkdown(generarMatriz(seed.records), SEED));
console.log(`escrito ${DESTINO} (${seed.records.length} instrumentos)`);
