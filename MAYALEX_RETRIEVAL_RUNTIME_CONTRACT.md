# MayaLex — Retrieval Runtime Contract (Fase 1B.5)

**Naturaleza de este documento:** diseño puro. Ningún cambio de producción,
ninguna escritura en Supabase, ningún deploy, ningún cableado de
`RetrievalExecutionState` al código real. Todo lo descrito aquí es la
especificación de un contrato que **hoy no existe** — el hallazgo central de
este documento es precisamente que el código actual no lo tiene, no que
hayamos introducido una regresión al no tenerlo todavía.

Base de evidencia: `MAYALEX_RAG_LINEAGE_AND_RUNTIME_AUDIT.md` (auditoría
forense previa, read-only) + lectura directa de `lib/rag/search.ts`,
`app/api/chat/route.ts`, `lib/rag/embed.ts`, `lib/rag/rerank.ts`,
`lib/websearch/tavily.ts` tal como existen hoy en `origin/main`.

---

## 0. El problema exacto que este contrato resuelve

Hoy, `ResultadoRAG` (`{fragmentos, articulos_encontrados, backend, error?, ambiguo?}`)
es la ÚNICA señal que sale del retrieval. El gate fail-closed en `route.ts`
decide abstenerse con una sola condición:

```typescript
const evidenciaInsuficiente =
  requiereEvidenciaCorpus(ultimaPregunta, rutaCorpusObligatoria) &&
  ragData.fragmentos.length === 0;
```

Esta condición es **verdadera y produce el mismo mensaje de abstención** en
los siguientes escenarios, hoy indistinguibles entre sí para el usuario, para
los logs de negocio, y para Langfuse:

1. El artículo pedido genuinamente no existe en el corpus (correcto — el
   sistema debe abstenerse).
2. `RAG_BACKEND` está mal configurado o las credenciales de Supabase faltan
   (`getBackend()` devuelve `'disabled'`) — **esto es un incidente
   operativo**, no una respuesta jurídica correcta, y hoy se ve exactamente
   igual que el caso 1.
3. La RPC de Supabase falló con un error real de red/servicio
   (`normal.error` en `buscarEnSupabase`, capturado por el `catch` de
   `buscarRAG`) — **esto también es un incidente operativo**, indistinguible
   de los casos 1 y 2 en el `ResultadoRAG` que llega a `route.ts` (el campo
   `error` existe pero **nada en `route.ts` lo lee** para decidir el gate).
4. HuggingFace no respondió a tiempo (embedding falló) — mismo problema: se
   captura como error genérico, mismo resultado indistinguible.

**Esto es exactamente el riesgo que el Control Plane pidió eliminar**: hoy es
posible que un incidente de configuración u operación (2, 3, 4) se presente
al usuario y a la telemetría con la misma cara que una abstención jurídica
legítima (1) — sin que nadie note la diferencia sin leer logs de servidor.

---

## 1. Inventario de estados posibles (evidencia de código, no diseño)

### 1.1 `RAG_BACKEND`

| Estado | Cómo se llega hoy | Evidencia |
|---|---|---|
| `supabase` | Explícito, o inferido por `getBackend()` si `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` existen | `lib/rag/search.ts: getBackend()` |
| `python` | Explícito. Guardado adicional: si `VERCEL==='1'` y `PYTHON_RAG_URL` contiene `localhost`, se fuerza `disabled` | ídem |
| `disabled` | Explícito, o inferido si faltan credenciales de Supabase | ídem |
| `missing` (ausente) | Colapsa hoy dentro de la inferencia de `getBackend()` — **no es un estado observable por separado**, se resuelve silenciosamente a `supabase` o `disabled` según credenciales | ídem |
| `invalid` (valor no reconocido, ej. `RAG_BACKEND=suprabase` con typo) | `getBackend()` no valida contra la lista — un valor no reconocido cae al mismo `if (val && [...].includes(val)) return val` → si no matchea, **se ignora silenciosamente y se re-infiere por credenciales**, sin ningún log de advertencia | ídem — **gap confirmado, no documentado antes de este análisis** |

### 1.2 Dependencias externas

| Dependencia | Disponible | No disponible (hoy) |
|---|---|---|
| Supabase (RPC) | Responde con datos | `normal.error` truncado a `throw new Error(...)`, capturado por `buscarRAG` catch → `{fragmentos:[], error: msg}`. `vigente.error` (segunda RPC) se **ignora silenciosamente** por diseño (degradación intencional, documentada). |
| HF (embedding) | Responde < 12s | Timeout o error HTTP → `embedQuery` lanza → mismo catch de `buscarRAG` → mismo shape `{fragmentos:[], error: msg}` — **indistinguible del caso Supabase-caído** en el `ResultadoRAG` final. |
| Cohere (rerank) | Responde < 5s | Captura interna en `rerankearFragmentos` — **nunca propaga error**, degrada a `candidatos.slice(0,k)`. Invisible para `ResultadoRAG` (correcto por diseño — el rerank es una optimización, no una fuente de evidencia). |
| Tavily (web) | Responde < 3.5s con resultados | Dos caminos distintos ya HOY: 0 resultados relevantes (silencioso) vs. error/timeout (`AVISO_BUSQUEDA_FALLIDA`, visible al modelo) — ver auditoría §4. |

### 1.3 `RESULT` (forma de salida del retrieval)

| Resultado | Hoy se representa como | Ambigüedad actual |
|---|---|---|
| Evidencia exacta | `ResultadoRAG.fragmentos.length > 0`, vino de `buscarArticuloExacto` | Ninguna — el exact resolver es un camino separado y determinista. |
| Evidencia semántica | `ResultadoRAG.fragmentos.length > 0`, vino de `buscarEnSupabase` | Ninguna. |
| Evidencia cero (genuina) | `ResultadoRAG.fragmentos.length === 0`, sin `error` | — |
| Error de retrieval | `ResultadoRAG.fragmentos.length === 0`, **con** `error` seteado | **`route.ts` no lee `error` para el gate — colapsa con el caso anterior.** |
| Ambigüedad | `ResultadoRAG.ambiguo === true` | Ya distinguido hoy (único caso ya resuelto correctamente). |

---

## 2. `RetrievalExecutionState` — diseño (NO cableado)

```typescript
// DISEÑO — Fase 1B.5. NO IMPORTADO NI USADO POR CÓDIGO DE PRODUCCIÓN.
// Candidato para lib/legal-retrieval/types.ts en una fase POSTERIOR,
// autorizada por separado.
export type RetrievalExecutionState =
  | 'NOT_REQUIRED'
  | 'EXACT_SUCCESS'
  | 'SEMANTIC_SUCCESS'
  | 'OFFICIAL_FALLBACK_REQUIRED'
  | 'NO_VERIFIED_EVIDENCE'
  | 'CONFIGURATION_ERROR'
  | 'RETRIEVAL_ERROR';
```

| Estado | Significado | Quién lo observa hoy (nadie explícitamente) |
|---|---|---|
| `NOT_REQUIRED` | La ruta/modo no exige evidencia de corpus por diseño (modos `sala_*`, o `ruta='D'`). No es una falla. | Hoy: simplemente `rutaCorpusObligatoria=false`, sin estado nombrado. |
| `EXACT_SUCCESS` | El exact resolver confirmó ≥1 fragmento con identidad de instrumento verificada. | Hoy: `ragData.fragmentos.length > 0` desde `buscarArticuloExacto`, sin distinguir de `SEMANTIC_SUCCESS`. |
| `SEMANTIC_SUCCESS` | La ruta semántica (con o sin rerank) produjo ≥1 fragmento tras todos los filtros de calidad. | Hoy: mismo shape que `EXACT_SUCCESS`. |
| `OFFICIAL_FALLBACK_REQUIRED` | Evidencia exigida, retrieval **funcionó correctamente** (sin error de infraestructura), pero no encontró nada verificable en el corpus interno. Candidato a intentar una fuente externa oficial (ver §4) antes de abstenerse. | Hoy: **no existe** — colapsa directamente a la misma abstención que `NO_VERIFIED_EVIDENCE`. |
| `NO_VERIFIED_EVIDENCE` | Evidencia exigida, ni el corpus interno ni (en el futuro) ningún adapter externo produjo evidencia verificable. Terminal — abstención correcta. | Hoy: es el único estado real que existe, y absorbe también los tres siguientes por error de diseño. |
| `CONFIGURATION_ERROR` | El propio sistema está mal configurado para responder (backend `disabled` por accidente, `RAG_BACKEND` con valor inválido, credenciales ausentes) mientras la ruta SÍ exige evidencia. | Hoy: **invisible** — `getBackend()` resuelve en silencio, sin log de advertencia distinguible de una desactivación deliberada. |
| `RETRIEVAL_ERROR` | Un componente del pipeline falló de verdad (RPC, HF, red) — no es que no haya evidencia, es que no se pudo ni siquiera intentar de forma confiable. | Hoy: capturado y convertido en el mismo shape que evidencia-cero (`ResultadoRAG.error` existe pero nadie lo lee para bifurcar el gate). |

---

## 3. Reglas de decisión (diseño)

Aplican únicamente cuando la ruta/modo exige evidencia
(`rutaCorpusObligatoria === true`, mismo criterio que hoy en `route.ts`). Si
no la exige → `NOT_REQUIRED` siempre, sin evaluar nada más (sin cambio
respecto a hoy).

### 3.1 RAG deshabilitado por accidente

```
SI rutaCorpusObligatoria Y getBackend() === 'disabled'
   Y la razón NO es una configuración explícita documentada como intencional
ENTONCES → CONFIGURATION_ERROR
NUNCA → invocar al LLM sin señalizar esto de forma distinguible
   (hoy: se invoca al LLM igual si rutaCorpusObligatoria=false en ese
   contexto, o se abstiene igual que NO_VERIFIED_EVIDENCE si es true —
   ninguno de los dos casos hoy alerta a nadie de que es un problema de
   configuración, no de contenido).
```

Nota de diseño: distinguir "disabled intencional" de "disabled accidental"
requiere una tercera señal que hoy no existe en ningún lado — por ejemplo,
una variable explícita `RAG_BACKEND=disabled` (intencional, documentado) vs.
la inferencia silenciosa de `getBackend()` cuando `RAG_BACKEND` está ausente
o es inválido (accidental). El contrato exige que `getBackend()` en una fase
posterior devuelva también **por qué** llegó a `disabled`, no solo el valor
final.

### 3.2 Fallo de embedding

```
SI embedQuery() falla (timeout HF, error HTTP)
ENTONCES → intentar la estrategia determinista (exact resolver) SI todavía
   no se intentó — el exact resolver no depende de HF, sigue funcionando.
SI el exact resolver ya se intentó y no aplica (consulta sin número de
   artículo) → RETRIEVAL_ERROR, NUNCA se presenta como "corpus vacío"
   (NO_VERIFIED_EVIDENCE) sin distinción.
```

Esto ya es parcialmente cierto hoy (el exact resolver corre antes y no
depende de HF) — lo que falta es que, cuando SÍ dependía de HF y HF falló, el
sistema lo declare como `RETRIEVAL_ERROR` en vez de fusionarlo con
"no había nada que encontrar".

### 3.3 Fallo de Supabase — distinguir ERROR de ZERO_RESULTS

```
SI la RPC principal responde SIN error Y data.length === 0
ENTONCES → resultado válido de cero evidencia → continúa a la regla 3.4
SI la RPC principal responde CON error (normal.error)
ENTONCES → RETRIEVAL_ERROR explícito, nunca colapsado silenciosamente en
   fragmentos:[] indistinguible de zero-results
```

Gap confirmado en el código actual: `buscarEnSupabase` ya lanza en este caso
(`throw new Error(...)`) — el problema no es que no se detecte, es que
**una vez capturado por el `catch` de `buscarRAG`, el resultado tiene
exactamente el mismo shape (`fragmentos: []`) que un cero-resultados
legítimo**, salvo por el campo `error` que nadie lee para el gate.

### 3.4 Cero evidencia válida (genuina, sin error de infraestructura)

```
SI backend funcionó correctamente Y fragmentos.length === 0 (sin ambigüedad,
   sin error)
ENTONCES → OFFICIAL_FALLBACK_REQUIRED (no NO_VERIFIED_EVIDENCE todavía —
   ver §4, cadena de fallback NO implementada en esta fase)
```

### 3.5 Artículo exacto inexistente

```
SI detectarArticuloExacto() encontró número + instrumento Y
   buscarArticuloExacto() no encontró ningún candidato válido
ENTONCES → NO_VERIFIED_EVIDENCE directo (NUNCA cae a semántica cuando el
   usuario especificó instrumento — esto YA es el comportamiento actual y
   correcto, documentado en search.ts: "no puede citar un artículo de un
   instrumento distinto con el mismo número"). Sin contaminación semántica.
```

Esta regla **ya está satisfecha hoy** por `buscarRAG` — se documenta aquí
para que el contrato completo quede escrito en un solo lugar, no porque haya
un gap.

---

## 4. Cadena de fallback automatizado — diseño de interfaces (NO implementado)

```
Corpus MayaLex (biblioteca_vectores)
  → Official Honduras Source Adapter   (ej. Poder Judicial, Gaceta, Congreso)
  → Jurisprudence Adapter               (criterios/jurisprudencia oficial)
  → Secondary Research Adapter          (Tavily ya existente, reencuadrado
                                          como el ÚLTIMO eslabón, no un
                                          paralelo independiente como hoy)
```

```typescript
// DISEÑO — ningún adapter se implementa en esta fase.
export interface EvidenceAdapter {
  name: string;
  authorityLevel: 'OFFICIAL' | 'JURISPRUDENCE' | 'SECONDARY';
  attempt(intent: LegalQueryIntent): Promise<LegalEvidence[] | null>; // null = no intentó / no disponible, nunca lanza
}
```

Nota de diseño explícita: esta cadena **reordena conceptualmente** dónde vive
Tavily. Hoy Tavily corre en paralelo al RAG interno, con jerarquía declarada
solo dentro del texto del prompt ("corpus interno > web"). En este diseño,
Tavily pasaría a ser el adapter de último recurso DENTRO de la cadena de
`OFFICIAL_FALLBACK_REQUIRED`, activado solo cuando el corpus interno no tuvo
nada — no un paralelo que siempre corre si el usuario activó el toggle. Esto
es un cambio de comportamiento real y **no se implementa en esta fase**;
queda registrado como decisión pendiente de aprobación explícita antes de
Fase 1C.

---

## 5. Tests de contrato — diseño y verificación contra comportamiento ACTUAL

Para cada escenario se indica: (a) el `RetrievalExecutionState` que el
contrato asignaría, (b) qué hace el código HOY realmente (verificado, no
supuesto), (c) si hoy ya cumple el contrato o es un GAP.

| # | Escenario | Estado de contrato | Comportamiento HOY (verificado) | ¿Cumple? |
|---|---|---|---|---|
| A | `RAG_BACKEND` ausente + credenciales Supabase presentes | `SEMANTIC_SUCCESS`/`EXACT_SUCCESS` (según consulta) | `getBackend()` infiere `'supabase'` — funciona correctamente | ✅ Cumple (ya arreglado por `a7be9ee`) |
| B | `RAG_BACKEND=disabled` explícito | `NOT_REQUIRED` si la ruta no exige evidencia; si la exige, debería ser `CONFIGURATION_ERROR` **solo si fue accidental** — pero `disabled` explícito es una decisión válida, no un error | Hoy: `fragmentos:[]` sin distinción de intencionalidad | ⚠️ Parcial — no hay forma de que el sistema sepa si fue intencional |
| C | Supabase RPC responde con error | `RETRIEVAL_ERROR` | `buscarEnSupabase` lanza → `buscarRAG` catch → `{fragmentos:[], error: msg}` → **`route.ts` no bifurca en base a `error`** | ❌ GAP — el dato existe pero no se usa |
| D | HF timeout (12s) | `RETRIEVAL_ERROR` (si no hay exact match posible) | Mismo catch genérico que C — indistinguible | ❌ GAP — mismo problema que C |
| E | Artículo exacto inexistente (ej. Art. 9999) | `NO_VERIFIED_EVIDENCE` | `buscarArticuloExacto` retorna `{fragmentos:[], ambiguo:false}` → fail-closed gate se activa correctamente, mensaje de abstención correcto | ✅ Cumple |
| F | Cero resultados semánticos (sin número de artículo) | `OFFICIAL_FALLBACK_REQUIRED` (diseño) | Hoy no existe el concepto — se trata igual que E | ⚠️ Parcial — funcionalmente correcto (se abstiene), pero sin la oportunidad de fallback oficial que el diseño propone |
| G | Corpus insuficiente + web disponible (`webSearch=true`, Tavily con resultados) | Debería informar al modelo con jerarquía corpus>web, pero el fail-closed gate de HOY se evalúa **solo sobre `ragData.fragmentos`**, ignorando si hay contexto web disponible | Confirmado en código: `evidenciaInsuficiente` no considera `contextoWeb` en absoluto — si el corpus está vacío pero Tavily trajo resultados relevantes, **el sistema se abstiene igual, sin usar la evidencia web disponible** | ❌ GAP — no documentado antes de este análisis |
| H | Corpus insuficiente + web no disponible | `NO_VERIFIED_EVIDENCE` | Abstención correcta, mensaje genérico | ✅ Cumple |
| I | Modo `sala_ia`/`sala_penal` | `NOT_REQUIRED`, `LLM_WITHOUT_CORPUS_ALLOWED_BY_DESIGN=true` | `usarRouter=false` siempre para estos modos → LLM responde sin corpus, por diseño | ✅ Cumple — comportamiento intencional, NO se cambia en esta fase (ver §6) |
| J | Modo de análisis jurídico (`analisis`/`analisis_penal`/`escritos_penales`/`documento`) con consulta válida y corpus con evidencia real | `EXACT_SUCCESS` o `SEMANTIC_SUCCESS` | Funciona correctamente hoy | ✅ Cumple |

**Hallazgo más importante de esta sección:** el escenario **G** es un gap
real no identificado en la auditoría de lineage anterior — hoy, si el corpus
interno no tiene el artículo pero Tavily SÍ trajo información relevante y
verificable de fuentes oficiales, el sistema igual se abstiene, desperdiciando
evidencia disponible. Esto es exactamente el caso de uso que motiva la cadena
de fallback de §4.

---

## 6. Riesgo documentado, NO corregido en esta fase

```
LLM_WITHOUT_CORPUS_ALLOWED_BY_DESIGN = true
```

Aplica a: `sala_ia`, `sala_penal`. Es una decisión de producto (chat rápido,
conversacional, sin la fricción de recuperación documental) — **no un bug**.
Este documento no cambia `usarRouter`, `MODOS_SALA`, ni ninguna condición de
`clasificarConsulta`. Cualquier decisión de exigir corpus también en modos
"sala" es un cambio de producto que requiere autorización explícita separada,
no una consecuencia de este contrato.

---

## 7. Qué NO se hizo en esta fase (explícito)

- No se creó `lib/legal-retrieval/evidence-engine.ts` ni ningún archivo de
  producción nuevo.
- No se modificó `route.ts`, `search.ts`, `embed.ts`, `rerank.ts`, ni
  `tavily.ts`.
- No se implementó ningún `EvidenceAdapter`.
- No se cableó `RetrievalExecutionState` a ninguna función real.
- No se corrigió el gap G (corpus vacío + web disponible) ni el gap C/D
  (error vs. zero-results) — quedan documentados como deuda explícita,
  pendientes de una fase de implementación autorizada por separado.
- No hubo commit, push, ni escritura en Supabase.
