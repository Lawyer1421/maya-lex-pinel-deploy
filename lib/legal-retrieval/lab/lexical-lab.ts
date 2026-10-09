import { tieneEncabezadoArticulo } from '../exact-resolver';
import {
  bigramas,
  identificadorDecreto,
  interseccionTamano,
  tokensSignificativos,
} from './normalize';
import type { LabRow } from './types';

export const LEXICAL_LAB_NAME = 'lexical-lab' as const;

export const LEXICAL_SIGNAL_WEIGHTS = {
  articulo_exacto: 0.35,
  cobertura_tokens: 0.25,
  frases_legales: 0.2,
  fuente: 0.1,
  decreto: 0.05,
  encabezado: 0.05,
} as const;

/** Coincidencias de un solo token débil no constituyen evidencia léxica. */
export const LEXICAL_MIN_SCORE = 0.2;

export interface LexicalHit {
  id: string;
  score: number;
}

export interface LexicalAdapter {
  readonly nombre: string;
  buscar(textoConsulta: string, filas: readonly LabRow[]): LexicalHit[];
}

const RE_ARTICULO = /\bart(?:[ií]culo|\.)?\s*(\d+)\b/i;

function redondear(valor: number): number {
  return Math.round(valor * 1e6) / 1e6;
}

function compararIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export class LexicalLabAdapter implements LexicalAdapter {
  readonly nombre = LEXICAL_LAB_NAME;

  buscar(textoConsulta: string, filas: readonly LabRow[]): LexicalHit[] {
    const qTokens = tokensSignificativos(textoConsulta);
    const qBigramas = bigramas(textoConsulta);
    const qArticulo = RE_ARTICULO.exec(textoConsulta)?.[1] ?? null;
    const qDecreto = identificadorDecreto(textoConsulta);
    const hits: LexicalHit[] = [];

    for (const fila of filas) {
      const fuente = fila.fuente ?? '';
      const encabezado = fila.contenido.split('\n')[0] ?? '';

      const senales = {
        articulo_exacto:
          qArticulo !== null &&
          fila.num_articulo === qArticulo &&
          tieneEncabezadoArticulo(fila.contenido, qArticulo)
            ? 1
            : 0,
        cobertura_tokens: qTokens.size
          ? interseccionTamano(qTokens, tokensSignificativos(fila.contenido)) / qTokens.size
          : 0,
        frases_legales: qBigramas.size
          ? interseccionTamano(qBigramas, bigramas(fila.contenido)) / qBigramas.size
          : 0,
        fuente: qTokens.size
          ? interseccionTamano(qTokens, tokensSignificativos(fuente)) / qTokens.size
          : 0,
        decreto:
          qDecreto !== null && identificadorDecreto(`${fila.contenido} ${fuente}`) === qDecreto
            ? 1
            : 0,
        encabezado: qTokens.size
          ? interseccionTamano(qTokens, tokensSignificativos(encabezado)) / qTokens.size
          : 0,
      };

      let score = 0;
      for (const clave of Object.keys(LEXICAL_SIGNAL_WEIGHTS) as (keyof typeof LEXICAL_SIGNAL_WEIGHTS)[]) {
        score += LEXICAL_SIGNAL_WEIGHTS[clave] * senales[clave];
      }
      if (score >= LEXICAL_MIN_SCORE) hits.push({ id: fila.id, score: redondear(score) });
    }

    hits.sort((a, b) => b.score - a.score || compararIds(a.id, b.id));
    return hits;
  }
}
