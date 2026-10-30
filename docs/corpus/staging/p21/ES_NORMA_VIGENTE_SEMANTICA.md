# es_norma_vigente en el corpus P21 — significado del CLO frente al registro canónico de `main`

**Significado del CLO (28-oct-2026), el que usa P21 y las salvaguardas de recuperación (#106): TRUE elegible · FALSE excluido · NULL solo CONTEXT.**

| Valor | Significa | Efecto en la recuperación |
| --- | --- | --- |
| `TRUE` | Elegible: el CLO acreditó la vigencia | Puede ser PRIMARY (si cumple las demás reglas) |
| `FALSE` | Excluido: no se usa como fundamento | Nunca PRIMARY; no produce `EXACT_SUCCESS` |
| `NULL` | Vigencia sin acreditar | Solo CONTEXT; nunca basta como evidencia |

Ninguna fila P21 tiene vigencia acreditada, así que todas van con `NULL`, salvo Comercio arts. 380–383, que van con `FALSE` (derogados por el D.284-2013 art. 37, Gaceta 33,445, verificado).

## Dónde chocaba con el uso «marca operativa» en `main`

1. **`docs/corpus/MAYALEX_CANONICAL_ADJUDICATION_REGISTER_V1.json` (decisión E3) y su `.md`:** «es_norma_vigente=false — Marca operativa; INGESTED≠VERIFIED≠VIGENTE» (CLOSED). Ahí `false` es «ingerido, aún no verificado», **no** «excluido». Con el significado del CLO, `false` pasa a ser una exclusión; lo que antes se expresaba con `false` ahora se expresa con `NULL`.
2. **`scripts/ingestar-ley.ts` (`construirRegistro`) y `scripts/ingesta-*.ts`:** fijan `es_norma_vigente: false` «fail-closed (ADR-001)»: nunca asumen vigente. Con el significado del CLO esas filas quedarían **excluidas** en vez de «solo contexto». El SQL de P21 ya no hereda ese valor: usa `NULL` (o `FALSE` solo por decisión expresa).
3. **`docs/corpus/MAYALEX_CANONICAL_ADJUDICATION_REGISTER_V1.json` (decisión E4):** «NULL 8366 — EXCLUIDA de la recuperación profesional; fail-closed». Es compatible con el CLO (NULL no es PRIMARY), pero lo llama «excluida»: en el significado del CLO la exclusión es `FALSE` y `NULL` es «solo CONTEXT».
4. **`lib/legal-retrieval/semantic-retriever.ts` (`esRegistroNoVigenteExcluido`)** trata `FALSE` + `codigo` + `HN` como excluida, lo cual coincide con el CLO; el clasificador de #106 (`clo-guards.ts`) lo generaliza: `FALSE` y `NULL` nunca son PRIMARY.
5. **Fila de prod ya cargadas con `false` por la regla ADR-001** (p. ej. los «7 es_norma_vigente=false» del Código del Notariado): bajo el significado del CLO quedan **excluidas**, no «pendientes». Reinterpretarlas es una decisión del CLO, no de este PR.

Este documento no cambia ninguna fila ni ningún registro: solo deja constancia para que el CLO decida si actualiza E3/E4 del registro canónico.
