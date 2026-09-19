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

## Dry-run de fuente real (autorizado, local, read-only)

`scripts/dry-run-notariado-fuente-real.ts` analiza los PDF oficiales en
`/tmp/notarial-sources/` (no versionados) y escribe solo SHA-256, conteos y
huecos de parseo:

```
npx tsx scripts/dry-run-notariado-fuente-real.ts
```

Informe: `docs/governance/exequatur-ingesta-notariado-dry-run-fuente-real.{json,md}`.

El analizador (`analizarFuenteNotariado`) es tolerante a huecos: reporta
currículo faltante y duplicados divergentes sin abortar. El camino de ingesta
(`prepararLoteNotariado`) sigue fail-hard. Cero `SQL_APPLY`, cero write a
corpus, cero declaración de VIGENTE.

Hallazgos del dry-run contra las fuentes primarias (CEDIJ / Drive):

| Fuente | SHA-256 | Parseo |
|---|---|---|
| Código Decreto 353-2005 | `efe971f8…dd2513c8` | 85 únicos; currículo 2/3 bloqueados por divergente; OCR `2O/3O/5O/6O/9O`; 21/52 rechazados por ` -`; 17 sin candidato (`17.Los`) |
| Reglamento PCSJ-17-2012 | `4d00378b…eaf2750` | 111 únicos, 1–111 sin huecos |
| AMHON / PJ (descartadas) | hash only | escaneos sin texto extraíble |

Slice editorial (post PR #47): ver
`docs/governance/exequatur-ingesta-notariado-editorial-77-2006.md`.
77-2006 prevalece en 2/3/11/27; OCR de número `O`→`0`. Arts. 1 y 4 siguen
sin adjudicación. `NETWORK_WRITES = 0`.

## Invariantes

```
INGESTED != VERIFIED != VIGENTE
CODIGO_NOTARIADO ≠ REGLAMENTO_NOTARIADO  (identidad por fuente, no por materia)
0 / >1 evidencia conflictiva → no se elige
```
