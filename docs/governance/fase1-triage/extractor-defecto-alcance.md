# Defecto del extractor — alcance priorizado (D9)

**No se aplicó ningún fix. Esto es solo alcance/documentación, para decidir orden
de trabajo cuando se autorice tocar código de ingesta.**

## (a) Incidente Arts. 1 y 2 — prioridad técnica ALTA, distinto del resto

Los artículos 1 y 2 del Código de Familia están ausentes de la extracción local,
igual que el bloque grande de 133+. **Pero es sospechoso que compartan la misma
causa** que el defecto ya confirmado (`HALLAZGO_DEFECTO_EXTRACTOR_VENTANA_NOTA`):
ese defecto se dispara por alta densidad de notas al pie en el Capítulo de
Adopción (~Art. 119-B en adelante) — los Arts. 1 y 2, al inicio del documento,
están lejos de esa zona. **Hipótesis sin confirmar**: podría ser un defecto
DISTINTO (ej. algo específico del encabezado/primera página del documento, o un
patrón distinto de nota al pie temprano en el texto) que coincide en síntoma
("ausente") pero no en causa. No se investigó la causa real en esta sesión — se
deja como hallazgo a diagnosticar por separado, no asumido como el mismo bug.

## (b) Artículos NO derogados ausentes en local (fuera de los dossiers)

Del cruce D10.2: **205 artículos** están ausentes en local y NO están en la lista
del Art. 63 (ni son Arts. 1-2). De estos, 6 (85, 86, 112, 113, 115, 118) ya
tienen una explicación parcial (gaps documentados en el manifest de extracción
propio). El resto — prácticamente todo el rango 129, 131, 135-338, incluyendo
varios clusters de artículos con sufijo (197-A a 197-E, 198-A a 198-C, 207-A a
207-G, 210-A, 216-A/B, 226-A, 242-A, 332-A) que sugieren OTRAS inserciones de
reforma sin decreto identificado todavía — están genuinamente sin explicar. No
se sabe si el defecto de ventana-de-nota-al-pie los afecta a todos, o si hay
zonas adicionales de alta densidad de notas repartidas en el resto del código.

## (c) Re-extracción completa para calidad del corpus

Una vez corregido el defecto (o los defectos, si (a) resulta ser distinto),
re-extraer el documento completo permitiría reemplazar el actual estado
"no confiable más allá de ~123" por una extracción real, y reducir
sustancialmente el trabajo de triage manual restante.

## Pausa confirmada

Por instrucción D9/D12: se pausa el triaje mecánico artículo-por-artículo de
`AUSENTE_EN_VERSION_LOCAL` ya explicado por el dossier 102-2018 (Nivel 1/2) o por
los gaps documentados. Los 205 sin explicar quedan documentados aquí, no se
procesan uno por uno hasta decidir sobre el fix del extractor.

---

*Sin fix aplicado. Sin re-extracción ejecutada. Solo alcance documentado.*
