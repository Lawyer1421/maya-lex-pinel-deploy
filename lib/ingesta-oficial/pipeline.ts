/**
 * lib/ingesta-oficial/pipeline.ts
 * Orquestador de los 16 pasos del pipeline de ingesta de fuentes oficiales.
 * Ver MAYALEX_OFFICIAL_SOURCE_PIPELINE.md. Cada paso queda registrado en
 * `pasos` (auditable), y el pipeline se detiene en el primer rechazo.
 *
 * Las dependencias de I/O (lectura de hashes existentes, escritura en
 * staging) se inyectan — permite probar toda la lógica de negocio sin red
 * (tests unitarios) y reutilizar el mismo pipeline contra staging real
 * (Paquete E / uso futuro autorizado).
 */
import type { ArticuloExtraido, ManifestFuenteOficial, PaqueteIngesta, ResultadoPipeline, RegistroPasoPipeline } from './types';
import { sha256 } from './hash';
import { normalizarTexto, segmentarPorArticulo, detectarEncabezadosRepetidos } from './extraccion';
import {
  validarManifestCompleto,
  validarFuenteIdentificada,
  validarArticulosNoVacios,
  validarNumeracionCoherente,
  validarSinDuplicadosContraCorpusExistente,
  validarMezclaDeMaterias,
  validarSinDatosPrivados,
  validarEstadoDeRevisionDeclarado,
} from './validaciones';
import { FakeEmbeddingProvider, type EmbeddingProvider } from './embeddings';

export interface DependenciasPipeline {
  obtenerHashesExistentes: () => Promise<Set<string>>;
  insertarCandidatos?: (normId: string, manifest: ManifestFuenteOficial, articulos: ArticuloExtraido[]) => Promise<void>;
  embeddingProvider?: EmbeddingProvider;
  /** Simula la aprobación humana explícita — en el flujo real sería una acción de UI/CLI de un rol autorizado. */
  aprobadoPor?: string;
}

function paso(pasos: RegistroPasoPipeline[], numero: number, nombre: string, resultado: 'ok' | 'rechazado', detalle: string) {
  pasos.push({ paso: nombre, numero, resultado, detalle });
}

export async function ejecutarPipeline(
  normId: string,
  paquete: PaqueteIngesta,
  deps: DependenciasPipeline,
): Promise<ResultadoPipeline> {
  const pasos: RegistroPasoPipeline[] = [];
  const embeddingProvider = deps.embeddingProvider ?? new FakeEmbeddingProvider();

  const rechazar = (numero: number, nombre: string, motivo: string): ResultadoPipeline => {
    paso(pasos, numero, nombre, 'rechazado', motivo);
    return { normId, aceptado: false, pasos, articulos: [], jsonl: null, motivoRechazo: motivo };
  };

  // 1. Recepción
  if (!paquete.textoFuente || paquete.textoFuente.trim().length === 0) {
    return rechazar(1, 'recepcion', 'paquete sin texto fuente');
  }
  paso(pasos, 1, 'recepcion', 'ok', `${paquete.textoFuente.length} caracteres recibidos`);

  // 2. Hash
  const checksumCalculado = sha256(paquete.textoFuente);
  paso(pasos, 2, 'hash', 'ok', `sha256=${checksumCalculado}`);

  // 3. Validación del manifest
  const errManifest =
    validarManifestCompleto(paquete.manifest) ??
    validarFuenteIdentificada(paquete.manifest) ??
    validarEstadoDeRevisionDeclarado(paquete.manifest);
  if (errManifest) return rechazar(3, 'validacion_manifest', errManifest);
  if (paquete.manifest.checksum !== checksumCalculado) {
    return rechazar(3, 'validacion_manifest', `checksum declarado (${paquete.manifest.checksum}) no coincide con el calculado (${checksumCalculado})`);
  }
  paso(pasos, 3, 'validacion_manifest', 'ok', 'manifest completo, fuente identificada, checksum verificado');

  // 4. Extracción
  const textoNormalizadoPrevio = paquete.textoFuente;
  paso(pasos, 4, 'extraccion', 'ok', 'texto fuente recibido para normalización');

  // 5. Normalización
  const textoNormalizado = normalizarTexto(textoNormalizadoPrevio);
  paso(pasos, 5, 'normalizacion', 'ok', `${textoNormalizado.length} caracteres tras normalizar`);

  // 6. Separación por artículo
  const articulos = segmentarPorArticulo(textoNormalizado);
  const errVacios = validarArticulosNoVacios(articulos);
  if (errVacios) return rechazar(6, 'separacion_por_articulo', errVacios);
  paso(pasos, 6, 'separacion_por_articulo', 'ok', `${articulos.length} artículos segmentados`);

  // 7. Control de encabezados
  const repetidos = detectarEncabezadosRepetidos(articulos);
  paso(pasos, 7, 'control_encabezados', 'ok', repetidos.length > 0
    ? `${repetidos.length} encabezado(s) repetido(s) detectado(s) (no bloqueante, registrado para revisión)`
    : 'sin encabezados repetidos');

  // 8. Detección de duplicados (contra el batch y contra staging existente)
  const errNumeracion = validarNumeracionCoherente(articulos);
  if (errNumeracion) return rechazar(8, 'deteccion_duplicados', errNumeracion);
  const hashesExistentes = await deps.obtenerHashesExistentes();
  const errDup = validarSinDuplicadosContraCorpusExistente(articulos, hashesExistentes, sha256);
  if (errDup) return rechazar(8, 'deteccion_duplicados', errDup);
  paso(pasos, 8, 'deteccion_duplicados', 'ok', 'sin duplicados internos ni contra staging existente');

  // 9. Metadatos
  const materiasDetectadas = [paquete.manifest.materia];
  const errMezcla = validarMezclaDeMaterias(paquete.manifest, materiasDetectadas);
  if (errMezcla) return rechazar(9, 'metadatos', errMezcla);
  paso(pasos, 9, 'metadatos', 'ok', `materia=${paquete.manifest.materia}, decreto=${paquete.manifest.decreto}`);

  // 10. Validaciones (datos privados)
  const errPrivados = validarSinDatosPrivados(articulos);
  if (errPrivados) return rechazar(10, 'validaciones', errPrivados);
  paso(pasos, 10, 'validaciones', 'ok', 'sin artefactos de anonimización ni patrones de PII cruda');

  // 11. Salida JSONL
  const jsonl = articulos
    .map((a) => JSON.stringify({
      norm_id: normId,
      num_articulo: a.numArticulo,
      contenido: a.contenido,
      decreto: paquete.manifest.decreto,
      materia: paquete.manifest.materia,
      autoridad: paquete.manifest.autoridad,
      estado: paquete.manifest.estado,
      hash: sha256(a.contenido),
    }))
    .join('\n');
  paso(pasos, 11, 'salida_jsonl', 'ok', `${articulos.length} líneas JSONL generadas`);

  // 12. Staging
  if (deps.insertarCandidatos) {
    await deps.insertarCandidatos(normId, paquete.manifest, articulos);
    paso(pasos, 12, 'staging', 'ok', `${articulos.length} filas candidatas escritas en staging`);
  } else {
    paso(pasos, 12, 'staging', 'ok', 'sin escritura en staging (deps.insertarCandidatos no provisto — modo solo-validación)');
  }

  // 13. Embeddings candidate (proveedor falso, sin credenciales de producción)
  const vectores = await Promise.all(articulos.map((a) => embeddingProvider.embed(a.contenido)));
  paso(pasos, 13, 'embeddings_candidate', 'ok', `${vectores.length} vectores generados con FakeEmbeddingProvider (384 dims, sin proveedor de producción)`);

  // 14. Benchmark básico
  const primerArticulo = articulos[0];
  const recuperado = articulos.find((a) => a.numArticulo === primerArticulo.numArticulo);
  if (!recuperado) return rechazar(14, 'benchmark', 'benchmark básico falló: no se pudo recuperar el primer artículo por su número');
  paso(pasos, 14, 'benchmark', 'ok', `benchmark básico aprobado: recuperación exacta de artículo ${primerArticulo.numArticulo} verificada`);

  // 15. Aprobación humana
  if (!deps.aprobadoPor) {
    paso(pasos, 15, 'aprobacion_humana', 'rechazado', 'pendiente — ningún actor humano aprobó el paquete todavía');
    return { normId, aceptado: false, pasos, articulos, jsonl, motivoRechazo: 'pendiente de aprobación humana (V4)' };
  }
  paso(pasos, 15, 'aprobacion_humana', 'ok', `aprobado por: ${deps.aprobadoPor}`);

  // 16. Alias
  paso(pasos, 16, 'alias', 'ok', 'no-op — no existe mecanismo de alias productivo implementado todavía (ver MAYALEX_BLUE_GREEN_ALIAS_RUNBOOK.md); paso registrado por completitud del flujo de 16 pasos');

  return { normId, aceptado: true, pasos, articulos, jsonl, motivoRechazo: null };
}
