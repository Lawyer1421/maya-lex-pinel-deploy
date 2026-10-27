# P21 — DRY_RUN_COUNTS (staging `aicakncgtuiiuomflkqj`; NO APLICADO)

Generado por `npx tsx tools/corpus/p21-build.ts --local <carpeta>` (sin BD, sin red, sin variables de entorno) el 2026-10-27T14:26:26.844Z.
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
GAP_IN_SOURCE (ausentes en BCH y DGMM) 1..1713: 13 → 417,1000,1236,1237,1238,1239,1240,1241,1242,1243,1244,1245,1661
418 y 1662: 4 textos EXCLUIDOS (2 por número); numeración defectuosa en la fuente; la posición sugiere 417 y 1661, no verificado contra Gaceta

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

## Código de Comercio — excluidos 418 y 1662 y GAP_IN_SOURCE (dictamen CLO 27-oct-2026)

CLO cotejó BCH (`57c42a07…`) y DGMM (`cd8b55fb…`): ambas copias tienen los mismos defectos; es la fuente, no el parser.

**Nota:** numeración defectuosa en la fuente; la posición sugiere 417 y 1661, no verificado contra Gaceta.

### Los CUATRO textos excluidos (no PRIMARY, no CONTEXT, no renumerados)

| Art. | Ocurrencia | Caracteres | SHA-256 | Vista previa |
| --- | --- | --- | --- | --- |
| 418 | 1 | 112 | `3fcf576f771998ba4e48b0258caa87185bc161311c35e05c4583e4e7e71454e4` | Articulo 418 Podrá pedirse y deberá de decretarse la cancelación parcial cuando se reduzca |
| 418 | 2 | 203 | `364c7b009c503251f40c8529552be71d60bbb836240dd333277e0e5487498a84` | Articulo 418 Las anotaciones preventivas se cancelarán cuando se extinga el derecho que pr |
| 1662 | 1 | 1090 | `a9acf5e27bc23ced5a235814cbae12c208cac6b371c574a754b7c646926366d1` | Articulo 1662 El síndico tendrá los siguientes derechos y obligaciones: I.- Practicar el i |
| 1662 | 2 | 136 | `0b74a03bf36c5f206808bc9ba1f66a730c18ebc22f5be98b2f03b4a4ac2f487e` | Articulo 1662 Los acreedores podrán acordar la designación de una intervención que vigilar |

### GAP_IN_SOURCE (ausentes en BCH y DGMM; no se inventan ni se rellenan)

417, 1000, 1236, 1237, 1238, 1239, 1240, 1241, 1242, 1243, 1244, 1245, 1661 (13 números: 417, 1000, 1236–1245 y 1661)

### Deduplicados 1511 y 1541 (texto documentado)

**Art. 1511** — las dos ocurrencias son idénticas; se conserva la ocurrencia A (SHA-256 `3dc816ab10c6a6760cd330ecc38db1ef5c487446431df8fa4e0e1dbabdf72ec8`).

Conservada:

```text
Articulo 1511

La apelación contra el reconocimiento de crédito ajeno Lo coloca en la situación
de los créditos condicionales reconocidos, a no ser que diere fianza bastante.
```

**Art. 1541** — las ocurrencias difieren solo en acentuación del OCR; se conserva la ocurrencia B (SHA-256 `02ce161603500ad4ea5069439ae8e23d66f402dd4b0deac05ab87693de95debb`).

Conservada:

```text
Articulo 1541

Se considerará que se ha realizado todo el activo, aun cuando quede parte de
este, si el síndico demuestra ante el juez, oída la intervención, que esos bienes
carecen de valor económico, o que el que tienen, quedara íntegramente absorbido
por las cargas que pesan sobre ellos.
```

Descartada (SHA-256 `b487390bdac7218323f76da632b42f1a501bbadcb8ac676efc2017efc0a86c42`):

```text
Articulo 1541

Se considerara que se ha realizado todo el activo, aun cuando quede parte de
este, si el sindico demuestra ante el juez, oída la intervención, que esos bienes
carecen de valor económico, o que el que tienen, quedara íntegramente absorbido
por las cargas que pesan sobre ellos.
```

## Código del Notariado — art. 72-A, texto literal según el COTEJO (para adjudicación de CLO)

Rol: CONTEXT · estado editorial: PENDING_CLO · `elegible_primary=false`. Fuente del texto: `B2_COTEJO-D59-2015-literal.md` (SHA-256 `7bbe492e83992c05087b568b56202460be49f138a786692506abacb006e25e6d`), La Gaceta 33,801 (6-ago-2015), D.59-2015. SHA-256 del texto cargado: `ff10753b1403a9edab0dc08361ad6e9742d03b4a28ab74055727a6c10a6b9014` (10132 caracteres). Las únicas diferencias con el COTEJO son la retirada de marcas Markdown (negritas, citas `>`, rótulos de columna) y la unión de oraciones partidas entre columnas.

```text
ARTÍCULO 72-A.- Los órganos de la UNIÓN DE NOTARIOS DE HONDURAS (UNH), se deben elegir democráticamente conforme la presente Ley y a su Reglamento, lo constituyen:
1) La Asamblea General;
2) La Junta Directiva;
3) El Tribunal de Honor;
4) Los Capítulos distribuidos en el territorio nacional; y,
5) Los demás órganos auxiliares que establezca el Reglamento que apruebe la Asamblea Ordinaria.

A. DE LA ASAMBLEA GENERAL:
Las Asambleas Generales son Ordinarias y Extraordinarias; las asambleas están constituidas por todos los Notarios inscritos en la Unión de Notarios de Honduras (UNH). Para que haya quórum se requiere la presencia de más de la mitad de sus miembros o sus representantes. De no haber quórum se debe instalar una hora después de que no haya podido instalarse la primera, con los que asistan. Las resoluciones se deben adoptar con el voto favorable de la mayoría de los asambleístas. Cada miembro de la Unión de Notarios de Honduras (UNH) debe portar el carné de miembro. El Notario que no pueda asistir a una Asamblea puede hacerse representar con derecho a voto por otro Notario autorizándolo mediante Carta Poder. Sólo se tiene derecho a representar a un (1) Notario.

Las Asambleas Generales se celebran previa convocatoria realizada por parte de la Junta Directiva, la cual se debe hacer mediante nota dirigida a cada miembro de la Unión de Notarios de Honduras (UNH) y por aviso en un diario de amplia circulación o por una radiodifusora de audiencia general en el país y por cualquiera otro medio electrónico.

La convocatoria debe hacerse con quince (15) días de anticipación a la fecha señalada para la celebración de las Asambleas, expresándose en la misma que si no hay quórum en la primera convocatoria, se debe realizar una (1) hora después de la declaratoria de que no hubo quórum.

La Asamblea General Ordinaria se debe celebrar una (1) vez al año, en la fecha 2 de octubre de cada año, en el lugar que en la convocatoria se indique.

La Asamblea General Extraordinaria, se debe realizar por convocatoria de la Junta Directiva para tratar asuntos específicos.

Corresponde a la Junta Directiva de la Unión de Notarios de Honduras (UNH) por medio de su Presidente y Secretario, establecer el quórum previa la instalación de las Asambleas Generales. Acto seguido, si hay quórum, la Asamblea debe elegir su directiva, la cual debe estar integrada por: un (1) Presidente, un (1) Vicepresidente, dos (2) Secretarios y dos (2) Prosecretarios, ante ellos debe prestar la Promesa de Ley; a ella le corresponde dirigir las Asambleas.

Son atribuciones de la Asamblea General Ordinaria y Extraordinaria:
1) Elegir los miembros de la Junta Directiva, el Tribunal de Honor y demás órganos auxiliares cuyos requisitos, obligaciones y atribuciones deben aparecer en el Reglamento que se apruebe;
2) Tomar la Promesa de Ley a los Notarios electos en los cargos señalados en el párrafo anterior, la cual consiste en: “Prometo ser fiel a la Unión de Notarios de Honduras (UNH), cumplir y hacer cumplir la Constitución de la República, las leyes, el Código del Notariado; por mi honor, por mi familia y por mi Patria”;
3) Aprobar el presupuesto de la Unión de Notarios de Honduras (UNH);
4) Establecer la contribución ordinaria y extraordinaria que deben aportar los Notarios;
5) Aprobar o improbar los informes de la Junta Directiva y el Tribunal de Honor; y,
6) Las demás que la Junta Directiva considere exhorbitan sus propias atribuciones.

La Asamblea Extraordinaria se debe convocar para temas específicos y por convocatoria de la Junta Directiva.

B. DE LA JUNTA DIRECTIVA:
La Junta Directiva es el órgano ejecutivo encargado de la dirección y administración de la Unión de Notarios de Honduras (UNH) y está integrada por nueve (9) miembros propietarios y sus respectivos suplentes así: Un (1) Presidente, un (1) Vicepresidente, tres (3) Vocales, un (1) Secretario, un (1) Prosecretario, un (1) Tesorero y un (1) Fiscal, electos en Asamblea individualmente o por planilla por simple mayoría de votos.

La representación legal de la Unión de Notarios de Honduras (UNH) le corresponde a la Junta Directiva. Se ejerce por medio de su Presidente o quien haga sus veces y por el Fiscal en las situaciones en que haya problemas legales, judiciales, administrativas o cualquier otro análogo.

Todos los Notarios que estén inscritos en la Unión de Notarios de Honduras (UNH) y que no tengan incapacidad legal, tienen derecho a formar parte de la Junta Directiva.

Los miembros de la Junta Directiva deben tomar posesión de sus cargos el día 2 de octubre de cada año, duran dos (2) años en sus funciones y pueden ser reelectos.

Las funciones y atribuciones de los demás cargos de la Junta Directiva, deben ser regulados en el Reglamento correspondiente.

Son atribuciones de la Junta Directiva:
1) Convocar asambleas ordinarias y extraordinarias en la forma que esta Ley manda;
2) Dirigir y administrar la Unión de Notarios de Honduras (UNH);
3) Fortalecer la unidad de los Notarios y propender a su superación profesional y la solidaridad gremial y su enaltecimiento;
4) Juramentar a los nuevos miembros de la Unión de Notarios de Honduras (UNH);
5) Mantener buenas relaciones con el Colegio de Abogados de Honduras y con los demás sectores profesionales, nacionales y extranjeros;
6) Convocar a eventos científicos para fortalecer el acervo académico y científico de sus miembros;
7) Crear y otorgar reconocimientos y premios a sus miembros destacados y a otros ciudadanos nacionales y extranjeros o instituciones, por sus ejecutorias cívicas y profesionales que enaltezcan a la patria y al desarrollo de la cultura, la ciencia, las artes, la tecnología y los derechos humanos; y,
8) Las demás que consigne el Reglamento de Notarios de Honduras (UNH).

Son atribuciones del Presidente:
1) Presidir la Asamblea General y la Junta Directiva;
2) Representar a la Unión de Notarios de Honduras (UNH) por delegación de la Junta Directiva en actos oficiales, culturales, académicos y científicos;
3) Formular la agenda correspondiente a cada sesión y dirigirlas;
4) Decidir con voto de calidad, en caso de empate en las asambleas generales y de Junta Directiva;
5) Recibir la Promesa de Ley a los nuevos miembros y a los Notarios en los órganos de dirección de la Unión de Notarios de Honduras (UNH);
6) En caso de ausencia del Presidente debe fungir el Vicepresidente y a falta de éste los Vocales según el orden de su elección; y,
7) Las demás que se establezcan en el Reglamento de la Unión de Notarios de Honduras (UNH).

Son atribuciones del Fiscal:
1) Velar por que se cumpla esta Ley en lo atinente a la Unión de Notarios de Honduras (UNH), así como su reglamento;
2) Ejercer la representación legal de la Unión de Notarios de Honduras (UNH) en asuntos legales, judiciales, administrativas o cualquier otro análogo; y,
3) Las demás que se establezcan en el Reglamento de la Unión de Notarios de Honduras (UNH).

Son atribuciones del Tesorero:
1) Recaudar y custodiar las contribuciones a que están obligados los miembros;
2) Efectuar los pagos en nombre de la Unión de Notarios de Honduras (UNH) y llevar los libros contables necesarios;
3) Presentar trimestralmente un estado de cuenta a la Junta Directiva y rendir previamente la caución que ésta le establezca;

4) Depositar los fondos de la Unión de Notarios de Honduras (UNH) a nombre de ésta en una institución bancaria del país ya sea en efectivo o en valores de líquidos inmediatos según lo disponga la Junta Directiva; y,
5) Las demás que se establezcan en el Reglamento de la Unión de Notarios de Honduras (UNH).

Son atribuciones del Secretario:
1) Redactar y autorizar los actos, acuerdos y resoluciones que deba ser firmados por el Presidente de la Junta Directiva y refrendarlos con su firma;
2) Llevar registro y custodiar los libros siguientes: De Registro de los miembros de la Unión de Notarios de Honduras (UNH), de Actas y Acuerdos de la Asamblea General y de la Junta Directiva, así como los demás que ordene la Junta Directiva;
3) Inscribir a los miembros, tomando razón de sus títulos y extender el Certificado de Membresía;
4) Extender certificaciones;
5) Cursar las convocatorias a la Asamblea General, a la Junta Directiva y firmar la correspondencia;
6) Recibir y tramitar las solicitudes y notificaciones que se dirijan a la Unión de Notarios de Honduras (UNH) y a sus diferentes órganos; y,
7) Las demás que se establezcan en el Reglamento de la Unión de Notarios de Honduras (UNH).

Corresponde al Prosecretario prestar al Secretario la colaboración que requiera, debiendo sustituirle en caso de ausencia o impedimento temporal.

C. DEL TRIBUNAL DE HONOR:
El Tribunal de Honor es el órgano encargado de conocer la conducta de los Notarios miembros de la Unión de Notarios de Honduras (UNH) que infrinjan las disposiciones del Código de Ética Profesional, cuyo Reglamento debe aprobar la Asamblea General. El Tribunal de Honor está integrado por cinco (5) miembros electos por la Asamblea General Ordinaria, quienes deben conformar su propia directiva en los términos que determine el reglamento de esta Ley.

Para ser miembro del Tribunal de Honor se requiere:
1) Haber cumplido cuarenta (40) años de edad;
2) Haber ejercido el notariado durante cinco (5) años como mínimo;
3) Ser de reconocida honorabilidad y capacidad profesional; y,
4) No haber sido objeto de sanción grave en su desempeño profesional ni haber incurrido en delito.

Son atribuciones del Tribunal de Honor:
1) Servir de mediador en las controversias que surjan entre sus miembros o entre éstos y los particulares;
2) Conocer de las quejas y denuncias contra sus miembros e iniciar las sanciones disciplinarias que establece el reglamento de la Unión de Notarios de Honduras (UNH) y ponerla en conocimiento de la Junta Directiva; y,
3) Formular el Código de Ética Notarial y someterlo a la aprobación de la Asamblea General.

D. DE LOS CAPÍTULOS:
Para el mejor funcionamiento de la Unión de Notarios de Honduras (UNH), la Junta Directiva puede crear Capítulos en distintos lugares del territorio nacional, con las facultades y atribuciones que el Reglamento establezca
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
