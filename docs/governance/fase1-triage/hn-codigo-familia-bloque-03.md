# Fase 1 — Bloque 3/N: líneas 151–200 (artículos 174–208)

Procesado tras la ratificación formal de ambos dossiers (Fundador + Asesor
Jurídico, 2026-08-28): Decreto 102-2018 (derogación Título IV Adopción) y
Decreto 31-2015 (68/70 + 70-A a 70-D vigentes). Rama exclusiva:
`feature/facultades-completas-f1-triage-familia`. Fuente de los 50
hallazgos: `HUMAN_LEGAL_REVIEW_QUEUE.jsonl` líneas 151–200 (worktree
`mayalex-corpus`), todos originalmente `AUSENTE_EN_VERSION_LOCAL_CAUSA_NO_CONFIRMADA`.

**A diferencia de bloques 1–2 (comparación textual de reformas), este
bloque se resolvió leyendo directamente el contenido real recuperado por
el fix D9 (P2/P3, `lib/ingesta-oficial/extraccion-ndestructiva.ts`,
mergeado a `feature/mayalex-official-corpus-p0` en `aee3cfac9f5ebf0051750b965fedfb2ec69dac85`)
contra el texto crudo del PDF fuente — no contra una comparación entre dos
versiones.**

## Resultado: 11 derogado (102-2018) + 1 derogado (OTRO decreto, no ratificado hoy) + 38 técnico (contenido vigente recuperado)

### DEROGADO_CONFIRMADO_POR_FUENTE — Decreto 102-2018 (11 artículos, cubiertos por el dossier ratificado hoy)

`174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184`

Evidencia: cita textual literal localizada en el bloque de notas al pie
87–98 del PDF fuente (ej. nota 90: *"Artículo 176. Derogado mediante
Decreto 102-2018 del 25 de septiembre de 2018. Publicado en el Diario
Oficial La Gaceta No.34,841 de fecha 10 de enero de 2019."*), verificada
individualmente para 174 (nota 87) y 175 (nota 88) por separado. El
Artículo 184 es el ÚLTIMO de este bloque — inmediatamente después, el
texto fuente transiciona a `"TÍTULO V DE LA PATRIA POTESTAD CAPÍTULO I DE
LAS DISPOSICIONES GENERALES"`, confirmando el límite real del Título IV
(Adopción) derogado.

### DEROGADO_CONFIRMADO_POR_FUENTE — Decreto 73-96 (1 artículo, **NO cubierto por ningún dossier ratificado hoy**)

`206`

Evidencia: nota al pie 110 cita literalmente: *"Artículo 206. Derogado
mediante Decreto No. 73-96, Código de la Niñez y la Adolescencia de fecha
30 de mayo de 1996..."* — un instrumento derogatorio **distinto y anterior**
a los dos dossiers ratificados hoy (102-2018 y 31-2015). No se asumió por
proximidad de rango con el bloque de Adopción — se verificó su propia
cita textual antes de clasificar. **Requiere ratificación separada** del
Decreto 73-96 antes de tratarse como definitivamente resuelto para fines
de catálogo oficial.

### TECNICO_EXTRACCION — 38 artículos, contenido sustantivo VIGENTE recuperado (no derogado, no ausente de la fuente)

Plano (23): `185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196,
197, 198, 199, 200, 201, 202, 203, 204, 205, 207, 208`

Con sufijo de letra (15): `197-A, 197-B, 197-C, 197-D, 197-E, 198-A,
198-B, 198-C, 207-A, 207-B, 207-C, 207-D, 207-E, 207-F, 207-G`

Los 38 corresponden a **Título V (De la Patria Potestad)** y **Título VI
(De los Alimentos)** — capítulos completamente distintos del Título IV
(Adopción) derogado por el Decreto 102-2018. El finding original
`AUSENTE_EN_VERSION_LOCAL_CAUSA_NO_CONFIRMADA` era un síntoma del defecto
P2/P3 del extractor (ver `docs/backlog/D9-defecto-ventana-nota-familia-diagnostico-fix.md`
en `mayalex-corpus`), no una ausencia real en la fuente: el contenido
sustantivo completo existe en el PDF y ahora se recupera correctamente.
Prueba técnica: la suite `tests/osint/extractor-recuperacion-nota-cascada.test.ts`
(ya mergeada a `feature/mayalex-official-corpus-p0`, 276/276 passing) cubre
el mecanismo general de recuperación; el contenido específico de este
rango se verificó por lectura directa del PDF y de la re-extracción real
en `corpus-data/estructurado/staging-d9/` (`mayalex-corpus`, rama
`fix/extractor-ventana-nota-adopcion`, no mergeada en su totalidad).

Muestra de contenido real recuperado (no exhaustivo, ver JSONL adjunto
para los 38): Art. 185 *"La patria potestad es un conjunto de derechos y
deberes que los padres tienen con respecto..."*; Art. 199 *"La patria
potestad se extingue: 1) Por la muerte del hijo..."*; Art. 207-A *"Se
entenderá por alimentos todo lo que sea indispensable para el desarrollo
integral de..."*.

## 🔴 HALLAZGO CRÍTICO — inconsistencia en producción, no corregida en este bloque

Verificación en `biblioteca_vectores` (producción, `thgrhueckkjdutjvcufp`,
solo lectura, sin escritura) para los 50 números de este bloque:
**los 50 ya existen como filas, y los 50 tienen `es_norma_vigente = false`
— incluidos los 38 confirmados como contenido VIGENTE real** (Patria
Potestad, Alimentos). Es decir, producción está sirviendo (o más bien,
excluyendo correctamente vía D6b, pero etiquetando incorrectamente) 38
artículos genuinamente vigentes del Código de Familia como si estuvieran
derogados.

Consistente con la hipótesis de origen: la conclusión retractada
`HALLAZGO_ALCANCE_DOCUMENTO_SUPERSEDE_SIN_RASTRO` (236 ítems, retractada
en `HUMAN_LEGAL_REVIEW_QUEUE.jsonl` línea 940) asumía que "todo más allá
del ~123 está fuera de alcance" antes de corregirse — es plausible que la
carga real a producción heredara ese mismo supuesto equivocado de forma
generalizada, marcando `false` en bloque en vez de por evidencia
individual. **No se corrigió aquí** — es una decisión de escritura a
producción que requiere autorización explícita separada (no cubierta por
"resuelve técnicos con tests" ni por ninguno de los dos dossiers
ratificados hoy, que hablan de derogaciones, no de contenido
mal-etiquetado como no-vigente).

## Hallazgo colateral — Artículo 175-A (fuera de las 50 líneas de este bloque)

Al leer el bloque de notas 87–98 se encontró la nota 89, que NO cita al
Art. 175 sino a un artículo adicional no numerado en la secuencia
principal: *"Artículo 175.-A. Adicionado mediante Decreto 124-92 de fecha
22 de septiembre de 1992..."* — un artículo real, con su propio
instrumento (Decreto 124-92, 1992), **no cubierto por ninguno de los dos
dossiers ratificados hoy**, y que no corresponde a ninguna de las 50
líneas de este bloque (no estaba en la cola de revisión en absoluto).
Se documenta como hallazgo nuevo, sin resolver, para triage futuro — no se
inserta nada.

## Archivos de este bloque

- `hn-codigo-familia-bloque-03.jsonl` — 50 resoluciones individuales
  (schema igual a bloque-02: `art`, `tipoOriginal`, `veredicto`, `prueba`,
  `motivo`, + `decreto`/`contenidoPreview` según el caso).

---

*No se mergeó nada a `main`. No se tocó `T022-staging-piloto.sql`. No se
escribió ninguna fila a `biblioteca_vectores`. Bloque 3 = líneas 151–200
únicamente — no reabre ni reinterpreta el análisis de líneas 101–150 ya
documentado en `hn-codigo-familia-bloque-03-RETRACTACION.md`.*
