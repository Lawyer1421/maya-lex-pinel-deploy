# A04 · Paquete de resolución textual final, previo a la firma D3

**Decreto 35-2013 · La Gaceta 33,222 · PDF del TSC `fbd87f33…` · candidata v2 `25d7cc59…` (bytes LF)** · 2026-11-16

> Este paquete **no cambia la transcripción**. Reúne lo que el CLO debe resolver para que el texto quede fijado; las lecturas se aplican después de la firma (§3). Las propuestas son lecturas de Claude y no sustituyen el cotejo humano. Datos para procesar: [`RESOLUCION_TEXTUAL_A04.csv`](RESOLUCION_TEXTUAL_A04.csv), con 97 filas: 86 del borde derecho y 11 de la pág. 41.

## 1. Art. 14: el salto «330» → «332» está en el impreso

**Resultado:** la imagen de la pág. 45, columna derecha, dice **«327, 328, 329, 330, 332, 333, 334, 335…»**. **El «331» no está impreso.** No es una omisión del OCR, y la transcripción reproduce fielmente el original.

**Recortes:** `paquete-revision/recortes/p45_der_art14_tira3.png` (la línea «327…339») y, para el resto de la lista, `…tira1.png` y `…tira2.png`.

No es el único salto. La lista impresa del art. 14 tiene **16 saltos**, todos comprobados en la imagen y todos reproducidos igual en la candidata:

| Salto | Números ausentes en el impreso | Tira |
|---|---|---|
| 36 → 47 | 37–46 | 1 |
| 48 → 68 | 49–67 | 1 |
| 68 → 78 | 69–77 | 1 |
| 79 → 94 | 80–93 | 1 |
| 233 → 235 | 234 | 2 |
| 247 → 249 | 248 | 2 |
| 249 → 252 | 250, 251 | 2 |
| 260 → 262 | 261 | 2 |
| 262 → 276 | 263–275 | 2 |
| 306 → 308 | 307 | 3 |
| **330 → 332** | **331** | **3** |
| 342 → 344 | 343 | 3 |
| 396 → 398 | 397 | 3 |
| 409 → 427 | 410–426 | 3 |
| 427 → 432 | 428–431 | 3 |
| 433 → 965 | 434–964 | 3 |

Si estos saltos son una elección del legislador (artículos que no se derogan) o errores de imprenta es una **cuestión jurídica, no textual**. El texto se carga tal como está impreso. Los saltos de un solo número (234, 248, 261, 307, 331, 343 y 397) son los candidatos más claros a revisar cuando se registren las relaciones de derogación del Código Civil. **Hasta entonces no se infiere ninguna derogación de esos números.**

## 2. Tabla de resolución para la firma del CLO

**Artículos afectados y Decisión 3.** Todas las filas de esta tabla caen en los **arts. 1 a 6** del decreto. Los seis son modificatorios y transcriben texto de otras leyes:
- arts. 1–3: Código de la Niñez, D.73-96;
- arts. 4–5: Código de Familia, D.76-84;
- art. 6: Código Civil.

Por la **Decisión 3 del CLO**, esos artículos van como `CONTEXT`. Una laguna en ellos **no afecta a ninguna fila que pueda ser fundamento (PRIMARY)**, pero la laguna queda visible en el texto y en el manifiesto.

**Marcas que se registran en el manifiesto:**
- `LECTURA_DE_IMAGEN`: la letra se ve en la imagen;
- `LECTURA_POR_CONTEXTO_CLO`: la letra **no** se ve y la fija el CLO por contexto, sin tocar cifras ni nombres propios;
- `LAGUNA_DOCUMENTADA`: el texto lleva `[ilegible]`.

### A. 31 finales de línea legibles: aprobación en bloque
**26 ya coinciden** con la candidata. **5 cambian** porque la imagen corrige el token del OCR: B25 «mismo;» → «mismo,», B45 «i» → «a», B61 «afectivo;» → «afectivo:», B74 «s» → «se» y B77 «consentimiento;» → «consentimiento:».

| Id | Pág. | Art. | Final de línea en la imagen | Candidata v2 | Cambio |
|---|---:|---:|---|---|---|
| B01 | 3 | 1 | «…administradores permitir el ingreso y» → **y** | «y» | no |
| B02 | 3 | 1 | «…niñas en moteles, pensiones y» → **y** | «y» | no |
| B03 | 3 | 1 | «…de sus padres, madres o» → **o** | «o» | no |
| B08 | 5 | 1 | «…dependencias y a entregarlos a» → **a** | «a» | no |
| B25 | 9 | 1 | «…en cualquier fase del mismo;» → **mismo,** | «mismo;» | sí |
| B26 | 9 | 1 | «…comunicar por sí mismo, a» → **a** | «a» | no |
| B27 | 9 | 1 | «…Jueces diferentes, de conformidad a» → **a** | «a» | no |
| B30 | 9 | 1 | «…los procedimientos en trámite (» → **(** | «(» | no |
| B34 | 9 | 1 | «…en un término equivalente a» → **a** | «a» | no |
| B40 | 13 | 1 | «…Las Órdenes de Orientación y» → **y** | «y» | no |
| B45 | 15 | 1 | «…de Suspensión del Proceso i» → **a** | «i» | sí |
| B52 | 15 | 1 | «…Corresponde al Juez de Ejecución:» → **Ejecución:** | «Ejecución:» | no |
| B54 | 15 | 1 | «lacionado con las sanciones impuestas;» → **impuestas;** | «impuestas;» | no |
| B55 | 17 | 1 | «…veinte (20) días, contados a» → **a** | «a» | no |
| B57 | 19 | 1 | «…jurídica o se pronuncie e» → **e** | «e» | no |
| B58 | 21 | 1 | «…explicará en forma clara y» → **y** | «y» | no |
| B59 | 21 | 1 | «…determinación de la Sanción y» → **y** | «y» | no |
| B61 | 23 | 1 | «…quien mantengan un vínculo afectivo;» → **afectivo:** | «afectivo;» | sí |
| B64 | 25 | 1 | «…en la formación, supervisión y» → **y** | «y» | no |
| B65 | 25 | 1 | «…Hondureno de la Niñez y» → **y** | «y» | no |
| B66 | 26 | 1 | «…detención es Medida Cautelar o» → **o** | «o» | no |
| B68 | 29 | 3 | «…abandono en sede administrativa y» → **y** | «y» | no |
| B69 | 29 | 3 | «…y la Familia (IHNFA), a» → **a** | «a» | no |
| B71 | 31 | 3 | «…valores de respeto, responsabilidad y» → **y** | «y» | no |
| B72 | 31 | 3 | «…Niño(a) durante el mismo y» → **y** | «y» | no |
| B73 | 31 | 3 | «…referencia de cualquier ley o» → **o** | «o» | no |
| B74 | 31 | 3 | «…Nacional de Bienestar Social s» → **se** | «s» | sí |
| B75 | 31 | 4 | «…el derecho del hombre y» → **y** | «y» | no |
| B76 | 33 | 4 | «…prohibe al padre, madre o» → **o** | «o» | no |
| B77 | 35 | 4 | «imidación que vicie el consentimiento;» → **consentimiento:** | «consentimiento;» | sí |
| B86 | 40 | 5 | «…costos de su crianza y» → **y** | «y» | no |

☐ **Apruebo en bloque los 31 finales legibles** (marca `LECTURA_DE_IMAGEN`).

### B. Pág. 41 (art. 6, columna izquierda): 11 líneas con el carácter inicial ausente
Recortes: `transcripcion_candidata/recortes_borde_izq/p41_y*.jpg` y la hoja de contacto `transcripcion_candidata/hojas/hoja_borde_izq.jpg`.

**Hallazgo:** en **7 líneas, la candidata v2 ya contiene la letra que no se ve en la imagen** (P04, P05, P06 y P08–P11). La reconstrucción geométrica la reunió con letras sueltas del OCR. No cambia el texto, pero **también debe quedar registrada** como `LECTURA_POR_CONTEXTO_CLO`: si el CLO marca «laguna», la letra se quita. **3 líneas cambian** (P02 «íediante», P03 «uales» y P07 «íconocida»). **P01** es la cifra «11» (C06, lectura dual firmada) y no se toca.

| Id | y (pt) | Se ve en la imagen | Candidata v2 | Propuesta | Cambio en la candidata | Decisión |
|---|---:|---|---|---|---|---|
| P01 | 484 | «11,» | «11,» | **—** | no | — (C06) |
| P02 | 500 | «nediante (media «m»)» | «íediante» | **mediante** | sí | ☐ Aprobar ☐ Laguna |
| P03 | 517 | «uales» | «uales» | **cuales** | sí | ☐ Aprobar ☐ Laguna |
| P04 | 564 | «e oiga» | «se oiga» | **se** | no (ya la trae) | ☐ Aprobar ☐ Laguna |
| P05 | 582 | «omprendidos(as)» | «comprendidos(as)» | **comprendidos(as)** | no (ya la trae) | ☐ Aprobar ☐ Laguna |
| P06 | 598 | «ompañero(a)» | «compañero(a)» | **compañero(a)** | no (ya la trae) | ☐ Aprobar ☐ Laguna |
| P07 | 615 | «econocida» | «íconocida» | **reconocida** | sí | ☐ Aprobar ☐ Laguna |
| P08 | 631 | «dad.» | «de edad.» | **edad** | no (ya la trae) | ☐ Aprobar ☐ Laguna |
| P09 | 647 | «us parientes» | «oídos sus parientes» | **sus** | no (ya la trae) | ☐ Aprobar ☐ Laguna |
| P10 | 698 | «os colaterales» | «a los colaterales» | **los** | no (ya la trae) | ☐ Aprobar ☐ Laguna |
| P11 | 746 | «erbalmente» | «verbalmente» | **verbalmente** | no (ya la trae) | ☐ Aprobar ☐ Laguna |

### C. 43 finales de línea parciales (se ve el comienzo de la palabra)
**39 con propuesta unívoca** (`LECTURA_POR_CONTEXTO_CLO`). La candidata v2 conserva en todos el token defectuoso del OCR, así que **los 39 cambian el texto** si se aprueban.

| Id | Pág. | Art. | Contexto (OCR) | Se ve | Candidata v2 | Propuesta | Decisión |
|---|---:|---:|---|---|---|---|---|
| B04 | 3 | 1 | …impuso la sanción, dentro d( ⏎ los tres (3) | «de» | «d(» | **de** | ☐ Aprobar ☐ Laguna |
| B05 | 5 | 1 | …143.- Los(as) Directores(as) de lo; ⏎ hospitales públicos y | «los» | «lo;» | **los** | ☐ Aprobar ☐ Laguna |
| B06 | 5 | 1 | …y de los demás Centro: ⏎ Asistenciales, están obligados | «Centros» | «Centro:» | **Centros** | ☐ Aprobar ☐ Laguna |
| B07 | 5 | 1 | …a informar sobre los niños; ⏎ niñas abandonados en | «y» | «niños;» | **niños y** | ☐ Aprobar ☐ Laguna |
| B09 | 5 | 1 | …Los(as) jefes de las misione: ⏎ diplomáticas y consulares | «misiones» | «misione:» | **misiones** | ☐ Aprobar ☐ Laguna |
| B10 | 5 | 1 | …o niña hondureño(a) ha sid( ⏎ privado de su | «sido» | «sid(» | **sido** | ☐ Aprobar ☐ Laguna |
| B11 | 5 | 1 | …hayan producido y en s ⏎ caso el IHNFA | «su» | «s» | **su** | ☐ Aprobar ☐ Laguna |
| B12 | 5 | 1 | …gestiones necesarias a fin d ⏎ lograr su repatriación." | «de» | «d» | **de** | ☐ Aprobar ☐ Laguna |
| B13 | 5 | 1 | …valor más alto, la qu< ⏎ impondrá el titular | «que» | «qu<» | **que** | ☐ Aprobar ☐ Laguna |
| B14 | 5 | 1 | …institución a quien corresponda. L ⏎ indicada multa se | «La» | «L» | **La** | ☐ Aprobar ☐ Laguna |
| B15 | 5 | 1 | …causales de las situaciones d ⏎ abandono y de | «de» | «d» | **de** | ☐ Aprobar ☐ Laguna |
| B16 | 5 | 1 | …derechos de la niñez e ⏎ sede administrativa. | «en» | «e» | **en** | ☐ Aprobar ☐ Laguna |
| B18 | 7 | 1 | …niña el goce de su< ⏎ derechos. | «sus» | «su<» | **sus** | ☐ Aprobar ☐ Laguna |
| B19 | 7 | 1 | …ejercicio de sus libertades; e ⏎ derecho a la | «el» | «e» | **el** | ☐ Aprobar ☐ Laguna |
| B21 | 7 | 1 | …la incomunicación rechazante; y e ⏎ castigo por medio | «el» | «e» | **el** | ☐ Aprobar ☐ Laguna |
| B22 | 7 | 1 | …inmediatamente la correspondiente denuncia a ⏎ Ministerio Público, para | «al» | «a» | **al** | ☐ Aprobar ☐ Laguna |
| B23 | 7 | 1 | …Familia (IHNFA), con multa d ⏎ uno (1) a | «de» | «d» | **de** | ☐ Aprobar ☐ Laguna |
| B28 | 9 | 1 | …responsabilidad a los funcionarios > ⏎ empleados judiciales, administrativos | «y» | «>» | **y** | ☐ Aprobar ☐ Laguna |
| B31 | 9 | 1 | …de sanciones, salvo los necesario: ⏎ para los fines | «necesarios + signo final dudoso» | «necesario:» | **necesarios** | ☐ Aprobar ☐ Laguna |
| B35 | 9 | 1 | …a ocho (8) años, plaz> ⏎ que cuando se | «plazo» | «plaz>» | **plazo** | ☐ Aprobar ☐ Laguna |
| B36 | 11 | 1 | …efectos de éste Código, U ⏎ medida prevista en | «la» | «U» | **la** | ☐ Aprobar ☐ Laguna |
| B37 | 11 | 1 | …vida, la integridad personal, U ⏎ libertad personal o | «la» | «U» | **la** | ☐ Aprobar ☐ Laguna |
| B38 | 11 | 1 | …fuga u obstrucción de k ⏎ investigación. | «la» | «k» | **la** | ☐ Aprobar ☐ Laguna |
| B39 | 11 | 1 | …Fiscal fundamentará la solicitud d ⏎ a Medidas y, | «de» | «d» | **de** | ☐ Aprobar ☐ Laguna |
| B41 | 13 | 1 | …y reinserción social de E ⏎ Niño(a). | «El» | «E» | **El** | ☐ Aprobar ☐ Laguna |
| B42 | 13 | 1 | …Privación de Libertad es d ⏎ carácter excepcional, la | «de» | «d» | **de** | ☐ Aprobar ☐ Laguna |
| B43 | 13 | 1 | …su domicilio y con s ⏎ familia. | «su» | «s» | **su** | ☐ Aprobar ☐ Laguna |
| B44 | 13 | 1 | …domicilio, se practicará en l ⏎ casa de cualquier | «la» | «l» | **la** | ☐ Aprobar ☐ Laguna |
| B46 | 15 | 1 | …así como resolver sobre f ⏎ revocación de la | «la» | «f» | **la** | ☐ Aprobar ☐ Laguna |
| B47 | 15 | 1 | …la acción penal o h ⏎ reanudación del Proceso | «la» | «h» | **la** | ☐ Aprobar ☐ Laguna |
| B48 | 15 | 1 | …de las formas alternativas d< ⏎ solución de conflictos | «de» | «d<» | **de** | ☐ Aprobar ☐ Laguna |
| B49 | 15 | 1 | …Juicio y resolver los asunto: ⏎ sometidos a su | «asuntos» | «asunto:» | **asuntos** | ☐ Aprobar ☐ Laguna |
| B50 | 15 | 1 | …responsabilidad penal o inocencia d< ⏎ Niños(as) en Proceso; | «de» | «d<» | **de** | ☐ Aprobar ☐ Laguna |
| B51 | 15 | 1 | …en este Código, la proporcionalida< ⏎ y racionalidad de | «proporcionalidad» | «proporcionalida<» | **proporcionalidad** | ☐ Aprobar ☐ Laguna |
| B53 | 15 | 1 | …ser contrarias al proceso d ⏎ reinserción social; | «de» | «d» | **de** | ☐ Aprobar ☐ Laguna |
| B56 | 19 | 1 | …acusador privado, la ausencia d ⏎ este último no | «de» | «d» | **de** | ☐ Aprobar ☐ Laguna |
| B67 | 27 | 2 | …I el Capítulo IV; l ⏎ denominación del Título | «la» | «l» | **la** | ☐ Aprobar ☐ Laguna |
| B78 | 37 | 5 | …el caso de los(as) niños(a< ⏎ el indígenas y | «niños(as…» | «niños(a<» | **niños(as)** | ☐ Aprobar ☐ Laguna |
| B85 | 37 | 5 | …ingreso de niño(s) o niña( ⏎ por adoptar, al | «niña(s…» | «niña(» | **niña(s)** | ☐ Aprobar ☐ Laguna |

**4 sin propuesta: decide el CLO.** Tres caen dentro de un nombre propio y en el otro la lectura no es unívoca.

| Id | Pág. | Art. | Contexto (OCR) | Por qué no hay propuesta | Decisión |
|---|---:|---:|---|---|---|
| B24 | 7 | 1 | …Hondureno de la Niñez y ⏎ y Familia (IHNFA), | No se propone: dentro del nombre «Instituto Hondureño de la Niñez y la Familia» | ☐ Lectura: ______ ☐ Laguna |
| B33 | 9 | 1 | …este Código y el Códig< ⏎ Procesal Penal conceden | No se propone: dentro del nombre de una ley («Código Procesal Penal») | ☐ Lectura: ______ ☐ Laguna |
| B63 | 23 | 1 | …que se le garantice u ⏎ rápida respuesta; | No unívoca: «…se le garantice u[…] rápida respuesta»: «una» por concordancia, pero el revisor leyó «un» y lo cortado podría ser cualquiera de los dos | ☐ Lectura: ______ ☐ Laguna |
| B84 | 37 | 5 | …Hondureno de la Niñez y ⏎ Familia (IHNFA) ordenando | No se propone: dentro del nombre «Instituto Hondureño de la Niñez y la Familia» | ☐ Lectura: ______ ☐ Laguna |

### D. 12 ilegibles parciales: laguna documentada `[ilegible]`
En los 12 solo se ve la primera letra de la palabra final; el resto lo cortó el borde del escaneo. No se pueden recuperar de este ejemplar (200 ppp, sin resolución mayor). **En el texto, la palabra entera se sustituye por `[ilegible]`**: la primera letra visible no basta para fijarla («c…» puede ser «o» cortada).

| Id | Pág. | Art. | Contexto (OCR) | Se ve | En el texto | Recorte |
|---|---:|---:|---|---|---|---|
| B17 | 7 | 1 | …no, como medidas disciplinarias c ⏎ correctivas, que tiendan | «c…» | `[ilegible]` | `recortes_borde_derecho_nativo/B17_p07_nativo.png` |
| B20 | 7 | 1 | …someterle a procedimientos médicos c ⏎ quirúrgicos innecesarios que | «c…» | `[ilegible]` | `recortes_borde_derecho_nativo/B20_p07_nativo.png` |
| B29 | 9 | 1 | …abusado de su autoridad c ⏎ vulnerado sus derechos; | «c…» | `[ilegible]` | `recortes_borde_derecho_nativo/B29_p09_nativo.png` |
| B32 | 9 | 1 | …Corresponde al Ministerio Público e ⏎ ejercicio de la | «e…» | `[ilegible]` | `recortes_borde_derecho_nativo/B32_p09_nativo.png` |
| B60 | 23 | 1 | …Garantías y Derechos establecidos e ⏎ este Código y | «e…» | `[ilegible]` | `recortes_borde_derecho_nativo/B60_p23_nativo.png` |
| B62 | 23 | 1 | …en condiciones que garanticen s ⏎ adecuado desarrollo físico | «s…» | `[ilegible]` | `recortes_borde_derecho_nativo/B62_p23_nativo.png` |
| B70 | 29 | 3 | …para declarar el abandono e ⏎ sede administrativa, así | «e…» | `[ilegible]` | `recortes_borde_derecho_nativo/B70_p29_nativo.png` |
| B79 | 37 | 5 | …descendientes(as) se preferirá para s ⏎ adopción a personas | «s…» | `[ilegible]` | `recortes_borde_derecho_nativo/B79_p37_nativo.png` |
| B80 | 37 | 5 | …usos y costumbres de s ⏎ identidad, en cuanto | «s…» | `[ilegible]` | `recortes_borde_derecho_nativo/B80_p37_nativo.png` |
| B81 | 37 | 5 | …a fin de que s ⏎ les informe de | «s…» | `[ilegible]` | `recortes_borde_derecho_nativo/B81_p37_nativo.png` |
| B82 | 37 | 5 | …que den su consentimiento d ⏎ dar a sus | «d…» | `[ilegible]` | `recortes_borde_derecho_nativo/B82_p37_nativo.png` |
| B83 | 37 | 5 | …sea exclusiva de uno d ⏎ los padres, bastará | «d…» | `[ilegible]` | `recortes_borde_derecho_nativo/B83_p37_nativo.png` |

**Artículos afectados por lagunas:** art. 1 (6: B17, B20, B29, B32, B60 y B62), art. 3 (1: B70) y art. 5 (5: B79–B83). Los tres son `CONTEXT` por la Decisión 3.

**Otros pasajes ilegibles:** no hay otros fuera de esta tabla. La pág. 45 no tiene caracteres ausentes en la imagen (`01_INVENTARIO_PASAJES_ILEGIBLES.md`), y el carácter inicial de «11» (P01, C06) está resuelto como lectura dual, no como laguna. **Fuera del acto:** B87 y B88 (pág. 46, columna derecha) no son del D.35-2013 y no entran.

☐ **Apruebo marcar como laguna documentada los 12 ilegibles parciales.**

## 3. Secuencia para fijar el texto y obtener el hash final D3

Cada paso parte del resultado del anterior. Todos los hashes se calculan **sobre bytes LF**: en el checkout de Windows se usa `git show` o `C:\wtlf`, nunca el archivo CRLF del árbol de trabajo.

| # | Paso | Herramienta | Resultado |
|---:|---|---|---|
| 1 | El CLO marca la tabla del §2 (A en bloque; B, C y D fila por fila) y firma | — | Decisiones registradas en este documento y en el CSV |
| 2 | Convertir las filas aprobadas en `correcciones_cotejo_resolucion.json`: cada `buscar` incluye el token y el comienzo de la línea siguiente, para que aparezca **exactamente una vez**; las lagunas como `[ilegible]`; las 7 letras de la pág. 41 que ya están, solo como registro (o quitadas si el CLO marca laguna) | Claude | JSON de correcciones, revisable |
| 3 | Aplicar el JSON a la **v2** (`25d7cc59…`) con `aplicarCorrecciones` | `transcripcion-gaceta.ts` | **v3**: texto fijado, con encabezados, y su hash |
| 4 | **Quitar los encabezados de página** de la v3: «La Gaceta», «REPÚBLICA DE HONDURAS - TEGUC…», «Sección A Acuerdos y Leyes», la fecha, «No. 33,222» y «A. NN», incluidas sus variantes espaciadas y partidas («L a Gaceta», «R E P U B L I C A…»). Como `patronesEncabezado` solo reconoce las formas del D.284, **antes hay que ampliarlo con las variantes espaciadas, con prueba (PR)**. Cada línea quitada se registra en el manifiesto con su número | `transcripcion-gaceta.ts` (ampliado) | **v4**, sin encabezados |
| 5 | **Quitar la cabecera y el sumario de la pág. 1**: la historia del Diario Oficial, «SUMARIO», la lista de decretos de la edición y el bloque del Poder Ejecutivo. Quedaron intercalados entre «DECRETA:» y el art. 1 por el orden de columnas. Se quitan como **un rango de líneas declarado** y registrado, nunca por patrón | Claude, con un rango que el CLO aprueba | **v5** |
| 6 | **Comprobaciones:** 0 líneas de encabezado residuales (el mismo filtro de `generar_lista_cotejo_d3.py`); los 19 artículos en serie; conciliación de caracteres v2 → v5 (lo quitado = encabezados + sumario + cambios del JSON); 0 `\r`; el texto termina en «Por Tanto: Ejecútese» o en la última firma del acto | Claude | Informe de conciliación |
| 7 | **Hash final definitivo: SHA-256 de la v5 sobre bytes LF** (y el mismo del blob de git) | `sha256sum` / `git show` | **Hash D3** |
| 8 | Regenerar la lista de cotejo sobre la v5 y hacer el **cotejo visual** de los 19 artículos contra las 46 páginas | `generar_lista_cotejo_d3.py` + CLO | Firma D3 sobre el hash del paso 7 |

**Por qué en este orden:**
- las correcciones van **antes** de quitar los encabezados porque cada `buscar` se escribió sobre la v2 y sus líneas, ya revisadas;
- los encabezados se quitan **antes** del sumario porque el rango del sumario se declara sobre el texto ya limpio, que es más corto y más fácil de revisar;
- el hash se calcula **una sola vez, al final**. Cualquier cambio posterior obliga a repetir los pasos 6 a 8.

## Firma del CLO

Firmante: ______________________ · Rol: ☐ abogado_revisor_senior ☐ propietario_despacho · Fecha: ____-__-__
