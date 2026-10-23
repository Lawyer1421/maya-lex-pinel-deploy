# STATUS — MayaLex Launch Acceleration

- **CURRENT MAIN SHA:** `8dc9c0f`
- **ACTIVE WORKSTREAMS:** PR-D recuperación híbrida + fallback oficial; PR-I proveedor OpenAI de producción (requiere autorización de canary); UX de fuentes; fábrica de jurisprudencia y crawlers oficiales.
- **MERGED PRS:** #88 (G6, por Fredy); #89 (Fase 1 + PR-A); lote P2 (PR-B skills, PR-C fábrica de corpus, PR-E bus de herramientas, PR-F evaluación, PR-G observabilidad, PR-H grafo) — ver PR abierto abajo.
- **OPEN PRS:** ver abajo (actualizar tras cada hito).
- **CORPUS COVERAGE:** ver `CORPUS_GAP_MATRIX_HN.md` — 0 instrumentos `AVAILABLE`, 9 filas `PARTIAL`, 5 `MISSING`, 6 `PENDING_VERIFICATION`.
- **GOLDEN SET SCORE:** n/d — hay esquema, métricas y 8 casos semilla `PENDING_CLO_REVIEW`; ninguno `CLO_APPROVED`, así que la corrección jurídica no es calculable aún.
- **LATENCY / COST:** n/d en producción; simulación del shadow en `docs/governance/evidence/g6-cost-authorization.md`.
- **P0:** ver `LAUNCH_BLOCKERS.md` (5). **P1:** 5. **P2:** 3.
- **NEXT ACTIONS:** PR-D; cablear Legal OS (router+trazas) en modo sombra sobre la ruta actual; golden sets por materia (casos redactados para revisión del CLO); crawlers de fuentes oficiales públicas.
