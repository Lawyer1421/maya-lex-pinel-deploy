# Expediente de auditoría · OLA 14 · lote 1 · `HN:LEY_GENERAL_ADMINISTRACION_PUBLICA`

**Estado:** PENDIENTE DE FIRMA
**Instrumento:** Ley General de la Administración Pública (Decreto No. 146-86, 27-oct-1986; La Gaceta No. 25,088 del 29-nov-1986) · lote `OLA14_LGAP_2014_01`
**Fecha del paquete:** 2026-11-26 · **Generador:** `scripts/olas/ola14-lgap.ts` + `scripts/olas/cedij.ts` + `scripts/olas/paquete-ola.ts` · **Cotejo OCR:** `scripts/olas/ocr-lgap.ts`
**Staging:** `mayalexhn-staging` (`aicakncgtuiiuomflkqj`) · **Producción:** `thgrhueckkjdutjvcufp`

> **Cómo se firma.** El CLO revisa las secciones 1 a 5 y decide D1–D8 en §6. Para firmar, sustituye en la línea **Estado** el texto `PENDIENTE DE FIRMA` por la fórmula de firma (D1–D8 y la palabra FIRMADAS) y completa el bloque de firma. El ejecutor (`scripts/olas/ejecutar-sql.ts`) lee la firma solo en esa línea **Estado** y se niega a correr la visibilidad V4 en staging y cualquier paso de producción si este archivo no está firmado o no cita la huella SHA-256 exacta de cada SQL (§7). Si el CLO modifica una decisión, hay que regenerar el paquete y volver a citar las huellas.
>
> **Gobernanza de la Fase II.** Ninguna escritura en producción sin esta auditoría, la validación en staging (pasos S1–S4) y la firma expresa del CLO.

## Resumen

- **Base del texto:** la edición del **CEDIJ** (Corte Suprema de Justicia), con texto nativo y 38 notas de reforma hasta el D.157-2008. Es el mismo tipo de fuente que la LPA de la OLA 13.
- **Reformas del D.266-2013:** las 28 redacciones del Artículo 1 (27 reformas y el art. 98 vuelto a crear) se toman de **La Gaceta 33,336** (PDF nativo), y las 6 derogaciones del Artículo 10 se aplican a los artículos que la edición trae. El art. 4-A no figura en ninguna fuente.
- **Testigo del texto original:** La Gaceta **25,088** de 1986, con OCR por columnas a 300 ppi. Sirve para cotejar palabra por palabra los 75 artículos que conservan el texto de 1986:
  - el cotejo destapó **17 lecturas de la edición CEDIJ que no son las oficiales**; se corrigen a la lectura de La Gaceta;
  - también destapó **11 artículos con reformas que la edición no anota**; se proponen como CONTEXT.
- **Clasificación propuesta:** **131 filas: 94 PRIMARY, 11 CONTEXT vigentes y 26 CONTEXT derogadas.**
- **Antes de firmar:** el paquete pasó el ensayo completo en base desechable. La aplicación no podrá usar estas filas como fundamento hasta un PR de identidad posterior a la firma (D8).

## 1. Fuentes

| Pieza | Archivo · SHA-256 | Uso |
|---|---|---|
| **Edición CEDIJ** «Ley General de la Administración Pública.pdf» (`Email attachments/Documentos/MATERIAS POR AREAS Y TEMAS/DERECHO ADMINISTRATIVO/`) | 334,249 bytes, 43 págs., PDFMaker 8.1 (CSJ), 20-ago-2009, modificada el 1-mar-2012 · `6d2e24a99413628e0bcfcadfacb94c196a3cdbacbd4ba3e3ae825ceaa8351a3a` | **Texto base.** Arts. 1–126 con 4-A ausente, 15-A y 124-A a 124-D adicionados, y 38 notas al pie (D.85-91, D.218-96, D.284-98, D.83-2004 y D.157-2008) |
| **La Gaceta No. 33,336** del 23-ene-2014: Decreto No. 266-2013, «Ley para Optimizar la Administración Pública…» (`02_EJERCICIO_LEGAL/05_LEYES_Y_CODIGOS/`; la misma pieza que en la LPA) | 97,982 bytes, 16 págs., PDF nativo · `2c7c719347d5f480449205076068ab511c2c0cf447cbcbd443a690260ec4fe48` | **Reformas posteriores.** El Artículo 1 da nueva redacción a 27 artículos y vuelve a crear el 98; el Artículo 10 deroga los 4A, 15A, 82, 104, 105, 124-A y 124-B. Texto extraído por columnas; **sustituye** al de la edición |
| **La Gaceta No. 25,088** del 29-nov-1986 (`Biblioteca_Personal/LeyGeneralDeLaAdministracionPublica.pdf`) | 16,866,468 bytes, 10 págs. escaneadas · `3368ffdcd84d0401386c935bb75648f62a01c68a5fee63007f0275d1980d3555` | **Testigo oficial del texto original** (§4). No es fuente del texto del paquete |
| «Ley de la Administración Pública.pdf» (transcripción, 2003) | 130,299 bytes, 21 págs. · `b91bc49d4b2ce66eff1d66d05de7510680ae392f75bc919e3dec2b5cb17e436e` | Segundo testigo del texto de 1986 (`edC`): coincide con La Gaceta en 16 de las 17 correcciones |
| Edición del Poder Judicial (1998), «con reformas del Decreto 284-98» | 412,589 bytes, 42 págs. · `c75bac410adaa70a017d53c1b3dd63f5b1ca6e3fac83442bddcae3f79f9ac22b` | Datación: aún trae el texto de 1986 en los arts. 30, 31 y 33 |
| Edición de 2008 («LEY GENERAL DE LA ADMINISTRACION PÚBLICA F.doc», 47 notas), copia pública de Directorio Legislativo | 285,864 bytes, 35 págs. · `320c8d7d581eeee8e38b3e408e079283dd0847528b92adc8f65e800444c6fdb8` | Atribuye los arts. 30, 31, 33 y 34 al D.218-96 y los 33 y 34 también al D.284-98 (§5.2); discrepa sobre los arts. 88–97 (§5.4) |
| Edición CEDIJ de 2015 (con el D.266-2013), copia pública del INA | 455,341 bytes, 35 págs., 13-feb-2015 · `4bfc2af727656cc6d645985dd0fb3558555d5bdcb81bb34aca9d147e4968bbba` | **Control cruzado del D.266-2013:** anota exactamente los mismos 27 reformados, 7 derogados y el 98 adicionado. Anota además los arts. 67 y 69 como reformados por un «Decreto PCM-2013» (§5.3) |

**Corte del articulado:** de «Artículo 1. La presente Ley establece…» al «Dado en la ciudad de Tegucigalpa…». La nota 38 (publicación en La Gaceta 25,088) queda fuera del articulado.

**Correcciones de maquetación de la edición** (`erratasCrudas`, con el número de apariciones verificado):
- «Derogado10⏎.» en los arts. 38, 68 y 79: la llamada de nota antes del punto;
- encabezado «Artículo 124. B.»: sin la corrección, el 124-B se leería dentro del 124-A;
- segunda línea de la nota 34, que quedó después del 124-B por el salto de página;
- errata «Drogado.» del art. 96.

**Extracción del D.266-2013** (`extraerReformasD266`): xpdf 4.06, el mismo de los paquetes firmados, columna por columna (x = 0–396 y 396–792 pt). Controles:
- los 28 números esperados y en orden;
- número de párrafos verificado artículo por artículo (el 29: introducción + 15 Secretarías × 2 + 3 párrafos finales = 34);
- las 4,163 palabras extraídas aparecen todas en una extracción independiente de ancho completo con poppler 25.07; las únicas uniones son «suspen-sión» (art. 4) y «des-concentradas» (art. 45);
- se retiran las comillas de apertura y cierre de cada artículo; las interiores del 117 («EL PRESIDENTE DE LA REPÚBLICA») se conservan.

## 2. Situación actual (solo lectura, 2026-11-26)

- **Producción:** 0 filas del lote, del instrumento o con una fuente que diga «General de la Administración». No existe el respaldo `biblioteca_vectores_ola14_lgap_2014_01_backup`. Línea base: 92,163 filas, 12,931 visibles y 7,959 V5.
- **Staging:** 0 filas; 954 en total, todas visibles.

**No hay legacy** que ocultar.

## 3. Conteo y clasificación propuesta

| Concepto | Filas | Artículos |
|---|---:|---|
| **PRIMARY** (vigencia `TRUE_PRESUNTA`) | **94** | Todos los vigentes salvo los 11 de la fila siguiente: los que conservan el texto de 1986 (cotejados en §4), los 28 con texto del D.266-2013 y los de reforma anotada en la edición |
| CONTEXT vigente: reforma sin nota y texto oficial no verificado (§5.2, §5.3) | 11 | 30, 31, 33, 34, 35, 36, 63, 69, 81, 84, 86 |
| CONTEXT derogado por la edición | 20 | 38, 39, 40, 68, 70, 71, 72, 75 (D.218-96); 79 (D.85-91); 87–97 (D.83-2004) |
| CONTEXT derogado por el Artículo 10 del D.266-2013 | 6 | 15-A, 82, 104, 105, 124-A, 124-B (la edición conserva el texto, que se mantiene como antecedente) |
| **Total** | **131** | 1–126 más 15-A y 124-A a 124-D; sin 4-A |

**El art. 98** está derogado por el D.218-96 en la edición y vuelto a crear por el D.266-2013. Es PRIMARY con el texto nuevo, y su constancia del D.218-96 conserva el tipo `DEROGACION_TOTAL`, que es la historia del número. Para eso se agregó a `cedij.ts` la opción `recreados`; los 13 paquetes firmados siguen idénticos byte a byte.

**Constancias:** 82 en `constancias.csv`, de estos tipos:
- 37 `REFORMA`, 7 `ADICION` y 27 `DEROGACION_TOTAL`, entre notas de la edición y D.266-2013;
- 11 `REVISION_PENDIENTE_CLO`, una por cada artículo de §5.2 y §5.3.

**Motivo de las PRIMARY:** «PRIMARY elegible…: edición consolidada CEDIJ con reformas integradas; cotejo íntegro con La Gaceta pendiente (D1)».

**`materia`:** `10_LEYES_REGLAMENTOS`. **`fuente_tipo`:** `codigo`. **`fuente`:** «Ley General de la Administración Pública de Honduras (Decreto No. 146-86)».

## 4. Cotejo con La Gaceta 25,088 y corrección dirigida

**Método.** `scripts/olas/ocr-lgap.ts`:
- **OCR:** recorta cada columna a 300 ppi (el canal entre columnas se midió por página sobre las cajas de palabra) y la reconoce con Tesseract 5.5.3 `spa`, modo de una columna;
- **resultado:** 125 de 126 encabezados; el del art. 92 está dañado en la impresión, pero el 92 está derogado;
- **cotejo:** para los 75 artículos que conservan el texto de 1986, alinea palabra por palabra el OCR con el paquete, en forma comparable (minúsculas, sin tildes ni signos);
- **resolución:** cada diferencia se resolvió mirando la imagen (300–600 ppi) y la transcripción independiente `edC`.

**Resultado.**
- **Antes de corregir** había 136 diferencias; **después** quedan 121, de tres clases:
  - 42 de ruido de OCR («pubiica», «conside274», «perso7as»…), sin efecto en el texto;
  - las de los rótulos de estructura (Título, Capítulo, Sección), que el OCR lee dentro del artículo y el paquete pasa a `ubicacion`;
  - las de los 10 artículos de §5.2, cuyo texto no es el de 1986.
- **17 correcciones dirigidas:** la edición CEDIJ difiere de La Gaceta en palabras que ninguna reforma toca, y se adopta la lectura oficial. Están en `correcciones_gaceta_25088.csv` y en `CORRECCIONES_GACETA` del generador:

| Art. | Edición CEDIJ | La Gaceta 25,088 (adoptada) |
|---|---|---|
| 18 | «integraran el Consejo de Ministros» | «integran» (renglón dañado al margen; `edC`: «integran») |
| 36 | «sobre la entidades» · «sus propias actos» · «se hallan» | «sobre las entidades» · «sus propios actos» · «se hallen» |
| 56 | «a la reuniones» · «propietarios y suplentes» | «a las reuniones» · «propietarios o suplentes» |
| 57 | «plazo que se señale.» | «plazo que señale.» |
| 59 | «tres (3) veces» | «tres veces» |
| 63 | «Los Designados a la República» | «Los Designados a la Presidencia» |
| 65 | «vigentes de la entidad» | «vigentes en la entidad» |
| 74 | «serán publicados» | «serán publicadas» (así en el original; `edC` dice «publicados») |
| 84 | «una contra garantía» | «una contragarantía» |
| 86 | «Despachos de Fianazas» | «Despachos de Finanzas» (errata; ver §5.2) |
| 107 | «siete (7) días» | «siete días» |
| 115 | «lo tuviere su cónyuge» | «lo tuvieren su cónyuge» |
| 123 | «paridad en grado» | «paridad de grado» |
| 124 | «mil lempiras (L.100 a 1,000),» | «mil lempiras,» (la cifra es un agregado editorial) |

- **11 artículos con reforma sin nota** (§5.2 y §5.3).

**Límite del cotejo.** Compara palabras, no mayúsculas, tildes ni puntuación. En eso el texto sigue a la edición CEDIJ. Los artículos con reforma anotada (D.218-96, D.284-98, D.157-2008…) siguen el texto de la edición, sin cotejo con la Gaceta de cada reforma, que no está disponible (reserva 5.1).

## 5. Reservas

1. **Cotejo de las reformas intermedias.** No hay copia local de las Gacetas de los D.85-91, D.218-96 (28,148), D.284-98 (28,729), D.83-2004 ni D.157-2008. El texto de los artículos con reforma anotada es el de la edición CEDIJ.
2. **Reformas sin nota en la edición CEDIJ (arts. 30, 31, 33, 34, 35, 36, 63, 81, 84 y 86).** La edición trae un texto que no es el de 1986 y no anota la reforma.
   - **Arts. 30, 31, 33 y 34:** la edición de 2008 los atribuye al D.218-96, y los 33 y 34 también al D.284-98.
   - **Arts. 35 y 36:** «Secretarios Generales» en lugar de «Oficial Mayor» parece una sustitución tácita derivada del art. 124-B (D.218-96), que el D.266-2013 derogó.
   - **Arts. 36, 63 y 84:** «Tribunal Superior de Cuentas» en lugar de «Contraloría General de la República», posiblemente por la Ley Orgánica del TSC.
   - **Arts. 81, 84 y 86:** «Finanzas» en lugar de «Hacienda y Crédito Público».
   - **Divergencias entre ediciones:** el texto de los arts. 33–36 en la edición CEDIJ de 2015 no coincide palabra por palabra con el de 2009 (p. ej. «si hubiere más de un subsecretario», «y administradores generales»).
   - **Propuesta:** CONTEXT vigente, con el texto de 2009 y una constancia por artículo, hasta verificar el texto oficial.
3. **Arts. 67 y 69 y el «Decreto PCM-2013».** La edición CEDIJ de 2015 los anota como «Reformado mediante Decreto PCM-2013 de fecha 18 de diciembre de 2013», publicado en La Gaceta 33,341 del 29-ene-2014.
   - **Art. 67:** su texto es el mismo en todas las fuentes; se propone PRIMARY.
   - **Art. 69:** dice «Finanzas» en 2015 y «Hacienda y Crédito Público» en 1986 y 2009; se propone CONTEXT.
   - **Duda sobre la norma:** un decreto ejecutivo (PCM) no puede reformar una ley. La reforma debe verificarse en La Gaceta 33,341.
4. **Arts. 88 a 97.** Las ediciones CEDIJ de 2009 y 2015 los dan por derogados por el D.83-2004 (Ley Orgánica del Presupuesto). La de 2008 dice que el D.83-2004 derogó solo los 87, 91 y 96, y que los demás fueron reformados por el D.78-92 (el 92, por el D.165-91). Se proponen derogados, la opción cerrada: no se citan como fundamento. Queda por verificar la cláusula derogatoria del D.83-2004.
5. **Art. 4-A.** El D.266-2013 lo deroga, pero ninguna fuente disponible trae su texto, porque lo adicionó una reforma posterior a la edición de 2009. **Sin fila**, con el mismo criterio que la D5 de la OLA 13 (RLMUN).
6. **Reformas posteriores a 2014.**
   - **Lo comprobado:** los decretos ejecutivos PCM-059-2018 (La Gaceta 34,790) y PCM-103-2021 (La Gaceta 35,734) citan los arts. 28 y 29 en la redacción del D.266-2013.
   - **Lo no hallado:** no se encontró una reforma legislativa posterior. La búsqueda no es exhaustiva.
   - **Lo que falta:** confirmarlo en el registro legislativo antes de presentar la vigencia como cierta. Se propone `TRUE_PRESUNTA`.
7. **Denominaciones institucionales.** En los artículos de 1986 se conservan tal como se publicaron: «Consejo de Ministros», «Contraloría General», «Hacienda y Crédito Público». El D.266-2013 usa «Consejo de Secretarios de Estado» en los artículos que reforma.
8. **Identidad en la aplicación.** `LEY_GENERAL_ADMINISTRACION_PUBLICA` todavía no está en el catálogo de identidad (`instrument-identity.ts`) ni en `clo-guards.ts`. Hasta un PR de código, la aplicación tratará estas filas como CONTEXT (`SIN_INSTRUMENT_ID`), lo que falla cerrado, y el buscador no reconocerá la ley por su nombre (D8).

## 6. Decisiones D1–D8 para firma

| # | Decisión propuesta | Decisión del CLO |
|---|---|---|
| D1 | Fuente PRIMARY: edición CEDIJ 2009/2012 con sus notas, más el D.266-2013 tomado de La Gaceta 33,336. La Gaceta 25,088 es testigo del texto original, con las reservas 5.1 y 5.6 | ☐ |
| D2 | Aceptar la extracción (edición y D.266-2013 por columnas), el corte del articulado y las correcciones de maquetación de §1 | ☐ |
| D3 | Aceptar las 17 correcciones dirigidas de §4 a la lectura oficial de La Gaceta 25,088, y firmar el texto consolidado de 131 artículos (huella en §7) | ☐ |
| D4 | Vigencia: 105 `true` (`TRUE_PRESUNTA`) y 26 derogados (§3), con las reservas 5.4 y 5.6 | ☐ |
| D5 | Clasificación de §3: 94 PRIMARY; 11 CONTEXT vigentes por reforma no verificada (§5.2 y §5.3); art. 4-A sin fila (§5.5); art. 98 PRIMARY con el texto del D.266-2013 | ☐ |
| D6 | Constancias por fila (`constancias.csv`, 82): notas de la edición, D.266-2013 y revisión pendiente del CLO | ☐ |
| D7 | Sin legacy que ocultar (§2) | ☐ |
| D8 | Autorizar V4 en staging y V5 en producción, exactamente para los SQL y huellas de §7. Además, autorizar un PR de código posterior a la carga (P3) que registre `LEY_GENERAL_ADMINISTRACION_PUBLICA` (Decreto 146-86) en el catálogo de identidad, el guardián CLO y el buscador por nombre, para que sus filas PRIMARY sean citables | ☐ |

Firma: ______________________ (CLO / Director Maya Lex) · Fecha: __________

## 7. Paquete SQL y huellas (lo que autoriza D8)

Los archivos se generan en `out/ola14-lgap/` (directorio ignorado por git), de forma reproducible con `npx tsx scripts/olas/ola14-lgap.ts`. Dos corridas seguidas dan los mismos bytes en 13 archivos: los 9 SQL, `rows.jsonl`, `manifiesto_paquete.json`, `manifiesto_articulos.json` y `constancias.csv`. `npx tsx scripts/olas/verificar-firmadas.ts` confirma que los 13 paquetes firmados siguen idénticos tras el cambio de `cedij.ts`.

**Huellas del expediente:**
- texto consolidado: `4b6230b2366ce413fc2e0d0b1f35972915e917f981e1f90cba5626978f5c4f4c`;
- PDF de la edición CEDIJ: `6d2e24a99413628e0bcfcadfacb94c196a3cdbacbd4ba3e3ae825ceaa8351a3a`;
- `manifiesto_articulos.json`: `919c37b8e8db519bd2d93f107c9bdb6be46d904a6cc91e1748bbfe0b9227198b`;
- `constancias.csv`: `71cefa96cc5cb6c088d581eca641f3758eec7fa61c7232e9dd242a33a0f4b45b`;
- `rows.jsonl`: `014058e195583021e05c22421795729114dd8143bb31038394b078ef4ec89446`;
- articulado OCR de La Gaceta 25,088 (testigo, `out/ola14-lgap/ocr/articulado_ocr.txt`): `59dbba9f4b26f90c92720e25df645525e6fe88d22da3a46baec4c8b3469613bc`.

| Paso | Archivo | Bytes | SHA-256 | Firma |
|---:|---|---:|---|---|
| S1 | `staging/01_insert_staging.sql` | 303,804 | `6a88623ef0ff27ab449b01d96fe38c08c6f6fa7f797e22bb9d57db7a26b53a67` | No (filas ocultas) |
| S2 | `staging/02_embeddings_staging.sql` | 505,161 | `540c4d1a6702c5bb84b0a9fb579050a48a421b7867fc6b49fb4015cc31ae80d6` | No |
| S3 | `staging/03_verificacion_staging.sql` | 1,704 | `27f695f297c928464c1d44afc57ef71d96ffcfa0d8d22fb9817cac4936638070` | No (solo lectura) |
| S4 | `staging/04_visibilidad_v4_staging.sql` | 15,181 | `341025b1f7a2f90864aa3af1c441a3b7a574a4784988fe855fd7d01ae46d7616` | **Sí** |
| P0 | `prod/00_precheck_y_respaldo_prod.sql` | 1,522 | `25330f0043cde773805ccf8f16090b61f4eefb9432167fe0b535e743efaed00b` | **Sí** |
| P1 | `prod/01_datos_prod.sql` | 308,669 | `15efce3344da131edc4de488f8890f4d57ef11f6d18f82ddf12f131b6a31a75f` | **Sí** |
| P2 | `prod/02_embeddings_prod.sql` | 513,616 | `e9b8b26a72b622942774c7542c34e731609a95458b011b52c458ef37c23a4690` | **Sí** |
| P3 | `prod/03_activacion_v5_prod.sql` | 15,831 | `6f404997a9a060bc6763419bbc224715b3e3a25bc202690d81b3c515b33c3e71` | **Sí** |
| R | `prod/99_reversion_prod.sql` | 488 | `fef381379b1dce27fee5e971aaa879734632efcc62d3568dd143f30875b9568b` | Solo por orden del CLO; el `.ps1` no lo ejecuta |

**Ensayo en base desechable (2026-11-26).** Se corrió el paquete completo en PGlite 0.5.4 con pgvector real. El esquema son las 18 columnas de `biblioteca_vectores` copiadas de staging, con los roles `anon`/`authenticated`/`service_role` y una fila V5 ajena (art. 1 de la Ley de Municipalidades). Tras cada fallo esperado se hizo `ROLLBACK`, como el ejecutor.

- **Staging:**
  - S1 y S2 son reaplicables: 131 filas ocultas con embedding y 131 `num_articulo_norm` distintos.
  - S3 pasa.
  - S4 deja 131 visibles en V4 (94 PRIMARY vigentes, 11 CONTEXT vigentes y 26 derogados) y no toca la fila ajena; repetido, falla cerrada.
- **Producción, antes de activar:**
  - P3 se niega antes de P1/P2.
  - P0 crea el respaldo **con RLS y sin privilegios para `anon`/`authenticated`**; repetido, se niega a sobrescribirlo.
- **Activación:**
  - P3 activa 131 filas V5 con la misma distribución; los CONTEXT vigentes son exactamente 30, 31, 33, 34, 35, 36, 63, 69, 81, 84 y 86; repetido, falla cerrada.
  - R elimina el lote y deja intacta la fila ajena.

## 8. Ejecución tras la firma

```powershell
pwsh -File out\ola14-lgap\ejecutar_staging.ps1 -DesdePaso 1 -HastaPaso 3
pwsh -File out\ola14-lgap\ejecutar_staging.ps1 -DesdePaso 4 -HastaPaso 4
pwsh -File out\ola14-lgap\ejecutar_prod.ps1 -DesdePaso 0 -HastaPaso 3
```

S1–S3 no requieren firma: dejan las filas ocultas. Después de S3, Claude Code verifica staging en solo lectura antes de S4; después de P3, verifica producción en solo lectura. Con D8 firmada, el registro de identidad de la LGAP en la aplicación va en su propio PR.
