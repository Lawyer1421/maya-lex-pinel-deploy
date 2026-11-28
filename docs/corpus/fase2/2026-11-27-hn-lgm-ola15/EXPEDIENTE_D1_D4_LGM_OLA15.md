# Expediente D1–D4 y matriz de clasificación · OLA 15 · `HN:LEY_GARANTIAS_MOBILIARIAS`

**Estado D1:** PENDIENTE DE FIRMA
**Estado D2:** PENDIENTE DE FIRMA
**Estado D3:** PENDIENTE DE FIRMA
**Estado D4:** PENDIENTE DE FIRMA
**Estado matriz:** PENDIENTE DE FIRMA

**Instrumento:** Ley de Garantías Mobiliarias, Decreto No. 182-2009.
- Aprobada por el Congreso Nacional el 24-ago-2009 y sancionada el 22-sep-2009.
- Publicada en La Gaceta No. 32,125 el 28-ene-2010.
- Reformada por el art. 10 del Decreto No. 50-2016 (La Gaceta No. 34,076, 4-jul-2016).

**Lote propuesto:** `OLA15_LGM_2016_01` · **Fecha:** 2026-11-27 · **Rama:** `feat/fase2-ola15-lgm-d4-matriz` (desde `main` `8ecae3f`)
**Generador de la matriz:** `scripts/olas/ola15-lgm-matriz.ts`. Solo lee archivos locales: no escribe en ninguna base de datos ni genera SQL.

> **Alcance.** Este expediente decide el texto (D1–D3), la vigencia (D4) y la clasificación (matriz). **No autoriza ninguna escritura**. El paquete V4/V5 (embeddings, SQL y huellas) y su autorización (D5–D8) se presentarán después en el pliego completo, que debe citar las huellas de §6. Para firmar, el CLO sustituye `PENDIENTE DE FIRMA` por `FIRMADA (fecha, firmante)` en cada línea **Estado** y completa §8.

## Resumen

- **D1 (texto base 2010):**
  - el texto del cotejo triple que aprobó el CLO (PR #182, `84effbdb…`) para los 86 artículos;
  - más una **fe de erratas de 4 signos de puntuación** (arts. 17, 26, 52 y 56), verificados en la imagen y hallados al construir esta matriz.

  El archivo aprobado no se modifica.
- **D2 (encabezados):** se cortan **22 bloques de encabezados** (10 títulos y 22 capítulos): 21 al final de un artículo y uno que precede al art. 1. Se corrigen los dos residuos de OCR (arts. 79 y 84).
- **D3 (art. 47 reformado):** el texto del art. 10 del D.50-2016 está cotejado carácter por carácter con la imagen de La Gaceta 34,076 (835 caracteres). Hay un solo testigo: el segundo, del IAIP, no se pudo descargar (reserva R1).
- **D4 (vigencia):**
  - la ley está vigente desde el **28-jul-2010**;
  - **sí existe una reforma expresa posterior a 2010**: el art. 10 del D.50-2016 sustituye el art. 47, vigente desde el **4-jul-2016**;
  - el barrido 2010–2026 no halló otra reforma, con reserva expresa sobre el CEDIJ y el Congreso Nacional (R2).
- **Matriz:** 87 filas.
  - **86 PRIMARY vigentes**: arts. 1–46 y 48–86 con el texto de 2010, y el art. 47 con el texto de 2016;
  - **1 CONTEXT derogado**: el art. 47 de 2010, como antecedente (`es_norma_vigente = false`).

## 1. Fuentes

| Fuente | Archivo (OneDrive `…\05_LEYES_Y_CODIGOS\`) | SHA-256 | Uso |
|---|---|---|---|
| La Gaceta 32,125, escaneo de 100 ppi (BASE) | `Ley de Garantias Mobiliarias.pdf` | `dc919517a242bbda548171a7ebecb7dbe20b32af5a909eb784bb8a0f917f758c` | D1 |
| La Gaceta 32,125 (TSC) | `LGM_Gaceta_32125_TSC.pdf` | `66270e8d35d3d1ed5561028380baca78cb74f82ff2d8da5f97095c7a3856f267` | D1 |
| La Gaceta 32,125 (CCIT) | `LGM_Gaceta_32125_CCIT.pdf` | `94b687017b5068c8bb1a8535c4c06bca91c52fe209191290ee5cfa67dfff0ce6` | D1, D2 y fe de erratas (imagen) |
| **La Gaceta 34,076, D.50-2016** (TSC, [fuente](https://www.tsc.gob.hn/web/leyes/Beneficios_Regularizacion_Actualizacion_Tributaria_Tasa-unicaAnual-Matr%C3%ADcula-Vehiculos.pdf)) | `D50-2016_Gaceta_34076_reforma_art47_LGM.pdf` | `201047b5607960ac8a08b4caac95ec25eb5f7fcfdd0909d151cd677cbf62a4ec` ✔ (verificada en OneDrive el 2026-11-27) | D3, D4 |
| Acuerdo 001-2020 (Gaceta 35,166) | `Acuerdo_001-2020_Reforma_Reglamento_RGM_Gaceta_35166.pdf` | `d54d09691e8a3503ee7fd89973a9dd0e4307e971a3c567c5693f773c642c4b24` | D4 (contexto: reforma el Reglamento, no la ley) |

**Segundo testigo del D.50-2016.** El portal único del IAIP (`https://portalunico.iaip.gob.hn/ver_archivo/MzM0NDQ4`) responde **403** con una verificación anti-bots de Cloudflare («Just a moment…»). No se pudo descargar ni comprobar que sea La Gaceta 34,076. El resultado de búsqueda lo describe como «Digitalizado y procesado por UDI-CRA-DEGT · Poder Legislativo», pero sin el archivo no se sabe qué contiene. Queda en la reserva R1.

## 2. D1 · Texto base de 2010 y fe de erratas

**Texto base:** `docs/corpus/fase2/ocr/LGM_OLA15_articulado_cotejado.txt`, SHA-256 (LF) `84effbdbe0855e103e606fea191989a6f656413648a64cd05e5992578ebfdba1`.
- Es el cotejo triple aprobado por el CLO el 2026-11-27 (PR #182, `main` `8ecae3f`). Método y resultados en `docs/corpus/fase2/ocr/REPORTE_COTEJO_D1_LGM_OLA15.md`.
- El generador comprueba la huella antes de leer y normaliza CRLF → LF, porque la copia de trabajo de Windows puede venir en CRLF.

**Fe de erratas (4).** Las hallaron los dos controles que se añadieron al construir la matriz:
- todo artículo debe terminar en un signo de cierre;
- barrido de «coma + palabra en mayúscula» y de «punto + minúscula».

En los cuatro casos la BASE de 100 ppi confunde punto y coma, o lo omite, y la votación no lo detectó. Las cuatro están verificadas en el escaneo CCIT:

| Art. | Texto aprobado | Corrección | Imagen |
|---|---|---|---|
| 17 | «…de terminación de la garantía mobiliaria» (final) | «…garantía mobiliaria.» | CCIT pág. 7 izq. |
| 26 | «…al cesionario en su caso, Todo saldo…» | «en su caso. Todo saldo» (punto y aparte) | CCIT pág. 8 der. |
| 52 | «…constituido sobre ellos, El acreedor…» | «sobre ellos. El acreedor» | CCIT pág. 13 izq. |
| 56 | «…serán irrecurribles,» (final) | «serán irrecurribles.» | CCIT pág. 15 der. |

Las erratas se aplican en el generador (`FE_DE_ERRATAS`, y cada una debe casar exactamente una vez). Las huellas de §6 ya las incluyen.

El barrido encontró un tercer caso de «coma + mayúscula» que es correcto y se conserva: art. 33, «Capítulo VII, Sección Segunda».

## 3. D2 · Corte de encabezados (regla §5.1 del reporte D1)

La BASE delimita el texto por «ARTÍCULO N». Por eso cada encabezado de título o capítulo queda al final del artículo anterior. El generador hace lo siguiente:
1. Corta el encabezado del final de cada uno de los 21 artículos de la lista. Si un artículo no termina exactamente en el encabezado esperado, se detiene.
2. Exige que, tras el corte y la fe de erratas, **los 86 artículos terminen en un signo de cierre** y que **ninguno conserve un encabezado** con número romano.
   - Las menciones en minúscula siguen en el texto («el Título V de la presente Ley»).
   - El epígrafe del art. 9 («…COMO TÍTULO EJECUTIVO») no es un encabezado.
3. Deja en `encabezados_cortados.csv` el texto verificado contra la imagen que el adaptador asigna como estructura a los artículos **siguientes**.

**Residuos que el corte corrige** (en el texto aprobado no se tocan):

| Tras el art. | En el texto aprobado | Verificado (imagen) |
|---|---|---|
| 79 | «CAPÍTULO REGLAS TRANSITORIAS» | **CAPÍTULO II** · REGLAS TRANSITORIAS (los tres OCR perdieron el «II») |
| 84 | «… REGLAMENTO Y ENTRADA EN VIGENCIA \|» | sin el «\|» final (mancha) |

**Cuenta exacta.** Son **22 bloques**: 21 al final de un artículo, más «TÍTULO I · ÁMBITO Y APLICACIÓN GENERAL · CAPÍTULO I · PROPÓSITO DE LA LEY», que precede al art. 1. En total, 10 títulos y 22 capítulos.

*Corrección:* en el cierre del PR #182 se habló por error de «23 encabezados».

## 4. D3 · Texto del art. 47 reformado (D.50-2016)

**Fuente.** Art. 10 (Capítulo IV, «Garantías Mobiliarias») del Decreto No. 50-2016, en La Gaceta 34,076 (pág. 6 del PDF del TSC):
> «Reformar el Artículo 47 del Decreto No.182-2009 del 24 de Agosto de 2009, contentivo de la LEY DE GARANTÍAS MOBILIARIAS, el cual se leerá así:».

**Datos del decreto:**
- Aprobado por el Congreso Nacional el 10-may-2016 y sancionado el 10-jun-2016.
- Publicado en La Gaceta el 4-jul-2016; vigente desde su publicación (art. 12).

**Texto para la fila PRIMARY** (`art47_D50-2016.txt`): 835 caracteres, sin las comillas de cita del decreto reformador, en una sola línea como el resto del texto D1.

> ARTÍCULO 47.- ADMINISTRADOR DEL REGISTRO.- El Registro debe ser administrado por el Instituto de la Propiedad, en atención al Artículo 28 de la Ley de la Propiedad, no obstante este puede autorizar la creación de centros asociados. Las tasas registrales deben ser determinadas por el Instituto de la Propiedad y deben servir para cubrir el gasto del registro e invertirse en la mejora continua del mismo. Para dar transparencia y facilitar las consultas e inscripciones, el Instituto de la Propiedad tiene la obligación de crear una base de datos común para todo el territorio nacional. El Instituto de la Propiedad debe mantener vigente la relación existente y operativa con el Registro Mercantil de Francisco Morazán, adscrito a la Cámara de Comercio e Industria de Tegucigalpa, Centro Asociado adscrito al Instituto de la Propiedad.

**Cotejo carácter por carácter.**
1. Transcripción frente al OCR de Tesseract (`spa`, `psm 6`, 400 ppi, columnas completas): **837 caracteres en ambos, con las comillas de cita, y 3 diferencias**. Las tres son una coma que el OCR lee como punto:
   - «Ley de la Propiedad**,** no obstante»;
   - «Francisco Morazán**,** adscrito»;
   - «Tegucigalpa**,** Centro Asociado».
2. Las tres se resolvieron a favor de la coma con la imagen a 220 ppi. El escaneo del TSC es de unos 148 ppi y la coma se distingue con claridad.
3. Se revisaron también contra la imagen las tildes («atención», «creación», «obligación», «común», «relación», «Morazán», «Cámara») y el epígrafe «ADMINISTRADOR DEL REGISTRO.-», que en 2016 lleva guion.

**Cambios respecto de 2010:**
- Epígrafe: de «ADMINISTRACIÓN DEL REGISTRO.» a «ADMINISTRADOR DEL REGISTRO.-».
- Administración del Registro: pasa del Registro Mercantil de Francisco Morazán al **Instituto de la Propiedad**, que puede autorizar centros asociados y **determina las tasas registrales**.
- La obligación de la base de datos común pasa del Registro al Instituto.
- Se ordena mantener la relación con el Registro Mercantil de Francisco Morazán como centro asociado de la Cámara de Comercio e Industria de Tegucigalpa.
- Se suprime «los derechos de registro deben ser lo menos costosos posible y no se pretende que éstos produzcan ingresos netos…».

**Efectos en el resto de la ley.** Ningún otro artículo nombra al administrador del Registro ni al Registro Mercantil. Lo comprobé buscando en los 86 artículos «Registro Mercantil», «Francisco Morazán», «Cámara de Comercio», «administrad*», «tasas registrales», «derechos de registro» e «Instituto de la Propiedad». El art. 83 nombra al Instituto, pero solo en el texto del art. 28 de la Ley de Propiedad que reforma. No se aprecia derogación tácita de otros artículos.

## 5. D4 · Vigencia y reformas

### 5.1 Corrección de la contradicción del cierre del PR #182

En el cierre del PR #182 y en el §6 del reporte D1 se dijo que no se había encontrado ninguna reforma del D.182-2009. **Era incorrecto.**

- **Sí existe una reforma expresa posterior a 2010:** el **art. 10 (Capítulo IV) del Decreto No. 50-2016**, publicado en La Gaceta No. 34,076 el 4-jul-2016, **sustituye el art. 47** («Administrador del Registro») y traslada la administración del Registro de Garantías Mobiliarias al Instituto de la Propiedad.
- **Quién la encontró y por qué no salió antes:** la localizó el CLO. La búsqueda web abierta no la encuentra, porque el decreto trata de la tasa vehicular y la reforma de la LGM es su último capítulo.
- **El indicio queda refutado:** se había tomado como indicio de que la ley no estaba reformada que el Acuerdo 001-2020 la citara sin «y sus reformas». Ese indicio no vale.
- El reporte D1 se refiere a la fecha del barrido; esta D4 lo sustituye.

### 5.2 Vigencia propuesta

| Texto | Vigencia | Fundamento |
|---|---|---|
| D.182-2009, arts. 1–46 y 48–86 | **VIGENTE** desde el **28-jul-2010** | art. 86: «entrará en vigencia seis (6) meses después de su publicación»; publicación del 28-ene-2010 |
| Art. 47, texto de 2016 (art. 10 del D.50-2016) | **VIGENTE** desde el **4-jul-2016** | art. 12 del D.50-2016: «a partir del día de su publicación» |
| Art. 47, texto de 2010 | **DEROGADO (sustituido)** desde el 4-jul-2016 | art. 10 del D.50-2016 |

### 5.3 Barrido 2010–2026 de otras reformas expresas

| Fuente | Resultado |
|---|---|
| Búsqueda web abierta (9 consultas: reforma, 182-2009, Registro de Garantías Mobiliarias e Instituto de la Propiedad, MIPYME e inclusión financiera, CNBS) | Solo la ley original, borradores (FELABAN) y leyes de otros países. **Tampoco encuentra el D.50-2016**, lo que muestra que este barrido no basta por sí solo |
| Buscador del catálogo del TSC («garantías mobiliarias», «182-2009») | Solo la ley y el acuerdo de cobros del Registro; el buscador no indexa el contenido de los decretos |
| TodoLegal (ficha de la ley) | La marca «Vigente», con última revisión del 01-01-2024, pero **muestra el art. 47 de 2010**: no es una edición consolidada |
| Decreto 128-2026 (3-ago-2026, readecuación de deudas) | Solo dice que las «garantías hipotecarias o mobiliarias originales permanecerán vigentes»; **no reforma** la ley |
| Decretos 155-2012 y 397-2013 (reactivación MIPYME) | No citan la ley |
| Decretos 33-2020 y 13-2021 | No citan la ley |
| Decreto 60-2023 | Reforma el art. 2 del D.50-2016 (tasa vehicular), **no** el art. 10 |
| CEDIJ (Poder Judicial) | Sin respuesta (conexión cerrada) |
| leyes.hn | Error 429 (límite de solicitudes) |

**Conclusión:** no consta otra reforma expresa del D.182-2009, pero el barrido no es exhaustivo (reserva R2).

## 6. Matriz de clasificación propuesta

**Archivos** (generados por `scripts/olas/ola15-lgm-matriz.ts`; la generación es determinista):

| Archivo | SHA-256 | Contenido |
|---|---|---|
| `matriz_clasificacion.csv` | `15bece3565e2c5c5db92f37b4e7cb1bf0d0d7ef4c3d31d159dd45dc23bed6cb4` | 87 filas: id propuesto, número, `num_articulo_norm`, versión, rol, vigencia, `es_norma_vigente`, fuente, SHA-256 y largo del texto que debe cargar el paquete, constancia y encabezado cortado |
| `constancias.csv` | `66de9c24cb12f48976b705ffaff5224f0bea0788369288277d2f12df9e658e5e` | 3 constancias (art. 47 de 2016, art. 47 de 2010 y art. 83) |
| `encabezados_cortados.csv` | `f4b4f1f8939deb8017379cc2bf0b935a47386d8c4d04df831cff34c37a7e5dd6` | 22 bloques de encabezado, con el texto verificado |
| `art47_D50-2016.txt` | `c71439bc41ddec88e3bab8e8535dc3f93bccbaa58d693864d2b3304a04d0d64a` (archivo); contenido `ba57fe64b7088ceb1fad5052b5add6b68289c1c4044d6d8d07737d14c9780d46` | texto D3 |

**Resumen de la matriz:**

| Filas | Rol | Vigencia | `es_norma_vigente` | Texto |
|---|---|---|---|---|
| Arts. 1–46 y 48–86 (85) | PRIMARY | VIGENTE | `true` | 2010 cotejado (D1 + fe de erratas, encabezados cortados) |
| Art. 47 (`…:47`) | PRIMARY | VIGENTE | `true` | 2016 (D3), con constancia `REFORMA 50-2016` |
| Art. 47 histórico (`…:47-TEXTO-2010`) | CONTEXT | DEROGADO | `false` | 2010 cotejado, con constancia `SUSTITUCION 50-2016` |
| **Total: 87** | 86 PRIMARY · 1 CONTEXT | | | |

**Identificadores:**
- **Lote:** `OLA15_LGM_2016_01` (el texto más reciente integrado es de 2016).
- **Instrumento:** `LEY_GARANTIAS_MOBILIARIAS`.
- **Id de cada fila:** `OLA15_LGM_2016_01:LEY_GARANTIAS_MOBILIARIAS:<n>`.
- **Fila histórica:** `num_articulo` = «47» y `num_articulo_norm` = **NULL**, por tres razones:
  - `paquete-ola.ts` exige que `num_articulo_norm` sea único en el lote;
  - así el resolvedor por número (`resolver_articulo_exacto`) solo devuelve el texto vigente;
  - la fila histórica solo sale como antecedente. Si apareciera, el guardián CLO la excluye por `es_norma_vigente = false` (`VIGENCIA_FALSE_EXCLUIDA`) y la búsqueda semántica solo usa filas vigentes. **Falla cerrado.**

**Art. 83:** PRIMARY vigente, con la nota de que es una norma de reforma.
- Adiciona los numerales 2), 5), 7) y 8) del art. 28 de la Ley de Propiedad.
- Su efecto ya consta en la corrección C2 (fila `OLA12_LP_2007_01:LEY_PROPIEDAD:28`, CONTEXT vigente).
- El D.50-2016 no modifica el art. 28 de la Ley de Propiedad: el nuevo art. 47 solo remite a él.

## 7. Reservas

1. **R1 · Testigo único del D.50-2016.** El texto del art. 47 de 2016 descansa en un solo escaneo oficial (TSC), nítido y cotejado carácter por carácter.
   - El segundo testigo propuesto (IAIP, `ver_archivo/MzM0NDQ4`) requiere descarga manual en el navegador por el Cloudflare.
   - Si el CLO lo guarda en OneDrive, se coteja y se anota aquí antes del pliego D1–D8.
2. **R2 · Barrido de reformas no exhaustivo.** Falta una consulta formal al **CEDIJ** (constancia de vigencia o edición consolidada) o al **índice de decretos del Congreso Nacional** (2010–2026, «Garantías Mobiliarias» y «182-2009»).
   - La vigencia de §5.2 es `TRUE_PRESUNTA`, como en la OLA 14.
   - Si aparece otra reforma, se reabre la D4 antes de cargar.
3. **R3 · Fila histórica del art. 47.** Lleva `num_articulo_norm = NULL` (§6). No requiere cambios en el código y falla cerrado, pero es la primera vez que un lote lleva dos versiones del mismo artículo. El pliego D1–D8 debe probarla en el ensayo PGlite.
4. **R4 · Artículos transitorios** (arts. 79–82 y 85).
   - El art. 85 (Reglamento y Registro en seis meses) ya agotó su efecto: el Reglamento es el Acuerdo 2074-2010.
   - Se proponen como PRIMARY vigentes, porque ninguna norma los deroga.
   - Si el CLO prefiere CONTEXT para los de efecto agotado, se ajusta la matriz.
5. **R5 · Reglamento del Registro.** El Acuerdo 2074-2010, reformado por el Acuerdo 001-2020, es otro instrumento y no forma parte de la OLA 15.
   - Ojo: varias de sus disposiciones dependen de quién administra el Registro, que cambió en 2016.
6. **R6 · Registro del instrumento en el código.** Hasta un PR posterior a la carga (como el D8 de la OLA 14), las filas de la LGM serán CONTEXT (`SIN_INSTRUMENT_ID`) en la aplicación, lo que falla cerrado.
   - Ese PR también debe añadir el lote a `verificar-firmadas.ts`.
   - Debe cubrir los casos de borde del detector pendientes (LGAP + Presupuestaria/Hacendaria/Ambiental; Reglamento según/relativo a/en virtud de/de conformidad con/aplicable a).

## 8. Decisiones para firma

| # | Decisión propuesta | Decisión del CLO |
|---|---|---|
| D1 | Texto base de 2010: `LGM_OLA15_articulado_cotejado.txt` (`84effbdb…`), aprobado el 2026-11-27, **con la fe de erratas de 4 signos** de §2 (arts. 17, 26, 52 y 56) | ☐ |
| D2 | Corte determinista de los 22 bloques de encabezados (§3), con el texto verificado de `encabezados_cortados.csv`, incluidos los arts. 79 («CAPÍTULO II») y 84 (sin «\|») | ☐ |
| D3 | Texto del art. 47 reformado por el art. 10 del D.50-2016 (§4), testigo único con la reserva R1 | ☐ |
| D4 | Vigencia de §5.2. Constancia expresa de la reforma del D.50-2016, corrección de la contradicción del PR #182 (§5.1) y reserva R2 sobre el barrido en el CEDIJ y el Congreso Nacional | ☐ |
| Matriz | 87 filas (§6): 86 PRIMARY vigentes; art. 47 de 2010 como CONTEXT derogado con `num_articulo_norm` NULL; art. 83 PRIMARY con nota; reservas R3–R6 | ☐ |

Firma: ______________________ · Abg. y Not. Fredy Omar Pinel Flores, CLO / Director Maya Lex · Fecha: __________

## 9. Reproducir

```powershell
npx tsx scripts/olas/ola15-lgm-matriz.ts
# filas 87: PRIMARY vigentes 86, CONTEXT derogados 1; encabezados cortados 21
# sha256 matriz 15bece35…; art47 2016 ba57fe64… (835 car.)
```
