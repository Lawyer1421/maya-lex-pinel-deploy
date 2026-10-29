/**
 * lib/ai-gateway/shadow/evidence-classification.ts
 * PR-G3: transporta al gateway la clasificación AUTÉNTICA que producción ya aplica a un fragmento.
 *
 * Producción hoy NO produce PRIMARY/CONTEXT (resolverVersion no está cableado al runtime). Lo que sí existe:
 *  - la etiqueta que formatearContextoRAG imprime para cada fragmento, y
 *  - construirCitas, que decide cuáles son citables.
 * Aquí no se duplica esa lógica: se LLAMAN esas mismas funciones y se traduce su resultado. Si la etiqueta no
 * se reconoce, el fragmento queda DESCONOCIDA y no citable (fail-closed). El rol queda siempre en null.
 */
import type { FragmentoRAG } from '../../legal-retrieval/types';
import { construirCitas, formatearContextoRAG } from '../../legal-retrieval/evidence-engine';
import type { ClasificacionProduccion } from './types';

const ETIQUETA = /^\[FRAGMENTO 1(?: — Art\. [^\[]*?)? \[(.+?)\] \| similitud/m;

/** Traduce la etiqueta de producción a la clasificación del gateway. */
export function clasificacionDesdeEtiqueta(etiqueta: string): ClasificacionProduccion {
  if (etiqueta.startsWith('FUENTE DOCTRINAL / COMENTARIO ACADÉMICO')) return 'DOCTRINAL_NO_VINCULANTE';
  if (etiqueta === 'NORMA VIGENTE HONDURAS') return 'NORMA_VIGENTE_HONDURAS';
  if (etiqueta.startsWith('DOCTRINA/JURISPRUDENCIA COMPARADA')) return 'COMPARADA';
  if (etiqueta.startsWith('DOCTRINA/JURISPRUDENCIA — NO ES NORMA VIGENTE')) return 'DOCTRINA_JURISPRUDENCIA';
  if (etiqueta.startsWith('NO VIGENTE')) return 'NO_VIGENTE';
  if (etiqueta.startsWith('FUENTE SIN CLASIFICAR')) return 'SIN_CLASIFICAR';
  // Salvaguardas CLO: un fragmento CONTEXT («CONTEXTO (…) — NO CITAR COMO NORMA») no es norma ni está clasificado como tal.
  if (etiqueta.startsWith('CONTEXTO (')) return 'SIN_CLASIFICAR';
  return 'DESCONOCIDA';
}

export interface ClasificacionFragmento {
  clasificacionProduccion: ClasificacionProduccion;
  citable: boolean;
}

export function clasificarFragmento(f: FragmentoRAG): ClasificacionFragmento {
  // El contenido no interviene en la etiqueta; se omite para que el texto del fragmento no pueda alterar el análisis.
  const solo: FragmentoRAG = { ...f, contenido: '', relevancia: 0 };
  const salida = formatearContextoRAG({ fragmentos: [solo], articulos_encontrados: [], backend: 'supabase' });
  const m = ETIQUETA.exec(salida);
  const clasificacionProduccion = m ? clasificacionDesdeEtiqueta(m[1]) : 'DESCONOCIDA';
  const citable = construirCitas([solo]).length === 1;
  return { clasificacionProduccion, citable };
}
