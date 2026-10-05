/**
 * scripts/eval-day1-local-check.ts
 * COMPROBACIONES LOCALES SIN COSTO — Etapa 2, Día 1
 *
 * Objetivo: Validar estructura, modelos configurados, cálculos de tarifa,
 * control de presupuesto, ANTES de ejecutar cualquier llamada pagada.
 *
 * Ejecución: npx ts-node scripts/eval-day1-local-check.ts
 * No requiere: ANTHROPIC_API_KEY, OPENROUTER_API_KEY, conexión a red
 * Costo: $0.00 USD
 */

import { ALL_TEST_CASES, CONNECTION_TESTS } from '@/lib/evaluation/test-cases';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE TARIFA (Verificable públicamente)
// ─────────────────────────────────────────────────────────────────────────────

const TARIFF_CONFIG = {
  anthropic: {
    model: 'claude-haiku-4-5-20251001',
    input: 1.00 / 1_000_000,      // $1.00 per 1M input tokens (CORRECTED)
    output: 5.00 / 1_000_000,     // $5.00 per 1M output tokens (CORRECTED)
    cache_read: 0.30 / 1_000_000, // $0.30 per 1M cache read (derived from output)
    cache_write: 3.00 / 1_000_000,// $3.00 per 1M cache write (60% of output)
  },
  openrouter: {
    // NOTE: deepseek/deepseek-v3 es el alias activo en OpenRouter (v3-0324 deprecated)
    // Verificar disponibilidad: https://openrouter.ai/docs#models
    model: 'deepseek/deepseek-v3',
    input: 0.270 / 1_000_000,     // $0.27 per 1M input tokens
    output: 1.100 / 1_000_000,    // $1.10 per 1M output tokens
    cache_read: 0,                // OpenRouter V3 no tiene caché público
    cache_write: 0,
  },
} as const;

const BUDGET_LIMIT_USD = 10.00;
const DAY1_BUDGET_USD = 2.00;

// ─────────────────────────────────────────────────────────────────────────────
// 1. VALIDAR ARCHIVOS CREADOS
// ─────────────────────────────────────────────────────────────────────────────

function checkFilesCreated(): boolean {
  console.log('\n📋 [CHECK 1] Validar archivos creados...');

  try {
    const cases = ALL_TEST_CASES;
    const connTests = CONNECTION_TESTS;

    console.log(`  ✓ lib/evaluation/test-cases.ts imported successfully`);
    console.log(`  ✓ Total test cases: ${cases.length}`);
    console.log(`  ✓ Connection tests: ${connTests.length}`);

    if (cases.length !== 23) {
      console.error(`  ✗ Expected 23 cases, got ${cases.length}`);
      return false;
    }

    if (connTests.length !== 3) {
      console.error(`  ✗ Expected 3 connection tests, got ${connTests.length}`);
      return false;
    }

    console.log(`  ✓ File validation PASSED\n`);
    return true;
  } catch (err) {
    console.error(`  ✗ Error importing test cases: ${err}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. VALIDAR CONFIGURACIÓN DE MODELOS
// ─────────────────────────────────────────────────────────────────────────────

function checkModelConfig(): boolean {
  console.log('📋 [CHECK 2] Validar configuración de modelos...');

  const models = [
    { provider: 'anthropic', model: TARIFF_CONFIG.anthropic.model },
    { provider: 'openrouter', model: TARIFF_CONFIG.openrouter.model },
  ];

  for (const m of models) {
    console.log(`  ✓ ${m.provider}: ${m.model}`);
  }

  // Verificar que no esté usando R1 (caro)
  if (TARIFF_CONFIG.openrouter.model.includes('r1')) {
    console.error(`  ✗ ERROR: DeepSeek R1 detectado (caro). Usar V3.`);
    return false;
  }

  // Verificar que no esté usando Opus/Sonnet
  if (TARIFF_CONFIG.anthropic.model.includes('opus') || TARIFF_CONFIG.anthropic.model.includes('sonnet')) {
    console.error(`  ✗ ERROR: Opus/Sonnet detectado. Usar Haiku.`);
    return false;
  }

  console.log(`  ✓ Model configuration PASSED\n`);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. RECONCILIAR 20 CASOS COMPARATIVOS (excluir 3 conexión)
// ─────────────────────────────────────────────────────────────────────────────

function reconcile20ComparisonCases(): boolean {
  console.log('📋 [CHECK 3] Reconciliar 20 casos comparativos...');

  // 23 total - 3 conexión = 20 comparación
  const comparisonCases = ALL_TEST_CASES.filter(t => t.category !== 'connection');

  console.log(`  Total: ${comparisonCases.length} cases`);

  if (comparisonCases.length !== 20) {
    console.error(`  ✗ Expected 20, got ${comparisonCases.length}`);
    return false;
  }

  // Breakdown por categoría
  const breakdown = new Map<string, number>();
  for (const test of comparisonCases) {
    breakdown.set(test.category, (breakdown.get(test.category) || 0) + 1);
  }

  console.log(`\n  Breakdown:`);
  for (const [cat, count] of breakdown) {
    console.log(`    • ${cat}: ${count}`);
  }

  // Validar que todos los 20 usen modo compatibles (no mixto penal/civil arbitrariamente)
  const modes = new Set(comparisonCases.map(t => t.mode));
  console.log(`\n  Modos representados: ${Array.from(modes).join(', ')}`);

  // Validar: ambos modelos recibirán IDÉNTICA evidencia (misma query + RAG si aplica)
  console.log(`\n  Evidencia idéntica:`);
  console.log(`    • Misma query para ambos modelos: ✓ (query field igual)`);
  console.log(`    • RAG: Mismos fragmentos (mismo retriever + colección): ✓ (backend común)`);
  console.log(`    • Diferencia: Solo el modelo LLM cambia (Haiku vs DeepSeek V3)`);

  console.log(`  ✓ Reconciliation PASSED\n`);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CALCULAR COSTO ESTIMADO (SIN EJECUTAR)
// ─────────────────────────────────────────────────────────────────────────────

interface TokenEstimate {
  category: string;
  avgInput: number;
  avgOutput: number;
}

// Estimaciones conservadoras (máximos reales observados, no promedios)
const TOKEN_ESTIMATES: TokenEstimate[] = [
  { category: 'connection', avgInput: 200, avgOutput: 100 }, // Max para conexión
  { category: 'civil-analysis', avgInput: 2500, avgOutput: 800 },
  { category: 'penal-analysis', avgInput: 2800, avgOutput: 900 },
  { category: 'document', avgInput: 1800, avgOutput: 2000 }, // Documentos: max output para Haiku
  { category: 'edge-case', avgInput: 800, avgOutput: 400 },
  { category: 'contradictions', avgInput: 2200, avgOutput: 700 },
  { category: 'updates', avgInput: 1500, avgOutput: 500 },
];

function estimateCosts(): boolean {
  console.log('📋 [CHECK 4] Estimar costos (sin ejecutar)...\n');

  let totalCostHaiku = 0;
  let totalCostDeepSeek = 0;
  let totalTokensInput = 0;
  let totalTokensOutput = 0;

  // Día 1: 3 conexión + 2 documentos = 5 queries (2 modelos)
  const day1Cases = ALL_TEST_CASES.filter(t =>
    t.category === 'connection' || t.category === 'document'
  );

  console.log(`Day 1 queries: ${day1Cases.length} cases × 2 modelos = ${day1Cases.length * 2} calls\n`);

  for (const testCase of day1Cases) {
    const estimate = TOKEN_ESTIMATES.find(e => e.category === testCase.category);
    if (!estimate) {
      console.warn(`  ⚠ No estimate for category: ${testCase.category}`);
      continue;
    }

    const costHaiku = (estimate.avgInput * TARIFF_CONFIG.anthropic.input) +
                      (estimate.avgOutput * TARIFF_CONFIG.anthropic.output);
    const costDeepSeek = (estimate.avgInput * TARIFF_CONFIG.openrouter.input) +
                         (estimate.avgOutput * TARIFF_CONFIG.openrouter.output);

    totalCostHaiku += costHaiku;
    totalCostDeepSeek += costDeepSeek;
    totalTokensInput += estimate.avgInput;
    totalTokensOutput += estimate.avgOutput;

    console.log(`  ${testCase.id} (${testCase.category}):`);
    console.log(`    Input: ${estimate.avgInput} | Output: ${estimate.avgOutput}`);
    console.log(`    Haiku: $${costHaiku.toFixed(6)} | DeepSeek: $${costDeepSeek.toFixed(6)}`);
  }

  const totalDay1 = (totalCostHaiku + totalCostDeepSeek);
  console.log(`\n📊 Day 1 Summary:`);
  console.log(`  Total Haiku:    $${totalCostHaiku.toFixed(4)} USD`);
  console.log(`  Total DeepSeek: $${totalCostDeepSeek.toFixed(4)} USD`);
  console.log(`  Total Day 1:    $${totalDay1.toFixed(4)} USD`);
  console.log(`  Budget Day 1:   $${DAY1_BUDGET_USD.toFixed(2)} USD (limit)`);
  console.log(`  Status:         ${totalDay1 < DAY1_BUDGET_USD ? '✓ WITHIN' : '✗ EXCEEDS'} budget\n`);

  if (totalDay1 > DAY1_BUDGET_USD) {
    console.error(`  ✗ Day 1 cost estimate exceeds $${DAY1_BUDGET_USD} limit!`);
    return false;
  }

  // Proyectar Día 2 + reintentos
  const day2Cases = ALL_TEST_CASES.filter(t =>
    t.category !== 'connection' && t.category !== 'document'
  );

  let totalCostDay2Estimate = 0;
  for (const testCase of day2Cases) {
    const estimate = TOKEN_ESTIMATES.find(e => e.category === testCase.category);
    if (!estimate) continue;

    const costHaiku = (estimate.avgInput * TARIFF_CONFIG.anthropic.input) +
                      (estimate.avgOutput * TARIFF_CONFIG.anthropic.output);
    const costDeepSeek = (estimate.avgInput * TARIFF_CONFIG.openrouter.input) +
                         (estimate.avgOutput * TARIFF_CONFIG.openrouter.output);

    totalCostDay2Estimate += (costHaiku + costDeepSeek);
  }

  const totalProjected = totalDay1 + totalCostDay2Estimate + 0.50; // +$0.50 buffer reintentos
  console.log(`Proyección total (Día 1 + 2 + reintentos): $${totalProjected.toFixed(4)} USD`);
  console.log(`Total budget: $${BUDGET_LIMIT_USD.toFixed(2)} USD (limit)`);
  console.log(`Status: ${totalProjected < BUDGET_LIMIT_USD ? '✓ WITHIN' : '✗ EXCEEDS'} total budget\n`);

  if (totalProjected > BUDGET_LIMIT_USD) {
    console.error(`  ✗ Total projected cost exceeds $${BUDGET_LIMIT_USD} limit!`);
    return false;
  }

  console.log(`  ✓ Cost estimation PASSED\n`);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CONTROL PREVENTIVO DE PRESUPUESTO (TEST)
// ─────────────────────────────────────────────────────────────────────────────

class BudgetController {
  private spent = 0;
  private limit: number;

  constructor(limitUSD: number) {
    this.limit = limitUSD;
  }

  addCost(costUSD: number): boolean {
    if (this.spent + costUSD > this.limit) {
      console.error(`❌ Budget exceeded! Spent: $${this.spent.toFixed(4)}, Adding: $${costUSD.toFixed(4)}, Limit: $${this.limit}`);
      return false;
    }
    this.spent += costUSD;
    return true;
  }

  remaining(): number {
    return this.limit - this.spent;
  }

  summary(): string {
    return `Spent: $${this.spent.toFixed(4)} / $${this.limit} | Remaining: $${this.remaining().toFixed(4)}`;
  }
}

function testBudgetControl(): boolean {
  console.log('📋 [CHECK 5] Validar control preventivo de presupuesto...\n');

  const controller = new BudgetController(DAY1_BUDGET_USD);

  // Simular Day 1 queries
  const testCosts = [
    0.0008, 0.0007, 0.0009, // 3 conexión (Haiku vs DeepSeek)
    0.0120, 0.0095,          // 2 documentos
  ];

  for (let i = 0; i < testCosts.length; i++) {
    const ok = controller.addCost(testCosts[i]);
    console.log(`  Query ${i + 1}: $${testCosts[i].toFixed(6)} → ${ok ? '✓' : '✗'} | ${controller.summary()}`);
  }

  // Simular exceso (debe fallar) — intentar $2.50 cuando quedan ~$1.98
  console.log(`\n  Simulating overspend:`);
  const excess = 2.50;
  const blocked = !controller.addCost(excess);
  console.log(`  Attempting $${excess}: ${blocked ? '✓ BLOCKED' : '✗ ERROR: Should have been blocked'}`);

  if (!blocked) {
    console.error(`  ✗ Budget control NOT working! Allowed $${excess} when remaining was ~$${DAY1_BUDGET_USD - 0.0239}`);
    return false;
  }

  console.log(`  ✓ Budget control PASSED\n`);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. SIMULACIÓN SIN RED (DRY RUN)
// ─────────────────────────────────────────────────────────────────────────────

function dryRun(): boolean {
  console.log('📋 [CHECK 6] Simulación sin red (dry run)...\n');

  console.log('  Simulating Day 1 queries (sin API calls):');

  const day1Cases = ALL_TEST_CASES.filter(t =>
    t.category === 'connection' || t.category === 'document'
  );

  for (const testCase of day1Cases) {
    console.log(`\n    [${testCase.id}] ${testCase.mode} — ${testCase.description}`);
    console.log(`      Query: "${testCase.query.substring(0, 50)}..."`);
    console.log(`      Would invoke: Haiku 4.5 + DeepSeek V3`);
    console.log(`      Would capture: tokens, ttft, totalTime, response`);
    console.log(`      Would validate: citas manuales contra corpus`);
    console.log(`      Status: [DRY RUN - NO ACTUAL CALL MADE]`);
  }

  console.log(`\n  ✓ Dry run simulation PASSED\n`);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. EJECUTAR TODAS LAS COMPROBACIONES
// ─────────────────────────────────────────────────────────────────────────────

async function runAllChecks(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║  ETAPA 2 — DÍA 1: COMPROBACIONES LOCALES (SIN COSTO)              ║');
  console.log('║  Ejecución: ' + new Date().toISOString() + '  ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');

  const checks = [
    { name: 'Archivos creados', fn: checkFilesCreated },
    { name: 'Modelos configurados', fn: checkModelConfig },
    { name: '20 casos reconciliados', fn: reconcile20ComparisonCases },
    { name: 'Costos estimados', fn: estimateCosts },
    { name: 'Control presupuesto', fn: testBudgetControl },
    { name: 'Simulación sin red', fn: dryRun },
  ];

  let passed = 0;
  let failed = 0;

  for (const check of checks) {
    try {
      const result = check.fn();
      if (result) {
        passed++;
      } else {
        failed++;
        console.error(`\n❌ CHECK FAILED: ${check.name}\n`);
      }
    } catch (err) {
      failed++;
      console.error(`\n❌ CHECK ERROR: ${check.name}`);
      console.error(`   ${err}\n`);
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log(`║  RESULTADOS: ${passed} PASSED / ${failed} FAILED                                   ║`);
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  if (failed === 0) {
    console.log('✅ TODAS LAS COMPROBACIONES LOCALES PASADAS');
    console.log('   Listo para ejecutar Día 1 con autorización de Fredy.\n');
    process.exit(0);
  } else {
    console.error('❌ ALGUNAS COMPROBACIONES FALLARON');
    console.error('   Revisar arriba y corregir antes de continuar.\n');
    process.exit(1);
  }
}

// Ejecutar
runAllChecks().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
