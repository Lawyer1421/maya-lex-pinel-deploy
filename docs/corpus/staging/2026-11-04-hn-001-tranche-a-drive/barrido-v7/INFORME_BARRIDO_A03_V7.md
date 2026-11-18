# A03 · Primer barrido de calidad: 302 artículos del consolidado frente a la v7 del D. 35-2013

**Fecha:** 2026-11-18 · **Estado de A03:** `SOURCE_HOLD` (procedencia no acreditada; D1–D3 sin firmar) · **Alcance:** solo lectura y comparación. **No se escribió en ninguna base** y no se decide nada: cada fila es una propuesta para revisión del CLO.

## 1. Entradas (todas con hash)

| Entrada | Huella | Uso |
|---|---|---|
| A03 consolidado («Actualizado al Nuevo Código Penal», 107 págs.) | bytes `bd11567310af…`, texto `67116d82003f…` | Texto que se revisa. Segmentado con `segmentarArticulos`: **reproduce los 302 artículos y sus 302 sha256 del candidato** (153 notas aparte) |
| v7 del D. 35-2013 (firma D3 del 2026-11-18) | `460e493db5e97a9dba53345010281dc338642edee525b6cfbc9fee2f3ddab023` | Referencia para lo que el decreto **reforma** (art. 1: **123** artículos), **adiciona** (art. 3: **14**) y **deroga** (art. 11, según la resolución del CLO del 2026-11-18) |
| D. 73-96 original (`.doc` del Poder Judicial, © 1997) | archivo `15e3875d…`; texto extraído `44c5fbe1…` (288 artículos) | **Solo orientativo** (`DISCOVERY_ONLY`), para los artículos que el D. 35-2013 no tocó |
| `segmentos.json` intermedio (en `out/`, no versionado) | `93d8d227790f…` | Salida de `exportar_segmentos.ts` |
| **Resultado:** [`barrido_a03_v7.csv`](barrido_a03_v7.csv) | **`fb793f1c0a652fc425e3b50effe2d3d56d51e47570a69169b557eaf5e9ff0d46`** | 302 filas, una por artículo de A03; ningún artículo de la v7 falta en A03 |

**Reproducción** (raíz del repo):
```sh
npx tsx docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/barrido-v7/exportar_segmentos.ts out/barrido-a03/segmentos.json
python -I docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/barrido-v7/barrido_a03_v7.py out/barrido-a03/segmentos.json docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/barrido-v7/barrido_a03_v7.csv <texto_d73_96.txt>
```

## 2. Método

**1. Clasificación por lo que dispone el D. 35-2013 (v7):** reforma (art. 1), adiciona (art. 3), deroga (art. 11: arts. 62–82, 134 íntegro, 170 y 171) o no lo toca. El art. 21 lleva un trato aparte (C07).

**2. Normalización antes de comparar.** Se eliminan los elementos que no son texto del artículo:
- el número de llamada de la nota al pie que A03 deja al comienzo del artículo;
- el pie de página «www.poderjudicial.gob.hn», que la extracción de A03 mete en el texto de 100 artículos;
- los rótulos de la división siguiente que el segmentador deja al final («SECCIÓN…», «CAPÍTULO…»);
- los guiones de fin de renglón.

**3. Estados:**

| Estado | Significado |
|---|---|
| `IDENTICO` | Igual tras normalizar espacios y comillas |
| `IGUAL_SALVO_FORMATO` | Solo cambian mayúsculas, tildes o puntuación |
| `DIFIERE_MENOR` | Similitud de palabras ≥ 0,97, medida sin mayúsculas, tildes ni puntuación |
| `DIFIERE` | Similitud de palabras < 0,97 |

La columna `diferencias` muestra los tres primeros cambios con el texto real.

**4. Artículos no tocados por el D. 35-2013:** se comparan con el texto de 1996, con el prefijo `ORIENTATIVO_`. En 20 de ellos A03 sustituye «Junta Nacional de Bienestar Social» por el IHNFA, como manda el art. 280-A adicionado por el mismo decreto. Esos se comparan después de aplicar esa sustitución, y la fila lo indica.

## 3. Resultados

| Disposición del D. 35-2013 | Estado | Artículos |
|---|---|---:|
| **Reforma (art. 1)**: 123 | `IDENTICO` | 15 |
| | `IGUAL_SALVO_FORMATO` | 37 |
| | `DIFIERE_MENOR` | 55 |
| | `DIFIERE` | **15** |
| | Art. 21, derogado después por el D. 130-2017 (C07) | 1 |
| **Adiciona (art. 3)**: 14 | `IDENTICO` · `IGUAL_SALVO_FORMATO` · `DIFIERE_MENOR` · `DIFIERE` | 1 · 2 · 9 · **2** |
| **Deroga (art. 11)**: 24 | A03 lo marca «Derogado» (concuerda) | 23 |
| | **A03 conserva texto** (art. 134) | **1** |
| **No tocado**: 141 (frente al texto de 1996, orientativo) | `IDENTICO` · `IGUAL_SALVO_FORMATO` · `DIFIERE_MENOR` · `DIFIERE` | 65 · 25 · 35 · **16** |
| **Total** | | **302** |

- **Cobertura completa:** los 123 + 14 artículos de la v7 están todos en A03. Ningún artículo de A03 aparece derogado sin base en el D. 35-2013 (salvo el 21, por el D. 130-2017).
- **Notas al pie:** las 153 notas de A03 están en el candidato. Ninguna fila tiene la marca «A03 cita el D. 35-2013 pero la v7 no lo toca», ni la inversa.

## 4. Hallazgos para el CLO (no son decisiones)

### A. Diferencias de texto frente a la v7 que parecen sustantivas

| Art. | Similitud | Qué se ve |
|---|---:|---|
| **163** | 0,89 | **A03 omite un pasaje** que la v7 sí trae: «…Intelectual por Omisión, comprende aquellos casos en que no se le presta la aten[ción]…» |
| **257** | 0,94 | **A03 agrega una frase** que la v7 no tiene: «Su contenido asegurará el cumplimiento de lo dispuesto en este Título.» |
| **5** | 0,996 | A03 «se **entenderá**» frente a la v7 «se **atenderá**» |
| **96** | 0,98 | A03 «2) **Fuegos** artificiales» frente a La Gaceta «2.- **Juegos** artificiales». La Gaceta trae el error de imprenta; A03 lo corrige sin decirlo |
| **97** | 0,96 | A03 «**expedan**» frente a la v7 «**expendan**» (error de A03) |
| **217** | 0,96 | A03 «**uno**» frente a la v7 «**alguno**» |
| 102, 187-A, 32, 139, 143, 230, 194, 152, 102-A | 0,78–0,96 | Mezcla de formato («niño (a)» / «niño(a)»), puntuación y palabras sueltas: «seles»/«se le», «y niñas» (art. 143), «queda»/«quede». Ver el CSV |

### B. Derogaciones
- **Art. 134:** A03 conserva los literales a)–c) y anota derogados solo ch) y d) (notas 23 y 24). Según la **resolución del CLO del 2026-11-18**, el art. 134 está **derogado íntegro**: A03 es incorrecto en este punto.
- **Art. 141:** A03 tiene el texto reformado con a)–c) (`DIFIERE_MENOR`, 0,98), coherente con la derogación de ch)–f).
- **Art. 21:** A03 lo marca derogado por el D. 130-2017. Sigue pendiente la C07 (La Gaceta 34,940 o 39,940 y fecha de efecto, sin cotejar).

### C. Artículos no tocados por el D. 35-2013 (frente al texto de 1996, orientativo)
- 90 coinciden y 35 tienen diferencias menores. En **20** de los 141, A03 aplica la sustitución del art. 280-A (Junta Nacional de Bienestar Social → IHNFA).
- Los **16** que difieren (arts. 12, 18, 26, 49, 95, 109, 111, 118, 124, 127, 136, 138, 153, 160, 161 y 284) cambian sobre todo nombres de Secretarías. Ejemplos: art. 153, «Gobernación y Justicia» → «Interior y Población»; art. 138, «Previsión Social / Salud Pública y Asistencia Social» → «Seguridad Social / Salud».
- Esas sustituciones **no tienen base en el D. 35-2013** y deben atribuirse a otro acto, o tratarse como actualizaciones editoriales del consolidado. **Hay que cotejarlas** con La Gaceta 28,053 (Opción A) y con las reformas posteriores.

## 5. Límites
- **A03 sigue en `SOURCE_HOLD`:** su procedencia no está acreditada. Este barrido mide la **calidad** del texto, no lo acredita.
- **La v7 es la transcripción firmada de La Gaceta 33,222**, incluidos sus errores de imprenta (por ejemplo, «Juegos» en el art. 96). Una diferencia no indica cuál texto es el vigente.
- **El texto de 1996 es orientativo.** Las filas `ORIENTATIVO_*` no sustituyen el cotejo con La Gaceta 28,053.
- **La similitud es una medida de palabras.** Un `DIFIERE_MENOR` puede esconder un cambio de una sola palabra con efecto jurídico: así ocurre en los arts. 5 y 96. Las 64 filas `DIFIERE_MENOR` frente a la v7 (55 reformadas y 9 adicionadas) necesitan revisión, no se aprueban en bloque.

## 6. Siguiente paso propuesto
1. El CLO revisa las **17 filas `DIFIERE`** frente a la v7 (15 reformadas y 2 adicionadas), y decide qué texto prevalece en cada caso.
2. **D1 de la Opción B:** descarga del consolidado desde el CEDIJ con URL, fecha y responsable. Si su hash es `bd115673…`, este barrido vale tal cual.
3. **Opción A:** conseguir La Gaceta 28,053 para cotejar los 141 artículos no tocados y las 16 sustituciones de nombres.

## 7. Actualización 2026-11-18 — barrido contra la v8

**Por qué se repitió:** la v7 tenía tres errores en los arts. 152 y 217, corregidos en la **v8** (`6691924624fd…`, firma D3 del 2026-11-18, `08_HOJA_DECISION_V8_ARTS_152_217.md`). Se repitió el barrido contra la v8 con los mismos scripts, que ahora aceptan la versión como argumento. Con la v7 siguen dando exactamente los mismos resultados (`segmentos.json` `93d8d227…`, CSV `fb793f1c…`).

```sh
npx tsx docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/barrido-v7/exportar_segmentos.ts out/barrido-a03/segmentos_v8.json v8
python -I docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/barrido-v7/barrido_a03_v7.py out/barrido-a03/segmentos_v8.json docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/barrido-v7/barrido_a03_v8.csv <texto_d73_96.txt>
python -I docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/barrido-v7/detalle_difiere.py out/barrido-a03/segmentos_v8.json docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/barrido-v7/barrido_a03_v8.csv docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/barrido-v7/HOJA_DECISION_A03_DIFIERE_V8.md
```

| Salida | SHA-256 |
|---|---|
| `segmentos_v8.json` (en `out/`) | `58f43ae36793…` |
| [`barrido_a03_v8.csv`](barrido_a03_v8.csv) | `b70ed50c407e659973113fa7b40bc5756944b16ebbcd24e3ab05cd00ef197d15` |
| [`HOJA_DECISION_A03_DIFIERE_V8.md`](HOJA_DECISION_A03_DIFIERE_V8.md) | `87eeee9df7a010169855795f979b8919a26f7f764623175ef25ace6e249b6924` |

**Resultado:** los conteos por estado son los mismos que con la v7, porque las correcciones no cambian ningún estado.
- **Art. 152:** la similitud sube de 0,9569 a 0,9665. Ya no aparece «Íos»; quedan «les dieronlugar» y «los(as)» de A03.
- **Art. 217:** pasa de 5 diferencias de contenido a 3. Ya no aparecen la «x» ni la omisión de «dictado el Ministerio Público.». Quedan «uno»/«alguno», «casoindividual» y el párrafo final, que **A03 omite** y el CLO mantuvo por V8-4.

**La hoja de decisión vigente para A03 es la de la v8.** La de la v7 se conserva como historial.
