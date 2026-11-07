/**
 * lib/legal-retrieval/grupos-articulos.ts
 * Grupos de artículos que responden JUNTOS a una misma pregunta. La búsqueda semántica suele traer solo uno (p. ej. el art. 424 CPC) y el modelo,
 * con razón, cita también los vecinos (425, 426): la guarda R4 lo bloquea porque esos artículos no se recuperaron. Aquí se completa el grupo con
 * la ruta exacta, que ya valida instrumento, vigencia y revisión pendiente. NO relaja ninguna guarda ni declara vigencia: cada artículo agregado
 * pasa por `buscarArticuloExacto` y por `anotarFragmentosClo` como cualquier otro.
 */
import type { FragmentoRAG } from './types';
import { instrumentIdDeFragmento, normalizarNumeroArticulo } from './clo-guards';
import type { InstrumentoNormalizado } from './instrument-identity';

export interface GrupoArticulos {
  id: string;
  instrumento: InstrumentoNormalizado;
  /** Artículo ancla: el grupo se completa solo si ya se recuperó un fragmento PRIMARY de este artículo. */
  ancla: string;
  articulos: readonly string[];
  /** La consulta debe tratar del tema del grupo. */
  tema: RegExp;
}

export const GRUPOS_ARTICULOS: readonly GrupoArticulos[] = Object.freeze([
  {
    id: 'CPC_DEMANDA_424_426',
    instrumento: 'CODIGO_PROCESAL_CIVIL',
    ancla: '424',
    articulos: ['424', '425', '426'],
    // «requisitos de la demanda», «requisitos esenciales de una demanda ordinaria», «contenido/anexos/inadmisión de la demanda».
    tema: /\b(requisitos?|contenido|anexos?|inadmision|inadmitir|admision|presentar|formular|interponer|elementos)\b[^.?!]{0,60}\bdemanda\b|\bdemanda\b[^.?!]{0,40}\b(requisitos?|anexos?|inadmision|inadmitir)\b/i,
  },
]);

const sinAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Artículos que faltan para completar un grupo, dado lo ya recuperado. Vacío si el tema no coincide o no hay ancla PRIMARY vigente. */
export function articulosFaltantesDelGrupo(
  consulta: string,
  recuperados: readonly FragmentoRAG[],
  esPrimaryVigente: (f: FragmentoRAG) => boolean,
): { grupo: GrupoArticulos; faltantes: string[] }[] {
  const q = sinAcentos(consulta);
  const salida: { grupo: GrupoArticulos; faltantes: string[] }[] = [];
  for (const g of GRUPOS_ARTICULOS) {
    if (!g.tema.test(q)) continue;
    const delInstrumento = recuperados.filter((f) => instrumentIdDeFragmento(f) === g.instrumento && esPrimaryVigente(f));
    const tiene = new Set(delInstrumento.map((f) => normalizarNumeroArticulo(f.num_articulo)).filter((a): a is string => a !== null));
    if (!tiene.has(g.ancla)) continue;
    const faltantes = g.articulos.filter((a) => !tiene.has(a));
    if (faltantes.length > 0) salida.push({ grupo: g, faltantes });
  }
  return salida;
}
