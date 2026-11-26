# Diagnóstico de OCR · Garantías Mobiliarias y LGAP (Fase II, siguiente ola)

**Fecha:** 2026-11-26 · **Alcance:** prueba de calidad, sin escribir en ninguna base de datos y sin generar paquetes
**Herramienta:** [`scripts/olas/ocr-diagnostico.ts`](../../../../scripts/olas/ocr-diagnostico.ts)
- **Motor:** Tesseract 5.5.3, idioma `spa` (instalado el 2026-11-26), segmentación automática con detección de columnas (`--psm 1`).
- **Imagen:** rasterizado en gris a **300 ppi** con poppler `pdftoppm`.

Resultados locales en `out/ocr-diag/{gm,lgap}/`, un directorio ignorado por git: texto por página, TSV de palabras y `diagnostico.json`.

## Resultado

| | Ley de Garantías Mobiliarias (D.182-2009) | Ley General de la Administración Pública (D.146-86) |
|---|---|---|
| Fuente | `05_LEYES_Y_CODIGOS/Ley de Garantias Mobiliarias.pdf`: **La Gaceta No. 32,125 del 28-ene-2010**, 20 págs. escaneadas a 100 ppi, a dos columnas | `Biblioteca_Personal/LeyGeneralDeLaAdministracionPublica.pdf`: **La Gaceta No. 25,088 del 29-nov-1986**, 10 págs. escaneadas |
| SHA-256 del PDF | `dc919517a242bbda548171a7ebecb7dbe20b32af5a909eb784bb8a0f917f758c` | `3368ffdcd84d0401386c935bb75648f62a01c68a5fee63007f0275d1980d3555` |
| Palabras reconocidas | 12,938 | 8,551 |
| Confianza media de Tesseract | 94.3 | 94.3 |
| Palabras con confianza < 60 / < 80 | 1.6 % / 3.7 % | 1.5 % / 3.1 % |
| Palabras de 4 letras o más fuera del vocabulario del corpus firmado (19,345 formas de los 12 paquetes V5) | 6.8 % | 4.1 % |
| Encabezados de artículo | 1–86 completos; el art. 86 es la vigencia, seguida de «Dado en…» | 1–126 completos. El 23 se leyó «**4**RTICULO 23» y varios llevan ruido delante («— ARTICULO 22.—») |
| **Veredicto** | **Apto con corrección dirigida y cotejo íntegro** | **Apto con corrección dirigida y cotejo íntegro** |

**La confianza de Tesseract sobrestima la exactitud.** Con 94 de media hay errores reales en el texto; la tasa de palabras fuera de vocabulario es mejor indicador. Parte de esa tasa es vocabulario legítimo que el corpus aún no tiene («garante», «mobiliarias», «desconcentración», «leasing»). El resto son errores.

## Errores observados

**Garantías Mobiliarias.**
- **Palabras pegadas,** por el escaneo a 100 ppi en dos columnas: «lasgarantías», «laobligación», «enelcaso», «sielacreedor», «laprelación», «capítuloi».
- **Palabras partidas** en el corte de columna: «repre- sentativos», «incor-».
- **Letras confundidas:** «intemacionales» (rn → m), «Gobiemo».
- **La cabecera de la Gaceta** sale ilegible («Euvearsa Nucia ce Antes Giras»), pero no forma parte del articulado.
- **Otras disposiciones en el mismo PDF:** la Gaceta trae a continuación otras disposiciones. Hay reformas a otras leyes transcritas entre comillas («“ARTÍCULO 28.- Todos los registros dependen del Instituto…») y el comienzo de otro decreto («ARTÍCULO 2.- Autorizar a la Secretaría…»). El corte del articulado tiene que dejarlas fuera, igual que se separó el Reglamento de la Ley de Municipalidades.

**LGAP.**
- **Errores de letra dentro de las palabras:** «qenmiciones», «activ:dad», «acegurarles», «creciento», «estabiece», «éllos».
- **Error grave en la cabecera:** el número del decreto salió «DECRETO NUMERO 146-**56**» (es el 146-86).
  - Un error así en una cifra no lo detecta ninguna métrica de confianza.
  - Por eso **todas las cifras** (números de artículo, plazos, montos y decretos) deben cotejarse contra la imagen.

## Recomendaciones para la siguiente ola

1. **Las dos leyes son desbloqueables con OCR**, pero no se pueden empaquetar directamente desde la salida de Tesseract. Hace falta:
   - corrección dirigida: palabras con confianza < 80, palabras fuera de vocabulario y todas las cifras;
   - cotejo íntegro, artículo por artículo, contra la imagen a 300 ppi;
   - la constancia «texto obtenido por OCR y cotejado» en cada fila.
2. **Garantías Mobiliarias:**
   - conviene hacer el OCR por columnas (recortando cada columna antes de Tesseract), como con la Gaceta del Lavado de Activos: debería reducir las palabras pegadas;
   - el articulado debe cortarse en el «Dado en…» del D.182-2009.
3. **LGAP:**
   - el texto base de 1986 está **ampliamente reformado por el D.266-2013** (La Gaceta 33,336, con texto nativo, ya usado en la OLA 13 para la LPA). Sus arts. 10 y 11 derogan los arts. 4A, 15A, 82, 104, 105, 124-A y 124-B;
   - hay que integrar esas reformas con `reformasPosteriores` y revisar las reformas posteriores a 2014 antes de proponer vigencias.
4. **Orden sugerido:** primero la LGAP (10 págs., menos ruido, reformas ya identificadas) y después Garantías Mobiliarias (20 págs., a dos columnas y con otras disposiciones en el mismo PDF).
