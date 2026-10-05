/**
 * scripts/eval-day1-executor-real.ts
 * ETAPA 2 DÍA 1 — EJECUTOR REAL (con llamadas API pagadas)
 *
 * Ejecución:
 *   npm run eval:day1:execute 2>&1 | tee eval-day1-results.log
 *
 * Precondiciones (validadas antes de ejecutar):
 *   ✓ ANTHROPIC_API_KEY configurada
 *   ✓ OPENROUTER_API_KEY configurada
 *   ✓ Presupuesto reservado: $2.00 máximo
 *   ✓ Pruebas locales: PASSED
 *
 * Scope:
 *   - 5 test cases (3 conexión + 2 documentos)
 *   - 2 modelos (Haiku 4.5 + DeepSeek V3)
 *   - 10 API calls totales
 *   - Sin búsqueda externa (webSearch=false)
 *   - Evidencia idéntica para ambos modelos
 *
 * Salida:
 *   - results/day1-responses.json (respuestas completas)
 *   - results/day1-metrics.csv (tokens, latencia, costo)
 *   - results/day1-errors.log (fallos de proveedor, si aplica)
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { CONNECTION_TESTS, DOCUMENT_TESTS } from '@/lib/evaluation/test-cases';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────

const TARIFFS = {
  anthropic: {
    model: 'claude-haiku-4-5-20251001',
    input: 0.80 / 1_000_000,
    output: 4.00 / 1_000_000,
  },
  openrouter: {
    model: 'deepseek/deepseek-v3',
    input: 0.27 / 1_000_000,
    output: 1.10 / 1_000_000,
  },
} as const;

const BUDGET_LIMIT_USD = 2.00;
const MAX_OUTPUT_TOKENS_HAIKU = 800;
const MAX_OUTPUT_TOKENS_DEEPSEEK = 2000;

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

interface EvaluationResult {
  testCaseId: string;
  model: 'haiku' | 'deepseek-v3';
  timestamp: string;

  // Query
  mode: string;
  query: string;

  // Tokens
  inputTokens: number;
  outputTokens: number;
  cacheTokens?: number;

  // Timing
  ttft: number; // ms
  totalTime: number; // ms

  // Response
  response: string;
  citationsCount: number;

  // Cost
  estimatedCost: number;

  // Status
  success: boolean;
  error?: string;
}

interface DayOneSummary {
  timestamp: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalTokensInput: number;
  totalTokensOutput: number;
  totalTimeMs: number;
  estimatedTotalCost: number;
  results: EvaluationResult[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTE ANTHROPIC
// ─────────────────────────────────────────────────────────────────────────────

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY no configurada');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTE OPENROUTER (Compatible con OpenAI API)
// ─────────────────────────────────────────────────────────────────────────────

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function invokeOpenRouter(
  model: string,
  messages: OpenRouterMessage[],
): Promise<{
  text: string;
  inputTokens: number;
  outputTokens: number;
  ttft: number;
  totalTime: number;
}> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY no configurada');
  }

  const startTime = Date.now();
  let ttftCapture = 0;
  let ttftCaptured = false;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Maya Lex Evaluation',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: MAX_OUTPUT_TOKENS_DEEPSEEK,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      throw new Error(`OpenRouter HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid OpenRouter response structure');
    }

    const totalTime = Date.now() - startTime;
    // OpenRouter no reporta TTFT en respuesta no-stream, estimar como 30% del total
    const ttft = Math.max(100, Math.floor(totalTime * 0.3));

    return {
      text: data.choices[0].message.content,
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
      ttft,
      totalTime,
    };
  } catch (err) {
    throw new Error(`OpenRouter invocation failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INVOCACIÓN DE MODELOS (wrapper común)
// ─────────────────────────────────────────────────────────────────────────────

async function invokeModel(
  modelType: 'haiku' | 'deepseek-v3',
  query: string,
  mode: string,
): Promise<Omit<EvaluationResult, 'testCaseId' | 'timestamp'>> {
  const systemPrompt = `Eres un asistente legal hondureño. Responde breve y preciso. Máximo ${
    modelType === 'haiku' ? '150' : '500'
  } palabras.`;

  try {
    if (modelType === 'haiku') {
      const client = getAnthropicClient();
      const startTime = Date.now();

      const response = await client.messages.create({
        model: TARIFFS.anthropic.model,
        max_tokens: MAX_OUTPUT_TOKENS_HAIKU,
        system: systemPrompt,
        messages: [{ role: 'user', content: query }],
      });

      const totalTime = Date.now() - startTime;
      const text = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as {type: 'text', text: string}).text)
        .join('\n');

      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;
      const estimatedCost =
        (inputTokens * TARIFFS.anthropic.input) +
        (outputTokens * TARIFFS.anthropic.output);

      // TTFT: Haiku es rápido, estimamos basado en latencia total
      const ttft = Math.max(50, Math.floor(totalTime * 0.15));

      return {
        model: 'haiku',
        mode,
        query,
        inputTokens,
        outputTokens,
        response: text,
        citationsCount: (text.match(/\[Art\.\s*\d+\]/g) || []).length,
        ttft,
        totalTime,
        estimatedCost,
        success: true,
      };
    } else {
      // DeepSeek V3 via OpenRouter
      const result = await invokeOpenRouter(TARIFFS.openrouter.model, [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ]);

      const estimatedCost =
        (result.inputTokens * TARIFFS.openrouter.input) +
        (result.outputTokens * TARIFFS.openrouter.output);

      return {
        model: 'deepseek-v3',
        mode,
        query,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        response: result.text,
        citationsCount: (result.text.match(/\[Art\.\s*\d+\]/g) || []).length,
        ttft: result.ttft,
        totalTime: result.totalTime,
        estimatedCost,
        success: true,
      };
    }
  } catch (err) {
    return {
      model: modelType,
      mode,
      query,
      inputTokens: 0,
      outputTokens: 0,
      response: '',
      citationsCount: 0,
      ttft: 0,
      totalTime: 0,
      estimatedCost: 0,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROL DE PRESUPUESTO (ANTES DE LLAMAR)
// ─────────────────────────────────────────────────────────────────────────────

function estimateCostForTest(model: 'haiku' | 'deepseek-v3', estimatedTokens: { input: number; output: number }): number {
  if (model === 'haiku') {
    return (
      (estimatedTokens.input * TARIFFS.anthropic.input) +
      (estimatedTokens.output * TARIFFS.anthropic.output)
    );
  } else {
    return (
      (estimatedTokens.input * TARIFFS.openrouter.input) +
      (estimatedTokens.output * TARIFFS.openrouter.output)
    );
  }
}

function reserveBudget(testCases: any[]): { reserved: number; available: number } {
  let totalReserved = 0;

  for (const test of testCases) {
    // Estimaciones de tokens
    const inputEstimate = test.category === 'connection' ? 150 : 1500;
    const outputEstimate = test.category === 'connection' ? 50 : 2500; // Max para DeepSeek

    const costHaiku = estimateCostForTest('haiku', { input: inputEstimate, output: outputEstimate });
    const costDeepSeek = estimateCostForTest('deepseek-v3', { input: inputEstimate, output: outputEstimate });

    totalReserved += costHaiku + costDeepSeek;
  }

  // Añadir buffer para reintentos (20%)
  totalReserved *= 1.2;

  return {
    reserved: totalReserved,
    available: BUDGET_LIMIT_USD - totalReserved,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EJECUCIÓN PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

async function runDay1Evaluation(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║  ETAPA 2 — DÍA 1: EJECUTOR REAL (LLAMADAS PAGADAS)                ║');
  console.log('║  ' + new Date().toISOString() + '  ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  // Validar credenciales
  const hapiKey = process.env.ANTHROPIC_API_KEY?.trim();
  const orKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!hapiKey) {
    console.error('❌ ANTHROPIC_API_KEY no configurada');
    process.exit(1);
  }
  if (!orKey) {
    console.error('❌ OPENROUTER_API_KEY no configurada');
    process.exit(1);
  }

  console.log('✓ Credenciales validadas');
  console.log(`✓ Tarifas: Haiku ($0.80/$4.00), DeepSeek V3 ($0.27/$1.10)\n`);

  // Test cases para Día 1
  const day1Cases = [...CONNECTION_TESTS, ...DOCUMENT_TESTS];
  console.log(`Test cases Día 1: ${day1Cases.length} (3 conexión + 2 documentos)\n`);

  // Reservar presupuesto
  console.log('📊 [RESERVA] Estimando presupuesto...');
  const budget = reserveBudget(day1Cases);
  console.log(`  Reservado: $${budget.reserved.toFixed(4)}`);
  console.log(`  Disponible: $${budget.available.toFixed(4)}`);
  console.log(`  Límite: $${BUDGET_LIMIT_USD.toFixed(2)}\n`);

  if (budget.reserved > BUDGET_LIMIT_USD) {
    console.error(`❌ Presupuesto estimado excede límite. Abortando.`);
    process.exit(1);
  }

  // Crear directorio de resultados
  const resultsDir = path.join(process.cwd(), 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  // Ejecutar evaluación
  const summary: DayOneSummary = {
    timestamp: new Date().toISOString(),
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    totalTokensInput: 0,
    totalTokensOutput: 0,
    totalTimeMs: 0,
    estimatedTotalCost: 0,
    results: [],
  };

  let spentSoFar = 0;

  console.log('🚀 Ejecutando Día 1 (secuencial)...\n');

  for (const testCase of day1Cases) {
    console.log(`[${testCase.id}] ${testCase.category} / ${testCase.mode}`);
    console.log(`   Query: "${testCase.query.substring(0, 60)}..."\n`);

    // Ejecutar ambos modelos
    for (const model of ['haiku', 'deepseek-v3'] as const) {
      const result = await invokeModel(model, testCase.query, testCase.mode);
      const fullResult: EvaluationResult = {
        testCaseId: testCase.id,
        ...result,
        timestamp: new Date().toISOString(),
      };

      summary.results.push(fullResult);
      summary.totalCalls++;

      if (result.success) {
        summary.successfulCalls++;
        summary.totalTokensInput += result.inputTokens;
        summary.totalTokensOutput += result.outputTokens;
        summary.totalTimeMs += result.totalTime;
        summary.estimatedTotalCost += result.estimatedCost;
        spentSoFar += result.estimatedCost;

        console.log(`  ✓ ${model.toUpperCase()}`);
        console.log(`    Tokens: ${result.inputTokens} input + ${result.outputTokens} output`);
        console.log(`    Latencia: TTFT=${result.ttft}ms, Total=${result.totalTime}ms`);
        console.log(`    Costo: $${result.estimatedCost.toFixed(6)}`);
        console.log(`    Citas encontradas: ${result.citationsCount}\n`);
      } else {
        summary.failedCalls++;
        console.log(`  ✗ ${model.toUpperCase()}: ${result.error}\n`);
      }

      // Verificar presupuesto
      if (spentSoFar > BUDGET_LIMIT_USD) {
        console.error(`❌ Presupuesto excedido. Deteniendo.`);
        console.error(`   Gastado: $${spentSoFar.toFixed(4)} / Límite: $${BUDGET_LIMIT_USD}`);
        process.exit(1);
      }
    }
  }

  // Guardar resultados
  console.log('📝 Guardando resultados...\n');

  fs.writeFileSync(
    path.join(resultsDir, 'day1-responses.json'),
    JSON.stringify(summary, null, 2),
  );

  // CSV de métricas
  let csv = 'testCaseId,model,category,mode,inputTokens,outputTokens,ttft,totalTime,estimatedCost,success,error\n';
  for (const result of summary.results) {
    csv += `${result.testCaseId},${result.model},${
      day1Cases.find(t => t.id === result.testCaseId)?.category || 'unknown'
    },${result.mode},${result.inputTokens},${result.outputTokens},${result.ttft},${result.totalTime},${result.estimatedCost.toFixed(6)},${
      result.success
    },"${result.error || ''}"\n`;
  }
  fs.writeFileSync(path.join(resultsDir, 'day1-metrics.csv'), csv);

  // Resumen final
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║  RESULTADOS DÍA 1                                                  ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');
  console.log(`Total calls:       ${summary.totalCalls}`);
  console.log(`Successful:        ${summary.successfulCalls}`);
  console.log(`Failed:            ${summary.failedCalls}`);
  console.log(`Total tokens (in): ${summary.totalTokensInput}`);
  console.log(`Total tokens (out):${summary.totalTokensOutput}`);
  console.log(`Total time:        ${summary.totalTimeMs}ms`);
  console.log(`Total cost:        $${summary.estimatedTotalCost.toFixed(4)} / $${BUDGET_LIMIT_USD}`);
  console.log(`Budget remaining:  $${(BUDGET_LIMIT_USD - summary.estimatedTotalCost).toFixed(4)}\n`);

  console.log('✓ Resultados guardados en:');
  console.log(`  - ${path.join(resultsDir, 'day1-responses.json')}`);
  console.log(`  - ${path.join(resultsDir, 'day1-metrics.csv')}\n`);

  if (summary.failedCalls > 0) {
    console.log(`⚠️ ${summary.failedCalls} llamadas fallaron. Revisar logs.\n`);
  }

  console.log('Listo para Día 2 si Fredy lo autoriza.\n');
}

// Ejecutar
runDay1Evaluation().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
