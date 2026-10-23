/** G6-C — imprime las métricas de privacidad de la ronda 2 (offline). Uso: npx tsx scripts/g6-privacy-metrics.ts [--misses] */
import { medirG6 } from '../tests/privacy/benchmark-g6';
import { GOLDEN_G1 } from '../tests/golden/gateway-g1-casos';

const m = medirG6(GOLDEN_G1.map((c) => c.input.sanitizedQuestion));
const pct = (n: number) => `${(n * 100).toFixed(2)} %`;
console.log(`requiredRecall                      ${pct(m.requiredRecall)}  (${m.requiredTotal} casos exigidos; NO es «privacy recall»)`);
console.log(`residualMissRate                    ${pct(m.residualMissRate)}  (${m.adversarialMissed}/${m.adversarialTotal} adversariales no detectados)`);
console.log(`overallMissRate                     ${pct(m.overallMissRate)}  (${m.privateMissed}/${m.privateTotal} privados no detectados)`);
console.log(`publicFalsePositiveRate             ${pct(m.publicFalsePositiveRate)}  (${m.publicPlainRejected}/${m.publicPlainTotal} consultas públicas sin nombres)`);
console.log(`privateDocumentRecall               ${pct(m.privateDocumentRecall)}  (${m.privateDocumentTotal} documentos privados disfrazados)`);
console.log(`publicNamedEntityFalsePositiveRate  ${pct(m.publicNamedEntityFalsePositiveRate)}  (${m.publicNamedRejected}/${m.publicNamedTotal} consultas públicas con nombres/entidades)`);
console.log('\nNo detectados por grupo (privados, ronda 2):');
for (const [g, v] of Object.entries(m.missPorGrupo)) if (v.missed) console.log(`  ${g.padEnd(30)} ${v.missed}/${v.total}`);
console.log('\nFalsos positivos con nombres públicos por subtipo:');
for (const [g, v] of Object.entries(m.fpPorSubtipo)) console.log(`  ${g.padEnd(30)} ${v.rejected}/${v.total}`);
if (process.argv.includes('--misses')) {
  console.log('\nPRIVADOS NO DETECTADOS:\n' + m.perdidos.join('\n'));
  console.log('\nPÚBLICOS RECHAZADOS:\n' + m.publicosRechazados.join('\n'));
}

import { medirHoldout } from '../tests/privacy/benchmark-g6';
const h = medirHoldout();
console.log('\n── HOLDOUT (no usado para ajustar el gate) ──');
console.log(`holdoutPrivateMissRate              ${pct(h.holdoutPrivateMissRate)}  (${h.holdoutPrivateTotal} privados)`);
console.log(`holdoutPublicFalsePositiveRate      ${pct(h.holdoutPublicFalsePositiveRate)}  (${h.holdoutPublicTotal} públicas sin nombres)`);
console.log(`holdoutPublicNamedFalsePositiveRate ${pct(h.holdoutPublicNamedFalsePositiveRate)}  (${h.holdoutNamedTotal} públicas con entidades)`);
if (process.argv.includes('--misses')) {
  console.log('\nHOLDOUT PRIVADOS NO DETECTADOS:\n' + h.privadosPerdidos.join('\n'));
  console.log('\nHOLDOUT PÚBLICOS RECHAZADOS:\n' + h.publicosRechazados.join('\n'));
}

import { medirHoldout2 } from '../tests/privacy/benchmark-g6';
const h2 = medirHoldout2();
console.log('\n── HOLDOUT 2 (fresco y hostil; estimación honesta de generalización) ──');
console.log(`holdout2PrivateMissRate             ${pct(h2.holdout2PrivateMissRate)}  (${h2.holdout2PrivateTotal} privados)`);
console.log(`holdout2PublicFalsePositiveRate     ${pct(h2.holdout2PublicFalsePositiveRate)}  (${h2.holdout2PublicTotal} públicas sin nombres)`);
console.log(`holdout2NamedFalsePositiveRate      ${pct(h2.holdout2NamedFalsePositiveRate)}  (${h2.holdout2NamedTotal} públicas con entidades)`);
if (process.argv.includes('--misses')) {
  console.log('\nHOLDOUT2 PRIVADOS NO DETECTADOS:\n' + h2.privadosPerdidos.join('\n'));
  console.log('\nHOLDOUT2 PÚBLICOS RECHAZADOS:\n' + h2.publicosRechazados.join('\n'));
}

import { medirHoldout3 } from '../tests/privacy/benchmark-g6';
const h3 = medirHoldout3();
console.log('\n── HOLDOUT 3 (final; el gate NO se ajustó contra él) ──');
console.log(`holdout3PrivateMissRate             ${pct(h3.holdout3PrivateMissRate)}  (${h3.holdout3PrivateMissed}/${h3.holdout3PrivateTotal} privados)`);
console.log(`holdout3PublicFalsePositiveRate     ${pct(h3.holdout3PublicFalsePositiveRate)}  (${h3.holdout3PublicRejected}/${h3.holdout3PublicTotal} públicas sin nombres)`);
console.log(`holdout3NamedFalsePositiveRate      ${pct(h3.holdout3NamedFalsePositiveRate)}  (${h3.holdout3NamedRejected}/${h3.holdout3NamedTotal} públicas con entidades)`);
if (process.argv.includes('--misses')) {
  console.log('\nHOLDOUT3 PRIVADOS NO DETECTADOS:\n' + h3.privadosPerdidos.join('\n'));
  console.log('\nHOLDOUT3 PÚBLICOS RECHAZADOS:\n' + h3.publicosRechazados.join('\n'));
}

import fs from 'node:fs';
import path from 'node:path';
import { ARCHIVOS_PRIVACIDAD, hashArchivos } from '../lib/ai-gateway/canary/evidence-integrity';
import { evaluarEnvolvente } from '../lib/ai-gateway/canary/first-canary-envelope';
import { BENCH_PII } from '../tests/privacy/benchmark-privacidad';
import { generarAdversariales } from '../tests/privacy/benchmark-adversarial';
import { HOLDOUT2_PRIVADOS, HOLDOUT3_PRIVADOS, HOLDOUT_PRIVADOS, generarPrivadosG6 } from '../tests/privacy/benchmark-g6';

if (process.argv.includes('--write-json')) {
  const privados = [...BENCH_PII.map((c) => c.texto), ...generarAdversariales().map((c) => c.texto), ...generarPrivadosG6().map((c) => c.texto), ...HOLDOUT_PRIVADOS, ...HOLDOUT2_PRIVADOS, ...HOLDOUT3_PRIVADOS];
  const r4 = (n: number) => Math.round(n * 10_000) / 10_000;
  const evidencia = {
    nota: 'requiredRecall mide solo los formatos canónicos exigidos: NO es un recall de privacidad. El riesgo residual real está en el holdout 3 (el gate no se ajustó contra él).',
    metricas: {
      requiredRecall: r4(m.requiredRecall), requiredTotal: m.requiredTotal,
      residualMissRate: r4(m.residualMissRate), adversarialTotal: m.adversarialTotal,
      overallMissRate: r4(m.overallMissRate), privateTotal: m.privateTotal,
      publicFalsePositiveRate: r4(m.publicFalsePositiveRate), publicPlainTotal: m.publicPlainTotal,
      privateDocumentRecall: r4(m.privateDocumentRecall), privateDocumentTotal: m.privateDocumentTotal,
      publicNamedEntityFalsePositiveRate: r4(m.publicNamedEntityFalsePositiveRate), publicNamedTotal: m.publicNamedTotal,
    },
    holdouts: {
      holdout1_inspeccionado: { privateMissRate: r4(h.holdoutPrivateMissRate), total: h.holdoutPrivateTotal },
      holdout2_inspeccionado: { privateMissRate: r4(h2.holdout2PrivateMissRate), total: h2.holdout2PrivateTotal },
      holdout3_final_sin_ajuste: {
        privateMissRate: r4(h3.holdout3PrivateMissRate), privateMissed: h3.holdout3PrivateMissed, privateTotal: h3.holdout3PrivateTotal,
        publicFalsePositiveRate: r4(h3.holdout3PublicFalsePositiveRate), namedFalsePositiveRate: r4(h3.holdout3NamedFalsePositiveRate),
      },
    },
    envolventePrimerCanary: {
      privadosEvaluados: privados.length,
      aceptadosPorLaEnvolvente: privados.filter((t) => evaluarEnvolvente(t).elegible).length,
      goldenElegibles: GOLDEN_G1.filter((c) => evaluarEnvolvente(c.input.sanitizedQuestion).elegible).length,
      goldenTotal: GOLDEN_G1.length,
    },
    codigoHashes: hashArchivos(ARCHIVOS_PRIVACIDAD),
  };
  const destino = path.join(process.cwd(), 'docs', 'governance', 'evidence', 'g6-privacy-metrics.json');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, `${JSON.stringify(evidencia, null, 2)}\n`);
  console.log(`\nescrito ${path.relative(process.cwd(), destino)}`);
}
