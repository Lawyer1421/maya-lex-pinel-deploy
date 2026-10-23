/** Genera docs/launch/LAUNCH_SCORECARD.md y .json. Solo escribe esos dos archivos. Uso: npx tsx scripts/generate-launch-scorecard.ts */
import fs from 'node:fs';
import path from 'node:path';
import { construirLaunchCore, type FuentesLaunchCore } from '../lib/legal-os/launch/launch-core';
import { construirScorecard, textoScorecard } from '../lib/legal-os/launch/scorecard';

const leer = (...p: string[]) => JSON.parse(fs.readFileSync(path.join(process.cwd(), ...p), 'utf8'));
const fuentes: FuentesLaunchCore = {
  seed: leer('docs', 'launch', 'data', 'corpus-seed.json').records,
  descubrimientoA: leer('docs', 'launch', 'discovery', 'DISCOVERY_A_ABSENT_INSTRUMENTS.json'),
  descubrimientoB: leer('docs', 'launch', 'discovery', 'DISCOVERY_B_PENDING_MATTERS.json').records,
};

(async () => {
  const s = await construirScorecard(construirLaunchCore(fuentes));
  fs.writeFileSync(path.join(process.cwd(), 'docs', 'launch', 'LAUNCH_SCORECARD.md'), textoScorecard(s));
  fs.writeFileSync(path.join(process.cwd(), 'docs', 'launch', 'LAUNCH_SCORECARD.json'), `${JSON.stringify(s, null, 2)}\n`);
  console.log(`escrito docs/launch/LAUNCH_SCORECARD.{md,json}; incumplimientos: ${s.incumplimientos.length}`);
})();
