/** G6-D — cobertura de la envolvente del primer canary sobre el Golden Set y sobre todos los conjuntos de privacidad. Offline. */
import { evaluarEnvolvente } from '../lib/ai-gateway/canary/first-canary-envelope';
import { GOLDEN_G1 } from '../tests/golden/gateway-g1-casos';
import { BENCH_PII } from '../tests/privacy/benchmark-privacidad';
import { generarAdversariales } from '../tests/privacy/benchmark-adversarial';
import { HOLDOUT2_PRIVADOS, HOLDOUT3_PRIVADOS, HOLDOUT_PRIVADOS, generarPrivadosG6 } from '../tests/privacy/benchmark-g6';

const privados = [...BENCH_PII.map((c) => c.texto), ...generarAdversariales().map((c) => c.texto), ...generarPrivadosG6().map((c) => c.texto), ...HOLDOUT_PRIVADOS, ...HOLDOUT2_PRIVADOS, ...HOLDOUT3_PRIVADOS];
const aceptados = privados.filter((t) => evaluarEnvolvente(t).elegible);
console.log(`privados evaluados: ${privados.length}; aceptados por la envolvente: ${aceptados.length}`);
console.log('Golden Set (preguntas del gateway):');
for (const c of GOLDEN_G1) {
  const r = evaluarEnvolvente(c.input.sanitizedQuestion);
  console.log(`  ${c.id.padEnd(34)} ${r.elegible ? 'ELEGIBLE' : `no elegible (${r.motivo})`}`);
}
