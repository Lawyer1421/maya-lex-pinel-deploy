#!/usr/bin/env node

/**
 * VERIFICADOR DE CORPUS INVENTORY V2
 *
 * Lee corpus-inventory-v2.csv, reproduce los conteos del JSON,
 * y falla (exit 1) si no coinciden.
 *
 * Uso: node scripts/verificar-inventory-v2.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(__dirname, '..', 'docs', 'corpus', 'corpus-inventory-v2.csv');
const jsonPath = path.join(__dirname, '..', 'docs', 'corpus', 'corpus-inventory-v2.json');

// Parse CSV línea por línea
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV vacío o solo encabezado');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

// Calcular conteos desde CSV
function calculateMetrics(rows) {
  const metrics = {
    queue_rows_total: rows.length,
    distinct_norm_ids: new Set(rows.map(r => r.norm_id)).size,
    instruments_total: new Set(rows.map(r => r.instrumento)).size,
    por_estado_vigencia: {},
    por_lote_p0: {},
    por_origen_hallazgo: {},
  };

  rows.forEach(row => {
    // estado_vigencia
    const estado = row.estado_vigencia || 'UNKNOWN';
    metrics.por_estado_vigencia[estado] = (metrics.por_estado_vigencia[estado] || 0) + 1;

    // lote_p0
    const lote = row.lote_p0 || 'NO_ASIGNADO';
    metrics.por_lote_p0[lote] = (metrics.por_lote_p0[lote] || 0) + 1;

    // origen_hallazgo
    const origen = row.origen_hallazgo || 'UNKNOWN';
    metrics.por_origen_hallazgo[origen] = (metrics.por_origen_hallazgo[origen] || 0) + 1;
  });

  return metrics;
}

// Main
try {
  console.log('📖 Leyendo CSV...');
  const rows = parseCSV(csvPath);
  const calculatedMetrics = calculateMetrics(rows);

  console.log('📊 Leyendo JSON...');
  const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  // Verificar conteos
  console.log('\n✓ Verificación de conteos:\n');

  let failed = false;

  if (calculatedMetrics.queue_rows_total !== jsonContent.queue_rows_total) {
    console.error(`✗ queue_rows_total: CSV=${calculatedMetrics.queue_rows_total}, JSON=${jsonContent.queue_rows_total}`);
    failed = true;
  } else {
    console.log(`✓ queue_rows_total: ${calculatedMetrics.queue_rows_total}`);
  }

  if (calculatedMetrics.distinct_norm_ids !== jsonContent.distinct_norm_ids) {
    console.error(`✗ distinct_norm_ids: CSV=${calculatedMetrics.distinct_norm_ids}, JSON=${jsonContent.distinct_norm_ids}`);
    failed = true;
  } else {
    console.log(`✓ distinct_norm_ids: ${calculatedMetrics.distinct_norm_ids}`);
  }

  if (calculatedMetrics.instruments_total !== jsonContent.instruments_total) {
    console.error(`✗ instruments_total: CSV=${calculatedMetrics.instruments_total}, JSON=${jsonContent.instruments_total}`);
    failed = true;
  } else {
    console.log(`✓ instruments_total: ${calculatedMetrics.instruments_total}`);
  }

  // Verificar por_estado_vigencia
  console.log('\n por_estado_vigencia:');
  Object.entries(calculatedMetrics.por_estado_vigencia).forEach(([estado, count]) => {
    const jsonCount = jsonContent.por_estado_vigencia[estado] || 0;
    if (count !== jsonCount) {
      console.error(`  ✗ ${estado}: CSV=${count}, JSON=${jsonCount}`);
      failed = true;
    } else {
      console.log(`  ✓ ${estado}: ${count}`);
    }
  });

  if (failed) {
    console.error('\n❌ VERIFICACIÓN FALLIDA');
    process.exit(1);
  } else {
    console.log('\n✅ VERIFICACIÓN EXITOSA');
    process.exit(0);
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
