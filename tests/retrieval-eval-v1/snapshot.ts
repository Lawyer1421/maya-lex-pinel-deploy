import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { LabRow } from '@/lib/legal-retrieval/lab/types';

/**
 * Snapshot de evaluación v1. Fuente única: el lote formal del Notariado
 * versionado en el repositorio (commit ef6c151). Se verifica el sha256 del
 * archivo antes de usarlo; cualquier cambio lo invalida.
 *
 * El sha256 se calcula sobre el contenido normalizado a LF. Con core.autocrlf
 * el checkout en Windows escribe CRLF, mientras el blob en git tiene LF; el
 * hash de bytes crudos dependía de la plataforma. El contenido no cambia.
 */

export const RUTA_ARTEFACTO = 'docs/governance/exequatur-ingesta-notariado-lote-formal.json';
export const SHA256_ARTEFACTO = '5b2870755310330038cb46a3ba7c7d9900c4e99e8b031e62e4bc1a43f33b7995';

export function sha256Normalizado(bytes: Buffer): string {
  return createHash('sha256').update(bytes.toString('utf8').replace(/\r\n/g, '\n')).digest('hex');
}

/**
 * Vigencia adjudicada en el registro CA-01 (MAYALEX_CANONICAL_ADJUDICATION_REGISTER_V1):
 * es_norma_vigente=false para estos artículos del Código. Los demás del Código
 * quedan vigentes en el modo CA01. Reglamento: sin vigencia documentada → null.
 */
export const FALSOS_CA01_CODIGO = ['11', '27', '72', '73', '84', '87', '93'] as const;

export type ModoVigencia = 'DECLARADO' | 'CA01';

export interface RegistroSnapshot extends LabRow {
  instrumento: 'CODIGO_NOTARIADO' | 'REGLAMENTO_NOTARIADO';
  vigencia_declarada_en_lote: boolean;
}

interface RegistroLote {
  id: string;
  num_articulo: string;
  fuente: string;
  materia: string;
  jurisdiccion: string;
  fuente_tipo: string;
  es_norma_vigente: string;
  contenido: string;
  contenido_sha256: string;
}

export function cargarSnapshot(modo: ModoVigencia): { filas: RegistroSnapshot[]; sha256: string } {
  const bytes = readFileSync(join(process.cwd(), RUTA_ARTEFACTO));
  const sha256 = sha256Normalizado(bytes);
  if (sha256 !== SHA256_ARTEFACTO) {
    throw new Error(`Snapshot invalidado: sha256 ${sha256} ≠ ${SHA256_ARTEFACTO}`);
  }
  const lote = JSON.parse(bytes.toString('utf8')) as { instrumentos: { instrumento: 'CODIGO_NOTARIADO' | 'REGLAMENTO_NOTARIADO'; registros: RegistroLote[] }[] };

  const filas: RegistroSnapshot[] = [];
  for (const ins of lote.instrumentos) {
    for (const r of ins.registros) {
      const declarada = r.es_norma_vigente === 'True';
      let vigencia: boolean | null = null;
      if (modo === 'CA01' && ins.instrumento === 'CODIGO_NOTARIADO') {
        vigencia = !(FALSOS_CA01_CODIGO as readonly string[]).includes(r.num_articulo);
      }
      filas.push({
        id: r.id,
        contenido: r.contenido,
        num_articulo: r.num_articulo,
        fuente: r.fuente,
        fuente_tipo: r.fuente_tipo,
        jurisdiccion: r.jurisdiccion,
        es_norma_vigente: vigencia,
        materia: r.materia,
        instrumento: ins.instrumento,
        vigencia_declarada_en_lote: declarada,
      });
    }
  }
  filas.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { filas, sha256 };
}
