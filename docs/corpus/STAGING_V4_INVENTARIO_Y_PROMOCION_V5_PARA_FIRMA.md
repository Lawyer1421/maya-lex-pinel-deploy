# Inventario de staging V4 y plan de promoción controlada a V5

**Estado:** BORRADOR PARA FIRMA · **Corte:** 2026-11-21  
**Staging autorizado:** `mayalexhn-staging` · project ref `aicakncgtuiiuomflkqj`  
**Producción objetivo:** project ref `thgrhueckkjdutjvcufp`  
**Ejecución en producción:** ninguna. Este documento no autoriza escrituras.

## 1. Alcance y calidad de la evidencia

Este inventario reúne los lotes normativos con constancia explícita de V4 en staging en los expedientes revisados y el resultado comunicado por el CLO para A03. **No certifica el inventario completo de `biblioteca_vectores`**: esta sesión no consultó la base de staging y el inventario maestro disponible tiene corte 2026-10-24, anterior a estos cierres. Antes de promover, se requiere una consulta integral, de solo lectura, contra el project ref de staging.

La promoción V4→V5 significa producción según [`estados.ts`](../../lib/ingesta-oficial/estados.ts). Las firmas D8 existentes para los lotes descritos autorizan V3→V4 en staging; **no equivalen a autorización V4→V5**.

## 2. Inventario consolidado de lotes V4

| Instrumento / lote | Filas | Estado reportado | Distribución de rol y vigencia | Integridad | Evidencia y límite |
|---|---:|---|---|---|---|
| Código de la Niñez, `HN:CODIGO_NINEZ` · `A03_CODIGO_NINEZ_01` | 302 | V4; 302 visibles | 136 PRIMARY elegibles; 141 CONTEXT vigentes; 24 CONTEXT derogados; 1 CONTEXT con vigencia NULL (art. 21, C07) | 302 embeddings; 302 hashes coincidentes | Resultado comunicado por el CLO el 2026-11-21 tras ejecutar `visibilidad_staging.sql`; no se consultó la base de forma independiente en esta sesión. El pliego D1–D8 y el código de ingesta están en el PR #166, aún abierto. |
| Decreto 35-2013 · `A04_D35_2013_01` | 19 | V4; 19 visibles | 8 principales elegibles; 11 CONTEXT (arts. 1–11) | 19 embeddings; hash verificado para las 19 filas tras v8 | Constancias de staging y actualización v8 en [`ADJUDICACION_CLO_D35_2013.md`](staging/2026-11-05-hn-001-a04-orientacion/ADJUDICACION_CLO_D35_2013.md). V4→V5 expresamente sin firmar. |
| Decreto 284-2013 · `PILOTO_D284_2013_01` | 39 | V4; 39 visibles | 35 elegibles; 4 CONTEXT (arts. 13, 14, 26 y 27) | 39 embeddings; 39 hashes coincidentes tras normalización LF | Aplicación y verificación documentadas en [`ADJUDICACION_CLO_D284_2013.md`](staging/2026-11-15-hn-d284-2013-piloto/ADJUDICACION_CLO_D284_2013.md). V4→V5 expresamente sin firmar. |
| **Subtotal de estos lotes** | **360** | **360 V4 reportadas** | **179 PRIMARY elegibles; 181 CONTEXT** | Ver detalle por lote | Subtotal del conjunto listado; no es un conteo exhaustivo de toda la base. |

Para A03, el pliego está en [`ADJUDICACION_CLO_CODIGO_NINEZ.md`](staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md); los verificadores de pre y post visibilidad son [`verificacion_staging.sql`](../../out/a03-codigo-ninez/verificacion_staging.sql) y [`verificacion_post_visibilidad.sql`](staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/verificacion_post_visibilidad.sql). El expediente de firma D1–D8 se incorporó al PR #166, que aún no está fusionado.

### Fuera del subtotal

- La recepción TSC `HN-001-A04` de 18 artículos tiene estado `CLO_PENDING` en su informe y **no** se cuenta como V4: [`BATCH_REPORT.md`](staging/2026-11-16-hn-001-a04-tsc/BATCH_REPORT.md).
- El informe del receptor Drive HN-001-A03 y el del piloto inicial HN-001-A02 reflejan estados de recepción previos, no reemplazan las constancias posteriores de los lotes canónicos V4.
- La auditoría maestra de 2026-10-24 registró cero V4 y no consultó staging; no debe usarse como corte actual: [`MAYALEX_CORPUS_MASTER_INVENTORY_HN.md`](MAYALEX_CORPUS_MASTER_INVENTORY_HN.md).

## 3. Decisiones y dependencias antes de producción

1. **Cerrar el expediente de código.** El PR #166 contiene la adjudicación D1–D8 y la herramienta de ingesta canónica de A03; el PR #167 contiene el retiro del bloqueo y pruebas. Ambos muestran checks CI exitosos, pero GitHub marca `REVIEW_REQUIRED` y `mergeStateStatus=BLOCKED`. Requieren la revisión exigida por el repositorio. Fusionar primero el expediente firmado (#166) y después el cambio de guard (#167); no eludir protección de rama.
2. **Congelar un snapshot de staging**, solo lectura, apuntando y verificando explícitamente `aicakncgtuiiuomflkqj`. Incluir todos los lotes V4, `ingest_batch`, `norm_id`, ids, versión/fuente canónica, vigencia, rol, embeddings, hashes y discrepancias. Conciliar diferencias con el inventario de la sección 2 y registrar fecha y responsable.
3. **Completar QA y firmar el alcance V5.** Revisar por instrumento procedencia, versión canónica, vigencia, derogaciones, excepciones CONTEXT, conflictos de ids y cambios posteriores. La firma de V3→V4 no basta. Mantener el art. 21 de A03 y las filas CONTEXT/derogadas en sus roles adjudicados.
4. **Preparar una migración de alcance cerrado**, sin copiar toda la base de staging. Para cada lote aprobado: inventariar previamente colisiones en producción; derivar el SQL determinista de la fuente/manifiesto firmados; limitar cada operación a los ids/lotes aprobados; comprobar precondiciones, duplicados, constraints, embeddings y hashes; documentar SHA-256 del SQL, plan de reversión y resultado de ensayo en un clon desechable.
5. **Revisión independiente y preflight de producción.** Revisión técnica de SQL, RLS/permisos, respaldo recuperable/PITR, ventana, monitorización, rollback ensayado y responsables. Verificar el project ref de destino `thgrhueckkjdutjvcufp` inmediatamente antes de ejecutar. Si cualquier condición difiere, abortar.
6. **Autorización específica antes de escribir.** Presentar al CLO el snapshot, diff exacto, lista de ids/lotes, SQL y su hash, checks, ventana y rollback. Obtener firma expresa V4→V5 para ese alcance y artefacto. La firma al pie de este documento aprueba únicamente el plan; no autoriza la migración.
7. **Aplicación y cierre tras autorización separada.** Ejecutar cada lote en transacción controlada; guardar auditoría; correr verificaciones post-escritura de conteos, hashes, embeddings, roles y V5; probar búsquedas/citas y confirmar que no se promovieron filas fuera de alcance. Publicar acta de resultados y actualizar inventario.

## 4. Condiciones de no-go

- Falta de snapshot exhaustivo de staging o discrepancia no resuelta con el inventario.
- Falta de firma V4→V5 por cada instrumento incluido o falta de revisión de la migración con hash fijado.
- Hash inválido, fila duplicada/conflictiva, embeddings ausentes o roles/vigencia distintos de lo adjudicado.
- Project ref distinto del destino autorizado, respaldo no restaurable o rollback no ensayado.
- Intento de tratar el subtotal de 360 filas como inventario completo o de promover conjuntamente filas no incluidas en el alcance firmado.

## 5. Firma del plan (sin autorización de ejecución)

Al firmar, se aprueba el flujo y los controles descritos; **no** se autoriza ninguna escritura en producción. La autorización V4→V5 se emitirá después sobre la migración concreta y su SHA-256.

**Decisión:** ☐ Aprobar el plan para preparar el preflight y la migración revisable · ☐ Rechazar · ☐ Requiere cambios

**Nombre y rol autorizado:** ______________________________________________  
**Firma:** ____________________________________  **Fecha:** ______________  
**Observaciones / alcance que debe excluirse:** ____________________________
