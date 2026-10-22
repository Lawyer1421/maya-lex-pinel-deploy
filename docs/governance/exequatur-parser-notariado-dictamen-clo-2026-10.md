# Parser del Código del Notariado: encabezados y curación (dictamen CLO, 21 y 22-oct-2026)

Fuente de las reglas: [dictamen CLO del issue #74](https://github.com/Lawyer1421/maya-lex-pinel-deploy/issues/74#issuecomment-6313691566) (punto 3) y correcciones CLO del 22-oct-2026 sobre el PR #75.
Código: `scripts/ingesta-notariado.ts`. Tests: `tests/ingesta-notariado.test.ts`.

Barreras que siguen vigentes: `--execute` bloqueado, `NETWORK_WRITES = 0`, sin SQL, sin escritura de corpus, sin declarar vigencia.

## 1. Reglas de encabezado

Un fragmento es un artículo sólo si su encabezado pasa una de estas dos comprobaciones:

1. **Parser genérico** (`tieneEncabezadoArticulo`, la misma función que filtra en producción): «Artículo N.», «Artículo N.-» o «Artículo N » seguido de mayúscula, número o comillas. Esta función **no cambia**.
2. **Encabezado notarial con guion** (`encabezadoNotarialConGuion`, sólo en el Notariado, opt-in vía `aceptarEncabezadoExtra`):
   - la palabra `ARTÍCULO`/`ARTICULO` en mayúsculas al inicio del candidato, en singular;
   - el número, un punto opcional y un guion, con o sin espacios: «ARTÍCULO 21 -», «ARTÍCULO 52. -»;
   - después del guion, una mayúscula o comillas.

Se rechazan siempre:
- **Rangos:** «ARTÍCULO 5 - 10», «ARTÍCULO 5 -10», «ARTÍCULO 5. - 10» (un número tras el guion) y el plural «ARTÍCULOS 5 al 10». Un rango no es el encabezado de un artículo; su texto queda dentro del cuerpo del artículo anterior.
- **Citas dentro de un cuerpo:** «artículo 21 - …» en minúsculas, o un guion seguido de minúscula.
- **«ARTÍCULO 17.Los»** (sin espacio tras el punto): no entra al patrón de candidato.

El texto **nunca se reescribe**: el contenido de cada artículo es el tramo original de la fuente, encabezado incluido.

## 2. Curación: HUECO y TEXTO_DIVERGENTE

Lista fija `CURACION_CODIGO_NOTARIADO`. Sólo aplica al **Código** (D.353-2005); el Reglamento (PCSJ-17-2012) no cambia.

| Art. | Motivo | Tratamiento |
|---|---|---|
| 11 | `TEXTO_DIVERGENTE` | No se carga. Sin PRIMARY. |
| 17 | `HUECO` | No se carga ni se inventa, aunque la fuente traiga un candidato. Sin PRIMARY. |
| 27 | `TEXTO_DIVERGENTE` | No se carga. Sin PRIMARY. |

- Los tres se quitan de los registros aunque aparezcan una sola vez en la fuente.
- Ya no se adjudica la «última ocurrencia 77-2006» a los arts. 11 y 27.
- `prepararLoteNotariado` falla en duro si un artículo en curación llegara a los registros.
- Cambiar esta lista exige una fuente oficial y un nuevo dictamen CLO.

## 3. Nota de fuente (CLO, 22-oct-2026)

- **Arts. 11 y 27:** traen el texto reformado por el **D.77-2006 (Gaceta 31,091)**. Hasta cotejarlo con esa Gaceta o con una fe de erratas oficial quedan en curación como `TEXTO_DIVERGENTE`.
- **Art. 17:** pendiente de una fuente primaria, la **Gaceta 30,904** (publicación del D.353-2005). Queda como `HUECO`.
- **Ninguno de los tres es PRIMARY.**

## 4. Dry-run contra la fuente real (22-oct-2026)

Local y sólo lectura: sin embeddings, sin `.sql`, sin escritura de corpus.

- Fuente: `drive-Codigo-del-Notariado.pdf` (Drive `1XxG0go0Ajoa4_jjmmroHXBtfJiq2w3ke`), 206,761 bytes.
- SHA-256 `efe971f876fa9b9bc23fad82fc3d669aab864f48dab6169a85f202c1dd2513c8`, idéntico al registrado en `exequatur-ingesta-notariado-dry-run-fuente-real.md`.

| | `main` @ `3f4e7a5` | PR #75 |
|---|---|---|
| Candidatos | 108 | 108 |
| Aceptados / rechazados | 98 / 10 | 100 / 8 |
| Artículos finales | 91 | 91 |
| Arts. 21 y 52 | rechazados por el encabezado (gaps) | aceptados, texto sin cambios |
| Arts. 11 y 27 | adjudicados a la última ocurrencia 77-2006 | en curación (`TEXTO_DIVERGENTE`), no se cargan |
| Art. 17 | gap | en curación (`HUECO`), no se carga |
| Gaps documentales | 17, 21, 52 | 17 |
| Divergentes sin adjudicar | 0 | 0 |
| Trámite 77-2006 (1ª ocurrencia) | 1, 2, 3, 4 | 1, 2, 3, 4 |
| OCR O→0 | 5 | 5 |
| Currículo faltante | ninguno | ninguno |

Con el PR, los artículos finales son del 1 al 94 salvo el 11, el 17 y el 27.

Los informes `exequatur-ingesta-notariado-{dry-run-fuente-real,lote-formal}.{json,md}` son de una corrida anterior y no se regeneran en este PR.
