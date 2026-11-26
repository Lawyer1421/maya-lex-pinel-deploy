# Diagnóstico de fuentes · Fase II

**Fecha:** 2026-11-25 · **Alcance:** lectura local de carpetas de fuentes; no se escribió nada en producción.

**Carpetas revisadas:**
- `SISTEMA_LEGAL_PRINCIPAL/02_EJERCICIO_LEGAL/05_LEYES_Y_CODIGOS/` (`LEYES/`)
- `SISTEMA_LEGAL_PRINCIPAL/00_ARCHIVOS_VARIOS/Biblioteca_Personal/` (`BIBLIO/`)
- `Email attachments/Documentos/CODIGOS/` (`CODIGOS/`)
- `CODIGOS Y LEYES REGLAMENTOS ACUERDOS ETC/` (`CLRA/`)
- `CrossDevice/S26/Download/` (`S26/`)
- `docs/corpus/`

## Herramientas

| Herramienta | Estado |
|---|---|
| Tesseract OCR | **Instalado**: 5.5.3, en `C:\Program Files\Tesseract-OCR\`. No estaba cuando se hizo el inventario del 2026-11-24 |
| Idioma español (`spa.traineddata`) | **Falta**: solo hay `eng` y `osd`. Hay que instalarlo antes de cualquier OCR de textos hondureños |
| `ocrmypdf`, `pytesseract` | No instalados |
| Poppler 25.07 / xpdf 4.06 | Disponibles para extraer texto y rasterizar páginas |

## a) Ley de Garantías Mobiliarias (D.182-2009)

| Archivo | Qué es | Texto |
|---|---|---|
| `LEYES/Ley de Garantias Mobiliarias.pdf` (5,454,536 bytes) | **La Gaceta No. 32,125 del 28-ene-2010**, D.182-2009, pp. A.1–A.20: la publicación oficial original | Escaneo, sin capa de texto. 20 páginas en gris a **100 ppi**, a dos columnas |
| `S26/Ley de Garantias Mobiliarias.pdf` | Copia del teléfono | Ilegible: es un marcador de nube sin sincronizar |
| `CODIGOS/Reglamento del Registro de Garantías Mobiliarias.pdf` | Reglamento, no la ley; 27 páginas | Escaneo, sin texto |
| `BIBLIO/garantias1.pdf`, `garantias2.pdf` | Procedimientos aduaneros de garantías (DUA), **no** son esta ley | Con texto |

**Diagnóstico.** La fuente primaria existe y es la mejor posible: la Gaceta oficial. Solo falta pasarla a texto. Lo que hace falta:

- **Idioma:** instalar `spa.traineddata`, de preferencia `tessdata_best`.
- **Resolución:** rasterizar a 300 ppi. El original está a 100 ppi, así que conviene un ensayo de calidad antes de comprometerse.
- **Columnas:** hacer el OCR columna por columna, igual que con la Gaceta del Lavado de Activos.
- **Cotejo:** revisar el resultado a mano y con un control de integridad por artículo; un OCR a 100 ppi no puede entrar sin cotejo.
- **Reformas:** la edición es de 2010. Habrá que buscar las reformas posteriores en La Gaceta.

**Estado:** desbloqueable con OCR, con riesgo de calidad por la resolución.

## b) OLA 8 · Código de Comercio (D.73-50)

**No hay edición limpia del CEDIJ en las carpetas locales.** Además de lo que ya revisó el [dictamen de fuente](staging/2026-11-24-hn-com-ola8/DICTAMEN_FUENTE_COMERCIO_OLA8.md), apareció un archivo nuevo:

| Archivo | Qué es | ¿Sirve? |
|---|---|---|
| `LEYES/CODIGO DE COMERCIO.docx` (446,519 bytes; autor «fredy pinel», 17–18 de agosto de 2024) | Documento de trabajo con el texto de la compilación de 2003, con encabezados «Articulo º N». Desde la línea 5,498 lleva **comentarios generados por ChatGPT** («ChatGPT said: …») | **No.** No refleja el D.284-2013: el art. 14 conserva «La escritura constitutiva…» en lugar de «El Contrato Societario…», y el art. 380 sigue vigente aunque el D.284-2013 (art. 37) lo derogó. No tiene notas de reforma ni fuente declarada |
| `LEYES/Codigo del Comercio (1).pdf`, `(2).pdf`, `codigo del comercio.pdf` | Compilación CSJ de 2003, según el dictamen | No (anterior a las reformas) |
| `LEYES/CODIGO DE COMERCIO PDF DESGLOSADO POR ARTICULOS.pdf` | Código de Comercio del **Perú**, según el dictamen | No |
| `S26/codigo del comercio.pdf` | Marcador de nube | Ilegible |

**Diagnóstico.** La OLA 8 sigue pausada. Hace falta conseguir la edición consolidada del CEDIJ, que es un PDF con notas de reforma como los usados en las OLAS 5, 6, 7 y 10. El corpus ya tiene en producción el D.284-2013 (lote piloto): reforma los arts. 14, 15, 18, 157, 169, 189, 193, 210, 222, 224, 226 y 228 y deroga los arts. 380 a 383. Sirve como control de cualquier edición que llegue.

## c) OLA 13 · Bloque administrativo y mercantil

| Norma | Mejor archivo local | Texto | Corte aparente | Diagnóstico |
|---|---|---|---|---|
| **Ley de Procedimiento Administrativo** (D.152-87) | `LEYES/LEY DE PROCEDIMIENTOS ADMINISTRATIVO HONDURAS.pdf`: edición del Poder Judicial, 39 páginas, 154 artículos | **Sí** (Acrobat PDFMaker, 2009) | Cita reformas hasta los D.255-2002 y 268-2002 | **Lista para empaquetar** con `cedij.ts`. Queda pendiente cotejar las reformas posteriores a 2002. `BIBLIO/ley_procedimiento_administrativo.pdf` es un escaneo de 2003 de 9 páginas |
| **Ley de Municipalidades** (D.134-90) | `LEYES/LEY DE MUNICIPALIDADES.pdf`: 221 páginas, **incluye también el Reglamento General** (Acuerdo 018-93), que hay que separar | **Sí** (2011) | Reformas anotadas hasta el D.143-2009 | **Empaquetable**, separando ley y reglamento. Los decretos de reforma sueltos (124-95, 133-96, 125-2000, 200-2005, 143-2009 y la interpretación del art. 91) son escaneos y servirían de cotejo con OCR. Las reformas posteriores a 2009 no se encontraron |
| **Ley General de la Administración Pública** (D.146-86) | `BIBLIO/LeyGeneralDeLaAdministracionPublica.pdf` (10 páginas), más dos archivos de reformas (1 y 4 páginas) | **No**: escaneos de 2007 | Anterior a 2007 | **Requiere OCR.** Además, la reformó ampliamente el D.266-2013 («Ley para Optimizar la Administración Pública»), que sí está con texto nativo en La Gaceta No. 33,336 del 23-ene-2014 (`LEYES/20140123-DECRETO LEGISLATIVO No. 266_2013 …pdf`) |
| **Ley de Contratación del Estado** (D.74-2001) | `LEYES/Ley de Contratacion del Estado.pdf` (20 páginas) y `BIBLIO/ley_contratacion_estado.pdf` (11 páginas) | **No**: escaneos de 2003 | 2003 | **Requiere OCR y una fuente actualizada.** Los dos escaneos son anteriores a las reformas posteriores a 2003; hace falta una edición consolidada vigente |
| **Ley del Sistema Financiero** (D.129-2004) | **No se encontró.** Solo están la *Ley de Seguros de Depósitos en Instituciones del Sistema Financiero* (escaneo de 2003, otra ley) y su reglamento | — | — | **Falta la fuente** |
| **Ley de Inquilinato** | **No se encontró** ningún archivo de la ley. Las coincidencias por «arrendamiento» son contratos del despacho, no la norma | — | — | **Falta la fuente** |

## Orden sugerido para la Fase II

1. **Inmediato, sin OCR:**
   - Ley de Procedimiento Administrativo y Ley de Municipalidades (separando el reglamento), con el pipeline actual y su expediente para firma.
   - El D.266-2013 (Gaceta nativa) como instrumento propio o como fuente de reforma de la LGAP.
2. **Con OCR** (instalar `spa`, rasterizar a 300 ppi, columna por columna y cotejo manual), empezando por un ensayo de calidad sobre la Gaceta 32,125:
   - Ley de Garantías Mobiliarias;
   - luego la LGAP base.
3. **Conseguir fuentes:**
   - edición CEDIJ del Código de Comercio (OLA 8);
   - edición vigente de la Ley de Contratación del Estado;
   - Ley del Sistema Financiero;
   - Ley de Inquilinato.

## Seguimiento (2026-11-25, rama `feat/fase2-sync-rpc-y-ola13`)

| Lote | Estado |
|---|---|
| `OLA13_LPA_2014_01` · Ley de Procedimiento Administrativo | **Expediente listo para firma** ([expediente](fase2/2026-11-25-hn-lpa-ola13/EXPEDIENTE_AUDITORIA_LPA_OLA13.md)): 156 PRIMARY; arts. 1, 6, 41, 61, 87, 88, 119, 123 y 126 con el texto del D.266-2013 (La Gaceta 33,336) |
| `OLA13_LMUN_2009_01` · Ley de Municipalidades | **Expediente listo para firma** ([expediente](fase2/2026-11-25-hn-lmun-ola13/EXPEDIENTE_AUDITORIA_LMUN_OLA13.md)): 162 artículos = 159 PRIMARY + 3 CONTEXT derogados (31-B, 81 y 127); solo el articulado de la ley |
| `OLA13_RLMUN` · Reglamento General de la Ley de Municipalidades (Acuerdo 018-93) | **Inventariado aparte, sin paquete.** Está en el mismo PDF (págs. 112–221, edición AMHON); su numeración vuelve a empezar en 1 y no se mezcla con la ley |
| Sincronización de RPC (R1) | **Dictamen listo para firma** ([dictamen](fase2/rpc-sync/DICTAMEN_SYNC_RPC.md)); staging primero |
| Garantías Mobiliarias y LGAP (OCR) | Pendiente de instalar `spa.traineddata` y de la prueba de calidad |
