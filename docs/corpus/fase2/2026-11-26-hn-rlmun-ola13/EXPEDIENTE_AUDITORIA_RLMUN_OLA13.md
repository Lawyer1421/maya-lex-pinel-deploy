# Expediente de auditoría · OLA 13 · lote 3 · `HN:REGLAMENTO_LEY_MUNICIPALIDADES`

**Estado:** D1–D8 FIRMADAS
**Instrumento:** Reglamento General de la Ley de Municipalidades (Acuerdo Ejecutivo No. 018-93, 1-feb-1993; La Gaceta del 18-feb-1993) · lote `OLA13_RLMUN_1993_01`
**Fecha del paquete:** 2026-11-26 · **Generador:** `scripts/olas/ola13-rlmun.ts` + `scripts/olas/cedij.ts` + `scripts/olas/paquete-ola.ts`
**Staging:** `mayalexhn-staging` (`aicakncgtuiiuomflkqj`) · **Producción:** `thgrhueckkjdutjvcufp`

> **Cómo se firma.** El CLO revisa las secciones 1 a 5 y decide D1–D8 en §6. Para firmar, sustituye en la línea **Estado** el texto `PENDIENTE DE FIRMA` por la fórmula de firma (D1–D8 y la palabra FIRMADAS) y completa el bloque de firma. El ejecutor (`scripts/olas/ejecutar-sql.ts`) lee la firma solo en esa línea **Estado** y se niega a correr la visibilidad V4 en staging y cualquier paso de producción si este archivo no está firmado o no cita la huella SHA-256 exacta de cada SQL (§7). Si el CLO modifica una decisión, hay que regenerar el paquete y volver a citar las huellas.
>
> **Gobernanza de la Fase II.** Ninguna escritura en producción sin esta auditoría, la validación en staging (pasos S1–S4) y la firma expresa del CLO.

## 1. Fuente y separación de la Ley

| Pieza | Archivo · SHA-256 | Uso |
|---|---|---|
| Edición **AMHON** «LEY DE MUNICIPALIDADES.pdf» (`SISTEMA_LEGAL_PRINCIPAL/02_EJERCICIO_LEGAL/05_LEYES_Y_CODIGOS/`): el mismo PDF del lote `OLA13_LMUN_2009_01` | 586,828 bytes, 221 págs., Adobe Acrobat 9, 26-oct-2011 · `b711caf62cc5996650e18a4294ed761501b7a9066060dc9555ff34234ec181ee` | **Solo el Reglamento General**: el Acuerdo empieza en la pág. 113, el articulado en la pág. 114 y el art. 228 está en la pág. 221. Arts. 1–228, de los que la edición imprime 226. **Sin reformas anotadas y sin notas al pie** |

**Separación de la Ley (lote `OLA13_LMUN_2009_01`, ya en V5).**

Cómo se delimita el texto:
- **Corte del articulado:** empieza en «ARTÍCULO 1. El presente Reglamento tiene por objetivo…» y termina en la firma «Rafael Leonardo Callejas» que sigue al art. 228.
- **Lo que queda fuera:** todo lo anterior, es decir, la Ley con su «Dado en…» de la pág. 112, el Acuerdo 018-93 y sus considerandos.
- **Encabezados distintos:** la Ley encabeza sus artículos «ARTÍCULO N.-» y el Reglamento «ARTÍCULO N.».

Controles:
- **Identidad propia:** lote `OLA13_RLMUN_1993_01`, `instrumento_id` `REGLAMENTO_LEY_MUNICIPALIDADES`, `norm_id` `HN:REGLAMENTO_LEY_MUNICIPALIDADES`, ids `OLA13_RLMUN_1993_01:REGLAMENTO_LEY_MUNICIPALIDADES:N`.
- **Frente a los 162 artículos de la Ley:** 0 ids comunes y 0 huellas `hash_contenido` comunes.
- **Ningún texto de la Ley dentro del Reglamento.** Se buscaron tramos de 12 o más palabras compartidos con la Ley:
  - aparecen en 17 artículos, con un máximo de 17 palabras;
  - todos son fraseología institucional que el Reglamento repite, p. ej. «a través de la Secretaría de Estado en los Despachos de Gobernación y Justicia», «tres por ciento (3%) mensual sobre las cantidades retenidas y no enteradas en el plazo»;
  - ningún artículo de la Ley está contenido en uno del Reglamento.
- **Clasificador de la aplicación:** `clo-guards.ts` distingue las dos fuentes. Citar el Reglamento no cuenta como nombrar la Ley (pruebas en `tests/clo-olas-v5-identidad.test.ts`).

**Extracción.** Con el mismo extractor por coordenadas de la Ley (`extraerColumnaAmhon`: poppler 25.07 `-bbox-layout`, sin títulos de margen x ≥ 430 pt ni cabecera y < 55 pt) y `sinNotas` (la edición no trae notas en el Reglamento).

**Encabezados atípicos reconocidos:**
- «ARTÍCULO 45 No podrá…» (sin punto);
- «ARTÍCULO. 177 Los gastos…» (punto antes del número).

**Correcciones registradas:**
- **art. 218:** se retiró el aviso editorial «NOTA: El ARTÍCULO 219 no aparece publicado en el Diario Oficial la Gaceta», que no es texto del Reglamento (ver D5);
- **art. 7:** el rótulo «TITULO II / CAPITULO I / De la Municipalidad», el único en minúsculas, quedaba pegado al final del art. 7; pasa a la `ubicacion` del art. 8, como los demás rótulos;
- **sin punto final:** 7 artículos no lo llevan en la edición (45, 112, 118, 121, 163, 170 y 196). Se verificó en una extracción independiente de ancho completo (`-layout`): en los 7 el texto sigue directamente con el encabezado del artículo siguiente.

## 2. Situación actual (solo lectura, 2026-11-26)

- **Producción:** 0 filas del lote, del instrumento, del `norm_id` o con una fuente que diga «Reglamento… Municipalidades». No existe el respaldo `biblioteca_vectores_ola13_rlmun_1993_01_backup`. Línea base: 91,937 filas, 12,705 visibles y 7,733 V5.
- **Staging:** 0 filas; 728 en total, todas visibles.

**No hay legacy** que ocultar.

## 3. Conteo y clasificación propuesta

| Concepto | Filas |
|---|---:|
| Artículos impresos (1–228 salvo 26 y 219) | 226 |
| **PRIMARY** | **226** |
| CONTEXT | 0 |
| Artículos no impresos por la edición (sin fila) | 2 (26 y 219) |

**Constancias:** 0. El Reglamento no trae notas ni marcas de reforma; los dos números no impresos constan en `manifiesto_articulos.json` (`no_impresos`).

**Motivo de clasificación:** «PRIMARY elegible: edición AMHON del Acuerdo 018-93, sin reformas anotadas; cotejo íntegro con La Gaceta pendiente (D1)».

**`materia`:** `10_LEYES_REGLAMENTOS`. **`fuente_tipo`:** `codigo`, igual que los demás lotes V5; `clo-guards.ts` lo admite como tipo normativo.

## 4. Artículos que la edición no imprime

| Art. | Qué imprime la edición | Propuesta |
|---|---|---|
| 26 | Ningún encabezado: después del art. 25 («La suspensión del cargo implica…») el texto sigue sin corte con «Son causales de suspensión: a)… d)…» hasta el art. 27 | **Sin fila 26.** El texto queda dentro del art. 25 tal como se imprime. Es probable que «Son causales de suspensión…» sea el art. 26 original; solo el cotejo con La Gaceta del 18-feb-1993 puede confirmarlo (reserva 5.1) |
| 219 | «NOTA: El ARTÍCULO 219 no aparece publicado en el Diario Oficial la Gaceta» | **Sin fila 219.** La nota editorial se retira del art. 218 |

## 5. Reservas

1. **Cotejo con La Gaceta.** La edición AMHON no es la oficial y no hay copia local de La Gaceta del 18-feb-1993. Hace falta para confirmar los arts. 26 y 219 y el texto íntegro.
2. **Vigencia presunta.**
   - El Reglamento es de 1993 y la Ley se reformó después: D.48-91 antes; D.124-95, D.127-2000, D.143-2009 y otras posteriores.
   - Las disposiciones que desarrollan artículos reformados o derogados de la Ley pueden haber quedado sin efecto. Ejemplos: el Impuesto de Tradición de Bienes Inmuebles (art. 81 de la Ley, derogado) y las tasas del Impuesto Personal.
   - No se hizo un examen artículo por artículo; la vigencia se propone `TRUE_PRESUNTA`, como en la Ley.
3. **Denominaciones institucionales de 1993:**
   - «Contraloría General de la República» (hoy, Tribunal Superior de Cuentas);
   - «Ministerio de Hacienda y Crédito Público»;
   - «Secretaría de Estado en los Despachos de Gobernación y Justicia».

   Se conservan tal como se imprimen.
4. **Tablas.** El art. 112 trae una tabla de cálculo del Impuesto sobre Industrias, Comercios y Servicios. Se transcribe en líneas, sin formato tabular.

## 6. Decisiones D1–D8 para firma

| # | Decisión propuesta | Decisión del CLO |
|---|---|---|
| D1 | Fuente PRIMARY: edición AMHON 2011, solo el Reglamento General (págs. 114–221), con las reservas 5.1 y 5.2 | ☑ **Aprobada** por el CLO (2026-11-26) |
| D2 | Aceptar la extracción por coordenadas, la separación de la Ley (§1) y las correcciones de §1 | ☑ **Aprobada** por el CLO (2026-11-26) |
| D3 | Firma del texto consolidado de 226 artículos (huella en §7) | ☑ **Aprobada** por el CLO (2026-11-26) |
| D4 | Vigencia: 226 `true` (`TRUE_PRESUNTA`), con la reserva 5.2 | ☑ **Aprobada** por el CLO (2026-11-26) |
| D5 | Arts. 26 y 219 sin fila (§4); materia `10_LEYES_REGLAMENTOS` | ☑ **Aprobada** por el CLO (2026-11-26): no se crean filas sintéticas para el art. 26 (su texto permanece integrado en el art. 25 tal como lo imprime la edición AMHON) ni para el art. 219 (no publicado en La Gaceta); ambas observaciones constan en §4 y en `manifiesto_articulos.json` (`no_impresos`). Total: 226 artículos |
| D6 | Sin constancias por fila (la edición no anota reformas); los no impresos constan en `manifiesto_articulos.json` | ☑ **Aprobada** por el CLO (2026-11-26) |
| D7 | Sin legacy que ocultar; separación de `OLA13_LMUN_2009_01` verificada (§1) | ☑ **Aprobada** por el CLO (2026-11-26) |
| D8 | Autorizar V4 en staging y V5 en producción, exactamente para los SQL y huellas de §7. Además, autorizar el cambio de código que retira `REGLAMENTO_LEY_MUNICIPALIDADES` de `INSTRUMENTOS_SOLO_CONTEXT` en `lib/legal-retrieval/clo-guards.ts`. Hasta ese cambio, la aplicación trata sus filas como CONTEXT aunque estén en V5 | ☑ **Aprobada** por el CLO (2026-11-26). Incluye la autorización expresa del cambio de código que retira `REGLAMENTO_LEY_MUNICIPALIDADES` de `INSTRUMENTOS_SOLO_CONTEXT` para desbloquear RLMUN en la aplicación, en un PR posterior a su carga en producción (P3) |

*Aprobación parcial (2026-11-26).* El CLO aprobó D5 en los términos indicados y autorizó los pasos S1–S3 en staging, que no requieren firma. D1–D4 y D6–D8 quedan para la firma, después de la auditoría de staging (§9).

Firma: **Abg. y Not. Fredy Omar Pinel Flores** (CLO / Director Maya Lex) · Fecha: **2026-11-26** · *Registrada por Claude Code por orden expresa del CLO, tras aprobar la auditoría de staging (§9).*

## 7. Paquete SQL y huellas (lo que autoriza D8)

Los archivos se generan en `out/ola13-rlmun/` (directorio ignorado por git), de forma reproducible con `npx tsx scripts/olas/ola13-rlmun.ts`. Se comprobó que dos corridas seguidas dan los mismos bytes (los 9 SQL, `rows.jsonl`, `manifiesto_paquete.json`, `manifiesto_articulos.json` y `constancias.csv`). El generador usa dos parámetros opcionales nuevos de `cedij.ts` (`noImpresos` y `motivoPrimary`), y `verificar-firmadas.ts` confirma que los 12 paquetes firmados siguen idénticos byte a byte.

**Huellas del expediente:**
- texto consolidado: `5d78859178f728cc81b7d04da3b5a95d05d5487ccb92dd43fd7b5fb91ce87d97`;
- PDF fuente: `b711caf62cc5996650e18a4294ed761501b7a9066060dc9555ff34234ec181ee`;
- `manifiesto_articulos.json`: `9559baa7a3a8c85cbec1e1814b16ae8948f4f39f25c6187c317139db82aedd03`;
- `constancias.csv`: `8f9c669286ebb0f5e25f1f8d2736f94e3d2062d4bf54c857f0ebbdfa0e2dc5c6` (solo encabezado: 0 constancias).

| Paso | Archivo | Bytes | SHA-256 | Firma |
|---:|---|---:|---|---|
| S1 | `staging/01_insert_staging.sql` | 437,420 | `29e86bc21e55d00bf12cc75b2b27f81590052280d203bf6241e4289a4e42cdc6` | No (filas ocultas) |
| S2 | `staging/02_embeddings_staging.sql` | 870,705 | `4a871b0763fc52cb9dd4f69eab5af40aa5ab87260f07c28292a930a66cb57eea` | No |
| S3 | `staging/03_verificacion_staging.sql` | 1,696 | `0f36b7bc1fd3f1540c35ee72745e0423c0c1709916c8eb796b3104b6bb0b49bc` | No (solo lectura) |
| S4 | `staging/04_visibilidad_v4_staging.sql` | 16,654 | `0ae97cfe8b21450858962c282d23efffa035724ac4721638efa623c09a6cf97c` | **Sí** |
| P0 | `prod/00_precheck_y_respaldo_prod.sql` | 1,519 | `116449d9a65849f3079080b6475d0b4ae8648b7d478749551642ad52c6424e78` | **Sí** |
| P1 | `prod/01_datos_prod.sql` | 445,611 | `23330caef1173e010aaa35592d29e1944ea057e3014015e4b46b47106b856394` | **Sí** |
| P2 | `prod/02_embeddings_prod.sql` | 885,240 | `12e13e43b91ed2af80269af211a28b9869be0421a7ffa8de9ed46ef5bd93e571` | **Sí** |
| P3 | `prod/03_activacion_v5_prod.sql` | 16,891 | `5cbd08540748ddebe7e4b28eae11e02a135e8eef54e82cc43231e671956b3e33` | **Sí** |
| R | `prod/99_reversion_prod.sql` | 486 | `8f7e1c78fad0a1da1f5e104cf4bfb6710ca0fbe3b9be6e5ef583c5077e1af674` | Solo por orden del CLO; el `.ps1` no lo ejecuta |

**Ensayo en base desechable (2026-11-26).** Se corrió el paquete completo en PGlite 0.5.4 con pgvector real. El esquema son las 18 columnas de `biblioteca_vectores` copiadas de staging, con los roles `anon`/`authenticated`/`service_role` y una fila V5 ajena (art. 1 de la Ley de Municipalidades). Tras cada fallo esperado se hizo `ROLLBACK`, como el ejecutor.

- **Staging:**
  - S1 y S2 son reaplicables: 226 filas ocultas con embedding.
  - S3 pasa.
  - S4 deja 226 visibles en V4 y sin tocar la fila ajena; repetido, falla cerrada.
- **Producción, antes de activar:**
  - P3 se niega antes de P1/P2.
  - P0 crea el respaldo (vacío) **con RLS y sin privilegios para `anon`/`authenticated`**, y no sobrescribe un respaldo existente.
- **Activación:**
  - P3 activa 226 filas V5 (226 PRIMARY, 226 `num_articulo_norm` distintos, ninguno 26 ni 219); repetido, falla cerrada.
  - R elimina el lote y deja intacta la fila ajena.

## 8. Ejecución tras la firma

```powershell
pwsh -File out\ola13-rlmun\ejecutar_staging.ps1 -DesdePaso 1 -HastaPaso 3
pwsh -File out\ola13-rlmun\ejecutar_staging.ps1 -DesdePaso 4 -HastaPaso 4
pwsh -File out\ola13-rlmun\ejecutar_prod.ps1 -DesdePaso 0 -HastaPaso 3
```

Después de S3, Claude Code verifica staging en solo lectura antes de S4; después de P3, verifica producción en solo lectura. Con D8 firmada, el retiro de `REGLAMENTO_LEY_MUNICIPALIDADES` de `INSTRUMENTOS_SOLO_CONTEXT` va en su propio PR.

## 9. Auditoría de staging (pasos S1–S3)

**Lectura de verificación (2026-11-26, solo lectura, staging `aicakncgtuiiuomflkqj`), después de que el CLO corriera `ejecutar_staging.ps1 -DesdePaso 1 -HastaPaso 3` (226 filas cargadas ocultas). Resultado: conforme.**

| Control | Esperado | Observado | |
|---|---|---|---|
| Huellas SHA-256 en disco de S1–S4, P0–P3 y R | §7 | 9 de 9 idénticas | ✔ |
| Filas del lote `OLA13_RLMUN_1993_01` | 226 | 226 (226 `id` y 226 `num_articulo_norm` distintos); ninguna con número 26 ni 219 (D5) | ✔ |
| Ocultas (`revision_pendiente = true`) | 226 | 226; ninguna otra fila oculta en staging | ✔ |
| `es_norma_vigente` | `NULL` hasta V4 | 226 `NULL` | ✔ |
| `sha256(contenido) = hash_contenido = metadata.article_sha256` | 226 | 226 | ✔ |
| Huella del lote (md5 de `id\|hash_contenido`, orden C) frente a `rows.jsonl` | `af3ca3b3f42d8566eacfdcbec4f8878d` | idéntica | ✔ |
| Embeddings | 226 de 384D | 226 de 384D; las sumas de control de la 1.ª y la 384.ª componente (12.5105 y 13.8660) coinciden con S2 | ✔ |
| `instrumento_id` / `norm_id` / jurisdicción / colección / materia / fuente | únicos | `REGLAMENTO_LEY_MUNICIPALIDADES` / `HN:REGLAMENTO_LEY_MUNICIPALIDADES` / `HN` / `mayalex_normativos` / `10_LEYES_REGLAMENTOS` / «Reglamento General de la Ley de Municipalidades de Honduras (Acuerdo No. 018-93)» | ✔ |
| Clasificación propuesta | 226 VIGENTE, 0 CONTEXT | 226 PRIMARY propuestos; sin `estado_v` ni `rol` todavía (los asigna S4) | ✔ |
| Constancias | 0 | 0 | ✔ |
| Correcciones de §1 | aplicadas | el art. 25 contiene «Son causales de suspensión: … d)…» (D5); el art. 218 termina en «…y sus fundamentos.», sin la nota editorial del 219; la `ubicacion` del art. 8 es «TITULO II / CAPITULO I / De la Municipalidad»; sin residuos en ningún artículo | ✔ |
| Separación de la Ley | 0 | 0 ids y 0 huellas comunes con `OLA13_LMUN_2009_01`, cuyas 162 filas siguen intactas (V4 y visibles) | ✔ |
| Las RPC no exponen el lote oculto | 0 | `buscar_biblioteca_v3` y `resolver_articulo_exacto` (md5 `4392a97a…` / `37735385…`): 0 filas del Reglamento | ✔ |

Contexto de staging: 954 filas en total = 728 visibles + 226 ocultas, que son exactamente las de este lote.

**Precondición de S4:** se cumple (226 filas ocultas, vigencia `NULL`, con embedding y huella correcta). El lote queda apto para la firma D1–D8 y el paso S4.

## 10. Verificación de staging tras S4 (V4)

**Lectura de verificación (2026-11-26, solo lectura, staging `aicakncgtuiiuomflkqj`), después de que el CLO corriera `ejecutar_staging.ps1 -DesdePaso 4 -HastaPaso 4` con el expediente firmado. Resultado: conforme.**

| Control | Esperado | Observado | |
|---|---|---|---|
| Filas del lote | 226 | 226 (226 `id` y 226 `num_articulo_norm` distintos); ninguna con número 26 ni 219 (D5) | ✔ |
| Visibles (`revision_pendiente = false`) en V4 | 226 | 226, todas con `metadata.estado_v = 'V4'` | ✔ |
| PRIMARY vigentes (`es_norma_vigente = true`, sin `rol`) | 226 | 226; 0 con `rol`, 0 con `clasificacion_propuesta` | ✔ |
| Metadatos de V4 | únicos | `vigencia = TRUE_PRESUNTA` y `revision_pendiente = false` en 226; `motivo_rol` único: «PRIMARY elegible: edición AMHON del Acuerdo 018-93, sin reformas anotadas; cotejo íntegro con La Gaceta pendiente (D1)»; `adjudicacion` = «EXPEDIENTE_AUDITORIA_RLMUN_OLA13.md (D1–D8)» | ✔ |
| `sha256(contenido) = hash_contenido = metadata.article_sha256` | 226 | 226 | ✔ |
| Huella del lote (md5 de las líneas `id\|hash_contenido`, ordenadas en C) | `af3ca3b3f42d8566eacfdcbec4f8878d` | idéntica (S4 no altera texto ni identidad) | ✔ |
| Embeddings | 226 de 384D, sumas 12.5105 / 13.8660 | iguales a §9 | ✔ |
| Ley de Municipalidades (`OLA13_LMUN_2009_01`) | intacta | 162 filas, 162 visibles, 162 V4; 0 huellas comunes con el Reglamento | ✔ |
| RPC (md5 de `prosrc`) | `4392a97a…` / `37735385…` | sin cambios | ✔ |
| `resolver_articulo_exacto('REGLAMENTO_LEY_MUNICIPALIDADES', …)` | art. 25 → 1; art. 219 → 0 | 1 y 0; `LEY_MUNICIPALIDADES` art. 25 sigue devolviendo su propia fila | ✔ |
| `buscar_biblioteca_v3` (colección `mayalex_normativos`, HN, solo vigentes) con el embedding del art. 25 | el propio artículo primero | art. 25 del Reglamento con similitud 1.0000; a continuación, artículos de la Ley y del Reglamento | ✔ |

Contexto de staging: 954 filas en total, todas visibles (0 ocultas).

**Precondición de producción:** se cumple. El lote queda apto para P0–P3 con el mismo paquete (huellas de §7).
