# Procedimiento único de recepción de PDF · Tramo A (HN-001)

**Estado del bloqueo (cerrado, no se repite).** El proxy del entorno cloud impide la descarga: `CONNECT … 403` desde el shell y `ENOTFOUND` desde la herramienta web, para los hosts `.gob.hn`, `bch.hn`, `sde.gob.hn` y `wipo.int` (ver el historial en PR #119). **No se volverán a intentar descargas desde ese proxy ni se abrirán más PR de búsqueda de enlaces.** Los cuatro paquetes están en `NEEDS_SOURCE_BYTES` hasta recibir un archivo íntegro por la ruta de abajo.

> Nada de lo que produce este procedimiento es verificado, autoritativo ni vigente. Importar no otorga autoridad; V4/V5 solo los da el CLO con cotejo documental. Cero escrituras a Supabase.

## 0. Qué prueba y qué NO prueba el SHA-256
El `bytes_sha256` demuestra la **integridad de los bytes recibidos**: que el archivo que se procesó es el mismo que se hasheó y que no cambió después. **No demuestra la autenticidad jurídica de la publicación**: un PDF íntegro puede ser una copia no oficial, otra edición, un texto desactualizado o un documento mal identificado. La autenticidad la decide el cotejo humano contra la fuente oficial (La Gaceta, F1). Por eso un archivo recibido nunca se presenta como verificado.

## 1. Quién descarga y cómo entregar
Una persona (el propietario) o un entorno autorizado descarga **cada PDF desde su URL institucional** en un navegador y lo entrega por **una** de estas rutas (no por intermediarios no confiables):

| Ruta | Pasos |
|---|---|
| **A. Drive (preferida)** | Subir el PDF a una carpeta de Drive compartida con la cuenta de Claude. Indicar: paquete (`HN-001-A0N`), URL exacta de descarga, fecha/hora y quién lo descargó. |
| **B. PR con los archivos** | Colocar el PDF en `docs/corpus/inbox/<lote>/files/` más un `SHA256SUMS` calculado en el equipo que descargó. |

**Hash de contraste:** `sha256sum archivo.pdf` (Linux/macOS) o `Get-FileHash .\archivo.pdf -Algorithm SHA256` (Windows). Si el hash calculado aquí difiere del suyo, el archivo se descarta.

## 2. Un comando por documento
```sh
npx tsx tools/corpus/receive-pdf.ts <archivo.pdf> --paquete HN-001-A01 \
  --url "<URL exacta de descarga>" --retriever "<quién lo descargó>" \
  --fecha 2026-11-05T14:00:00Z --metodo MANUAL_BROWSER --lote 2026-11-hn-001-tranche-a \
  [--max-mb 200] [--paginas DESDE-HASTA] [--revisado "<motivo de la revisión documental humana>"]
```

### Estados (describen el punto del trámite, no la validez del documento)
| Estado | Significa | Salida |
|---|---|---|
| `INPUT_REJECTED` | El archivo no se aceptó: no es PDF (p. ej. HTML guardado), descarga cortada (sin `%%EOF`), ilegible, cifrado, demasiado grande, enlace simbólico, escaneo sin texto, o el receptor rechazó el paquete. No se escribe paquete. | 1 |
| `RECEIVED` | Se recibió y se hasheó, pero **no avanzó**: exige revisión documental humana (ver §3) o falló el receptor. El paquete queda en `inbox/<lote>/pending-review/` y el receptor **no** se ejecuta. **Recibido ≠ verificado.** | 5 |
| `SOURCE_HOLD` | Procesado por el receptor, pero el dominio de origen no está verificado en el registro. No llega al CLO. | 3 |
| `QA_FAILED` | Procesado; falló un chequeo BLOCKER de calidad (p. ej. sin artículos). No llega al CLO. | 4 |
| `CLO_PENDING` | Fuente validada + QA sin bloqueos: listo para que el CLO lo adjudique. **Sigue sin ser V4/V5 ni vigente.** | 0 |

Cada intento deja un recibo nuevo en `docs/corpus/staging/<lote>/receipts/` (nunca se sobrescribe uno anterior).

## 3. Qué se comprueba, en orden (se detiene en el primer fallo de entrada)
1. **Argumentos y rutas:** paquete conocido, `--lote` solo `[A-Za-z0-9._-]` (sin `/`, `\` ni `..`), URL https, fecha ISO no futura. Todo lo escrito queda bajo `docs/corpus/`; si un directorio existente es un enlace que sale de allí, se rechaza **antes** de crear nada.
2. **Tamaño y archivo:** archivo regular (no enlace simbólico), no vacío, hasta `--max-mb` (200 por defecto, tope 500).
3. **Integridad:** empieza por `%PDF-`, termina en `%%EOF`, `pdfinfo` lo abre, no está cifrado. **SHA-256 de los bytes.**
4. **Texto íntegro** con `pdftotext`, sin editar. Menos de 300 caracteres por página en promedio = probable escaneo: se rechaza (no se hace OCR ni se inventa texto).
5. **Control por página** (el promedio global no garantiza una extracción íntegra): páginas de texto = páginas del PDF; páginas vacías (< 20 caracteres); rachas de páginas con texto muy corto frente a la mediana; codificación dañada (`U+FFFD`, `(cid:)`); errores del lector PDF. Una página corta aislada es solo aviso.
6. **Huella del ejemplar:** A01 = 419 págs. y A02 = 17 págs. son la huella del ejemplar que vio un tercero. **Una diferencia no declara inválido el documento** (puede ser otra edición oficial): bloquea la aceptación automática y lo deja `RECEIVED` para revisión.
7. **Identidad normativa** (no basta una palabra ni un número aislados): título en el encabezado + número del instrumento + contexto documental mínimo + discrepancias. Es `AMBIGUA` si el encabezado menciona otro instrumento u otros decretos distintos del propio (en reformas y consolidados se permiten los que cita legítimamente); `NO_CONFIRMADA` si falta título, número o contexto.
8. Si 5, 6 o 7 señalan algo → `RECEIVED` (revisión humana). Si no: **paquete** `OfficialSourcePackage` (decreto y Gaceta solo si constan en el texto del PDF; si no, `UNKNOWN`; `source_tier = null`, `verification_state = UNVERIFIED`) y **receptor offline**: validación, segmentación por artículos, QA, candidato y hoja del CLO.
9. **Errores del receptor:** si falla o no genera candidato, queda `RECEIVED` y **no** se copia nada al inbox. El paquete se procesa desde una copia temporal y solo se copia al inbox si el receptor termina bien. Un paquete distinto con el mismo nombre en el inbox **no se sobrescribe** (usar otro `--lote`).

### PDF que reproduce varios actos (p. ej. una edición de La Gaceta)
Con `--paginas DESDE-HASTA` una persona fija el rango pertinente (por ejemplo, las páginas del Decreto 35-2013 dentro de La Gaceta 33,222). Solo ese extracto se identifica, se analiza por página y se segmenta; el `bytes_sha256` sigue siendo el del archivo completo, el `text_sha256` el del extracto, y el recibo registra el rango. Un extracto **siempre** queda `RECEIVED` hasta que una persona coteja el rango y repite el comando con `--revisado`. La huella de páginas del PDF completo no se aplica a un extracto.

### Cuando un humano ya revisó un `RECEIVED`
Repetir el mismo comando con `--revisado "<motivo>"` (mínimo 10 caracteres: qué se cotejó y contra qué). Levanta **solo** los bloqueos de revisión (6, 7 y 5); nunca los rechazos de entrada. El recibo registra la revisión declarada. Sigue sin ser V4/V5.

Requisitos: `pdfinfo` y `pdftotext` (poppler-utils). Sin red, sin Supabase, sin dependencias npm nuevas.

**CI:** el job de pruebas instala y verifica Poppler y corre con `REQUIRE_POPPLER=1`: las pruebas con PDF real son obligatorias y, si falta Poppler, **fallan** (no se omiten en silencio).

## 4. Orden y proceso por documento
Cada documento se procesa **por separado y en cuanto llegue**. Prioridad: **1) A01 Código de Comercio** (BCH, 419 págs.), **2) A02 Decreto 284-2013** (SDE, 17 págs.), 3) A03 Código de la Niñez (CEDIJ), 4) A04 Decreto 35-2013. `SOURCE_HOLD` es lo esperable para `bch.hn`, `sde.gob.hn` y `se.gob.hn` mientras sus dominios no estén verificados; el dominio CEDIJ ya lo está (tier 2).

## 5. Qué se registrará, y solo desde el texto comprobado
- **A02 → Código de Comercio:** artículos que el Decreto 284-2013 reforma o deroga, leídos del propio texto (hoy solo hay una lista **declarada** de 12).
- **A04 → Niñez/Familia:** relaciones que establece el Decreto 35-2013 con los códigos que toque.
- No se sustituyen versiones históricas por una consolidación no verificada.

## 6. Riesgos residuales (conocidos)
- Los patrones de identidad se escribieron **sin ver** los PDF reales; un texto legítimo con otro formato de encabezado caerá en `RECEIVED` (revisión), no se rechazará. Se afinan con el primer archivo real.
- Un PDF íntegro y con identidad confirmada puede seguir siendo una copia no oficial: el SHA-256 no lo detecta (§0).
- Las páginas en blanco intencionales aparecen como «sin texto» y exigen revisión.
- Un PDF escaneado no se procesa (no hay OCR); habría que obtener la versión con texto o decidir un OCR aparte.
- La extracción no distingue columnas ni notas al pie con el orden jurídico correcto: la segmentación por artículos puede necesitar QA humano.

## 7. Lo que sigue en manos humanas
Decisiones del CLO para V4/V5 (fecha del Código de Comercio, F1 vs F2, verificación de los dominios, vigencia y entrada en vigor, reformas posteriores). Cargar a Supabase requiere una migración revisada y autorización expresa de Fredy; este procedimiento **no** lo hace.

---

## English summary (American English)

Downloads from the cloud proxy are closed out. The owner (or an authorized environment) downloads each PDF in a browser and delivers it through Drive (preferred) or a reviewed PR with a `SHA256SUMS`. One command per file, `tools/corpus/receive-pdf.ts`, reports one of five states that describe where the file is in the process, never whether it is valid: `INPUT_REJECTED` (not a real or complete PDF, too large, scanned, symlink, or rejected by the receiver), `RECEIVED` (hashed but held for human documentary review; the receiver is not run), `SOURCE_HOLD` (domain not verified), `QA_FAILED`, and `CLO_PENDING` (ready for the CLO, still not V4/V5 or in force). The page counts (419 and 17) are *fingerprints of one identified copy*: a mismatch blocks automatic acceptance and queues review, it does not declare other official editions invalid. Identity needs title, number, document context and no conflicting signals. Extraction is checked page by page (missing, empty, truncated, or garbled pages), not just by a global average. The SHA-256 proves the integrity of the bytes received, **not** the legal authenticity of the publication. Inputs are size-limited, paths are confined to `docs/corpus`, nothing is overwritten, and receiver failures leave nothing in the inbox. Nothing here touches Supabase or promotes anything to V4/V5.

**English tip:** *integrity* means "unchanged"; *authenticity* means "genuine." A hash can prove the first but never the second.
