# A04 · D.35-2013 · Resolución textual complementaria (previa a la v6 y a la firma D3)

**Estado: FIRMADA por el CLO el 2026-11-16 (aprobación completa, §7) y APLICADA: v6 `7c8f40f844cc30f28f7bf6448151e995ed2df88bc3050a6f5b252a39709ce084`.** La v5 (`fa47cc72…`) queda sustituida y la firma D3 se asienta sobre la v6 (`transcripcion_candidata/LISTA_COTEJO_D3_A04.md`).

| Dato | Valor |
|---|---|
| Base | v5 `A04_transcripcion_candidata_v5.txt`, SHA-256 (bytes LF) `fa47cc72000a34c4dc56acc9af4ee53b32cc359f72202e4cddd56e0ca78c5b0e` |
| PDF de cotejo | TSC, `FBD87F33…F2FF`, 46 págs., escaneo de 200 ppp (el oficial, sin otra resolución) |
| Tabla | `RESOLUCION_COMPLEMENTARIA_A04.csv`: **464 cambios en 436 líneas** (K001–K464), con columna `decision_clo` vacía |
| Correcciones (formato `aplicarCorrecciones`) | `transcripcion_candidata/correcciones_cotejo_complementaria.json`: 436, una por línea, cada `buscar` único en el orden de aplicación |
| Recortes | `transcripcion_candidata/recortes_complementaria/`: 57 hojas por página (cada fila: «antes / después» y el renglón del PDF a 200 ppp) y `coordenadas.json` (orden `pdftoppm` de cada línea) |
| v6 definitiva | 176 506 caracteres · SHA-256 (LF) `7c8f40f844cc30f28f7bf6448151e995ed2df88bc3050a6f5b252a39709ce084` · generada tras la firma (`aplicar_correcciones_complementaria.ts`), coincide con la prevista |
| Reproducible | `python -I -X utf8 transcripcion_candidata/construir_correcciones_complementaria.py <v5 LF> <v3 LF>` (se detiene si la base no es `fa47cc72…` o si un texto esperado no está en su línea) |

## 1. Por qué existe esta tabla

La lista de cotejo D3 solo mostraba las diferencias **OCR ≠ candidata**. Un defecto que el OCR y la candidata compartían no aparecía en ella. El barrido de las 46 páginas encontró estas clases de defectos:

1. **Error mío en la pág. 41 (G1).** Las siete lecturas P04–P06 y P08–P11 que el CLO aprobó el 2026-11-16 no se aplicaron. Informé que la candidata «ya las contenía», pero la búsqueda encontró el pasaje idéntico del art. 332-A (art. 5), no el art. 37 del Código Civil (art. 6).
2. **El borde derecho de las páginas impares (G3), el defecto más grande.** El inventario tenía 629 líneas, pero solo se resolvieron las 88 con final anómalo. En `FUENTES_DE_COTEJO.md` el resto figuraba como «luego el resto del inventario de 629 líneas». Quedaron en el texto palabras cortadas como «cuand», «Honduren», «debiend», «Famili», «aq», «madure».
3. **El canal entre columnas (G4).** El OCR pegó la última palabra justificada de la columna izquierda («de», «el», «o», «y», «la») al comienzo de la línea vecina de la columna derecha, o la dejó como línea suelta. En la imagen esa palabra está impresa en el canal, al final de la línea izquierda.
4. Otros defectos:
   - el borde izquierdo de la pág. 45 (G2);
   - errores sueltos del OCR (G5);
   - la ñ y las tildes perdidas (G6);
   - las letras espaciadas (G7);
   - el ruido (G8);
   - el encabezado y el recuadro editorial (G9);
   - el pie cortado de la pág. 36 (G10).

**Método.** Cada línea afectada se ubicó en la capa de texto de su página. Luego se comparó con el recorte nativo a 200 ppp, en las hojas de `recortes_complementaria/`. En las págs. 39, 41, 43 y 45 (`/Rotate 180`) las coordenadas se pasaron a las de la imagen. Las lecturas son mías. No hay segundo ejemplar, así que ninguna está cotejada con otro.

## 2. La tabla, por grupos

| Grupo | IDs | Cambios | Arts. | Págs. | Qué se corrige | Marca |
|---|---|---|---|---|---|---|
| **G1** | K001–K007 | 7 | 6 | 41 | «3 oiga», «omprendidos», «ompañero», «iad.», «as parientes», «>s colaterales», «erbalmente» → «se oiga», «comprendidos», «compañero», «edad.», «sus parientes», «los colaterales», «verbalmente» | LECTURA_POR_CONTEXTO_CLO (**ya aprobadas**) |
| **G2** | K008–K014 | 7 | 11–13 | 45 | «:ontentivo», «\DOLESCENCIA», «leí Decreto Nq.73-96», «iel Código», «I I I», «3 rimera», «\o. 76-84» | LECTURA_DE_IMAGEN |
| **G3** | K015–K211 | 197 | 1, 3, 4, 5 | impares 3–37 | Finales cortados por el borde («cuand» → «cuando», «Honduren» → «Hondureño», «aq» → «aquí»). La letra se ve en parte en el recorte; **4 casos** sin letra visible van aparte (§3.2) | LECTURA_DE_IMAGEN (193) · LECTURA_POR_CONTEXTO_CLO (4) |
| **G4** | K212–K250 | 39 | 1, 3, 5 | 5, 7, 23, 29, 37 | 20 palabras del canal pasan al final de su línea izquierda. Se quitan de la línea derecha (15) o se borra la línea suelta «o» / «la» (4) | REUBICACION_CANAL |
| **G5** | K251–K282 | 32 | varios | varias | Lo que la v5 tenía como «sn adelante», «treinta (3 0)», «Reformarlos», «MinisterioPúblico», «IFLNFA», «aelministrativamenteporel», «laconciliación», «Suj eto», «temiina», «dimnto», «fonnación», «187-Ay280-», «mtimidación» y «eravar los bienes de los hiiosí…» queda como «en adelante», «treinta (30)», «Reformar los», «Ministerio Público», «IHNFA», «administrativamente por el», «la conciliación», «Sujeto», «termina», «difunto», «formación», «187-A y 280-», «intimidación» y «gravar los bienes de los hijos(as) sujetos(as)» | LECTURA_DE_IMAGEN |
| **G6** | K283–K402 | 120 | varios | 2–46 | «Hondureno/hondurenos/hondurenas» → con ñ (66, cotejadas una por una) · «Se prohibe» → «Se prohíbe» (10) · 33 rótulos «ARTICULO» / «A R T I C U L O» → «ARTÍCULO» · 11 títulos («SECCION», «SITUACION», «CODIGO»…) con tilde | LECTURA_DE_IMAGEN |
| **G7** | K403–K432 | 30 | varios | 1, 2, 27–46 | Letras espaciadas por el OCR («D E C R E T O», «C I V I L», «L E G A L I D A D», «R I G O B E R T O CHANG C A S T I L L O»). Solo se unen las letras, sin cambiar ninguna | LECTURA_DE_IMAGEN |
| **G8** | K433–K443 | 11 | 1, 2, 4, 5, 15 | varias | Manchas «•», «-», «• 0» y «o» sueltas, y «•» dentro o delante de un renglón. Si separaban párrafos queda la línea en blanco; si no, se borra la línea | RUIDO_DE_ESCANEO |
| **G9** | K444–K462 | 19 | 1, 6 | 2, 10, 41 | El recuadro editorial de La Gaceta de la pág. 2 («La (faceta», «DIARIO OFICIAL…», gerencia, E.N.A.G., teléfonos, 17 líneas) estaba **intercalado en el art. 32 del Código de la Niñez** (art. 1 del decreto). También «Sección Á Acuerdos y Leyes» (pág. 10) y «cuerdos y Leyes» (pág. 41) | ENCABEZADO_RESIDUAL |
| **G10** | K463–K464 | 2 | 4, 5 | 36 | Los dos últimos renglones de la pág. 36, cortados por el borde inferior (§3.3) | LECTURA_DE_IMAGEN_PARCIAL |

**Lo que NO cambia:**
- Las 15 lagunas `[ilegible]` firmadas el 2026-11-16 (véase la observación del §4).
- Las 66 resoluciones de `03_RESOLUCION_TEXTUAL_A04.md`.
- Los 16 saltos impresos del art. 14.
- Los dos rangos de la cabecera de la pág. 1.
- Ninguna cifra, salvo «(3 0)» → «(30)», que es un espacio del OCR. Tampoco ningún nombre propio, salvo que se unen sus letras espaciadas.

## 3. Casos que se firman uno por uno

### 3.1 G1: aplicar lo ya aprobado
P04–P06 y P08–P11 ya están firmadas. Esta casilla solo autoriza **aplicarlas en el lugar correcto**: el art. 6, pág. 41, líneas v5 3831–3842.

### 3.2 G3: la letra final no se ve (LECTURA_POR_CONTEXTO_CLO)
| ID | Línea v5 | Pág. | Art. | Dice la v5 | Propuesta | Qué se ve |
|---|---|---|---|---|---|---|
| K024 | 391 | 5 | 1 | «…de los hechos y 1» | «…y **le**» | «l»; la «e» está cortada («y le brindarán») |
| K131 | 2130 | 23 | 1 | «…sus derechos a te» | «…a **las**» | «a l»; sigue «personas o funcionarios» |
| K160 | 2701 | 29 | 3 | «…administrativa y» | «…y **al**» | «y a»; sigue «Instituto Hondureño» |
| K209 | 3501 | 37 | 5 | «…el personal técnico» | «…técnico **y**» | nada; sigue «profesional de la institución» |

### 3.3 G10: pie de la pág. 36 (LECTURA_DE_IMAGEN_PARCIAL)
Se ve la mitad superior de las letras del último renglón de cada columna. La lectura es inequívoca, pero se marca aparte.

| ID | Línea v5 | Art. | Dice la v5 | Propuesta |
|---|---|---|---|---|
| K463 | 3359 | 4 (art. 331 del Código de Familia) | «11™» | «bajando del tronco a los(las) otros(as) parientes, se llama» |
| K464 | 3408 | 5 (art. 120-B) | «d e r\V>1i ( T Q í > i n n o r» | «de las obligaciones legales derivadas de la adopción;» |

## 4. Observación sobre las lagunas (sin propuesta)
En los recortes nativos, varias de las 15 lagunas firmadas como `[ilegible]` dejan ver la primera letra de la palabra cortada:
- «su autoridad o», L783;
- «Público e», L799;
- «garanticen s», L2142;
- «garantice un», L2154;
- «para s», L3466.

Las lagunas son decisión firmada del CLO y esta tabla **no las toca**. Si el CLO quiere reabrir alguna, se trata como B24, con una rectificación expresa.

## 5. Segmentación para la ingesta (mismo PR)
El segmentador general partía el decreto en 18 filas:
- separaba el «ARTÍCULO 973.-» del Código Civil, transcrito en el art. 6;
- fundía los arts. 18 y 19 (rótulo «A R T I C U L O») dentro del 17.

`segmentarSerieCorrelativa(texto, 19)` (en `lib/legal-os/corpus-factory/staging.ts`) solo abre un artículo con el **siguiente** número de la serie del decreto, al comienzo de línea y sin comilla. Acepta el rótulo espaciado y lanza un error si la serie no está completa.

En la ingesta se usa con `--serie-correlativa 19` en `scripts/ingesta-lote-staging.ts`. Sin la opción el comportamiento no cambia: el D.284-2013 sigue dando sus 39 filas con los mismos hashes.

Lo cubre `tests/segmentacion-serie-correlativa.test.ts`: 19 artículos (1–19) sobre la v5 y la v6 prevista, y el D.284 sin cambios.

## 6. Después de la firma
1. Aplicar `correcciones_cotejo_complementaria.json` a la v5 con `aplicarCorrecciones`, para obtener la **v6**. El hash debe coincidir con `7c8f40f8…` si se firma todo tal cual. Si el CLO cambia o rechaza una casilla, se regenera la tabla y el hash cambia.
2. Regenerar la lista de cotejo D3 sobre la v6. La **firma D3** se asienta sobre el hash de la v6.
3. `receive-pdf --revisado` para pasar el A04 a CLO_PENDING.
4. Redactar el pliego D1–D8 de `HN:DECRETO_35_2013` y preparar el SQL de staging, en el orden de D7: primero la ingesta, luego la visibilidad y por último `clo-guards.ts`. V4→V5 queda sin firmar.

## 7. Hoja de firma (CLO)

| Casilla | Alcance | Decisión |
|---|---|---|
| G1 | Aplicar en el art. 6 las 7 lecturas ya aprobadas (K001–K007) | ☒ Aprobado |
| G2 | Borde izquierdo de la pág. 45 (K008–K014) | ☒ Aprobado en bloque |
| G3 | Finales del borde derecho con letra visible (193 casos, K015–K211 salvo los 4 de §3.2) | ☒ Aprobado en bloque |
| G3-CTX | K024 «le» · K131 «las» · K160 «al» · K209 «y» (LECTURA_POR_CONTEXTO_CLO) | ☒ K024 ☒ K131 ☒ K160 ☒ K209 (aprobación expresa de los cuatro) |
| G4 | Reubicación de las palabras del canal (K212–K250) | ☒ Aprobado en bloque |
| G5 | Errores sueltos del OCR (K251–K282) | ☒ Aprobado en bloque |
| G6 | Ñ y tildes (K283–K402) | ☒ Aprobado en bloque |
| G7 | Unir letras espaciadas (K403–K432) | ☒ Aprobado en bloque |
| G8 | Ruido del escaneo (K433–K443) | ☒ Aprobado en bloque |
| G9 | Quitar el recuadro editorial de La Gaceta de la pág. 2 y los dos encabezados residuales (K444–K462) | ☒ Aprobado |
| G10 | Pie de la pág. 36 (K463 y K464) | ☒ K463 ☒ K464 (aprobación expresa de los dos) |
| Lagunas | Las 15 lagunas `[ilegible]` firmadas el 2026-11-16 | ☒ Se mantienen intactas (sin reapertura) |

**Resultado:** 464 de 464 casillas aprobadas (458 en bloque y 6 expresas), sin excepciones. Constan en la columna `decision_clo` de `RESOLUCION_COMPLEMENTARIA_A04.csv`.

Firma: **Abg. y Not. Fredy Omar Pinel Flores** · Rol: **propietario_despacho** (CLO / Director Maya Lex) · Fecha: **2026-11-16**
