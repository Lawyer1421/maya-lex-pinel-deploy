/**
 * lib/legal-os/shadow/dispatch.ts
 * Despacho SOMBRA de Legal OS: corre el pipeline sobre la evidencia que producción YA recuperó (sin nueva consulta a base de datos),
 * con un proveedor SIMULADO, y registra una línea de log redactada. La respuesta de producción es la autoridad y nunca depende de esto:
 *   - se agenda fuera de la ruta crítica (microtarea), no se espera y todo fallo se traga;
 *   - no modifica estado HTTP, cuerpo, Evidence Gate, Exact Resolver, abstención ni validez jurídica;
 *   - no hay modo «proveedor real»: ejecutar un modelo de OpenAI exige un canary autorizado y su propia compuerta de privacidad/procedencia.
 */
import { detectarArticuloExacto, detectarInstrumentoDesdeTexto, identidadDeFuente } from '../../legal-retrieval/exact-resolver';
import { FUENTES_DOCTRINALES } from '../../legal-retrieval/evidence-engine';
import type { FragmentoRAG } from '../../legal-retrieval/types';
import { crearSinkEnMemoria, type TraceSink } from '../observability';
import { ejecutarPipeline, type ChunkEvidencia, type DependenciasPipeline } from '../pipeline';
import { crearProveedorFalso } from '../providers/provider';
import { legalOsShadowHabilitado, type EntornoShadow } from './config';
import { construirRegistroShadow, type RegistroShadow } from './record';

export interface ParametrosShadow {
  queryId: string;
  pregunta: string;
  fragmentos: readonly FragmentoRAG[];
  decisionProduccion: 'ANSWER' | 'ABSTAIN';
  /** Estado del retrieval de producción (EXACT_SUCCESS, SEMANTIC_SUCCESS, …). */
  retrievalState?: string | null;
  tier?: 'EXPLORAR' | 'ACADEMICO' | 'PREMIUM';
}

export interface OpcionesShadow {
  env?: EntornoShadow;
  /** Destino del registro; por defecto, una línea JSON en el log. */
  emitir?: (registro: RegistroShadow) => void;
  sink?: TraceSink;
  reloj?: () => number;
}

const calidadDe = (estado: string | null | undefined): number => (estado === 'EXACT_SUCCESS' ? 0.95 : estado === 'SEMANTIC_SUCCESS' ? 0.6 : 0);

/** Política de fuentes: lo doctrinal y la capa privada (`doc_*`) NUNCA son evidencia del shadow. */
export function evidenciaDeProduccion(fragmentos: readonly FragmentoRAG[]): { chunks: ChunkEvidencia[]; excluidas: number } {
  const chunks: ChunkEvidencia[] = [];
  let excluidas = 0;
  fragmentos.forEach((f, i) => {
    if (FUENTES_DOCTRINALES.has(f.fuente) || /^doc_/i.test(f.fuente)) {
      excluidas++;
      return;
    }
    chunks.push({
      id: f.id ?? f.hash ?? `frag-${i}`,
      hash: f.hash ?? '',
      instrumento: identidadDeFuente(f.fuente),
      articulo: f.num_articulo,
      decreto: null,
      texto: f.contenido,
      vigente: f.es_norma_vigente ?? null,
    });
  });
  return { chunks, excluidas };
}

/** Proveedor SIMULADO («grabado»): cita el primer fragmento. No hay red ni modelo; solo ejercita el camino de validación. */
const proveedorSimulado = crearProveedorFalso(
  (req) => {
    const entrada = JSON.parse(req.input) as { fragmentos: Array<{ id: string }> };
    const id = entrada.fragmentos[0]?.id;
    return id ? { decision: 'ANSWER', claims: [{ claim_id: 's1', text: '(respuesta simulada)', citation_ids: [id] }] } : { decision: 'ABSTAIN', claims: [] };
  },
  { id: 'simulated' },
);

export async function ejecutarLegalOsShadow(p: ParametrosShadow, o: OpcionesShadow = {}): Promise<RegistroShadow | null> {
  if (!legalOsShadowHabilitado(o.env)) return null;
  const { chunks, excluidas } = evidenciaDeProduccion(p.fragmentos);
  const deps: DependenciasPipeline = {
    recuperar: async () => ({ chunks, calidad: calidadDe(p.retrievalState), confianza: calidadDe(p.retrievalState) }),
    proveedor: proveedorSimulado,
    sink: o.sink ?? crearSinkEnMemoria(),
    reloj: o.reloj,
  };
  const salida = await ejecutarPipeline({ queryId: p.queryId, pregunta: p.pregunta, tier: p.tier ?? 'ACADEMICO' }, deps);
  const exacto = detectarArticuloExacto(p.pregunta);
  const registro = construirRegistroShadow({
    salida, pregunta: p.pregunta, decisionProduccion: p.decisionProduccion, estadoRetrieval: p.retrievalState ?? null,
    articuloExacto: exacto ? { numero: exacto.numero, instrumento: exacto.instrumento ?? detectarInstrumentoDesdeTexto(p.pregunta) } : null,
    fuentesExcluidas: excluidas,
    privacidad: salida.motivo === 'DATOS_PERSONALES_SOLICITADOS' ? 'REJECT_PERSONAL_DATA_REQUEST' : 'GUARDS_PASS_NO_EXTERNAL_SEND',
  });
  (o.emitir ?? ((r) => console.log(JSON.stringify({ legal_os_shadow: r }))))(registro);
  return registro;
}

/** Punto de entrada para la ruta: agenda fuera de la ruta crítica, no espera y traga todo error. */
export function despacharLegalOsShadow(p: ParametrosShadow, o: OpcionesShadow = {}): void {
  try {
    if (!legalOsShadowHabilitado(o.env)) return;
    void Promise.resolve()
      .then(() => ejecutarLegalOsShadow(p, o))
      .catch(() => undefined);
  } catch {
    // El shadow es subordinado: ningún error llega a producción.
  }
}
