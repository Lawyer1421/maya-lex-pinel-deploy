# HN:CODIGO_NINEZ · texto canónico v1 (Código de la Niñez y de la Adolescencia, D. 73-96)

**Estado:** `CANONICO_V1_PARCIAL_PENDIENTE_D1_D3` · **Fecha:** 2026-11-18 · **No cargado en ninguna base** · vigencia SIN DECLARAR.

**Base:** dictamen del CLO (Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho, 2026-11-18) en [`../barrido-v7/HOJA_DECISION_A03_DIFIERE_V8.md`](../barrido-v7/HOJA_DECISION_A03_DIFIERE_V8.md):
- Prevalece la v8 de La Gaceta 33,222 en todos los artículos que reforma o adiciona el D. 35-2013.
- Art. 96: «Fuegos artificiales» (corrección de errata).
- Art. 134: `DEROGADO_INTEGRO`.

## Archivos

| Archivo | SHA-256 | Contenido |
|---|---|---|
| [`HN_CODIGO_NINEZ_canonico_v1.txt`](HN_CODIGO_NINEZ_canonico_v1.txt) | **`69760d6a56c5f2b32d3eb111bdb863f7f018a1be04a9692f8bc51010ccda6064`** | 302 artículos («Artículo N.- …»), 187.212 caracteres, LF, sin pie del CEDIJ ni lagunas |
| [`HN_CODIGO_NINEZ_canonico_v1_manifiesto.json`](HN_CODIGO_NINEZ_canonico_v1_manifiesto.json) | `5f4abc26414ac5147de1110df995775e7a10a3ec051e49fcc107bb9ccd3d2de4` | Por artículo: fuente, estado, sha256, notas de A03, correcciones y observaciones |
| [`HN_CODIGO_NINEZ_notas_editoriales_A03.json`](HN_CODIGO_NINEZ_notas_editoriales_A03.json) | `bd3a42b8c7049f07e80971ad7924cf7c91c07d5c4e46a5d77de6f7ec060313d5` | Las 153 notas al pie de A03, aparte. **No son texto normativo** |
| [`HN_CODIGO_NINEZ_pendientes_verificacion.csv`](HN_CODIGO_NINEZ_pendientes_verificacion.csv) | `b2e499edfb5f31d89a1568e965ec5bef4eef6b1c1c349f56ef62e3291187f7a7` | Los 142 artículos sin respaldo cotejado: 141 no tocados más el art. 21 (C07) |
| [`ensamblar_canonico_v1.py`](ensamblar_canonico_v1.py) | — | Ensamblador determinista |

**Reproducción** (raíz del repo):
```sh
npx tsx docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/barrido-v7/exportar_segmentos.ts out/barrido-a03/segmentos_v8.json v8
python -I docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v1/ensamblar_canonico_v1.py out/barrido-a03/segmentos_v8.json docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v1
```

## Composición (302 artículos)

| Estado | Artículos | Fuente del texto | Respaldo |
|---|---:|---|---|
| `TEXTO_V8_D3` | 122 | v8 (art. 1 del D. 35-2013) | La Gaceta 33,222, D3 firmada |
| `TEXTO_V8_D3_ADICIONADO` | 14 | v8 (art. 3 del D. 35-2013) | Ídem |
| `TEXTO_V8_D3_C07_PENDIENTE` | 1 (art. 21) | v8 | Ídem; **derogado después por el D. 130-2017, sin cotejar** |
| `DEROGADO` | 23 | Marca `[DEROGADO — art. 11 del Decreto No. 35-2013]` | Art. 11 del D. 35-2013 (arts. 62–82, 170 y 171) |
| `DEROGADO_INTEGRO` | 1 (art. 134) | Ídem | Resolución del CLO del 2026-11-18. El tipo pasa al art. 179-F del Código Penal |
| `A03_PENDIENTE_VERIFICACION` | 141 | Consolidado A03, limpio | **Ninguno: procedencia no acreditada, D1–D3 pendientes** |

**Única corrección del CLO sobre el texto de la v8:** en el art. 96, numeral 2), «Juegos artificiales» → «Fuegos artificiales», errata material de imprenta. Consta en el manifiesto.

## Limpieza aplicada (solo forma, no contenido)

- **Textos de la v8:** se quitan las comillas de la transcripción y el rótulo «CÓDIGO DE FAMILIA» que sigue al 280-A. Los párrafos son los de la transcripción.
- **Textos de A03:** se quitan cuatro cosas que no son texto del artículo:
  - el número de llamada de la nota al pie;
  - el pie «www.poderjudicial.gob.hn»;
  - los saltos de página;
  - los rótulos de la división siguiente pegados al final.

  Los párrafos se reconstruyen con una regla simple: una línea que termina en . : ; seguida de mayúscula o enumerador abre un párrafo nuevo. No se corrige ninguna palabra.

## Qué falta antes de cargar el paquete A03 en staging
1. **Preámbulo y rótulos** de Libros, Títulos, Capítulos y Secciones. No están en la v1. Incluye las denominaciones que reformó el art. 2 y derogó el art. 12 del D. 35-2013.
2. **D1–D3 de los 141 artículos no tocados:**
   - procedencia del consolidado (opción B, CEDIJ);
   - cotejo con La Gaceta 28,053 (opción A);
   - las 16 sustituciones de nombres de Secretarías sin base en el D. 35-2013;
   - las 35 diferencias menores frente al texto de 1996.
3. **C07** (art. 21).
4. **D4–D8** del pliego de `HN:CODIGO_NINEZ`: vigencia, roles, tipo `codigo`, retiro del bloqueo `INSTRUMENTO_SIN_PLIEGO_CLO` y promoción.
