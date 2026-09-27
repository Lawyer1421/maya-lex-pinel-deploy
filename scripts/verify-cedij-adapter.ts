/**
 * scripts/verify-cedij-adapter.ts
 * Retrieval v3 — Fase 1E.1: verificación EN VIVO del adapter real de CEDIJ.
 *
 * Script de un solo uso, NO productivo, NO parte de CI (los tests de CI
 * siguen 100% mockeados -- ver tests/official-source-router.test.ts).
 * Invoca el código REAL de `cedijLegislacionAdapter` (el mismo que
 * consumiría una fase futura de wiring) contra
 * https://legislacion.poderjudicial.gob.hn.
 *
 * Garantías de esta ejecución:
 *   - Sin autenticación, sin credenciales.
 *   - Consultas jurídicas sintéticas, nunca datos de un usuario real.
 *   - Solo imprime metadata segura -- NUNCA el texto completo de un
 *     documento legal, nunca el contenido crudo de la respuesta HTML.
 *   - No escribe en Supabase ni en ningún estado externo.
 *   - Como mucho una sonda HEAD/GET mínima a UN solo PDF (§9) -- sin
 *     descargar el archivo completo.
 *
 * Uso: npx tsx scripts/verify-cedij-adapter.ts
 */

import { cedijLegislacionAdapter } from '../lib/legal-retrieval/official-sources/adapters/cedij-legislacion';
import { minimizeQueryForExternalResearch } from '../lib/legal-retrieval/official-sources/router';
import type { OfficialSourceQuery, OfficialSourceResult } from '../lib/legal-retrieval/official-sources/types';

const ALLOWED_HOST = 'legislacion.poderjudicial.gob.hn';

// Consultas SINTÉTICAS -- términos jurídicos genéricos, nunca datos de un
// caso real ni de un usuario (§10 de la directiva).
const CONSULTAS_SINTETICAS: OfficialSourceQuery[] = [
  { searchText: minimizeQueryForExternalResearch('Codigo Penal'), kind: 'LEGISLATION' },
  { searchText: minimizeQueryForExternalResearch('Codigo Civil'), kind: 'LEGISLATION' },
];

const CONSULTA_SIN_RESULTADOS: OfficialSourceQuery = {
  searchText: 'xyzzynonexistentdocument999888777',
  kind: 'LEGISLATION',
};

function assert(condicion: boolean, mensaje: string): void {
  if (!condicion) throw new Error(`ASSERTION FALLIDA: ${mensaje}`);
  console.log(`  OK: ${mensaje}`);
}

function reportarResultado(etiqueta: string, query: OfficialSourceQuery, resultado: OfficialSourceResult): void {
  console.log(`\n--- ${etiqueta} ---`);
  console.log(`query.searchText: "${query.searchText}"`);
  console.log(`status: ${resultado.status}`);
  console.log(`sourceId: ${resultado.sourceId ?? '(ausente)'}`);
  console.log(`errorCode: ${resultado.errorCode ?? '(ninguno)'}`);
  console.log(`evidence.length: ${resultado.evidence.length}`);
  for (const ev of resultado.evidence.slice(0, 3)) {
    console.log(`  - [${ev.documentType}] "${ev.documentTitle}" | fecha=${ev.publicationDate ?? 'N/D'} | numero=${ev.documentNumber ?? 'N/D'}`);
    console.log(`    sourceUrl host: ${new URL(ev.sourceUrl).hostname}`);
    console.log(`    verificationStatus: ${ev.verificationStatus} | retrievedAt: ${ev.retrievedAt}`);
    // NUNCA se imprime contenido del documento -- solo metadata.
  }
}

async function probarDocumentoUnico(resultado: OfficialSourceResult): Promise<void> {
  const primero = resultado.evidence[0];
  if (!primero) {
    console.log('\n--- Sonda de PDF (§9) ---\nSin evidencia disponible para probar -- se omite.');
    return;
  }
  const url = new URL(primero.sourceUrl);
  assert(url.hostname === ALLOWED_HOST, `host del PDF es el oficial (${url.hostname})`);

  console.log(`\n--- Sonda de PDF (§9): HEAD ${url.hostname}${url.pathname.slice(0, 60)}... ---`);
  let respuesta: Response;
  try {
    respuesta = await fetch(primero.sourceUrl, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
  } catch (err) {
    console.log(`  HEAD no soportado o falló (${err instanceof Error ? err.message : String(err)}) -- reintentando con GET mínimo`);
    respuesta = await fetch(primero.sourceUrl, { method: 'GET', signal: AbortSignal.timeout(8000) });
  }
  assert(respuesta.ok, `respuesta exitosa (HTTP ${respuesta.status})`);
  const contentType = respuesta.headers.get('content-type') ?? '';
  assert(contentType.toLowerCase().includes('pdf'), `Content-Type compatible con PDF (${contentType})`);
  // No se descarga el cuerpo -- HEAD no trae body, y si se degradó a GET no
  // se lee response.body en ningún punto de este script.
}

async function main(): Promise<void> {
  console.log('MAYALEX — Verificación en vivo del adapter CEDIJ (Fase 1E.1)');
  console.log(`Host objetivo: ${ALLOWED_HOST}`);
  console.log('Solo lectura. Sin autenticación. Sin datos de usuario.\n');

  const resultados: Array<{ query: OfficialSourceQuery; resultado: OfficialSourceResult }> = [];

  for (const [i, query] of CONSULTAS_SINTETICAS.entries()) {
    const resultado = await cedijLegislacionAdapter.search(query);
    resultados.push({ query, resultado });
    reportarResultado(`Consulta ${i + 1}`, query, resultado);

    assert(resultado.status === 'SUCCESS', 'status === SUCCESS');
    assert(resultado.evidence.length > 0, 'evidence.length > 0');
    assert(resultado.sourceId === 'CEDIJ_LEGISLACION', 'sourceId === CEDIJ_LEGISLACION');
    for (const ev of resultado.evidence) {
      assert(ev.sourceName.length > 0, 'sourceName presente');
      assert(new URL(ev.sourceUrl).hostname === ALLOWED_HOST, `sourceUrl host allowlisted (${new URL(ev.sourceUrl).hostname})`);
      assert(new URL(ev.sourceUrl).pathname.startsWith('/sistemalegislacion/'), 'sourceUrl path bajo /sistemalegislacion/');
      assert(ev.documentTitle.trim().length > 0, 'documentTitle no vacío');
      assert(ev.jurisdiction === 'HN', 'jurisdiction === HN');
      assert(ev.verificationStatus === 'SOURCE_CONFIRMED', 'verificationStatus === SOURCE_CONFIRMED');
      assert(!Number.isNaN(new Date(ev.retrievedAt).getTime()), 'retrievedAt es una fecha ISO válida');
    }
  }

  // §7 (parcial, en vivo): NO_RESULTS real contra el sitio real.
  const resultadoVacio = await cedijLegislacionAdapter.search(CONSULTA_SIN_RESULTADOS);
  reportarResultado('Consulta sin resultados esperados', CONSULTA_SIN_RESULTADOS, resultadoVacio);
  assert(resultadoVacio.status === 'NO_RESULTS' || resultadoVacio.status === 'SUCCESS', 'status es NO_RESULTS (o SUCCESS si el término coincidió con algo inesperado -- no es un fallo del adapter)');

  // §9: sonda mínima de UN solo documento real.
  await probarDocumentoUnico(resultados[0].resultado);

  console.log('\n=== RESUMEN ===');
  console.log(`Consultas con evidencia real: ${resultados.filter(r => r.resultado.status === 'SUCCESS').length}/${resultados.length}`);
  console.log('READY_FOR_PHASE_1E_RUNTIME_WIRING candidato: ver reporte de Fase 1E.1 completo (esta señal por sí sola no autoriza wiring).');
}

main().catch((err) => {
  console.error('\nFALLO DE VERIFICACIÓN:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
