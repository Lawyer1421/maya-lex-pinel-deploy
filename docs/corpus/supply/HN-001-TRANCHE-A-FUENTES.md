# CORPUS SUPPLY HN-001 · TRAMO A — desbloqueo de fuentes (2026-11-04)

**Escrituras en corpus/producción: 0** (ver `docs/corpus/evidence/TRANCHE_A_PROD_UNCHANGED.json`) · **Resultado: 4 × descarga BLOQUEADA por la red del entorno; los paquetes siguen en `NEEDS_SOURCE_BYTES`.**

> Nada aquí es V4/V5, autoritativo ni vigente. Ningún hash se calculó porque ningún archivo se pudo descargar. Los hashes de abajo están `PENDIENTE`, nunca estimados.

## 1. Tabla de los cuatro documentos

| # | Paquete | Documento (URL exacta propuesta por ChatGPT) | Origen / clase | SHA-256 de bytes | Descarga | QA |
|---|---|---|---|---|---|---|
| 1 | HN-001-A01 · Código de Comercio D.73-50 | https://www.wipo.int/wipolex/es/legislation/details/2143 | WIPO Lex (OMPI, repositorio internacional) · **F2** (texto reproducido por un tercero; es una *ficha* HTML, no el PDF del código) | PENDIENTE | **BLOQUEADA** (proxy 403 / DNS no resuelve `www.wipo.int`) | No ejecutable |
| 2 | HN-001-A02 · D.284-2013 (reforma al Código de Comercio) | https://www.tsc.gob.hn/web/leyes/Ley_gene_empl_dere_inver.pdf | Tribunal Superior de Cuentas · **F2** (copia institucional; no es La Gaceta original). Dominio `VERIFIED` tier 4 en el registro | PENDIENTE | **BLOQUEADA** (`www.tsc.gob.hn`) | No ejecutable |
| 3 | HN-001-A03 · Código de la Niñez D.73-96 (consolidado) | https://www.poderjudicial.gob.hn/Cedij/Cdigos/C%C3%B3digo%20de%20la%20Ni%C3%B1ez%20y%20la%20Adolescencia%20%28Actualizado%20al%20Nuevo%20Codigo%20Penal%29.pdf | Poder Judicial / CEDIJ · **F2** (texto consolidado «actualizado al Nuevo Código Penal», no la publicación original) | PENDIENTE | **BLOQUEADA** (`www.poderjudicial.gob.hn`) | No ejecutable |
| 4 | HN-001-A04 · D.35-2013 (reforma integral Niñez) | https://www.se.gob.hn/media/files/archivoinstitucional/documentos/Codigo_Ninez_y_Adolescencia_2013.pdf | `se.gob.hn` (institución titular **no acreditada**) · **F2** presunta; el nombre del archivo sugiere un código completo, no el decreto aislado | PENDIENTE | **BLOQUEADA** (`www.se.gob.hn`) | No ejecutable |

**Clasificación.** F1 = publicación oficial primaria (La Gaceta); F2 = texto institucional consolidado o copia. **Ninguna de las cuatro URLs es F1.** La edición original de La Gaceta (N.º 33,445 y 33,222; y la de 1950 para el Código de Comercio) sigue sin localizarse; el dominio oficial de La Gaceta no está verificado en el registro.

## 2. Bloqueo concreto por fuente
Causa común: la política de red del entorno cloud solo permite hosts autorizados. Intento 1 (shell/curl): `CONNECT tunnel failed, response 403`. Intento 2 (herramienta de lectura web): `getaddrinfo ENOTFOUND` para los cuatro hosts. Reintento posterior (shell): 403 de nuevo. **No es un fallo de los documentos.**
Para desbloquear: agregar `www.wipo.int`, `www.tsc.gob.hn`, `www.poderjudicial.gob.hn` y `www.se.gob.hn` a *Allowed domains* de la red del entorno, o entregar los PDF por otra vía (Drive o PR en `docs/corpus/inbox/`). Mientras tanto no se continúa con documentos accesibles porque **ninguno** lo es.

## 3. Dominios (D)
Registro actual (`docs/retrieval/official-source-registry.json`): `www.tsc.gob.hn` VERIFIED tier 4; `www.poderjudicial.gob.hn` VERIFIED pero `DISCOVERY_ONLY` tier null; `legislacion.poderjudicial.gob.hn` (CEDIJ) VERIFIED tier 2; `wipo.int` y `se.gob.hn` **no figuran**. Consecuencia: con bytes, los paquetes 1 y 4 serían `DISCOVERED_UNVERIFIED`/`SOURCE_HOLD`, el 3 quedaría sin tier (portal índice) salvo que se equipare `/Cedij/` a la CEDIJ verificada, y solo el 2 sería `SOURCE_VALIDATED`.
Propuestas de alta (**no aplicadas**, requieren verificación humana y PR revisado): `docs/corpus/supply/HN-001-TRANCHE-A-DOMAIN-PROPOSAL.json`.

## 4. Artículos afectados por las reformas (F, G) — solo lo DECLARADO, sin acreditar
**D.284-2013 → Código de Comercio (D.73-50).** El proveedor declara que su artículo 13 ordena reformar los artículos **14, 15, 18, 157, 169, 189, 193, 210, 222, 224, 226 y 228** (12). Es la única reforma declarada. **No se infieren otras**, no se confirma que alguno esté derogado y no se sabe si el decreto contiene más artículos con efectos sobre el Código. Regla de promoción: cada artículo reformado debe cotejarse contra el texto del decreto antes de reemplazar su versión; **no se sustituyen versiones históricas por una consolidación no verificada**.
**D.35-2013 → Niñez / Familia.** Declarado: reforma integral del D.73-96 (La Gaceta 33,222 del 2013-09-06). El proveedor afirma además efectos sobre los Códigos de Familia, Penal y Civil; **no se lista ningún artículo** porque no hay texto. Pendiente de leer del decreto: artículos que reforma, deroga o adiciona en cada código, y su entrada en vigor.

## 5. Decisiones jurídicas necesarias para V4/V5 (no las toma el agente)
1. **Fecha del Código de Comercio:** 1950-02-17 (SEN) frente a 1950-05-01; resolver con la edición original de La Gaceta.
2. **Estatus de F2:** ¿una ficha de WIPO Lex, una copia del TSC y un consolidado CEDIJ bastan como fuente de texto, o se exige La Gaceta original (F1) para V4?
3. **Dominios:** verificar `se.gob.hn` (institución titular), la ruta `/Cedij/` de `www.poderjudicial.gob.hn` y el alta de `wipo.int` solo como descubrimiento.
4. **Consolidación CEDIJ de la Niñez:** al estar «actualizada al Nuevo Código Penal» incorpora reformas posteriores; decidir si se ingiere como texto vigente o si se reconstruye por versiones (original D.73-96 + D.35-2013 + posteriores).
5. **Vigencia y entrada en vigor** de D.284-2013 y D.35-2013, a leer del texto.
6. **Alcance de D.35-2013 sobre Familia/Penal/Civil:** identificar artículos con el texto y decidir si abren tareas nuevas (P0-005, P0-006, P0-010).
7. **Reformas posteriores** a D.284-2013 y a D.35-2013 hasta 2026: sin buscar.
8. **Coherencia del archivo nº 2:** el nombre `Ley_gene_empl_dere_inver.pdf` es el del proveedor y no basta para confirmar que contiene el D.284-2013; se acredita con el texto.

## 6. Qué sigue cuando haya bytes
Por paquete: `sha256sum` del PDF → `OfficialSourcePackage` (contrato en `OFFICIAL_SOURCE_PACKAGE_CONTRACT.md`) en `docs/corpus/inbox/<lote>/` → `npx tsx tools/corpus/process-batch.ts <lote> --out docs/corpus/staging/<lote>` → hoja CLO. Se procesa cada documento en cuanto esté disponible, sin esperar a los cuatro.

---

## English summary (American English)

All four downloads failed because the cloud environment's network policy blocks the four hosts (proxy 403 from the shell, DNS failure from the web reader, same result on retry). The documents themselves were never reached, so **no SHA-256 was computed and none was invented**; all four packages remain `NEEDS_SOURCE_BYTES`. None of the four URLs is an F1 primary publication (La Gaceta); all are F2 institutional or third-party copies. WIPO Lex and `se.gob.hn` are not in the domain registry, so domain additions are only *proposed* (not applied). Declared (unverified) amendments: Decree 284-2013 art. 13 reforms Commerce Code arts. 14, 15, 18, 157, 169, 189, 193, 210, 222, 224, 226, 228; Decree 35-2013 is an integral reform of the Children's Code with claimed effects on Family, Penal and Civil that cannot be listed without the text. Production was read-only checked: 84,204 rows, zero Commerce/Children's/decree rows, no writes. To unblock: allow the four hosts in the environment's network settings, or supply the PDFs.

**English tip:** *F1* vs *F2* is a provenance ladder: a primary source is the thing itself; a secondary source is someone's copy of it. Cite the first whenever you can.
