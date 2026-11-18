# Pliego de adjudicación del CLO · `HN:CODIGO_NINEZ` (Código de la Niñez y de la Adolescencia, D. 73-96)

**Estado:** D3 **FIRMADA** (2026-11-18). D1, D2 y D4–D8 **pendientes de firma**. · **Bloqueo vigente:** `CODIGO_NINEZ: INSTRUMENTO_SIN_PLIEGO_CLO` en `lib/legal-retrieval/clo-guards.ts` (PR #155). · **Bases:** staging y producción **sin ninguna fila** de este instrumento.

> Propuestas de Claude, no revisión jurídica. Solo `propietario_despacho` o `abogado_revisor_senior` deciden. Nada se carga hasta que D1–D8 estén firmadas, y en el orden de D7.

## 1. Identidad (para D2)

| Campo | Valor | Respaldo |
|---|---|---|
| Instrumento | Código de la Niñez y de la Adolescencia · Decreto No. 73-96 | Texto de 1996 (`15e3875d…`, orientativo) y A03 |
| Aprobación · sanción | Congreso Nacional, 30-may-1996 · Ejecútese, 17-jun-1996 | Firmas en el texto de 1996 (orientativo) |
| Publicación | La Gaceta No. 28,053, 5-sep-1996 | **Dato del manifiesto del proveedor y del Titular; no cotejado** (el `.doc` no cita la Gaceta) |
| Reformas incorporadas | D. 35-2013 (La Gaceta 33,222): 123 reformas, 14 adiciones, 24 derogaciones | v8, D3 firmada |
| Reforma posterior conocida | D. 130-2017 (art. 632, num. 12): derogación del art. 21 | **C07 sin cotejar** |
| Otras actualizaciones | 14 denominaciones de Secretarías de Estado (D. L. 218-96 y reformas de la LGAP, según el dictamen del CLO); 10 + 20 sustituciones JNBS→IHNFA (art. 280-A) | Dictamen del CLO del 2026-11-18 |

## 2. Fuentes del texto (para D1)

| Parte de la v2 | Artículos | Fuente | Procedencia |
|---|---:|---|---|
| Reformados y adicionados por el D. 35-2013 | 137 | v8 de La Gaceta 33,222 (`66919246…`) | **Acreditada:** TSC, D1 del pliego del D. 35-2013 |
| Derogados por el art. 11 del D. 35-2013 | 24 | Marca `[DEROGADO …]` | **Acreditada** (v8) |
| No tocados por el D. 35-2013 | 141 | Consolidado A03 (`bd115673…`), dictaminado por el CLO frente al texto de 1996 | **NO acreditada:** A03 es una copia de Drive (`SOURCE_HOLD`); el texto de 1996 es orientativo (`DISCOVERY_ONLY`) |

## 3. Texto que se carga (D3) — FIRMADA

| Campo | Valor |
|---|---|
| Texto | [`HN_CODIGO_NINEZ_canonico_v2.txt`](HN_CODIGO_NINEZ_canonico_v2.txt) · 302 artículos · 186.884 caracteres |
| SHA-256 (bytes LF) | **`a7bbbfc9c4ca4f0aa4bc6294065ab1886a4c67181b7c74d76b9187fef3b428c5`** |
| Manifiesto | [`HN_CODIGO_NINEZ_canonico_v2_manifiesto.json`](HN_CODIGO_NINEZ_canonico_v2_manifiesto.json) (`TEXTO_DEFINITIVO_FIRMA_D3`, con fuente, estado, hash y correcciones por artículo) |
| Dictámenes | `../barrido-v7/HOJA_DECISION_A03_DIFIERE_V8.md` (19 artículos y art. 134) · `../canonico-v1/AUDITORIA_NO_TOCADOS_V1.md` (141 artículos) |
| Firmante | **Abg. y Not. Fredy Omar Pinel Flores** · **propietario_despacho** (CLO / Director Maya Lex) · **2026-11-18** |
| Cambios v1 → v2 | Exactamente 19 artículos: 5 correcciones «mantener 1996» (arts. 35, 125 b, 156, 159, 275), la fuga de nota del art. 284 y 15 espacios insertados en 13 artículos. No se cambió ninguna letra |
| Pendientes del texto | C07 (art. 21) · art. 125 c) «diez y ocho» frente a «dieciocho» (no dictaminado) · preámbulo y rótulos de división (no incluidos) |

## 4. Decisiones del CLO

| # | Decisión | Opciones | Propuesta de Claude |
|---|---|---|---|
| **D1** | Procedencia | ☐ (a) Acreditada para todo · ☐ (b) Acreditada solo para los 161 de la v8 (137 + 24); los 141 de A03 como solo contexto hasta descargar el consolidado del CEDIJ (opción B) o La Gaceta 28,053 (opción A) · ☐ (c) No acreditada | **(b).** Hoy los 141 no tienen ninguna fuente oficial acreditada |
| **D2** | Identidad | ☐ Confirmada · ☐ Confirmada con reserva (Gaceta 28,053 sin cotejar) · ☐ Rechazada | **Confirmada con reserva** |
| D3 | Texto | ☑ **v2 `a7bbbfc9…`** (firmada el 2026-11-18) | — |
| **D4** | Vigencia | ☐ `TRUE_PRESUNTA` desde la publicación, con las reformas del D. 35-2013 · ☐ `NULL` (solo contexto) | **`TRUE_PRESUNTA`** para los artículos vigentes; los derogados, `es_norma_vigente = false`. **Límite:** no se buscaron reformas posteriores a 2013, salvo el D. 130-2017 (art. 21) |
| **D5** | Rol | Ver §5 | Ver §5 |
| **D6** | Tipo de fuente | ☐ `codigo` · ☐ Otro | **`codigo`** |
| **D7** | Retirar `INSTRUMENTO_SIN_PLIEGO_CLO` | ☐ Sí, en el orden de D7 y solo en staging · ☐ No todavía | Ingesta en staging → visibilidad en staging → PR de `clo-guards.ts`, como en el D. 35-2013 |
| **D8** | Promoción | ☐ V3→V4 solo en staging · ☐ V4→V5 a producción (aparte) | V3→V4 en staging, una vez cargado |

## 5. Reglas de ingesta propuestas (para D5)

| Grupo | Artículos | Se carga | `es_norma_vigente` | Rol | Motivo |
|---|---:|---|---|---|---|
| v8 reformados y adicionados | 136 | Sí | TRUE (`TRUE_PRESUNTA`) | **PRIMARY elegible** (rol vacío) | Texto de La Gaceta 33,222 con D3 |
| Art. 21 | 1 | Sí | NULL | **CONTEXT** (constancia C07) | Derogación posterior por el D. 130-2017 sin cotejar |
| A03 dictaminados | 141 | Sí | TRUE (`TRUE_PRESUNTA`) | Con D1 (b): **CONTEXT** hasta acreditar la fuente · con D1 (a): PRIMARY elegible | La procedencia del texto no está acreditada |
| Derogados (art. 11 del D. 35-2013) | 24 | ☐ Sí, con la marca `[DEROGADO …]` · ☐ No | FALSE | CONTEXT | Si se cargan, responden «¿está vigente el art. 134?» sin poder fundar nada. El guard excluye las filas FALSE |
| Notas editoriales de A03 | 153 | **No** | — | — | No son texto normativo |

## 6. Bloqueos técnicos de la ingesta, a resolver antes de D7

1. **Un solo PDF por lote.** `scripts/ingesta-lote-staging.ts` liga cada transcripción a **un** PDF y exige que su candidato esté en `CLO_PENDING`. La v2 mezcla dos fuentes: v8 (PDF del TSC, candidato del D. 35-2013) y A03 (PDF de Drive, `SOURCE_HOLD`, que no está en este equipo). Opciones:
   - ☐ Recibir el consolidado del CEDIJ con `receive-pdf.ts --url` (dominio verificado). Si es `bd115673…`, el candidato A03 pasa a `CLO_PENDING` y la v2 se liga a él.
   - ☐ Cargar en dos lotes: 161 artículos ligados al PDF del TSC y 141 ligados a A03 cuando se acredite. Hace falta adaptar la ingesta.
   - ☐ Otra decisión del CLO.
2. **Segmentación: comprobada.** La v2 usa encabezados «Artículo N.», el formato de A03. `segmentarArticulos` produce las **302** filas con los mismos `numero` y **los 302 `sha256`** del manifiesto. Con «N.-», el segmentador dejaba «- » al inicio de cada cuerpo; por eso se usa «N.».
3. **Preámbulo y rótulos.** La v2 no los incluye. Si el CLO los quiere en el corpus, se transcriben y cotejan aparte.

## Firma (D1, D2, D4–D8)

Decide el CLO: ________________________ · Rol: ☐ propietario_despacho ☐ abogado_revisor_senior · Fecha: __________
