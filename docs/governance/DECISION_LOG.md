# Decision Log — Maya Lex IA

Registro de resoluciones del fundador (Fredy Pinel) sobre cambios de gobernanza y
operaciones de alto impacto en `mayalexhn.com`. Cada entrada queda fechada y
referenciada — este archivo es la fuente de verdad de qué fue autorizado, por quién,
y bajo qué condiciones, independiente de la memoria de cualquier sesión de trabajo.

---

## 2026-08-XX — Bloqueo de producción original

**Resolución**: Maya Lex V2 (`mayalexhn.com`) declarado PRODUCTION — PROTECTED / LOCKED.
Prohibido modificar código, mergear, migrar, cambiar configuración de Supabase/Vercel,
sincronizar clones, refactorizar o actualizar dependencias sin autorización explícita
del fundador para esa acción puntual. Ver contexto histórico completo en la memoria de
sesión `feedback_mayalex_production_lock`.

---

## 2026-08-27 — Operación "Facultades Completas": autorización y reglas de riesgo controlado

**Resolución**: el fundador autoriza formalmente la integración de capacidades V1
(corpus normativo P0, corpus profesional anonimizado, OSINT) y nuevas capacidades
(Expediente Privado, Voz, QuotaPaywall, ingeniería comercial completa, activación de
jurisprudencia piloto), sustituyendo el bloqueo de producción anterior por las
**Reglas de Riesgo Controlado (R1–R8)**:

- **R1**: toda capacidad nueva o fusionada sale detrás de feature flag, default OFF.
- **R2**: kill switch global por flag, editable sin redeploy.
- **R3**: activación inicial solo para rol admin y grupo controlado (lista de correos).
- **R4**: RLS estricto en toda tabla nueva; backup de Supabase antes de cada migración.
- **R5**: cero PII en logs; nunca imprimir contenido de documentos, solo metadatos.
- **R6**: hallazgos del corpus P0 sin prueba automática posible quedan excluidos hasta
  revisión humana del equipo jurídico — nunca resueltos por el asistente.
- **R7**: el corpus profesional anonimizado nunca reproduce fragmentos con datos de
  terceros — solo aporta estructura/criterio/lenguaje/patrones.
- **R8**: Preview deploy por fase → verificación → merge a `main` con flag OFF →
  activación gradual.

Plan completo entregado en `plan-integracion-facultades-completas.md` (6 fases + Fase 0
de prerrequisito de infraestructura, no solicitada originalmente pero identificada como
bloqueante para R1/R2).

**Decisiones específicas del fundador sobre el plan (mismo día)**:

- **D1 — Fase 0 (infraestructura de flags)**: APROBADA. Ejecutar primero.
- **D2 — Fase 1 (corpus normativo P0)**: APROBADA según la propuesta. Hallazgos
  técnicos de `HUMAN_LEGAL_REVIEW_QUEUE` se resuelven con prueba automática; los de
  fondo jurídico quedan EXCLUIDOS de producción hasta revisión del equipo jurídico del
  fundador — el asistente nunca decide fondo jurídico. La cola se entrega en bloques de
  50 para revisión.
- **D3 — Fase 2 (corpus profesional anonimizado)**: **Opción B** — ningún texto
  profesional crudo se indexa para retrieval. Se construye una capa de extracción de
  patrones/estructura previa a la indexación. Los documentos originales permanecen
  únicamente en un bucket privado accesible por rol admin (curaduría), fuera del RAG.
  Escaneo automático anti-reidentificación sobre el 100% del corpus; auditoría semántica
  de reidentificación sobre muestra estadística; cualquier documento marcado por
  cualquiera de los dos métodos queda excluido. Los fragmentos ejemplares candidatos
  solo entran a la biblioteca de modelos con aprobación humana documentada.
- **D4 — Fases 3–6**: APROBADAS según el desglose del plan. Ejecución fase por fase,
  con reporte intermedio antes de continuar a la siguiente.
- **D5 — Gobernanza**: este archivo. Cada resolución del fundador queda registrada aquí
  con fecha y referencia.

**Alcance explícito de esta autorización**: entorno con únicamente usuarios controlados
del entorno personal del fundador; no hay lanzamiento público de estas capacidades hasta
activación explícita posterior fase por fase.

---

## 2026-08-27 — Cierre de Fase 0

Tabla `feature_flags` aplicada y verificada en producción (6 flags, todos `enabled:
false`). `lib/flags.ts` (fail-closed) mergeado a `main`, desplegado, sin código
consumiéndola todavía — cero impacto de comportamiento. Ver commit `752d8d0` /
merge `0bbecef`.

---

## 2026-08-27 — Fase 1, inicio de triage: HUMAN_LEGAL_REVIEW_QUEUE.jsonl

**Corrección de alcance**: el archivo real tiene 958 líneas, no 602 (cifra del
commit original). Los bloques de 50 se numeran sobre las 958 líneas reales.

**Bloque 1/N** (líneas 1–50, `HN_CODIGO_FAMILIA`, artículos 5–72) clasificado con
prueba automática de dos niveles (normalización de texto + detección de ruido de
extracción de PDF). Resultado: 27 técnicos resueltos, 23 jurídicos pendientes.
Hallazgo de prioridad alta para el equipo jurídico: Art. 68/70 muestran una
diferencia sustantiva real (régimen de bienes separados vs. sociedad de gananciales
como régimen por defecto), no un defecto de extracción. Detalle completo en
`docs/governance/fase1-triage/hn-codigo-familia-bloque-01.md` y `.json`.

Ningún hallazgo de fondo jurídico fue resuelto por el asistente — todos los 23
quedan en la cola de revisión humana, consistente con D2.

---

## 2026-08-27 — Bloque 2/N + paquete Art. 68/70 + Nivel 3 del clasificador

Autorización del fundador (misma fecha): "Continúa con bloque 2... El Art 68/70 lo
revisa mi equipo jurídico... márcalas como prioridad ALTA... no detengas el
proceso." Incorpora también instrucciones de gobernanza detalladas: ranking de
fuente (Gaceta > CEDIJ con fecha > PDF TSC/OEA), `tecnico_resuelto ≠ aprobado para
corpus`, métrica de 958 congelada explícitamente como líneas del archivo de
hallazgos (no artículos, no líneas de código), un commit por bloque sin pedir
permiso entre bloques técnicos, y un nuevo Nivel 3 de clasificador (separar notas
de reforma embebidas del cuerpo antes de comparar).

**Auditoría de calidad realizada** (10 hallazgos técnicos re-verificados con texto
completo, 5 antes y 5 después de corregir bugs) — **se encontraron y corrigieron 2
bugs reales** en el normalizador durante el proceso, documentados en
`hn-codigo-familia-bloque-02.md`. Ningún hallazgo jurídico fue forzado a técnico.

**Bloque 2** (líneas 51-100, mezcla de dos tipos de hallazgo): 24 técnicos, 15
reforma-candidata (12 de prioridad ALTA, 3 MEDIA), 11 dato-faltante (7
corroborados por gaps documentados en el manifest de extracción, 4 sin
corroboración).

**Hallazgo de prioridad ALTA**: 12 artículos (119-B, 120-A a 120-D, 122, 123, 123-D
a 123-H) de la sección de adopción muestran la versión local marcada "Derogado",
con una cita completa y verificable: "Artículo 120. Derogado mediante Decreto
102-2018 del 25 de septiembre de 2018. Publicado en el Diario Oficial La Gaceta
No.34,841 de fecha 10 de enero de 2019." La versión TSC (base) no refleja esta
derogación. No se resolvió ni se marcó como vigente -- va a la cola jurídica.

**Paquete Art. 68/70** entregado por separado en `art-68-70-cotejo.md`: cotejo TSC
vs. local, confirmación de que Arts. 70-A a 70-D existen solo en la versión local
(evidencia estructural, no prueba), hipótesis de Decreto 31-2015 marcada
explícitamente como no verificada -- no se intentó descargar Gaceta 33.799 por no
tener una fuente confiable disponible en esta sesión para ese tipo de verificación.

Detalle completo: `hn-codigo-familia-bloque-02.md` / `.jsonl`, `art-68-70-cotejo.md`.

---

## 2026-08-27 — Verificación de seguridad post-bloque-2 + esquema de resoluciones

**Verificación solicitada por el fundador (urgente, solo lectura)**: los 13
artículos marcados "Derogado"/candidatos de reforma (68, 70, 119-B, 120-A a
120-D, 122, 123, 123-D a 123-H) tienen `es_norma_vigente=false` en
`biblioteca_vectores` de producción -- confirmado en vivo. No aparecen en la
lista de citas estructuradas ni en el lookup exacto por artículo (ambos exigen
`es_norma_vigente=true`).

**Gap real encontrado y NO mitigado**: la búsqueda semántica "normal" en
`lib/rag/search.ts` (`buscarEnSupabase`) no filtra por `es_norma_vigente` --
solo hay una llamada paralela adicional filtrada a vigentes, cuyos resultados
se fusionan con los de la búsqueda sin filtrar. Además, estos 13 registros
(fuente_tipo='codigo', jurisdiccion='HN', es_norma_vigente=false) no encajan
en ninguna de las tres etiquetas de advertencia que ya existen en
`formatearContextoRAG` -- aparecerían en el contexto del modelo SIN ninguna
etiqueta, a diferencia de jurisprudencia/doctrina que sí se marcan. Propuestas
de salvaguarda (sello en código vs. exclusión real de la búsqueda semántica)
entregadas al fundador, **ninguna aplicada** -- pendiente de su aprobación.

**Esquema de resoluciones jurídicas**: confirmado aplicable con 3 ajustes --
`estado` como enum cerrado (no texto libre), `texto_vigente_fuente` separado
en `origenTextoVigente` (puntero) + `textoVigenteLiteral` (solo si aplica), y
`fundamento` estructurado (decreto/fecha/gaceta) en vez de texto libre.
Pendiente de confirmación del fundador.

**Estimación de esfuerzo entregada** (decisión pendiente del fundador) para
los 7 "dato faltante" corroborados por gaps del pipeline: re-extraer con
parser corregido (medio, ~1 sesión) vs. excluir y usar solo TSC/base para
esos 7 (bajo, casi sin trabajo nuevo, sin conflicto activo que resolver).

---

## 2026-08-27 — Oportunidad de producto derivada del triage: "estado de vigencia visible con cita de derogación"

El proceso de triage de Fase 1 produce, para cada artículo con contradicción
resuelta, un dato ya estructurado y verificable: estado (vigente/derogado/
reformado) + cita exacta del decreto y Gaceta que lo sustenta. Hoy ese dato
solo existe internamente (sellos V0-V5, columna `es_norma_vigente`) -- nunca
se expone al usuario final en la respuesta del chat.

**Oportunidad**: extender el sistema de verificación V0-V5 ya visible en
producción para mostrar explícitamente, cuando aplique, un estado de vigencia
con su cita de derogación directamente en la respuesta (ej. un badge o nota
"Este artículo fue derogado por Decreto 102-2018, La Gaceta No.34,841" en vez
de simplemente omitir el artículo o dejarlo fuera de las citas sin
explicación). Convierte un hallazgo de auditoría en una ventaja de producto
real: transparencia de vigencia como diferenciador, no solo como control
interno de calidad.

**Estado**: registrado como oportunidad, no implementado, no priorizado.
Requiere decisión de producto del fundador sobre si entra al roadmap.

---

## 2026-08-27 — Descubrimiento mayor: retractación en el propio archivo de cola + defecto de extractor confirmado

Al preparar el bloque 3 (líneas 101-150), se descubrió que `HUMAN_LEGAL_REVIEW_QUEUE.jsonl`
no es una lista plana -- líneas 357-958 son una segunda pasada de investigación
posterior (mismo día) que:

1. Primero concluyó (línea 693) que la extracción local del Código de Familia
   cubre solo artículos 3-123 (misma conclusión a la que había llegado esta
   sesión de forma independiente en el bloque 2/3).
2. **Retractó esa conclusión** (línea 940, `RETRACTACION_HALLAZGO_ALCANCE_DOCUMENTO`,
   prioridad ALTA): el PDF local es el Código COMPLETO de 338 artículos, confirmado
   por lectura directa del texto crudo (cláusula de vigencia + firma de
   promulgación). El límite de 123 es un **defecto confirmado del extractor**
   (`intentarSepararNotaAlPie` en `lib/ingesta-oficial/extraccion-ndestructiva.ts`,
   ventana de nota al pie fija de 10 que se desincroniza por la alta densidad de
   notas al pie del Capítulo de Adopción) -- NO un límite real del documento. Sin
   fix aplicado todavía.
3. Confirmó por lectura directa (`HALLAZGO_DEROGACION_EXPLICITA_CONFIRMADA_POR_TEXTO_FUENTE`,
   línea 941), con cita textual literal del PDF, que 24 artículos (120, 120-A a
   120-D, 121, 122, 123, 123-A a 123-H, 124-130, 132) citan su propia derogación
   vía Decreto 102-2018 / La Gaceta No.34,841 (2019-01-10) -- extiende y confirma
   con evidencia más fuerte el hallazgo del bloque 2.
4. Confirmó que el **Art. 131 sí tiene contenido sustantivo vigente** -- no todo
   lo posterior al 123 está derogado.

**Corrección aplicada**: Art. 121 y 123-C, clasificados en el bloque 2 como
`DATO_FALTANTE`, se reclasifican a `DEROGADO_CONFIRMADO_POR_FUENTE` -- ver
`hn-codigo-familia-bloque-02-CORRECCION.jsonl`. No estaban ausentes, estaban en
cuarentena por el defecto de extractor.

**Verificación de seguridad extendida** (producción, solo lectura): 121, 123-C,
124-132 -- los 11 -- tienen `es_norma_vigente=false`. Mismo patrón que el bloque
2, mismo gap sin mitigar ya documentado (búsqueda semántica sin filtro).

**Bloque 3 NO se publica como resuelto**. De los 50 artículos (124-173): 8
confirmados derogados, 1 (Art. 131) confirmado vigente pero sin texto disponible
en los hallazgos revisados, y **41 (133-173) genuinamente sin resolver** --
bloqueados por el mismo defecto de extractor, no por ausencia real. Ver
`hn-codigo-familia-bloque-03-RETRACTACION.md`.

**Recomendación registrada**: no continuar generando bloques mecánicos de
`AUSENTE_EN_VERSION_LOCAL` (comparten esta misma incertidumbre estructural en todo
el rango 90-336 del archivo) hasta decidir corregir el extractor o leer a mano
contra el PDF. El triage de comparación textual de valor real
(`CLASIFICACION_AMBIGUA_REFORMA_VS_EXTRACCION`, líneas 1-89) ya está completo.

**Grupo secundario documentado, sin resolver**: 30 hallazgos de
`HN_LEY_ORGANIZACION_ATRIBUCIONES_TRIBUNALES` -- 2 resueltos, 5 enriquecidos pero
pendientes de revisión legal (incluye una inconsistencia de fecha detectada en
Decreto 54), varios sin ninguna investigación posterior. Ver
`decretos-tribunales-pendientes.md`.

---

## 2026-08-27 — Resolución consolidada del fundador D6-D12 (arbitraje Qwen + auditoría Grok)

El fundador integra revisión de otros dos sistemas (Qwen como árbitro, Grok como
auditor independiente) y resuelve los puntos abiertos. Ejecutado en orden:

**D10.5 — control del Nivel 3**: regex "Reformado mediante Decreto" corrido contra
el bloque 1 completo. **7 de 50 artículos con match (no 0)** -- confirma que el
regex no está roto. Art. 11 y Art. 25 confirmados con match, como esperaba el
fundador. Hallazgo colateral no buscado: Art. 31 (local) cita textualmente
"Reformado mediante Decreto 31-2015, del 7 de abril de 2015" -- confirma que ese
decreto existe con fecha 2015-04-07, agregado al dossier 31-2015
(`art-68-70-cotejo.md`).

**D10.1 — corrección Art. 120**: la auditoría de Grok detectó que el Art. 120
quedó contradictoriamente en dos estados (DATO_FALTANTE en el bloque 2 vs.
confirmado-derogado en la retractación) -- error real: se corrigieron 121 y
123-C en la ronda anterior pero se omitió 120 mismo. Corregido en
`hn-codigo-familia-bloque-02-CORRECCION.jsonl` y en el encabezado de
`hn-codigo-familia-bloque-02.md` (cifra de dato-faltante corregida de 11 a 8).

**D10.2 — cruce completo AUSENTE × lista Art.63 (Decreto 102-2018)**: de los 247
hallazgos `AUSENTE_EN_VERSION_LOCAL_CAUSA_NO_CONFIRMADA` en las 958 líneas
(no solo bloques 2-3 -- el archivo completo):
- **40 coinciden con la lista** proporcionada por el fundador → `DEROGADO_CANDIDATO`.
- **2 son Art. 1 y 2** → incidente técnico, no derogación (D10.3).
- **205 no están explicados** por la lista ni son 1-2 -- quedan documentados en
  `extractor-defecto-alcance.md`, no procesados uno por uno (pausados por D9).

**Discrepancia encontrada, no resuelta por el asistente**: Art. 129 tiene
evidencia textual directa de derogación (línea 941 del archivo fuente) pero NO
aparece en la lista del Art.63 proporcionada. Marcada explícitamente para
revisión del equipo jurídico en `dossier-DEROGACION_ADOPCION_102-2018.md`.

**D10.4 — dossier único**: `dossier-DEROGACION_ADOPCION_102-2018.md` consolida
Nivel 1 (25 artículos, evidencia textual directa) + Nivel 2 (30 artículos,
candidatos por lista) = 55 artículos totales. Dossiers separados confirmados:
31-2015 en `art-68-70-cotejo.md` (renombrado como dossier 31-2015), 35-2013 nuevo
en `dossier-35-2013-NINEZ.md` (solo indicios de reforma, no derogación --
distinto patrón).

**D11 — resoluciones masivas preparadas, sin aplicar**:
`resoluciones-dossier-102-2018.jsonl`, esquema extendido con `articulos: []`
(D7), dos registros (Nivel 1 y Nivel 2), ambos `estado: DEROGADO_CANDIDATO` --
ninguno se marca `DEROGADO` sin ratificación humana, incluso el Nivel 1 con
evidencia textual directa.

**D9 — extractor re-encuadrado**: alcance documentado en
`extractor-defecto-alcance.md` -- (a) Arts. 1-2 marcados como posible defecto
DISTINTO (no confirmado, están lejos de la zona de alta densidad de notas al pie
que causa el defecto ya conocido), (b) 205 artículos ausentes sin explicar por
ningún dossier, (c) alcance de re-extracción completa. Triaje mecánico de
`AUSENTE_EN_VERSION_LOCAL` ya explicado, pausado.

**D7 — esquema confirmado con extensión**: `articulos: []` además de `articulo`
(string) para resoluciones masivas, fail-hard por elemento -- aplicado en
`resoluciones-dossier-102-2018.jsonl`.

**Pendiente de este mismo turno**: D6(a) -- cambio de código en producción
(`formatearContextoRAG`, default nunca null) -- ver entrada siguiente cuando se
complete. D6(b) -- exclusión real (Opción B) -- mismo sprint, no en este turno.
D12 -- bloque 3 con el método nuevo, próximo turno.

---

## 2026-08-28 — D6(a) y D6(b) desplegados a producción; corrección de Grokbot DevOps

D6(a) (etiqueta) y D6(b) (exclusión real de `biblioteca_vectores` no vigente +
`fuente_tipo='codigo'` + `jurisdiccion='HN'` de la búsqueda semántica sin filtro)
mergeados a `main` y confirmados en vivo en `mayalexhn.com`. Auditoría de
Grokbot DevOps encontró que D6(a) por sí solo era insuficiente (la etiqueta no
impedía que el fragmento llegara al contexto) -- corregido con D6(b) en commit
separado, con las dos pruebas obligatorias del fundador verdes: consulta de
adopción sin 119-B/120 en el contexto, `buscarArticuloExacto("120")` confirma
el filtro `es_norma_vigente=true` real. Detalle completo con diffs y logs en
la conversación -- no repetido aquí para no duplicar.

## 2026-08-28 — GAP 1-4 (auditoría post-D6b)

**GAP 1 (smoke test)**: no fue posible autenticarse en `mayalexhn.com` -- sin
credenciales, y entrar contraseñas en nombre del fundador es una acción
prohibida para el asistente incluso si se solicita explícitamente. Prueba
equivalente ejecutada contra producción real: RPC `buscar_biblioteca_v2` real,
con el embedding real del Art. 119-B (caso más adversarial posible) como
consulta. Sin el filtro D6(b): 10/10 filas devueltas eran no-vigentes. Con el
filtro D6(b) aplicado: 0 filas. Cero de los 16 artículos derogados listados
por el fundador aparecieron en ningún resultado. Consecuencia honesta: para
una consulta centrada en el capítulo derogado de adopción, el contexto queda
vacío (correcto -- activa el fail-closed ya existente en `chat/route.ts` en
vez de alucinar), lo que sugiere que no queda regulación de adopción vigente
en este corpus tras el Decreto 102-2018.

**GAP 2 (fallback a derogación confirmada)**: implementado en
`lib/rag/search.ts` -- `buscarArticuloExacto()` ahora intenta un segundo paso
(solo artículos confirmados no vigentes) cuando no hay match vigente, mismo
resultado nunca citable como norma (protecciones D6a/D6b ya existentes, sin
cambios). **Desviación documentada de la instrucción literal**: el contenido
sugerido ("Artículo derogado" o vacío) habría sido rechazado por
`tieneEncabezadoArticulo()` -- el filtro de calidad que ya existe para
rechazar fragmentos sin encabezado real. Se usa en su lugar el formato
"ARTICULO N.- Derogado mediante Decreto 102-2018..." (mismo texto ya
confirmado por lectura directa de fuente para el resto del dossier). 6
pruebas nuevas, incluida una que confirma explícitamente que el contenido
genérico SÍ sería rechazado. Preview + merge a `main` pendiente de
confirmación en este mismo turno. Ingesta real de 123-A/123-B: pendiente,
después del merge del código.

**GAP 3 (68/70)**: `SELECT * FROM biblioteca_vectores WHERE num_articulo IN
('68','70') AND fuente='Codigo de Familia' AND es_norma_vigente=true` → **0
filas**, confirmado. **68/70 requieren dictamen del equipo jurídico antes de
ingestar texto vigente** -- no se rellenó con texto TSC (sería citar
derogado/incierto como vigente). Resolución `INDETERMINADO` preparada en
`resolucion-68-70-indeterminado.jsonl`, sin aplicar. No es un gap técnico del
extractor -- ambas versiones (TSC y local) SÍ tienen texto extraído; el
problema es que dan contenido sustantivamente distinto y no hay forma de
saber cuál -- si alguna -- es la redacción vigente sin cotejo directo contra
Gaceta 33.799.

**GAP 4 (auditoría de los 6 modos)**: ver análisis completo abajo.

---

*GAP 4: ver `gap4-auditoria-6-modos.md` -- 4 de 6 modos usan el RAG
(`analisis`, `analisis_penal`, `escritos_penales`, `documento`), ninguno
necesita datos no-vigentes como feature hoy, D6(b) bien alcanzado.*

---

## 2026-08-28 — Cierre de GAP 2: código desplegado + datos insertados + verificado

Código de GAP 2 (`buscarArticuloExacto` con fallback a derogación confirmada)
mergeado a `main`, confirmado en vivo en `mayalexhn.com` (deployment
`f168c85`).

**Datos insertados en producción** (`biblioteca_vectores`, proyecto
`thgrhueckkjdutjvcufp`): dos filas nuevas, `123-A` y `123-B`, Código de
Familia, `es_norma_vigente=false`, contenido con formato de encabezado real
("ARTICULO 123-A.- Derogado mediante Decreto 102-2018...") para pasar el
filtro de calidad `tieneEncabezadoArticulo()` ya existente -- no el
"Artículo derogado" genérico sugerido originalmente (ver GAP 2 arriba).
Embedding reutilizado del hermano `123-D` ya existente (irrelevante para la
seguridad de estos registros, ya que D6b los excluye de cualquier ruta
semántica sin depender de similitud vectorial).

**Verificado en vivo, solo lectura, contra producción real**: la consulta de
dos pasos que hace el código desplegado -- primero `es_norma_vigente=true`
(0 filas), luego el fallback `es_norma_vigente=false` (2 filas, exactamente
123-A y 123-B) -- confirmada exactamente como se esperaba.

**Hallazgo colateral de calidad de datos, no corregido, solo anotado**: la
fila hermana `123-D` (ya existente, insertada en una carga anterior) tiene
`es_norma_vigente=false` correcto en la columna real, pero su
`metadata.estado_articulo` interno todavía dice `"VIGENTE"` -- inconsistencia
preexistente que no afecta ninguna ruta de la aplicación (solo lee la
columna real, nunca el metadata para esa decisión), pero vale la pena
limpiarla en un backfill futuro del corpus.

GAP 1-4 cerrados. Pendiente exclusivamente: dictamen del equipo jurídico
sobre Art. 68/70 (GAP 3) y ratificación de las resoluciones preparadas
(`resoluciones-dossier-102-2018.jsonl`, `resolucion-68-70-indeterminado.jsonl`).

---

## 2026-08-28 — Cierre de auditoría GAP1-4: confirmaciones sin código nuevo

**GAP 2 — verificación final, sin más inserts**: `construirCitas`
(`app/api/chat/route.ts:171`, `if (f.es_norma_vigente !== true) continue;`) y
el paso 2 de `buscarArticuloExacto` (`lib/rag/search.ts:335-357`, match
exacto por `numero`, solo se intenta si el paso vigente devolvió 0)
confirmados en el código real de `main`. Confirmado además, en vivo contra
producción, que el stub `123-A` -- que sí tiene un embedding real (copiado
de `123-D`) -- **también** queda excluido del RPC semántico
(`buscar_biblioteca_v2` + filtro D6b da 0 filas usando el propio embedding
de 123-A como consulta) -- mismo resultado que 119-B. No se insertó nada
adicional.

**GAP 4 — decisión de producto explícita, no un gap a corregir**:
`sala_ia` y `sala_penal` no pasan por `buscarEnSupabase` **por diseño**, no
por omisión. Son los modos de audiencia en tiempo real (Haiku 4.5, <150
palabras, sin `thinking`) -- priorizan latencia mínima sobre grounding
documental profundo, y su propio system prompt (`SALA_IA_SYSTEM_PROMPT`) ya
exige citar artículo + texto literal + argumento corto sin necesitar
recuperación semántica. Meter RAG a ciegas en estos dos modos sería una
regresión de velocidad para resolver un problema que no existe -- no se
toca código por esto.

**GAP 3 (68/70)**: sin cambios -- siguen sin ingestarse, esperando dictamen
del equipo jurídico o el índice/articulado completo del Decreto 31-2015 (o
el instrumento que corresponda). Resolución `INDETERMINADO` sigue sin
aplicar.

**GAP colateral (metadata de 123-D, similitud=1 duplicada entre varios
artículos)**: registrado como backlog, sin backfill ahora.

**Sin tocar**: bloque 3, defecto de extractor (D9),
`T022-staging-piloto.sql`.

---

## 2026-08-28 — D9: fix del extractor + merge acotado a corpus-p0 + topología de ramas

**Nota de repositorio**: este ítem vive fuera de `mayalex-rag-citations-integration`
— el pipeline de ingesta (`lib/ingesta-oficial/*`) y el corpus no forman
parte de esta app de producción, viven en el grupo de worktrees compartidos
`mayalex-corpus` / `mayalex-jurisprudence` / `mayalex-harness` / `mayalex-qa`
(mismo object store, distintas ramas checked-out). Se documenta aquí porque
este archivo es la bitácora de gobernanza de facto de toda la sesión.

**Topología de ramas verificada** (worktree `C:\dev\mayalex-corpus`):
- `feature/mayalex-official-corpus-p0` es la rama base real del pipeline de
  ingesta — NO `main` de ese repo. `main` de `mayalex-corpus` es un
  snapshot histórico distinto que no contiene `lib/ingesta-oficial/` en
  absoluto y trae contenido no relacionado (billing/PixelPay, marketing
  v2) — confirmado por `git diff --name-status main feature/mayalex-official-corpus-p0`
  antes de mergear nada. El fundador confirmó (consenso Qwen/Grokbot/Gemini)
  que el target correcto es `feature/mayalex-official-corpus-p0`.
- Rama de trabajo `fix/extractor-ventana-nota-adopcion`, creada directamente
  desde la punta de `feature/mayalex-official-corpus-p0` (commit `72d1948`).
  `git merge-base --is-ancestor` confirmó `72d1948` como ancestro común
  exacto en el momento del merge — cero commits de diferencia, no hizo
  falta rebase.
- Commit de trabajo completo (fix + tests + script de re-extracción +
  staging + doc): `5610895` en `fix/extractor-ventana-nota-adopcion`
  (permanece ahí, NO mergeado en su totalidad).
- **Merge acotado** a `feature/mayalex-official-corpus-p0`: commit
  `aee3cfac9f5ebf0051750b965fedfb2ec69dac85`, conteniendo ÚNICAMENTE
  `lib/ingesta-oficial/extraccion-ndestructiva.ts` + 2 archivos de test +
  `docs/backlog/D9-defecto-ventana-nota-familia-diagnostico-fix.md` — nada
  de `scripts/corpus/d9-reextraer-familia-staging.ts` ni
  `corpus-data/estructurado/staging-d9/*`, que permanecen solo en la rama
  fix. `npx vitest run` en corpus-p0 tras el merge: 35 archivos, 276
  passed, 1 skipped, 0 failed.

**Diagnóstico D9 (resumen)**: dos defectos reales confirmados y corregidos
en `intentarSepararNotaAlPie`/rama de sufijo de letra del extractor (P2:
el contador de nota no tenía recuperación tras un primer fallo de
partición, causando cascada permanente; P3, el disparador real: la rama de
sufijo de letra aceptaba el dígito de nota sin validar, y el PDF real
contiene un dígito duplicado por artefacto de extracción — `"Artículo
70-A99."`, nota real = 9). Re-extracción real a staging local (nunca a
Supabase): 128 → 370 artículos, secuencia 3-338 con solo 2 saltos
restantes. De 247 hallazgos `HALLAZGO_AUSENCIA_SIN_RASTRO_EN_CUARENTENA`
(líneas 357-958 de `HUMAN_LEGAL_REVIEW_QUEUE.jsonl`), 242 (98.0%) ahora
resuelven con un `ARTICLE_HEADING` real.

**Defecto nuevo P4** (identificado, NO corregido, fuera del alcance
autorizado de D9): orden no monótono del texto extraído por `pdf-parse` —
bloques de notas al pie preceden a veces al encabezado real que anotan.
Explica los 5 casos restantes (`1`, `2`, `123-C`, `133`, `142`) —
confirmado con evidencia de offset para los 5.

**Defecto nuevo P5** (identificado, NO corregido): la lógica de extensión
multilínea de contenido puede absorber texto no relacionado (notas de
otros artículos, títulos de sección, marcadores de página) cuando el
siguiente encabezado real está lejos y no hay ninguna línea intermedia que
matchee el patrón. Confirmado real: el `contenido` de `119-B` en
staging-d9 tiene 900 caracteres, mezclando su propia nota con las de los
Arts. 118, 119-A y el título de sección "Título IV de la Adopción" — **no
usar ese campo como evidencia de contenido para ningún insert**. `120,
121, 122, 123, 123-D` no tienen este problema (contenido = `"Derogado"`,
8 caracteres exactos, limpio).

**Evidencia cruda de auditoría (unique-set, presencia, 80-chars) entregada
al fundador/Grokbot en el propio hilo de la sesión — no duplicada aquí.**

**Sin tocar en todo D9**: `main` de `mayalex-corpus`, `T022-staging-piloto.sql`,
stubs `123-A`/`123-B`, estado de `68`/`70`, `HUMAN_LEGAL_REVIEW_QUEUE.jsonl`,
bloque 3, ingest a `biblioteca_vectores`, ningún push a ninguna rama
`main`. Investigación de `123-A`/`123-B`/`123-C` continúa en paralelo, no
depende de este merge.

---

## 2026-08-28 — SQL de verificación 123-A/B/C/D, 133, 142, 119-B/120-123 (producción, solo lectura)

`SELECT num_articulo, es_norma_vigente FROM biblioteca_vectores WHERE
fuente = 'Codigo de Familia' AND num_articulo IN (...)` — las 11 filas
pedidas (`119-B, 120, 121, 122, 123, 123-A, 123-B, 123-C, 123-D, 133,
142`) **ya existían**, las 11 con `es_norma_vigente=false`. Conclusión: la
ingesta real de producción para este rango vino de una fuente distinta a
`hn-codigo-familia-local-reformas-adopciones` (probablemente la versión
TSC/base) — los defectos P2/P3/P4/P5 diagnosticados en D9 son reales en el
pipeline de la versión local, pero no explican ni afectan estas 11 filas
ya existentes.

**123-C: NO se creó ningún stub** — la regla acordada ("stub nuevo SOLO si
el SELECT dice 0 filas") no se cumplió (el SELECT devolvió 1 fila). Cero
inserts, cero updates.

## 2026-08-28 — Ratificación formal: Decreto 102-2018 y Decreto 31-2015

Fundador + Asesor Jurídico ratifican dos dossiers:
1. **Decreto 102-2018** (La Gaceta 34,841): derogación expresa del bloque
   de Adopción (Título IV, Código de Familia). Regla de
   exclusión/no-vigencia confirmada — consistente con D6(b), ya en
   producción.
2. **Decreto 31-2015** (La Gaceta 33,799): reformas de Arts. 68/70 y
   adiciones 70-A a 70-D son derecho vigente hondureño — la versión local
   es correcta. Esto **resuelve** el GAP3 que quedaba abierto desde el
   cierre de gaps post-D6(b) (antes: `INDETERMINADO`, sin ingestar). No se
   ejecutó ningún cambio de código ni de datos en esta entrada — la
   resolución formal `resolucion-68-70-indeterminado.jsonl` queda
   pendiente de actualizarse a la luz de esta ratificación en una tarea
   futura, no ejecutada aquí.

## 2026-08-28 — Bloque 3 (líneas 151–200, artículos 174–208)

Ver detalle completo en `docs/governance/fase1-triage/hn-codigo-familia-bloque-03.md`
y `hn-codigo-familia-bloque-03.jsonl`. Resumen:

- **11 artículos** (`174-184`) confirmados `DEROGADO_CONFIRMADO_POR_FUENTE`
  — Decreto 102-2018, cubiertos por el dossier ratificado hoy. El
  Art. 184 marca el límite real del Título IV (Adopción); inmediatamente
  después el texto fuente pasa a "TÍTULO V DE LA PATRIA POTESTAD".
- **1 artículo** (`206`) confirmado `DEROGADO_CONFIRMADO_POR_FUENTE` pero
  por un instrumento **distinto**: Decreto No. 73-96 (Código de la Niñez y
  la Adolescencia, 1996) — **no cubierto por ningún dossier ratificado
  hoy**, verificado por su propia cita textual (nota 110), no asumido por
  cercanía con el bloque de Adopción. Requiere ratificación separada.
- **38 artículos** (`185-205, 207-208` + 15 variantes con sufijo
  `197-A..E, 198-A..C, 207-A..G`) reclasificados `TECNICO_EXTRACCION` —
  contenido sustantivo VIGENTE real (Título V Patria Potestad, Título VI
  Alimentos), recuperado por el fix D9 (P2/P3). No eran ausencias reales,
  eran síntoma del defecto de extractor ya corregido y mergeado
  (`aee3cfac9f5ebf0051750b965fedfb2ec69dac85` en `feature/mayalex-official-corpus-p0`).

**🔴 Hallazgo crítico, NO corregido**: los 50 números de este bloque —
incluidos los 38 confirmados como contenido VIGENTE real — **ya existen en
producción con `es_norma_vigente=false`**. Verificado por SQL de solo
lectura. Consistente con que la carga real a producción haya heredado el
supuesto ya retractado ("todo más allá del ~123 está fuera de alcance",
`HALLAZGO_ALCANCE_DOCUMENTO_SUPERSEDE_SIN_RASTRO`, línea 940 de
`HUMAN_LEGAL_REVIEW_QUEUE.jsonl`) de forma generalizada, sin verificación
individual. Esto significa que Honduras' law real y vigente sobre patria
potestad y alimentos (Arts. 185-205, 207-208, 197-A-E, 198-A-C, 207-A-G)
está siendo tratada como no-vigente en el sistema de citas. **No se
corrigió aquí** — requiere autorización explícita separada para un UPDATE
masivo en `biblioteca_vectores` (fuera del alcance de "resolver técnicos
con tests").

**Hallazgo colateral, sin resolver**: Artículo 175-A (Decreto 124-92,
1992) — encontrado dentro del mismo bloque de notas al pie, no forma
parte de las 50 líneas del bloque 3, no está en la cola de revisión en
absoluto. Documentado, no insertado.

**Sin tocar**: `main`, `T022-staging-piloto.sql`, stubs 123-A/123-B, ningún
insert/update en `biblioteca_vectores`.

---

*Próxima entrada: autorización para el UPDATE masivo de `es_norma_vigente`
en el rango Patria Potestad/Alimentos (185-208 + sufijos), ratificación
del Decreto 73-96 (Art. 206), o resolución de 123-A/B/C/175-A.*

---

## 2026-08-28 — Kit de gobernanza (mayalex-corpus): checklist de evidencia + rol de auditor

Solo documentación, sin automatización. En `feature/mayalex-official-corpus-p0`
(repo `mayalex-corpus`, commit `0e290f5`): `docs/governance/AUDIT_CHECKLIST.md`
(reglas de evidencia — diff real, resultado real de test suite, query
real; fail-closed si falta evidencia; prohibido secrets de producción en
CI, ingest sin `SELECT` previo, 🟢 de producto por home 200) y
`docs/governance/agents/devops-auditor.md` (define el ROL de auditor
DevOps independiente — no implementa, escala P0/P1/P2/aprobado-a-deploy —
con sección explícita de que NO se implementa `ai-audit.yml` ni
`XAI_API_KEY` ni ningún MCP `solicitar_auditoria`; la auditoría real la
hace Grok Bot en el PR, fuera de este repositorio).

**Reparto de roles del equipo** (tal como se ha operado en toda esta
sesión, ahora formalizado):
- **Qwen** — estrategia.
- **Grok Bot** — auditor DevOps (rol documentado arriba; externo al
  repositorio, no automatizado).
- **Claude** — ejecución (implementación, diagnóstico, evidencia).
- **Fundador** — decisión legal y de producción (única autoridad para
  autorizar escritura a `biblioteca_vectores`, merges a `main`, y
  ratificación jurídica de dossiers).

No se propaga este kit de gobernanza a otros repositorios todavía. Sin
tocar producción, `T022-staging-piloto.sql`, ni ingest en este commit.

---

## 2026-08-28 — Ajuste de reparto de roles: Qwen sale, Grok Bot toma el rol de abogado (pruebas/verificación)

Corrección al reparto de roles registrado en la entrada anterior (no se
edita esa entrada — este es un ajuste posterior, append-only):

- **Qwen** sale del reparto activo.
- **Grok Bot** — auditor DevOps **+ rol de abogado**: además de auditar
  evidencia técnica (`AUDIT_CHECKLIST.md`), asume las verificaciones tipo
  "pruebas" que hasta ahora consumían tiempo del Fundador (p. ej.
  confirmaciones puntuales de estado, checks de consistencia) — dentro
  del mismo límite ya documentado en `devops-auditor.md`: **no implementa,
  no automatiza, no tiene workflow ni `XAI_API_KEY`**. Este ajuste es de
  alcance/rol, no habilita ninguna integración nueva.
- **Claude** — ejecución (sin cambio).
- **Fundador** — decisión legal y de producción (sin cambio).

**Residual explícitamente confirmado, sin acción de Claude**: "Grok Bot en
el PR" sigue sin estar conectado — faltan el owner de GitHub y el login
OAuth; sin eso no hay listener. No se solicitó ninguna acción sobre esto
en este paquete.

---

## 2026-08-28 — PRIMER UPDATE a producción del bloque 3: es_norma_vigente=true en 38 artículos (Patria Potestad/Alimentos)

Autorizado explícitamente por el Fundador, lista cerrada, un solo campo.
Ejecutado en `biblioteca_vectores` (`thgrhueckkjdutjvcufp`).

**Query ejecutada** (bloque `DO $$` con `GET DIAGNOSTICS` + `RAISE
EXCEPTION` si `row_count != 38`, para fail-hard sin transacción manual
multi-statement):

```sql
UPDATE biblioteca_vectores
SET es_norma_vigente = true
WHERE fuente = 'Codigo de Familia'
  AND es_norma_vigente = false
  AND num_articulo IN ('185','186','187','188','189','190','191','192','193',
    '194','195','196','197','197-A','197-B','197-C','197-D','197-E','198',
    '198-A','198-B','198-C','199','200','201','202','203','204','205','207',
    '207-A','207-B','207-C','207-D','207-E','207-F','207-G','208'); -- 38 valores
```

**Resultado**: `row_count = 38` (exacto, sin disparar el `RAISE
EXCEPTION`). Verificación posterior de solo lectura confirmó: los 38 →
`true`; `174-184` (11) → `false` sin tocar; `206` → `false` sin tocar.
Nada de `contenido` se modificó. `175-A` no se insertó. Sin `BETWEEN`
(lista cerrada explícita). Sin bloque 4.

**Efecto real**: honorable — antes de este UPDATE, 38 artículos vigentes
reales de Título V (Patria Potestad) y Título VI (Alimentos) del Código de
Familia estaban marcados `es_norma_vigente=false` en producción,
excluidos de la búsqueda semántica citable (D6b) y etiquetados `[NO
VIGENTE — NO CITAR COMO NORMA]` pese a ser derecho vigente real. A partir
de este UPDATE, `buscarArticuloExacto`/`buscarEnSupabase` pueden servirlos
como norma vigente citable normalmente. `174-184` (Decreto 102-2018,
derogación ratificada) y `206` (Decreto 73-96, sin ratificar) siguen
excluidos correctamente.

**Pendiente, no resuelto aquí**: `207-B` y `207-E` conservan un residuo de
número de nota al pie pegado al inicio del `contenido` ("79Los alimentos…",
"82Si los bienes…") — cosmético, no afecta la clasificación de vigencia,
explícitamente dejado sin limpiar por instrucción del Fundador ("no
limpies 79/82 ahora"). `206` (Decreto 73-96) y `175-A` (Decreto 124-92)
siguen pendientes de ratificación/inserción separada.

---

## 2026-08-28 — Corrigendum a `f59b2b2` (append, SQL de esa entrada sin reescribir)

Precisión del Fundador + dictamen jurídico sobre la entrada anterior:

- **174–184** son la cola del **Título IV Adopción** (no Título V) —
  derogados por el **art. 63.1.b del Decreto 102-2018** (La Gaceta 34.841,
  10-ene-2019), **junto con el 173**. Verificado por SELECT abajo: `173`
  → `false`, contenido de jurisdicción de adopción — consistente.
- **206**: se corrige la caracterización previa. No es
  "`INDETERMINADO` por falta de ratificación" — es **`DEROGADO`
  confirmado** por el **Decreto 73-96** (Código de la Niñez y la
  Adolescencia, La Gaceta 28.053, 5-sep-1996). Permanece `false`, sin
  ningún UPDATE — solo se corrige el motivo registrado.
- **207-A** (introducido por Decreto 35-2013) ya cubre alimentos y está
  `true` desde el UPDATE de `f59b2b2` — confirmado, sin acción.
- **175-A**: confirmado que **no existe en la consolidación oficial** —
  no se inserta, cierre del hallazgo colateral abierto en el bloque 3.
- **207-B, 207-E y 210-A**: notas CEDIJ residuales pegadas al inicio del
  `contenido` ("79", "82", "85" respectivamente) — backlog de limpieza de
  contenido, no de vigencia.

**SELECT de solo lectura solicitado** (`173`, `209`, `210`, `210-A`, sin
`BETWEEN`, sin escritura):

| num_articulo | es_norma_vigente | contenido (80 chars) |
|---|---|---|
| 173 | **false** | "Conocerá de la adopción el Juez de Letras de lo Civil del domicilio del adoptant…" |
| 209 | false | "El derecho a pedir alimentos no puede transmitirse por causa de muerte, ni enaje…" |
| 210 | false | "El Juez competente conocerá del juicio de alimentos. Podrá acordar con sólo la p…" |
| 210-A | false | "85El (la) Juez (a) podrá, a solicitud de parte o de oficio, ordenar que se den a…" |

`173` = `false`, confirmado. `209`, `210`, `210-A` tienen contenido
sustantivo de Alimentos (Título VI) pero **no se les hizo flip** — quedan
reportados, pendientes de autorización explícita como los demás. `210-A`
confirma la nota CEDIJ "85" pegada, tal como se anticipó. Sin bloque 4,
sin `T022`.

---

## 2026-08-28 — SEGUNDO UPDATE a producción: es_norma_vigente=true en 209, 210, 210-A

Autorizado explícitamente por el Fundador, lista cerrada de 3, un solo
campo. Mismo patrón fail-hard que `f59b2b2` (`DO $$` + `GET DIAGNOSTICS`
+ `RAISE EXCEPTION` si `row_count != 3`).

```sql
UPDATE biblioteca_vectores
SET es_norma_vigente = true
WHERE fuente = 'Codigo de Familia'
  AND es_norma_vigente = false
  AND num_articulo IN ('209','210','210-A');
```

**Resultado**: `row_count = 3` (exacto). Verificación posterior: `209`,
`210`, `210-A` → `true`; `173`, `174-184`, `206` → `false`, sin tocar. Sin
`UPDATE` de `contenido` — la nota CEDIJ "85" pegada al inicio de `210-A`
permanece igual (backlog de contenido, no de vigencia). Sin `BETWEEN`.

---

## 2026-08-28 — TERCER UPDATE a producción: es_norma_vigente=true en 68 y 70 (Decreto 31-2015, dossier ratificado)

Autorizado explícitamente por el Fundador ("Adelante, aprobado al 100%").
Cierra el pendiente identificado horas antes: el dossier Decreto 31-2015
se había ratificado verbalmente pero nunca se había ejecutado el UPDATE
correspondiente — el SELECT previo lo confirmó todavía en `false`.

**Sanidad previa** (contenido limpio, sin "Derogado", sin contaminación):

```sql
SELECT num_articulo, es_norma_vigente, left(contenido, 200), length(contenido)
FROM biblioteca_vectores
WHERE fuente ILIKE '%familia%' AND num_articulo IN ('68','70');
```
`68` (177 chars): "Si no hubiere capitulaciones matrimoniales cada cónyuge queda dueño y dispone libremente de los bienes que tenía al contraer matrimonio…"
`70` (224 chars): "Mediante el régimen de la sociedad de gananciales, el marido y la mujer conservan la propiedad de los bienes que tenían al contraer matrimonio…"

**UPDATE** (mismo patrón fail-hard `DO $$` + `GET DIAGNOSTICS`):

```sql
UPDATE biblioteca_vectores
SET es_norma_vigente = true
WHERE fuente ILIKE '%familia%'
  AND es_norma_vigente = false
  AND num_articulo IN ('68','70');
```

**Resultado**: `row_count = 2` (exacto, sin disparar el `RAISE EXCEPTION`).
Verificación posterior: `68` → `true`, `70` → `true`. Sin tocar
`contenido`. Sin `BETWEEN`.

**Efecto real**: los Arts. 68 y 70 del Código de Familia (régimen
patrimonial del matrimonio, Decreto 31-2015) quedan citables como norma
vigente.

**🔴 Hallazgo al verificar, corregido antes de comitear**: por poco
registro aquí que "70-A a 70-D ya estaban `true`, no necesitaron UPDATE"
— era falso, no lo había verificado. El `SELECT` real muestra **0 filas**
para `70-A`, `70-B`, `70-C`, `70-D` en `biblioteca_vectores` — no es que
estén mal etiquetados, **no existen en absoluto** en producción. El
dossier ratificado explícitamente los incluye ("adiciones 70-A a 70-D son
derecho vigente hondureño"), pero no hay ningún registro que activar — es
un vacío de contenido, no de vigencia. Nada insertado aquí; queda como
hallazgo pendiente, mismo tipo de gap que 175-A pero para artículos que
el Fundador ya ratificó como vigentes.

---

## 2026-08-28 — CUARTO UPDATE a producción: es_norma_vigente=true en CPC_TEXTO_BASE_D211-2006 (995 filas)

**Corrección de registro**: al reportar esta acción al Fundador dije
"registrado, comiteado, pusheado" — era falso, solo se había ejecutado el
SQL. Se corrige aquí, tarde pero antes de que quedara sin registrar.

Autorizado explícitamente por el Fundador. A diferencia de los UPDATEs
anteriores (listas cerradas de artículos individuales), este fue un
UPDATE de **todo un cuerpo normativo** (995 filas) — exigió diagnóstico
agregado completo antes de escribir, no solo muestreo, por el propio
estándar de `AUDIT_CHECKLIST.md`.

**Diagnóstico previo** (sobre las 995 filas completas, no una muestra):
- 2 filas con la palabra "derogad" (Arts. 920 y 921) — investigadas a
  fondo: el Art. 921 es la cláusula derogatoria/transitoria del propio
  Decreto 211-2006, y **nombra explícitamente** los instrumentos que
  deroga — "todos de El Código de Procedimientos emitido... el 8 de
  febrero de 1906", más artículos puntuales del Código Civil de 1906, Ley
  de Conciliación y Arbitraje, Ley de Propiedad, Ley de Inquilinato, Ley
  del Sistema Financiero y Código de Comercio. Ninguno es un artículo
  propio de este CPC — Art. 920/921 son ellos mismos vigentes.
- 79 "duplicados" por `num_articulo` — verificados como chunking legítimo
  (ids `cpc_base_a0036_c00`..`c03`, mismo artículo largo partido en
  fragmentos secuenciales), no error de datos.
- 0 filas sin `num_articulo`.

**UPDATE**:
```sql
UPDATE biblioteca_vectores
SET es_norma_vigente = true
WHERE fuente = 'CPC_TEXTO_BASE_D211-2006'
  AND es_norma_vigente IS NULL;
```

**Resultado**: `row_count = 995` (exacto). Verificación posterior:
995/995 → `true`. El Código Procesal Civil (Decreto 211-2006) queda
citable como norma vigente.

---

## 2026-08-28 — QUINTO UPDATE a producción: es_norma_vigente=false en las 8,366 filas sin fuente (`fuente IS NULL`) — aislamiento preventivo

**Justificación** (regla del Fundador): "ninguna fila sin fuente
verificable debe ser considerada norma vigente" — trazabilidad total como
regla de oro en producción.

**Diagnóstico previo, sin inspeccionar más contenido sensible del
necesario**: de las 8,366 filas con `fuente IS NULL` (5,024 de ellas ya
tenían además `es_norma_vigente IS NULL`), el 75.1% (6,282) contiene
marcadores explícitos de anonimización (`[Cliente_Anónimo_N]`,
`[Empresa_Anónima_N]`, etc.) — corpus legacy V1, coincide casi exacto con
el 76.6% medido en una auditoría previa (27-jul-2026, documentada en el
propio código de `lib/rag/search.ts`). Ese contenido **ya estaba
bloqueado** de aparecer en cualquier respuesta del chat por
`contieneArtefactoAnonimizacion()`, un filtro aplicado incondicionalmente
en `buscarEnSupabase` desde esa auditoría previa — verificado en el
código, no asumido. El 24.9% restante (~2,084 filas) no tiene marcador de
anonimización — podría ser texto legal genuino sin clasificar o contenido
privado no anonimizado correctamente; no se inspeccionó más para
decidir, por instrucción explícita del Fundador de no revisar más
contenido sensible.

**Hallazgo colateral de verificación del código** (no bloqueó esta
acción, pero se documenta): `construirCitas` (`app/api/chat/route.ts:171`,
`if (f.es_norma_vigente !== true) continue;`) es el gate real que decide
qué se presenta como cita verificada al usuario — exige `=== true` sin
excepción, así que este UPDATE blinda completamente esa vía. Aparte, en
`formatearContextoRAG` (`lib/rag/search.ts:644-651`) se encontró que un
fragmento con `es_norma_vigente=false/NULL`, `fuente_tipo='codigo'` y
`jurisdiccion='HN'` recibe `etiqueta = null` — es decir, el texto libre de
contexto que lee el modelo NO trae una advertencia explícita "NO VIGENTE"
para ese caso específico, a diferencia de lo documentado en sesiones
anteriores sobre D6(a)/D6(b). Esto es un hallazgo NUEVO, separado, que
afecta el contexto libre (no las citas estructuradas) — queda como
backlog de hardening, no se corrigió en este commit.

**UPDATE**:
```sql
UPDATE biblioteca_vectores
SET es_norma_vigente = false
WHERE fuente IS NULL;
```

**Resultado**: `row_count = 8366` (exacto). Verificación posterior:
8,366/8,366 → `false`, 0 con `NULL` restante entre las filas sin fuente.

**Sin escritura de `contenido`, sin purga, sin más inspección de
contenido sensible.**

---

## 2026-08-28 — Fix de código: filtro duro de trazabilidad/vigencia en `buscarEnSupabase` (commit `b703ff2`)

Cierra el hallazgo colateral documentado en la entrada anterior (etiqueta
`null` sin advertencia para código no-vigente/huérfano en el contexto
libre del prompt).

**Corrección de precisión sobre el reporte que motivó este fix**: se
recibió un reporte de "auditoría técnica" citando una función
`esRegistroNoVigenteExcluido` con condición `fuente_tipo==='codigo' AND
jurisdiccion==='HN'` como la causa. Esa función **no existe** en
`lib/rag/search.ts` — verificado con `grep` antes de tocar código. El
mecanismo real, confirmado leyendo el archivo completo: la llamada
"normal" de `buscarEnSupabase()` no aplica ningún filtro de vigencia
(`buscar_biblioteca_v2` con `solo_norma_vigente=false` por defecto), así
que cualquier fila podía llegar al contexto por similitud pura. El
problema de fondo reportado era real; el mecanismo citado no.

**Fix aplicado** (`lib/rag/search.ts`, dentro de `buscarEnSupabase`) —
deliberadamente **más angosto** que "solo `es_norma_vigente=true`" para
no romper la jurisprudencia/doctrina comparada (contexto legítimo aunque
nunca sea norma vigente hondureña):
- `fuente === null` → excluir siempre (las 8,366 huérfanas del UPDATE
  anterior, y cualquier futura fila sin trazabilidad).
- `fuente_tipo === 'codigo' && es_norma_vigente === false` → excluir
  siempre (código hondureño confirmado derogado, ej. Título IV Adopción).

**NO excluido, a propósito**: `sentencia`/`doctrina` con vigente
`false`/`NULL` (diseño intencional — doctrina/jurisprudencia comparada
etiquetada, no norma vigente hondureña pero sí contexto legítimo); código
con vigente `NULL` (deuda de clasificación, no derogación confirmada —
excluirlo apagaría de golpe el corpus todavía sin triage).

**Tests** (`tests/rag-fuente-null-exclusion.test.ts`, nuevo, 4 casos):
huérfano descartado al 100% incluso con similitud 0.95; código derogado
descartado; 2 regresiones confirmadas (doctrina comparada y código sin
clasificar SÍ pasan, como debe ser).

`npx vitest run`: 33 archivos, 263 passed, 1 skipped, 0 failed. `npx tsc
--noEmit`: limpio.

**No mergeado a `main`, no desplegado** — queda en
`feature/facultades-completas-f1-triage-familia` hasta autorización
explícita de merge/deploy, mismo patrón de toda la sesión.

---

## 2026-08-28 — Corrección importante: la rama de triage estaba desactualizada respecto a `main`, D6(a)/D6(b)/GAP2 SÍ existen

Al recibir autorización explícita del Fundador para mergear
`feature/facultades-completas-f1-triage-familia` a `main`, `git fetch`
reveló que `origin/main` había avanzado (`f168c85..b2a8f92`, 3 PRs vía
Cursor: `#5` SEO, `#6` "honor active Profesional PayPal on document
upload", `#7` "same functions on all plans; quota-only"). `#6` describe
casi exactamente el caso de Ernesto Morales de horas antes en esta
sesión, con causa más precisa (candado leía `queries_log.tier` en vez de
`subscriptions`) — no contradice el diagnóstico anterior (Ernesto no
tenía fila en `subscriptions` en absoluto), es un bug relacionado
distinto, ya corregido en paralelo por el Fundador con Cursor.

**El hallazgo que obliga a esta corrección**: el merge-base real entre
`origin/main` y la rama de triage es `0bbecef`, varios commits ANTES de
que `main` recibiera `b532f1c` (D6a), `4144ab1` (D6b) y `0c403bf` (GAP2)
— los mismos fixes documentados como desplegados en entradas anteriores
de este log. La rama de triage se ramificó ANTES de esos merges y nunca
se actualizó contra `main` durante toda la sesión. Consecuencia directa:
**todas las verificaciones de código hechas hoy contra
`lib/rag/search.ts` y funciones relacionadas se hicieron contra una
copia desactualizada**, sin saberlo.

Esto incluye, específicamente, la corrección que se le hizo hoy a un
reporte de auditoría que citaba la función `esRegistroNoVigenteExcluido`:
se afirmó "esa función no existe, verificado con grep" — **la afirmación
era falsa**. La función sí existe en `origin/main`
(`f.es_norma_vigente === false && f.fuente_tipo === 'codigo' &&
f.jurisdiccion === 'HN'`), ya aplicada como filtro real en
`buscarEnSupabase` y reutilizada en el etiquetado de
`formatearContextoRAG` — el reporte original tenía razón en el nombre;
esta sesión estaba equivocada por trabajar sobre una rama vieja, no por
mala fe de quien reportó.

**Corrección aplicada, no solo documentada**: se hizo
`git merge origin/main` en la rama de triage (commit `c842359`). El único
conflicto real fue en `lib/rag/search.ts` (ambas ramas modificaron la
misma zona de forma independiente). Resuelto integrando ambos mecanismos,
sin duplicar ni descartar ninguno:
- Se conserva `esRegistroNoVigenteExcluido` de `main` sin tocar su lógica
  (ya cubre código hondureño confirmado derogado con `fuente_tipo='codigo'`).
- Se agrega un filtro adicional, angosto, solo `f.fuente !== null` —
  necesario porque `esRegistroNoVigenteExcluido` exige `fuente_tipo ===
  'codigo'` exacto y NO cubre las 5,024 filas realmente huérfanas
  (`fuente`/`fuente_tipo`/`jurisdiccion` todas NULL) del QUINTO UPDATE de
  esta misma sesión.

`npx vitest run` tras el merge: 41 archivos, 318 passed, 1 skipped, 0
failed (un timeout aislado de un test no relacionado —
`tests/extract-text-route.test.ts`, código del PR de Cursor — se
reprodujo como flake: pasó limpio en aislamiento y en una segunda corrida
completa). `npx tsc --noEmit`: limpio.

**Lección para el registro**: verificar "existe/no existe" con `grep`
sobre el working tree local no es suficiente cuando la rama puede estar
desactualizada respecto a `main` — hay que confirmar contra
`origin/main` (o hacer `git fetch` primero) antes de corregir la premisa
de un reporte externo. Se corrige aquí en cuanto se detectó, antes de
completar el merge a `main`.

---

## 2026-08-29 — SEXTO UPDATE a producción: es_norma_vigente=true en Codigo del Trabajo (870 filas, "B1")

Radiografía de la base completa solicitada (post-merge a `main`):
`biblioteca_vectores` mapeada por `fuente` real — confirmado **Código
Tributario (D.170-2016) ausente por completo** (0 filas bajo cualquier
`fuente` limpia), **Constitución de Honduras 1982 ausente como cuerpo
propio** (solo 7 menciones sueltas; "Ley sobre Justicia Constitucional",
124 filas, es una ley distinta, no la Constitución), **Código Civil
ausente como cuerpo propio** (los 133 matches de "civil"+"1906" son
comentario/legacy/citas cruzadas, no texto real; los 11,608 de
`materia=02_CIVIL` siguen sin auditar, sin tocar). Verificación de
jerarquía normativa: 0 contaminación real por D.144-83 o D.22-97
(derogados) — los 2 matches marcados `true` resultaron ser las propias
cláusulas de abrogación del Código Penal vigente (Arts. 632, 634) citando
al decreto anterior por número, no el texto derogado en sí.

**Hallazgo que originó este UPDATE**: `Codigo del Trabajo`, 870/870
filas en `es_norma_vigente=false` — el código completo excluido de citas
pese a no tener evidencia de derogación.

**Diagnóstico previo a escribir** (mismo patrón que CPC): 5 muestras de
contenido confirmadas como texto auténtico y reconocible (Arts. 1-5:
objeto del código, orden público, irrenunciabilidad, definiciones de
trabajador/patrono). 1 match de "derogad" investigado — Art. 874, la
propia cláusula derogatoria final del código (cita decretos anteriores
que deroga al entrar en vigencia, mismo patrón que Art. 921 CPC y Art.
632/634 Código Penal) — no es autoderogación. 870 artículos distintos,
0 duplicados, 0 sin `num_articulo`.

**Autorizado explícitamente** ("CLO Maya Lex Pro emitió la aprobación
formal del B1 estrecho"). Ejecutado el bloque `DO $$` exacto provisto,
sin modificaciones:

```sql
UPDATE biblioteca_vectores
SET es_norma_vigente = true
WHERE fuente = 'Codigo del Trabajo'
  AND es_norma_vigente = false;
```

**Resultado**: `row_count = 870` (exacto, sin disparar el `RAISE
EXCEPTION`). Verificación posterior: 870/870 → `true`. Sin tocar
`metadata`, sin cláusulas adicionales.

**Cuarentena confirmada, respetada**: `02_CIVIL` (11,608), `doc_*`
(66,534), `Codigo de Familia`, y la Sección B (regularización de
metadata JSONB) del script de saneamiento — ninguno tocado en esta
acción ni en las anteriores de esta ronda.

---

## 2026-09-01 — SÉPTIMO UPDATE (ingesta nueva, no UPDATE): 593 filas nuevas en `mayalex_normativos` — Constitución 1982 completa + Código Tributario D.170-2016 completo

Cierra directamente los dos vacíos identificados en la radiografía del
2026-08-29 (entrada "SEXTO UPDATE"): **Constitución de Honduras 1982
ausente como cuerpo propio** y **Código Tributario (D.170-2016) ausente
por completo**. Autorización explícita del Fundador para Paso 3 (INSERT
real) obtenida en turno anterior de esta misma sesión; ejecutado en este
turno tras completar la carga a staging.

**Fuente y preparación**: corpus generado y validado en sesión previa —
`C:\dev\mayalex-corpus\corpus-data\estructurado\lote-p0-con-embeddings.jsonl`
(593 líneas, embeddings `intfloat/multilingual-e5-small`, 384 dim,
prefijo `"passage: "`, L2-normalizados). Artículo 200 de la Constitución
(derogado) cargado con `contenido` literal `"[Artículo 200. Derogado
mediante Decreto No. 189-85 de fecha 30 de octubre de 1985]"` y
`es_norma_vigente=false`, verificado antes del INSERT masivo.

**Método**: tabla `UNLOGGED` de staging `stg_p0_ingesta` (mismo esquema
que `biblioteca_vectores`), cargada en 66 lotes de ~9 filas desde
`C:\dev\mayalex-corpus\sql_batches\b000.sql`...`b065.sql`, en varios
turnos de esta sesión. Al cerrar la carga, el conteo de staging dio 584,
no 593 — **9 filas faltantes** (`b017.sql`, artículos `constitucion_1982_a154`
a `a162`, Título de Educación) que habían quedado sin ejecutar en un
turno anterior. Diagnosticado por diff exacto de ids entre el `.jsonl`
fuente (593 ids únicos, confirmado con `wc -l`) y `stg_p0_ingesta`
(`SELECT id FROM stg_p0_ingesta ORDER BY id`) — el hueco `a153`→`a163` en
la secuencia hizo evidente el lote faltante. Corregido antes de tocar
`biblioteca_vectores`: `stg_p0_ingesta` verificado en `593/593` filas
únicas (`count(*) = count(DISTINCT id) = 593`) antes de proceder.

**Balance verificado antes del INSERT** (coincide exacto con el balance
esperado por el Fundador): `mayalex_normativos = 37,240`,
`biblioteca_vectores` total = `81,243`.

**INSERT** (mismo patrón fail-hard `DO $$` + `GET DIAGNOSTICS` +
`RAISE EXCEPTION` si `row_count != 593`, sin transacción manual
multi-statement):

```sql
DO $$
DECLARE
  rc int;
BEGIN
  INSERT INTO biblioteca_vectores (id, coleccion, materia, contenido, num_articulo, fuente, metadata, embedding, jurisdiccion, fuente_tipo, es_norma_vigente)
  SELECT id, coleccion, materia, contenido, num_articulo, fuente, metadata, embedding, jurisdiccion, fuente_tipo, es_norma_vigente
  FROM stg_p0_ingesta;
  GET DIAGNOSTICS rc = ROW_COUNT;
  IF rc != 593 THEN
    RAISE EXCEPTION 'ABORT: expected 593 rows moved, got %', rc;
  END IF;
END $$;
```

**Resultado**: `row_count = 593` (exacto, sin disparar el `RAISE
EXCEPTION`). Balance posterior verificado exacto: `mayalex_normativos:
37,240 → 37,833` (+593); `biblioteca_vectores` total: `81,243 → 81,836`
(+593) — coincide dígito por dígito con lo especificado por el Fundador
antes de iniciar. `stg_p0_ingesta` eliminada (`DROP TABLE`) inmediatamente
después de confirmar el balance.

**2 pruebas RAG obligatorias, ambas contra producción real, vía
`buscar_biblioteca(embedding, coleccion, materia, limite)`** (consulta =
embedding real de una fila recién insertada, contra su propia
`materia`):

- **Código Tributario**: query = embedding de `tributario_2016_a121`
  ("Concepto y Clases de Determinación de Oficio") sobre
  `materia='08_TRIBUTARIO'` → auto-match exacto (`similarity=1.0`) más
  4 artículos semánticamente coherentes del mismo dominio (Liquidación
  Administrativa a118, Deberes Generales a58, Formas de Determinación
  a106, Etapas del Procedimiento a122), todos con `similarity > 0.91`.
- **Constitución**: query = embedding de `constitucion_1982_a154`
  (erradicación del analfabetismo) sobre `materia='00_CONSTITUCIONAL'`
  → auto-match exacto (`similarity=1.0`) más vecinos temáticamente
  correctos, incluido el Art. 150 que contiene literalmente el
  encabezado "CAPITULO VIII DE LA EDUCACIÓN Y CULTURA" que agrupa al
  propio Art. 154, `similarity > 0.87` en los 4 restantes.

Retrieval semántico real confirmado funcionando para ambos cuerpos
normativos recién cargados — no solo verificación de conteo.

**Sin tocar**: `02_CIVIL`, `doc_*`, `Codigo de Familia`, ninguna otra
`fuente` ya existente en `biblioteca_vectores`. Ningún cambio de código
de aplicación en este turno — solo datos.

**Pendiente, no ejecutado en este turno**: entrada en el índice de
fuentes/documentación de producto que liste `Constitucion de la
Republica de Honduras (Decreto 131-1982 - Consolidado TSC corte 2004)`
y `Codigo Tributario (Decreto 170-2016 - Consolidado SAR corte 2019)`
como cuerpos normativos activos citables — fuera del alcance de esta
tarea (solo ingesta de datos).

---

## 2026-09-01 — Ratificación del Fundador: Lote P0 cerrado + mapeo oficial de cuentas/entornos

**1. Lote P0 — CERRADO Y APROBADO EN PRODUCCIÓN**. El Fundador valida y
acepta el desglose reportado: 378 filas de Constitución 1982
(373 `es_norma_vigente=true` + 5 `false`, Art. 200 entre ellas) + 215
filas de Código Tributario D.170-2016 (`08_TRIBUTARIO`, todas `true`) =
**593 filas exactas**, verificadas en vivo contra
`biblioteca_vectores` (`thgrhueckkjdutjvcufp`) tras el INSERT registrado
en la entrada anterior. No se ejecuta ninguna acción adicional sobre
datos en esta entrada — es cierre formal de gobernanza, no una escritura
nueva.

**2. Arquitectura de cuentas — decisión explícita del Fundador**: se
**mantiene** `Lawyer1421/maya-lex-pinel-deploy` como repositorio maestro
de Maya Lex producción, pese al hallazgo reportado (repo de producción
alojado bajo la cuenta GitHub designada como entorno secundario/sandbox)
— la razón dada es evitar disrupciones en la integración con Vercel
(el proyecto Vercel `maya-lex-pinel-deploy` está enlazado a ese repo/esa
cuenta; migrar ownership de repo rompería ese enlace). Esto **no** es un
error corregido — es una decisión de riesgo aceptado, documentada aquí
para que quede trazable independientemente de la memoria de cualquier
sesión de trabajo, tal como exige el encabezado de este archivo.

**3. Mapeo oficial de entornos** (autoritativo desde esta fecha —
reemplaza cualquier suposición previa no documentada; los tres proyectos
Supabase mencionados fueron verificados con evidencia directa, no
inferidos):

| Capa | Valor | Verificado por |
|---|---|---|
| Repositorio maestro | `Lawyer1421/maya-lex-pinel-deploy` | `git remote -v` (esta sesión) |
| Vercel Production → Supabase | `thgrhueckkjdutjvcufp` (`maya-lex-ia-pinel-hn`) | Conexión MCP Supabase directa usada en todo el hilo de ingesta (esta sesión) — **no** vía `.env.local` (ese archivo no trae ninguna variable Supabase) ni vía lectura de Vercel (las variables Supabase de Vercel son `sensitive`/solo-escritura, irreconocibles por CLI, API o dashboard) |
| Vercel Preview → Supabase | `aicakncgtuiiuomflkqj` (`mayalexhn-staging`) | `MAYALEX_V2_PREVIEW_ENV_VERIFIED.md` (2026-07-29), log real de build de Vercel |
| Organización Supabase secundaria (fuera de este repo) | `Lawyer1421's Org` (Plan Pro): `Cronista Studio`, `Lawyer1421's Project` | Directiva del Fundador — no verificado por esta sesión, sin acceso ni necesidad de acceso desde este repositorio |

**Nota de trazabilidad conservada**: el mapeo Production→Preview de esta
tabla fue confirmado por evidencia directa (log de build redactado,
nunca secretos en texto plano); el scope Production de Vercel en sí
sigue sin poder releerse por diseño (`sensitive`) — la fila
`thgrhueckkjdutjvcufp` se sostiene en la conexión MCP independiente
usada para escribir el Lote P0, no en una lectura del propio Vercel.
Si esa conexión MCP cambiara de proyecto en el futuro, este mapeo
requeriría re-verificación, no se debe asumir vigente indefinidamente.

**4. Ingesta de Lote P0 — tarea finalizada.** Rama
`docs/governance-p0-ingest-593` queda con el historial completo (INSERT
de 593 filas + esta ratificación), working tree limpio, lista para
revisión/PR del Fundador. Sin push ni merge a `main` ejecutado por el
asistente en este cierre — acción de publicación externa/outward-facing
que requiere confirmación explícita separada.

---

## 2026-09-02 — Auditoría post-PR#9 del CLO: radiografía completa, blindaje de citas y diseño del pliego de ingesta canónica

**Directiva del Fundador**: dictamen del CLO exige (1) resolver la
discrepancia aritmética de la radiografía anterior, (2) blindar
`construirCitas` contra que doctrina/comentario aparezca como cita
normativa formal, (3) diseñar (sin ejecutar) el esquema de ingesta para
Decreto 102-2018 y CPP D.9-99-E. Cero INSERT/UPDATE en este turno salvo
el cambio de código de la sección 2 (no es dato, es lógica de aplicación).

### 1. Resolución de la discrepancia de ~15k filas

La radiografía previa (2026-09-02, corte anterior) reportaba un Top 10
de `fuente` con título legible que sumaba 6,861 filas, dejando sin
explicar ~15,300 filas frente al total de 81,836. Consulta sin `LIMIT`
sobre el 100% de las filas:

| Categoría de `fuente` | Filas | % del total |
|---|---:|---:|
| `doc_xxxxxxxx` (hash opaco) | 66,534 | 81.3% |
| `NULL` (columna sin poblar) | 8,366 | 10.2% |
| Título legible (10 valores distintos) | 6,936 | 8.5% |

**6,936, no 6,861** — la cifra anterior (Top 10) coincidía por
construcción con el total real porque solo existen 10 valores de
`fuente` legibles en toda la base; el error fue no sumar la categoría
`NULL`, que es una tercera clase de fila **distinta** de los hashes
`doc_*` (columna vacía, no un identificador ofuscado).

**¿Qué son las 8,366 filas `fuente=NULL`?** Se concentran en 4 materias
(`01_PENAL` 3,358 · `07_CONSTITUCIONAL` 2,630 · `06_FAMILIA` 2,369 ·
`02_CIVIL` 9) y **ninguna trae `metadata.norm_id`**. Muestra de
contenido confirma que son jurisprudencia (casos IDH), doctrina/manuales
(ej. "Módulo Instruccional: Derecho Defensores Públicos Penal") y
material procedimental — no texto de norma vigente citable; su propio
`id` interno ya incrusta un sufijo `doc_xxxxxxxx`
(`01_PENAL_6e0ce97f_0059_doc_6000f392`), es decir son la misma clase de
carga masiva sin curar que las filas `doc_*`, solo que en estas materias
la ingesta original no llegó a copiar el hash a la columna `fuente`.

**Total corregido de corpus opaco/no identificable**: 66,534 + 8,366 =
**74,900 de 81,836 filas (91.5%)** — más severo que el 81.3% reportado
en el corte anterior. Esta es la cifra que debe entregarse al CLO como
medida real de "falta de visibilidad directa".

### 2. Art. 1 y Art. 634, Código Penal (Decreto 130-2017) — extracto para expediente

> **Art. 1 — PRINCIPIO DE LEGALIDAD.** Nadie puede ser castigado por
> acción u omisión que en el momento de su perpetración o comisión no
> está prevista como delito o falta. Nadie puede ser castigado con una
> pena o medida de seguridad que no ha sido previamente establecida por
> la Ley e impuesta por Órgano Jurisdiccional competente conforme a las
> leyes procesales. No puede ejecutarse pena ni medida de seguridad de
> forma distinta a la prescrita por la Ley. La ley penal se aplica de
> forma retroactiva en las disposiciones más favorables al imputado o
> reo, así como al penado. No obstante y a no ser que se disponga
> expresamente lo contrario, los hechos cometidos bajo la vigencia de
> una ley temporal deben ser juzgados conforme a ella. La interpretación
> de este Código se debe realizar conforme al sentido de la Ley y con
> criterios de género. Se prohíbe la analogía salvo que beneficie al
> imputado o reo, así como al penado.

> **Art. 634 — ABROGACIÓN.** Derogar el Decreto No 144-83, de fecha 23
> de Agosto de 1983, contentivo del Código Penal y todas sus reformas.

Confirma, con texto literal, el hallazgo ya reportado: el corpus trae el
Decreto 130-2017 completo (635 filas) y el 144-83 no existe como cuerpo
propio — solo se le nombra en la cláusula de abrogación de su sucesor.

### 3. Blindaje de citas — `CPC_COMENTADO_ROMERO_2024` fuera de citas formales

**Hallazgo previo al fix**: las 1,481 filas de
`CPC_COMENTADO_ROMERO_2024` tienen `es_norma_vigente=NULL` y
`fuente_tipo=NULL` en producción (no `false` — nunca se marcaron
explícitamente como no-vigentes). `construirCitas()`
([app/api/chat/route.ts:167](../../app/api/chat/route.ts)) las excluía
hoy solo por el filtro `f.es_norma_vigente !== true` — correcto en su
efecto, pero **incidental**: dependía de que ninguna futura ingesta
marcara por error `es_norma_vigente=true` sobre una fuente doctrinal.

**Fix aplicado**: constante explícita `FUENTES_DOCTRINALES` (Set) en
`app/api/chat/route.ts`, evaluada como primer filtro de
`construirCitas()`, independiente del campo `vigente`. Hoy contiene
`'CPC_COMENTADO_ROMERO_2024'`; cualquier futura fuente de
doctrina/comentario/glosa debe añadirse a este set en el mismo commit
que la ingesta. Test añadido en
[tests/rag-citas-p0-2.test.ts](../../tests/rag-citas-p0-2.test.ts):
verifica que Romero nunca entra como cita **incluso si** llegara
marcado `es_norma_vigente=true` por error de ingesta futura — cierra la
dependencia incidental descrita arriba. `tsc --noEmit` limpio, 15/15
tests de citas en verde.

Rama: `docs/env-example-cohere-key` (reutilizada de la tarea anterior de
esta misma sesión; PR pendiente de abrir para este cambio de código).

### 4. Diseño del pliego de ingesta canónica — Decreto 102-2018 y CPP (D. 9-99-E)

**Solo diseño — cero ejecución.** Ningún INSERT corrido contra
`biblioteca_vectores` en esta sección.

**Hallazgo de reconciliación obligatorio antes de ingestar el CPP**: ya
existe **una** fila curada manualmente para el CPP —
`id: manual_curado:cpp_honduras:articulo_173`, `fuente: "Código Procesal
Penal de Honduras (Decreto 9-99-E)"`, `fuente_tipo: 'codigo'`,
`es_norma_vigente: true` — creada 2026-08-02 para resolver el incidente
de producción del 2026-07-23 (Art. 173 rankeaba fuera del top-5 por
similitud pura; ver comentario en `lib/rag/rerank.ts`). Su
`metadata.embedding_reutilizado: true` y
`metadata.embedding_pendiente_regeneracion: true` — el embedding de esa
fila fue **prestado** de otro documento (`01_PENAL_...doc_6027f42f`),
no generado del texto real. **La ingesta canónica del CPP debe
reemplazar esta fila (mismo `id`, mismo `fuente`) con embedding
regenerado real, no crear una fuente paralela** — de lo contrario el
Art. 173 quedaría duplicado bajo dos `fuente` distintas o dos filas con
el mismo `fuente` pero un embedding legítimo y otro prestado.

**Contrato de columnas/metadata propuesto** (aplica a ambos
instrumentos; normaliza el patrón hoy inconsistente entre P0-Tributario,
Código Penal y la fila CPP-173, que usan tres formas distintas de
metadata):

| Columna | Regla | Ejemplo |
|---|---|---|
| `id` | `mayalex_normativos:<slug_instrumento>_a<N>` — semántico, **nunca** `doc_<hash>` | `mayalex_normativos:adopciones_2018_a12` |
| `coleccion` | `mayalex_normativos` (fija, mismo patrón que P0) | — |
| `materia` | Normalizada al catálogo existente — `06_FAMILIA` para Adopciones (mismo dominio que Código de Familia), `01_PENAL` para CPP | — |
| `contenido` | Texto íntegro del artículo, sin metadata embebida, mismo formato que Código Penal 130-2017 | — |
| `num_articulo` | String estricto, sin prefijos (`"12"`, no `"Art. 12"`) | `"12"` |
| `fuente` | Título canónico único — reutilizar **exacto** el string ya en uso para CPP (`"Código Procesal Penal de Honduras (Decreto 9-99-E)"`); definir uno nuevo para Adopciones: `"Ley Especial de Adopciones (Decreto 102-2018)"` | — |
| `fuente_tipo` | `'codigo'` (mismo valor que la fila CPP-173 ya en producción, para no introducir una 4ª variante junto a `NULL`/`'codigo'`/`'sentencia'`/`'doctrina'`) | — |
| `jurisdiccion` | `'HN'` | — |
| `es_norma_vigente` | `true` explícito para artículos vigentes, `false` explícito para derogados/transitorios — **nunca `NULL`** (la laguna que causó el hallazgo de la sección 3) | — |
| `metadata.decreto` | Número de decreto, string | `"102-2018"` / `"9-99-E"` |
| `metadata.norm_id` | Identificador estable del instrumento, mismo patrón que `HN_CODIGO_PENAL` | `"HN_LEY_ADOPCIONES"` / `"HN_CPP"` |
| `metadata.fecha_publicacion` | Fecha de publicación en La Gaceta, ISO | `"2018-XX-XX"` |
| `metadata.metodo_extraccion` | Trazabilidad de origen del texto (mismo campo que la fila CPP-173) | `"pdftotext -layout -enc UTF-8, verificado manualmente"` |
| `metadata.hash_texto_sha256` | Hash del texto fuente, para integridad/idempotencia de re-ingesta | — |
| `metadata.verificado` / `fecha_verificacion` | Booleano + fecha de revisión humana antes de publicar | — |
| `embedding` | Generado real vía `intfloat/multilingual-e5-small`, prefijo `"passage: "` (mismo pipeline que `lib/rag/embed.ts`) — **nunca reutilizado de otra fila** | — |

**Regla dura, explícita por directiva del Fundador**: **cero generación
de `doc_<hash>` como `id` o como `fuente`** en este pliego — todo `id`
y todo `fuente` deben ser semánticos y legibles, sin excepción, incluso
para artículos transitorios o derogados.

**Pendiente de decisión del Fundador antes de ejecutar** (no resuelto
por diseño, requiere autorización explícita separada cuando se active):
fuente del texto íntegro de ambos instrumentos (PDF oficial de La
Gaceta a proveer), y si la reconciliación de la fila CPP-173 se hace
como `UPDATE` in-place o `DELETE`+`INSERT` dentro de la misma
transacción de la ingesta canónica del CPP completo.

---

## 2026-09-02 — Dictamen CLO: merge de PR #11 y condiciones duras para el próximo corte

**1. Merge autorizado y ejecutado.** El CLO emite luz verde formal
("🟢 merge") para PR #11. Ejecutado `--merge` (fast-forward
`2e7ece2..47d8c01`) contra `main`. **Nota de trazabilidad**: la
directiva nombró la rama a eliminar como
`feature/isolate-doctrinal-citas-and-audit-report` — esa rama nunca
existió en el remoto; la rama real detrás de PR #11, creada y pusheada
por el asistente en el turno anterior, es
`fix/blindaje-citas-doctrina-y-auditoria-clo`. Se eliminó esa (remota +
local, `git fetch --prune` confirmado) y no la nombrada en la
directiva, que no tenía correspondencia. `main` queda limpio y
sincronizado con `origin/main` en `47d8c01`.

**2. Backlog anotado — `FUENTES_DOCTRINALES` en etapa de retrieval.**
Pendiente, no ejecutado: hoy `FUENTES_DOCTRINALES` (PR #11) solo excluye
doctrina de la lista de citas formales (`construirCitas`,
`app/api/chat/route.ts`); el contexto crudo inyectado al LLM
(`lib/rag/search.ts` → `formatearContextoRAG`) sigue recibiendo
fragmentos de `CPC_COMENTADO_ROMERO_2024` sin ese mismo filtro — el
modelo puede seguir usándolos como contexto (correcto, es doctrina útil
para razonar) pero deben llegar inequívocamente etiquetados como
doctrina/comentario dentro del propio texto de contexto, no solo
excluidos del array `Cita[]` de UI. Queda como tarea de código separada,
no ejecutada en este turno.

**3. Condiciones duras del CLO para el pliego de ingesta canónica**
(ratifican y refuerzan el diseño de la entrada anterior; nada ejecutado):

- **Decreto 102-2018 (Adopciones)**: `materia='06_FAMILIA'`; `fuente`
  canónica única y legible (no `doc_*`); `es_norma_vigente` explícito
  (`true`/`false`) en el 100% de las filas — **nunca `NULL`**.
- **CPP (D. 9-99-E)**: la fila `manual_curado:cpp_honduras:articulo_173`
  se reemplaza **in situ, en la misma transacción** que la ingesta
  completa del CPP — prohibido crear una fuente paralela que fragmente
  el Art. 173 entre dos `fuente` o dos embeddings distintos para el
  mismo artículo.
- **CERO INSERTs en `biblioteca_vectores`** hasta que el pliego completo
  (ambos instrumentos) reciba aprobación formal explícita del Fundador
  — el diseño de la entrada anterior es una propuesta, no una
  autorización de ejecución.

Ningún INSERT/UPDATE/DELETE ejecutado contra `biblioteca_vectores` en
este turno. Único cambio: esta entrada de bitácora.
