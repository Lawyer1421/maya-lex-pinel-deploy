# Dictamen · Corrección C2 · Ley de Propiedad, art. 28 → CONTEXT vigente

**Estado:** C2 FIRMADA (2026-11-27, Abg. y Not. Fredy Omar Pinel Flores, CLO)
**Fecha:** 2026-11-27 · **Destino:** producción `thgrhueckkjdutjvcufp`, con ensayo previo en staging `aicakncgtuiiuomflkqj`
**Aprobación:** el CLO aprobó en la sesión del 2026-11-27 la propuesta, el tipo de constancia `ADICION` (§2) y las decisiones C2-a, C2-b y C2-c (§6), con las huellas de §3. La reversión 99 **no** está autorizada.

## 1. Hallazgo

Durante el diagnóstico de la OLA 15 (`docs/corpus/fase2/DIAGNOSTICO_FUENTES_OLA15_LGM.md`, §4) apareció lo siguiente. El **art. 83 del Decreto No. 182-2009, Ley de Garantías Mobiliarias** (La Gaceta No. 32,125 del 28-ene-2010, vigente seis meses después de su publicación según su art. 86), «REFORMA A LA LEY DE PROPIEDAD», reforma por adición los **numerales 2), 5), 7) y 8) del art. 28** de la Ley de Propiedad (D.82-2004):

| Numeral | Texto en producción (edición CSJ de 2007) | Tras el art. 83 del D.182-2009 (lectura OCR, pendiente de cotejo) |
|---|---|---|
| 2) | «Registro de la Propiedad Mueble: … vehículo y otros …» | «Registro de la Propiedad **Vehicular**: … vehículos automotores, motocicletas y otros similares …» |
| 5) | Registros especiales, sin garantías | Agrega «condiciones generales de contratación, **garantías mobiliarias**» |
| 7) | — (no existe) | «Registro de la Propiedad **Pecuaria**: … ganado mayor y menor …» |
| 8) | — (no existe) | «Registro de **garantías mobiliarias** …» |

La fila de producción `OLA12_LP_2007_01:LEY_PROPIEDAD:28` tiene el texto **anterior** a la reforma y hoy es **PRIMARY elegible**: V5, `es_norma_vigente = true`, sin `rol` y con `constancias: []`. El expediente de la OLA 12 LP (§4 y D5) solo identificó como reformas no integradas los D.109-2009, D.150-2010 y D.205-2012. El D.182-2009 no figura.

**Riesgo:** una consulta sobre los registros del Instituto de la Propiedad puede recibir como fundamento un texto sin el Registro de Garantías Mobiliarias ni el Registro Pecuario.

## 2. Corrección propuesta

Se aplica el **mismo criterio que la D5 firmada de la OLA 12** (arts. 53, 75, 77, 126 y 140): CONTEXT vigente con constancia de reforma no integrada, hasta integrar el texto cotejado. En este caso eso ocurrirá con la OLA 15.

**Solo cambia `metadata`.** No cambian el texto, el embedding, la vigencia (`es_norma_vigente` sigue en `true`), la visibilidad (`revision_pendiente` sigue en `false`) ni ninguna otra columna. La metadata nueva es exactamente la del respaldo con este parche (`respaldo || parche`):

| Clave | Antes | Después |
|---|---|---|
| `rol` | (ausente → PRIMARY elegible) | `"CONTEXT"` |
| `motivo_rol` | «PRIMARY elegible: edición consolidada …» | «CONTEXT vigente: reformado por adición (numerales 2, 5, 7 y 8) por el art. 83 del D.182-2009, Ley de Garantías Mobiliarias, después de la edición de 2007; el texto de la reforma no está integrado (corrección C2, hasta la OLA 15)» |
| `constancias` | `[]` | 1 constancia: `tipo: "ADICION"`, `decretos: ["182-2009"]`, con un texto que cita el art. 83, La Gaceta 32,125 del 28-ene-2010 y que la reforma no está integrada |
| `correcciones_clo` | (ausente) | `[{"id": "C2", "fecha": "2026-11-27", "pliego": "<este dictamen>", "rol_anterior": "PRIMARY"}]` |

**Tipo de constancia (decisión expresa).** La D5 de la OLA 12 usó `REFORMA_TACITA` para reformas expresas no integradas. Aquí se usa `ADICION` por dos razones: es lo que aprobó el CLO («reforma por adición») y es la letra del art. 83 («Reformar por adición»). La constancia conserva la forma de cuatro campos (`nota`, `tipo`, `texto`, `decretos`). Ningún código de recuperación decide por el `tipo`: el guardián CLO decide por `rol` (`ROL_DECLARADO_CONTEXT`).

## 3. Huellas

**Estado auditado** (producción, lectura del 2026-11-27, copia en `fila_prod_pre.json`):

| Huella | SHA-256 |
|---|---|
| `contenido` (= `hash_contenido` = `metadata.article_sha256`) | `321e9fe4b86adc6eb6fae55daac7d925b6f1aceb50aa0055bfffa1a6ec20e90b` |
| `metadata::text` antes | `c1cb8cdc5bf4630593a8ac953f96c8c2888fc0eb2ca3446548bd9a5fe9918c22` |
| `metadata::text` después (esperada; `jsonb::text` es canónico) | `d804aedc682f22134fc0dc391893572e917ffa43178a7d37f1c07f7c1841d534` |
| Resto de columnas (sin metadata, embedding ni fechas) | `01b860896efa720b2c8d76f2b9c76d7593cb40db0d4a65517e2040e7ffd71983` |
| `embedding::text` en producción (pgvector 0.8.0), informativa | `74ad790c00d6ac8cb79ddb4cd61d93fffc549450cd09f7a813e61a791c89e5ef` |

El embedding y las fechas se comparan **contra el respaldo dentro de la misma base**. Su texto depende de la versión de pgvector (staging tiene la 0.8.2) y de la zona horaria de la sesión.

**SQL**, generados por `scripts/olas/correccion-c2-lp-art28.ts` (no se editan a mano):

| Paso | Archivo | Destino | Bytes | SHA-256 |
|---|---|---|---:|---|
| 1 | `01_ensayo_staging.sql` | staging | 28,952 | `4656bd6a8a3a6fa8866021163df23f0177854a93cc3f55c0f69c74a77950cc0b` |
| 1 | `01_respaldo_prod.sql` | prod | 4,127 | `b56f83266364d29b3aec3a83f14f242180187fe6e1478e853ca561ee94d7587b` |
| 2 | `02_reclasificar_prod.sql` | prod | 4,341 | `5104337e1d120672722f3366b38b5c777aeee1bcd965ec66366c8afbb3f11d63` |
| 99 | `99_reversion_prod.sql` | prod (no lo corre el ejecutor) | 3,355 | `7a7c4b8f6996dbbfa1a45fec830a72bc8d3b15f14a37e3d19d96997fdbfbc981` |

## 4. Qué hace cada SQL

**01, respaldo protegido** (idempotente):
- Antes de hacer nada, comprueba que la fila es la auditada: una sola fila, lote `OLA12_LP_2007_01`, vigente y visible, con las huellas de contenido y del resto de columnas de §3.
- Crea `public.biblioteca_vectores_c2_lp_art28_backup` **solo** si la metadata actual es la auditada. Nunca respalda un estado ya corregido ni uno ajeno.
- Activa **RLS** y hace `REVOKE ALL` a PUBLIC, `anon` y `authenticated`. En Supabase toda tabla nueva de `public` nace con todos los privilegios para esos roles.
- Verifica tres cosas: que el respaldo tiene una sola fila con las huellas auditadas, que RLS está activo y que `anon` y `authenticated` no tienen ningún privilegio. Si alguna falla, aborta.

**02, reclasificación** (idempotente):
- Si la fila ya está corregida, no hace nada.
- Si la metadata es la auditada, escribe `respaldo || parche`, condicionado a la metadata leída (`FOR UPDATE`). Exige que se actualice exactamente 1 fila y que el lote conserve sus 142 filas con una CONTEXT más (pasa de 5 a 6).
- Si la metadata es cualquier otra cosa, **aborta sin tocar nada**.
- **Postcondición:** solo cambió `metadata`. Todas las demás columnas, incluidos el embedding y las fechas, son idénticas al respaldo, y la huella final es `d804aedc…`.

**99, reversión** (exige su propia firma; el ejecutor nunca corre el paso 99): devuelve la metadata del respaldo solo si la fila está exactamente en el estado corregido por C2, y comprueba que queda idéntica al respaldo.

**Ensayo en staging:** staging no tiene la OLA 12 LP. Dentro de una sola transacción, el ensayo hace esto:
1. siembra la fila exacta de producción a partir de `fila_prod_pre.json`;
2. corre 01, 02, 02 otra vez, 01 otra vez, 99 y 99 otra vez;
3. comprueba que la fila vuelve a la huella auditada;
4. termina en **ROLLBACK**, así que staging no conserva nada.

## 5. Verificación previa (sin tocar ninguna base del despacho)

`npx tsx scripts/olas/correccion-c2-lp-art28.ts --ensayar` corre todo en **PGlite en memoria**, con pgvector real (`vector(384)`), RLS y los privilegios por defecto de Supabase emulados:

- **Staging:** el ensayo termina y no deja rastro (las filas no cambian y el respaldo no queda creado).
- **Producción:**
  - 01 y 02 funcionan, y repetirlos no cambia nada.
  - 02 aborta ante una metadata ajena.
  - 99 devuelve la huella auditada, y repetirlo no cambia nada.
- **Control negativo:** sin el `REVOKE`, la verificación de 01 aborta, lo que demuestra que detecta privilegios residuales.
- **Guardián CLO** (`clasificarFragmentoClo`) con la metadata real: antes la fila da **PRIMARY**; después, **CONTEXT** con el bloqueo `ROL_DECLARADO_CONTEXT`.
- **Huella final:** `d804aedc…`, igual a la esperada.

Las lecturas de producción y staging usadas para este pliego fueron todas de solo lectura (`begin transaction read only`).

## 6. Decisión del CLO

| # | Decisión | Decisión del CLO |
|---|---|---|
| C2-a | Ensayar en staging `01_ensayo_staging.sql` (termina en ROLLBACK), con la huella de §3 | ☑ **Aprueba** |
| C2-b | Ejecutar en producción `01_respaldo_prod.sql` y `02_reclasificar_prod.sql`, exactamente con las huellas de §3: art. 28 de la Ley de Propiedad → CONTEXT vigente con la constancia del art. 83 del D.182-2009 | ☑ **Aprueba y autoriza**, incluida la transición de metadata `c1cb8cdc…` → `d804aedc…` y la constancia de tipo `ADICION` |
| C2-c | La reversión `99_reversion_prod.sql` queda preparada pero **no** autorizada: requerirá su propia firma si se necesita | ☑ **Conforme**: 99 no autorizada |

Firma: **aprobado** · Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex) · Fecha: 2026-11-27

*Registro de la firma.* El CLO comunicó en la sesión de trabajo del 2026-11-27 la aprobación expresa del tipo de constancia `ADICION`, de las decisiones C2-a, C2-b y C2-c y de las huellas SHA-256 de §3. Claude Code la registró aquí por orden expresa del CLO. Los SQL no se modificaron: la firma cubre exactamente las huellas citadas en §3.

## 7. Ejecución tras la firma (la hace el CLO; Claude Code nunca tiene la `DATABASE_URL`)

```powershell
Set-Location C:\Users\fredy\maya-lex-pinel-deploy
pwsh -File docs\corpus\fase2\2026-11-27-correccion-c2-lp-art28\ejecutar_staging.ps1   # ensayo; termina en ROLLBACK
pwsh -File docs\corpus\fase2\2026-11-27-correccion-c2-lp-art28\ejecutar_prod.ps1      # 01 respaldo + 02 reclasificación
```

Cada envoltorio pide el project ref, una frase de confirmación (`ENSAYAR C2 EN STAGING` o `RECLASIFICAR ART 28 LP EN PROD`) y la `DATABASE_URL` en entrada oculta, y la borra al terminar.

Antes de conectar, `scripts/olas/ejecutar-sql.ts` verifica:
- los bytes y la huella de cada SQL contra `manifiesto.json`;
- la línea Estado de este pliego (solo para los pasos que requieren firma);
- que el pliego cite cada huella;
- que la URL sea la del destino.

Ya conectado, comprueba que la base es la que corresponde: producción debe tener 360 filas V5 del 2026-11-21 y staging, 0.

**Comprobación posterior de solo lectura** (la corre Claude Code por el conector):

```sql
begin transaction read only;
select metadata->>'rol' rol, encode(sha256(convert_to(metadata::text,'UTF8')),'hex') sha_metadata,
       encode(sha256(convert_to(contenido,'UTF8')),'hex') sha_contenido, es_norma_vigente, revision_pendiente,
       (select count(*) from public.biblioteca_vectores where ingest_batch = 'OLA12_LP_2007_01') n_lote,
       (select count(*) from public.biblioteca_vectores where ingest_batch = 'OLA12_LP_2007_01' and metadata->>'rol' = 'CONTEXT') n_context,
       (select relrowsecurity from pg_class where oid = 'public.biblioteca_vectores_c2_lp_art28_backup'::regclass) rls_respaldo
from public.biblioteca_vectores where id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28';
-- Esperado: CONTEXT · d804aedc… · 321e9fe4… · true · false · 142 · 6 · true
```
