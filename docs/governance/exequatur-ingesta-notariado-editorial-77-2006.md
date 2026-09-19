# INGESTA_LEYES_NOTARIADO — Slice editorial (77-2006 + OCR)

**Rama:** `cursor/ingesta-notariado-editorial-77-2006-d401`  
**Base:** `origin/main` @ merge PR #47 (`a47d044`)  
**Fail-closed:** `NETWORK_WRITES = 0` · `SQL_APPLY = NO` · `CORPUS_WRITE = NO` · `--execute` fail-hard

## Resolución Control Plane

| Artículo | Política |
|---|---|
| 2, 3, 11, 27 | Prevalece la **última** ocurrencia (anexo `DECRETO No. 77-2006`) sobre el texto 2005 |
| 1, 4 | **Primera** ocurrencia (Código 353-2005). El anexo 77-2006 es trámite, no Código |
| `2O` `3O` `5O` `6O` `9O` | Número OCR → `20` `30` `50` `60` `90`. El cuerpo no se reescribe |

No se usa `--stop-at-text "DECRETO No. 77-2006"` (PR #41): truncar el anexo
eliminaría las reformas que el Control Plane mandó conservar.

Adjudicar 77-2006 **no** declara `es_norma_vigente`.  
`INGESTED ≠ VERIFIED ≠ VIGENTE`.

## Qué entra

- `normalizarNumeroArticuloOcr` / `aplicarPoliticaEditorialNotariado`
- Allowlist `ARTICULOS_REFORMA_77_2006`
- Informe de dry-run: `adjudicadosReforma77`, `ocrNormalizados`
- Fixtures sintéticas (no citan el texto legal oficial)

## Qué no entra

| Frente | Estado |
|---|---|
| `--execute` / embeddings / `.sql` | slice posterior |
| `SQL_APPLY` / write a `biblioteca_vectores` | P3 fundador |
| Red (Supabase, fetch de fuentes) | `NETWORK_WRITES = 0` |
| Encabezados 17 / 21 / 52 | `GAPS_DOCUMENTALES_PENDIENTES_DE_FE_DE_ERRATAS_O_COPIA_GACETA` (no bloquean lote) |

## Uso

```
npx tsx scripts/ingesta-notariado.ts --instrumento codigo --input <pdf|txt>
npx tsx scripts/dry-run-notariado-fuente-real.ts
```

Siempre dry-run. `--execute` falla cerrado.

## Verificación local (read-only, no versiona texto)

Contra los PDF de `/tmp/notarial-sources/` (mismos SHA-256 del PR #47):

| Instrumento | Finales | 77-2006 | OCR | Divergentes restantes | Currículo |
|---|---:|---|---|---|---|
| Código | 91 | 2, 3, 11, 27 | 20, 30, 50, 60, 90 | (ninguno) | cubierto |
| Reglamento | 111 | — | — | — | n/a |

Resolución formal: `docs/governance/exequatur-adjudicacion-editorial-notariado-2026.md`.
Huecos 17/21/52 = gaps documentales; no bloquean `prepararLoteNotariado`.
