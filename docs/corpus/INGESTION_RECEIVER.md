# Receptor de lotes de Corpus Supply HN

Cadena operativa (cada flecha es un estado separado; **ninguna promueve autoridad jurídica por sí sola**):

```
FUENTE OFICIAL → OfficialSourcePackage → hash/procedencia → segmentación → QA → candidato de staging → CLO_PENDING
                                                                                        │
                                              (humano, con aprobación registrada) ◄─────┘  V4 → V5 → INDEX → GOLDEN → AVAILABLE
```

## 1. Quién hace qué
| Paso | Quién | Dónde |
|---|---|---|
| Descubrir y descargar de la fuente oficial, calcular hashes | ChatGPT / persona | fuera de este entorno |
| Preparar el paquete (`OfficialSourcePackage`) | ChatGPT / persona | `docs/corpus/OFFICIAL_SOURCE_PACKAGE_CONTRACT.md` |
| Depositar el lote por PR | ChatGPT / persona | `docs/corpus/inbox/AAAA-MM-DD-<lote>/*.json` |
| Validar, segmentar, QA, generar candidato y hoja del CLO | automático (offline) | `npx tsx tools/corpus/process-batch.ts <lote> --out docs/corpus/staging/<lote>` |
| Adjudicar (V4/V5/RECHAZADO) | **solo el CLO** | hoja `worksheets/*.md` → aprobación registrada |
| Indexar / vectorizar / cargar a Supabase | **fuera de este receptor** (requiere autorización expresa y migración revisada) | — |

## 2. Qué hace el receptor (y qué NO)
- Rechaza (`REJECTED`) un paquete con hash que no coincide, dominio ≠ URL, http, fuente privada (`lagaceta.hn`), tier que excede el registro, texto demasiado corto, fecha futura o `verification_state` autoasignado.
- Acepta como **descubierto** (`DISCOVERED_UNVERIFIED`) cualquier dominio que no esté en `docs/retrieval/official-source-registry.json`: no es fuente oficial y el candidato queda en **`SOURCE_HOLD`**.
- Un dominio **verificado** en el registro da `SOURCE_VALIDATED` (sigue sin ser autoridad).
- Segmenta por artículos y corre QA. `BLOCKER` fallido → **`QA_FAILED`** (no llega al CLO). `WARNING` (saltos/repetidos de numeración, artículos casi vacíos) se muestran al CLO, que decide.
- Solo **fuente validada + QA sin bloqueos** llega a **`CLO_PENDING`**: el registro avanza (con actor `AUTOMATION`) hasta `HUMAN_VERIFICATION` y se genera la hoja de verificación. La automatización **no puede** dar V4, V5 ni AVAILABLE (la prueba lo exige).
- Un texto nuevo del mismo documento crea una **versión nueva** (append-only); la anterior no se toca. Un duplicado exacto no se reprocesa. Reejecutar un lote es idempotente.
- **Jurisprudencia (`document_type: JUDGMENT`) va a un corpus aparte**: nunca produce candidato de legislación; queda con precedencia `UNKNOWN` y estado público `UNKNOWN` (no indexable) hasta que una persona complete tribunal, sala, caso, fecha y estado.
- Candidatos con `fixture: true` (dominio `.invalid` o texto «SINTÉTICO») son material de prueba.
- Nunca: red, base de datos, Supabase, variables, secretos, ni escritura al corpus.

## 3. Estados de un candidato
| Estado | Significa | Siguiente paso |
|---|---|---|
| `QA_FAILED` | falla un chequeo BLOCKER (codificación, ruido, hash, sin artículos en una ley) | corregir y reenviar el paquete |
| `SOURCE_HOLD` | el dominio no está verificado en el registro | verificar el dominio (registro) antes de que el CLO adjudique |
| `CLO_PENDING` | fuente validada + QA sin bloqueos | el CLO usa la hoja; decide V4 / V5 / RECHAZADO |

Todo candidato lleva `authoritative: false`, `vigencia: "UNKNOWN"`, `verification: "PENDING_VERIFICATION"`.

## 4. Cómo suministrar un lote (para ChatGPT)
1. Un `.json` por documento, con todos los campos del contrato; `decree`/`gaceta`/`gaceta_date` en `UNKNOWN` si no constan en la fuente — **no inferir**.
2. `text_sha256 = sha256(extracted_text en UTF-8)`; `bytes_sha256 = sha256(archivo original)`.
3. `verification_state` = `UNVERIFIED`; `source_tier` = `null` (el registro concede el tier; declarar uno superior se rechaza).
4. Si el dominio es oficial pero no figura en el registro, **proponerlo** en el PR del lote (dominio, institución, evidencia de que es oficial) para que se verifique; no se acepta por defecto.
5. Probar localmente: `npx tsx tools/corpus/process-batch.ts docs/corpus/inbox/<lote> --out /tmp/prueba`.

Ejemplo de lote sintético: `tools/corpus/examples/batch-synthetic/` (fuente no verificada → `SOURCE_HOLD`; sentencia → corpus de jurisprudencia; hash alterado → `REJECTED`).

## Manifiestos de evidencia (paquetes sin bytes ni texto)

Un paquete que llega solo con metadatos (sin URL exacta, texto ni hash) **no pasa por el receptor estricto** (que lo rechaza por esquema): se deposita en una subcarpeta `manifests/` del lote y se procesa con

```sh
npx tsx tools/corpus/process-manifests.ts docs/corpus/inbox/<lote>/manifests --out docs/corpus/staging/<lote>
```

Resultado máximo: `NEEDS_SOURCE_BYTES` (con la lista de lo que falta y una hoja CLO). No crea candidato ni QA; no resuelve discrepancias de fecha; no infiere reformas; no autoriza nada. Para avanzar, el proveedor entrega el `OfficialSourcePackage` completo. Ejemplo: `docs/corpus/supply/HN-001-TRANCHE-A.md`.
