#!/usr/bin/env node
/**
 * Carril B — lote formal estructurado (Código + Reglamento).
 *
 * Llama `prepararLoteNotariado` (matriz 1/2/3/4 primera ocurrencia,
 * 11/27 última, OCR de número, anclas sustantivas). Escribe solo
 * artefactos de auditoría en docs/governance/.
 *
 * NETWORK_WRITES = 0. No abre red, no Supabase, no embeddings,
 * no .sql, no SQL_APPLY, no write a corpus. --execute no existe.
 * PDFs oficiales viven en /tmp (no se versionan).
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { extraerTexto } from './ingestar-ley';
import {
  ANCLA_ART2_CODIGO,
  ANCLA_ART3_CODIGO,
  ARTICULOS_REFORMA_77_2006,
  ARTICULOS_TRAMITE_77_2006,
  IDENTIDAD_CODIGO_NOTARIADO,
  IDENTIDAD_REGLAMENTO_NOTARIADO,
  NETWORK_WRITES,
  prepararLoteNotariado,
  type IdentidadNotarial,
  type LoteNotariado,
} from './ingesta-notariado';

export const MODO_LOTE_FORMAL = 'INGESTA_FORMAL_NOTARIADO_LOTE' as const;
export const BASELINE_CARRIL_B = 'd569790' as const;

export interface FuenteLoteFormal {
  clave: 'codigo' | 'reglamento';
  path: string;
  provenance: string;
  identidad: IdentidadNotarial;
}

export interface RegistroLoteFormal {
  id: string;
  num_articulo: string;
  fuente: string;
  materia: string;
  jurisdiccion: string;
  fuente_tipo: string;
  coleccion: string;
  es_norma_vigente: false;
  contenido: string;
  contenido_sha256: string;
  metadata: Record<string, unknown>;
}

export interface InstrumentoLoteFormal {
  instrumento: string;
  fuenteIdentidad: string;
  idPrefix: string;
  source: {
    path: string;
    sha256: string;
    bytes: number;
    pages: number | null;
    provenance: string;
    extractedChars: number;
  };
  counts: {
    candidatos: number;
    aceptados: number;
    rechazados: number;
    registros: number;
    colapsadosIdenticos: number;
    adjudicadosReforma77: number;
    adjudicadosTramite77: number;
    ocrNormalizados: number;
  };
  articulos: string[];
  ids: string[];
  colapsadosIdenticos: string[];
  adjudicadosReforma77: string[];
  adjudicadosTramite77: string[];
  ocrNormalizados: string[];
  gapsDocumentales: LoteNotariado['gapsDocumentales'];
  manifest: LoteNotariado['manifest'];
  anclasSustantivas?: {
    articulo2: { id: string; coincideCodigo2005: boolean; prefijo: string };
    articulo3: { id: string; coincideCodigo2005: boolean; prefijo: string };
  };
  registros: RegistroLoteFormal[];
}

export interface InformeLoteFormal {
  modo: typeof MODO_LOTE_FORMAL;
  carril: 'B';
  baseline: typeof BASELINE_CARRIL_B;
  guardianAnclas: 'verificarAnclasSustantivasNotariado';
  matrizCanonica: {
    primeraOcurrencia_353_2005: readonly string[];
    ultimaOcurrencia_77_2006: readonly string[];
  };
  sqlApply: false;
  corpusWrite: false;
  vigenciaDeclarada: false;
  productionIngestion: false;
  featureFlagActivation: false;
  networkWrites: 0;
  instrumentos: InstrumentoLoteFormal[];
}

function sha256Archivo(ruta: string): { sha256: string; bytes: number } {
  const blob = readFileSync(ruta);
  return { sha256: createHash('sha256').update(blob).digest('hex'), bytes: blob.length };
}

function sha256Texto(texto: string): string {
  return createHash('sha256').update(texto, 'utf8').digest('hex');
}

function paginasPdf(ruta: string): number | null {
  try {
    const info = execFileSync('pdfinfo', [ruta], { encoding: 'utf8' });
    const m = info.match(/^Pages:\s+(\d+)/m);
    return m ? Number.parseInt(m[1], 10) : null;
  } catch {
    return null;
  }
}

function prefijo(texto: string, n = 160): string {
  return texto.replace(/\s+/g, ' ').trim().slice(0, n);
}

function serializarRegistros(lote: LoteNotariado): RegistroLoteFormal[] {
  return lote.registros.map((r) => {
    if (r.es_norma_vigente) {
      throw new Error(`registro ${r.id} declaró vigencia — prohibido`);
    }
    return {
      id: r.id,
      num_articulo: r.num_articulo,
      fuente: r.fuente,
      materia: r.materia,
      jurisdiccion: r.jurisdiccion,
      fuente_tipo: r.fuente_tipo,
      coleccion: r.coleccion,
      es_norma_vigente: false,
      contenido: r.contenido,
      contenido_sha256: sha256Texto(r.contenido),
      metadata: r.metadata,
    };
  });
}

function anclasCodigo(registros: RegistroLoteFormal[]): InstrumentoLoteFormal['anclasSustantivas'] {
  const art2 = registros.find((r) => r.num_articulo === '2');
  const art3 = registros.find((r) => r.num_articulo === '3');
  if (!art2 || !art3) {
    throw new Error('lote Código sin arts. 2 o 3 — anclas no verificables');
  }
  return {
    articulo2: {
      id: art2.id,
      coincideCodigo2005: ANCLA_ART2_CODIGO.test(art2.contenido),
      prefijo: prefijo(art2.contenido),
    },
    articulo3: {
      id: art3.id,
      coincideCodigo2005: ANCLA_ART3_CODIGO.test(art3.contenido),
      prefijo: prefijo(art3.contenido),
    },
  };
}

export function construirInstrumentoLote(
  texto: string,
  identidad: IdentidadNotarial,
  source: InstrumentoLoteFormal['source'],
): InstrumentoLoteFormal {
  const lote = prepararLoteNotariado(texto, identidad);
  const registros = serializarRegistros(lote);
  return {
    instrumento: lote.identidad.instrumentoNormalizado,
    fuenteIdentidad: lote.identidad.opts.fuente,
    idPrefix: lote.identidad.opts.idPrefix,
    source,
    counts: {
      candidatos: lote.candidatos.length,
      aceptados: lote.aceptados.length,
      rechazados: lote.rechazados.length,
      registros: registros.length,
      colapsadosIdenticos: lote.colapsadosIdenticos.length,
      adjudicadosReforma77: lote.adjudicadosReforma77.length,
      adjudicadosTramite77: lote.adjudicadosTramite77.length,
      ocrNormalizados: lote.ocrNormalizados.length,
    },
    articulos: lote.registros.map((r) => r.num_articulo),
    ids: lote.registros.map((r) => r.id),
    colapsadosIdenticos: lote.colapsadosIdenticos,
    adjudicadosReforma77: lote.adjudicadosReforma77,
    adjudicadosTramite77: lote.adjudicadosTramite77,
    ocrNormalizados: lote.ocrNormalizados,
    gapsDocumentales: lote.gapsDocumentales,
    manifest: lote.manifest,
    anclasSustantivas: identidad.clave === 'codigo' ? anclasCodigo(registros) : undefined,
    registros,
  };
}

export function informeMarkdown(sesion: InformeLoteFormal): string {
  const lineas = [
    '# Lote formal — Código y Reglamento del Notariado',
    '',
    'Carril B. Artefacto de auditoría generado con `prepararLoteNotariado`.',
    'Sin `SQL_APPLY`, sin write a corpus, sin embeddings, sin red.',
    '',
    `- Modo: \`${sesion.modo}\``,
    `- Carril: \`${sesion.carril}\``,
    `- Baseline: \`${sesion.baseline}\``,
    `- Guardián: \`${sesion.guardianAnclas}\``,
    `- Matriz primera ocurrencia (353-2005): ${sesion.matrizCanonica.primeraOcurrencia_353_2005.join(', ')}`,
    `- Matriz última ocurrencia (77-2006): ${sesion.matrizCanonica.ultimaOcurrencia_77_2006.join(', ')}`,
    '',
    '## Barreras',
    '',
    `- \`networkWrites = ${sesion.networkWrites}\``,
    `- \`sqlApply = ${sesion.sqlApply}\``,
    `- \`corpusWrite = ${sesion.corpusWrite}\``,
    `- \`vigenciaDeclarada = ${sesion.vigenciaDeclarada}\``,
    `- \`productionIngestion = ${sesion.productionIngestion}\``,
    `- \`featureFlagActivation = ${sesion.featureFlagActivation}\``,
    `- \`es_norma_vigente = false\` en todos los registros`,
    '',
  ];

  for (const i of sesion.instrumentos) {
    lineas.push(`## ${i.instrumento}`);
    lineas.push('');
    lineas.push(`- Identidad: \`${i.fuenteIdentidad}\``);
    lineas.push(`- id-prefix: \`${i.idPrefix}\``);
    lineas.push(`- Fuente: \`${i.source.path}\``);
    lineas.push(`- SHA-256 fuente: \`${i.source.sha256}\``);
    lineas.push(`- Bytes / páginas: ${i.source.bytes} / ${i.source.pages ?? 'n/d'}`);
    lineas.push(`- Caracteres extraídos (PDF no versionado): ${i.source.extractedChars}`);
    lineas.push(`- Provenance: ${i.source.provenance}`);
    lineas.push(
      `- Candidatos / aceptados / rechazados: ${i.counts.candidatos} / ${i.counts.aceptados} / ${i.counts.rechazados}`,
    );
    lineas.push(`- Registros del lote: **${i.counts.registros}**`);
    lineas.push(`- Colapsados idénticos: ${i.colapsadosIdenticos.join(', ') || '(ninguno)'}`);
    lineas.push(`- Reforma 77-2006 (última ocurrencia): ${i.adjudicadosReforma77.join(', ') || '(ninguno)'}`);
    lineas.push(`- Trámite 77-2006 (primera ocurrencia): ${i.adjudicadosTramite77.join(', ') || '(ninguno)'}`);
    lineas.push(`- OCR número O→0: ${i.ocrNormalizados.join(', ') || '(ninguno)'}`);
    lineas.push(
      `- Gaps documentales: ${i.gapsDocumentales.map((g) => `${g.numArticulo} (${g.codigo})`).join(', ') || '(ninguno)'}`,
    );
    lineas.push(`- Artículos: ${i.articulos.join(', ')}`);
    lineas.push('');
    lineas.push('### IDs y hash de contenido');
    lineas.push('');
    lineas.push('| Artículo | ID | SHA-256 contenido |');
    lineas.push('|---|---|---|');
    for (const r of i.registros) {
      lineas.push(`| ${r.num_articulo} | \`${r.id}\` | \`${r.contenido_sha256}\` |`);
    }
    lineas.push('');

    if (i.anclasSustantivas) {
      const art2 = i.registros.find((r) => r.num_articulo === '2');
      const art3 = i.registros.find((r) => r.num_articulo === '3');
      lineas.push('### Anclas sustantivas (texto exacto del lote)');
      lineas.push('');
      lineas.push(
        `- Art. 2 id=\`${i.anclasSustantivas.articulo2.id}\` coincide 353-2005: **${i.anclasSustantivas.articulo2.coincideCodigo2005}**`,
      );
      lineas.push(
        `- Art. 3 id=\`${i.anclasSustantivas.articulo3.id}\` coincide 353-2005: **${i.anclasSustantivas.articulo3.coincideCodigo2005}**`,
      );
      lineas.push('');
      if (art2) {
        lineas.push('#### Artículo 2 canónico');
        lineas.push('');
        lineas.push('```');
        lineas.push(art2.contenido.trim());
        lineas.push('```');
        lineas.push('');
      }
      if (art3) {
        lineas.push('#### Artículo 3 canónico');
        lineas.push('');
        lineas.push('```');
        lineas.push(art3.contenido.trim());
        lineas.push('```');
        lineas.push('');
      }
    }
  }

  lineas.push('## Invariantes');
  lineas.push('');
  lineas.push('```');
  lineas.push('NETWORK_WRITES = 0');
  lineas.push('CORPUS_WRITE = NO');
  lineas.push('SQL_APPLY = NO');
  lineas.push('es_norma_vigente = false');
  lineas.push('INGESTED ≠ VERIFIED ≠ VIGENTE');
  lineas.push('```');
  lineas.push('');
  return lineas.join('\n');
}

export function fuentesLoteFormal(): FuenteLoteFormal[] {
  return [
    {
      clave: 'codigo',
      path: process.env.NOTARIADO_CODIGO_PDF ?? '/tmp/notarial-sources/drive-Codigo-del-Notariado.pdf',
      provenance:
        'Drive Codigo-del-Notariado.pdf (1XxG0go0Ajoa4_jjmmroHXBtfJiq2w3ke) bit-idéntico a https://www.notarioshonduras.org/wp-content/uploads/2017/01/Codigo-del-Notariado.pdf — CEDIJ, Decreto 353-2005',
      identidad: IDENTIDAD_CODIGO_NOTARIADO,
    },
    {
      clave: 'reglamento',
      path: process.env.NOTARIADO_REGLAMENTO_PDF ?? '/tmp/notarial-sources/drive-REGLAMENTO-DEL-CODIGO-DEL-NOTARIADO.pdf',
      provenance:
        'Drive REGLAMENTO-DEL-CODIGO-DEL-NOTARIADO.pdf (1CxIW_vLZZUD0W0-OsYgALabkEBc432Q_) — Resolución PCSJ-17-2012. El PDF del Poder Judicial (12.7 MiB) es escaneo sin texto extraíble y no se usó.',
      identidad: IDENTIDAD_REGLAMENTO_NOTARIADO,
    },
  ];
}

export function generarSesionLoteFormal(): InformeLoteFormal {
  const fuentes = fuentesLoteFormal();
  for (const f of fuentes) {
    if (!existsSync(f.path)) {
      throw new Error(
        `fuente primaria ausente: ${f.path}. Este generador es local y read-only; no descarga ni escribe corpus.`,
      );
    }
  }

  const instrumentos = fuentes.map((f) => {
    const { sha256, bytes } = sha256Archivo(f.path);
    const texto = extraerTexto(f.path);
    return construirInstrumentoLote(
      texto,
      { ...f.identidad, opts: { ...f.identidad.opts, input: f.path } },
      {
        path: basename(f.path),
        sha256,
        bytes,
        pages: paginasPdf(f.path),
        provenance: f.provenance,
        extractedChars: texto.length,
      },
    );
  });

  return {
    modo: MODO_LOTE_FORMAL,
    carril: 'B',
    baseline: BASELINE_CARRIL_B,
    guardianAnclas: 'verificarAnclasSustantivasNotariado',
    matrizCanonica: {
      primeraOcurrencia_353_2005: ARTICULOS_TRAMITE_77_2006,
      ultimaOcurrencia_77_2006: ARTICULOS_REFORMA_77_2006,
    },
    sqlApply: false,
    corpusWrite: false,
    vigenciaDeclarada: false,
    productionIngestion: false,
    featureFlagActivation: false,
    networkWrites: NETWORK_WRITES,
    instrumentos,
  };
}

function main(): void {
  if (NETWORK_WRITES !== 0) {
    throw new Error('NETWORK_WRITES debe ser 0');
  }
  const sesion = generarSesionLoteFormal();
  const jsonOut =
    process.env.NOTARIADO_LOTE_JSON ?? 'docs/governance/exequatur-ingesta-notariado-lote-formal.json';
  const mdOut =
    process.env.NOTARIADO_LOTE_MD ?? 'docs/governance/exequatur-ingesta-notariado-lote-formal.md';
  mkdirSync(dirname(jsonOut), { recursive: true });
  writeFileSync(jsonOut, `${JSON.stringify(sesion, null, 2)}\n`, 'utf8');
  writeFileSync(mdOut, informeMarkdown(sesion), 'utf8');
  console.log(`Lote JSON: ${jsonOut}`);
  console.log(`Lote MD: ${mdOut}`);
  for (const i of sesion.instrumentos) {
    console.log(
      `${i.instrumento}: registros=${i.counts.registros} reforma=[${i.adjudicadosReforma77.join(',')}] tramite=[${i.adjudicadosTramite77.join(',')}] ocr=[${i.ocrNormalizados.join(',')}] gaps=[${i.gapsDocumentales.map((g) => g.numArticulo).join(',')}]`,
    );
  }
}

if (process.argv[1] && process.argv[1].endsWith('generar-lote-formal-notariado.ts')) {
  try {
    main();
  } catch (err) {
    console.error('FALLÓ:', err);
    process.exit(1);
  }
}
