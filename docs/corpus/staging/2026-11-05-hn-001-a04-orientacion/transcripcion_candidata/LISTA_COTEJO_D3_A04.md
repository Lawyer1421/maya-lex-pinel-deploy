# Lista de cotejo D3 · A04 (Decreto 35-2013, La Gaceta 33,222): v6 definitiva — FIRMADA

**Regenerada el 2026-11-16 sobre la v6 definitiva**, después de la firma de la resolución complementaria (`../04_RESOLUCION_COMPLEMENTARIA_A04.md`, 464 casillas aprobadas sin excepciones), con [`generar_lista_cotejo_d3.py`](generar_lista_cotejo_d3.py), que se puede reproducir y no corrige nada.

| Texto | SHA-256 (bytes LF) |
|---|---|
| **Transcripción definitiva v6** (lo que se firma en D3): [`A04_transcripcion_candidata_v6.txt`](A04_transcripcion_candidata_v6.txt) · 176 506 caracteres | **`7c8f40f844cc30f28f7bf6448151e995ed2df88bc3050a6f5b252a39709ce084`** |
| OCR del PDF del TSC (referencia): paquete `2026-11-16-hn-001-a04-tsc` | `f2c67cb4a019a094cbacb4690323810e7215d0904297483b1a725a4dbb7fca0a` |
| PDF del TSC | `fbd87f3396e5d0b6601a246008a1ae5bd870841b795d75ac42076245a154f2ff` |

**Cadena de versiones.** La v6 sustituye a la v5 `fa47cc72…`, sobre la que la firma D3 se detuvo el 2026-11-16 por los defectos compartidos con el OCR.
- La v6 es la v5 más las 436 correcciones de `correcciones_cotejo_complementaria.json`. Se generó con [`aplicar_correcciones_complementaria.ts`](aplicar_correcciones_complementaria.ts), que exige el hash previsto y auditado.
- La cadena anterior (v1 → v2 → v3 `f70d874b…` → v4 `a81d0571…` → v5) está en `../03_RESOLUCION_TEXTUAL_A04.md` §4.
- La v6 no tiene saltos de página: las páginas de cada artículo se toman de la v3.

**Método.** Los dos textos se cortan por los 19 artículos del decreto, se quitan los encabezados de página y se comparan palabra por palabra, conservando los guiones. En cada diferencia, «izquierda» es el OCR del TSC y «derecha» la v6; «∅» significa que falta.
- Las **854 diferencias** están en [`lista_cotejo_d3_diferencias.csv`](lista_cotejo_d3_diferencias.csv) y el resumen en [`lista_cotejo_d3_resumen.csv`](lista_cotejo_d3_resumen.csv).
- Hay 359 más que con la v5 (495). La diferencia corresponde a las correcciones complementarias, que la lista de la v5 no podía mostrar porque el OCR y la candidata compartían esos defectos.
- Con la v6, cada corrección firmada aparece como una diferencia frente al OCR.

## Resumen por artículo (v6 definitiva)
Cada línea del borde cuenta **una sola vez**: en la pág. 27 el art. 2 empieza en y = 476, y en la pág. 31 el art. 4 empieza en y = 629. Las columnas de borde son las 88 líneas de `borde_derecho_88_lecturas.csv`; el resto del borde derecho está resuelto en la tabla complementaria (G3).

| Art. | Págs. | Tipo | Dif. | `[ilegible]` | Borde: legibles | parciales | ilegibles parc. | Notas |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | 1–27 | texto | 514 | 8 | 21 | 39 | 6 | Resolución complementaria aplicada (G3–G9; recuadro editorial de la pág. 2 retirado) |
| 2 | 27–28 | texto | 13 | 0 | 0 | 1 | 0 | — |
| 3 | 28–31 | texto | 97 | 1 | 6 | 0 | 1 | — |
| 4 | 31–36 | texto | 70 | 0 | 3 | 0 | 0 | — |
| 5 | 36–41 | texto | 80 | 6 | 1 | 3 | 5 | C04 y C05 aplicadas; resolución del 2026-11-16 y complementaria aplicadas |
| 6 | 41–42 | texto | 20 | 0 | 0 | 0 | 0 | C06: lectura dual «11»/«511» (sin cambio); pág. 41 resuelta y aplicada en el art. 6 (G1) |
| 7 | 42 | texto | 9 | 0 | 0 | 0 | 0 | — |
| 8 | 42–44 | texto | 16 | 0 | 0 | 0 | 0 | — |
| 9 | 44 | texto | 5 | 0 | 0 | 0 | 0 | — |
| 10 | 44–45 | texto | 6 | 0 | 0 | 0 | 0 | C01 aplicada |
| 11 | 45 | texto | 4 | 0 | 0 | 0 | 0 | C02 aplicada; borde izquierdo de la pág. 45 (G2) |
| 12 | 45 | texto | 5 | 0 | 0 | 0 | 0 | — |
| 13 | 45 | texto | 2 | 0 | 0 | 0 | 0 | — |
| 14 | 45 | texto | 2 | 0 | 0 | 0 | 0 | C03 aplicada; saltos de la lista verificados en el impreso |
| 15 | 45 | texto | 1 | 0 | 0 | 0 | 0 | — |
| 16 | 45 | igual | 0 | 0 | 0 | 0 | 0 | — |
| 17 | 45–46 | texto | 2 | 0 | 0 | 0 | 0 | — |
| 18 | 46 | texto | 2 | 0 | 0 | 0 | 0 | — |
| 19 | 46 | texto | 6 | 0 | 0 | 0 | 0 | — |
| **Total** | | | **854** | **15** | **31** | **43** | **12** | Fuera del acto: B87 y B88 (pág. 46, columna derecha) |

**Comprobaciones:**
- 0 encabezados residuales (la única línea que empieza con «Sección» es texto del art. 148, art. 1 del decreto).
- 0 símbolos de ruido («•», «\», «^», «™»).
- Los 19 artículos en serie: también con `segmentarSerieCorrelativa(v6, 19)`.
- **15 `[ilegible]`** sin cambios: 8 en el art. 1, 1 en el art. 3 y 6 en el art. 5.

## Firma del cotejo D3
«Cotejé la transcripción `7c8f40f844cc30f28f7bf6448151e995ed2df88bc3050a6f5b252a39709ce084` contra las 46 páginas del PDF del TSC `fbd87f33…`. El cotejo incluye:
- las correcciones firmadas C01–C06;
- las 63 resoluciones del 16-nov-2026, con B24 rectificada;
- los rangos ratificados de la pág. 1;
- las 464 casillas de la resolución complementaria (G1–G10, con K024, K131, K160, K209, K463 y K464 aprobadas expresamente);
- las 15 lagunas `[ilegible]`, mantenidas.»

☒ **Conforme**

Firmante: **Abg. y Not. Fredy Omar Pinel Flores** · Rol: ☒ **propietario_despacho** (CLO / Director Maya Lex) · Fecha: **2026-11-16**

Esta firma es el hash que exige la ingesta: `--transcripcion-sha256 7c8f40f844cc30f28f7bf6448151e995ed2df88bc3050a6f5b252a39709ce084`.
