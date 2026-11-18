# A04 — Hoja de decisión del CLO: corrección de la v7 (arts. 152 y 217) → v8

**Instrumento:** `HN:DECRETO_35_2013` · **Texto vigente con D3:** v7 `460e493db5e97a9dba53345010281dc338642edee525b6cfbc9fee2f3ddab023` (firma D3 del 2026-11-18, cargado en `mayalexhn-staging`, lote `A04_D35_2013_01`, fila del art. 1 del decreto) · **Fecha:** 2026-11-18 · **Estado:** **PENDIENTE de la firma del CLO**.

> Lecturas visuales de Claude sobre los dos ejemplares de La Gaceta 33,222. **No son revisión jurídica y no cambian nada por sí mismas.** La v7, staging y producción no se tocan. Si el CLO aprueba, se genera una **v8** con su propio script y manifiesto (como la v7), y después hace falta una **nueva firma D3** sobre la v8 y un SQL de actualización de staging aparte.

**Ejemplares cotejados:**
- **TSC** · SHA-256 `fbd87f33…` · procedencia acreditada (D1) · fuente de la v7.
- **CEDIJ** · SHA-256 `b5db8bf7…` · procedencia NO ACREDITADA (`06_SEGUNDO_EJEMPLAR_REGISTRO.md`).

**Recortes** en `paquete-revision/recortes/v8/`:

| Archivo | SHA-256 |
|---|---|
| `p07_izq_art152_los_las_TSC.png` | `38f2613d…` |
| `p07_izq_art152_los_las_CEDIJ.png` | `81a254af…` |
| `p16_der_art217_inciso_b_TSC.png` | `64f4d37c…` |
| `p16_der_art217_inciso_b_CEDIJ.png` | `06003ea8…` |
| `p16_der_art217_dictado_TSC.png` | `adecc33f…` |
| `p16_der_art217_dictado_CEDIJ.png` | `57cab9fd…` |
| `p17_izq_inicio_TSC.jpg` | `bd8b4121…` |
| `p17_izq_inicio_CEDIJ.jpg` | `2e492974…` |

Cada punto: ☐ Aprobar · ☐ Rechazar · ☐ Dejar como está en la v7.

## V8-1 · Art. 152 (reformado por el art. 1) · pág. 7, columna izquierda, 3.ª línea

| v7 | TSC | CEDIJ | Propuesta |
|---|---|---|---|
| «…lo argumentado por **Íos(las)** peticionarios» | «…por **los(las)**». Hay una mancha diminuta sobre la «l» | «…por **los(las)**», limpio | **«los(las)»** |

**Motivo:** error de OCR de la v7. La «Í» es la mancha del escaneo TSC sobre la «l»; los dos ejemplares imprimen «los(las)».
**Corrección:** `«por Íos(las)\npeticionarios»` → `«por los(las)\npeticionarios»` (línea 506 de la v7).

Decisión: ☐ Aprobar · ☐ Rechazar · ☐ Dejar como está

## V8-2 · Art. 217, inciso b) · pág. 16, columna derecha

| v7 | TSC | CEDIJ | Propuesta |
|---|---|---|---|
| «…salvo que afecte seriamente un interés público; **x**» | «…interés público;», con un trazo diagonal tenue del escaneo a la derecha | «…interés público;», sin ninguna marca | **Quitar la «x»** |

**Motivo:** error de OCR de la v7. No hay ninguna «x» impresa.
**Corrección:** `«interés público; x\nc)»` → `«interés público;\nc)»` (línea 1433 de la v7).

Decisión: ☐ Aprobar · ☐ Rechazar · ☐ Dejar como está

## V8-3 · Art. 217, cierre del penúltimo párrafo · última línea de la pág. 16, columna derecha

| v7 | TSC | CEDIJ | Propuesta |
|---|---|---|---|
| «…conforme las reglas generales que al efecto haya **El Ministerio Público velará**…» | «…que al efecto haya / **dictado el Ministerio Público.**» | Igual | **Restituir «dictado el Ministerio Público.»** |

**Motivo:** omisión de la v7. La línea está impresa en los dos ejemplares; la capa de texto del TSC la perdió al pie de la página, y el cotejo D3 no la detectó.
**Corrección:** `«que al efecto haya\n\nEl Ministerio Público velará»` → `«que al efecto haya\ndictado el Ministerio Público.\n\nEl Ministerio Público velará»` (línea 1464 de la v7).

Decisión: ☐ Aprobar · ☐ Rechazar · ☐ Dejar como está

## V8-4 · Art. 217, párrafo final: los dos ejemplares DIFIEREN en la pág. 17

**Qué dice cada ejemplar:**
- **TSC:** la pág. 17 empieza con el cierre del art. 217: «El Ministerio Público velará que el daño causado sea razonablemente reparado. / Para la tramitación del Criterio de Oportunidad, se estará a lo dispuesto en el Código Procesal Penal."». Después viene el «"ARTÍCULO 218.-».
- **CEDIJ:** la pág. 17 empieza **directamente** con el «"ARTICULO 218.-», sin ese párrafo y con otra tipografía («ARTICULO», «Conciliacion», sin tildes). Parece otra composición de la página.
- **A03** (consolidado) **tampoco trae el párrafo**, igual que el CEDIJ.

**La v7 conserva el párrafo**, porque viene del TSC.

**Propuesta:** **mantener el párrafo**, como en la v7. El ejemplar TSC tiene la procedencia acreditada en D1 y el CEDIJ no. Además, queda abierta como constancia la diferencia de composición de la pág. 17 entre ejemplares: hay que cotejarla con un tercer ejemplar (por ejemplo, de la ENAG) o con una fe de erratas.

Decisión: ☐ Mantener el párrafo (TSC) · ☐ Quitar el párrafo (CEDIJ) · ☐ Otro: ____________________

## Resultado previsto si se aprueban V8-1 a V8-3 (con V8-4 «mantener»)

| Campo | Valor |
|---|---|
| Base | v7 `460e493d…` (bytes LF) |
| Correcciones | `transcripcion_candidata/correcciones_cotejo_v8_pendiente.json` (3, aplicadas con `aplicarCorrecciones`; cada `buscar` aparece una sola vez) |
| **v8 prevista** | **`6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb`** · 176.420 caracteres (+29) · 0 lagunas `[ilegible]` |
| Efecto en staging | Solo cambia el texto del **art. 1 del decreto** (los arts. 152 y 217 del Código están transcritos dentro de él). Sigue en `CONTEXT`. Hará falta un SQL v7→v8 aparte |

**Después de la firma:**
1. Script `aplicar_correcciones_v8.ts` y manifiesto, igual que la v7.
2. Nueva firma D3 sobre la v8.
3. SQL de staging v7→v8 con precondición, postcondición y reversión, aplicado solo con orden expresa.
4. Actualizar en la hoja de A03 (`../2026-11-04-hn-001-tranche-a-drive/barrido-v7/`) la referencia de los arts. 152 y 217.

## Firma

Decide el CLO: ________________________ · Rol: ☐ propietario_despacho ☐ abogado_revisor_senior · Fecha: __________
