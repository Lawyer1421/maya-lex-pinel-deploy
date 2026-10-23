/** G6-H — genera docs/governance/evidence/g6-cost-authorization.md. Solo escribe ese archivo. Uso: npx tsx scripts/g6-cost-authorization.ts */
import fs from 'node:fs';
import path from 'node:path';
import { documentoCostos } from '../lib/ai-gateway/canary/cost-authorization';

const destino = path.join(process.cwd(), 'docs', 'governance', 'evidence', 'g6-cost-authorization.md');
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, documentoCostos());
console.log(`escrito ${path.relative(process.cwd(), destino)}`);
