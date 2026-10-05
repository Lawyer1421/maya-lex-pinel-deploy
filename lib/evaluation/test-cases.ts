/**
 * lib/evaluation/test-cases.ts
 * Casos de prueba anonimizados para Etapa 2: Comparación Haiku vs DeepSeek V3
 *
 * 3 queries de conexión (validar proveedor/modelo/tokens)
 * + 20 casos anonimizados (6 categorías)
 *
 * Alcance: READ-ONLY, sin PII, sin datos de producción
 */

export interface TestCase {
  id: string;
  category: 'connection' | 'civil-analysis' | 'penal-analysis' | 'document' | 'edge-case' | 'contradictions' | 'updates';
  mode: 'sala_ia' | 'analisis' | 'documento' | 'sala_penal' | 'analisis_penal' | 'escritos_penales';
  query: string;
  expectedFragmentCount?: number; // Para validación de RAG
  description: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONEXIÓN (3 queries mínimas para validar proveedor + tokens)
// ─────────────────────────────────────────────────────────────────────────────

export const CONNECTION_TESTS: TestCase[] = [
  {
    id: 'conn-001',
    category: 'connection',
    mode: 'sala_ia',
    query: 'Art. 1 Constitución Honduras',
    description: 'Query simple sala_ia (Haiku) — validar tokens, latencia, modelo',
  },
  {
    id: 'conn-002',
    category: 'connection',
    mode: 'analisis',
    query: '¿Cuál es el plazo de caducidad de una demanda civil en Honduras?',
    description: 'Query simple analisis (Opus/V3) — validar tokens, thinking state',
  },
  {
    id: 'conn-003',
    category: 'connection',
    mode: 'analisis_penal',
    query: 'Explica brevemente el concepto de imputabilidad en el Código Penal hondureño',
    description: 'Query simple analisis_penal (Opus/V3) — validar integración penal',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ANÁLISIS CIVIL (5 queries: sencilla, contrato, propiedad, procedimiento, hipoteca)
// ─────────────────────────────────────────────────────────────────────────────

export const CIVIL_ANALYSIS_TESTS: TestCase[] = [
  {
    id: 'civil-001',
    category: 'civil-analysis',
    mode: 'analisis',
    query: 'Una persona compra una casa en Tegucigalpa y descubre que el vendedor no es el propietario real. ¿Qué recursos tiene?',
    description: 'Análisis civil: venta de bien sin dominio — vicios sustanciales',
    expectedFragmentCount: 3,
  },
  {
    id: 'civil-002',
    category: 'civil-analysis',
    mode: 'analisis',
    query: 'Un contratista incumple plazo en una obra civil. ¿Cuál es el procedimiento para ejecutar la fianza de cumplimiento?',
    description: 'Análisis civil: fianza de cumplimiento — ejecución hipotecaria análogo',
    expectedFragmentCount: 3,
  },
  {
    id: 'civil-003',
    category: 'civil-analysis',
    mode: 'documento',
    query: 'Redacta una cláusula de resolución de contrato de servicios profesionales por incumplimiento de plazos.',
    description: 'Documento: cláusula resolución — genera instrumento formal',
    expectedFragmentCount: 0,
  },
  {
    id: 'civil-004',
    category: 'civil-analysis',
    mode: 'analisis',
    query: '¿Cuál es la prescripción de una acción de cobro de deuda en Honduras?',
    description: 'Análisis civil: prescripción — plazo perentorio',
    expectedFragmentCount: 2,
  },
  {
    id: 'civil-005',
    category: 'civil-analysis',
    mode: 'analisis',
    query: 'Una hipoteca se inscribió con error en la descripción del inmueble. ¿Es nula o puede rectificarse?',
    description: 'Análisis civil: error en hipoteca — rectificación vs nulidad',
    expectedFragmentCount: 3,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ANÁLISIS PENAL (5 queries: teoría delito, medidas cautelares, garantías, recursos, delitos especiales)
// ─────────────────────────────────────────────────────────────────────────────

export const PENAL_ANALYSIS_TESTS: TestCase[] = [
  {
    id: 'penal-001',
    category: 'penal-analysis',
    mode: 'analisis_penal',
    query: 'Se imputa robo de dinero en efectivo. ¿Cuál es el bien jurídico y qué elementos faltan para configurar el tipo?',
    description: 'Análisis penal: robo — bien jurídico, tipicidad, dolo',
    expectedFragmentCount: 3,
  },
  {
    id: 'penal-002',
    category: 'penal-analysis',
    mode: 'sala_penal',
    query: 'Art. 178 CPP — prisión preventiva',
    description: 'Sala penal: prisión preventiva — audiencia rápida (<150 palabras)',
    expectedFragmentCount: 1,
  },
  {
    id: 'penal-003',
    category: 'penal-analysis',
    mode: 'analisis_penal',
    query: 'Imputado detenido sin orden judicial. ¿Qué garantía se vulneró y cuál es el recurso?',
    description: 'Análisis penal: detención arbitraria — garantías procesales',
    expectedFragmentCount: 3,
  },
  {
    id: 'penal-004',
    category: 'penal-analysis',
    mode: 'escritos_penales',
    query: 'Redacta una solicitud de medida cautelar alternativa a prisión preventiva (arresto domiciliar) para acusado con arraigo.',
    description: 'Escritos penales: medida cautelar alternativa — formato formal',
    expectedFragmentCount: 0,
  },
  {
    id: 'penal-005',
    category: 'penal-analysis',
    mode: 'analisis_penal',
    query: 'Tribunal rechaza prueba ilícita en audiencia. ¿Cómo impugnarlo y ante quién?',
    description: 'Análisis penal: prueba ilícita — recurso de apelación',
    expectedFragmentCount: 3,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTOS (2 queries: poder general, contrato)
// ─────────────────────────────────────────────────────────────────────────────

export const DOCUMENT_TESTS: TestCase[] = [
  {
    id: 'doc-001',
    category: 'document',
    mode: 'documento',
    query: 'Genera un poder general amplio para que una persona actúe en mi nombre en asuntos civiles y mercantiles.',
    description: 'Documento: poder general — estructura Art. 21 Reglamento Notariado',
    expectedFragmentCount: 0,
  },
  {
    id: 'doc-002',
    category: 'document',
    mode: 'documento',
    query: 'Crea un contrato de arrendamiento de vivienda urbana (6 meses, L. 8,000/mes) con cláusulas de depósito caución y terminación.',
    description: 'Documento: contrato arrendamiento — cláusulas protección (caución, mora)',
    expectedFragmentCount: 0,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CASOS FRONTERA (3 queries: artículo inexistente, figura antigua, código errado)
// ─────────────────────────────────────────────────────────────────────────────

export const EDGE_CASE_TESTS: TestCase[] = [
  {
    id: 'edge-001',
    category: 'edge-case',
    mode: 'analisis',
    query: '¿Qué dice el Art. 9999 del Código Civil de Honduras?',
    description: 'Edge case: artículo inexistente — validar fail-closed (sin invención)',
    expectedFragmentCount: 0,
  },
  {
    id: 'edge-002',
    category: 'edge-case',
    mode: 'analisis_penal',
    query: '¿Cuál es la pena para delito de sedición según el Código Penal actual?',
    description: 'Edge case: figura histórica (derogada) — validar abstención correcta',
    expectedFragmentCount: 0,
  },
  {
    id: 'edge-003',
    category: 'edge-case',
    mode: 'analisis',
    query: 'Código Mercantil Art. 45 Honduras',
    description: 'Edge case: código errado (no existe "Código Mercantil" oficial) — validar clarificación',
    expectedFragmentCount: 0,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CONTRADICCIONES EN CORPUS (2 queries: reformas conflictivas, fuentes competentes)
// ─────────────────────────────────────────────────────────────────────────────

export const CONTRADICTION_TESTS: TestCase[] = [
  {
    id: 'contradiction-001',
    category: 'contradictions',
    mode: 'analisis',
    query: 'El Código Civil dice Art. 1500. El Código Procesal Civil dice Art. 709. ¿Cuál aplica para plazos de apelación en demanda de cobro?',
    description: 'Contradicción: jurisdicción de normas — jerarquía (CPC > CC)',
    expectedFragmentCount: 3,
  },
  {
    id: 'contradiction-002',
    category: 'contradictions',
    mode: 'analisis_penal',
    query: 'Art. 28 CPP (criterio de oportunidad) y Art. 40 CPP (suspensión condicional): ¿Cuál se aplica para delito de amenaza?',
    description: 'Contradicción: salidas alternas — distinciones (aplicabilidad por pena)',
    expectedFragmentCount: 2,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// NECESIDAD DE ACTUALIZACIÓN (3 queries: reformas recientes, vigencia dudosa, jurisprudencia conflictiva)
// ─────────────────────────────────────────────────────────────────────────────

export const UPDATE_TESTS: TestCase[] = [
  {
    id: 'update-001',
    category: 'updates',
    mode: 'analisis',
    query: 'Cuál es el estado vigente del impuesto a la transferencia de bienes inmuebles en Honduras después de las reformas 2024?',
    description: 'Actualización: reforma tributaria 2024 — verificar corpus incluye reformas',
    expectedFragmentCount: 0,
  },
  {
    id: 'update-002',
    category: 'updates',
    mode: 'analisis_penal',
    query: 'Cambios al CPP en 2025 — penas y procedimientos en delitos sexuales',
    description: 'Actualización: reforma CPP 2025 — validar versión del corpus',
    expectedFragmentCount: 0,
  },
  {
    id: 'update-003',
    category: 'updates',
    mode: 'analisis',
    query: 'Jurisprudencia CSJ 2026 sobre responsabilidad civil de conductores en accidentes de tránsito',
    description: 'Actualización: jurisprudencia reciente — validar CEDIJ/CSJ fallos actuales',
    expectedFragmentCount: 0,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTAR TODO (orden: conexión, luego categorías)
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_TEST_CASES: TestCase[] = [
  ...CONNECTION_TESTS,
  ...CIVIL_ANALYSIS_TESTS,
  ...PENAL_ANALYSIS_TESTS,
  ...DOCUMENT_TESTS,
  ...EDGE_CASE_TESTS,
  ...CONTRADICTION_TESTS,
  ...UPDATE_TESTS,
];

console.log(`[Test Cases] Loaded ${ALL_TEST_CASES.length} test cases (3 connection + 20 comparison)`);
