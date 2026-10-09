# MayaLex — Retrieval V4: blueprint de diseño

- **Base:** `origin/main` = `c3847d9297b63dc8b45b700ec7fd82d471f0171f`
- **Fecha:** 2026-10-09
- **Estado:** diseño. Ningún componente de este documento está implementado ni desplegado.
- **No bloquea el lanzamiento comercial.**
- Referencias: `MAYALEX_RETRIEVAL_V4_CURRENT_STATE.md` (estado actual), `MAYALEX_LEGAL_UNIT_MODEL_V1.md` (modelo), `MAYALEX_LEGAL_RANKING_V1.md` (ranking), `MAYALEX_RETRIEVAL_V4_BENCHMARK_PLAN.md` (evaluación), `MAYALEX_RETRIEVAL_V4_ROADMAP.md` (fases).

---

## 1. Principios que no se negocian

- **Evidencia primero, corpus primero, modelo después, plataforma al final.**
- El LLM razona; la evidencia fundamenta; el código hace cumplir.
- La recuperación no es razonamiento. La similitud semántica no es analogía jurídica.
- Ninguna conclusión jurídica material sin evidencia de soporte.
- No debilitar el fail-close existente. El invariante `NO_VERIFIED_EVIDENCE ≠ RETRIEVAL_FAILED` (`types.ts:54-56`) se conserva.

---

## 2. Arquitectura objetivo y correspondencia con el código

```
QUERY
  ↓
ROUTER            ← existe: RUTA_A–D (route.ts:10-13). V4 sólo añade metadatos, no cambia la ruta
  ↓
EXACT             ← existe: detectarArticuloExacto + resolverArticuloExacto
  ↓                  V4 no lo reemplaza. Se mantiene como lane FAST
HYBRID RETRIEVAL
  ├─ exact        ← existe (mismo módulo)
  ├─ lexical      ← NUEVO (no existe en el repo)
  ├─ semantic     ← existe: buscar_biblioteca_v2 + e5-small. Sin cambio de modelo
  └─ relations    ← NUEVO (no existe en el repo)
  ↓
EVIDENCE GATE     ← parcial: outcome + citas + abstención existen.
  ├─ source identity   ← parcial (fuente, fuente_tipo)
  ├─ authority         ← NUEVO (normative_rank)
  ├─ validity          ← parcial (es_norma_vigente booleano)
  ├─ provenance        ← parcial (hash, fuente)
  └─ sufficiency       ← parcial (evidenceCount)
  ↓
LLM REASONER      ← existe (modelo configurado en system-prompt.ts)
  ↓
LONG-CONTEXT SUPPORT   ← OPCIONAL, sólo lab. No en runtime
  ↓
CITED LEGAL ANSWER     ← existe: construirCitas + formatearContextoRAG
```

**Regla de integración:** V4 es una capa aditiva alrededor de `buscarRAG`. La función actual sigue siendo el camino por defecto y el fallback. Ningún canal nuevo puede reemplazar a uno existente sin pasar la fase de shadow (V4.1).

---

## 3. Canales de recuperación

### 3.1 EXACT (existente)

- Identificadores: número de artículo, instrumento (`detectarInstrumentoDesdeTexto`, `exact-resolver.ts:195`).
- Decreto y título de instrumento: **no soportados hoy.** `decreto` no es campo de la RPC ni de `FragmentoRAG`. Requiere la unidad legal de `MAYALEX_LEGAL_UNIT_MODEL_V1.md` para `decree_number` y `instrument_id`.
- Sin cambio en la fase lab.

### 3.2 LEXICAL (nuevo, sólo diseño)

- **Propuesta:** PostgreSQL full-text con configuración `simple` para citas (evita stemming que altere nombres propios y términos técnicos), más `spanish` para búsqueda de conceptos.
- **Implementación prevista:** columna `tsvector` generada + índice GIN. **Es un cambio de esquema**: no se ejecuta en V4.0.
- **Alternativa sin cambio de esquema:** `websearch_to_tsquery` sobre `contenido` en una función nueva. Más lenta; aceptable para shadow.
- **Heading matching:** requiere la unidad con `section` (modelo L1). Hasta entonces, sólo búsqueda sobre `contenido`.
- **Riesgo declarado:** la búsqueda léxica devuelve coincidencias de palabra, no de concepto jurídico. Su peso en el ranking es bajo (ver `MAYALEX_LEGAL_RANKING_V1.md`).
- **Implementación V4.0-A (laboratorio):** `lexical-lab` en memoria sobre fixtures, sin migración. Su interfaz `LexicalAdapter` es la frontera que una futura implementación FTS de PostgreSQL debe cumplir, sin cambiar la fusión ni el ranking. Detalle en `MAYALEX_LEGAL_RANKING_V1.md`, sección 9.

### 3.3 SEMANTIC (existente)

- Modelo: `multilingual-e5-small`, 384 dims. **Se conserva.** Cualquier cambio de modelo exige re-embebido completo del corpus y benchmark previo; no se propone en V4.
- **Corrección de capacidad:** la RPC fuerza `LIMIT least(limite, 20)` (migración L110). La cifra `RETRIEVAL_WIDE_K = 25` (`semantic-retriever.ts:125`) no se alcanza.
- **Propuesta V4.1:** nueva versión de RPC (`buscar_biblioteca_v3`) con límite configurable y filtro `fuente IS NOT NULL` y `fuente_tipo` en SQL. **No modificar v2 en caliente.**

### 3.4 LEGAL RELATIONS (nuevo, sólo diseño)

Tipos de relación del encargo: `REFORMA_A`, `DEROGA`, `SUSTITUYE`, `REMITE_A`, `REGLAMENTA`, `INTERPRETA`, `COMPLEMENTA`, `EXCEPCIONA`.

**Forma inicial (relacional, sin grafo):**

```
legal_relation (
  source_unit_id   text,     -- LegalUnit origen
  target_unit_id   text,     -- LegalUnit destino
  relation_type    text,     -- uno de los 8 tipos
  evidence_ref     text,     -- referencia al texto que establece la relación
  verification     text,     -- VERIFIED | UNVERIFIED | QUARANTINED (mismo enum de types.ts:99)
  verified_by      text,     -- revisión humana o fuente oficial
  verified_at      timestamptz
)
```

- **Regla:** una relación `UNVERIFIED` nunca se usa para fundamentar una conclusión, sólo para ampliar candidatos en shadow.
- **Fuente de relaciones iniciales:** textos oficiales (Gaceta, reformas publicadas) y el registro CLO. No se infieren relaciones por similitud de texto.
- **Sin base de datos de grafos.** Se revisa en V4.4 si el volumen lo justifica.

---

## 4. Evidence Gate

Cinco comprobaciones, cada una con un resultado registrado en el objeto de evidencia:

| Comprobación | Pregunta | Hoy | En V4 |
|---|---|---|---|
| Source identity | ¿La unidad pertenece al instrumento pedido? | `identidadDocumentalCoincide` (exacta) | Mismo, sobre `instrument_id` |
| Authority | ¿Qué rango normativo tiene? | No existe | `normative_rank` |
| Validity | ¿Está vigente, derogada o pendiente? | Booleano | `temporal_status` con tres estados mínimos |
| Provenance | ¿De dónde viene y se puede verificar? | `fuente`, `hash` | `source_url`, `source_hash` |
| Sufficiency | ¿Hay evidencia suficiente para la conclusión pedida? | `evidenceCount > 0` | Por subpregunta, no sólo conteo |

**Regla de suficiencia:** `evidenceCount > 0` no equivale a suficiencia. Una respuesta sobre un artículo con remisión necesita el artículo remitido. Sin él, el gate devuelve `INSUFFICIENT` y el modelo debe abstenerse de esa conclusión.

---

## 5. Laboratorio de contexto largo (diseño, no runtime)

### 5.1 Restricciones

- No se integra Gemini ni ningún proveedor de contexto largo en runtime.
- No se usa context caching en producción.
- El caching es **contexto de apoyo**. No reemplaza recuperación exacta, gate, citas, estado canónico ni verificación de fuente.
- El modelo concreto (por ejemplo, Gemini 2.5 Flash) **debe verificarse en el momento de ejecución**. No se afirma disponibilidad ni precio en este documento: NO VERIFICADO.

### 5.2 Comparación propuesta

| Variante | Descripción | Qué mide |
|---|---|---|
| **A** | Recuperación actual (`buscarRAG`) + LLM actual | Línea base |
| **B** | Recuperación híbrida (V4 shadow) + LLM actual | Efecto de los canales nuevos |
| **C** | Recuperación híbrida + instrumento completo en contexto largo (caché) | Efecto del contexto largo, con la misma evidencia |

**Control clave:** en las tres variantes el paquete de evidencia se congela una vez por consulta y se entrega idéntico. La única variable es el procesamiento posterior.

### 5.3 Vertical piloto: NOTARIADO

**Incluido (sólo si está verificado):**
- Código del Notariado (94 filas declaradas, 87 vigentes, 7 `es_norma_vigente=false` según CA-01).
- Reglamento del Código del Notariado.
- Material relacionado verificado.

**Según la decisión CLO del 2026-10-09 (`MAYALEX_RETRIEVAL_V4_CLO_POLICY_V1.md`):**
- Artículos 72, 73, 84, 87, 93 (E2, OPEN): sólo `CONTEXT`, con advertencia. Nunca PRIMARY ni suficientes por sí solos.
- CPC_TEXTO_BASE_D211-2006 (E5, OPEN): `EXCLUDED` en consulta normal. `CONTEXT` sólo con intención histórica explícita.
- D.102-2018 (E6, OPEN): `SECONDARY`. Puede acompañar PRIMARY verificado.

**Excluido, sin excepciones:**
- Filas `doc_*` (containment H2 en producción desde `99db542`).
- Filas `fuente IS NULL` (CA-02).
- Comercio no verificado (ABSENT_VERIFIED).

**Condición de entrada:** el registro CLO debe cerrar E2 (artículos 72, 73, 84, 87, 93, hoy OPEN) y E8 (filas D.77-2006 como candidato físico hasta tener el texto de Gaceta). Sin ambos cierres, CA-01 sigue en `PARTIAL` y el piloto no puede fundamentar conclusiones sobre esos artículos. Los artículos 11 y 27 están desplazados por D.77-2006 (E1, CLOSED) y no entran al piloto como vigentes.

### 5.4 Qué no hace el laboratorio

- No decide el modelo ganador.
- No modifica la base.
- No toca producción.

---

## 6. Optimización de latencia

Tres carriles. Cada carril tiene un límite de confianza, no sólo de tiempo.

| Carril | Cuándo | Qué hace | Límite |
|---|---|---|---|
| **FAST** | Número de artículo + instrumento explícito | Sólo EXACT. Sin semántica ni relaciones | No se usa si el resultado exacto es ambiguo o vacío |
| **STANDARD** | Consulta conceptual | Léxico + semántico en paralelo, dedupe, gate | Tope de candidatos fijado por RPC (20 hoy) |
| **DEEP** | Análisis multi-instrumento | Relaciones + STANDARD por instrumento + contexto largo opcional | Sólo con gate superado; nunca como sustituto del gate |

**Técnicas evaluadas:**

| Técnica | Efecto en latencia | Efecto en fiabilidad | Decisión |
|---|---|---|---|
| Exacto + léxico + semántico en paralelo | Reduce latencia total | Neutral | Adoptar en shadow |
| Short-circuit en exacto válido | Alto | Positivo si la identidad es sólida | Adoptar en FAST |
| Deduplicación por `(instrument_id, article_number, hash)` | Bajo | Positivo | Adoptar; requiere modelo L1 |
| Caché de metadatos de instrumento | Bajo-medio | Neutral | Evaluar en V4.1 |
| Caché de mapas de relación | Bajo | Neutral si sólo se leen verificadas | Evaluar en V4.2 |
| Caché de embeddings de consulta | Medio en consultas repetidas | Neutral | Evaluar; cuidado con normalización de consulta |
| Normalización de consulta | Bajo | Riesgo de alterar términos legales | Sólo con lista controlada de sinónimos |
| Reranking por etapas | Medio | Positivo si el reranker es verificado | Mantener detrás de flag; no activar |
| Streaming tras el gate | Percibido alto | Neutral | Adoptar en V4.2 |
| Contexto largo sólo en DEEP | Alto en costo y latencia | Riesgo si sustituye al gate | Sólo lab (sección 5) |

---

## 7. Lo que cambia respecto al estado actual

| Cambio | Tipo | Fase |
|---|---|---|
| Documentación de arquitectura | Ninguno en runtime | V4.0 (este commit) |
| Medición de corpus con acceso de lectura | Sólo lectura | V4.0 |
| Nueva RPC `buscar_biblioteca_v3` | Esquema (función nueva) | V4.1, con aprobación |
| Columna `tsvector` + índice GIN | Esquema | V4.1, con aprobación |
| Tabla `legal_relation` | Esquema | V4.1, con aprobación |
| Tabla de identidad de instrumentos | Esquema | V4.1, con aprobación |
| Shadow de canales nuevos | Runtime, sin efecto en respuesta | V4.1 |
| Canary | Runtime, efecto parcial | V4.2 |
