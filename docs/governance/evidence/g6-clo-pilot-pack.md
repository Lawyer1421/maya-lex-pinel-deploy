# Paquete del piloto de procedencia para el CLO — G6-B

> Generado por `npx tsx scripts/g6-clo-pilot-pack.ts`. No aprueba nada: cada decisión es del CLO.
> Estados: `SOURCED_FROM_REPO` = respaldado por evidencia del repositorio (con su procedencia); `PENDING_VERIFICATION` = falta evidencia;
> `PENDING_CLO_APPROVAL` = falta la aprobación humana. Lo que falta aparece como `—`: no se inventa.

**Candidatos:** 2 · **PENDING_VERIFICATION:** 2 · **PENDING_CLO_APPROVAL:** 2 · **Aprobados:** 0
**Manifiesto efectivo (entradas aprobadas): 0**

Flujo: `candidate → verification → CLO review → approval → effective manifest`. El último paso no se ejecuta sin autorización expresa.

## PILOTO-CP-D130-2017-ART-634 — Código Penal (D.130-2017), art. 634: abrogación del D.144-83 y sus reformas

- **Paso del flujo:** VERIFICATION_PENDING
- **Etapa de aprobación:** PENDING_CLO_APPROVAL (sin revisión formal del CLO)

| Dato | Valor | Estado | Procedencia |
|---|---|---|---|
| 1. Norma | Código Penal de Honduras | SOURCED_FROM_REPO | docs/governance/DECISION_LOG.md §2 «Art. 1 y Art. 634, Código Penal (Decreto 130-2017) — extracto para expediente» |
| 2. Decreto | Decreto 130-2017 | SOURCED_FROM_REPO | docs/governance/DECISION_LOG.md §2 «Art. 1 y Art. 634, Código Penal (Decreto 130-2017) — extracto para expediente»; lib/normas-cpp.ts («CÓDIGO PENAL HONDURAS (D.130-2017)») |
| 3. Artículo | 634 — ABROGACIÓN | SOURCED_FROM_REPO | docs/governance/DECISION_LOG.md §2 «Art. 1 y Art. 634, Código Penal (Decreto 130-2017) — extracto para expediente» |
| 4. Texto exacto | Derogar el Decreto No 144-83, de fecha 23 de Agosto de 1983, contentivo del Código Penal y todas sus reformas. | PENDING_VERIFICATION | docs/governance/DECISION_LOG.md §2 «Art. 1 y Art. 634, Código Penal (Decreto 130-2017) — extracto para expediente» |
| 5. Canonical fragment ID | — | PENDING_VERIFICATION | — |
| 6. SHA-256 del texto exacto | — | PENDING_VERIFICATION | — |
| 7. Número de La Gaceta | La Gaceta 34,940 | SOURCED_FROM_REPO | tests/golden/gateway-g1-casos.ts → PROCEDENCIA_G1 y verificacionFechaPagina (G1-VIG-CODIGO-PENAL-130-2017; dictamen CLO 22-oct-2026, issue #78) |
| 8. Fecha | 10-may-2019 (pág. 140-A; página 156 del PDF) | SOURCED_FROM_REPO | tests/golden/gateway-g1-casos.ts → PROCEDENCIA_G1 y verificacionFechaPagina (G1-VIG-CODIGO-PENAL-130-2017; dictamen CLO 22-oct-2026, issue #78) |
| 9. URL oficial | — | PENDING_VERIFICATION | — |
| 10. SHA-256 del PDF oficial | 54f6a4122f8b96a60631deb8c486284ff0744c0d09ea0ed332d8d5d1960ba132 | SOURCED_FROM_REPO | tests/golden/gateway-g1-casos.ts → PROCEDENCIA_G1 y verificacionFechaPagina (G1-VIG-CODIGO-PENAL-130-2017; dictamen CLO 22-oct-2026, issue #78) |
| 11. Estado V4/V5 | — | PENDING_VERIFICATION | — |
| 12. Evidencia de vigencia | Vigencia desde el 25-jun-2020 por el art. 1 del D.46-2020 (La Gaceta 35,247, 9-may-2020, pág. 2-A), que reforma el art. 635. | SOURCED_FROM_REPO | tests/golden/gateway-g1-casos.ts → PROCEDENCIA_G1 y verificacionFechaPagina (G1-VIG-CODIGO-PENAL-130-2017; dictamen CLO 22-oct-2026, issue #78) |
| 13. Reforma / derogación | Deroga el Decreto 144-83 (Código Penal de 1983) y todas sus reformas. | PENDING_VERIFICATION | tests/golden/gateway-g1-casos.ts → PROCEDENCIA_G1 y verificacionFechaPagina (G1-VIG-CODIGO-PENAL-130-2017; dictamen CLO 22-oct-2026, issue #78) |
| 14. Golden Set relacionado | G1-VIG-CODIGO-PENAL-130-2017 | SOURCED_FROM_REPO | tests/golden/gateway-g1-casos.ts → PROCEDENCIA_G1 y verificacionFechaPagina (G1-VIG-CODIGO-PENAL-130-2017; dictamen CLO 22-oct-2026, issue #78) |

**Notas por dato:**
- 4. Texto exacto: Transcripción del expediente interno; debe cotejarse byte a byte con el texto almacenado y con el PDF oficial antes de calcular el hash.
- 5. Canonical fragment ID: El repositorio no contiene el id canónico del fragmento almacenado (los fixtures usan ids sintéticos). Debe leerse de la fila real del corpus; este PR no consulta la base.
- 6. SHA-256 del texto exacto: Requiere el texto EXACTO almacenado (fragmento.contenido) para calcular el SHA-256; no se calcula sobre una transcripción.
- 8. Fecha: Fecha y página verificadas por el CLO contra el PDF oficial (VERIFICADO_CLO_PDF_OFICIAL).
- 9. URL oficial: No hay URL oficial del PDF en el repositorio (el registro CEDIJ describe un patrón, no la URL de este documento). No se infiere.
- 10. SHA-256 del PDF oficial: SHA-256 del PDF oficial de La Gaceta 34,940 aportado por el Investigador de Fuentes Oficiales HN y cotejado por el CLO.
- 11. Estado V4/V5: El estado V4/V5 de la fila del corpus no consta en el repositorio; lo fija el pipeline de ingesta oficial, no este paquete.
- 13. Reforma / derogación: El art. 634 deroga el D.144-83. Falta confirmar que el art. 634 no haya sido reformado después: el registro CEDIJ lista un texto consolidado «actualizado a julio 2026» (docs/retrieval/OFFICIAL_HONDURAS_SOURCE_REGISTRY.md).

**15. Procedencia de cada dato:** ver la columna «Procedencia».
**16. Decisión solicitada al CLO:** Confirmar que el texto almacenado del art. 634 coincide con La Gaceta 34,940, aportar el id canónico del fragmento, la URL oficial y el estado V4/V5 y, solo entonces, aprobar o rechazar la entrada con nombre, fecha y enlace al dictamen.

## PILOTO-D46-2020-ART-1 — Decreto 46-2020, art. 1: fija la vigencia del Código Penal desde el 25-jun-2020

- **Paso del flujo:** VERIFICATION_PENDING
- **Etapa de aprobación:** PENDING_CLO_APPROVAL (sin revisión formal del CLO)

| Dato | Valor | Estado | Procedencia |
|---|---|---|---|
| 1. Norma | Decreto 46-2020 (reforma del Código Penal, D.130-2017) | SOURCED_FROM_REPO | tests/golden/gateway-g1-casos.ts → PROCEDENCIA_G1 y verificacionFechaPagina (G1-VIG-CODIGO-PENAL-130-2017; dictamen CLO 22-oct-2026, issue #78) |
| 2. Decreto | Decreto 46-2020 | SOURCED_FROM_REPO | tests/golden/gateway-g1-casos.ts → PROCEDENCIA_G1 y verificacionFechaPagina (G1-VIG-CODIGO-PENAL-130-2017; dictamen CLO 22-oct-2026, issue #78) |
| 3. Artículo | 1 | SOURCED_FROM_REPO | tests/golden/gateway-g1-casos.ts → PROCEDENCIA_G1 y verificacionFechaPagina (G1-VIG-CODIGO-PENAL-130-2017; dictamen CLO 22-oct-2026, issue #78) |
| 4. Texto exacto | — | PENDING_VERIFICATION | — |
| 5. Canonical fragment ID | — | PENDING_VERIFICATION | — |
| 6. SHA-256 del texto exacto | — | PENDING_VERIFICATION | — |
| 7. Número de La Gaceta | La Gaceta 35,247 | SOURCED_FROM_REPO | tests/golden/gateway-g1-casos.ts → PROCEDENCIA_G1 y verificacionFechaPagina (G1-VIG-CODIGO-PENAL-130-2017; dictamen CLO 22-oct-2026, issue #78) |
| 8. Fecha | 9-may-2020 (pág. 2-A; página 2 del PDF) | SOURCED_FROM_REPO | tests/golden/gateway-g1-casos.ts → PROCEDENCIA_G1 y verificacionFechaPagina (G1-VIG-CODIGO-PENAL-130-2017; dictamen CLO 22-oct-2026, issue #78) |
| 9. URL oficial | — | PENDING_VERIFICATION | — |
| 10. SHA-256 del PDF oficial | 60b5b7865bdb0b868131005429017632fb168e286a1a9dfa5482378e8f58bbdb | SOURCED_FROM_REPO | tests/golden/gateway-g1-casos.ts → PROCEDENCIA_G1 y verificacionFechaPagina (G1-VIG-CODIGO-PENAL-130-2017; dictamen CLO 22-oct-2026, issue #78) |
| 11. Estado V4/V5 | — | PENDING_VERIFICATION | — |
| 12. Evidencia de vigencia | Fija el 25-jun-2020 como inicio de vigencia del D.130-2017 (La Gaceta 35,247, 9-may-2020, pág. 2-A). | SOURCED_FROM_REPO | tests/golden/gateway-g1-casos.ts → PROCEDENCIA_G1 y verificacionFechaPagina (G1-VIG-CODIGO-PENAL-130-2017; dictamen CLO 22-oct-2026, issue #78) |
| 13. Reforma / derogación | Reforma el art. 635 del D.130-2017. | SOURCED_FROM_REPO | tests/golden/gateway-g1-casos.ts → PROCEDENCIA_G1 y verificacionFechaPagina (G1-VIG-CODIGO-PENAL-130-2017; dictamen CLO 22-oct-2026, issue #78) |
| 14. Golden Set relacionado | G1-VIG-CODIGO-PENAL-130-2017 | SOURCED_FROM_REPO | tests/golden/gateway-g1-casos.ts → PROCEDENCIA_G1 y verificacionFechaPagina (G1-VIG-CODIGO-PENAL-130-2017; dictamen CLO 22-oct-2026, issue #78) |

**Notas por dato:**
- 4. Texto exacto: El repositorio no contiene el texto del art. 1 del D.46-2020; solo lo describe (reforma el art. 635 del D.130-2017 y fija la vigencia del 25-jun-2020).
- 5. Canonical fragment ID: El repositorio no contiene el id canónico del fragmento almacenado (los fixtures usan ids sintéticos). Debe leerse de la fila real del corpus; este PR no consulta la base.
- 6. SHA-256 del texto exacto: Requiere el texto EXACTO almacenado (fragmento.contenido) para calcular el SHA-256; no se calcula sobre una transcripción.
- 8. Fecha: Fecha y página verificadas por el CLO contra el PDF oficial (VERIFICADO_CLO_PDF_OFICIAL).
- 9. URL oficial: No hay URL oficial del PDF en el repositorio (el registro CEDIJ describe un patrón, no la URL de este documento). No se infiere.
- 10. SHA-256 del PDF oficial: SHA-256 del PDF oficial de La Gaceta 35,247 aportado por el Investigador de Fuentes Oficiales HN y cotejado por el CLO.
- 11. Estado V4/V5: El estado V4/V5 de la fila del corpus no consta en el repositorio; lo fija el pipeline de ingesta oficial, no este paquete.
- 13. Reforma / derogación: Falta confirmar si el propio D.46-2020 fue reformado o derogado posteriormente.

**15. Procedencia de cada dato:** ver la columna «Procedencia».
**16. Decisión solicitada al CLO:** Aportar el texto exacto del art. 1 y confirmar que coincide con La Gaceta 35,247; aportar el id canónico, la URL oficial y el estado V4/V5 y, solo entonces, aprobar o rechazar la entrada con nombre, fecha y enlace al dictamen.
