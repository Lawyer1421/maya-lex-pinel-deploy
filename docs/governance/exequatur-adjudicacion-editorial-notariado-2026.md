# Adjudicación editorial — Código del Notariado (Honduras)

**Autor:** Fredy Omar Pinel Flores (Repository Admin / Control Plane)  
**Fecha:** 19 de septiembre de 2026  
**Instrumento:** Código del Notariado de Honduras (Decreto 353-2005) y anexo Decreto 77-2006  
**PR de implementación:** #48 (`cursor/ingesta-notariado-editorial-77-2006-d401`)  
**Fuente formal:** esta resolución del Control Plane, 2026-09-19

`INGESTED ≠ VERIFIED ≠ VIGENTE`. Esta adjudicación es de **parseo y canonicidad de ocurrencia**, no de vigencia legal. El pipeline no declara `es_norma_vigente`.

## a) Autoridad

Fredy Omar Pinel Flores, Repository Admin y Control Plane del repositorio `Lawyer1421/maya-lex-pinel-deploy`.

## b) Fecha

19 de septiembre de 2026.

## c) Prevalencia de última ocurrencia — reformas sustantivas

Arts. **2, 3, 11 y 27**, reexpedidos por el **Decreto 77-2006** (anexo CEDIJ, marcador `DECRETO No. 77-2006`):

- Fuente canónica = **última ocurrencia** en el PDF (texto del decreto de reforma).
- La ocurrencia de 2005 del mismo número se descarta como texto pre-reforma.
- No se trunca el anexo: truncar eliminaría estas reformas.

## d) Prevalencia de primera ocurrencia — trámite del decreto reformatorio

Arts. **1 y 4** que reaparecen en el anexo del Decreto 77-2006:

- Determinación jurídica: son técnica legislativa del decreto de reforma (orden de reforma y *vacatio legis* / vigencia del decreto reformatorio), **no** la numeración sustantiva del Código del Notariado.
- Fuente canónica del Código = **primera ocurrencia** (cuerpo sustantivo del Decreto 353-2005).
- Las ocurrencias del anexo se descartan como metadatos de trámite legislativo.

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

`prepararLoteNotariado` puede pasar con los artículos sustantivos validados sin esos tres números. No son adjudicación de texto; son huecos de copia/encabezado pendientes de fe de erratas o copia de Gaceta.

## Barreras vigentes

`NETWORK_WRITES = 0` · `SQL_APPLY = NO` · `CORPUS_WRITE = NO` · `--execute` fail-hard · `FLAG_ACTIVATION = NO`
