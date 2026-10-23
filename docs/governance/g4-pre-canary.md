# G4 PRE-CANARY — procedencia pública (G4-A) y privacidad (G4-B)

Estado: **offline**. `SHADOW_GATEWAY_ENABLED=false`, `SHADOW_BUDGET_USD=0`, sin credenciales. OpenAI **no** se activa.
Este PR no ejecuta canary, no aplica migraciones y no toca el corpus.

## G4-A — `PUBLIC_PROVENANCE_STRONG_PROOF_PENDING`

### Trazado de punta a punta (ingesta → gateway)
| Capa | Qué existe | ¿Prueba pública? |
|---|---|---|
| Ingesta oficial (`lib/ingesta-oficial`) | manifiesto con checksum, pipeline de 16 pasos, estados V0–V5, roles autorizados | Sí, pero **no queda ligado al fragmento recuperado** en runtime |
| Fila canónica (`mayalex_normativos:<slug>_a<N>`) | `metadata.norm_id/decreto/hash_texto_sha256/verificado`; tabla `norma_version` (fuente_pdf_hash, nivel_verificacion, elegible_primary) | Parcial: el dato existe para ingestas nuevas, no para todo el corpus |
| `biblioteca_vectores` | mezcla: 42,378 filas notariales `instrumento` con datos personales, capa `doc_*`, importación ChromaDB heredada, capa NULL | **No**: pertenecer a la tabla no prueba nada |
| `FragmentoRAG` | `fuente_tipo`, `jurisdiccion`, `es_norma_vigente`, `hash` | `hash` es de 8 hex derivado del propio contenido (tautológico): no prueba origen |
| Evidence Gate / Gateway (G3) | gate estructural conservador | Necesario, **no suficiente** |

Hallazgos: (1) ninguna fila existente puede afirmarse pública sin adjudicación del CLO; (2) la ingesta de Adopciones usa
`fuente_tipo:'ley'` mientras el gate G3 exige `'codigo'` (brecha de cobertura, se rechaza por seguridad); (3) el `hash` de
`FragmentoRAG` no es prueba de procedencia.

### Diseño entregado
`lib/ai-gateway/shadow/public-provenance.ts` exige, para TODO fragmento, una entrada de un **manifiesto aprobado**
(`public-provenance-manifest.ts`) con: id canónico, fuente, artículo, **SHA-256 del contenido exacto**, fuente oficial
(URL https, Gaceta, SHA-256 del PDF), verificación ≥ V4, aprobador y fecha. Se compara contra lo recuperado en runtime;
cualquier diferencia → `SKIPPED_PUBLIC_PROVENANCE`. Un manifiesto inválido o una lista vacía rechazan.

**El manifiesto se entrega VACÍO**: hoy ningún fragmento tiene prueba fuerte y el gateway no envía nada. Poblarlo es
una decisión humana (CLO) artículo por artículo. `proponerEntradaManifiesto` calcula el hash para esa revisión.

Extensión mínima de datos propuesta (NO aplicada): `docs/proposals/g4a-procedencia-publica.PROPUESTA.sql`.

## G4-B — `PRIVACY_GATE_KNOWN_FALSE_NEGATIVES_PENDING`

Benchmark offline: `tests/privacy/benchmark-privacidad.ts` + `tests/privacy-benchmark.test.ts` (datos sintéticos).
Categorías: nombres completos, sin tratamiento, con tratamiento, DNI, RTN, teléfonos, emails, emails ofuscados,
pasaporte, cuentas, expedientes, números judiciales, números en palabras; más consultas públicas y las preguntas del
Golden Set para medir falsos positivos.

Resultado: recall **100 %** por categoría sobre los casos exigidos; **0** falsos positivos sobre consultas públicas y Golden Set.

Cerrado: nombres por diccionario (`nombres-propios.ts`), números en palabras, números judiciales, correos ofuscados
(`@`, `at/dot`), teléfonos con formatos extra, IBAN, pasaporte en inglés.

**Riesgo residual (no se oculta):** nombres fuera del diccionario en minúscula y sin marcador («zacarias quiroz»);
la lista de nombres es finita. Falso positivo conocido: preguntas sin vocabulario jurídico (etapa E, fail-closed).
Conclusión: el riesgo se reduce, no se elimina. Antes de un canary con consultas reales hace falta que Fredy lo acepte
expresamente o que se añada un clasificador adicional.

## Qué sigue bloqueando un canary
1. Manifiesto de procedencia vacío (decisión CLO por artículo).
2. Aceptación expresa del riesgo residual de privacidad.
3. Los puntos de «Verificar antes de activar» en `gateway-g3-deuda-pre-canary.md` (tarifas, esquema estricto, Node en Vercel, serverless, presupuesto/kill switch).
