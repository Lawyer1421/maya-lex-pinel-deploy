# CORPUS_GAP_MATRIX_HN

Fuente: `docs/corpus/MAYALEX_CORPUS_MASTER_INVENTORY_V1.*` (2026-10-01, auditado) y `docs/corpus/MAYALEX_CORPUS_GAP_ANALYSIS.md` (2026-09-30). **Ningún instrumento se marca `AVAILABLE`** porque `AVAILABLE` exige el pipeline completo (V4→V5 verificado por humano→golden test) y hoy `es_norma_vigente` es NULL en ~80 % de las filas. Esta matriz es la hoja de ruta, no una declaración de validez.

Estados: `AVAILABLE` · `PARTIAL` (presente, vigencia/versión sin verificar) · `OUTDATED` · `MISSING` (ausencia verificada) · `PENDING_VERIFICATION` (sin inventario).

| Materia | Instrumento | Estado | Evidencia / filas | Acción |
|---|---|---|---|---|
| Constitucional | Constitución de la República | PARTIAL | 378 filas | Verificar versión vigente y reformas (Gaceta); cargar Ley sobre Justicia Constitucional (124 filas, PARTIAL) |
| Civil | Código Civil | PARTIAL | 2,372 filas, artículos no medidos | Medir artículos distintos; reformas |
| Procesal civil | CPC (D. 211-2006) | PARTIAL | 4 capas (normativa 932, espejo 932, texto base 995, comentado Romero 1,481 doctrinal) | Resolver identidad canónica; separar doctrina de norma |
| Penal | Código Penal | PARTIAL | 635 filas; D.130-2017 art. 634 pendiente CLO | Piloto de procedencia (ya preparado); reformas |
| Procesal penal | CPP (D. 9-99-E) | PARTIAL | 480 filas | Verificar reformas |
| Mercantil | Código de Comercio (D. 73-1950) | MISSING | `ABSENT_VERIFIED` | Prioridad launch-core: descubrir en Gaceta/CEDIJ e ingerir |
| Laboral | Código del Trabajo | PARTIAL | 870 filas | Reformas |
| Familia | Código de Familia | PARTIAL | 373 filas | Adopciones D.102-2018 (64) PARTIAL |
| Familia | Código de la Niñez (D. 73-96) | MISSING | `ABSENT_VERIFIED` | Ingerir |
| Notarial | Código del Notariado D.353-2005 + Reglamento | PARTIAL (94 + 111 filas, completos) | Vigencia 87/7 | Candidato a primer AVAILABLE tras QA humano |
| Administrativo | Ley de Procedimiento Administrativo; Ley de la Jurisdicción Contencioso-Administrativa | PENDING_VERIFICATION | sin inventario | Descubrir |
| Tributario | Código Tributario | PARTIAL | 215 filas | Reformas; leyes SAR |
| Aduanero | Código Aduanero Uniforme Centroamericano / RECAUCA | PENDING_VERIFICATION | sin inventario | Descubrir |
| Bancario | Ley del Sistema Financiero (CNBS) | PENDING_VERIFICATION | sin inventario | Descubrir |
| AML | Ley Especial contra el Lavado de Activos | PENDING_VERIFICATION | sin inventario | Descubrir |
| Propiedad | Ley de Propiedad; Ley del IP/RNP | PENDING_VERIFICATION | sin inventario | Descubrir |
| Orgánica judicial | Ley de Organización y Atribuciones de los Tribunales | MISSING | `ABSENT_VERIFIED` | Ingerir |
| Otros ausentes | Decretos 31-2015, 35-2013, 124-92, 284-2013 | MISSING | `ABSENT_VERIFIED` | Identificar títulos y priorizar |
| Jurisprudencia | CEDIJ / Poder Judicial | MISSING | sin pipeline | Fábrica de jurisprudencia |
| Capas legado | `fuente IS NULL` (8,366) | PENDING_VERIFICATION | sin identidad | Higiene de identidad |
| Capas legado | `doc_*` (≈65,776) | n/a | capa privada/no normativa | **Nunca** al corpus público |

Los títulos de instrumentos «PENDING_VERIFICATION» son los nombres genéricos de la materia, no decretos citados: el decreto, la Gaceta y el URL oficial los fija el descubrimiento (Tier 1 La Gaceta, Tier 2 CEDIJ) y la verificación humana.
