# Expediente de auditoría · OLA 13 · lote 1 · `HN:LEY_PROCEDIMIENTO_ADMINISTRATIVO`

**Estado:** PENDIENTE DE FIRMA
**Instrumento:** Ley de Procedimiento Administrativo (Decreto No. 152-87, La Gaceta No. 25,391 del 1-dic-1987) · lote `OLA13_LPA_2014_01`
**Fecha del paquete:** 2026-11-25 · **Generador:** `scripts/olas/ola13-lpa.ts` + `scripts/olas/cedij.ts` + `scripts/olas/paquete-ola.ts`
**Staging:** `mayalexhn-staging` (`aicakncgtuiiuomflkqj`) · **Producción:** `thgrhueckkjdutjvcufp`

> **Cómo se firma.** El CLO revisa las secciones 1 a 5 y decide D1–D8 en §6. Para firmar, sustituye en la línea **Estado** el texto `PENDIENTE DE FIRMA` por la fórmula de firma (D1–D8 y la palabra FIRMADAS) y completa el bloque de firma. El ejecutor (`scripts/olas/ejecutar-sql.ts`) lee la firma solo en esa línea **Estado** y se niega a correr la visibilidad V4 en staging y cualquier paso de producción si este archivo no está firmado o no cita la huella SHA-256 exacta de cada SQL (§7). Si el CLO modifica una decisión, hay que regenerar el paquete y volver a citar las huellas.
>
> **Gobernanza de la Fase II.** Ninguna escritura en producción sin esta auditoría, la validación en staging (pasos S1–S4) y la firma expresa del CLO.

## 1. Fuentes

| Pieza | Archivo · SHA-256 | Uso |
|---|---|---|
| Edición del CEDIJ (Poder Judicial) «LEY DE PROCEDIMIENTOS ADMINISTRATIVO HONDURAS.pdf» (`SISTEMA_LEGAL_PRINCIPAL/02_EJERCICIO_LEGAL/05_LEYES_Y_CODIGOS/`) | 204,513 bytes, 39 págs., Acrobat PDFMaker, 20-ago-2009 · `89e6a5dc851db2f49ba0b6971798df3eaf805b2f3835df4a8757c6b42c949d5a` | Texto base: arts. 1–154 más 29-A y 29-B. **5 notas al pie**: D.255-2002 (arts. 29, 29-A, 29-B, 53 y 63), la reforma constitucional del D.268-2002 (art. 117: el Tribunal Superior de Cuentas sustituye a la Contraloría) y la publicación de la ley |
| **La Gaceta No. 33,336** del 23-ene-2014: Decreto No. 266-2013, «Ley para Optimizar la Administración Pública, Mejorar los Servicios a la Ciudadanía y Fortalecimiento de la Transparencia en el Gobierno» (`…/20140123-DECRETO LEGISLATIVO No. 266_2013 …pdf`) | 16 págs., PDF nativo de La Gaceta · `2c7c719347d5f480449205076068ab511c2c0cf447cbcbd443a690260ec4fe48` | **Cruce D1–D8.** Su Artículo 2 reforma los arts. **1, 6, 41, 61, 87, 88, 119, 123 y 126** de la LPA. El texto se extrajo de La Gaceta por columnas y **sustituye** al de la edición |

**Extracción.** `scripts/olas/cedij.ts` con xpdf 4.06 (extractor de las olas firmadas). Correcciones registradas:
- la nota 5 va sangrada después de las firmas y el extractor de notas no la toma; su llamada («ochenta y ocho⁵») se retiró del art. 154 y la nota se registró como constancia del art. 154;
- las 9 reformas del D.266-2013 se integran con el parámetro nuevo `reformasPosteriores`: el texto de La Gaceta sustituye al de la edición, que queda referenciado por su huella (`texto_edicion_sha256` en metadata), y cada artículo lleva la constancia de reforma;
- en La Gaceta, el art. 88 reformado no cierra sus comillas y el art. 126 parte «conva-lidar» con guion; se transcribieron sin comillas y con la palabra unida.

## 2. Cruce con el D.266-2013 (reformas expresas y derogaciones)

| Artículo | Efecto del D.266-2013 | Resultado |
|---|---|---|
| 1 | Reforma: añade que la Ley **no se aplica al gobierno electrónico** ni a los procedimientos electrónicos, normados por Decreto Ejecutivo en Consejo de Secretarios de Estado | Texto de La Gaceta |
| 6 | Reforma: avocación del órgano superior | Texto de La Gaceta |
| 41 | Reforma: potestad reglamentaria del Poder Ejecutivo | Texto de La Gaceta |
| 61 | Reforma: requisitos del escrito inicial; añade teléfonos, correo electrónico y, en reclamos con pago de daños, **constancia de solvencia de la DEI** de los últimos cinco años | Texto de La Gaceta |
| 87 | Reforma: notificación **personal o electrónica** en cinco días | Texto de La Gaceta |
| 88 | Reforma: notificación personal o electrónica; tabla de avisos en defecto | Texto de La Gaceta |
| 119 | Reforma: nulidad de oficio de los actos del art. 34 | Texto de La Gaceta |
| 123 | Reforma: reparación del daño solo si la ley la prevé | Texto de La Gaceta |
| 126 | Reforma: convalidación de actos anulables | Texto de La Gaceta |

**Derogaciones.** El D.266-2013 no deroga expresamente ningún artículo de la LPA: sus Arts. 10 y 11 derogan artículos de la Ley General de la Administración Pública (4A, 15A, 82, 104, 105, 124-A y 124-B) y de la Ley Orgánica de la Procuraduría General (27). **Derogación tácita:** el D.266-2013 no trae cláusula derogatoria general (su Art. 12 solo fija la vigencia). Sus nueve reformas se integran con el texto de La Gaceta; el art. 1 reformado excluye del ámbito de la LPA el gobierno electrónico y los procedimientos electrónicos, y así consta en su constancia. **No se hizo un examen artículo por artículo** de posibles derogaciones tácitas de los 147 artículos no reformados por otras leyes posteriores (reserva 5.4).

## 3. Situación actual en producción (solo lectura, 2026-11-25)

**No hay legacy** de esta ley: ningún `norm_id`, prefijo de id ni fuente la identifica. No hay filas que ocultar.

## 4. Conteo y clasificación propuesta

| Concepto | Filas |
|---|---:|
| Artículos 1–154 más 29-A y 29-B | 156 |
| **PRIMARY** | **156** |
| CONTEXT | 0 |

**Constancias:** 16 (15 de reforma: 9 del D.266-2013 sin nota y 6 de las notas del D.255-2002 y del D.268-2002; 1 de referencia: la publicación, nota 5).

**`materia`:** `10_LEYES_REGLAMENTOS`. Producción no tiene una materia administrativa propia (las 12 existentes se listaron en solo lectura); se usa la general de leyes. Ver D5.

## 5. Reservas

1. **Reformas posteriores a 2014.** El cruce se hizo con el único decreto de reforma disponible localmente (D.266-2013). Cualquier reforma posterior de la LPA queda para revisión incremental.
2. **Cotejo con La Gaceta del texto base.** Los 147 artículos no reformados por el D.266-2013 vienen de la edición del CEDIJ (con reformas del D.255-2002), sin cotejo propio con La Gaceta.
3. **Art. 117.** La edición ya integra «Tribunal Superior de Cuentas» en lugar de «Contraloría General de la República» (nota 4); se conserva así. La remisión del mismo artículo «a los efectos del Artículo 153» se transcribe tal como la imprime la edición.
4. **Derogaciones tácitas.** Queda pendiente un examen de los 147 artículos no reformados frente a leyes posteriores (p. ej. de gobierno electrónico o de transparencia).

## 6. Decisiones D1–D8 para firma

| # | Decisión propuesta | Decisión del CLO |
|---|---|---|
| D1 | Fuente PRIMARY: edición CEDIJ para el texto base y La Gaceta 33,336 para los 9 artículos reformados por el D.266-2013, con las reservas 5.1 y 5.2 | ☐ |
| D2 | Aceptar la extracción, la integración de las 9 reformas del D.266-2013 y la corrección de la nota 5 (art. 154) | ☐ |
| D3 | Firma del texto consolidado de 156 artículos (huella en §7) | ☐ |
| D4 | Vigencia: 156 `true`; el D.266-2013 no deroga ningún artículo de la LPA (§2); derogaciones tácitas, según la reserva 5.4 | ☐ |
| D5 | Materia `10_LEYES_REGLAMENTOS` (o la que indique el CLO; cambiarla obliga a regenerar) | ☐ |
| D6 | Constancias por fila (16; ver `constancias.csv`) | ☐ |
| D7 | Sin legacy que ocultar | ☐ |
| D8 | Autorizar V4 en staging y V5 en producción, exactamente para los SQL y huellas de §7 | ☐ |

Firma: ____________________ · Abg. y Not. Fredy Omar Pinel Flores (CLO / Director Maya Lex) · Fecha: __________

## 7. Paquete SQL y huellas (lo que autoriza D8)

Los archivos se generan en `out/ola13-lpa/` (directorio ignorado por git), de forma reproducible con `npx tsx scripts/olas/ola13-lpa.ts`. Se comprobó que dos corridas seguidas dan los mismos bytes.

**Huellas del expediente:**
- texto consolidado: `da407b936fb0592fcde8e83b5ba844f080a8de6a264fac4b21af340c8245d811`;
- PDF fuente: `89e6a5dc851db2f49ba0b6971798df3eaf805b2f3835df4a8757c6b42c949d5a`;
- `manifiesto_articulos.json`: `f3385633d4037c2e4834ef2c5a47e2560a3ef8c20743bd9f07e09e4599435049`;
- `constancias.csv`: `9faf892ad52a3c965a20feac78d08fca3c6b439144f5fcd20e8e0c23e8f9e3bf`.

| Paso | Archivo | Bytes | SHA-256 | Firma |
|---:|---|---:|---|---|
| S1 | `staging/01_insert_staging.sql` | 271,965 | `f7da061253208037f9d9e7e4b330388d04805dff09561d44309cb64feaec7bab` | No (filas ocultas) |
| S2 | `staging/02_embeddings_staging.sql` | 600,967 | `b2967c20a75f84312eba748f42b863b6c67221365d7ea29e9345df68f05fcfe2` | No |
| S3 | `staging/03_verificacion_staging.sql` | 1,694 | `0bbd85e6afb0109cbf58ed6e1b3f91dc22a100201e20634dc06a3b51ec7e4301` | No (solo lectura) |
| S4 | `staging/04_visibilidad_v4_staging.sql` | 13,573 | `2d18fd50233d95d8950c549d4b811acdb183c0c319983aabc8396a7d80e0c40d` | **Sí** |
| P0 | `prod/00_precheck_y_respaldo_prod.sql` | 1,507 | `15253ba1a76104fd99906255753189787bffb1a43c496166fc9d137532291e07` | **Sí** |
| P1 | `prod/01_datos_prod.sql` | 277,704 | `ec7ff6e8a5b1805930559390a5f704f828742737c96b522e7ea306943b5a1903` | **Sí** |
| P2 | `prod/02_embeddings_prod.sql` | 611,022 | `f0ba383a14532433a4ed3b3087f84faf9f8dad10e09c8c7f97005fddcad8d3a7` | **Sí** |
| P3 | `prod/03_activacion_v5_prod.sql` | 13,928 | `863f9a1f0725fbedbdfb182e6662a3e58112d1775537c7cd41c6edb6df52bc37` | **Sí** |
| R | `prod/99_reversion_prod.sql` | 484 | `c0365931b8347ec96965e9bd9a42d2a8fbe96fc2fc1c46a81ffb4a506900fb45` | Solo por orden del CLO; el `.ps1` no lo ejecuta |

**Ensayo en base desechable (2026-11-25).** Se corrió el paquete completo en PGlite (Postgres con pgvector): esquema real de 18 columnas, roles `anon`/`authenticated`/`service_role` y una fila V5 ajena.
- **Staging:** S1 y S2 son reaplicables. S3 verifica todas las huellas SHA-256. La repetición de S4 falla cerrada.
- **Producción, antes de activar:** P3 se niega antes de P1/P2. P0 crea el respaldo (vacío: no hay legacy) **con RLS y sin privilegios para `anon`/`authenticated`**, y no sobrescribe un respaldo existente.
- **Activación y reversión:** P3 activa 156 filas V5 (156 PRIMARY). R elimina el lote y deja intacta la fila ajena.

## 8. Ejecución tras la firma

```powershell
pwsh -File out\ola13-lpa\ejecutar_staging.ps1 -DesdePaso 1 -HastaPaso 3
pwsh -File out\ola13-lpa\ejecutar_staging.ps1 -DesdePaso 4 -HastaPaso 4
pwsh -File out\ola13-lpa\ejecutar_prod.ps1
```

Después de S3, Claude Code verifica staging en solo lectura antes de S4; después de P3, verifica producción en solo lectura.
