# CORPUS SUPPLY HN-001 · TRAMO A — registro de recepción

**Recibido:** 2026-10-24 · **Proveedor:** ChatGPT (investigación externa) · **Procesado por:** receptor #102 + ruta de manifiestos (este PR) · **Escrituras en corpus/producción:** 0

> Resultado máximo automático: `CLO_PENDING`. Resultado real de este tramo: **4 × `NEEDS_SOURCE_BYTES`**. Nada es VERIFIED/V4/V5, nada es autoritativo y la vigencia de cada acto es `UNKNOWN`.

## 1. Por qué `NEEDS_SOURCE_BYTES` y no `CLO_PENDING`

Los cuatro paquetes llegaron como **metadatos**: sin URL exacta, sin `extracted_text`, sin `bytes_sha256`/`text_sha256` y sin `retrieved_at`. El receptor estricto (`process-batch`) los rechaza por esquema (`ESQUEMA_INVALIDO`) — se comprobó y queda cubierto por una prueba. Siguiendo la instrucción de no rechazar solo porque los hash sean `UNKNOWN` ni inventarlos, se agregó una **ruta de manifiestos** (`tools/corpus/process-manifests.ts`) cuyo techo es `NEEDS_SOURCE_BYTES`: conserva lo declarado, lo marca «sin acreditar», lista qué falta y emite la hoja CLO. **No crea candidato, no hace QA y no relaja el receptor estricto.** Sin texto no hay segmentación, ni artículos, ni QA, ni `CLO_PENDING`.

## 2. Resultado por paquete

| Paquete | Instrumento / acto | Estado | Lo declarado (sin acreditar) | Pendiente |
|---|---|---|---|---|
| HN-001-A01 | P0-001 · Código de Comercio · ORIGINAL | `NEEDS_SOURCE_BYTES` | Decreto 73-50; fecha de Gaceta **candidata** 1950-02-17; Gaceta N.º UNKNOWN; vigencia UNKNOWN | **Discrepancia sin resolver** (1950-02-17 vs 1950-05-01): decide el CLO con la edición original; URL/bytes/texto |
| HN-001-A02 | P0-001b · Reforma al Código de Comercio · AMENDMENT | `NEEDS_SOURCE_BYTES` | Decreto 284-2013; Gaceta 33,445 de 2014-06-05; reforma 12 artículos del D.73-50 (14, 15, 18, 157, 169, 189, 193, 210, 222, 224, 226, 228) según su art. 13 | texto del decreto para contrastar el art. 13 y la vigencia; `text_available` no fue declarado → registrado `false`; **no se infieren más reformas** |
| HN-001-A03 | P0-002 · Código de la Niñez y la Adolescencia · ORIGINAL | `NEEDS_SOURCE_BYTES` | Decreto 73-96 (30-may-1996); Gaceta 28,053 de 1996-09-05 | URL/bytes/texto; vigencia a leer del texto |
| HN-001-A04 | P0-002 · Reforma integral del Código de la Niñez · AMENDMENT | `NEEDS_SOURCE_BYTES` | Decreto 35-2013 (27-feb-2013); Gaceta 33,222 de 2013-09-06; reforma integral (no acto originario) de D.73-96; el material posterior lo describe como afectando también Familia, Penal y Civil | URL/bytes/texto; qué artículos de otros códigos afecta |

Estado en el registro de fuentes: **CEDIJ** (`legislacion.poderjudicial.gob.hn`) `VERIFIED`, tier 2; **TSC** (`www.tsc.gob.hn`) `VERIFIED`, tier 4; **Congreso Nacional** `PENDING_VERIFICATION` (sin dominio); **La Gaceta** `PENDING_VERIFICATION` (sin dominio); **SEN Honduras** y **Portal Único IAIP**: no están en el registro (solo descubrimiento). Hojas CLO: `docs/corpus/staging/hn-001-tranche-a/worksheets/HN-001-A0{1..4}.md`.

## 3. Qué se necesita exactamente para completar cada paquete

Por cada paquete, un `OfficialSourcePackage` (JSON) con: **`source_url`** (https, la URL del documento concreto, no la portada del sitio), **`source_domain`**, **`retrieved_at`**, **`retrieval_method`**, **`retriever`**, **`bytes_sha256`** (del PDF original), **`extracted_text`** íntegro y **`text_sha256`** (UTF-8 exacto). Los hashes se calculan con los comandos de `OFFICIAL_SOURCE_PACKAGE_CONTRACT.md`; nunca se estiman.

| Paquete | Documento concreto a localizar |
|---|---|
| A01 | PDF/página del documento del Congreso Nacional que identifica «Código de Comercio, Norma 73-50» (indicar la URL exacta) y la página de SEN que cita La Gaceta del 17-02-1950; idealmente la **edición original de La Gaceta** de 1950 (para resolver la fecha y obtener el N.º de Gaceta y la fecha de vigencia) |
| A02 | El **PDF de La Gaceta N.º 33,445** (copia TSC) con el texto completo del Decreto 284-2013 (necesario para leer el art. 13 y la fecha de entrada en vigor) |
| A03 | El texto del Decreto 73-96 en CEDIJ o en la compilación del TSC (URL exacta del documento); idealmente La Gaceta N.º 28,053 |
| A04 | **La Gaceta N.º 33,222** o su reproducción oficial del Decreto 35-2013 (CEDIJ / compilación oficial del Portal Único), con la URL exacta |

## 4. Observaciones jurídicas para el CLO (no se resuelven aquí)

1. **Fecha del Código de Comercio:** 17-feb-1950 (SEN) frente a 1-may-1950 (fuente externa). Se conservan ambas; ninguna está acreditada con la edición original.
2. **Alcance de la reforma D.35-2013:** el proveedor indica efectos sobre Familia, Penal y Civil. Esto **amplía** P0-005, P0-006 y P0-010: habrá que identificar, con el texto, qué artículos de esos códigos modifica. No se infiere ninguno.
3. **Números/fechas de Gaceta** de A02–A04: declarados por el proveedor; sin contrastar con la edición original.
4. **Cadena de la Niñez:** A03 (original) → A04 (reforma integral) → reformas posteriores a 2013 **aún sin buscar**.

## 5. Estado de la cola (no se cierra nada)

| Cola | Estado tras este tramo |
|---|---|
| **P0-001** Código de Comercio | **Abierto.** Falta el texto/bytes del original y la **cadena completa de reformas** (solo hay 1 reforma declarada: D.284-2013, 12 artículos) |
| P0-001b Reformas del Código de Comercio | Abierto: falta el texto del D.284-2013 y la búsqueda de otras reformas |
| **P0-002** Código de la Niñez | **Abierto.** Falta texto/bytes de A03 y A04 y **buscar reformas posteriores a D.35-2013 hasta 2026** |

---

## English summary (American English)

All four packages arrived as **metadata only**: no exact URL, no text, no hashes. The strict receiver (#102) rejects them on schema, which a test now locks in. Instead of rejecting them or making up hashes, I added a **manifest path** whose ceiling is `NEEDS_SOURCE_BYTES`: it keeps what was claimed, marks it unproven, lists what is missing, and produces the CLO worksheet. It creates no candidate, runs no QA, and does not loosen the strict receiver. **Result: 4 × `NEEDS_SOURCE_BYTES`; nothing verified, nothing authoritative; validity of every act is UNKNOWN.** The Commerce Code date conflict (Feb 17 vs May 1, 1950) is preserved, not resolved. Decree 35-2013 is kept as an integral **amendment** of Decree 73-96, never as the original act; its claimed effects on the Family, Penal and Civil Codes widen P0-005, P0-006 and P0-010. To finish each package we need the exact document URL, the original file's SHA-256, and the full extracted text. P0-001 and P0-002 stay open: we still need the full Commerce Code reform chain and any amendments after Decree 35-2013 through 2026.

**English tip:** *Metadata* is information *about* a document (who, when, which number); the *source bytes* are the document itself. A claim without the bytes is a lead, not evidence.
