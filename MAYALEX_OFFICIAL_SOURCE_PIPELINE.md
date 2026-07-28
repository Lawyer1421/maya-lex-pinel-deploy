# MAYALEX — Pipeline de fuentes jurídicas oficiales (Paquete C)

Código: `lib/ingesta-oficial/` (`types.ts`, `validaciones.ts`, `extraccion.ts`, `hash.ts`, `embeddings.ts`, `estados.ts`, `pipeline.ts`). Pruebas: `tests/ingesta-oficial-pipeline.test.ts`, `tests/ingesta-oficial-validaciones.test.ts`, `tests/ingesta-oficial-estados.test.ts` (48 pruebas en total, todas pasando).

## 1. Entrada esperada — el manifest

```ts
interface ManifestFuenteOficial {
  autoridad: string;
  decreto: string;
  publicacion: string;       // ISO 8601
  entradaVigor?: string;
  materia: string;
  estado: string;             // 'vigente' | 'derogado' | 'reformado' | 'pendiente_verificacion'
  checksum: string;           // SHA-256 del texto fuente
  responsableRevision: string;
  urlOReferencia?: string;
}
```

## 2. Los 16 pasos (implementados en `lib/ingesta-oficial/pipeline.ts`, función `ejecutarPipeline`)

1. **Recepción** — valida que llegó texto fuente no vacío.
2. **Hash** — SHA-256 del texto completo (`lib/ingesta-oficial/hash.ts`).
3. **Validación del manifest** — completo, fuente identificada, checksum coincide, estado de revisión reconocido.
4. **Extracción** — texto fuente crudo recibido.
5. **Normalización** — quita saltos de línea excesivos, encabezados de página (`lib/ingesta-oficial/extraccion.ts:normalizarTexto`).
6. **Separación por artículo** — segmentación determinística por el patrón `ARTÍCULO N` (sin IA, reproducible byte a byte).
7. **Control de encabezados** — detecta encabezados repetidos (no bloqueante, informativo).
8. **Detección de duplicados** — numeración coherente + hash exacto contra un conjunto de hashes existentes (inyectado — en producción vendría de staging).
9. **Metadatos** — verifica que la materia declarada no se mezcle con otra detectada.
10. **Validaciones** — rechaza posibles datos privados (artefactos de anonimización o patrones tipo RTN/DNI).
11. **Salida JSONL** — una línea por artículo, con `norm_id`, `num_articulo`, `contenido`, `decreto`, `materia`, `autoridad`, `estado`, `hash`.
12. **Staging** — inserción de candidatos (función inyectada — no ejecuta si no se provee, para permitir modo solo-validación).
13. **Embeddings candidate** — `FakeEmbeddingProvider` (384 dims, determinístico, **sin conectar ningún proveedor real ni credenciales de producción**).
14. **Benchmark básico** — verifica recuperación exacta del primer artículo por su número.
15. **Aprobación humana** — el pipeline se detiene aquí (`aceptado:false`, motivo "pendiente de aprobación humana") a menos que se provea explícitamente un `aprobadoPor`.
16. **Alias** — no-op documentado (no existe mecanismo de alias productivo todavía).

## 3. Rechazos implementados (los 8 exigidos)

| Regla | Función | Probado en |
|---|---|---|
| Manifest incompleto | `validarManifestCompleto` | ✅ |
| Fuente sin identificación | `validarFuenteIdentificada` | ✅ (cubierto por manifest completo) |
| Artículos vacíos | `validarArticulosNoVacios` | ✅ |
| Numeración incoherente | `validarNumeracionCoherente` | ✅ |
| Documentos duplicados | `validarSinDuplicadosContraCorpusExistente` | ✅ |
| Mezcla de materias | `validarMezclaDeMaterias` | ✅ |
| Archivos con posibles datos privados | `validarSinDatosPrivados` | ✅ |
| Contenido sin estado de revisión | `validarEstadoDeRevisionDeclarado` | ✅ |

## 4. Proveedor de embeddings — explícitamente no productivo

`lib/ingesta-oficial/embeddings.ts` define la interfaz `EmbeddingProvider` y una única implementación, `FakeEmbeddingProvider`: vector determinístico (mismo texto → mismo vector) de 384 dimensiones (misma dimensión que el corpus real), generado con un LCG simple, sin red ni token. Conectar el proveedor real (`lib/rag/embed.ts`, HuggingFace) es un cambio de una línea en una fase futura explícitamente autorizada — ningún consumidor de `pipeline.ts` necesita cambiar.

## 5. Diferencia con el pipeline de auto-aprendizaje existente

`lib/self-learning/ingesta.ts` (ya existente en el proyecto) ingiere documentos de usuarios hacia `vectores_conocimiento`/`documentos_aprendizaje` — un flujo distinto, para contenido comunitario no oficial. Este pipeline nuevo (`lib/ingesta-oficial/`) es específico para **fuentes jurídicas oficiales** (leyes, decretos) con un manifest de procedencia mucho más estricto y un destino distinto (`hn_normas_verificadas_staging`, no `vectores_conocimiento`).
