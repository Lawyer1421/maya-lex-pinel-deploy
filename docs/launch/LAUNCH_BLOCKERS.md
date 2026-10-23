# LAUNCH_BLOCKERS

## P0 (bloquean el lanzamiento)
1. **Corpus launch-core sin verificar:** `es_norma_vigente` NULL en ~80 % de filas; ningún instrumento pasó V4→V5 con verificación humana. Requiere CLO (humano).
2. **Código de Comercio y Ley de Organización de Tribunales ausentes** (ausencia verificada).
3. **Sin evaluación jurídica por materia:** no hay golden sets de calidad (corrección, citas, versión) por materia; sin ellos no se puede medir el lanzamiento.
4. **Proveedor de producción no es OpenAI** y el shadow está apagado: la integración OpenAI necesita canary con autorización expresa de Fredy.
5. **Piloto de procedencia sin aprobación del CLO** (manifiesto efectivo = 0).

## P1
6. Riesgo residual del gate de privacidad (15.4 % en holdout) para uso general.
7. `maxDuration`/Fluid Compute sin confirmar en Vercel.
8. Sin trazabilidad por consulta ni bucle de aprendizaje controlado.
9. Sin pipeline de jurisprudencia ni grafo de relaciones.
10. Fallback web (Tavily) no restringido a fuentes oficiales.

## P2
11. Source cards/UX de «por qué respondió».
12. Entitlements por plan (Explorar/Académico/Premium) no ligados a capacidades de Legal OS.
13. Kill switch como constante de código (no interruptor en caliente).

## Decisiones que son de Fredy (no se automatizan)
Aprobación legal (CLO); privacidad de documentos de clientes; cualquier cambio de pagos; cambios destructivos de producción; activación de canary/producción.
