# MAYALEX — CORPUS MASTER INVENTORY (HN) · auditoría de solo lectura

**Fecha:** 2026-10-24 · **Base:** `main` @ `f767dc3` · **Escrituras en producción / corpus:** 0
**Datos estructurados:** `MAYALEX_CORPUS_MASTER_INVENTORY_HN.json` · **Cola de trabajo para ChatGPT:** `CORPUS_SUPPLY_REQUEST_HN.md`

> **PRESENTE ≠ COMPLETO ≠ ACTUALIZADO ≠ VERIFICADO ≠ VIGENTE. VECTOR EXISTENTE ≠ FUENTE AUTORITATIVA.**
> Todo dato que no existe en el sistema figura como `UNKNOWN`. Nada se infiere. Toda salida es NO OFICIAL; la verificación es del CLO (Fredy).

## 0. Cómo se obtuvieron los datos (y qué NO se pudo ver)

| Fuente | Cómo | Límite |
|---|---|---|
| Producción `thgrhueckkjdutjvcufp`, tabla `public.biblioteca_vectores` | `SELECT` agregados (conteos por colección/materia/fuente/metadatos). Cero `INSERT/UPDATE/DELETE/DDL`. | No se leyó el texto de los artículos; una consulta de búsqueda temática fue abortada por el motor (sin espacio temporal) y **no** se repitió para no cargar producción. |
| Lista de tablas públicas de producción | `list_tables` (14 tablas) | Solo `biblioteca_vectores` contiene corpus. |
| Repositorio | Inventario V1 (2026-10-01), `corpus-seed`, `launch-core`, discovery A/B, registro de fuentes, código de `lib/legal-retrieval` y `lib/legal-os`, migraciones | — |
| **No consultado** | Proyecto `mayalexhn-staging`; el Exact Resolver **no se ejecutó** contra la base (análisis estático del código); hosts `*.gob.hn` (inalcanzables desde este entorno) | Cualquier cifra de elegibilidad por fila del resolver es UNKNOWN. |

Las cifras de 2026-10-24 coinciden con el Inventario V1 (2026-10-01) en los instrumentos identificados; no hay diferencias que sugieran escrituras posteriores.

## 1. Resumen ejecutivo (respuestas 1–15)

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | Total real de instrumentos | **13 instrumentos con identidad verificable** en la base (+ 3 capas adicionales del CPC). Hay **84,204 filas** en total; ≈ **74 mil filas (88 %) no tienen identidad de instrumento** (sin `fuente`/decreto/artículo): su inventario como «instrumentos» es **UNKNOWN**. |
| 2 | Total por materia (filas) | 00_CONSTITUCIONAL 378 · 01_PENAL 4,473 · 02_CIVIL 13,222 · 03_NOTARIAL 13,789 · 05_LABORAL 870 · 06_FAMILIA 2,806 · 07_CONSTITUCIONAL 2,754 · 08_TRIBUTARIO 215 · 09_AGRARIO 12,351 · 10_LEYES_REGLAMENTOS 33,346 (suma 84,204). No existe materia 04. |
| 3 | VERIFIED | **0** instrumentos con verificación humana. 9 filas con `verificado=true` (sub-tipo procedimental, no instrumentos). |
| 4 | V4 | **0** (el sistema no tiene campo V4; el estado editorial más alto registrado es `V2`, en 3,866 filas). |
| 5 | V5 | **0**. |
| 6 | Vectorizado | **84,204 / 84,204 filas** tienen embedding. Esto **no** implica autoridad jurídica. |
| 7 | Exact Resolver | **11 instrumentos** tienen soporte y datos: Constitución, Código Penal, CPP, Código Civil, CPC, Código del Trabajo, Código de Familia, Código del Notariado, Reglamento del Notariado, Código Tributario, Ley de Justicia Constitucional. `CODIGO_COMERCIO` está declarado en el tipo pero **sin datos**. Ley de Adopciones y Decreto 77-2006 **no** están en el resolver. |
| 8 | Tier A | §3 (instrumento por instrumento). |
| 9 | Tier B | §4: **≈ 2 % identificado** (1 de 51 rubros: Ley sobre Justicia Constitucional); **0 % verificado**; el resto UNKNOWN. |
| 10 | Jurisprudencia | §6: **ninguna jurisprudencia verificada de la CSJ**. 719 filas `sentencia` mezcladas en la tabla normativa (19 HN, 512 ES, 80 PE, 108 INTERNACIONAL) → `DISCOVERED/UNVERIFIED`, a separar. |
| 11 | OUTDATED | **2** por corte declarado en la propia fuente: Constitución (consolidado TSC **corte 2004**) y Código Tributario (consolidado SAR **corte 2019**). Para los demás la actualidad es UNKNOWN. |
| 12 | Sin reforma completa | **13 / 13**: ningún instrumento tiene cadena de reformas completa (el Decreto 77-2006 está presente solo como 6 filas sueltas). |
| 13 | Procedencia insuficiente | **13 / 13**: ninguno tiene `source_url`, `source_tier` ni hash del documento oficial. Solo hay cadena `fuente` en texto y hash por fila (72,767 filas). Gaceta: solo la Ley de Adopciones (64 filas, sin verificar). |
| 14 | P0 | §7 (17 brechas P0). |
| 15 | Lista para ChatGPT | `CORPUS_SUPPLY_REQUEST_HN.md`. |

## 2. Inventario real por instrumento (sección A)

Campos constantes en los 13 instrumentos (porque el sistema no los almacena): `source_url`, `source_domain`, `source_tier`, `hash` (del documento), `fecha`, `gaceta`, `fecha_gaceta` (salvo Adopciones), `reformas_conocidas`, `derogaciones_conocidas`, `interpretaciones`, `control_constitucional`, `version`, `vigente_desde`, `vigente_hasta` = **UNKNOWN**. Todos: `verification_state=PENDING_VERIFICATION`, `V4/V5=NONE`, `CLO_approval=NONE`, `ingestion_state=INGESTED_UNVERIFIED`, `segmentado/indexado/vectorizado=true`, `confidence=LOW`. Detalle campo a campo en el JSON.

| instrument_id | Instrumento | Decreto (según fuente) | Filas | Art. | vigente=true / false | Exact Resolver | Clasificación | Problemas detectados |
|---|---|---|---:|---:|---|---|---|---|
| HN_CONSTITUCION | Constitución | 131-1982 | 378 | 378 | 373 / 5 | Sí | PARTIAL · **OUTDATED** · REFORM_CHAIN_INCOMPLETE · PROVENANCE_INCOMPLETE | Consolidado TSC corte 2004; 5 filas «no vigente» sin base |
| HN_CODIGO_PENAL | Código Penal | 130-2017 | 635 | 635 | 635 / 0 | Sí | PARTIAL · REFORM_CHAIN_INCOMPLETE · PROVENANCE_INCOMPLETE | **2,617 filas legadas** 01_PENAL con fuente NULL y vigente=false (198 art.); sin Gaceta/transitorios/derogación del código anterior |
| HN_CODIGO_PROCESAL_PENAL | CPP | 9-99-E | 480 | 480 | 469 / 11 | Sí | PARTIAL · REFORM_CHAIN_INCOMPLETE | 11 filas no vigentes con `derogado_por` sin verificar |
| HN_CODIGO_CIVIL_1906 | Código Civil | Decreto del 8-feb-1906 | 2,372 | 2,372 | 2,001 / 371 | Sí | PARTIAL · REFORM_CHAIN_INCOMPLETE · **PENDING_CLO** | 371 filas derogadas (`derogado_por`) sin fundamento verificado |
| HN_CODIGO_PROCESAL_CIVIL | CPC | 211-2006 | 932 (+932 espejo, +995 texto base, +1,481 Romero 2024) | 932 | 932 / 0 | Sí | PARTIAL · REFORM_CHAIN_INCOMPLETE · PENDING_CLO | 4 capas; rol temporal del «texto base» sin resolver; Romero es doctrina; sin fe de erratas/transitorios |
| HN_CODIGO_TRABAJO | Código del Trabajo | 189-59 | 870 | 870 | 870 / 0 | Sí | PARTIAL · REFORM_CHAIN_INCOMPLETE | sin reformas ni normativa complementaria |
| HN_CODIGO_FAMILIA | Código de Familia | 76-84 | 373 | 373 | **43 / 330** | Sí | PARTIAL · REFORM_CHAIN_INCOMPLETE · **PENDING_CLO** | **88 % de las filas marcadas no vigentes sin `derogado_por`** (incoherencia; puede excluirlas del resolver) |
| HN_LEY_ESPECIAL_ADOPCIONES | Ley Especial de Adopciones | 102-2018 | 64 | 64 | 64 / 0 | **No** | PARTIAL · PROVENANCE_INCOMPLETE · PENDING_CLO | Única con `fecha_gaceta`/`publicacion` en metadatos (sin verificar) |
| HN_CODIGO_TRIBUTARIO | Código Tributario | 170-2016 | 215 | 215 | 215 / 0 | Sí | PARTIAL · **OUTDATED** · REFORM_CHAIN_INCOMPLETE | Consolidado SAR corte 2019; reformas 2020–2026 y fe de errata ausentes |
| HN_LEY_JUSTICIA_CONSTITUCIONAL | Ley sobre Justicia Constitucional | 244-2003 | 124 | 124 | 124 / 0 | Sí | PARTIAL · PROVENANCE_INCOMPLETE | reformas posteriores UNKNOWN |
| HN_CODIGO_NOTARIADO_D353_2005 | Código del Notariado | 353-2005 | 94 | 94 | 87 / 7 | Sí | PARTIAL · **PENDING_CLO** | secuencia 1–94 completa; 7 artículos no vigentes sin resolver |
| HN_RESOLUCION_PCSJ_17_2012 | Reglamento del Notariado | PCSJ-17-2012 | 111 | 111 | 111 / 0 | Sí | PARTIAL · PENDING_CLO | secuencia 1–111 completa; publicación UNKNOWN |
| HN_DECRETO_77_2006 | Reformas al Código del Notariado | 77-2006 | 6 | 6 | 6 / 0 | **No** | PARTIAL · PENDING_CLO | no aplicado como versión de los artículos reformados |

**Ausentes verificados (0 filas):** Código de Comercio (73-1950), Código de la Niñez (73-96) y reforma 35-2013, Decreto 284-2013, Decreto 31-2015, Decreto 124-92, Ley de Organización y Atribuciones de los Tribunales → `MISSING`.

**Capas sin identidad de instrumento (≈ 74 mil filas):**
- `mayalex_instrumentos`: 42,378 filas (escrituras/poderes/hipotecas/testamentos/compraventas, «desconocido»), todas con hash de fragmento. Propósito jurídico **sin resolver** (¿corpus no normativo intencional o ingesta incompleta?). **No** es fuente normativa.
- `mayalex_normativos` sin `fuente`: 8,366 filas con `archivo_src` de nombre hash (`doc_xxxx.txt`) y el grupo `10_LEYES_REGLAMENTOS` (18,178) y `09_AGRARIO` (879), `03_NOTARIAL` (3,542) y otros: sin `fuente`, decreto ni artículo → **no se puede afirmar qué leyes contienen**. Podrían incluir leyes de Tier B; es **UNKNOWN** hasta que se les asigne identidad.

## 3. Tier A — cobertura instrumento por instrumento (sección B)

| # | Instrumento objetivo | Estado | Qué hay | Qué falta |
|---|---|---|---|---|
| 1 | Constitución (reformas, pétreos, control constitucional) | `AVAILABLE_PARTIAL` · `OUTDATED` · `REFORM_CHAIN_INCOMPLETE` | 378 art., corte 2004 | texto vigente con reformas hasta 2026; artículos pétreos; interpretaciones/control constitucional (no representados) |
| 2 | Código Civil | `AVAILABLE_PARTIAL` · `PENDING_CLO` | 2,372 filas (1906) | cadena de reformas; base de 371 derogaciones; familia histórica |
| 3 | Código Procesal Civil | `AVAILABLE_PARTIAL` · `PENDING_CLO` | 4 capas | reformas, fe de erratas, transitorios; rol del texto base |
| 4 | Código Penal (130-2017) | `AVAILABLE_PARTIAL` | 635 art. + 2,617 filas legadas | Gaceta, vigencia, reformas, derogaciones, transitorios; resolver legado |
| 5 | Código Procesal Penal | `AVAILABLE_PARTIAL` | 480 art. | reformas y versiones temporales |
| 6 | Código de Comercio (73-50) | **`MISSING`** | 0 | todo: original, publicación, reformas, sociedades, títulos valores |
| 7 | Código del Trabajo | `AVAILABLE_PARTIAL` | 870 art. | reformas; normativa laboral complementaria principal |
| 8 | Código de Familia (76-84) | `AVAILABLE_PARTIAL` · `PENDING_CLO` | 373 art. (43 vigentes) | reformas hasta 2026; explicación de 330 no vigentes |
| 9 | Código de la Niñez (73-96, 35-2013) | **`MISSING`** | 0 (Adopciones 102-2018 presente, no es el código) | acto originario, reforma integral, reformas posteriores |
| 10 | Código del Notariado / legislación notarial | `AVAILABLE_PARTIAL` · `PENDING_CLO` | Código 94 + Reglamento 111 + Decreto 77-2006 (6) | publicación oficial, aplicación de reformas, 7 artículos en duda |
| 11 | Ley de Procedimiento Administrativo (152-87) | `DISCOVERED_UNVERIFIED` | 0 filas identificadas | texto oficial, reformas |
| 12 | Ley de Propiedad (82-2004) | `DISCOVERED_UNVERIFIED` | 0 filas identificadas | texto oficial; reformas (150-2010 y 205-2012 solo si la fuente oficial las confirma) |
| 13 | Código Tributario (170-2016) | `AVAILABLE_PARTIAL` · `OUTDATED` | 215 art., corte 2019 | fe de errata, interpretaciones, reformas 2017–2026 |
| 14 | Legislación Aduanera (CAUCA/RECAUCA/nacional) | `DISCOVERED_UNVERIFIED` | 0 | todo |
| 15 | AML/CFT (45-2002, 144-2014, 24-2017, UIF/CNBS) | `DISCOVERED_UNVERIFIED` | 0 | todo, incluida la evolución histórica |
| 16 | APNFD (131-2014) | `DISCOVERED_UNVERIFIED` | 0 | ley, reglamento, alcance sobre abogados/notarios |
| 17 | Sistema Financiero (129-2004, CNBS) | `DISCOVERED_UNVERIFIED` | 0 | ley, reformas, normativa CNBS |

Resumen Tier A (17 rubros): **0 verificados; 9 presentes (todos parciales); 2 ausentes verificados (Comercio, Niñez); 6 solo descubiertos, sin texto (Procedimiento Administrativo, Propiedad, Aduanera, AML/CFT, APNFD, Sistema Financiero).** (El Launch Core previo contaba 16 filas porque trataba AML/CFT y APNFD como una sola.)

## 4. Tier B (sección C) — porcentaje aproximado

De **51 rubros** listados en el mandato, **1** tiene un instrumento identificado en la base (Ley sobre Justicia Constitucional) → **≈ 2 %** identificado, **0 %** verificado. Para los otros 50 el estado es `MISSING` o `DISCOVERED` **según lo identificable**: la base contiene ≈ 74 mil filas sin identidad, de modo que algunas leyes de Tier B pueden estar presentes sin poder demostrarse (**UNKNOWN**). Ninguna es citable por el Exact Resolver hoy.

Rubros sin instrumento identificado: Ley Orgánica del Poder Judicial, Ministerio Público, Procuraduría General, Municipalidades (y reglamento), Contratación del Estado (y reglamento), LGAP, Simplificación Administrativa, Transparencia/IAIP, RNP, Instituto de la Propiedad, propiedad intelectual, derechos de autor, marcas/patentes, arbitraje, conciliación, inversión, competencia, consumidor, sociedades/empresa, cooperativas, ONG/OSC, fundaciones/asociaciones, migración/extranjería, nacionalidad, pasaportes, electoral, medio ambiente, recursos naturales, minería, energía, telecomunicaciones, salud, medicamentos/ARSA, educación, universidades, IHSS, pensiones, seguros, mercado de valores, banca, BCH, CNBS, SAR, aduanas, zonas libres/regímenes especiales, ZEDE (régimen histórico/derogatorio), comercio exterior, tratados comerciales, tratados internacionales.

## 5. Tier C (sección D) — mapa de cobertura por área

Leyenda: ● identificado (parcial, sin verificar) · ◐ posible en el conjunto sin identidad (UNKNOWN) · ○ sin cobertura identificada.

| Área | Estado | Instrumentos | Área | Estado | Instrumentos |
|---|---|---|---|---|---|
| CIVIL | ● | Código Civil | PROCESAL | ● | CPC, CPP |
| MERCANTIL | ○ MISSING | Comercio ausente | PENAL | ● | Código Penal |
| LABORAL | ● | Trabajo | FAMILIA | ● | Familia, Adopciones |
| NIÑEZ | ○ MISSING | Código Niñez ausente | NOTARIAL | ● | Notariado, Reglamento, D77-2006 |
| REGISTRAL | ○ | — | ADMINISTRATIVO | ○ | — |
| CONSTITUCIONAL | ● | Constitución, LJC | TRIBUTARIO | ● | Código Tributario |
| ADUANERO | ○ | — | BANCARIO / FINANCIERO | ○ | — |
| SEGUROS | ○ | — | AML/CFT / APNFD | ○ | — |
| PROPIEDAD | ○ | — | PROPIEDAD INTELECTUAL | ○ | — |
| COMPETENCIA / CONSUMIDOR | ○ | — | AMBIENTAL | ○ | — |
| MUNICIPAL / CONTRATACIÓN PÚBLICA | ○ | — | MIGRATORIO | ○ | — |
| INTERNACIONAL PRIVADO / COMERCIO INTERNACIONAL | ○ | — | DERECHOS HUMANOS | ○ | — |
| CORPORATIVO / INVERSIÓN | ○ | — | ENERGÍA / TELECOMUNICACIONES | ○ | — |
| SALUD / EDUCACIÓN | ○ | — | AGRARIO | ◐ | 12,351 filas `09_AGRARIO` sin identidad |
| FORESTAL / MINERO | ○ | — | SEGURIDAD SOCIAL | ○ | — |

## 6. Jurisprudencia (sección E) — corpus separado de la legislación

| Corte / órgano | Estado | Evidencia |
|---|---|---|
| Corte Suprema de Justicia (general) | `MISSING` | ninguna sentencia de la CSJ identificada |
| Sala Constitucional (amparo, inconstitucionalidad, hábeas corpus/exhibición personal) | `MISSING` | — |
| Sala Civil / Penal / Laboral-Contencioso / casación | `MISSING` | — |
| Jurisprudencia administrativa | `MISSING` | — |
| «Sentencias» dentro de `mayalex_normativos` | `DISCOVERED` · `UNVERIFIED` | 719 filas: HN 19, ES (El Salvador) 512, PE (Perú) 80, INTERNACIONAL 108; fuente NULL; **mezcladas con la ley** (viola la regla de separación) |
| Doctrina (`fuente_tipo=doctrina`) | `UNVERIFIED` | 6 filas HN + CPC comentado Romero (1,481) |
| Infraestructura | `PARTIAL` | `lib/legal-os/jurisprudence` (esquema + búsqueda; sin registros); adaptador CEDIJ verificado en vivo en una sesión anterior; acceso a `*.gob.hn` hoy bloqueado |

Acción recomendada (sin tocar el corpus): cuando se autorice, mover/etiquetar las 719 filas fuera de la tabla normativa o excluirlas del retrieval jurídico; hasta entonces, no citarlas como autoridad.

## 7. Grafo temporal (sección F)

| Capacidad | Hoy |
|---|---|
| `ORIGINAL_ACT → PUBLICATION → EFFECTIVE_DATE → AMENDMENT → INTERPRETATION → DEROGATION → CONSTITUTIONAL_EFFECT → CURRENT_VERSION` | **No representable en producción.** Código y migración existen (`lib/legal-retrieval/norma-version.ts`, `20261016000000_norma_version.sql`), pero la tabla `norma_version` **no aparece entre las 14 tablas públicas de producción** → migración **no aplicada**; sin datos. |
| Por artículo: `ORIGINAL_TEXT → AMENDMENT_n → effective_from/to → SOURCE → GACETA → HASH` | **Parcial / no posible.** Solo existen: `es_norma_vigente` (booleano), `derogado_por` (382 filas, texto libre), `hash_articulo`/`hash_texto_sha256` (3,864 / 3,127 filas), `fecha_gaceta` (64 filas, solo Adopciones). Sin `effective_from/to`, sin cadena de enmiendas, sin `SOURCE` estructurado. |

**Instrumentos donde NO es posible hoy:** los 13 sin excepción. Los de mayor riesgo (reformas conocidas y no representadas): Constitución, Código Civil, Código Tributario, Código de Familia, Código del Notariado (Decreto 77-2006 sin aplicar).

## 8. Matriz de brechas y prioridades (sección G)

Clases: `AVAILABLE_VERIFIED`=0 · `AVAILABLE_UNVERIFIED`=0 (todo está en PARTIAL por falta de cadena/procedencia) · `AVAILABLE_PARTIAL`=13 · `OUTDATED`=2 · `REFORM_CHAIN_INCOMPLETE`=13 · `PROVENANCE_INCOMPLETE`=13 · `DISCOVERED_UNVERIFIED`=6 · `PENDING_CLO`=7 (Civil, CPC, Familia, Adopciones, Notariado ×3) · `MISSING`=6.

| ID | Brecha | Prioridad | Requerida para skill | Documento necesario | Fuente oficial preferida | Qué debe encontrar ChatGPT |
|---|---|---|---|---|---|---|
| P0-001 | Código de Comercio | P0 | HN.COMMERCIAL.CONTRACTS, HN.COMMERCIAL.NEGOTIABLE_INSTRUMENTS | original + publicación + cadena de reformas | La Gaceta; CEDIJ | ver `CORPUS_SUPPLY_REQUEST_HN.md` |
| P0-002 | Código de la Niñez | P0 | HN.FAMILY.CHILDREN | acto originario + reforma integral + reformas | La Gaceta; CEDIJ | ídem |
| P0-003 | Constitución actualizada | P0 | HN.CONSTITUTIONAL.ARTICLE_LOOKUP | texto vigente con reformas | La Gaceta; CEDIJ; Congreso | ídem |
| P0-004 | Código Tributario actualizado | P0 | HN.TAX.ARTICLE_LOOKUP | reformas 2017–2026 + fe de errata | La Gaceta; SAR; CEDIJ | ídem |
| P0-005 | Código Penal 130-2017 | P0 | HN.PENAL.* | publicación, vigencia, reformas, transitorios | La Gaceta; CEDIJ | ídem |
| P0-006 | Código Civil | P0 | HN.CIVIL.* | reformas, base de las derogaciones | La Gaceta; CEDIJ | ídem |
| P0-007 | CPC 211-2006 | P0 | HN.PROCEDURAL_CIVIL.CLAIM | publicación, reformas, erratas | La Gaceta; CEDIJ | ídem |
| P0-008 | CPP 9-99-E | P0 | HN.PROCEDURAL_PENAL | reformas | La Gaceta; CEDIJ | ídem |
| P0-009 | Código del Trabajo | P0 | HN.LABOR.TERMINATION | reformas | La Gaceta; CEDIJ | ídem |
| P0-010 | Código de Familia | P0 | HN.FAMILY.DIVORCE, HN.FAMILY.CHILDREN | reformas hasta 2026 | La Gaceta; CEDIJ | ídem |
| P0-011 | Legislación notarial | P0 | HN.NOTARIAL.PUBLIC_DEED | publicación 353-2005, 77-2006, reglamento | La Gaceta; CEDIJ; CSJ | ídem |
| P0-012 | Ley de Procedimiento Administrativo | P0 | HN.ADMINISTRATIVE.APPEAL | texto + reformas | La Gaceta; CEDIJ | ídem |
| P0-013 | Ley de Propiedad | P0 | HN.CIVIL.PROPERTY | texto + reformas | La Gaceta; IP | ídem |
| P0-014 | AML/CFT | P0 | HN.AML.COMPLIANCE | leyes + reformas + UIF/CNBS | La Gaceta; UIF; CNBS | ídem |
| P0-015 | APNFD | P0 | HN.AML.COMPLIANCE | ley + reglamento | La Gaceta; UIF/CNBS | ídem |
| P0-016 | Sistema Financiero | P0 | (banca/AML) | ley + reformas + CNBS | La Gaceta; CNBS; BCH | ídem |
| P0-017 | Legislación aduanera | P0 | (aduanero) | CAUCA/RECAUCA/ley nacional | SIECA; Aduanas Honduras; La Gaceta | ídem |

P1: Ley de Justicia Constitucional (reformas), Ley de Organización y Atribuciones de los Tribunales, Decretos 31-2015, 124-92 y 284-2013 (identificar), toda la lista Tier B, jurisprudencia piloto. P2: Ley de Adopciones (publicación), Tier C no prioritario.

## 9. Arquitectura objetivo (sección I)

| Pieza | Estado | Nota |
|---|---|---|
| USER → auth/límites | EXISTS | `lib/auth`, `lib/rate-limit`, `lib/flags` |
| INTENT ROUTER | EXISTS (producción) · **NOT_WIRED** (Legal OS) | `clasificarConsulta` en producción; `lib/legal-os/router` solo en sombra |
| JURISDICTION | **NOT_WIRED** | registro HN en `lib/legal-os/jurisdiction` |
| LEGAL SKILL | **NOT_WIRED** | 19 skills DRAFT evaluadas en sombra; no usadas en la respuesta |
| RETRIEVAL PLAN | **NOT_WIRED** | `lib/legal-os/retrieval` |
| EXACT RESOLVER | EXISTS | 11 instrumentos con datos; Comercio sin datos; resolver legado exige identidad `fuente` |
| HYBRID: exact | EXISTS | — |
| HYBRID: metadata | PARTIAL | filtro por materia/vigencia; 80 % sin `es_norma_vigente` fiable |
| HYBRID: lexical/BM25 | **MISSING** | no hay búsqueda léxica (`tsvector`/BM25) en producción; solo se menciona en el plan de Legal OS |
| HYBRID: vectores | EXISTS | pgvector, `buscar_biblioteca_v2`, rerank opcional |
| HYBRID: grafo | PARTIAL / NOT_WIRED | módulo `lib/legal-os/graph`, sin datos |
| HYBRID: jurisprudencia | PARTIAL / NOT_WIRED | módulo sin registros |
| HYBRID: fallback web oficial | PARTIAL | Tavily existe pero no restringido a fuentes oficiales; CEDIJ adaptador verificado |
| VERSION / VALIDITY ENGINE | PARTIAL · **NOT_WIRED** | código existe; tabla `norma_version` ausente en producción |
| EVIDENCE GATE | EXISTS | fail-closed |
| LEGAL MODEL ROUTER | EXISTS (en sombra) · **NOT_WIRED** | `lib/legal-os/router/model-router` + política con aliases |
| MODEL | EXISTS (Anthropic) · PARTIAL (OpenAI/Luna) | Luna en gateway apagado; sin clave; sin proveedor real en Legal OS |
| CITATION VALIDATOR | EXISTS | verificación servidor + `verificar-cita` |
| LEGAL SAFETY GATE | PARTIAL | guardas de privacidad/inyección en Legal OS (sombra) y gates de producción; 15.4 % riesgo residual de privacidad fuera del envelope |
| ANSWER / SOURCE CARDS | PARTIAL · NOT_WIRED | DTO v2 listo; cambio de ruta no aplicado; bandera OFF |
| TRACE / OBSERVABILITY | PARTIAL | trazas con redacción en sombra; log de consultas en producción |
| EVALUATION | PARTIAL | 150 plantillas; 94 DESIGN_FIXED; 56 pendientes CLO; 0 aprobadas |
| CONTROLLED LEARNING | PARTIAL | observar/proponer, cableado al sombra; nunca aplica |

## 10. OpenAI / Luna (sección J)

Sin cambios de código en esta auditoría. Estado: política con **aliases de capacidad** (FAST / STANDARD / DEEP_REASONING / DOCUMENT / CLASSIFIER) ya implementada; **FAST = `gpt-6-luna` verificado**; el modelo de razonamiento profundo está **sin verificar** (cae a FAST con bandera). Antes de activar cualquiera se verifica el ID oficial vigente. Luna **no decide** vigencia, derogación, autoridad de fuente, promoción V4/V5 ni aprobación CLO; esas decisiones son del motor determinista y del CLO. Egreso a OpenAI: **apagado** (kill switch, presupuesto 0, sin clave).

## 11. Principio rector (sección K)

DETERMINISTIC LAW FIRST → RETRIEVAL SECOND → MODEL REASONING THIRD. Hoy lo determinista cubre 11 instrumentos por artículo exacto; **la capa que más limita ese principio no es el modelo sino los datos:** sin cadena de reformas, sin versiones y sin procedencia, «lo cierto» no puede ser cierto.

## 12. Blockers

**Técnicos:** (1) `norma_version` no aplicada en producción (requiere decisión y autorización; no se toca aquí); (2) ≈ 74 mil filas sin identidad de instrumento; (3) 2,617 filas legadas del Código Penal sin fuente; (4) sin BM25/léxico; (5) 719 sentencias extranjeras/no oficiales mezcladas con la norma; (6) sin red a `*.gob.hn` desde este entorno; (7) Fluid Compute/`maxDuration` sin confirmar en Vercel; (8) sin campo estructurado de procedencia (`source_url`, `source_tier`, hash del documento).

**Jurídicos / CLO (Fredy):** (1) 0 verificaciones V4/V5 y 0 aprobaciones; (2) 371 derogaciones del Código Civil y 330 «no vigentes» del Código de Familia sin fundamento; (3) 7 artículos del Código del Notariado; (4) rol temporal del texto base del CPC y estado canónico de la Ley de Adopciones; (5) propósito de `mayalex_instrumentos` (42,378) y de las capas legadas; (6) citas legales PENDIENTE_VERIFICACIÓN; (7) 21 celdas de planes y titulares de tarifas (decisión de negocio, no jurídica).

## 13. Siguiente acción recomendada

1. **ChatGPT**: ejecutar `CORPUS_SUPPLY_REQUEST_HN.md` en orden P0-001…P0-017 como `OfficialSourcePackage` (no promueve nada).
2. **Claude**: procesar cada lote con `tools/corpus/process-batch.ts` (hash/procedencia → QA → candidato `CLO_PENDING`), sin escribir en producción.
3. **Fredy (CLO)**: adjudicar primero los instrumentos que gobiernan más skills (Civil, Penal, Notariado) y destrabar la red a los hosts oficiales.
4. **Ingeniería segura (sin tocar el corpus)**: preparar un informe de identidad para las ≈ 74 mil filas sin instrumento (solo lectura) y el diseño de aplicación de `norma_version` para aprobación.

---

## English executive summary (American English)

**Real inventory (read-only, 2026-10-24).** `biblioteca_vectores` holds **84,204 rows**, all with embeddings. Only **13 instruments** have a verifiable identity (6,654 rows; plus three extra CPC layers); about **74k rows (88 %) carry no instrument identity**, so what laws they contain is UNKNOWN. **VERIFIED = 0, V4 = 0, V5 = 0, CLO approvals = 0.** Exact Resolver supports **11** instruments with data. **Two instruments are outdated by their own declared cutoff** (Constitution: TSC 2004; Tax Code: SAR 2019). **None** has a complete reform chain or official provenance (URL, tier, document hash). **Missing:** Commerce Code, Children's Code, and four related decrees. Tier B is ≈ **2 %** identified (1 of 51 topics), 0 % verified. There is **no verified jurisprudence**; 719 foreign/unofficial "sentencia" rows are mixed into the statute table and must be separated. The temporal graph is **not representable in production** (the `norma_version` table is not applied there). Architecture: lexical/BM25 is **missing**; the Legal OS router, skills, plan, graph and model router are built but **NOT_WIRED**. Luna stays the fast model via capability aliases, verified before activation, and never decides validity or authority. **Next:** ChatGPT works the P0 queue as OfficialSourcePackages; I stage and QA them; Fredy adjudicates as CLO.

**English tip:** "Data gap" and "coverage gap" are different. A *coverage gap* means a law is missing; a *data gap* (like our missing reform chains) means the law is there but you can't prove it's current.
