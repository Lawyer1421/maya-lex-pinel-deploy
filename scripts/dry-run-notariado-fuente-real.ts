#!/usr/bin/env node
/**
 * Dry-run de fuente real (local, read-only).
 * No embeddings, no .sql, no SQL_APPLY, no write a corpus.
 * Escribe solo el informe de SHA-256 y brechas de parseo.
 *
 * No versiona PDFs ni el texto legal extraído.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { extraerTexto } from './ingestar-ley';
import {
  IDENTIDAD_CODIGO_NOTARIADO,
  IDENTIDAD_REGLAMENTO_NOTARIADO,
  analizarFuenteNotariado,
  type IdentidadNotarial,
  type InformeDryRunNotariado,
} from './ingesta-notariado';

interface FuenteReal {
  clave: 'codigo' | 'reglamento';
  path: string;
  provenance: string;
  identidad: IdentidadNotarial;
}

export interface FuenteDescartada {
  label: string;
  path: string;
  sha256: string | null;
  bytes: number | null;
  pages: number | null;
  motivo: string;
}

export interface InformeSesionDryRun {
  modo: 'NOTARIAL_REAL_SOURCE_DRY_RUN';
  sqlApply: false;
  corpusWrite: false;
  vigenciaDeclarada: false;
  productionIngestion: false;
  featureFlagActivation: false;
  instrumentos: InformeDryRunNotariado[];
  fuentesDescartadas: FuenteDescartada[];
  verificaciones: {
    codigoDriveIgualColegioNotarios: boolean | null;
  };
}

function sha256Archivo(ruta: string): { sha256: string; bytes: number } {
  const blob = readFileSync(ruta);
  return { sha256: createHash('sha256').update(blob).digest('hex'), bytes: blob.length };
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

function describirDescartada(ruta: string, label: string, motivo: string): FuenteDescartada {
  if (!existsSync(ruta)) {
    return {
      label,
      path: basename(ruta),
      sha256: null,
      bytes: null,
      pages: null,
      motivo: `${motivo} (archivo ausente en este entorno)`,
    };
  }
  const { sha256, bytes } = sha256Archivo(ruta);
  return {
    label,
    path: basename(ruta),
    sha256,
    bytes,
    pages: paginasPdf(ruta),
    motivo,
  };
}

function hashSiExiste(ruta: string): string | null {
  if (!existsSync(ruta)) return null;
  return sha256Archivo(ruta).sha256;
}

function informeMarkdown(sesion: InformeSesionDryRun): string {
  const lineas = [
    '# Dry-run fuente real — leyes notariales',
    '',
    'Local, read-only. Sin `SQL_APPLY`, sin write a corpus, sin embeddings, sin texto legal versionado.',
    '',
    `Modo: \`${sesion.modo}\``,
    '',
  ];
  for (const i of sesion.instrumentos) {
    lineas.push(`## ${i.instrumento}`);
    lineas.push('');
    lineas.push(`- Identidad: \`${i.fuenteIdentidad}\``);
    lineas.push(`- id-prefix: \`${i.idPrefix}\``);
    lineas.push(`- Fuente: \`${basename(i.source.path)}\``);
    lineas.push(`- SHA-256: \`${i.source.sha256}\``);
    lineas.push(`- Bytes: ${i.source.bytes}`);
    lineas.push(`- Páginas: ${i.source.pages ?? 'n/d'}`);
    lineas.push(`- Caracteres extraídos (no versionados): ${i.source.extractedChars}`);
    lineas.push(`- Provenance: ${i.source.provenance}`);
    lineas.push(`- Candidatos / aceptados / rechazados: ${i.counts.candidatos} / ${i.counts.aceptados} / ${i.counts.rechazados}`);
    lineas.push(`- Finales únicos: ${i.counts.finalesUnicos}`);
    lineas.push(`- Colapsados idénticos: ${i.colapsadosIdenticos.join(', ') || '(ninguno)'}`);
    lineas.push(
      `- Divergentes (no adjudicados): ${i.divergentes.map((d) => `${d.numArticulo}×${d.ocurrencias}`).join(', ') || '(ninguno)'}`,
    );
    lineas.push(`- Adjudicados 77-2006 (última ocurrencia): ${i.adjudicadosReforma77.join(', ') || '(ninguno)'}`);
    lineas.push(`- OCR número O→0: ${i.ocrNormalizados.join(', ') || '(ninguno)'}`);
    lineas.push(`- Huecos de numeración: ${i.huecosNumeracion.join(', ') || '(ninguno)'}`);
    lineas.push(`- Currículo faltante: ${i.curriculoFaltantes.join(', ') || '(ninguno)'}`);
    lineas.push(`- Artículos aceptados: ${i.articulosAceptados.join(', ')}`);
    lineas.push(`- Hallazgos OCR \`O\` por \`0\`: ${i.hallazgos.ocrLetraOPorCero.join(', ') || '(ninguno)'}`);
    lineas.push(`- Huecos por divergente (no adjudicados): ${i.hallazgos.huecosPorDivergente.join(', ') || '(ninguno)'}`);
    lineas.push(`- Huecos por rechazo de encabezado: ${i.hallazgos.huecosPorRechazo.join(', ') || '(ninguno)'}`);
    lineas.push(`- Huecos sin candidato (patrón): ${i.hallazgos.huecosSinCandidato.join(', ') || '(ninguno)'}`);
    lineas.push(
      `- Currículo bloqueado por divergente: ${i.hallazgos.curriculoBloqueadoPorDivergente.join(', ') || '(ninguno)'}`,
    );
    lineas.push(`- Currículo ausente (sin candidato): ${i.hallazgos.curriculoAusente.join(', ') || '(ninguno)'}`);
    if (i.rechazados.length > 0) {
      lineas.push('- Rechazados (snippet de encabezado ≤60, no cuerpo legal):');
      for (const r of i.rechazados) {
        lineas.push(`  - ${r.numArticulo}: ${r.snippet}`);
      }
    }
    lineas.push('');
  }

  lineas.push('## Fuentes descartadas (hash only)');
  lineas.push('');
  for (const f of sesion.fuentesDescartadas) {
    lineas.push(`- ${f.label}: \`${f.path}\``);
    lineas.push(`  - SHA-256: \`${f.sha256 ?? 'n/d'}\``);
    lineas.push(`  - Bytes / páginas: ${f.bytes ?? 'n/d'} / ${f.pages ?? 'n/d'}`);
    lineas.push(`  - Motivo: ${f.motivo}`);
  }
  lineas.push('');
  lineas.push('## Verificaciones');
  lineas.push('');
  lineas.push(
    `- Código Drive ≡ Colegio de Notarios (web): ${sesion.verificaciones.codigoDriveIgualColegioNotarios ?? 'n/d'}`,
  );
  lineas.push('');
  lineas.push('## Barreras');
  lineas.push('');
  lineas.push('- `vigenciaDeclarada = false`');
  lineas.push('- `corpusWrite = false`');
  lineas.push('- `sqlApply = false`');
  lineas.push('- `productionIngestion = false`');
  lineas.push('- `featureFlagActivation = false`');
  lineas.push('');
  return lineas.join('\n');
}

function main(): void {
  const fuentes: FuenteReal[] = [
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

  for (const f of fuentes) {
    if (!existsSync(f.path)) {
      throw new Error(`fuente primaria ausente: ${f.path}. Este dry-run es local y read-only; no descarga ni escribe corpus.`);
    }
  }

  const instrumentos: InformeDryRunNotariado[] = fuentes.map((f) => {
    const { sha256, bytes } = sha256Archivo(f.path);
    const texto = extraerTexto(f.path);
    return analizarFuenteNotariado(
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

  const codigoSha = instrumentos.find((i) => i.instrumento === 'CODIGO_NOTARIADO')?.source.sha256 ?? null;
  const colegioSha = hashSiExiste(
    process.env.NOTARIADO_CODIGO_WEB_PDF ?? '/tmp/notarial-sources/web-Codigo-del-Notariado-notarioshonduras.pdf',
  );

  const sesion: InformeSesionDryRun = {
    modo: 'NOTARIAL_REAL_SOURCE_DRY_RUN',
    sqlApply: false,
    corpusWrite: false,
    vigenciaDeclarada: false,
    productionIngestion: false,
    featureFlagActivation: false,
    instrumentos,
    fuentesDescartadas: [
      describirDescartada(
        process.env.NOTARIADO_CODIGO_AMHON_PDF ?? '/tmp/notarial-sources/web-Codigo-del-Notariado-amhon.pdf',
        'Código AMHON (web)',
        'Escaneo sin texto extraíble. No se parseó.',
      ),
      describirDescartada(
        process.env.NOTARIADO_REGLAMENTO_PJ_PDF ?? '/tmp/notarial-sources/web-Reglamento-poderjudicial.pdf',
        'Reglamento Poder Judicial (web)',
        'Escaneo 12.7 MiB sin texto extraíble. No se parseó.',
      ),
    ],
    verificaciones: {
      codigoDriveIgualColegioNotarios: codigoSha !== null && colegioSha !== null ? codigoSha === colegioSha : null,
    },
  };

  const jsonOut =
    process.env.NOTARIADO_REPORT_JSON ?? 'docs/governance/exequatur-ingesta-notariado-dry-run-fuente-real.json';
  const mdOut =
    process.env.NOTARIADO_REPORT_MD ?? 'docs/governance/exequatur-ingesta-notariado-dry-run-fuente-real.md';
  mkdirSync(dirname(jsonOut), { recursive: true });
  writeFileSync(jsonOut, `${JSON.stringify(sesion, null, 2)}\n`, 'utf8');
  writeFileSync(mdOut, informeMarkdown(sesion), 'utf8');
  console.log(`Informe JSON: ${jsonOut}`);
  console.log(`Informe MD: ${mdOut}`);
  for (const i of instrumentos) {
    console.log(
      `${i.instrumento}: aceptados=${i.counts.finalesUnicos} huecos=${i.huecosNumeracion.length} divergentes=${i.counts.divergentes} curriculoFaltante=${i.curriculoFaltantes.join(',') || '0'}`,
    );
  }
}

if (process.argv[1] && process.argv[1].endsWith('dry-run-notariado-fuente-real.ts')) {
  try {
    main();
  } catch (err) {
    console.error('FALLÓ:', err);
    process.exit(1);
  }
}
