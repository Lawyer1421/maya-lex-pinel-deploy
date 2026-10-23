# DISCOVERY_B — materias pendientes (administrativo, aduanero, bancario, AML, propiedad, tributario)

Fecha: 2026-10-23. Solo investigación. **Ningún dato fue observado en un documento oficial**: todos los hosts oficiales `.gob.hn` fueron inalcanzables desde el entorno (ver `fetch_log` en el JSON). Lo que sigue proviene de resultados de búsqueda web (fuentes secundarias o copias de terceros) y es **discovery-only**, `UNVERIFIED`.

| Instrumento | Materia | Lo que reportan las búsquedas (sin verificar) | Falta |
|---|---|---|---|
| Ley de Procedimiento Administrativo | ADMINISTRATIVE | Decreto 152-87 (el archivo y el encabezado de un resultado dicen 152-87; la ficha de la OMC lo rotula 152-97) | Descargar de fuente oficial (Tier 1–5), hash, Gaceta/fecha reales, reformas, vigencia |
| Ley de la Jurisdicción de lo Contencioso-Administrativo | ADMINISTRATIVE | Decreto 189-87, 1987-11-20, Gaceta 25,416 de 1987-12-31 según el Diccionario panhispánico del español jurídico (dpej.rae.es) | Descargar de fuente oficial (Tier 1–5), hash, Gaceta/fecha reales, reformas, vigencia |
| Ley General de la Administración Pública | ADMINISTRATIVE | Decreto 146-86, 1986-11-29 según nombre de archivo de la OMC | Descargar de fuente oficial (Tier 1–5), hash, Gaceta/fecha reales, reformas, vigencia |
| Ley de Aduanas | CUSTOMS | Decreto 212-87, aprobada en diciembre de 1987 y vigente desde 1988-01-01 según WIPO Lex; sustituyó al Decreto 1004 de 1980-07-14 | Descargar de fuente oficial (Tier 1–5), hash, Gaceta/fecha reales, reformas, vigencia |
| Código Aduanero Uniforme Centroamericano (CAUCA) y su Reglamento (RECAUCA) | CUSTOMS | instrumentos regionales (COMIECO); RECAUCA Resolución 224-2008 (COMIECO-XLIX) aprobada 2008-04-25 según base de datos TFA | Descargar de fuente oficial (Tier 1–5), hash, Gaceta/fecha reales, reformas, vigencia |
| Ley del Sistema Financiero | BANKING | Decreto 129-2004 según el PDF «Reformado por el CPC 2010» del TSC (texto consolidado hasta 2010; reformas posteriores no verificadas) | Descargar de fuente oficial (Tier 1–5), hash, Gaceta/fecha reales, reformas, vigencia |
| Ley Especial Contra el Lavado de Activos | AML | Decreto 144-2014, publicada en La Gaceta 33,718 de 2015-04-30 según copia en bcv.hn; crea la CIPLAFT | Descargar de fuente oficial (Tier 1–5), hash, Gaceta/fecha reales, reformas, vigencia |
| Ley para la Regulación de Actividades y Profesiones No Financieras Designadas (APNFD) | AML | Decreto 131-2014, misma edición de La Gaceta 33,718 según copia en pplaft.cnbs.gob.hn | Descargar de fuente oficial (Tier 1–5), hash, Gaceta/fecha reales, reformas, vigencia |
| Ley contra el Delito de Lavado de Activos | AML | Decreto 45-2002 según copia del TSC; tipifica el delito y medidas precautorias | Descargar de fuente oficial (Tier 1–5), hash, Gaceta/fecha reales, reformas, vigencia |
| Ley de Transparencia y Registro Centralizado de Beneficiarios Finales | AML | Decreto 127-2026 publicado 2026-07-03 según un medio de prensa (La Prensa) — fuente secundaria única; CNBS tendría 60 días para el reglamento; emisión del reglamento: no verificada | Descargar de fuente oficial (Tier 1–5), hash, Gaceta/fecha reales, reformas, vigencia |
| Ley de Propiedad | PROPERTY | Decreto 82-2004; texto publicado en La Gaceta 30,428; vigencia desde 2004-06-15 según resolución del Consejo Directivo del IP; otra copia fecha el decreto 2004-05-28 (discrepancia sin resolver) | Descargar de fuente oficial (Tier 1–5), hash, Gaceta/fecha reales, reformas, vigencia |
| Ley del Impuesto sobre Ventas | TAX | Decreto-Ley 24 de 1963 (fecha discrepante entre fuentes: 1963-06-03 vs 1963-12-20); tasa general 12 % según compilación CIAT; compilaciones listadas hasta decretos 134-2003 y 219-2003; reformas posteriores sin verificar | Descargar de fuente oficial (Tier 1–5), hash, Gaceta/fecha reales, reformas, vigencia |
| Ley del Impuesto Sobre la Renta | TAX | Decreto-Ley 25 de 1963, publicado en La Gaceta 18,161 de 1963-12-27 según prensa; reformas reportadas (p. ej. Decreto 278-2013) sin verificar; compilaciones de Finanzas actualizadas a 2004 y 2012 | Descargar de fuente oficial (Tier 1–5), hash, Gaceta/fecha reales, reformas, vigencia |

## Encontrado / no encontrado
- **Encontrado (candidato):** los 13 instrumentos de la tabla, con título y decreto reportado por terceros.
- **No encontrado:** ningún texto oficial descargado; ninguna URL oficial verificada; ninguna Gaceta confirmada por documento; incorporación del CAUCA/RECAUCA en Honduras; leyes de SAR adicionales (más allá de ISV e ISR); texto consolidado vigente de cualquier instrumento.
- **Discrepancias a resolver:** Ley de Procedimiento Administrativo (152-87 vs 152-97 en una ficha); Ley de Propiedad (decreto 2004-05-28 vs vigencia 2004-06-15); ISV (1963-06-03 vs 1963-12-20); relación entre las leyes de lavado 45-2002 y 144-2014.
- **Dato de prensa sin respaldo oficial:** Ley de Beneficiarios Finales (Decreto 127-2026): confirmar en La Gaceta antes de usar.

## Próximos pasos para el CLO / ingeniería
1. Habilitar acceso de red a los hosts oficiales (o descargar manualmente los PDF): legislacion.poderjudicial.gob.hn (verificado en el registro), CNBS, SAR, IP, UIF, Aduanas, TSC, Congreso y La Gaceta.
2. Confirmar el dominio oficial de La Gaceta y del Congreso (sin verificar en `docs/retrieval/OFFICIAL_HONDURAS_SOURCE_REGISTRY.md`).
3. Por instrumento: descargar → sha256 → registrar Gaceta/fecha reales → reformas/derogaciones → verificación humana (V4/V5).
4. Resolver las discrepancias listadas con el documento oficial.
