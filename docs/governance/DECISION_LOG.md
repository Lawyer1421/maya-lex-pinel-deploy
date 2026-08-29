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
