# Diagnóstico de fuentes · OLA 15 · Ley de Garantías Mobiliarias (D.182-2009)

**Fecha:** 2026-11-27 · **Alcance:** inventario de solo lectura y OCR preparatorio. No se escribió en ninguna base de datos ni se generó paquete alguno.
**Estado:** **BLOQUEADA en D1 y D4.** Falta un segundo testigo consolidado y la verificación de las reformas posteriores a 2010.

## 1. Fuentes en disco

Se buscó en todo OneDrive y en las carpetas locales de usuario (Descargas, Escritorio y Documentos), por nombre (`garant*`, `mobiliar*`, `182-2009`) y, en las Gacetas con texto, por contenido.

| Fuente | Ubicación | SHA-256 | Dictamen |
|---|---|---|---|
| **La Gaceta No. 32,125 del 28-ene-2010**, Sección A, pp. A.1–A.20: D.182-2009, publicación oficial original | `SISTEMA_LEGAL_PRINCIPAL/02_EJERCICIO_LEGAL/05_LEYES_Y_CODIGOS/Ley de Garantias Mobiliarias.pdf` (20 págs.) | `dc919517a242bbda548171a7ebecb7dbe20b32af5a909eb784bb8a0f917f758c` | **Testigo único.** Escaneo en gris a 100 ppi, a dos columnas y sin capa de texto. La copia en `Escritorio/…/PDF ALL/` es idéntica byte a byte |
| Reglamento del Registro de Garantías Mobiliarias | `Email attachments/Documentos/CODIGOS/` (27 págs.) | `0af76a202a4c39069fe6aeacf5cbac4bd168b6a46ff5ee361a680739c190ae71` | **Instrumento aparte**, fuera de la OLA 15. Escaneo sin texto. Las copias en `01_NOTARIA_PUBLICA/03_TRAMITES_ADMINISTRATIVOS/` y en `Escritorio/…/PDF ALL/` son idénticas. Se trata como el RLMUN: numeración propia, identidad propia y paquete propio si se llega a cargar |
| `CP-182-2009.pdf` | `Biblioteca_Personal/` (25 págs.) y dos copias de respaldo | `8d814bcba7bd2ef4912abd6c57e0e441256e903d01f0e5ef8d6fd3a123db0d4c` | **Falso positivo, excluido.** Es la certificación de una sentencia de la Sala de lo Penal de la CSJ (Casación Penal S.P. No. 182-2009, 24-ago-2010). Coincide en el número, no en el instrumento |
| `garantias1.pdf`, `garantias2(-1).pdf` y otros de `ADUANAS MODERNA…` | Varias | — | Excluidos: son garantías aduaneras (DUA y tránsito), no esta ley |
| Edición consolidada del CEDIJ | — | — | **No existe en disco** |
| Decretos de reforma del D.182-2009 posteriores a 2010 | — | — | **No se encontró ninguno.** «Garantías Mobiliarias» no aparece en `LA GACETA 2018.pdf`, `Gaceta-02-Enero-2023.pdf` ni `Gaceta-No-34691.pdf` |

En producción hay **0 filas** de esta ley (consulta de solo lectura del 2026-11-27). Sería una carga nueva, sin legado que ocultar.

## 2. Bloqueo D1 / D4

- **D1 (fuente PRIMARY).** Con un solo testigo escaneado a 100 ppi, un error de OCR en una cifra no se detecta por comparación. Ya pasó en la OLA 14: «146-**56**» en lugar de 146-86. La lección de esa ola es que nunca hay que fiarse de un testigo único. Para desbloquear hace falta **un segundo testigo**: la edición consolidada del CEDIJ o, en su defecto, una edición oficial de la CNBS o del TSC.
- **D4 (vigencia).** La Gaceta es la versión de 2010. Antes de proponer vigencias hay que **verificar las reformas posteriores a 2010** en La Gaceta o en la edición consolidada. Mientras no se haga, no se puede presentar ninguna fila como PRIMARY vigente.

## 3. OCR preparatorio (por columnas)

**Herramienta:** [`scripts/olas/ocr-lgm.ts`](../../../scripts/olas/ocr-lgm.ts)
- **Motor:** Tesseract 5.5.3, idioma `spa`, modo de una columna (`--psm 4`).
- **Imagen:** 300 ppi, una columna por recorte. El canal entre columnas y el corte bajo la cabecera de la Gaceta se midieron sobre las cajas de palabra del diagnóstico del 26-nov.
- **Salidas** (locales, en `out/ola15-lgm/ocr/`, que git ignora): texto y TSV por columna, `articulado_ocr.txt`, `cierre_ocr.txt` y `reporte.json`.

**Delimitación:**
- **Articulado:** de «ARTÍCULO 1.- OBJETO DE LA LEY», en la columna derecha de la pág. 1 bajo el sumario, al «Dado en la ciudad de Tegucigalpa…», en la columna izquierda de la pág. 20.
- **Encabezados:** están los **86, en orden consecutivo**, y ninguno se descartó. Los encabezados solo se aceptan si son consecutivos, así que el «ARTÍCULO 28.-» de la Ley de Propiedad que transcribe el art. 83 no corta el articulado.
- **Encabezado a revisar:** el art. 42 salió sin guion tras el número («ARTÍCULO 42. CARACTERÍSTICAS…»). Hay que ver en la imagen si es así en el original.
- **Fuera del articulado:** la columna derecha de la pág. 20 es el D.294-2009 (veteranos de guerra), otra disposición.
- **Cierre:** dado el 24-ago-2009, sancionado el 22-sep-2009 y publicado el 28-ene-2010. El art. 86 fija la vigencia seis meses después de la publicación.

**Huellas:** articulado OCR `7cdbf0d2a0e79c91ff5a56d3c770100ba92827f7938f2775cacef21e176ca005` (11,807 palabras); cierre `64c31e5c816507fd60cd9525d0bc94d8d940b9a874982f924ca76375c881dd7f`.

**Reporte preliminar:** [`ocr/REPORTE_OCR_LGM_OLA15_PRELIMINAR.md`](ocr/REPORTE_OCR_LGM_OLA15_PRELIMINAR.md)

| Control | Resultado |
|---|---|
| Palabras con confianza < 80 | 334 (2.8 %) |
| Formas fuera del vocabulario del corpus V5 local | 172 formas, 416 apariciones. Una parte es vocabulario legítimo nuevo («garante», «mobiliarias», «garantizadores», «leasing»); otra son palabras pegadas del escaneo a 100 ppi («enelcaso», «laprelación», «sielacreedor», «enlamejoracontinuadel»…) y letras confundidas («intemacionales», «altemativamente») |
| Palabras con cifras | 283, todas listadas con página, columna y línea para cotejar contra la imagen |
| Cifra con carácter sospechoso | **1**: art. 47, «Decreto No. **£2**-2004» (en el original, 82-2004) |
| Remisiones «artículo N» | 32. Las 8 externas quedan marcadas: Código Civil, arts. 604, 2057 y 2082–2085; Código de Comercio, arts. 892 y 1522; Ley de Propiedad, art. 28 |
| Cifras en letras con paréntesis («seis (6)») | 23, todas concordantes |

Ninguna corrección se aplicó al texto: el reporte solo dice qué mirar. El cotejo íntegro se hará contra la imagen y contra el segundo testigo.

## 4. Hallazgo sobre un paquete firmado: art. 28 de la Ley de Propiedad (OLA 12)

El **art. 83 del D.182-2009** («REFORMA A LA LEY DE PROPIEDAD») **reforma por adición los numerales 2), 5), 7) y 8) del art. 28 de la Ley de Propiedad** (D.82-2004):
- el numeral 2 pasa a ser el «Registro de la Propiedad Vehicular»;
- el numeral 5 agrega «condiciones generales de contratación, garantías mobiliarias»;
- se añaden el numeral 7 (Registro de la Propiedad Pecuaria) y el numeral 8 (Registro de garantías mobiliarias).

En producción, la fila `OLA12_LP_2007_01:LEY_PROPIEDAD:28` (V5, `es_norma_vigente = true`, sin rol ni constancias) tiene **el texto anterior a esa reforma**, tomado de la edición CSJ de 2007. El expediente de la OLA 12 LP (§4) solo identificó como reformas no integradas los D.109-2009, D.150-2010 y D.205-2012. El D.182-2009 no figura.

**Propuesta para el CLO.** No se ha hecho ningún cambio. Aplicar al art. 28 el mismo criterio que la D5 de la OLA 12: **CONTEXT vigente con constancia de «reforma posterior no integrada» (D.182-2009, art. 83)**, mientras no se integre el texto cotejado. Corregirlo exige su propio pliego firmado y la ejecución por el CLO, igual que la C1 del 2026-11-25. Además, el art. 47 de la LGM remite a ese mismo art. 28 para la administración del Registro.

## 5. Nota operativa: casos BAJO del detector pendientes desde el cierre del #179

Se resolverán **juntos en el futuro PR de desbloqueo de la OLA 15**, que también registrará la LGM en el catálogo, el detector, el gate (`182-2009`) y clo-guards. Comportamiento comprobado el 2026-11-27 sobre `main` (`4ab5450`):

| Consulta | Hoy resuelve a | Debe resolver a |
|---|---|---|
| «Ley General de la Administración Pública **Presupuestaria**» | LGAP | Sin identidad (fail-close) |
| «… Pública **Hacendaria**» | LGAP | Sin identidad |
| «… Pública **Ambiental**» y otros calificativos temáticos | LGAP | Sin identidad |
| «Ley General de la Administración Pública **y de la Hacienda**» | LGAP | Sin identidad (otro instrumento) |
| «Reglamento **según** la Ley de Municipalidades» | **Ley** de Municipalidades | Reglamento (Acuerdo 018-93) |
| «Reglamento **relativo a** la Ley…» | **Ley** | Reglamento |
| «Reglamento **en virtud de** la Ley…» | **Ley** | Reglamento |
| «Reglamento **de conformidad con** la Ley…» | **Ley** | Reglamento |
| «Reglamento **aplicable a** la Ley…» | **Ley** | Reglamento |

- **LGAP:** ampliar `SOLO_LGAP` con los calificativos temáticos y excluir «y de la/del X» tras el nombre. Conviene revisar si una lista cerrada de calificativos basta, o si es mejor admitir solo lo que puede seguir al nombre: «de Honduras», «(Decreto 146-86)», puntuación o fin de la frase.
- **RLMUN:** ampliar `CONECTOR_RLMUN` y mantener sincronizadas sus tres copias (`exact-resolver.ts`, `instrument-identity.ts` y `CONECTORES_RLMUN` en `clo-guards.ts`).
- **Mismo criterio para la LGM:** su nombre («Ley de Garantías Mobiliarias») debe excluir el Reglamento del Registro («Reglamento del Registro de Garantías Mobiliarias»), con el mismo patrón de conector y exclusión.

## 6. Próximos pasos

1. **Conseguir el segundo testigo** (CEDIJ, CNBS o TSC) y **las reformas del D.182-2009 posteriores a 2010.** Sin ellos, D1 y D4 siguen bloqueadas.
2. Con el segundo testigo, hacer el cotejo íntegro artículo por artículo, usando el reporte preliminar como guía, con la constancia «texto obtenido por OCR y cotejado».
3. Decisión del CLO sobre el art. 28 de la Ley de Propiedad (§4).
4. Expediente D1–D8 de la OLA 15 y, tras la firma, el PR de desbloqueo con los casos de borde del §5.
