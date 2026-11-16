# A04 · Plan de cierre del Decreto 35-2013 (La Gaceta 33,222) hacia staging V4

**Fecha:** 2026-11-16 · **Punto de partida:**
- procedencia institucional acreditada por el TSC (tier 4, SHA-256 `fbd87f33…`);
- C01–C06 firmadas por el CLO;
- vigencia SIN DECLARAR;
- 0 filas en ninguna base.

> Este plan no aprueba nada. Ordena el trabajo y deja cada decisión jurídica al CLO.

## 1. Lo que bloquea el texto y lo que bloquea solo sus efectos

No todos los puntos abiertos impiden cargar el **texto** del decreto. El modelo es el mismo del D.284-2013: una fila por artículo, con la transcripción cotejada (D3).

| Punto abierto | ¿Bloquea el texto del D.35-2013 (D3)? | ¿Qué bloquea entonces? |
|---|---|---|
| Pág. 41: 11 líneas con el carácter inicial ausente | **Sí**: son letras del texto | D3 |
| 88 finales de línea anómalos | **Sí**: letras finales del texto | D3 |
| C06: el carácter inicial de «11» (art. 6) | **No**: la lectura dual ya está firmada | La relación «el art. 6 reforma el art. ¿511? del Código Civil» |
| Conciliación 250/2: 54 caracteres y bloques B | **Sí, de forma indirecta**: queda absorbido por el cotejo de D3 (§2.5) | D3 |
| Arts. 134 y 141 | **No**: el art. 11 se carga tal como está impreso | Las relaciones de derogación sobre el D.73-96 |
| C07: La Gaceta 34,940 frente a 39,940 | **No**: afecta a una norma *posterior* (D.130-2017), no al texto del D.35-2013 | La vigencia actual del art. 21 de la Niñez en su versión reformada (D4) |

**Consecuencia:** el camino crítico hacia V4 es **D3**, es decir, el texto. Los arts. 134/141 y C07 pueden quedar como **relaciones pendientes**, sin impedir V4, si el CLO lo acepta en D4 y D5.

## 2. Plan por punto

### 2.1 Conseguir un segundo ejemplar (desbloquea 2.2, 2.3 y el cotejo de C06)
Criterio de aceptación:
- SHA-256 **distinto** de `fbd87f33…`;
- La Gaceta N.º 33,222 del 6-sep-2013, Sección A;
- una tabla de correspondencia de páginas con A04;
- recortes lado a lado (checklist de `FUENTES_DE_COTEJO.md`).

Accesibilidad probada desde el equipo del CLO el 16-nov-2026 (en noviembre fallaron por el proxy de la sesión en la nube, no por los servidores):

| Orden | Fuente | Prueba de hoy | Acción |
|---|---|---|---|
| 1 | **ENAG** (Empresa Nacional de Artes Gráficas, editora de La Gaceta), `www.enag.gob.hn` | HTTP 200 | Buscar o pedir la edición digital o una copia certificada del N.º 33,222. Es la fuente más directa: el editor oficial |
| 2 | **Portal Único del IAIP**, `portalunico.iaip.gob.hn` | HTTP 403 a una petición automática, que suele ser un filtro anti-robots | Probar **en el navegador** del CLO |
| 3 | **UNAH**: `www.unah.edu.hn` y `repositorio.unah.edu.hn` | 200 y sin respuesta, respectivamente | Probar el repositorio en el navegador; si no, la biblioteca de la UNAH |
| 4 | **CEDIJ**, `legislacion.poderjudicial.gob.hn` | Falla el TLS (la conexión se corta en el saludo) | Volver a probar; tier 2 si responde |
| 5 | **Ejemplar físico** (biblioteca del Congreso Nacional, de la CSJ o de la UNAH) | — | Escaneo a 400 ppp o más de las págs. 41 y 45 y de las páginas impares con borde derecho. Una copia física **es** otro ejemplar, aunque haya que registrarla como fuente distinta |

**Responsable:** el CLO, o el Bot Auditor por orden suya, descarga y entrega. Claude lo pasa por `receive-pdf.ts` con un lote nuevo y la misma delimitación (págs. 1–46, `--ultima-solo-izquierda`) y genera la tabla de correspondencia y los recortes comparativos.

### 2.2 Pág. 41: 11 líneas con el carácter inicial ausente
- **Con el segundo ejemplar:** cotejo línea por línea (P01–P11) con un recorte comparativo cada una. El CLO firma una tabla con 11 casillas.
- **Sin el segundo ejemplar (alternativa que decide el CLO):** una **resolución específica** que adopte la lectura por contexto solo cuando la palabra sea unívoca. Por ejemplo:
  - P02 «[m]ediante»;
  - P04 «[s]e oiga»;
  - P05 «[c]omprendidos»;
  - P06 «[c]ompañero(a)»;
  - P11 «[v]erbalmente».

  Cada letra adoptada queda marcada en el manifiesto de la transcripción como `LECTURA_POR_CONTEXTO_CLO`, con su recorte. **Ninguna cifra** se adopta por contexto: el «11» de C06 sigue dual.

### 2.3 88 finales de línea anómalos (borde derecho)
1. **Ahora, sin segundo ejemplar (Claude):** volver a recortar los 88 desde el PDF a la máxima resolución que admita la imagen incrustada, en vez de los 200 ppp actuales. Objetivo: reducir los 13 `PENDIENTE_LECTURA` y los 6 `ILEGIBLE_PARCIAL`. Se genera una hoja de contacto nueva.
2. **El CLO firma en bloque** los 29 `LEGIBLE`, con la hoja de contacto.
3. **Los 40 `PARCIAL_BORDE`** (se ve el comienzo de la palabra y falta su final): con el segundo ejemplar, cotejo. Sin él, el mismo tratamiento que en 2.2: solo palabras unívocas y con la marca `LECTURA_POR_CONTEXTO_CLO`.
4. **Lo que siga ilegible** se carga con la marca `[ilegible en el ejemplar]` en el texto, nunca con una palabra inventada. El artículo afectado lleva la marca `TEXTO_CON_LAGUNA` y queda como **solo contexto** (`metadata.rol = "CONTEXT"`) hasta que se coteje.

### 2.4 Arts. 134 y 141 (art. 11 del D.35-2013)
- **El texto del art. 11 se carga tal como está impreso**: «Artículos 134; los literales ch), d), e) y f) del Artículo 141». No se corrige ni se interpreta.
- **El problema es de efectos.** El 141 reformado solo tiene a), b) y c), y el consolidado A03 anota ch) y d) en el 134. Para decidir hace falta el **texto original del D.73-96** (La Gaceta 28,053, de 1996; paquete A03, pendiente).
- **Pasos:**
  1. Buscar el D.73-96 original: TSC (como con el A04), CEDIJ o ENAG.
  2. Claude prepara una tabla comparativa con el 134 y el 141 anteriores a la reforma, el 141 reformado y la nota del A03.
  3. El CLO decide los puntos (a)–(d) de `PASAJES_134_141.md`.
- **Mientras tanto:** las relaciones `DEROGA` del art. 11 sobre los arts. 134 y 141 del D.73-96 se registran como `INTERPRETACION_PENDIENTE_CLO` y no se aplican a ninguna versión del Código de la Niñez.

### 2.5 Conciliación 250/2: 54 caracteres sin atribuir y bloques B
- Esos 54 caracteres son **restos de tokens de ruido del OCR**, en el extracto bruto. La transcripción candidata no los contiene. Lo que se carga es la **candidata**, no el bruto.
- Se cierran con el mismo método que el D3 del D.284-2013:
  1. Claude genera la **lista de cotejo por artículo** (OCR del PDF frente a la candidata, sin encabezados de página y conservando los guiones) e incorpora los 467 bloques B (`intervenciones_candidata.csv`) a la lista de su artículo.
  2. El CLO coteja la candidata contra las 46 páginas, como hizo con el D.284-2013, y firma el hash.
- Con esa firma, los 54 caracteres quedan **descartados por cotejo** (no aparecen en la imagen como texto del decreto) o, si alguno resulta ser texto, se corrige la candidata y cambia su hash.

### 2.6 C07: La Gaceta 34,940 frente a 39,940 (derogación posterior del art. 21 por el D.130-2017)
- **Indicio, no prueba:** la numeración de La Gaceta iba por el 33,222 en 2013 y el 33,445 en 2014, lo que hace improbable un 39,940 en 2019. Aun así, solo decide el documento.
- **Pasos:**
  1. Obtener la publicación del **Código Penal (D.130-2017)**, que coincide con la brecha P0-005 del inventario.
  2. Leer en su art. 632 el numeral 12 y los datos de publicación y vigencia.
  3. El CLO firma la casilla de C07.
- **No bloquea V4 del texto:** en D4, el art. 21 de la Niñez en la versión del D.35-2013 se marcaría `desplazado_por` el D.130-2017, sin fecha hasta que se coteje.

## 3. Camino a staging V4 (el mismo del D.284-2013)

| Paso | Qué | Quién | Depende de |
|---|---|---|---|
| 1 | Recortes del borde derecho en alta resolución (2.3.1) y lista de cotejo por artículo (2.5.1) | Claude | — (se puede empezar ya) |
| 2 | Segundo ejemplar (2.1) | CLO o Bot Auditor | Acceso a ENAG, IAIP o UNAH |
| 3 | Cotejo y firmas de la pág. 41, los 88 finales y el cotejo de C06 (2.2 y 2.3) | CLO | 1 y, si se usa, 2 |
| 4 | Candidata definitiva y su SHA-256 **calculado sobre los bytes LF** (en este checkout de Windows, el archivo con CRLF da otro hash: usar `git show` o `C:\wtlf`). **Firma D3** | Claude → CLO | 3 |
| 5 | Catálogo: `DECRETO_35_2013` en `INSTRUMENT_IDS` y en la identidad de fuente, **bloqueado** en `INSTRUMENTOS_SOLO_CONTEXT`. PR con pruebas, como el #139 | Claude (PR) | — (en paralelo) |
| 6 | Pliego `ADJUDICACION_CLO_D35_2013.md`: D1 procedencia (TSC) · D2 identidad · D3 · D4 vigencia (art. 21 y C07) · **D5 rol** (el D.35-2013 es casi entero modificatorio: reforma la Niñez, Familia, el Código Civil y la Ley contra la Violencia Doméstica; con el criterio del D.284, los artículos que transcriben otra ley serían CONTEXT) · D6 tipo · D7 bloqueo · D8 V3→V4 | Claude redacta, el CLO firma | 4 |
| 7 | Ingesta en staging: `ingesta-lote-staging.ts --transcripcion … --transcripcion-sha256 …`, embeddings, verificación (todo oculto) | Claude genera, el Titular aplica | 6 |
| 8 | Visibilidad en staging según D4, D5 y D8 | El Titular aplica | 7 |
| 9 | PR que retira el bloqueo (D7) | Claude (PR) | 8 |

**Decisiones del CLO que conviene adelantar:**
1. ¿Se acepta la lectura por contexto **marcada** (2.2 y 2.3) si no aparece un segundo ejemplar, o se espera a tenerlo?
2. ¿Los arts. 134/141 y C07 quedan como relaciones pendientes, sin bloquear V4?
3. **D5:** casi todo el decreto transcribe texto de otras leyes. ¿Esas filas quedan como CONTEXT, como los arts. 13, 14, 26 y 27 del D.284?

## 4. Avance (2026-11-16)

| Entregable | Estado |
|---|---|
| Recortes del borde derecho (2.3.1) | **Hecho, con un límite:** el escaneo es de **200 ppp** y no existe una resolución mayor. A resolución nativa, de los 19 dudosos, **4 pasan a legibles**, **3 dejan ver más letras** y **12 siguen cortados** por el borde. Total de los 88: 33 legibles · 43 parciales · 12 ilegibles parciales · 0 pendientes. Ver `transcripcion_candidata/LISTA_COTEJO_D3_A04.md` |
| Lista de cotejo D3 por artículo (2.5.1) | **Hecha** sobre los bytes LF `977f0489…`: 19 artículos y 434 diferencias, con un script reproducible. C02–C05 y la parte «A la» de C01 están firmadas pero **aún no aplicadas** a la candidata |
| Alta de `HN:DECRETO_35_2013` en el catálogo, solo CONTEXT (paso 5) | **PR #144** |

### Actualización (2026-11-16, segunda pasada)
- **Candidata v2** con C01–C05 aplicadas: SHA-256 sobre bytes LF **`25d7cc59fe3542df3d0de666eab4a47e217ef5398fe2bae6920f683168f40685`**. Cambian 5 líneas respecto de la v1 y nada más. Aún conserva los encabezados de página.
- **Lista de cotejo regenerada sobre la v2:** 441 diferencias. El borde derecho se cuenta una sola vez por línea: 86 líneas dentro del acto (31 legibles, 43 parciales y 12 ilegibles parciales) y **2 fuera del acto** (B87 y B88, pág. 46, columna derecha, que es el acto siguiente).
