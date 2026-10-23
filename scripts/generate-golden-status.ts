/** Genera docs/launch/GOLDEN_SETS_STATUS.md. Uso: npx tsx scripts/generate-golden-status.ts. Solo escribe ese archivo. */
import fs from 'node:fs';
import path from 'node:path';
import { textoEstadoGolden } from '../lib/legal-os/evaluation/golden';

const destino = path.join(process.cwd(), 'docs', 'launch', 'GOLDEN_SETS_STATUS.md');
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, textoEstadoGolden());
console.log(`escrito ${path.relative(process.cwd(), destino)}`);
