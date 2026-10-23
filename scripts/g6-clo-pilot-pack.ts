/**
 * G6-B — genera docs/governance/evidence/g6-clo-pilot-pack.md. Solo escribe ese archivo; no toca red ni base de datos.
 * Uso: npx tsx scripts/g6-clo-pilot-pack.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { generarPaqueteCLO } from '../lib/ai-gateway/canary/clo-pilot-pack';
import { CANDIDATOS_PILOTO } from '../lib/ai-gateway/canary/pilot-candidates';

const destino = path.join(process.cwd(), 'docs', 'governance', 'evidence', 'g6-clo-pilot-pack.md');
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, generarPaqueteCLO(CANDIDATOS_PILOTO));
console.log(`escrito ${path.relative(process.cwd(), destino)}`);
