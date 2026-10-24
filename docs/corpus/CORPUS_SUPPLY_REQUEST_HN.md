# CORPUS SUPPLY REQUEST — HN (cola de trabajo para ChatGPT)

**Fecha:** 2026-10-24 · **Origen:** `MAYALEX_CORPUS_MASTER_INVENTORY_HN.md` · **Destino de cada entrega:** `docs/corpus/inbox/` como `OfficialSourcePackage` (contrato: `OFFICIAL_SOURCE_PACKAGE_CONTRACT.md`; receptor: `INGESTION_RECEIVER.md`).

## Reglas para ChatGPT (aplican a TODOS los pedidos)

1. **Solo fuentes oficiales**, en este orden: La Gaceta (edición oficial) → Congreso Nacional / Poder Judicial (CEDIJ `legislacion.poderjudicial.gob.hn`) / organismo competente (SAR, CNBS, UIF, BCH, IP, Aduanas). Un sitio secundario (WIPO, RAE/DPEJ, blogs) solo sirve de **pista**, nunca de fuente.
2. Por cada documento: URL oficial exacta, fecha y fuente de captura, **SHA-256 del archivo original** (PDF) y del texto extraído, número y fecha de la Gaceta, número de decreto/acuerdo y fecha, y el **texto íntegro** (sin resumir ni «corregir»).
3. **No inferir**: si un decreto, fecha, Gaceta o reforma no aparece en la fuente oficial, escribir `UNKNOWN`. Los números de decreto de esta lista vienen del mandato o de pistas **sin verificar**; confirmarlos o refutarlos con la fuente, no darlos por ciertos.
4. Separar **legislación** de **jurisprudencia** y de **doctrina** (paquetes distintos).
5. Nada de datos privados de clientes ni escrituras reales.
6. Ningún paquete se vuelve VERIFIED/V4/V5: lo recibe el receptor, pasa a `CLO_PENDING` y lo adjudica Fredy.
7. Un paquete por **acto** (original, cada reforma, cada fe de erratas, cada derogación), para poder reconstruir la cadena `ORIGINAL → PUBLICACIÓN → VIGENCIA → REFORMA → DEROGACIÓN`.

Tipo de paquete por defecto: `OfficialSourcePackage`.

---

## P0 — bloquean skills de lanzamiento

### P0-001 · Código de Comercio
- **Instrument:** Código de Comercio · **Estado:** MISSING (0 filas)
- **Need:** original + publicación en Gaceta + cadena completa de reformas (sociedades, contratos mercantiles, títulos valores, comercio bancario/mercantil)
- **Known candidate:** Decreto 73-1950 (pista: fechas discrepantes 17-feb / 1-may-1950 en fuentes secundarias; sin verificar)
- **Missing:** texto íntegro, Gaceta de publicación, fecha de vigencia, todas las reformas
- **Preferred sources:** La Gaceta; CEDIJ; Congreso Nacional
- **Skills affected:** HN.COMMERCIAL.CONTRACTS, HN.COMMERCIAL.NEGOTIABLE_INSTRUMENTS
- **Do not infer:** número/fecha de decreto; qué reformas existen; vigencia de cada artículo

### P0-001b · Reformas identificadas del Código de Comercio
- **Need:** Decreto 284-2013 (pista: sociedades unipersonales/reforma del Código de Comercio) y cualquier otra reforma que la fuente oficial confirme · **Estado:** MISSING (0 filas)
- **Do not infer:** que 284-2013 modifica el Código de Comercio hasta verlo en la fuente

### P0-002 · Código de la Niñez y de la Adolescencia
- **Need:** acto originario + reforma integral + reformas posteriores
- **Known candidate:** Decreto 73-96 (acto originario) y Decreto 35-2013 (reforma integral), según el mandato; sin verificar · **Estado:** MISSING
- **Missing:** texto, Gaceta, fechas, reformas posteriores
- **Preferred sources:** La Gaceta; CEDIJ; Congreso Nacional
- **Skills affected:** HN.FAMILY.CHILDREN
- **Do not infer:** que 35-2013 sustituye o solo reforma el texto; vigencia por artículo

### P0-003 · Constitución de la República — texto actualizado
- **Need:** texto vigente con **todas las reformas hasta 2026**, artículos pétreos, interpretaciones/control constitucional relevante
- **Known candidate:** Decreto 131-1982 (la base tiene un consolidado TSC con corte 2004) · **Estado:** PARTIAL + OUTDATED
- **Missing:** cada decreto de reforma posterior al 2004 con su Gaceta; el artículo reformado y su redacción previa
- **Preferred sources:** La Gaceta; Congreso Nacional; CEDIJ
- **Skills affected:** HN.CONSTITUTIONAL.ARTICLE_LOOKUP
- **Do not infer:** qué artículos cambiaron; que el consolidado TSC 2004 sea el vigente

### P0-004 · Código Tributario — reformas y fe de errata
- **Need:** Decreto 170-2016, fe de errata, interpretaciones, reformas **2017–2026**
- **Known candidate:** Decreto 170-2016 (la base tiene consolidado SAR con corte 2019) · **Estado:** PARTIAL + OUTDATED
- **Missing:** original publicado, fe de errata, cada reforma 2017–2026 con Gaceta
- **Preferred sources:** La Gaceta; SAR; CEDIJ
- **Skills affected:** HN.TAX.ARTICLE_LOOKUP
- **Do not infer:** que el consolidado 2019 incluya todas las reformas hasta esa fecha

### P0-005 · Código Penal (Decreto 130-2017)
- **Need:** publicación en Gaceta, fecha de vigencia, reformas, derogaciones y transitorios; qué código derogó
- **Known candidate:** Decreto 130-2017 · **Estado:** PARTIAL (635 art.; además 2,617 filas legadas sin fuente)
- **Missing:** acto original publicado; reformas; transitorios; documento que identifique el código al que pertenecen las 2,617 filas legadas
- **Preferred sources:** La Gaceta; CEDIJ; Congreso Nacional
- **Skills affected:** HN.PENAL.CRIMES.FRAUD, HN.PENAL.ARTICLE_LOOKUP, HN.PENAL.OFFENSE_ANALYSIS
- **Do not infer:** fecha de entrada en vigor; qué artículos del código anterior siguen vivos

### P0-006 · Código Civil
- **Need:** cadena de reformas desde 1906 y el fundamento de cada derogación (371 artículos marcados derogados en la base)
- **Known candidate:** Decreto del Poder Ejecutivo del 8 de febrero de 1906 · **Estado:** PARTIAL + PENDING_CLO
- **Missing:** decretos reformatorios/derogatorios con Gaceta (obligaciones, contratos, bienes, propiedad, sucesiones, familia histórica)
- **Preferred sources:** La Gaceta; CEDIJ; Congreso Nacional
- **Skills affected:** HN.CIVIL.CONTRACTS, HN.CIVIL.CONTRACTS.SALE, HN.CIVIL.PROPERTY, HN.CIVIL.SUCCESSION
- **Do not infer:** que `derogado_por` de la base sea correcto; vigencia por artículo

### P0-007 · Código Procesal Civil
- **Need:** publicación, entrada en vigor, reformas, fe de erratas y disposiciones transitorias
- **Known candidate:** Decreto 211-2006 · **Estado:** PARTIAL + PENDING_CLO (4 capas)
- **Missing:** acto original; cada reforma; erratas; transitorios; qué es exactamente el «texto base» y su relación temporal con la versión normativa
- **Preferred sources:** La Gaceta; CEDIJ; Poder Judicial
- **Skills affected:** HN.PROCEDURAL_CIVIL.CLAIM
- **Do not infer:** que el texto base sea «previo a la reforma»

### P0-008 · Código Procesal Penal
- **Need:** reformas y versiones temporales
- **Known candidate:** Decreto 9-99-E · **Estado:** PARTIAL
- **Missing:** reformas con Gaceta; fundamento de las 11 filas no vigentes
- **Preferred sources:** La Gaceta; CEDIJ; Congreso Nacional
- **Skills affected:** HN.PROCEDURAL_PENAL
- **Do not infer:** vigencia por artículo en una fecha dada

### P0-009 · Código del Trabajo
- **Need:** reformas y normativa laboral complementaria principal
- **Known candidate:** Decreto 189-59 · **Estado:** PARTIAL
- **Missing:** reformas con Gaceta; leyes/reglamentos complementarios
- **Preferred sources:** La Gaceta; CEDIJ; Secretaría de Trabajo
- **Skills affected:** HN.LABOR.TERMINATION
- **Do not infer:** cuáles leyes complementarias son «principales» (listarlas con su fuente)

### P0-010 · Código de Familia
- **Need:** Decreto 76-84 y reformas **hasta 2026**; explicación de por qué 330 de 373 artículos figuran como no vigentes en la base
- **Known candidate:** Decreto 76-84 · **Estado:** PARTIAL + PENDING_CLO
- **Missing:** reformas con Gaceta; derogaciones documentadas
- **Preferred sources:** La Gaceta; CEDIJ; Congreso Nacional
- **Skills affected:** HN.FAMILY.DIVORCE, HN.FAMILY.CHILDREN
- **Do not infer:** que las filas «no vigentes» estén derogadas

### P0-011 · Legislación notarial
- **Need:** publicación oficial del Código del Notariado, Decreto 77-2006 (reformas), Reglamento (PCSJ-17-2012) y disposiciones relacionadas; base de los 7 artículos marcados no vigentes
- **Known candidate:** Decreto 353-2005; Decreto 77-2006; Resolución PCSJ-17-2012 · **Estado:** PARTIAL + PENDING_CLO
- **Missing:** Gaceta de cada acto; texto reformado por artículo; reformas posteriores
- **Preferred sources:** La Gaceta; CEDIJ; Poder Judicial / CSJ
- **Skills affected:** HN.NOTARIAL.PUBLIC_DEED
- **Do not infer:** que 77-2006 agote las reformas; vigencia de los 7 artículos

### P0-012 · Ley de Procedimiento Administrativo
- **Need:** texto íntegro y reformas
- **Known candidate:** Decreto 152-87 (según el mandato; sin verificar) · **Estado:** DISCOVERED_UNVERIFIED (0 filas identificadas)
- **Missing:** todo
- **Preferred sources:** La Gaceta; CEDIJ
- **Skills affected:** HN.ADMINISTRATIVE.APPEAL
- **Do not infer:** número de decreto, reformas

### P0-013 · Ley de Propiedad
- **Need:** texto íntegro y reformas
- **Known candidate:** Decreto 82-2004; reformas 150-2010 y 205-2012 **solo si la evidencia oficial las confirma** · **Estado:** DISCOVERED_UNVERIFIED
- **Missing:** todo
- **Preferred sources:** La Gaceta; Instituto de la Propiedad; CEDIJ
- **Skills affected:** HN.CIVIL.PROPERTY
- **Do not infer:** que 150-2010 y 205-2012 sean reformas de esta ley

### P0-014 · AML/CFT
- **Need:** evolución normativa histórica completa
- **Known candidate:** Decreto 45-2002; Ley Especial contra el Lavado de Activos, Decreto 144-2014; Decreto 24-2017 «cuando corresponda»; normativa UIF/CNBS (todo sin verificar) · **Estado:** DISCOVERED_UNVERIFIED
- **Missing:** textos, Gacetas, reformas/interpretaciones, qué derogó qué
- **Preferred sources:** La Gaceta; UIF; CNBS; CEDIJ
- **Skills affected:** HN.AML.COMPLIANCE
- **Do not infer:** relación de derogación entre 45-2002 y 144-2014

### P0-015 · APNFD
- **Need:** ley, reglamentación y alcance sobre abogados y notarios (solo si la norma lo dice)
- **Known candidate:** Decreto 131-2014 (sin verificar) · **Estado:** DISCOVERED_UNVERIFIED
- **Preferred sources:** La Gaceta; UIF; CNBS
- **Skills affected:** HN.AML.COMPLIANCE
- **Do not infer:** que abogados/notarios estén obligados sin texto expreso

### P0-016 · Sistema Financiero
- **Need:** ley, reformas y normativa CNBS principal
- **Known candidate:** Decreto 129-2004 (sin verificar) · **Estado:** DISCOVERED_UNVERIFIED
- **Preferred sources:** La Gaceta; CNBS; BCH
- **Skills affected:** AML/banca (sin skill dedicada aún)
- **Do not infer:** cuáles resoluciones CNBS son «principales» (listarlas con su fuente)

### P0-017 · Legislación aduanera
- **Need:** CAUCA, RECAUCA, legislación nacional complementaria y normativa de Aduanas Honduras
- **Known candidate:** ninguno confirmado · **Estado:** DISCOVERED_UNVERIFIED
- **Preferred sources:** SIECA; Aduanas Honduras; La Gaceta
- **Skills affected:** (aduanero; sin skill dedicada aún)
- **Do not infer:** versión vigente del CAUCA/RECAUCA para Honduras

---

## P1 — alta prioridad profesional (después del P0)

| ID | Pedido | Notas |
|---|---|---|
| P1-001 | Ley sobre Justicia Constitucional (244-2003): reformas | ya hay 124 art. |
| P1-002 | Ley de Organización y Atribuciones de los Tribunales | ausente verificado |
| P1-003 | Identificar los Decretos 31-2015 y 124-92 (qué son, materia, estado) | ausentes verificados; no asumir su contenido |
| P1-004 | Ley Orgánica del Poder Judicial; Ministerio Público; Procuraduría General | Tier B |
| P1-005 | Municipalidades (y reglamento); Contratación del Estado (y reglamento); LGAP; Simplificación Administrativa | Tier B |
| P1-006 | Transparencia/IAIP; RNP; legislación del Instituto de la Propiedad | Tier B |
| P1-007 | Propiedad intelectual (derechos de autor, marcas, patentes) | Tier B |
| P1-008 | Arbitraje; conciliación; inversión; competencia; consumidor; sociedades/empresa; cooperativas; ONG/OSC; fundaciones/asociaciones | Tier B |
| P1-009 | Migración/extranjería; nacionalidad; pasaportes; electoral | Tier B |
| P1-010 | Ambiente; recursos naturales; minería; energía; telecomunicaciones; forestal; agrario | Tier B/C |
| P1-011 | Salud; ARSA/medicamentos; educación; universidades; IHSS; pensiones; seguros; mercado de valores | Tier B |
| P1-012 | BCH; CNBS; SAR; zonas libres y regímenes especiales; ZEDE (régimen histórico/derogatorio); comercio exterior; tratados comerciales e internacionales vigentes relevantes | Tier B |
| P1-013 | **Jurisprudencia piloto** (paquete `JUDGMENT`, separado de la ley): Sala Constitucional (amparo, inconstitucionalidad, hábeas corpus/exhibición personal), Sala Civil, Penal, Laboral/Contencioso, casación | solo fuentes judiciales oficiales; sin mezclar con legislación |

## P2

| ID | Pedido |
|---|---|
| P2-001 | Ley Especial de Adopciones (102-2018): Gaceta de publicación oficial |
| P2-002 | Resto del Tier C que no figure arriba |

## Orden sugerido de entrega (para destrabar skills)

1. P0-001/001b/002 (llenan los 2 vacíos totales) · 2. P0-005, P0-006, P0-011 (más skills) · 3. P0-003, P0-004 (desactualizados) · 4. P0-007…P0-010 · 5. P0-012…P0-017 · 6. P1.

## Cómo marcar una entrega (formato recomendado por paquete)

`package_id` · `instrument_id` (de esta lista) · `act_type` (ORIGINAL | AMENDMENT | ERRATA | DEROGATION | CONSOLIDATED) · `decree` · `gaceta_number` · `gaceta_date` · `effective_date` · `official_url` · `pdf_sha256` · `text_sha256` · `source_tier` · `text` · `notes`. Todo campo desconocido = `UNKNOWN`.

---

## Entregas recibidas

| Tramo | Fecha | Paquetes | Resultado | Registro |
|---|---|---|---|---|
| HN-001 · Tramo A | 2026-10-24 | A01–A04 (P0-001, P0-001b, P0-002) | 4 × `NEEDS_SOURCE_BYTES` (solo metadatos; faltan URL exacta, bytes y texto). P0-001 y P0-002 siguen **abiertos**. | `docs/corpus/supply/HN-001-TRANCHE-A.md` |

Un paquete que llega **sin texto ni hash** no se rechaza ni se inventa: se registra como manifiesto (`tools/corpus/process-manifests.ts`) y queda `NEEDS_SOURCE_BYTES` hasta que se aporten URL exacta, bytes y texto.
