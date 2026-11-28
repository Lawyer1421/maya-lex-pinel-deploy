# Cotejo cruzado D1 · Ley de Garantías Mobiliarias (D.182-2009) · OLA 15

**Fecha:** 2026-11-27 · **Rama:** `feat/fase2-ola15-lgm-cotejo-d1` (desde `main` `ed9d96d`)
**Generado con:** `scripts/olas/cotejo-lgm.ts` (Tesseract 5.5.3 `spa`, 300 ppi por columna). Solo lee PDFs y archivos locales; no escribe en ninguna base de datos.
**Texto cotejado:** [`LGM_OLA15_articulado_cotejado.txt`](LGM_OLA15_articulado_cotejado.txt): 86 líneas (una por artículo) y 11.834 palabras. SHA-256 (LF) `84effbdbe0855e103e606fea191989a6f656413648a64cd05e5992578ebfdba1`.

## Conclusión

- **D1: el texto queda limpio para la firma.** Los 86 artículos están cotejados con tres escaneos independientes de La Gaceta No. 32,125. No queda ningún conflicto abierto: los 39 tramos que ningún par de testigos decidía se resolvieron uno por uno, y 32 decisiones se verificaron en la imagen (17 resoluciones y 15 correcciones), además de los 36 epígrafes de título y capítulo.
- Las 283 cifras, las 32 remisiones y las 9 alertas del reporte preliminar están verificadas (§4).
- Lo que este cotejo **no** puede dar es la vigencia (**D4**): los tres testigos son la misma edición de 2010. Lo que falta está en §6.

## 1. Testigos

| Testigo | Archivo (OneDrive `…\05_LEYES_Y_CODIGOS\`) | SHA-256 | Escaneo |
|---|---|---|---|
| BASE | `Ley de Garantias Mobiliarias.pdf` | `dc919517…f758c` | 20 pp., 100 ppi (OCR del preliminar, reutilizado) |
| TSC | `LGM_Gaceta_32125_TSC.pdf` ([fuente](https://www.tsc.gob.hn/web/leyes/Ley%20de%20Garantias%20Mobiliarias.pdf)) | `66270e8d35d3d1ed5561028380baca78cb74f82ff2d8da5f97095c7a3856f267` ✔ | 20 pp., 150 ppi |
| CCIT | `LGM_Gaceta_32125_CCIT.pdf` ([fuente](https://www.ccit.hn/_files/ugd/7ccb0d_31ef38e4ea7b499b8992920a1cf25205.pdf)) | `94b687017b5068c8bb1a8535c4c06bca91c52fe209191290ee5cfa67dfff0ce6` ✔ | 24 pp., 150 ppi, sello del COHEP |
| (D4) Acuerdo 001-2020 | `Acuerdo_001-2020_Reforma_Reglamento_RGM_Gaceta_35166.pdf` | `d54d09691e8a3503ee7fd89973a9dd0e4307e971a3c567c5693f773c642c4b24` ✔ | 7 pp., con capa de texto |

El script comprueba las cuatro huellas antes de leer los archivos y se detiene si alguna no coincide.

## 2. Método

1. **Columnas.** En cada página de TSC y CCIT busca la raya vertical que separa las columnas de la Gaceta. Si no la encuentra, usa el canal blanco más ancho.
   - En la página 1, solo la franja bajo el sumario.
   - La cabecera se quita por posición; el pie «A. N», por patrón.
2. **Tres lecturas por testigo.** Cada columna se reconoce de tres modos:
   - `psm 4`;
   - `psm 6`;
   - **renglones reespaciados**: los renglones se detectan por proyección horizontal y la columna se recompone con blanco entre ellos.

   Hacen falta los tres porque Tesseract junta dos renglones apretados tras un epígrafe en negrita y pierde uno. Por ejemplo, en el TSC, pág. 5, se perdían «garantía mobiliaria se constituye mediante contrato entre el deudor» y otros tres renglones. El reespaciado los recupera; los otros modos pierden bloques distintos.
3. **Alineación.** Cada columna de un testigo se alinea con la misma columna de la BASE (es la misma impresión y la misma maquetación). Los límites de artículo son los de la BASE, con sus 86 encabezados consecutivos. Así, un encabezado mal leído en un testigo no desplaza el cotejo. Ejemplos: el TSC lee «13» en el art. 18 y CCIT lee «$» en el 8.
4. **Voto por tramos.**
   - Las posiciones no unánimes contiguas se comparan sin espacios ni signos sueltos.
   - Un testigo apoya una forma si cualquiera de sus lecturas la da, y gana la forma con al menos dos de los tres testigos.
   - En un empate entre omisión y texto gana el texto.
   - Si nada reúne dos testigos, se compara sin tildes.
   - El recuadro publicitario de la pág. 2 («La Gaceta … CENTRO CÍVICO GUBERNAMENTAL», 13 líneas que la BASE había metido dentro del art. 3) queda fuera.
5. **Pasos finales sobre el texto votado**, todos listados en `cotejo.json`:
   - separación de 41 formas pegadas («Losintereses» → «Los intereses»), con el vocabulario del corpus V5 firmado y una lista de exclusión revisada a mano;
   - restitución de tildes en 8 formas que los tres OCR pierden a la vez (la imagen de la pág. 4 dice «física», «físicamente»);
   - 21 correcciones dirigidas y 9 normalizaciones de «CAPÍTULO I» (§3.2).

## 3. Resultado

| Estado | Tramos | Significado |
|---|---|---|
| Unánime | 11.633 | los tres testigos leen igual |
| Segmentación | 156 | igual salvo espacios o signos sueltos |
| Mayoría con la BASE | 232 | la BASE y un testigo; el otro perdió el renglón o lo leyó mal |
| Corregida por mayoría | 121 | TSC y CCIT contra la BASE (p. ej. `£2-2004` → `82-2004`, `intemacionales` → `internacionales`, comas que la BASE lee como puntos) |
| Conflicto → resuelta | 39 | ningún par coincidía; resueltos uno a uno (§3.1) |
| **Conflicto abierto** | **0** | |

### 3.1 Conflictos resueltos (39)

- **Contra la imagen** (recorte del escaneo CCIT a 150–200 ppi): 17.
  - Puntuación: arts. 2, 13, 15, 30, 33, 34, 55, 56 (×2).
  - Números romanos de epígrafes: arts. 1, 2, 10, 17, 19, 32.
  - Texto: arts. 42 «garantía mobiliaria.», 60 «apropiación o reposesión».
- **Por los testigos que conservan el texto**, cuando el otro perdió el renglón o lo tapa el sello del COHEP: 13. Arts. 2, 4, 5, 15, 22, 33, 55, 58, 60 (×2), 72 (×2), 76.
- **Por contexto**: 9. Artefactos de segmentación o de alineación en los que la palabra está completa en el tramo vecino: arts. 35, 42 (×2), 44, 47, 54, 55, 71, 75.

La lista completa, con la lectura de cada testigo y el motivo, está en `RESOLUCIONES` (`scripts/olas/cotejo-lgm.ts`) y en `out/ola15-lgm/cotejo/cotejo.json`.

### 3.2 Correcciones sobre el texto votado (21 dirigidas + 9 normalizaciones)

**Números romanos de los epígrafes.** La mayoría no basta: los tres OCR confunden I, II y III a la vez en la negrita de la Gaceta. Por eso se verificaron contra la imagen **los 36 epígrafes de TÍTULO y CAPÍTULO**. La votación había dejado mal estos:

| Art. | Votado | Imagen |
|---|---|---|
| 5 | TÍTULO N | **TÍTULO II** Constitución de las garantías mobiliarias |
| 29 | CAPÍTULO II | **CAPÍTULO III** Obligaciones no-dinerarias |
| 74 | TÍTULO VII | **TÍTULO VIII** Medios alternativos para la resolución de controversias |
| 83 | CAPÍTULO II (TSC y CCIT) | **CAPÍTULO III** Reformas y jerarquía de la presente Ley |
| 84 | TÍTULO (sin número) | **TÍTULO X** Disposiciones transitorias |
| 79 | CAPÍTULO (sin número) | **CAPÍTULO II** Reglas transitorias. *No se corrigió en el texto aprobado; lo corrige el corte de encabezados (§5.1)* |

Además, nueve «CAPÍTULOI/CAPÍTULO!» se normalizaron a «CAPÍTULO I», el número que muestran los recortes.

Estructura verificada:

| Título | Capítulos |
|---|---|
| I Ámbito y aplicación general | I–III |
| II Constitución | I–II |
| III Publicidad | I–VIII |
| IV Registro y disposiciones relacionadas | I |
| V Reglas de prelación | I |
| VI Ejecución | I |
| VII Mandato irrevocable | I |
| VIII Medios alternativos | I |
| IX Disposiciones finales | I–III |
| X Disposiciones transitorias | I |

**Texto que dos testigos perdieron a la vez** (la omisión ganaba el voto). Se encontró con un barrido sistemático y está verificado en la imagen:

- **Art. 83** (reforma del art. 28 de la Ley de Propiedad, la base de la C2):
  - «que se leerá de la **forma siguiente:**»;
  - los incisos no reformados **«1) …;», «3) …;», «4) …;», «6) …;»**, que ningún OCR leyó.
- **Art. 84:** «para la constitución, publicidad y ejecución de garantías mobiliarias» (solo CCIT leyó el renglón).
- **Art. 56:** «se tramitará de **la manera siguiente:**».
- **Art. 60:** «serán», que en CCIT tapa el sello.
- **Art. 71:** «decida **lo** que corresponda».

**Otras correcciones:**

| Art. | Antes | Después | Motivo |
|---|---|---|---|
| 5 | «él intermediario» | «el intermediario» | la regla de tildes eligió la lectura de CCIT |
| 17 | «Devuelvala» | «Devuelva la» | imagen |
| 22 | «hacedido» | «ha cedido» | segmentación |
| 33 | «altemativamente» | «alternativamente» | «rn» leído «m» por los tres OCR |
| 33 | «vezhecha» | «vez hecha» | segmentación |
| 54 | «casode» | «caso de» | segmentación |
| 56 | «Seránrecurribles» | «Serán recurribles» | segmentación |
| 86 | «;» tras «La Gaceta”.» | (suprimido) | signo suelto |

### 3.3 Comprobaciones estructurales del texto final

- **Encabezados:** 86 líneas, cada una empieza por «ARTÍCULO N.» con N = 1…86.
  - Al principio, el final del art. 45 («plazo anterior.») caía delante del encabezado del 46. Se corrigió: lo que se inserta en la frontera entre artículos va al anterior.
- **Numeración de incisos:** consecutiva en los 86 artículos. Esta comprobación detectó que la votación había borrado el «4)» del art. 5, y se restituyó.
- **Comparación con la BASE artículo por artículo:** sin pérdidas.
  - Las únicas diferencias de tamaño están en el art. 3, porque se excluyó el recuadro publicitario, y en el 84, por la frase restituida.
  - El art. 47 solo cambia en separación de palabras y en `82-2004`.
- **Vocabulario:** las 94 formas que siguen fuera del vocabulario del corpus V5 son vocabulario propio de la ley (garante, mobiliarias, garantizadores, leasing, factoraje, publicitada, subyacente…) o verbos con pronombre enclítico (inscribirla, venderlos). No queda ninguna forma pegada ni error de OCR conocido.

## 4. Puntos que pediste verificar

### 4.1 Las 283 cifras

| Grupo | Cifras | Resultado |
|---|---|---|
| Recuadro publicitario (pág. 2 der.: `5`, `4`, `1311`, `7,`, `230-4556`, `220-6767`) | 6 | no son texto de la ley; excluidas |
| Texto de la ley, unánimes en los tres escaneos | 254 | sin cambio |
| Texto de la ley, no unánimes | 23 | todas resueltas (detalle abajo) |
| **Texto final** | **278 palabras con cifra** | incluye los incisos «1) 3) 4) 6)» restituidos en el art. 83 |

Las 23 no unánimes:
- Numerales de incisos: arts. 5, 22, 56, 58, 83.
- Números de encabezado: 8, 55, 59, 81 y 84.
  - El TSC lee «$» por 8 y «39» por 59; los testigos leen «SS» por 55.
  - Vale la BASE, cuya secuencia 1…86 es consecutiva, y la imagen lo confirma en el 55.
- `14` (art. 40).
- `82-2004` (art. 47).
- Restos de pie de página: «2», «4.».

**Concordancia entre cifra en letras y entre paréntesis** («seis (6)»): 23 casos, ninguna discordancia.

### 4.2 Las 32 remisiones

**Internas (21):** apuntan todas a artículos que existen (1–86):

| Art. | Remite a |
|---|---|
| 3 | 5 (×2) |
| 5 | 3 |
| 8 | 7 |
| 11 | 43 |
| 18 | 15 |
| 19 | 12 |
| 34 | 33 numeral 2) |
| 36 | 5 |
| 37 | 5 |
| 40 | 14 y 15 |
| 46 | 44 |
| 53 | 46 |
| 56 | 55 (×3) |
| 59 | 55 numeral 2) |
| 60 | 59 |
| 63 | 70 |
| 72 | 55 |
| 79 | 76 |

**Externas (11):** cifras unánimes en los tres escaneos; las del art. 3 y las de los arts. 47 y 83 se vieron además en la imagen.

| Art. | Remisión | Comprobación |
|---|---|---|
| 3 | art. 2057 del Código Civil | imagen |
| 5 | art. 604 del Código Civil | |
| 5 | arts. 21 y siguientes del Código Civil | |
| 17 | art. 2082 del Código Civil | |
| 17 | arts. 2083, 2084 y 2085 del Código Civil | |
| 33 | art. 892 del Código de Comercio | |
| 47 | art. 28 de la Ley de Propiedad, Decreto No. 82-2004 | imagen |
| 51 | art. 1522 del Código de Comercio | |
| 83 | art. 28 de la Ley de Propiedad, Decreto No. 82-2004 de 28 de mayo de 2004 | imagen |
| 83 | «ARTÍCULO 28.-» citado | imagen |

### 4.3 Las 9 alertas preliminares

| # | Alerta | Resultado |
|---|---|---|
| 1 | Art. 47 `£2-2004` | **`82-2004`**: TSC ×3 y CCIT ×3, y la imagen («según Decreto No. 82-2004 de fecha 28 de mayo de 2004») |
| 2 | Art. 3, art. 2057 C.C. | confirmado (unánime + imagen) |
| 3 | Art. 5, art. 604 C.C. | confirmado (unánime) |
| 4 | Art. 17, art. 2082 C.C. | confirmado (unánime) |
| 5 | Art. 17, arts. 2083, 2084 y 2085 C.C. | confirmado (unánime) |
| 6 | Art. 33, art. 892 C. de Com. | confirmado (unánime) |
| 7 | Art. 47, art. 28 Ley de Propiedad | confirmado (unánime + imagen) |
| 8 | Art. 51, art. 1522 C. de Com. | confirmado (unánime); «Articulo» → «Artículo» por mayoría |
| 9 | Art. 83, art. 28 Ley de Propiedad | confirmado (unánime + imagen) |
| — | Guion del encabezado del art. 42 | **es del original:** la Gaceta imprime «ARTÍCULO 42. CARACTERÍSTICAS DEL REGISTRO.» sin guion (los tres testigos y la imagen). Se conserva |

## 5. Consecuencias para el empaquetado (OLA 15)

- **Encabezados de títulos y capítulos (observación técnica, aprobada con el cotejo).** Ver §5.1.
- **Art. 83.** El texto cotejado es la base para integrar la reforma del art. 28 de la Ley de Propiedad que dejó pendiente la C2: hoy está en producción como CONTEXT vigente con su constancia.
  - Reforma por adición los numerales 2), 5), 7) y 8).
  - Los numerales 1), 3), 4) y 6) aparecen como «…» porque conservan su texto de 2004.
- **Lo que queda por hacer** antes de construir el paquete: la decisión D2–D8 y la firma del pliego de la OLA 15, como en las olas anteriores.

### 5.1 Observación técnica: separar los encabezados del artículo anterior

La BASE delimita el articulado por «ARTÍCULO N». Por eso cada encabezado de TÍTULO o CAPÍTULO queda pegado **al final del artículo que lo precede** en `LGM_OLA15_articulado_cotejado.txt` (SHA `84effbdb…`, aprobado por el CLO el 2026-11-27).

Al construir el paquete de la OLA 15, el adaptador debe:
1. cortar cada encabezado del final del artículo, de modo que el texto del artículo termine en su último signo de puntuación;
2. asignar el encabezado como metadato estructural (título o capítulo) a los artículos que **siguen**;
3. usar los encabezados de esta tabla, verificados contra la imagen. En dos casos el texto aprobado los trae con un residuo de OCR que el corte elimina; el texto de los artículos no cambia.

| Al final del art. | Encabezado (verificado contra la imagen) | Rige desde el art. |
|---|---|---|
| — | TÍTULO I ÁMBITO Y APLICACIÓN GENERAL · CAPÍTULO I PROPÓSITO DE LA LEY | 1 (precede al articulado; no está en el archivo) |
| 1 | CAPÍTULO II SISTEMA UNITARIO DE GARANTÍAS SOBRE LOS BIENES MUEBLES | 2 |
| 2 | CAPÍTULO III BIENES GARANTIZADORES, OBLIGACIONES GARANTIZADAS Y DEFINICIONES | 3 |
| 5 | TÍTULO II CONSTITUCIÓN DE LAS GARANTÍAS MOBILIARIAS · CAPÍTULO I CONSTITUCIÓN | 6 |
| 15 | CAPÍTULO II DERECHOS Y OBLIGACIONES DE LAS PARTES | 16 |
| 17 | TÍTULO III PUBLICIDAD · CAPÍTULO I REGLAS GENERALES | 18 |
| 19 | CAPÍTULO II CRÉDITOS | 20 |
| 29 | CAPÍTULO III OBLIGACIONES NO-DINERARIAS | 30 |
| 31 | CAPÍTULO IV CRÉDITOS DOCUMENTARIOS O CARTAS DE CRÉDITO INTERNACIONAL | 32 |
| 32 | CAPÍTULO V TÍTULOS-VALORES Y TÍTULOS REPRESENTATIVOS DE MERCADERÍAS | 33 |
| 35 | CAPÍTULO VI CONTROL POR UN TERCERO DEPOSITARIO | 36 |
| 37 | CAPÍTULO VII OTROS BIENES CORPORALES O INCORPORALES | 38 |
| 39 | CAPÍTULO VIII CONVERSIÓN DE UNA GARANTÍA MOBILIARIA | 40 |
| 40 | TÍTULO IV REGISTRO Y DISPOSICIONES RELACIONADAS · CAPÍTULO I REGISTRO | 41 |
| 49 | TÍTULO V REGLAS DE PRELACIÓN · CAPÍTULO I PRELACIÓN | 50 |
| 54 | TÍTULO VI EJECUCIÓN · CAPÍTULO I DISPOSICIONES GENERALES | 55 |
| 71 | TÍTULO VII MANDATO IRREVOCABLE PARA CUMPLIR OBLIGACIONES · CAPÍTULO I APLICACIÓN DEL MANDATO IRREVOCABLE | 72 |
| 74 | TÍTULO VIII MEDIOS ALTERNATIVOS PARA LA RESOLUCIÓN DE DISPUTAS Y SUBASTA DE BIENES · CAPÍTULO I DISPOSICIONES GENERALES | 75 |
| 77 | TÍTULO IX DISPOSICIONES FINALES · CAPÍTULO I JURISDICCIÓN Y ACTIVOS EVENTUALES | 78 |
| 79 | **CAPÍTULO II REGLAS TRANSITORIAS**. El texto aprobado trae «CAPÍTULO REGLAS TRANSITORIAS»: los tres OCR perdieron el «II», que se ve en el recorte de la pág. 19 izq. | 80 |
| 83 | CAPÍTULO III REFORMAS Y JERARQUÍA DE LA PRESENTE LEY | 84 |
| 84 | TÍTULO X DISPOSICIONES TRANSITORIAS · CAPÍTULO I REGLAMENTO Y ENTRADA EN VIGENCIA. El texto aprobado termina en « \|» (mancha), que el corte elimina | 85 |

**Prueba que debe pasar el adaptador:** después del corte, ningún artículo contiene «TÍTULO» ni «CAPÍTULO» en mayúsculas como encabezado. Las menciones en el texto («el Título V de la presente Ley») siguen en su sitio, porque van en minúsculas y forman parte del cuerpo.

## 6. D4: vigencia y reformas posteriores a 2010

> **Superado (2026-11-27).** Lo que sigue refleja el barrido inicial y es **incorrecto** en cuanto a las reformas: el art. 10 del **Decreto No. 50-2016** (La Gaceta 34,076, 4-jul-2016) sustituye el art. 47. La D4 vigente está en `docs/corpus/fase2/2026-11-27-hn-lgm-ola15/EXPEDIENTE_D1_D4_LGM_OLA15.md` (§5).

Situación al 2026-11-27:

**Entrada en vigencia.** El art. 86 cotejado dice: «La presente Ley entrará en vigencia seis (6) meses después de su publicación en el Diario Oficial “La Gaceta”» (unánime). Con la publicación del 28-ene-2010, la vigencia empieza el **28-jul-2010**. Hay que corregir la fecha del 28-ene-2010 que da la revista judicial costarricense, que es la de publicación.

**Reformas a la ley.** No se ha encontrado ninguna reforma del D.182-2009 en las fuentes consultadas: TSC, CCIT, búsqueda abierta y los decretos 33-2020 y 13-2021.
- **Indicio:** el Acuerdo 001-2020 (Gaceta 35,166, 4-feb-2020, Finanzas) reforma solo el **Reglamento** (Acuerdo 2074-2010, arts. 2, 5, 9 y 11 y los formularios). Cita la LGM **sin** «y sus reformas», mientras que la LGAP sí la cita con esa coletilla. No es prueba de vigencia sin reformas.

**Falta, en orden de preferencia:**
1. Constancia de vigencia o edición consolidada del **CEDIJ** (Poder Judicial). Su portal no respondió por vía automática; hay que pedirla o descargarla en el navegador.
2. Consulta al índice de decretos del **Congreso Nacional** (búsqueda por «Ley de Garantías Mobiliarias» y «182-2009») de 2010 a la fecha.
3. Si ninguna de las dos aparece, el CLO decide en la D4 si firma «vigente sin reformas conocidas al 2026-11-27», con la constancia de esta búsqueda y del indicio del Acuerdo 001-2020.

## 7. Reproducir

```powershell
npx tsx scripts/olas/ocr-lgm.ts          # BASE (si no existen out/ola15-lgm/ocr/*.tsv)
npx tsx scripts/olas/cotejo-lgm.ts       # ~25 min la primera vez (6 lecturas × 39 columnas); luego segundos con los TSV en out/
```

- El resultado es determinista con los TSV en caché: dos ejecuciones dan el mismo SHA-256 del texto cotejado.
- `npx tsx scripts/olas/cotejo-lgm.ts --geometria` muestra solo los cortes entre columnas de cada página.
- Salidas en `out/ola15-lgm/cotejo/` (no versionadas):
  - `articulado_cotejado.txt`;
  - `cotejo.json`: tramos no unánimes con las seis lecturas, resoluciones, correcciones, separaciones, tildes y vocabulario residual;
  - `articulado_tsc.txt` y `articulado_ccit.txt`;
  - los TSV y las imágenes por columna.
