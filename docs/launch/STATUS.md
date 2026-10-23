# STATUS — MayaLex Launch Acceleration

- **CURRENT MAIN SHA:** `88b12cd`
- **ACTIVE WORKSTREAMS:** cableado de Legal OS en modo sombra sobre la ruta actual; golden sets por materia (para el CLO); crawlers de fuentes oficiales públicas; source cards (UX); proveedor OpenAI de producción (requiere autorización de canary).
- **MERGED PRS:** #88 (G6, por Fredy); #89–#93 (Fase 1, núcleo Legal OS, skills, fábrica de corpus, bus, evaluación, observabilidad, grafo, recuperación, agentes, aprendizaje, entitlements, jurisprudencia, descubrimiento A/B, tarjetas de fuentes con bandera OFF, golden sets).
- **OPEN PRS:** ver abajo (actualizar tras cada hito).
- **CORPUS COVERAGE:** ver `CORPUS_GAP_MATRIX_HN.md` — 0 instrumentos `AVAILABLE`, 9 filas `PARTIAL`, 5 `MISSING`, 6 `PENDING_VERIFICATION`.
- **GOLDEN SET SCORE:** n/d (`NOT_SCORABLE` en las 15 materias) — 150 plantillas (94 abstenciones fijadas por diseño, 56 pendientes de CLO), ver `GOLDEN_SETS_STATUS.md`; hay esquema, métricas y 8 casos semilla `PENDING_CLO_REVIEW`; ninguno `CLO_APPROVED`, así que la corrección jurídica no es calculable aún.
- **LATENCY / COST:** n/d en producción; simulación del shadow en `docs/governance/evidence/g6-cost-authorization.md`.
- **BLOQUEO DE ENTORNO:** el entorno de ejecución no alcanza ningún host `.gob.hn` oficial (proxy 403 / ENOTFOUND). Descubrimiento A/B (`docs/launch/discovery/`) solo produjo candidatos `UNVERIFIED` sin URL ni hash. Fredy debe permitir `legislacion.poderjudicial.gob.hn`, `www.tsc.gob.hn` y el host oficial de La Gaceta en la red del entorno, o descargar los PDF a mano.
- **P0:** ver `LAUNCH_BLOCKERS.md` (5). **P1:** 5. **P2:** 3.
- **DECISIONES DE FREDY PENDIENTES:** 21 celdas de entitlements por plan sin definir (`null`); techos de coste por plan (propuestos); ID del modelo profundo (no verificado).
- **UX:** tarjetas de fuentes listas tras la bandera `NEXT_PUBLIC_MAYALEX_SOURCE_CARDS` (OFF por defecto; activarla es decisión de Fredy: variable de Vercel). Ver `UX_SOURCE_CARDS_WIRING.md`.
- **PIPELINE (esqueleto andante, `lib/legal-os/pipeline`):** compuertas → recuperación → enrutador → modelo/exacto → validación de citas → traza, con dependencias inyectadas y NO conectado a producción. Línea base: 94/94 casos de abstención de diseño se abstienen aun con un recuperador adversarial que siempre devuelve evidencia (abstentionAccuracy 1.0, n=94). No es una medida de corrección jurídica.
- **NEXT ACTIONS:** cablear Legal OS (router+trazas) en modo sombra sobre la ruta actual; golden sets por materia (casos redactados para revisión del CLO); crawlers de fuentes oficiales públicas.
