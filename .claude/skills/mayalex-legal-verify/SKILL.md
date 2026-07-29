---
name: mayalex-legal-verify
description: Verificación de integridad jurídica de una norma en staging — vigencia, reformas, derogaciones, concordancias y transición de estado editorial V2→V3. Prepara el paquete de revisión humana para V4.
---
# Verificación jurídica
1. Carga el source record y el JSONL estructurado de la norma.
2. Busca reformas/derogaciones en el propio registro de fuentes (decretos posteriores) y regístralas con fuente y fecha.
3. Genera informe de vigencia: artículos vigentes, reformados (con decreto reformador), derogados, dudosos.
4. `node scripts/harness/verify-corpus-provenance.mjs <norma>` — procedencia completa o bloquea.
5. `node scripts/harness/verify-citations.mjs <norma>` — toda cita recuperable apunta a un artículo existente del hash correcto.
6. Si todo pasa → estado V3 ("análisis técnico de vigencia"). Genera docs/corpus/<norma>-REVISION-V4.md con el paquete para el revisor humano (jamás autodeclarar V4/V5).
7. Ante fuente de autenticidad indeterminable → BLOCKED (detención obligatoria n.º 6).
