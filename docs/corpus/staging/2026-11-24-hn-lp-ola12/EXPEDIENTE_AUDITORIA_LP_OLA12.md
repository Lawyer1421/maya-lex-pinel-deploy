# Expediente de auditoría · OLA 12 · `HN:LEY_PROPIEDAD`

**Estado:** D1–D8 FIRMADAS (2026-11-24, Abg. y Not. Fredy Omar Pinel Flores, CLO)
**Instrumento:** Ley de Propiedad de Honduras (Decreto No. 82-2004) · lote `OLA12_LP_2007_01`
**Fecha del paquete:** 2026-11-24 · **Generador:** `scripts/olas/ola12-leyes.ts lp` + `scripts/olas/cedij.ts` + `scripts/olas/paquete-ola.ts`
**Staging:** `mayalexhn-staging` (`aicakncgtuiiuomflkqj`) · **Producción:** `thgrhueckkjdutjvcufp`

> **Cómo se firma.** El CLO revisa las secciones 1 a 5 y decide D1–D8 en §6. Para firmar, sustituye en la línea **Estado** el texto `PENDIENTE DE FIRMA` por la fórmula de firma (D1–D8 y la palabra FIRMADAS) y completa el bloque de firma. El ejecutor (`scripts/olas/ejecutar-sql.ts`) lee la firma solo en esa línea **Estado** y se niega a correr la visibilidad V4 en staging y cualquier paso de producción si este archivo no está firmado o no cita la huella SHA-256 exacta de cada SQL (§7). Si el CLO modifica una decisión, hay que regenerar el paquete y volver a citar las huellas.

## 1. Fuente

| Pieza | Archivo · SHA-256 | Uso |
|---|---|---|
| Edición de la CSJ «Ley_de_la_Propiedad.pdf» (`CLRA/`) | 537,721 bytes, 44 págs., 12-abr-2007 · `ecdb725f72985a489643669300edee0f702a610bbb9c454f71daa84a6ce31785` | Texto base, arts. 1–142, sin notas al pie |

**Particularidades:**
- la edición escribe «ARTICLO 15.-», que se corrige como errata;
- los incisos «1 La clase de título…» no se confunden con notas, porque esta fuente se extrae sin detección de notas;
- los arts. 17 y 142 terminan sin punto en la edición. **El 142 parece truncado** («…consignado en el Titulo»).

## 2. Situación actual en producción

**No hay filas** de la Ley de Propiedad en producción.

## 3. Conteo y clasificación propuesta

| Concepto | Filas |
|---|---:|
| Artículos 1–142 | 142 |
| **PRIMARY** | **137** |
| **CONTEXT vigentes**: arts. 53, 75, 77, 126 y 140 (§4, D5) | **5** |

## 4. Reformas posteriores no integradas (D5)

En `SISTEMA_LEGAL_PRINCIPAL` hay decretos de reforma posteriores a la edición, todos **escaneados sin capa de texto**:
- D.109-2009, que reforma el art. 77;
- D.150-2010, que reforma los arts. 53 y 140;
- D.205-2012, que reforma los arts. 75, 77 y 126.

No se puede integrar su texto. Los cinco artículos afectados se proponen como **CONTEXT vigente**, con constancia de «reforma posterior no integrada», el mismo criterio que la reforma tácita de la OLA 1. Los artículos reformados se identifican por el nombre de cada archivo; conviene confirmarlos con La Gaceta.

## 5. Reservas

1. Hay además dos escaneos que no se pudieron revisar: «Decreto 031-2005 reforma arts Ley de Propiedad.pdf» y los PCM-031 a 041-2005. Es posible que haya otros artículos reformados.
2. Para integrar las reformas hace falta su texto en La Gaceta, u OCR de los escaneos.

## 6. Decisiones D1–D8 para firma

| # | Decisión propuesta | Decisión del CLO |
|---|---|---|
| D1 | Fuente PRIMARY: edición CSJ 2007, con las reservas 5.1 y 5.2 | ☑ Aprueba |
| D2 | Aceptar la extracción (errata «ARTICLO», 2 excepciones sin cierre; art. 142 truncado en la edición) | ☑ Aprueba |
| D3 | Firma del texto consolidado de 142 artículos (huella en §7) | ☑ Firma |
| D4 | Vigencia: 142 `true` | ☑ **Aprueba**: 137 PRIMARY y 5 CONTEXT vigentes |
| D5 | Arts. 53, 75, 77, 126 y 140: CONTEXT vigentes hasta integrar el texto de las reformas de 2009–2012 | ☑ **Aprueba**: arts. 53, 75, 77, 126 y 140 CONTEXT vigentes, pendientes de integrar por OCR las reformas de 2009–2012 |
| D6 | Constancias de reforma no integrada (ver `constancias.csv`) | ☑ Aprueba |
| D7 | Sin legacy que ocultar | ☑ Aprueba |
| D8 | Autorizar V4 en staging y V5 en producción, exactamente para los SQL y huellas de §7 | ☑ Autoriza |

Firma: **aprobado** · Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex) · Fecha: 2026-11-24

*Registro de la firma.* El CLO comunicó en la sesión de trabajo del 2026-11-24 la aprobación de D1–D8, con determinación expresa sobre D4 y D5; Claude Code la transcribió aquí por su instrucción. El paquete no se regeneró después: la firma cubre exactamente las huellas de los SQL citadas en este pliego.

## 7. Paquete SQL y huellas (lo que autoriza D8)

Los archivos se generan en `out/ola12-lp/` (directorio ignorado por git), de forma reproducible con `npx tsx scripts/olas/ola12-leyes.ts lp`.

**Huellas del expediente:**
- texto consolidado: `78770e76a3f7c67eb32324c6dfbcd2782896c56c3efdd2ea0fd6325a7c5b8048`;
- `manifiesto_articulos.json`: `151f97135ff77a64d461892ed9ae33aacde18664815d50f2155e9706863ccfa8`;
- `constancias.csv`: `e93ed1da73edd09e19d43ee8b96ae2c11e2a935adae00304dd6fd8941283de80`.

| Paso | Archivo | Bytes | SHA-256 | Firma |
|---:|---|---:|---|---|
| S1 | `staging/01_insert_staging.sql` | 241,840 | `f6b2664df0b90f468210b02dcc3746a5fcabcd79953b1c208519c470b70ae7c7` | No (filas ocultas) |
| S2 | `staging/02_embeddings_staging.sql` | 544,149 | `8d04f6c7b642b432fcf4f8695dcf257d123de912249641f39e9ef2219c47aa09` | No |
| S3 | `staging/03_verificacion_staging.sql` | 1,633 | `b32ccae21305898e545f28331ff01f116c6edfe70cf4723731be4432a908dcda` | No (solo lectura) |
| S4 | `staging/04_visibilidad_v4_staging.sql` | 10,439 | `6d8efce0da867aa01a9e82ce11c35b408b9b8d981bd8c64e90a1667943ef08fb` | **Sí** |
| P0 | `prod/00_precheck_y_respaldo_prod.sql` | 1,254 | `7e42729b8f6af5de7185c417cda9abf38ef8f5e2d3bab5f53d4a8eb7002b7357` | **Sí** |
| P1 | `prod/01_datos_prod.sql` | 247,088 | `f2bb547b9884d667f305859477829b85050f479d67f45ae0514fb5e929e9d527` | **Sí** |
| P2 | `prod/02_embeddings_prod.sql` | 553,308 | `f92e6ebc95b604a9059fbbb76494e3308d8e13281cce4b7e67b3b8329fc3ed3b` | **Sí** |
| P3 | `prod/03_activacion_v5_prod.sql` | 10,853 | `bcd8fe62e1650d77d7f7ed3311224e39f2b3e86b5f7e9cc538fbabc9689d8354` | **Sí** |
| R | `prod/99_reversion_prod.sql` | 463 | `f18c0f82458483ec0cf2dd3674fa63a3318783e2225779ff1e99b69ecc53396a` | Solo por orden del CLO; el `.ps1` no lo ejecuta |

**Ensayo en base desechable (2026-11-24).** Se corrió el paquete completo en Postgres 17 con pgvector (PGlite): esquema real de 18 columnas, sin filas legacy y con una fila V5 ajena.
- **Staging:** S1 y S2 son reaplicables. S3 verifica todas las huellas SHA-256. La repetición de S4 falla cerrada.
- **Producción, antes de activar:** P3 se niega antes de P1/P2. P0 corre sin filas que respaldar.
- **Activación y reversión:** P3 activa 142 filas V5 (137 PRIMARY, 5 CONTEXT) sin tocar la fila ajena (no hay legacy que ocultar). R elimina el lote.

## 8. Ejecución tras la firma

```powershell
pwsh -File out\ola12-lp\ejecutar_staging.ps1 -DesdePaso 1 -HastaPaso 3
pwsh -File out\ola12-lp\ejecutar_staging.ps1 -DesdePaso 4 -HastaPaso 4
pwsh -File out\ola12-lp\ejecutar_prod.ps1
```
