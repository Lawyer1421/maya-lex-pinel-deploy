# LAUNCH_CORE_CORPUS_HN

> Generado por `npx tsx scripts/generate-launch-core.ts`. Alcance Tier A congelado. Estados calculados SOLO con evidencia del repositorio
> (`docs/launch/data/corpus-seed.json`, `docs/launch/discovery/*.json`). **Descubrir no es verificar**: ningún instrumento tiene aprobación humana V4/V5.

## Estados

`AVAILABLE_VERIFIED` aprobación humana V5 registrada · `AVAILABLE_PARTIAL` presente en el corpus sin verificar · `OUTDATED` desactualizado ·
`MISSING` ausencia verificada · `DISCOVERED_UNVERIFIED` solo candidato de descubrimiento · `PENDING_CLO` el inventario exige adjudicación del CLO.

## Cobertura

Instrumentos Tier A: **16**.

| Estado | Instrumentos |
|---|---:|
| AVAILABLE_VERIFIED | 0 |
| AVAILABLE_PARTIAL | 8 |
| OUTDATED | 0 |
| MISSING | 2 |
| DISCOVERED_UNVERIFIED | 5 |
| PENDING_CLO | 1 |

- Verificada (humano V5): **0 %**
- En el corpus, sin verificar (parcial + pendiente CLO + desactualizado): **56.3 %**
- Ausente (verificado): **12.5 %**
- Solo descubierta (sin URL ni hash): **31.3 %**

## Instrumentos

| Instrumento | Materia | Estado | Motivo | Evidencia |
|---|---|---|---|---|
| Constitución de la República de Honduras | CONSTITUTIONAL | AVAILABLE_PARTIAL | Presente en el corpus (inventario auditado) sin verificación humana V4/V5 ni vigencia verificada. | `docs/launch/data/corpus-seed.json`: HN_CONSTITUCION |
| Código Civil | CIVIL | AVAILABLE_PARTIAL | Presente en el corpus (inventario auditado) sin verificación humana V4/V5 ni vigencia verificada. | `docs/launch/data/corpus-seed.json`: HN_CODIGO_CIVIL |
| Código Procesal Civil | CIVIL_PROCEDURE | AVAILABLE_PARTIAL | Presente en el corpus (inventario auditado) sin verificación humana V4/V5 ni vigencia verificada. Cuatro capas; la comentada (Romero 2024) es doctrinal y no establece texto normativo. | `docs/launch/data/corpus-seed.json`: HN_CPC_PRIMARY_NORMATIVO, HN_CPC_PROCEDURAL_MIRROR, HN_CPC_TEXTO_BASE_D211_2006, HN_CPC_ROMERO_2024 |
| Código Penal | CRIMINAL | AVAILABLE_PARTIAL | Presente en el corpus (inventario auditado) sin verificación humana V4/V5 ni vigencia verificada. | `docs/launch/data/corpus-seed.json`: HN_CODIGO_PENAL |
| Código Procesal Penal | CRIMINAL_PROCEDURE | AVAILABLE_PARTIAL | Presente en el corpus (inventario auditado) sin verificación humana V4/V5 ni vigencia verificada. | `docs/launch/data/corpus-seed.json`: HN_CPP_D9_99E |
| Código de Comercio | COMMERCIAL | MISSING | Ausencia verificada en el corpus; el descubrimiento solo aportó pistas no oficiales (sin URL ni hash). | `docs/launch/data/corpus-seed.json`: ABSENT_CODIGO_DE_COMERCIO_DECRETO_73_1950<br>`docs/launch/discovery/DISCOVERY_A_ABSENT_INSTRUMENTS.json`: HN_CODIGO_COMERCIO_D73_1950 |
| Código del Trabajo | LABOR | AVAILABLE_PARTIAL | Presente en el corpus (inventario auditado) sin verificación humana V4/V5 ni vigencia verificada. | `docs/launch/data/corpus-seed.json`: HN_CODIGO_TRABAJO |
| Código de Familia | FAMILY | AVAILABLE_PARTIAL | Presente en el corpus (inventario auditado) sin verificación humana V4/V5 ni vigencia verificada. | `docs/launch/data/corpus-seed.json`: HN_CODIGO_FAMILIA |
| Código de la Niñez y de la Adolescencia | FAMILY | MISSING | Ausencia verificada en el corpus; el descubrimiento solo aportó pistas no oficiales (sin URL ni hash). | `docs/launch/data/corpus-seed.json`: ABSENT_DECRETO_73_96_CODIGO_DE_LA_NINEZ_Y_LA_ADOLESCENCIA<br>`docs/launch/discovery/DISCOVERY_A_ABSENT_INSTRUMENTS.json`: HN_CODIGO_NINEZ_ADOLESCENCIA_D73_96 |
| Código del Notariado / legislación notarial | NOTARIAL | PENDING_CLO | Presente en el corpus, pero el inventario exige adjudicación del CLO sobre el estado legal del instrumento primario. | `docs/launch/data/corpus-seed.json`: HN_CODIGO_NOTARIADO_D353_2005, HN_RESOLUCION_PCSJ_17_2012 |
| Procedimiento administrativo | ADMINISTRATIVE | DISCOVERED_UNVERIFIED | Sin entrada en el inventario del corpus; solo candidatos de descubrimiento, sin URL oficial ni hash. Descubrir no es verificar. | `docs/launch/discovery/DISCOVERY_B_PENDING_MATTERS.json`: HN_LEY_PROCEDIMIENTO_ADMINISTRATIVO, HN_LEY_JURISDICCION_CONTENCIOSO_ADMINISTRATIVA, HN_LEY_GENERAL_ADMINISTRACION_PUBLICA |
| Legislación de propiedad | PROPERTY | DISCOVERED_UNVERIFIED | Sin entrada en el inventario del corpus; solo candidatos de descubrimiento, sin URL oficial ni hash. Descubrir no es verificar. | `docs/launch/discovery/DISCOVERY_B_PENDING_MATTERS.json`: HN_LEY_PROPIEDAD |
| Código Tributario | TAX | AVAILABLE_PARTIAL | Presente en el corpus (inventario auditado) sin verificación humana V4/V5 ni vigencia verificada. | `docs/launch/data/corpus-seed.json`: HN_CODIGO_TRIBUTARIO<br>`docs/launch/discovery/DISCOVERY_B_PENDING_MATTERS.json`: HN_LEY_IMPUESTO_SOBRE_VENTAS, HN_LEY_IMPUESTO_SOBRE_LA_RENTA |
| Legislación aduanera | CUSTOMS | DISCOVERED_UNVERIFIED | Sin entrada en el inventario del corpus; solo candidatos de descubrimiento, sin URL oficial ni hash. Descubrir no es verificar. | `docs/launch/discovery/DISCOVERY_B_PENDING_MATTERS.json`: HN_LEY_ADUANAS, HN_CAUCA_RECAUCA |
| Legislación núcleo AML/CFT | AML | DISCOVERED_UNVERIFIED | Sin entrada en el inventario del corpus; solo candidatos de descubrimiento, sin URL oficial ni hash. Descubrir no es verificar. | `docs/launch/discovery/DISCOVERY_B_PENDING_MATTERS.json`: HN_LEY_ESPECIAL_LAVADO_ACTIVOS, HN_LEY_REGULACION_APNFD, HN_LEY_DELITO_LAVADO_ACTIVOS_45_2002, HN_LEY_BENEFICIARIOS_FINALES |
| Legislación núcleo bancaria/financiera | BANKING | DISCOVERED_UNVERIFIED | Sin entrada en el inventario del corpus; solo candidatos de descubrimiento, sin URL oficial ni hash. Descubrir no es verificar. | `docs/launch/discovery/DISCOVERY_B_PENDING_MATTERS.json`: HN_LEY_SISTEMA_FINANCIERO |

Para subir un instrumento: paquete oficial (OfficialSourcePackage) → validación de hash y fuente → QA del corpus → CLO → V4/V5. Hasta entonces, MayaLex se abstiene cuando no hay evidencia autoritativa.
