/** Genera docs/corpus/LAUNCH_CORE_CORPUS_HN.md y docs/launch/data/launch-core.json. Solo escribe esos dos archivos. Uso: npx tsx scripts/generate-launch-core.ts */
import fs from 'node:fs';
import path from 'node:path';
import { construirLaunchCore, resumirLaunchCore, textoLaunchCore, type FuentesLaunchCore } from '../lib/legal-os/launch/launch-core';

const leer = (...p: string[]) => JSON.parse(fs.readFileSync(path.join(process.cwd(), ...p), 'utf8'));
const fuentes: FuentesLaunchCore = {
  seed: leer('docs', 'launch', 'data', 'corpus-seed.json').records,
  descubrimientoA: leer('docs', 'launch', 'discovery', 'DISCOVERY_A_ABSENT_INSTRUMENTS.json'),
  descubrimientoB: leer('docs', 'launch', 'discovery', 'DISCOVERY_B_PENDING_MATTERS.json').records,
};
const filas = construirLaunchCore(fuentes);
const md = path.join(process.cwd(), 'docs', 'corpus', 'LAUNCH_CORE_CORPUS_HN.md');
const js = path.join(process.cwd(), 'docs', 'launch', 'data', 'launch-core.json');
fs.writeFileSync(md, textoLaunchCore(filas));
fs.writeFileSync(js, `${JSON.stringify({ alcance: 'Tier A', filas, resumen: resumirLaunchCore(filas) }, null, 2)}\n`);
console.log(`escrito ${path.relative(process.cwd(), md)} y ${path.relative(process.cwd(), js)}`);
