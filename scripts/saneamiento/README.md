# Saneamiento del corpus · Fase 1 (producción)

Orden: 01 (validación, solo SELECT) → revisión del Titular → 02 (aplicar, con guardia) → 03 (control).

- **No ejecutar 02 en producción sin autorización expresa.** El Titular exigió staging primero para cambios de datos y esquema.
- 02 pone `revision_pendiente = true` en las cuarentenas: es el único mecanismo que las saca de la búsqueda de Luna (`buscar_biblioteca_v2` no filtra `fuente_tipo`).
- Efecto en Luna: las cuarentenas dejan de aparecer en búsqueda (≈ 70,752 + 14 + 2 filas). Doctrina y guía siguen visibles como contexto.
- El «instrumento» del CPC base se guarda en `metadata.instrumento` (la tabla de producción no tiene columna `instrumento_id`).
- Las filas sin clasificar que queden en `jurisdiccion` nula (cuarentenas) siguen contando como «sin clasificar» en el control: es intencional.
