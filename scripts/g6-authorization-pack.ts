/** G6-I — genera docs/governance/evidence/g6-authorization-pack.{md,json}. Solo escribe esos dos archivos. Uso: npx tsx scripts/g6-authorization-pack.ts [--as-of AAAA-MM-DD] */
import fs from 'node:fs';
import path from 'node:path';
import { construirPaquete, textoPaquete } from '../lib/ai-gateway/canary/authorization-pack';

const i = process.argv.indexOf('--as-of');
const ahora = i >= 0 ? new Date(`${process.argv[i + 1]}T12:00:00Z`) : new Date();
const p = construirPaquete({ ahora });
const dir = path.join(process.cwd(), 'docs', 'governance', 'evidence');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'g6-authorization-pack.md'), textoPaquete(p));
fs.writeFileSync(path.join(dir, 'g6-authorization-pack.json'), `${JSON.stringify(p, null, 2)}\n`);
console.log(`${p.decision}: ${p.condiciones.filter((x) => x.estado === 'MET').length}/${p.condiciones.length} MET`);
for (const b of p.bloqueos) console.log(`  BLOQUEO ${b.id} (${b.responsable})`);
