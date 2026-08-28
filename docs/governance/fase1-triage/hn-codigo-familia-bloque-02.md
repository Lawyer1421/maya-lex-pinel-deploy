# Fase 1 — Triage de HUMAN_LEGAL_REVIEW_QUEUE.jsonl — Bloque 2/N

> **⚠️ CORRECCIÓN POSTERIOR (ver `hn-codigo-familia-bloque-03-RETRACTACION.md` y
> `hn-codigo-familia-bloque-02-CORRECCION.jsonl`)**: los artículos **121** y
> **123-C**, clasificados abajo como `DATO_FALTANTE`, fueron reclasificados a
> `DEROGADO_CONFIRMADO_POR_FUENTE` tras descubrir que el propio archivo de origen
> contiene una lectura directa del PDF que cita textualmente su derogación
> (Decreto 102-2018). No estaban ausentes — estaban en cuarentena por un defecto
> confirmado del extractor. El conteo original de este documento (11 dato-faltante)
> queda desactualizado; la cifra corregida es 9.

**Métrica congelada** (para no volver a mezclar líneas con artículos): el archivo
`corpus-data/estructurado/HUMAN_LEGAL_REVIEW_QUEUE.jsonl` tiene **958 líneas**,
donde **cada línea = 1 hallazgo**, no 1 artículo ni 1 línea de código. Bloque 2 =
líneas 51–100 de ese archivo.

**Bloque 2 no es homogéneo como el bloque 1**: contiene dos tipos de hallazgo
mezclados —

- `CLASIFICACION_AMBIGUA_REFORMA_VS_EXTRACCION` (39 hallazgos): mismo tipo que
  bloque 1, artículo presente en ambas fuentes con contenido distinto.
- `AUSENTE_EN_VERSION_LOCAL_CAUSA_NO_CONFIRMADA` (11 hallazgos): artículo presente
  en TSC (base), ausente en la versión local — no hay texto que comparar, es una
  pregunta de presencia/ausencia, no de contenido.

## Clasificador — Nivel 3 añadido, y dos bugs encontrados y corregidos en el camino

Enum de veredicto: `TECNICO_EXTRACCION | NOTA_REFORMA_EMBEBIDA | REFORMA_CANDIDATA |
DATO_FALTANTE`.

- **Nivel 1**: normalizar acentos/mayúsculas/espacios/puntuación.
- **Nivel 2**: quitar ruido de paginación PDF ("N of M"), marca de agua del CEDIJ, y
  palabras pegadas por fallo de tokenización.
- **Nivel 3** (nuevo): extraer del cuerpo las notas "N Artículo M. Reformado
  mediante Decreto X-YYYY[, fecha][. Publicado en...]" a un campo `notaReforma`
  separado, y comparar solo el cuerpo restante. Si el cuerpo queda idéntico →
  `NOTA_REFORMA_EMBEBIDA` (técnico: la nota es una señal real de reforma en algún
  artículo, pero no altera el contenido de este cuerpo). Si el cuerpo sigue
  distinto → `REFORMA_CANDIDATA` (jurídico).

**Bug 1 encontrado y corregido durante este bloque**: la primera versión del Nivel 2
dejaba un residuo (el número de página suelto, ej. "24", inmediatamente después del
marcador "-- N of M --" y antes de la marca CEDIJ) sin quitar, lo que impedía
resolver casos que eran puro ruido (ej. Art. 98, 103). Corregido con un lookahead
que solo quita ese número cuando está inmediatamente antes de la marca CEDIJ —
nunca en general.

**Bug 2 encontrado y corregido**: el primer intento de fix para el Bug 1 usaba un
`\d*` demasiado permisivo que además se comía el número de una enumeración legítima
del propio artículo (ej. el "3)" de una lista en el Art. 93, confundiéndolo con un
número de página). Corregido restringiendo la eliminación de dígitos sueltos
exclusivamente al lookahead inmediato a la marca CEDIJ.

**Auditoría de calidad**: 10 hallazgos técnicos auditados manualmente con texto
completo (5 tras el primer fix, 5 más tras el segundo) — 10/10 confirmados como
diferencias puramente de formato/paginación, cero contenido legal alterado.

## Resultado

| Veredicto | Cantidad |
|---|---|
| Técnico — extracción | 24 |
| Nota de reforma embebida | 0 |
| **Reforma candidata (jurídico, pendiente)** | **15** |
| Dato faltante (ausente en local) | 11 |
| **Total** | **50** |

**Técnico — extracción** (artículos): 75, 76, 78, 81, 82, 87, 88, 90, 91, 92, 93,
98, 99, 101, 102, 103, 104, 105, 106, 107, 108, 110, 111, 114.

**Dato faltante** (artículos): 1, 2, 85, 86, 112, 113, 115, 118, 120, 121, 123-C.
De estos, **7 (85, 86, 112, 113, 115, 118, 121) están corroborados por gaps ya
documentados en el propio manifest de extracción de la versión local**
(`hn-codigo-familia-local-reformas-adopciones.manifest.json`) — evidencia de límite
técnico de extracción, no de derogación. Los otros 4 (1, 2, 120, 123-C) no tienen
esa corroboración — quedan sin explicación técnica confirmada.

## Reforma candidata — prioridad ALTA

**Hallazgo principal de este bloque, más significativo que Art. 68/70**: 12 de los 15
candidatos son de prioridad ALTA — 11 muestran la versión local marcada literalmente
como **"Derogado"** mientras la base TSC trae el texto sustantivo completo (Arts.
119-B, 120-A, 120-B, 120-C, 120-D, 123, 123-D, 123-E, 123-F, 123-G, 123-H), y un
duodécimo (Art. 122) no está "Derogado" en sí pero su contenido local es
contaminación de una nota de reforma que cita directamente la derogación de los
Arts. 120 y 120-A.

Uno de estos hallazgos trae una **cita completa, específica y con fecha**, que no se
inventó — está en el propio texto extraído:

> "Artículo 120. Derogado mediante Decreto 102-2018 del 25 de septiembre de 2018.
> Publicado en el Diario Oficial La Gaceta No.34,841 de fecha 10 de enero de 2019."

Esto sugiere que un bloque completo de artículos de adopción (119-B en adelante)
fue derogado por el Decreto 102-2018, y que la versión TSC del corpus **no refleja
esa derogación** — el TSC, tal como advierte la gobernanza de este proceso, es un
snapshot, no el texto vigente. **No se resolvió ni se marcó como vigente** — esto
va íntegro a la cola de revisión jurídica, con prioridad ALTA porque cambia si un
conjunto entero de artículos está en vigor o no (más allá de "régimen, plazo,
competencia o sujeto" — es una pregunta de vigencia misma).

**Reforma candidata — resto (prioridad MEDIA, no ALTA)**: Art. 73, 117, 119-A (3 de
los 15). Confirmado contra el JSONL final, no de memoria. Estos muestran notas de
reforma embebidas que no lograron aislarse limpiamente del cuerpo (el cuerpo real
también difiere más allá de la nota) — no cambian un régimen/plazo/competencia/
sujeto de forma tan clara como el bloque de "Derogado", por eso quedan en MEDIA.

**Lista completa de los 15 candidatos**: 73, 117, 119-A, 119-B, 120-A, 120-B, 120-C,
120-D, 122, 123, 123-D, 123-E, 123-F, 123-G, 123-H — de los cuales 11 son ALTA
("Derogado" o cita directa de derogación) y 3 son MEDIA (nota de reforma sin
resolver), según el desglose de arriba.

## Detalle completo

Ver `hn-codigo-familia-bloque-02.jsonl` (un objeto JSON por línea, mismo criterio
que el archivo fuente). Contiene artículo, tipo original del hallazgo, veredicto,
prueba aplicada, nota de reforma extraída cuando aplica, y — para los candidatos —
un preview de hasta 220 caracteres de ambas versiones. Texto normativo público
(Código de Familia), sin datos de clientes.

Ver también `art-68-70-cotejo.md` — paquete aparte solicitado para ese caso
específico, no resuelto, con verificación de presencia de Arts. 70-A a 70-D.

---

*Próximo bloque: líneas 101–150 de HUMAN_LEGAL_REVIEW_QUEUE.jsonl.*
