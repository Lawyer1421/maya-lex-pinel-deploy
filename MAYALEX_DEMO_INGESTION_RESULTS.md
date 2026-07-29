# MAYALEX — Resultados de la demo con norma ficticia (Paquete E)

Norma usada: **`HN-DEMO-NORMA-FICTICIA-001`** — "LEY DEMOSTRATIVA FICTICIA DEL PIPELINE MAYA LEX", texto 100% inventado para esta prueba, sin relación alguna con legislación real hondureña. Script: `scripts/demo-ingesta-oficial.ts` (ejecutado con `npx tsx scripts/demo-ingesta-oficial.ts`).

## 1. Ingestión y segmentación (VERIFICADO MEDIANTE PRUEBA)

Texto de 3 artículos ficticios segmentado correctamente en 3 registros independientes (`1`, `2`, `3`), sin mezclar contenido entre artículos.

## 2. Rechazo de errores (VERIFICADO MEDIANTE PRUEBA — 2 escenarios)

- Manifest con `autoridad` vacía → rechazado en el paso 3 ("manifest incompleto: faltan los campos [autoridad]").
- Texto con artefacto de anonimización inyectado (`[Cliente_Anonimo]`) → rechazado en el paso 10 ("archivo con posibles datos privados").

## 3. Aceptación completa (VERIFICADO MEDIANTE PRUEBA)

Con manifest válido y `aprobadoPor` provisto, el pipeline completó los 16 pasos, generó JSONL válido (3 líneas, una por artículo) y quedó `aceptado: true`.

## 4. Estados y auditoría (VERIFICADO MEDIANTE PRUEBA + VERIFICADO EN DESPLIEGUE de staging)

5 intentos de promoción ejecutados con `MaquinaEstadosCorpus`:

| Transición | Actor | Rol | Resultado |
|---|---|---|---|
| V0→V1 | pipeline | pipeline_automatico | aprobado |
| V1→V2 | pipeline | pipeline_automatico | aprobado |
| V2→V3 | pipeline | pipeline_automatico | aprobado |
| V3→V4 | bot-no-autorizado | pipeline_automatico | **rechazado** (rol no autorizado) |
| V3→V4 | demo-abogado-revisor | abogado_revisor_senior | aprobado |

Los 5 registros se persistieron en `public.ingestion_audit_log` en el proyecto de staging real (`mayalexhn-staging`), confirmados con `select count(*)` = 5.

## 5. JSONL (VERIFICADO MEDIANTE PRUEBA)

3 líneas generadas, cada una con `norm_id`, `num_articulo`, `contenido`, `decreto`, `materia`, `autoridad`, `estado`, `hash` — formato listo para la etapa de staging.

## 6. Candidate (VERIFICADO EN DESPLIEGUE de staging)

Los 3 artículos se insertaron como filas candidatas en `hn_normas_verificadas_staging` (proyecto de staging real), con `norm_id` prefijado `HN-DEMO-NORMA-FICTICIA-001-ART-{1,2,3}`, `estado_v='V0'`, `coleccion_legacy_origen='demo_ficticio_no_legacy'` (para que quede inequívocamente marcado como no proveniente del corpus legacy real).

## 7. Benchmark básico (VERIFICADO MEDIANTE PRUEBA)

El paso 14 del pipeline verificó recuperación exacta del artículo 1 por su número — aprobado.

## 8. Rollback (VERIFICADO EN DESPLIEGUE de staging)

Tras confirmar los 3 registros de norma + 5 de auditoría en staging, se ejecutó:

```sql
delete from hn_normas_verificadas_staging where norm_id like 'HN-DEMO-NORMA-FICTICIA-001%';
delete from ingestion_audit_log where norm_id='HN-DEMO-NORMA-FICTICIA-001';
```

Resultado confirmado: 0 filas restantes de la demo en ambas tablas; `hn_normas_verificadas_staging` volvió a su conteo previo (24 filas — los 4 shells de norma + 20 artículos piloto de la fase anterior). Staging quedó exactamente como estaba antes de esta demo.

## 9. Conclusión

El pipeline completo (ingesta → validación → segmentación → staging → estados → auditoría → rollback) funciona extremo a extremo con datos 100% ficticios, sin tocar producción, sin usar legislación real, y sin dejar rastro permanente en staging tras el rollback.
