# Adjudicación editorial — Código del Notariado (Honduras)

**Autor:** Fredy Omar Pinel Flores (Repository Admin / Control Plane)  
**Fecha:** 19 de septiembre de 2026  
**Instrumento:** Código del Notariado de Honduras (Decreto 353-2005) y anexo Decreto 77-2006  
**PR de implementación:** #48 (`cursor/ingesta-notariado-editorial-77-2006-d401`)  
**Fuente formal:** resolución del Control Plane, 2026-09-19, **corregida** (matriz de emergencia: 77-2006 reformó únicamente 11 y 27).

`INGESTED ≠ VERIFIED ≠ VIGENTE`. Esta adjudicación es de **parseo y canonicidad de ocurrencia**, no de vigencia legal. El pipeline no declara `es_norma_vigente`.

## a) Autoridad

Fredy Omar Pinel Flores, Repository Admin y Control Plane del repositorio `Lawyer1421/maya-lex-pinel-deploy`.

## b) Fecha

19 de septiembre de 2026.

## c) Prevalencia de última ocurrencia — reformas sustantivas del Código

El Decreto 77-2006 reformó **únicamente** los arts. **11 y 27** del Código del Notariado.

- Fuente canónica de **11 y 27** = **última ocurrencia** (texto de reforma en el anexo CEDIJ, marcador `DECRETO No. 77-2006`).
- No se trunca el anexo: truncar eliminaría esas dos reformas.

**No** se aplica última ocurrencia a los arts. 2 y 3.

## d) Prevalencia de primera ocurrencia — cláusulas del decreto reformatorio

Arts. **1, 2, 3 y 4** que reaparecen en el anexo del Decreto 77-2006 son técnica legislativa del **decreto reformatorio**, no numeración sustantiva del Código:

| Artículo del anexo 77-2006 | Naturaleza |
|---|---|
| 1 | Orden de reforma |
| 2 | Derogación del Instituto Hondureño de Derecho Notarial (Capítulo VI) |
| 3 | Reparto de timbres / certificados CAH |
| 4 | Vigencia / *vacatio legis* |

Fuente canónica del Código para **1, 2, 3 y 4** = **primera ocurrencia** (cuerpo sustantivo del Decreto 353-2005). Las ocurrencias del anexo se descartan.

### Verificación de contenido exigida

- Art. **2** canónico = concepto de Notariado (“El Notariado es la institución del Estado…”). **No** la derogación del Instituto.
- Art. **3** canónico = función notarial / Notario. **No** el reparto de timbres del CAH.

`prepararLoteNotariado` falla cerrado si el cuerpo elegido de 2 o 3 coincide con las cláusulas de trámite.

## e) Normalización tipográfica de OCR aprobada

Solo el **número** de artículo. El cuerpo legal no se reescribe.

| Captura OCR | Número canónico |
|---|---|
| `2O` | `20` |
| `3O` | `30` |
| `5O` | `50` |
| `6O` | `60` |
| `9O` | `90` |

## Gaps documentales (no bloquean el lote)

Arts. **17, 21 y 52** se registran en el manifest del corpus como:

`GAPS_DOCUMENTALES_PENDIENTES_DE_FE_DE_ERRATAS_O_COPIA_GACETA`

## Barreras vigentes

`NETWORK_WRITES = 0` · `SQL_APPLY = NO` · `CORPUS_WRITE = NO` · `--execute` fail-hard · `FLAG_ACTIVATION = NO`

## Lote formal (Carril B)

El lote estructurado generado con esta matriz vive en
`docs/governance/exequatur-ingesta-notariado-lote-formal.{json,md}`.
No es apply a corpus. `INGESTED ≠ VERIFIED ≠ VIGENTE`.
