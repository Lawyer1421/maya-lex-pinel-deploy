/**
 * scripts/ingesta-canonico-staging.ts
 * Ingesta a STAGING desde un TEXTO CANÓNICO con firma D3 y un PLIEGO D1–D8 firmado, para instrumentos cuyo texto combina fuentes acreditadas
 * distintas (p. ej. HN:CODIGO_NINEZ: artículos de La Gaceta 33,222 + artículos del consolidado dictaminados por el CLO). OFFLINE: no usa red,
 * Supabase ni claves; solo escribe archivos.
 *
 * Diferencia con scripts/ingesta-lote-staging.ts: no liga el texto a UN PDF con candidato CLO_PENDING. En su lugar exige, y se detiene si falta:
 *   1. sha256(texto) = manifiesto.texto_sha256 = manifiesto.firma_d3.sha256_lf, y manifiesto.estado = TEXTO_DEFINITIVO_FIRMA_D3;
 *   2. manifiesto.instrumento = la identidad HN:<INSTRUMENTO> pedida;
 *   3. el pliego está FIRMADO («D1–D8 FIRMADAS») y cita el sha256 completo del texto;
 *   4. cada artículo segmentado (segmentarArticulos) tiene el número, el orden y el sha256 del manifiesto: ni uno de más ni de menos.
 * Lo que ya garantiza construirLote se reutiliza tal cual (identidad, ids deterministas, filas OCULTAS con vigencia NULL y embedding NULL).
 * La visibilidad (vigencia, rol, V4) va en un SQL aparte, derivado del estado de cada artículo en el manifiesto según las reglas D4/D5 del pliego.
 *
 * Uso: npx tsx scripts/ingesta-canonico-staging.ts <texto.txt> <manifiesto.json> <pliego.md> <HN:INSTRUMENTO> <ingest_batch> <fuente> <salida_dir> [fuente_tipo=codigo]
 * Salida: <salida_dir>/{rows.jsonl, ingest_exceptions.log, insert_staging.sql, visibilidad_staging.sql, REPORTE.md}
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { construirLote, sqlInsert, validarRefHN, type FilaLote } from './ingesta-lote-staging';

const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
const lit = (v: string) => `'${v.replace(/'/g, "''")}'`;

export interface ArticuloManifiesto { numero: string; ordinal: number; estado: string; sha256: string; fuente?: string; observaciones?: string[] }
export interface ManifiestoCanonico {
  instrumento: string; estado: string; texto_sha256: string;
  firma_d3?: { firmante?: string; fecha?: string; sha256_lf?: string };
  articulos_detalle: ArticuloManifiesto[];
}

/** Comprueba texto, manifiesto y pliego. Lanza con un mensaje concreto ante cualquier incoherencia; no escribe nada. */
export function validarCanonico(p: { texto: string; manifiesto: ManifiestoCanonico; pliego: string; instrumentoRef: string }): { textoSha: string; firmante: string } {
  validarRefHN(p.instrumentoRef);
  const textoSha = sha(p.texto);
  const m = p.manifiesto;
  if (m.estado !== 'TEXTO_DEFINITIVO_FIRMA_D3') throw new Error(`el manifiesto está en ${m.estado}: solo se ingiere un texto con firma D3`);
  if (m.instrumento !== p.instrumentoRef) throw new Error(`el manifiesto es de ${m.instrumento}, no de ${p.instrumentoRef}`);
  if (m.texto_sha256 !== textoSha) throw new Error(`el texto (${textoSha}) no es el del manifiesto (${m.texto_sha256})`);
  if (!m.firma_d3?.firmante || m.firma_d3.sha256_lf !== textoSha) throw new Error('la firma D3 del manifiesto falta o no es sobre este texto');
  if (!/D1–D8 FIRMADAS/.test(p.pliego)) throw new Error('el pliego no está firmado (falta «D1–D8 FIRMADAS»)');
  if (!p.pliego.includes(textoSha)) throw new Error('el pliego no cita el sha256 del texto que se ingiere');
  if (!Array.isArray(m.articulos_detalle) || m.articulos_detalle.length === 0) throw new Error('el manifiesto no trae el detalle por artículo');
  return { textoSha, firmante: m.firma_d3.firmante };
}

export interface ReglaVisibilidad { esNormaVigente: 'true' | 'false' | 'null'; rol: 'CONTEXT' | null; motivo: string; vigencia: 'TRUE_PRESUNTA' | 'DEROGADO' | 'PENDIENTE_C07' }

/** Reglas D4/D5 del pliego de HN:CODIGO_NINEZ (2026-11-18), por estado del manifiesto. Un estado desconocido detiene la generación. */
export function reglaPorEstado(estado: string): ReglaVisibilidad {
  switch (estado) {
    case 'TEXTO_V8_D3':
    case 'TEXTO_V8_D3_ADICIONADO':
      return { esNormaVigente: 'true', rol: null, motivo: 'PRIMARY elegible: texto de La Gaceta 33,222 con D3 (D1 acreditada)', vigencia: 'TRUE_PRESUNTA' };
    case 'TEXTO_A03_DICTAMINADO_CLO':
      return { esNormaVigente: 'true', rol: 'CONTEXT', motivo: 'RESERVA_D1_B: texto del consolidado dictaminado por el CLO; procedencia pendiente de La Gaceta 28,053 / PDF CEDIJ', vigencia: 'TRUE_PRESUNTA' };
    case 'TEXTO_V8_D3_C07_PENDIENTE':
      return { esNormaVigente: 'null', rol: 'CONTEXT', motivo: 'C07: derogación posterior por el D.130-2017 sin cotejar', vigencia: 'PENDIENTE_C07' };
    case 'DEROGADO':
    case 'DEROGADO_INTEGRO':
      return { esNormaVigente: 'false', rol: 'CONTEXT', motivo: 'DEROGADO: art. 11 del D.35-2013', vigencia: 'DEROGADO' };
    default:
      throw new Error(`estado del manifiesto sin regla de visibilidad: ${estado}`);
  }
}

export function sqlVisibilidad(p: { ingestBatch: string; articulos: readonly ArticuloManifiesto[]; instrumento: string; adjudicacion: string; adjudicadoPor: string; total: number }): string {
  const L: string[] = [];
  const w = (s: string) => L.push(s);
  const grupos = new Map<string, { regla: ReglaVisibilidad; nums: string[] }>();
  for (const a of p.articulos) {
    const r = reglaPorEstado(a.estado);
    const k = `${r.esNormaVigente}|${r.rol}|${r.motivo}|${r.vigencia}`;
    if (!grupos.has(k)) grupos.set(k, { regla: r, nums: [] });
    grupos.get(k)!.nums.push(a.numero);
  }
  const cuenta = (f: (r: ReglaVisibilidad) => boolean) => [...grupos.values()].filter((g) => f(g.regla)).reduce((s, g) => s + g.nums.length, 0);
  w(`-- SOLO STAGING (aicakncgtuiiuomflkqj). Visibilidad del lote ${p.ingestBatch} según el pliego D1–D8 firmado (${p.adjudicacion}).`);
  w('-- Atómico: se aborta sin cambios si el lote no tiene exactamente las filas esperadas, ocultas y con embedding, o si los conteos finales no cuadran.');
  w('-- PRODUCCIÓN: NO APLICAR.');
  w('BEGIN;');
  w('DO $do$');
  w('DECLARE n int;');
  w('BEGIN');
  w(`  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = ${lit(p.ingestBatch)} AND revision_pendiente = true AND es_norma_vigente IS NULL AND embedding IS NOT NULL`);
  w("    AND encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido;");
  w(`  IF n <> ${p.total} THEN RAISE EXCEPTION 'precondición: % de ${p.total} filas ocultas, con embedding y hash correcto', n; END IF;`);
  for (const { regla: r, nums } of grupos.values()) {
    const comunes = `'estado_v', 'V4', 'vigencia', ${lit(r.vigencia)}, 'adjudicacion', ${lit(p.adjudicacion)}, 'adjudicado_por', ${lit(p.adjudicadoPor)}, 'revision_pendiente', false`;
    const rol = r.rol ? `, 'rol', ${lit(r.rol)}, 'motivo_rol', ${lit(r.motivo)}` : `, 'motivo_rol', ${lit(r.motivo)}`;
    const c07 = r.vigencia === 'PENDIENTE_C07' ? `, 'interpretacion_pendiente_clo', ${lit('INTERPRETACION_PENDIENTE_CLO (C07): derogación posterior por el D.130-2017 (art. 632, num. 12); La Gaceta 34,940 / 39,940 y fecha de efecto sin cotejar')}` : '';
    w(`  UPDATE public.biblioteca_vectores SET revision_pendiente = false, es_norma_vigente = ${r.esNormaVigente},`);
    w(`    metadata = metadata || jsonb_build_object(${comunes}${rol}${c07})`);
    w(`  WHERE ingest_batch = ${lit(p.ingestBatch)} AND num_articulo IN (${nums.map(lit).join(', ')});`);
  }
  w(`  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = ${lit(p.ingestBatch)} AND revision_pendiente = false AND metadata->>'estado_v' = 'V4';`);
  w(`  IF n <> ${p.total} THEN RAISE EXCEPTION 'postcondición: % de ${p.total} filas visibles en V4', n; END IF;`);
  const chk = (cond: string, esperado: number, nombre: string) => {
    w(`  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = ${lit(p.ingestBatch)} AND ${cond};`);
    w(`  IF n <> ${esperado} THEN RAISE EXCEPTION 'postcondición: ${nombre} = % (esperado ${esperado})', n; END IF;`);
  };
  chk("es_norma_vigente = true AND NOT (metadata ? 'rol')", cuenta((r) => r.esNormaVigente === 'true' && !r.rol), 'PRIMARY elegibles vigentes');
  chk("es_norma_vigente = true AND metadata->>'rol' = 'CONTEXT'", cuenta((r) => r.esNormaVigente === 'true' && r.rol === 'CONTEXT'), 'CONTEXT vigentes');
  chk("es_norma_vigente = false AND metadata->>'rol' = 'CONTEXT'", cuenta((r) => r.esNormaVigente === 'false'), 'CONTEXT derogados');
  chk("es_norma_vigente IS NULL AND metadata->>'rol' = 'CONTEXT'", cuenta((r) => r.esNormaVigente === 'null'), 'CONTEXT con vigencia NULL');
  w('END');
  w('$do$;');
  w('COMMIT;');
  w('');
  w('-- Verificación (solo lectura).');
  w(`SELECT count(*) AS filas, count(*) FILTER (WHERE revision_pendiente = false AND metadata->>'estado_v' = 'V4') AS visibles_v4,`);
  w("  count(*) FILTER (WHERE es_norma_vigente = true AND NOT (metadata ? 'rol')) AS primary_vigentes,");
  w("  count(*) FILTER (WHERE es_norma_vigente = true AND metadata->>'rol' = 'CONTEXT') AS context_vigentes,");
  w("  count(*) FILTER (WHERE es_norma_vigente = false AND metadata->>'rol' = 'CONTEXT') AS context_derogados,");
  w("  count(*) FILTER (WHERE es_norma_vigente IS NULL AND metadata->>'rol' = 'CONTEXT') AS context_null,");
  w("  count(*) FILTER (WHERE embedding IS NOT NULL) AS con_embedding,");
  w("  count(*) FILTER (WHERE encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido) AS sha_ok");
  w(`FROM public.biblioteca_vectores WHERE ingest_batch = ${lit(p.ingestBatch)};`);
  w('');
  w('-- REVERSIÓN (solo por orden del CLO): borrar el lote completo, que no existía antes de esta ingesta.');
  w(`-- DELETE FROM public.biblioteca_vectores WHERE ingest_batch = ${lit(p.ingestBatch)};`);
  return L.join('\n') + '\n';
}

function main(): void {
  const [rutaTexto, rutaManifiesto, rutaPliego, instrumentoRef, ingestBatch, fuente, salida, tipo = 'codigo'] = process.argv.slice(2);
  if (!rutaTexto || !rutaManifiesto || !rutaPliego || !instrumentoRef || !ingestBatch || !fuente || !salida) throw new Error('uso: ver cabecera del archivo');
  const texto = readFileSync(rutaTexto, 'utf8').replace(/\r\n?/g, '\n');
  const manifiesto: ManifiestoCanonico = JSON.parse(readFileSync(rutaManifiesto, 'utf8'));
  const pliego = readFileSync(rutaPliego, 'utf8');
  const { textoSha, firmante } = validarCanonico({ texto, manifiesto, pliego, instrumentoRef });

  const hashes = new Map(manifiesto.articulos_detalle.map((a) => [`${a.numero}#1`, a.sha256]));
  const meta = {
    texto_origen: 'CANONICO_D3_FUENTES_MIXTAS', transcripcion_sha256: textoSha, text_sha256: textoSha, cotejado_por: firmante,
    // El pliego se cita por ruta, no por hash: su constancia registra los hashes de estos mismos SQL (evita una dependencia circular).
    manifiesto_sha256: sha(readFileSync(rutaManifiesto)), pliego: rutaPliego.replace(/\\/g, '/'),
    procedencia: 'Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad',
  };
  const lote = construirLote({ texto, instrumentoRef, ingestBatch, fuente, fuenteTipo: tipo as FilaLote['fuente_tipo'], meta, hashesPaquete: hashes });
  const det = manifiesto.articulos_detalle;
  if (lote.filas.length !== det.length) throw new Error(`segmentación: ${lote.filas.length} artículos y el manifiesto tiene ${det.length}`);
  if (lote.resumen.divergentes_del_paquete !== 0) throw new Error(`${lote.resumen.divergentes_del_paquete} artículos con sha256 distinto del manifiesto`);
  lote.filas.forEach((f, i) => {
    const a = det[i];
    if (f.num_articulo !== a.numero || f.metadata.article_sha256 !== a.sha256) throw new Error(`fila ${i + 1}: art. ${f.num_articulo} no coincide con el manifiesto (art. ${a.numero})`);
    f.metadata.estado_canonico = a.estado;
    f.metadata.fuente_canonica = a.fuente ?? null;
    if (a.observaciones?.length) f.metadata.observaciones_canonicas = a.observaciones;
  });
  for (const a of det) reglaPorEstado(a.estado); // un estado sin regla detiene antes de escribir

  mkdirSync(salida, { recursive: true });
  writeFileSync(join(salida, 'rows.jsonl'), lote.filas.map((f) => JSON.stringify(f)).join('\n') + '\n');
  writeFileSync(join(salida, 'ingest_exceptions.log'), lote.excepciones.map((e) => `${e.codigo}\tart.${e.articulo}\t${e.detalle}`).join('\n') + '\n');
  // Si el archivo pasa por un editor que convierte LF→CRLF (ya ocurrió en las cargas del D.35-2013 y del D.284-2013), el contenido quedaría con
  // «\r\n» y su sha256 dejaría de coincidir con hash_contenido: se normaliza al final, en el mismo archivo. visibilidad_staging.sql lo verifica.
  const normalizar = `UPDATE public.biblioteca_vectores SET contenido = replace(contenido, E'\\r\\n', E'\\n') WHERE ingest_batch = ${lit(ingestBatch)} AND position(E'\\r' IN contenido) > 0;`;
  writeFileSync(join(salida, 'insert_staging.sql'), `-- SOLO STAGING (aicakncgtuiiuomflkqj). Lote ${ingestBatch} (${instrumentoRef}, texto canónico ${textoSha}). Ocultos, vigencia NULL, embedding NULL.\n${sqlInsert(lote.filas).join('\n\n')}\n\n-- Fin de línea: deja el contenido en LF aunque el editor haya convertido el archivo a CRLF.\n${normalizar}\n`);
  writeFileSync(join(salida, 'visibilidad_staging.sql'), sqlVisibilidad({
    ingestBatch, articulos: det, instrumento: instrumentoRef, total: det.length,
    adjudicacion: `${rutaPliego.replace(/\\/g, '/').split('/').pop()} (D1–D8, 2026-11-18)`, adjudicadoPor: firmante,
  }));
  const porEstado = new Map<string, number>();
  for (const a of det) porEstado.set(a.estado, (porEstado.get(a.estado) ?? 0) + 1);
  writeFileSync(join(salida, 'REPORTE.md'), [
    `# Reporte de ingesta canónica · ${ingestBatch} · ${instrumentoRef}`,
    `- texto canónico ${textoSha} (firma D3: ${firmante})`,
    `- manifiesto ${meta.manifiesto_sha256} · pliego ${meta.pliego} (firmado D1–D8)`,
    `- artículos: ${lote.filas.length} · sha256 iguales al manifiesto: ${lote.filas.length - lote.resumen.divergentes_del_paquete}`,
    `- por estado: ${[...porEstado].map(([k, v]) => `${k}: ${v}`).join(', ')}`,
    `- excepciones informativas: ${lote.resumen.excepciones}`,
  ].join('\n') + '\n');
  console.log(readFileSync(join(salida, 'REPORTE.md'), 'utf8'));
}

if (process.argv[1]?.endsWith('ingesta-canonico-staging.ts')) main();
