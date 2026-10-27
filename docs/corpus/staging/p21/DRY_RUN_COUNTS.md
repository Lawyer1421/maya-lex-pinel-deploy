# P21 — DRY_RUN_COUNTS (staging `aicakncgtuiiuomflkqj`; NO APLICADO)

Generado por `npx tsx tools/corpus/p21-build.ts --local <carpeta>` (sin BD, sin red, sin variables de entorno) el 2026-10-27T14:09:08.461Z.
Las fuentes se verificaron por SHA-256 recalculado sobre archivos locales entregados por CLO; los PDF no se versionan en el repo.

## SHA-256 de las fuentes

| Fuente | Archivo | Bytes | SHA-256 obtenido | Contra esperado |
| --- | --- | --- | --- | --- |
| A | A_comercio.pdf | 751606 | `57c42a07b7540168fa74287212fa897505d0283d9e314606b25dd9106ce7f74a` | COINCIDE |
| B1 | B1_gaceta33801.pdf | 790648 | `8ec5d27be89442e2fdaa0164356cecb82874f23bbbe93bed962fe083a52868f7` | COINCIDE |
| B2 | B2_COTEJO-D59-2015-literal.md | 21102 | `7bbe492e83992c05087b568b56202460be49f138a786692506abacb006e25e6d` | COINCIDE |
| C | C_gaceta33445.pdf | 1720691 | `3b42a1f9120f386fbcb72039de94cc1110038450d0bbb16668c5818a1fe3a4cb` | COINCIDE |
| D | D_lgm.pdf | 3648369 | `66270e8d35d3d1ed5561028380baca78cb74f82ff2d8da5f97095c7a3856f267` | COINCIDE |

## Esperado vs obtenido

| Instrumento | Estado | Candidatos | Aceptados | Rechazados | Finales | Excluidos |
| --- | --- | --- | --- | --- | --- | --- |
| Código de Comercio (Decreto 73-50) | READY_FOR_STAGING_REVIEW + BLOCKED_SCHEMA + EMBEDDINGS_PENDING | 1790 | 1704 | 86 | 1698 | 418, 1662 |
| Código del Notariado (Decreto 353-2005), arts. 72, 72-A y 73 en texto D.59-2015 | READY_FOR_STAGING_REVIEW + BLOCKED_SCHEMA + EMBEDDINGS_PENDING | 3 | 3 | 0 | 3 | 11, 17, 27 |
| Decreto 284-2013, Título II (arts. 15 a 25) | READY_FOR_STAGING_REVIEW + BLOCKED_SCHEMA + EMBEDDINGS_PENDING | 11 | 11 | 0 | 11 | — |
| Ley de Garantías Mobiliarias (D.182-2009) | NEEDS_TEXT_LAYER | 0 | 0 | 0 | 0 | — |

Esperado: Comercio sin 418 ni 1662; Notariado 3 filas (72, 72-A, 73) sin 11/17/27; D.284-2013 Título II = 11 artículos (15..25); Garantías Mobiliarias sin filas (NEEDS_TEXT_LAYER).
Observación Comercio: el conteo final (1698) coincide con el de una corrida anterior sobre otra fuente; aquí se obtuvo de forma independiente desde los bytes BCH verificados.

## SHA-256 de los load.staging.sql (todos con el INSERT comentado)

| Archivo | SHA-256 |
| --- | --- |
| codigo-comercio/load.staging.sql | `1466f2ecbc832cf46fa08c5d55c8f88d02a0afdee41f223e832e9fa4d5ab9973` |
| codigo-notariado-d59-2015/load.staging.sql | `0e998b2bc9db600abf4292f9594c705881cad856ab9a9599f13674919f6b7d02` |
| decreto-284-2013-titulo-ii/load.staging.sql | `9b43983751476e8a536426741ffd3bad03ec1b67baa08e54c4e93e1c83ecaca2` |

## Salida literal de los dry-runs

```text
=== Verificación SHA-256 (archivos locales) ===
A A_comercio.pdf: 751606 bytes sha256=57c42a07b7540168fa74287212fa897505d0283d9e314606b25dd9106ce7f74a esperado=COINCIDE SHA256SUMS=COINCIDE
B1 B1_gaceta33801.pdf: 790648 bytes sha256=8ec5d27be89442e2fdaa0164356cecb82874f23bbbe93bed962fe083a52868f7 esperado=COINCIDE SHA256SUMS=COINCIDE
B2 B2_COTEJO-D59-2015-literal.md: 21102 bytes sha256=7bbe492e83992c05087b568b56202460be49f138a786692506abacb006e25e6d esperado=COINCIDE SHA256SUMS=COINCIDE
C C_gaceta33445.pdf: 1720691 bytes sha256=3b42a1f9120f386fbcb72039de94cc1110038450d0bbb16668c5818a1fe3a4cb esperado=COINCIDE SHA256SUMS=COINCIDE
D D_lgm.pdf: 3648369 bytes sha256=66270e8d35d3d1ed5561028380baca78cb74f82ff2d8da5f97095c7a3856f267 esperado=COINCIDE SHA256SUMS=COINCIDE

=== A. Código de Comercio (Decreto 73-50) — dry-run ===
páginas=419 glifos «Articulo º/° N» normalizados=1705
candidatos=1790 aceptados=1704 rechazados=86 números únicos aceptados=1700
duplicados=418x2,1511x2,1541x2,1662x2
excluidos CLO (ambas ocurrencias)=418,1662; deduplicados (sin pérdida de texto)=1511,1541; no resueltos=(ninguno)
finales=1698 (PRIMARY=1677, CONTEXT prenda=21); prenda esperada=21, presente=21, ausente=(ninguna)
huecos de numeración (no excluidos) 1..1713: 13 → 417,1000,1236,1237,1238,1239,1240,1241,1242,1243,1244,1245,1661

=== B. Código del Notariado, arts. 72, 72-A, 73 (D.59-2015) — dry-run ===
Gaceta 33,801: páginas=32 (fuente de verificación; el texto sale SOLO del COTEJO, no del OCR)
art. 72: 601 chars, role=CONTEXT, sha256=9d32eae4945526fc28154d70821378f5dabac2f3369f356f870cc2c3db9fbaa7
art. 72-A: 10132 chars, role=CONTEXT, sha256=ff10753b1403a9edab0dc08361ad6e9742d03b4a28ab74055727a6c10a6b9014
art. 73: 819 chars, role=CONTEXT, sha256=2a186336de1d842549d1f691face3bdc73529e67df2fd26ecdad1dcf07ef6dd5
no cargados: 11 (TEXTO_DIVERGENTE), 17 (HUECO), 27 (TEXTO_DIVERGENTE)

=== C. Decreto 284-2013, Título II — dry-run ===
Gaceta 33,445: páginas=72; decreto inicia en pág. 56
artículos hallados=11 → 15,16,17,18,19,20,21,22,23,24,25 ; esperado 11 (15..25): COINCIDE
art. 15: 569 chars, sha256=2041de91688dc109999bfc39e4f91d910555c7ca12eb26cf9defc72d8def3ebd
art. 16: 906 chars, sha256=412eb8af33e443f30b5d8af754579ba599cffd402b7ceb14a6d9e7a8ea284684
art. 17: 849 chars, sha256=fcd598af5bcd04a3c90383157386ce87353c0e4ab1fa0ff3ab7b9ff5bd1c006d
art. 18: 1502 chars, sha256=7d9a9210bdd05fffcbe95227ba8090367a0d0a4bfbd2c1ed42d6d988afe68e6d
art. 19: 351 chars, sha256=bbeb235d1d253eca9e8c05e2987dd911c4280666a74fbdd8b3df1091fe7625ec
art. 20: 704 chars, sha256=428d7f5fb97ff7d63c0ab2cd3fb3d3ae8a328c2efef32bb95cf13d1834d600f7
art. 21: 187 chars, sha256=de9f606674568b675477df7d5160441e92b0c1fe8d95ebb2046223b47f3e589b
art. 22: 729 chars, sha256=6f6a12b5a5c70d9eb63243491f1a8e89a30d2cf9f89be30ffe25efd20a5ca0f7
art. 23: 208 chars, sha256=880bd7f22009852d20cbced37637e8e0ae7fa65b715f063e90d4c20c102fd3f9
art. 24: 561 chars, sha256=2a950e4d9dd72f15fc12633b4e87b9793ebae0cd447bda90494f7fac15825dcd
art. 25: 120 chars, sha256=931e6372a1f82401cacc079213fe8d7cbc5ccef8ab0e08387eb7785518cb7de0

=== D. Ley de Garantías Mobiliarias (D.182-2009) — dry-run ===
páginas=20; caracteres de capa de texto (sin espacios)=0
capa de texto AUSENTE → NEEDS_TEXT_LAYER (solo manifiesto; sin filas ni SQL)
```

## Brecha de esquema (BLOCKED_SCHEMA + EMBEDDINGS_PENDING)

Columnas que usa el INSERT de `load.staging.sql` y dónde están definidas en el repo:

| Columna | `supabase/vectores.sql` | `supabase/migrations/` |
| --- | --- | --- |
| `id` (PK) | sí | — |
| `coleccion`, `materia`, `contenido`, `num_articulo`, `fuente`, `metadata` | sí | — |
| `embedding` (`vector(384) NOT NULL`) | sí | — |
| `created_at` (no usada por el INSERT) | sí | — |
| `revision_pendiente` (no usada por el INSERT) | no | sí (`20260925055249_revision_pendiente_instrumentos.sql`) |
| **`jurisdiccion`** | **no** | **no** (solo referenciada en una función) |
| **`fuente_tipo`** | **no** | **no** (solo referenciada en una función) |
| **`es_norma_vigente`** | **no** | **no** (solo referenciada en una función) |

Consecuencia (confirmada por CLO): el INSERT va **comentado** y marcado `BLOCKED_SCHEMA`; `embedding` es `NOT NULL` y no hay
embeddings locales, así que se escribe `NULL /* EMBEDDINGS_PENDING */` como marcador y el INSERT no es ejecutable tal cual.
No se creó ninguna migración. Las tres columnas existen en producción (auditorías previas), pero su DDL no está versionado en el repo;
cómo versionarlo lo deciden Fredy/CLO fuera de este PR.
