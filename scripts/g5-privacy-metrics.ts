/** G5-B — imprime las métricas del benchmark de privacidad (offline). Uso: npx tsx scripts/g5-privacy-metrics.ts */
import { medirPrivacidad } from '../tests/privacy/benchmark-adversarial';
import { GOLDEN_G1 } from '../tests/golden/gateway-g1-casos';

const m = medirPrivacidad(GOLDEN_G1.map((c) => c.input.sanitizedQuestion));
const pct = (n: number) => `${(n * 100).toFixed(2)} %`;
console.log(`requiredRecall           ${pct(m.requiredRecall)}  (${m.requiredTotal} casos exigidos)`);
console.log(`residualMissRate         ${pct(m.residualMissRate)}  (${m.adversarialMissed}/${m.adversarialTotal} adversariales no detectados)`);
console.log(`overallMissRate          ${pct(m.overallMissRate)}  (exigidos + adversariales)`);
console.log(`publicFalsePositiveRate  ${pct(m.publicFalsePositiveRate)}  (${m.publicTotal} consultas públicas)`);
for (const [g, v] of Object.entries(m.residualMissPorGrupo)) console.log(`  ${g.padEnd(36)} ${v.missed}/${v.total}`);
