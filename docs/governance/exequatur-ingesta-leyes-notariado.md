# INGESTA_LEYES_NOTARIADO — Slice 1 (código primero)

**Rama:** `cursor/ingesta-leyes-notariado-d401`  
**Base:** `origin/main` @ merge PR #45 (`788ffa2`)  
**PR #44:** cerrado como obsoleto (prototipo 3B; formal = #45).

## Qué entra

Herramienta de dry-run para las dos leyes notariales cuyo router ya está en `main` (PR #23):

| Instrumento | Identidad |
|---|---|
| `CODIGO_NOTARIADO` | Decreto 353-2005 · `mayalex_normativos:codigo_notariado_2005` · materia `03_NOTARIAL` |
| `REGLAMENTO_NOTARIADO` | Resolución PCSJ-17-2012 · `mayalex_normativos:reglamento_notariado_2012` · materia `03_NOTARIAL` |

- `fuente` anclada a las cadenas que ya usa el adaptador / tests de colisión.
- `es_norma_vigente = false`, `verificado = false`, `vigencia_state = NO_VERIFICADO`.
- Duplicados idénticos se colapsan. Cuerpos distintos bajo el mismo número → fail-hard (sin adjudicación editorial).
- Código: el lote debe cubrir arts. 2, 3, 7, 8 del currículo Slice 2.
- Fixtures sintéticas (no citan el texto legal oficial).

## Qué no entra

| Frente | Estado |
|---|---|
| `--execute` / embeddings / `.sql` local | slice posterior |
| `SQL_APPLY` a staging/prod | P3 fundador |
| `FLAG_ACTIVATION` | P3 fundador |
| Declarar VIGENTE o VERIFICADO | prohibido |
| Write a `biblioteca_vectores` | prohibido |
| Adjudicar duplicados reales de imprenta | requiere fuente oficial + decisión editorial |

## Uso

```
npx tsx scripts/ingesta-notariado.ts --instrumento codigo --input <pdf|txt>
npx tsx scripts/ingesta-notariado.ts --instrumento reglamento --input <pdf|txt>
```

Siempre dry-run. `--execute` falla cerrado.

## Invariantes

```
INGESTED != VERIFIED != VIGENTE
CODIGO_NOTARIADO ≠ REGLAMENTO_NOTARIADO  (identidad por fuente, no por materia)
0 / >1 evidencia conflictiva → no se elige
```
