# STATUS — MayaLex Launch Acceleration

- **CURRENT MAIN SHA:** `7b492a1`
- **ACTIVE WORKSTREAMS:** cableado de Legal OS en modo sombra sobre la ruta actual; golden sets por materia (para el CLO); crawlers de fuentes oficiales públicas; source cards (UX); proveedor OpenAI de producción (requiere autorización de canary).
- **MERGED PRS:** #88 (G6, por Fredy); #89 (Fase 1 + núcleo Legal OS); #90 (skills, fábrica de corpus, bus de herramientas, evaluación, observabilidad, grafo). Lote 3 (recuperación, agentes, aprendizaje, entitlements, jurisprudencia) en PR abierto.
- **OPEN PRS:** ver abajo (actualizar tras cada hito).
- **CORPUS COVERAGE:** ver `CORPUS_GAP_MATRIX_HN.md` — 0 instrumentos `AVAILABLE`, 9 filas `PARTIAL`, 5 `MISSING`, 6 `PENDING_VERIFICATION`.
- **GOLDEN SET SCORE:** n/d — hay esquema, métricas y 8 casos semilla `PENDING_CLO_REVIEW`; ninguno `CLO_APPROVED`, así que la corrección jurídica no es calculable aún.
- **LATENCY / COST:** n/d en producción; simulación del shadow en `docs/governance/evidence/g6-cost-authorization.md`.
- **P0:** ver `LAUNCH_BLOCKERS.md` (5). **P1:** 5. **P2:** 3.
- **DECISIONES DE FREDY PENDIENTES:** 21 celdas de entitlements por plan sin definir (`null`); techos de coste por plan (propuestos); ID del modelo profundo (no verificado).
- **NEXT ACTIONS:** cablear Legal OS (router+trazas) en modo sombra sobre la ruta actual; golden sets por materia (casos redactados para revisión del CLO); crawlers de fuentes oficiales públicas.
