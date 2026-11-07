/**
 * lib/legal-os/skills/corpus-bridge.ts
 * PUENTE DE RECUPERACIÓN DEL CORPUS para las plantillas FIRAC. Es la ÚNICA capa autorizada a producir (a) evidencia PRIMARY que respalda la norma de una
 * casilla y (b) el resultado «VERIFICADO_CORPUS» de una base normativa. Ninguna otra capa (UI, modelo, evaluador, extractor de hechos, persona editando
 * JSON) puede fabricarlas. Cuatro candados independientes:
 *
 *  1. SELLO EN EJECUCIÓN. Todo lo que sale de aquí está congelado y registrado en un `WeakSet` privado de este módulo. `esSellado(x)` es verdadero solo
 *     para objetos que ESTE módulo creó: un objeto copiado (spread, JSON, structuredClone) o escrito a mano no está en el conjunto y se rechaza.
 *  2. TIPOS NOMINALES. `EvidenciaSellada` y `VerificacionBase` llevan una marca de tipo no exportada, así que TypeScript no deja construirlas con un literal.
 *  3. ESQUEMA. `firac-schema.ts` no admite «verificado contra el corpus» como valor almacenable (solo PENDIENTE_VERIFICACION y CONFIRMADO_POR_TITULAR).
 *  4. GUARDA ESTÁTICA. `tests/legal-os-firac-bridge-guard.test.ts` falla si el literal del resultado verificado o la función de sellado aparecen en otro archivo.
 *
 * Qué verifica (fail-closed) para cada base normativa de cada casilla, por artículo citado:
 *  - el recuperador (inyectado; este módulo no hace E/S) devuelve fragmentos de ese instrumento y artículo;
 *  - el fragmento cumple el MISMO criterio compartido de R3 que ya usan la recuperación y Luna (`fragmentoCumpleR3`: PRIMARY recalculado por
 *    `clasificarFragmentoClo`, `es_norma_vigente === true`, instrumento Y artículo identificados e iguales a los pedidos); nunca se confía en un
 *    `rol_evidencia` que venga en el fragmento;
 *  - si el fragmento trae `hash`, debe coincidir con `hashFragmento` (integridad);
 *  - sólo si TODOS los artículos de la base se verifican, la base queda VERIFICADA; con algunos, PARCIAL (no cuenta);
 *  - el numeral («29 num. 4») y el «y siguientes» NO son verificables con la recuperación por artículo: se listan como no verificados, nunca se afirman.
 * Una casilla recibe evidencia sellada solo si TODAS sus bases quedan VERIFICADAS; si no, sin evidencia, y el evaluador la deja en UNKNOWN.
 * Un fallo del recuperador es NO verificado (nunca se asume). El puente no declara vigencia por sí mismo: usa `es_norma_vigente` del corpus.
 */
import { fragmentoCumpleR3, normalizarNumeroArticulo, type InstrumentId } from '../../legal-retrieval/clo-guards';
import { hashFragmento } from '../../legal-retrieval/primitives';
import type { FragmentoRAG } from '../../legal-retrieval/types';
import type { FiracSkill, RuleBasis, RuleEvidence } from './firac-schema';

declare const MARCA_EVIDENCIA: unique symbol;
declare const MARCA_VERIFICACION: unique symbol;
declare const MARCA_RESULTADO: unique symbol;

const SELLOS = new WeakSet<object>();
function sellar<T extends object>(o: T): Readonly<T> {
  Object.freeze(o);
  SELLOS.add(o);
  return o;
}
/** ¿Lo creó este módulo? (sin importar cómo lo reciba quien pregunta). */
export const esSellado = (o: unknown): boolean => typeof o === 'object' && o !== null && SELLOS.has(o);

/** Evidencia PRIMARY de la norma de una casilla, producida solo por el puente. */
export type EvidenciaSellada = Readonly<RuleEvidence & { source_role: 'PRIMARY'; snapshot_id: string }> & { readonly [MARCA_EVIDENCIA]: true };
export const esEvidenciaSellada = (e: unknown): e is EvidenciaSellada => esSellado(e);

export type EstadoBase =
  | 'VERIFICADA'
  | 'PARCIAL'
  | 'SIN_ARTICULOS'
  | 'INSTRUMENTO_NO_MAPEADO'
  | 'NO_ENCONTRADA'
  | 'RECUPERACION_FALLIDA';

/** Resultado de verificar UNA base normativa de UNA casilla. `verification` es el ÚNICO lugar donde aparece «VERIFICADO_CORPUS». */
export type VerificacionBase = Readonly<{
  casilla: string;
  basis_index: number;
  instrument: string;
  estado: EstadoBase;
  verification: 'VERIFICADO_CORPUS' | null;
  snapshot_id: string;
  articulos_verificados: string[];
  articulos_sin_verificar: string[];
  /** Numerales y «y siguientes»: la recuperación por artículo no los puede comprobar. */
  alcance_no_verificado: string[];
  chunk_ids: string[];
  motivo: string | null;
}> & { readonly [MARCA_VERIFICACION]: true };

export type ResultadoPuente = Readonly<{
  snapshot_id: string;
  skill_id: string;
  evidencia: Readonly<Record<string, readonly EvidenciaSellada[]>>;
  verificaciones: readonly VerificacionBase[];
}> & { readonly [MARCA_RESULTADO]: true };
export const esResultadoDelPuente = (r: unknown): r is ResultadoPuente => esSellado(r);

/** Consulta al corpus por instrumento y artículo. La implementa la capa de recuperación; aquí se inyecta. */
export type Recuperador = (q: { instrumentId: InstrumentId; articulo: string }) => Promise<readonly FragmentoRAG[]>;

/** Nombre del instrumento en la plantilla → id normalizado del corpus. Lista cerrada: un nombre fuera de ella no se verifica. */
export const INSTRUMENTO_POR_NOMBRE: Readonly<Record<string, InstrumentId>> = Object.freeze({
  'Código del Notariado': 'CODIGO_NOTARIADO',
  'Código Procesal Civil': 'CODIGO_PROCESAL_CIVIL',
  'Código de Comercio': 'CODIGO_COMERCIO',
});

/** Parte numérica del artículo citado («29 num. 4» → «29»; «66» → «66»; «123-A» → «123-A»). El numeral queda como alcance no verificado. */
function articuloYNumeral(ref: string): { articulo: string | null; numeral: string | null } {
  const m = /^\s*(.+?)\s+num(?:eral(?:es)?|s?\.)\s*(.+)$/i.exec(ref);
  const base = m ? m[1] : ref;
  return { articulo: normalizarNumeroArticulo(base), numeral: m ? m[2].trim() : null };
}

async function verificarArticulo(
  recuperar: Recuperador, instrumentId: InstrumentId, articulo: string,
): Promise<{ ok: boolean; chunk_ids: string[]; motivo: string | null }> {
  let fragmentos: readonly FragmentoRAG[];
  try {
    fragmentos = await recuperar({ instrumentId, articulo });
  } catch {
    return { ok: false, chunk_ids: [], motivo: 'RECUPERACION_FALLIDA' };
  }
  const objetivo = [{ instrumentId, articulo }];
  const buenos = (Array.isArray(fragmentos) ? fragmentos : []).filter((f) => {
    if (typeof f?.id !== 'string' || f.id.trim() === '') return false; // sin id no se puede citar
    if (!fragmentoCumpleR3(f, objetivo)) return false; // PRIMARY recalculado + vigente TRUE + mismo instrumento y artículo
    if (typeof f.hash === 'string' && f.hash !== '' && f.hash !== hashFragmento(f)) return false; // integridad
    return true;
  });
  const ids = [...new Set(buenos.map((f) => f.id as string))];
  return ids.length > 0 ? { ok: true, chunk_ids: ids, motivo: null } : { ok: false, chunk_ids: [], motivo: 'SIN_PRIMARY_VIGENTE_DEL_MISMO_INSTRUMENTO_Y_ARTICULO' };
}

async function verificarBase(
  recuperar: Recuperador, snapshotId: string, casilla: string, i: number, b: RuleBasis,
): Promise<{ v: VerificacionBase; chunk_ids: string[] }> {
  const instrumentId = INSTRUMENTO_POR_NOMBRE[b.instrument];
  const alcance: string[] = [];
  const crear = (estado: EstadoBase, ver: string[], sin: string[], chunks: string[], motivo: string | null): { v: VerificacionBase; chunk_ids: string[] } => ({
    v: sellar({
      casilla, basis_index: i, instrument: b.instrument, estado,
      verification: estado === 'VERIFICADA' ? ('VERIFICADO_CORPUS' as const) : null,
      snapshot_id: snapshotId, articulos_verificados: ver, articulos_sin_verificar: sin, alcance_no_verificado: alcance, chunk_ids: chunks, motivo,
    }) as VerificacionBase,
    chunk_ids: chunks,
  });
  if (!instrumentId) return crear('INSTRUMENTO_NO_MAPEADO', [], b.articles, [], `instrumento «${b.instrument}» fuera de la lista cerrada`);
  if (b.articles.length === 0) return crear('SIN_ARTICULOS', [], [], [], 'la base no cita artículos');
  if (b.and_following) alcance.push(`«y siguientes» tras el art. ${b.articles[b.articles.length - 1]}`);
  const verificados: string[] = [];
  const sin: string[] = [];
  const chunks: string[] = [];
  let falloRecuperador = false;
  for (const ref of b.articles) {
    const { articulo, numeral } = articuloYNumeral(ref);
    if (numeral) alcance.push(`numeral ${numeral} del art. ${articulo ?? ref}`);
    if (!articulo) { sin.push(ref); continue; }
    const r = await verificarArticulo(recuperar, instrumentId, articulo);
    if (r.ok) { verificados.push(ref); chunks.push(...r.chunk_ids); } else { sin.push(ref); if (r.motivo === 'RECUPERACION_FALLIDA') falloRecuperador = true; }
  }
  if (sin.length === 0) return crear('VERIFICADA', verificados, [], [...new Set(chunks)], null);
  if (verificados.length > 0) return crear('PARCIAL', verificados, sin, [...new Set(chunks)], 'no todos los artículos citados se verificaron');
  return crear(falloRecuperador ? 'RECUPERACION_FALLIDA' : 'NO_ENCONTRADA', [], sin, [], falloRecuperador ? 'el recuperador falló' : 'sin PRIMARY vigente del mismo instrumento y artículo');
}

/**
 * Crea el puente con un recuperador y un identificador de la instantánea del corpus consultada (para trazabilidad: «verificado contra la instantánea X»).
 * `verificarPlantilla` recorre las casillas hoja (y elementos) y devuelve el resultado sellado.
 */
export function crearPuenteCorpus(recuperar: Recuperador, snapshotId: string) {
  if (typeof snapshotId !== 'string' || snapshotId.trim() === '') throw new Error('el puente exige un snapshot_id del corpus');
  return {
    async verificarPlantilla(plantilla: FiracSkill): Promise<ResultadoPuente> {
      const evidencia: Record<string, readonly EvidenciaSellada[]> = {};
      const verificaciones: VerificacionBase[] = [];
      for (const regla of plantilla.firac.rules) {
        for (const hoja of regla.elements ?? [regla]) {
          const resultados = [];
          for (const [i, b] of hoja.basis.entries()) resultados.push(await verificarBase(recuperar, snapshotId, hoja.id, i, b));
          verificaciones.push(...resultados.map((r) => r.v));
          // Evidencia solo si TODAS las bases de la casilla quedaron VERIFICADAS (una base parcial o ausente deja la norma sin respaldo completo).
          if (resultados.length > 0 && resultados.every((r) => r.v.estado === 'VERIFICADA')) {
            const ids = [...new Set(resultados.flatMap((r) => r.chunk_ids))];
            evidencia[hoja.id] = Object.freeze(ids.map((id) => sellar({ chunk_id: id, source_role: 'PRIMARY' as const, snapshot_id: snapshotId }) as EvidenciaSellada));
          }
        }
      }
      return sellar({ snapshot_id: snapshotId, skill_id: plantilla.skill_id, evidencia: Object.freeze(evidencia), verificaciones: Object.freeze(verificaciones) }) as ResultadoPuente;
    },
  };
}
