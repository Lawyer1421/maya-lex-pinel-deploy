# P0: LEY DE ORGANIZACIÓN Y ATRIBUCIONES DE LOS TRIBUNALES (LOAT, 1906)
## Adjudicación canónica preliminar — desplazamientos orgánicos

**Fase:** P0-LOAT (adjudicación abierta)  
**Fecha:** 2026-10-02  
**Proyecto:** thgrhueckkjdutjvcufp (MayaLex Pro)  
**Estado:** `PRELIMINARY_NOT_CLOSED`  
**Production writes:** 0  

No hay dictamen CLO sobre estos puntos. Cada efecto se clasifica como observado, hipótesis o `UNRESOLVED`. Nada de lo siguiente marca un artículo como derogado dentro del corpus.

Inventario paralelo: `docs/corpus/P0_LOAT_CANONICAL_INVENTORY.md`.

---

## 0. Criterio de este pase

- Una derogación expresa exige que la ley posterior nombre el artículo o el cuerpo. Una cláusula residual ("toda disposición que se oponga") no adjudica artículos.
- El interdicto de amparo de la LOAT es una acción posesoria. No se confunde con el amparo constitucional.
- La compilación del Tribunal Superior de Cuentas incluye notas editoriales. Una nota no es Gaceta ni sentencia.
- `INGESTED`, presencia física y vigencia siguen siendo estados distintos.

---

## 1. Núcleo de 1906

Fuente: compilación PDF del TSC, Ley de Organización y Atribuciones de los Tribunales.

El texto se dicta "en uso de las facultades delegadas al Poder Ejecutivo por el Decreto número 76" de 19 de enero de 1906. El artículo 264 fija el inicio de vigencia el 1 de marzo de 1906 y deroga la ley de organización de tribunales anterior, no las leyes posteriores.

El articulado leído organiza justicia, juzgados de paz, jueces de letras, Cortes de Apelaciones, Corte Suprema, nombramientos, competencia, recusación, ministerio público, secretarios y procuradores. El Título XIII (artículos 194 a 217) aparece en la propia compilación como derogado por el artículo 84 de la Ley del Ministerio Público, Decreto 228-93, Gaceta 27,241 de 6 de enero de 1994. Esa nota se registra como **candidato de derogación expresa ya anotado en la compilación**. No se releyó el artículo 84 del Decreto 228-93 en este pase, así que el cierre formal de esos 24 artículos queda `PENDING_PRIMARY_TEXT`.

---

## 2. Código Procesal Civil (Decreto 211-2006)

Fuente leída: PDF TSC del Código Procesal Civil. Publicación impresa al pie de esa compilación: La Gaceta 31,313 del 26 de mayo de 2007. El artículo 932 difiere la vigencia 24 meses desde esa publicación. Esta lectura no usa las capas CPC del corpus y no cierra el rol temporal de `HN_CPC_TEXTO_BASE_D211_2006` (E5 sigue abierto).

### 2.1 Lo que el CPC deroga por su nombre

Artículo 921, disposición derogatoria, numeral 1:

> Derogar expresamente los artículos siguientes: 1.- Los Artículos del 1 al 846; y del 899 al 960; y del 1072 al 1081 todos de El Código de Procedimientos emitido por el Poder Ejecutivo el 8 de febrero de 1906.

El mismo artículo lista otros cuerpos (Código Civil, Ley de Conciliación y Arbitraje, Ley de Propiedad, Ley de Inquilinato, Ley del Sistema Financiero, artículo 405 del Código de Comercio) y una cláusula residual apoyada en el artículo 43 del Código Civil. **La LOAT no está en esa lista.**

Artículo 919: mientras no exista ley de jurisdicción voluntaria, siguen vigentes las disposiciones del Código de Procedimientos Civiles de 1906 sobre actos de jurisdicción voluntaria, Libro IV, y los actos de esa naturaleza regulados fuera de ese texto que el CPC no prevea.

Artículo 931:

> La remisión referida en los Códigos y Leyes, al Código de Procedimientos Civiles o Código de Procedimientos, salvo en materia de jurisdicción voluntaria, se entenderá hecha a las normas del Código Procesal Civil.

### 2.2 Efecto canónico sobre competencias, recursos y actuaciones

| Pregunta | Adjudicación de este pase |
|---|---|
| ¿El CPC deroga la LOAT por su nombre? | No observado |
| ¿El CPC deroga el Código de Procedimientos de 1906 en los rangos del art. 921? | Sí, en el texto leído. Ese código no es la LOAT |
| ¿Las reglas de competencia y de recursos de la LOAT quedan desplazadas? | `UNRESOLVED` artículo por artículo. La vía plausible es la remisión del art. 931 cuando la LOAT remite al código viejo, más la cláusula residual del art. 921.8. Ninguna de las dos sustituye un cotejo |
| ¿La jurisdicción voluntaria mencionada en secretarías u otros títulos de la LOAT sigue el código de 1906? | Hipótesis compatible con el art. 919. No adjudicada |

**Status del eje CPC:** `REMISSION_DISPLACEMENT_UNRESOLVED`. No se etiqueta ningún artículo de la LOAT como derogado por el Decreto 211-2006.

---

## 3. Carrera judicial, Consejo de la Judicatura y Corte Suprema

### 3.1 Lo que la compilación de la LOAT ya dice

Las notas del PDF TSC, no un decreto transcrito aparte, afirman entre otras cosas:

- Los jueces de paz se nombran por la Corte Suprema conforme al artículo 26 de la Ley de la Carrera Judicial y al reglamento de esa ley.
- El artículo 45 de esa ley regula la residencia en la sede.
- El artículo 313 de la Constitución de 1982, en la redacción citada por la nota, atribuye a la Corte Suprema nombrar y remover magistrados y jueces previa propuesta del Consejo de la Carrera Judicial, y crear, suprimir, fusionar o trasladar juzgados y Cortes de Apelaciones.

El decreto que creó la "Ley de la Carrera Judicial" citada en esas notas **no trae número en los pasajes leídos**. Queda `NO_MEDIDO`.

### 3.2 Instrumento distinto que no se fusiona con el anterior

Una reproducción de La Gaceta 37,075, sección A, 20 de febrero de 2026, en el sitio de La Tribuna, considera que la Sala de lo Constitucional declaró inconstitucional la Ley del Consejo de la Judicatura y de la Carrera Judicial, Decreto Legislativo 219-2011, y que el Consejo fue desarticulado. Este pase no leyó la sentencia. El anteproyecto de una ley nueva, reportado por prensa en 2026, no es derecho vigente.

Relación entre "Ley de la Carrera Judicial" (notas TSC, sin número) y el Decreto 219-2011: `UNRESOLVED`. Son nombres distintos hasta que un texto los identifique.

### 3.3 Efecto canónico

| Pieza de la LOAT de 1906 | Lectura preliminar |
|---|---|
| Nombramiento de jueces y magistrados por las reglas de 1906 | Las notas de la compilación las tratan como desplazadas por Constitución + Ley de la Carrera Judicial. Sin número de decreto ni cotejo de artículos, el status es `EDITORIAL_DISPLACEMENT_UNRESOLVED` |
| Creación de juzgados por la propia LOAT o por decretos sueltos | La nota remite esa atribución al art. 313 constitucional y a la Corte Suprema. Los decretos de creación que ya están en el triage siguen pendientes. No se derogan en bloque |
| Consejo de la Judicatura como órgano administrador | El Decreto 219-2011 no se usa como norma vigente. Su inconstitucionalidad se registra como hecho alegado en Gaceta de 2026, pendiente de lectura del fallo |

**Status del eje:** `ORGANIC_FRAME_UNRESOLVED`.

---

## 4. Ley sobre Justicia Constitucional (Decreto 244-2003)

Fuente: PDF TSC de esa ley. El pie de esa compilación imprime "La Gaceta No. 30,792 del 30 de Agosto del 2004". Otras referencias secundarias fechan la misma gaceta en 2005. `PUBLICATION_DATE_UNRESOLVED`. El inventario ya tiene el cuerpo como `PRESENT` (124 filas, medición previa). Este pase no remeasure esas filas.

### 4.1 Derogación leída

Artículo 123:

> Derógase la Ley de Amparo emitida el 14 de abril de 1936 y sus reformas, el artículo 94 del Decreto Nº 189-87 del 20 de noviembre de 1987, contentivo de la Ley de Jurisdicción de lo Contencioso Administrativo; los artículos 373 a 380 del Código Procesal Penal; 961 a 966 del Código de Procedimientos Civiles, primera parte Procedimientos Civiles; y cualquier otra disposición que se oponga a la presente ley.

La LOAT no está nombrada. Los artículos 961 a 966 pertenecen al Código de Procedimientos, no a la LOAT.

Artículo 121: las acciones de amparo, exhibición personal e inconstitucionalidad en trámite al entrar en vigencia se resuelven por la Ley de Amparo de 1936, con la salvedad penal que el artículo enuncia.

### 4.2 Qué queda abierto dentro de la LOAT

| Materia | Hallazgo | Status |
|---|---|---|
| Amparo constitucional, exhibición personal, inconstitucionalidad | El régimen procesal leído está en el Decreto 244-2003. La LOAT, en pasajes de Corte Suprema, todavía enuncia conocer de amparo y de revisión "con arreglo a la ley" | Remisión, no derogación nominada. Artículos concretos de la LOAT: `UNRESOLVED` |
| Cláusula residual del art. 123 | Puede alcanzar preceptos incompatibles de la LOAT | No se aplica sin identificar el precepto |
| Interdicto de amparo | La compilación, en reglas de competencia territorial, habla de "interdictos de amparo, de restitución, de restablecimiento" | Acción posesoria. Fuera del art. 123 salvo cotejo que demuestre lo contrario. Hoy `NOT_CONSTITUTIONAL_AMPARO` |
| Exhibición personal como garantía | El Decreto 244-2003 la regula. Un decreto anexo de la compilación LOAT exceptúa juicios de amparo y de exhibición personal al trasladar causas entre Cortes de Apelaciones | Ese decreto anexo no se adjudica aquí. Sigue en la cola histórica del triage |

**Status del eje:** `CONSTITUTIONAL_PROCEDURE_MOVED_CANDIDATE`. Derogación expresa de artículos de la LOAT por el Decreto 244-2003: no observada.

---

## 5. Juzgados de competencia especial

Búsqueda, en el texto extraído de la compilación TSC de la LOAT, de violencia doméstica, niñez, extorsión, privación de dominio y jurisdicción nacional: sin coincidencias.

Esos órganos no forman parte del diseño de 1906 que se leyó (paz, letras, apelaciones, Corte Suprema, más decretos anexos de juzgados locales). Su existencia normativa es una capa posterior. En este pase no se identificó el decreto de creación de ninguno.

| Jurisdicción pedida en la directiva | En la compilación LOAT | Instrumento de creación | Efecto sobre la LOAT |
|---|---|---|---|
| Violencia doméstica | No aparece | `NO_MEDIDO` | `UNRESOLVED` |
| Niñez | No aparece | `NO_MEDIDO` | `UNRESOLVED` |
| Extorsión | No aparece | `NO_MEDIDO` | `UNRESOLVED` |
| Privación de dominio | No aparece | `NO_MEDIDO` | `UNRESOLVED` |
| Jurisdicción nacional | No aparece | `NO_MEDIDO` | `UNRESOLVED` |

No se importan números de decreto de memoria. El Código de la Niñez (Decreto 73-96) sigue `ABSENT_VERIFIED` en H5 y no se usa aquí como sustituto de la ley de juzgados de niñez.

**Status del eje:** `SPECIAL_JURISDICTION_SOURCES_UNLOCATED`.

---

## 6. Tabla de status canónico

| Eje | Status | Cierra inventario | Permite ingesta |
|---|---|---|---|
| Presencia física en `biblioteca_vectores` | `ABSENT_VERIFIED` | No | No |
| Texto base 1906 en repositorio | Ausente. Existe compilación TSC externa | No | No |
| Artículos 194–217 (Ministerio Público) | Candidato de derogación por Decreto 228-93, nota TSC | No, falta el artículo 84 | No |
| CPC 211-2006 | `REMISSION_DISPLACEMENT_UNRESOLVED` | No | No |
| Carrera judicial / Consejo / CSJ | `ORGANIC_FRAME_UNRESOLVED` | No | No |
| Decreto 244-2003 | `CONSTITUTIONAL_PROCEDURE_MOVED_CANDIDATE` | No | No |
| Jurisdicciones especiales | `SPECIAL_JURISDICTION_SOURCES_UNLOCATED` | No | No |
| Adjudicación canónica completa | false | No | No |

---

## 7. Compuertas

```
SOURCE_DISCOVERY_AUTHORIZED  = true   (exclusivo para fuentes documentales de la LOAT)
INGESTION_AUTHORIZED         = false
MERGE_AUTHORIZED             = false
production_writes            = 0
canonical_adjudication_complete = false
```

El discovery autorizado en esta fase es lectura de fuentes documentales. No incluye SQL de producción, escritura en `biblioteca_vectores`, ni ejecución de scripts de ingesta.

---

## 8. Preguntas que siguen abiertas para CLO

1. ¿El id canónico queda en `HN_LEY_ORGANIZACION_TRIBUNALES`, con el id largo del triage solo como alias?
2. ¿Se acepta la compilación TSC como fuente de trabajo, a reserva de Gaceta, o el articulado solo entra desde Gaceta?
3. ¿Los artículos 194 a 217 se tienen por derogados por el Decreto 228-93 una vez leído su artículo 84?
4. ¿Qué artículos de la LOAT remiten al Código de Procedimientos y caen bajo el artículo 931 del CPC?
5. ¿Cuál es el decreto de la Ley de la Carrera Judicial citada en las notas, y qué relación tiene con el Decreto 219-2011?
6. ¿Qué artículos de la LOAT enuncian amparo, exhibición o inconstitucionalidad, y cuáles sobreviven como remisión?
7. ¿Cuál es el instrumento de creación de cada jurisdicción especial de la directiva?

Hasta una respuesta escrita, estas siete preguntas no se convierten en metadata de vigencia.
