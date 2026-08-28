# Fase 1 — Triage de HUMAN_LEGAL_REVIEW_QUEUE.jsonl — Bloque 1/N

**Fuente**: `corpus-data/estructurado/HUMAN_LEGAL_REVIEW_QUEUE.jsonl` en la rama
`feature/mayalex-official-corpus-p0` (worktree `C:\dev\mayalex-corpus`).

**Corrección al alcance**: el archivo real tiene **958 líneas**, no 602 (esa cifra
venía del mensaje de commit original y probablemente se refería a otra métrica del
mismo proceso, o el archivo creció después de ese commit). Los bloques de este triage
se numeran sobre las 958 líneas reales.

**Bloque 1**: líneas 1–50, todas del tipo `CLASIFICACION_AMBIGUA_REFORMA_VS_EXTRACCION`,
`normId=HN_CODIGO_FAMILIA`, prioridad `MEDIA`, artículos 5–72.

## Método de clasificación

Cada hallazgo compara el texto de un artículo en dos fuentes ya extraídas al corpus
(`hn-codigo-familia.jsonl` = versión base TSC, `hn-codigo-familia-local-reformas-adopciones.jsonl`
= versión local). Se aplicó una prueba automática en dos niveles:

- **Nivel 1**: normalizar acentos, mayúsculas, puntuación y espacios en blanco
  colapsados. Si el texto resultante es idéntico → **técnico, resuelto**.
- **Nivel 2** (solo si el Nivel 1 no resolvió): además, quitar ruido de paginación de
  PDF conocido (patrón `N of M`, ej. "-- 2 of 72 --") y colapsar todo el espacio en
  blanco (para detectar palabras pegadas por fallo de tokenización, ej. "serefiere").
  Si el resultado es idéntico → **técnico, resuelto**.
- Si el texto sigue siendo distinto después de ambos niveles → **jurídico, pendiente**.
  No se fuerza ninguna resolución más allá de esto — un hallazgo que "parece" ruido
  pero no se puede probar mecánicamente como tal se deja pendiente, nunca se asume.

## Resultado

| Veredicto | Cantidad |
|---|---|
| Técnico — resuelto | 27 |
| Jurídico — pendiente | 23 |
| No resuelto (dato faltante) | 0 |
| **Total** | **50** |

**Técnicos resueltos** (artículos): 5, 6, 14, 15, 21, 24, 26, 27, 28, 32, 33, 34, 35,
37, 38, 43, 46, 49, 50, 52, 56, 58, 61, 63, 65, 67, 72. En su mayoría, artefactos de
extracción de PDF (pie de página "-- N of 72 --", marca de agua del Centro Electrónico
de Documentación e Información Judicial) o palabras separadas incorrectamente por la
extracción — cero impacto en el contenido legal.

**Jurídicos pendientes** (artículos): 5, 11, 16, 18, 22, 23, 25, 29, 30, 31, 36, 39,
41, 42, 48, 51, 54, 55, 57, 59, 66, 68, 70.

**Prioridad alta dentro de este bloque — Art. 68 y 70**: no es ruido de extracción. La
versión base describe un régimen de bienes separados por defecto sin capitulaciones
matrimoniales; la versión local describe la sociedad de gananciales (bienes comunes)
como régimen por defecto. Son dos regímenes patrimoniales matrimoniales
sustantivamente distintos — requiere cotejo directo contra la fuente oficial vigente
(La Gaceta / Decreto correspondiente) por el equipo jurídico antes de decidir cuál
version es la correcta o si ambas conviven en supuestos distintos.

**Nota sobre el resto de la cola jurídica de este bloque**: varios de los pendientes
(ej. Art. 11, 25) muestran una nota de reforma ("Reformado mediante Decreto 35-2013…")
embebida dentro del texto del artículo en la versión local. Esto **podría** ser solo
contaminación de extracción (una nota al pie que se coló en el cuerpo del artículo) o
**podría** ser una señal real de que el artículo fue efectivamente reformado y la nota
se desalineó de su lugar correcto. Deliberadamente no se intentó forzar una
distinción automática entre estos dos casos — decidir cuál es cuál requiere criterio
jurídico, no una prueba de texto.

## Detalle completo

Ver `hn-codigo-familia-bloque-01.json` (los 50 registros, con artículo, veredicto,
prueba aplicada y — para los pendientes — un preview corto de ambas versiones de
texto). Es texto normativo público (Código de Familia), no contiene datos de
clientes.

---

*Próximo bloque: líneas 51–100 de HUMAN_LEGAL_REVIEW_QUEUE.jsonl, pendiente de
solicitud del fundador.*
