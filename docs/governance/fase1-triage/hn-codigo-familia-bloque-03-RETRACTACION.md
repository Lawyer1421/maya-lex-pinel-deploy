# Fase 1 — Bloque 3/N: NO es un bloque normal — retractación descubierta

**No publico un "bloque 3 = 50 dato-faltante, resuelto" porque sería repetir un
error que el propio pipeline de `feature/mayalex-official-corpus-p0` ya cometió y
ya retractó.** Esto es más importante que seguir el ritmo mecánico de bloques.

## Qué encontré

Al preparar el bloque 3 (líneas 101–150, artículos 124–173, todos
`AUSENTE_EN_VERSION_LOCAL_CAUSA_NO_CONFIRMADA`), revisé el resto del archivo (958
líneas) y descubrí que **no es una lista plana** — líneas 357–958 son una segunda
pasada de investigación, posterior en el tiempo (mismo día, horas después), que ya
llegó — de forma independiente — a la misma conclusión que yo: que la extracción
local del Código de Familia solo cubre artículos 3–123. Esa conclusión (línea 693,
`HALLAZGO_ALCANCE_DOCUMENTO_SUPERSEDE_SIN_RASTRO`, aplicada a 236 números) fue
**retractada más adelante en el mismo archivo** (línea 940,
`RETRACTACION_HALLAZGO_ALCANCE_DOCUMENTO`, prioridad ALTA, "corrige 236 hallazgos
previos marcados incorrectamente").

## La retractación, resumida

- El documento PDF local **sí es el Código completo** (338 artículos, 72 páginas,
  cláusula de vigencia y firma de promulgación confirmadas por lectura directa del
  texto crudo) — **no** es una compilación parcial de adopciones como se asumió.
- El límite de "123 artículos confirmados" es un **artefacto de un defecto
  confirmado del extractor**, no el límite real del documento.
- **Defecto confirmado** (`HALLAZGO_DEFECTO_EXTRACTOR_VENTANA_NOTA`): en
  `lib/ingesta-oficial/extraccion-ndestructiva.ts`, la función que separa artículo
  de nota al pie (`intentarSepararNotaAlPie`) asume numeración de notas
  estrictamente creciente dentro de una ventana fija (`ventanaNota=10`). A partir
  del Capítulo de Adopción (~Art. 119-B en adelante) la densidad de notas al pie
  supera esa ventana, el contador se desincroniza, y **todo lo posterior cae en
  cuarentena como ambiguo en cascada** — no es que el contenido esté ausente del
  documento, es que el extractor dejó de poder separarlo.
- **No se aplicó ningún fix todavía** — está documentado como tarea pendiente,
  prioridad MEDIA-ALTA, con advertencia explícita de probar sin regresión antes de
  tocar ese archivo compartido (usado por múltiples normas).

## Lo que SÍ está confirmado por lectura directa (no inferencia)

Un hallazgo posterior (`HALLAZGO_DEROGACION_EXPLICITA_CONFIRMADA_POR_TEXTO_FUENTE`,
línea 941) leyó el texto crudo directamente y confirma, con cita textual literal
(no parafraseada) del PDF, que **24 artículos** citan su propia derogación en nota
al pie:

> "Artículo [N]. Derogado mediante Decreto 102-2018 del 25 de septiembre de 2018.
> Publicado en el Diario Oficial La Gaceta No.34,841 de fecha 10 de enero de 2019."

Artículos confirmados: **120, 120-A, 120-B, 120-C, 120-D, 121, 122, 123, 123-A,
123-B, 123-C, 123-D, 123-E, 123-F, 123-G, 123-H, 124, 125, 126, 127, 128, 129, 130,
132**.

**Corrección a mi propio bloque 2**: había clasificado **121** y **123-C** como
`DATO_FALTANTE` (ausente, sin explicación técnica confirmada). Con esta evidencia,
ambos deben reclasificarse a `DEROGADO_CONFIRMADO_POR_FUENTE` — no están ausentes,
están confirmados como derogados por texto literal del propio documento. Corregido
en `hn-codigo-familia-bloque-02-CORRECCION.jsonl` (ver abajo).

**Nota importante, también confirmada por lectura directa**: el **Artículo 131**
SÍ tiene contenido sustantivo vigente ("La adopción podrá ser simple o plena...")
— confirma que no todo lo posterior al 123 está derogado. El documento sigue
teniendo contenido real mezclado con los derogados.

## Verificación de seguridad extendida (producción, solo lectura)

Extendí el chequeo de vigencia a los artículos recién confirmados:

| Artículos | `es_norma_vigente` en producción |
|---|---|
| 121, 123-C, 124, 125, 126, 127, 128, 129, 130, 131, 132 | **false** en los 11 |

Consistente con el bloque 2: ninguno se está sirviendo como norma vigente citable
hoy. El mismo gap de seguridad ya reportado (búsqueda semántica sin filtro, sin
etiqueta de advertencia para este tipo de registro) aplica igual aquí — no se
repite el análisis completo, ver la entrada de seguridad del 2026-08-27 en
`DECISION_LOG.md`.

## Estado real del bloque 3 (artículos 124–173) — NO "resuelto"

| Rango | Estado |
|---|---|
| 124, 125, 126, 127, 128, 129, 130, 132 (8 de 50) | **Confirmado derogado** por lectura directa de fuente — evidencia fuerte, pendiente de verificación cruzada OSINT + aprobación de abogado humano antes de marcar en el catálogo oficial |
| 131 (1 de 50) | Confirmado con **contenido sustantivo vigente real** — pero el texto completo no está disponible en los hallazgos que revisé; requiere extracción directa o cotejo manual antes de poder usarse |
| 133–173 (41 de 50) | **Genuinamente sin resolver** — bloqueados por el mismo defecto de extractor, sin lectura directa confirmada todavía. No son "ausentes explicados", son "no confiables hasta que se corrija el extractor o se lean a mano contra el PDF" |

**No marco ninguno de los 50 como cerrado.** Recomiendo no seguir generando más
bloques mecánicos de `AUSENTE_EN_VERSION_LOCAL` (quedan más adelante en el rango
90–336 del archivo, y todos comparten esta misma incertidumbre estructural) hasta
que se decida: (a) corregir el defecto del extractor y re-extraer, o (b) leer a
mano contra el PDF los artículos 133–173 uno por uno, como ya se hizo para
120–132.

## Recomendación

No continúo con "bloque 4" en el mismo formato mecánico. Las partes de la cola que
sí tienen valor real de triage (las 89 `CLASIFICACION_AMBIGUA_REFORMA_VS_EXTRACCION`
de comparación textual) ya están cubiertas completas (bloques 1–2, líneas 1–89).
El resto del archivo (líneas 90–958) es mayormente: (a) el mismo problema de
extractor repetido cientos de veces para Código de Familia, ya diagnosticado aquí;
y (b) un grupo más pequeño y distinto — 30 hallazgos de la Ley de Organización y
Atribuciones de los Tribunales, con su propio patrón (decretos sin clasificar,
creación de instituciones, un caso de inconsistencia de fecha detectada) — ver
`decretos-tribunales-pendientes.md`.

---

*No se resolvió, no se mergeó, no se tocó `main`. Todo en la rama
`feature/facultades-completas-f1-triage-familia`.*
