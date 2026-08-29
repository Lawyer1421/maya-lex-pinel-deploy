# GAP 4 — Auditoría de los 6 modos vs. D6(b)

## 1-2. Los 6 modos y si llaman a `buscarEnSupabase`

Verificado directamente en `app/api/chat/route.ts` (`MODOS_CON_ROUTER`) y
`lib/system-prompt.ts` (`CLAUDE_CONFIG` / `CLAUDE_CONFIG_PENAL`) — no de memoria:

| Modo | ¿Activa el router RAG (`buscarRAG` → `buscarEnSupabase`)? |
|---|---|
| `sala_ia` | **No** — va directo al LLM, `ruta` siempre `'D'` (sin RAG) |
| `analisis` | **Sí** |
| `documento` | **Sí** |
| `sala_penal` | **No** — mismo caso que `sala_ia` |
| `analisis_penal` | **Sí** |
| `escritos_penales` | **Sí** |

`MODOS_CON_ROUTER = ['analisis', 'analisis_penal', 'escritos_penales', 'documento']`
— exactamente 4 de los 6. `sala_ia`/`sala_penal` (los modos de audiencia en vivo,
<150 palabras) no pasan por el RAG en absoluto, así que D6(b) no les aplica ni
falta ni sobra.

## 3. ¿Alguno necesita datos no-vigentes (comparación histórica, análisis de reformas)?

Revisados los 4 system prompts de los modos con router (`MAYA_LEX_SYSTEM_PROMPT`,
`ANEXO_GENERACION_DOCUMENTOS`, `MAYA_PENAL_SYSTEM_PROMPT`, `MAYA_PENAL_MODULES`,
`ANEXO_ESCRITOS_PENALES`) — **ninguno de los cuatro define hoy una feature de
comparación histórica o análisis de reformas como objetivo del modo**. Los
cuatro existen para fundamentar sobre la **norma vigente actual**:

- `analisis` / `analisis_penal`: dictaminan sobre hechos concretos con norma vigente.
- `documento`: genera instrumentos que deben reflejar derecho vigente hoy.
- `escritos_penales`: redacta escritos formales para presentar ante un
  juzgado — citar una norma derogada como fundamento en un escrito real sería
  un error grave, no una feature deseable.

## 4-5. Conclusión

**Los 6 modos son "norma actual" → D6(b) está bien tal como está.** No hace
falta un canal aparte hoy.

Una precisión importante: el fallback de GAP 2 (`buscarArticuloExacto`
devolviendo un artículo confirmado derogado cuando el usuario pregunta por su
número exacto) **ya cubre, para los 4 modos con router, el único caso legítimo
de "necesito saber si esto está derogado"** — sin necesitar un canal de
retrieval separado, porque es un camino determinista (no semántico) y ya
etiquetado. Eso es distinto de "comparación histórica de reformas" como
feature de análisis (ej. "cómo ha cambiado este artículo en el tiempo") — esa
sí sería una feature nueva, no existe hoy, y si se construye en el futuro
debería tener su propio canal con su propia etiqueta explícita, tal como
propone el punto 5 de este GAP, para no reabrir el riesgo que D6(b) acaba de
cerrar.

---

*Sin cambios de código derivados de este GAP -- es una auditoría de estado,
no una acción.*
