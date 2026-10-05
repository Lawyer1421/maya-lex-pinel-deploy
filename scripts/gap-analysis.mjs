#!/usr/bin/env node

/**
 * GAP ANALYSIS: 13 instrumentos canónicos vs biblioteca_vectores
 * READ ONLY. No modificaciones.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://thgrhueckkjdutjvcufp.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoZ3JodWVja2tqZHV0anZjdWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMTcwMDYsImV4cCI6MjA5Nzg5MzAwNn0.iqmdVR8yJsl4ohbntbgTX-ja07J4GngVcc6tRxndLFo';

const CANONICAL_NORM_IDS = [
  'HN_CODIGO_CIVIL',
  'HN_CODIGO_FAMILIA',
  'HN_DECRETO_102_2018',
  'HN_DECRETO_31_2015',
  'HN_DECRETO_73_96',
  'HN_DECRETO_35_2013',
  'HN_DECRETO_124_92',
  'HN_CPC_D211_2006',
  'HN_CPP_D9_99E',
  'HN_CODIGO_NOTARIADO_D353_2005',
  'HN_RESOLUCION_PCSJ_17_2012',
  'HN_CODIGO_COMERCIO_D73_1950',
  'HN_LEY_ORGANIZACION_TRIBUNALES'
];

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runGapAnalysis() {
  console.log('🔍 GAP ANALYSIS: 13 instrumentos canónicos vs DB\n');
  console.log(`📍 Project: thgrhueckkjdutjvcufp (PRODUCCIÓN)\n`);

  const results = {
    project_ref: 'thgrhueckkjdutjvcufp',
    timestamp: new Date().toISOString(),
    db_total: {},
    canonical_coverage: {},
    unmapped_sources: [],
    analysis: []
  };

  try {
    // Query 1: Total de filas y norm_ids distintos
    const { data: totalData, error: totalError } = await supabase
      .from('biblioteca_vectores')
      .select('norm_id', { count: 'exact' });

    if (totalError) throw totalError;

    const distinctNormIds = new Set(totalData.map(r => r.norm_id));
    results.db_total.total_rows = totalData.length;
    results.db_total.distinct_norm_ids = distinctNormIds.size;

    console.log(`DB_TOTAL_ROWS: ${results.db_total.total_rows}`);
    console.log(`Distinct norm_ids: ${results.db_total.distinct_norm_ids}\n`);

    // Query 2: Distribución por instrumento canónico
    console.log('📊 CANONICAL COVERAGE:\n');

    for (const normId of CANONICAL_NORM_IDS) {
      const { data, error } = await supabase
        .from('biblioteca_vectores')
        .select('numero_articulo, es_norma_vigente, revision_pendiente')
        .eq('norm_id', normId);

      if (error) {
        results.analysis.push({
          norm_id: normId,
          status: 'ERROR',
          error: error.message
        });
        console.log(`  ✗ ${normId}: ERROR`);
        continue;
      }

      if (data.length === 0) {
        results.analysis.push({
          norm_id: normId,
          status: 'ABSENT',
          row_count: 0
        });
        console.log(`  ✗ ${normId}: ABSENT (0 rows)`);
        continue;
      }

      const distinctArticles = new Set(data.map(r => r.numero_articulo));
      const vigenteCount = data.filter(r => r.es_norma_vigente).length;
      const revisionCount = data.filter(r => r.revision_pendiente).length;
      const duplicates = data.length - distinctArticles.size;

      let status = 'COMPLETE_CANDIDATE';
      if (duplicates > 0) status = 'DUPLICATED_OR_CONTAMINATED';
      else if (data.length < 10) status = 'PARTIAL';

      results.analysis.push({
        norm_id: normId,
        status: status,
        row_count: data.length,
        distinct_articles: distinctArticles.size,
        vigente_count: vigenteCount,
        revision_pendiente_count: revisionCount,
        duplicates: duplicates
      });

      console.log(`  ✓ ${normId}: ${status} (${data.length} rows, ${distinctArticles.size} distinct articles)`);
    }

    // Query 3: Unmapped sources
    console.log('\n📦 UNMAPPED DB SOURCES:\n');
    const unmappedNormIds = Array.from(distinctNormIds).filter(id => !CANONICAL_NORM_IDS.includes(id));
    results.unmapped_sources = unmappedNormIds;

    if (unmappedNormIds.length > 0) {
      for (const unmappedId of unmappedNormIds) {
        const { data } = await supabase
          .from('biblioteca_vectores')
          .select('*', { count: 'exact' })
          .eq('norm_id', unmappedId)
          .limit(1);
        console.log(`  - ${unmappedId} (${data.length || '?'} rows)`);
      }
    } else {
      console.log('  (none - all DB sources map to canonical)');
    }

    console.log('\n✅ GAP ANALYSIS COMPLETE\n');
    return results;

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

runGapAnalysis().then(results => {
  console.log(JSON.stringify(results, null, 2));
});
