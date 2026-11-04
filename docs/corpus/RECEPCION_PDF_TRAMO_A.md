# Procedimiento único de recepción de PDF · Tramo A (HN-001)

**Estado del bloqueo (cerrado, no se repite).** El proxy del entorno cloud impide la descarga: `CONNECT … 403` desde el shell y `ENOTFOUND` desde la herramienta web, para los hosts `.gob.hn`, `bch.hn`, `sde.gob.hn` y `wipo.int` (ver el historial en PR #119). **No se volverán a intentar descargas desde ese proxy ni se abrirán más PR de búsqueda de enlaces.** Los cuatro paquetes están en `NEEDS_SOURCE_BYTES` hasta recibir un archivo íntegro por la ruta de abajo.

> Nada de lo que produce este procedimiento es verificado, autoritativo ni vigente. Importar no otorga autoridad; V4/V5 solo los da el CLO con cotejo documental. Cero escrituras a Supabase.

## 1. Quién descarga y cómo entregar
Una persona (el propietario) o un entorno autorizado descarga **cada PDF desde su URL institucional** en un navegador y lo entrega por **una** de estas rutas (no por intermediarios no confiables):

| Ruta | Pasos |
|---|---|
| **A. Drive (preferida)** | Subir el PDF a una carpeta de Drive compartida con la cuenta de Claude. Indicar por mensaje: paquete (`HN-001-A0N`), URL exacta de donde se descargó, fecha/hora de descarga y quién lo descargó. |
| **B. PR con los archivos** | Colocar el PDF en `docs/corpus/inbox/<lote>/files/` más un `SHA256SUMS` calculado en el equipo que descargó. El PDF forma parte del cambio revisable. |

**Hash de contraste (recomendado en ambas rutas):** `sha256sum archivo.pdf` (Linux/macOS) o `Get-FileHash .\archivo.pdf -Algorithm SHA256` (Windows). Si el hash que yo calcule difiere del suyo, el archivo se descarta.

## 2. Qué se comprueba al recibir cada archivo (un comando por documento)
```sh
npx tsx tools/corpus/receive-pdf.ts <archivo.pdf> --paquete HN-001-A01 \
  --url "<URL exacta de descarga>" --retriever "<quién lo descargó>" \
  --fecha 2026-11-05T14:00:00Z --metodo MANUAL_BROWSER --lote 2026-11-hn-001-tranche-a
```
Se detiene en el primer fallo y deja un recibo en `docs/corpus/staging/<lote>/receipts/<paquete>.md`:

1. **Integridad:** existe, no vacío, empieza por `%PDF-` (descarta una página HTML guardada), abre con `pdfinfo`, no está cifrado.
2. **SHA-256 de los bytes** originales (`bytes_sha256`), calculado, nunca estimado.
3. **Páginas** (`pdfinfo`) contra las esperadas: A01 = 419 y A02 = 17 (observaciones de terceros; una diferencia detiene el proceso y decide el CLO). A03 y A04 sin páginas declaradas.
4. **Texto íntegro** con `pdftotext`, sin editar. Menos de 300 caracteres por página = probable escaneo: se detiene; **no se inventa texto ni se hace OCR aquí**.
5. **Identidad:** el texto debe contener las frases de identidad del paquete (A01 «comercio»; A02 «284-2013»; A03 «niñez» y «adolescencia»; A04 «35-2013»).
6. **SHA-256 del texto** (`text_sha256`) tal como se entrega en el paquete.
7. **Paquete** `OfficialSourcePackage` en `docs/corpus/inbox/<lote>/<paquete>.json`. Decreto y Gaceta se registran **solo si constan en el texto del PDF**; si no, `UNKNOWN`. `source_tier = null`, `verification_state = UNVERIFIED`.
8. **Receptor offline** (`process-batch`): validación de hash y dominio, segmentación por artículos, QA, candidato de staging y hoja del CLO.

Requisitos: `pdfinfo` y `pdftotext` (poppler-utils). Sin red, sin Supabase, sin dependencias nuevas.

## 3. Orden y proceso por documento
Cada documento se procesa **por separado y en cuanto llegue**, sin esperar a los demás. Prioridad: **1) A01 Código de Comercio** (BCH, 419 págs.), **2) A02 Decreto 284-2013** (SDE, 17 págs.), 3) A03 Código de la Niñez (CEDIJ), 4) A04 Decreto 35-2013.

Resultados posibles del receptor: `QA_FAILED` (corregir y reenviar), `SOURCE_HOLD` (el dominio no está verificado: `bch.hn`, `sde.gob.hn`, `se.gob.hn`), `SOURCE_VALIDATED`→`CLO_PENDING` (el dominio CEDIJ ya está verificado, tier 2).

## 4. Qué se registrará, y solo desde el texto comprobado
- **A02 → Código de Comercio:** artículos que el Decreto 284-2013 reforma o deroga, leídos del propio texto (hoy solo hay una lista **declarada** de 12; no se da por buena).
- **A04 → Niñez/Familia:** relaciones que establece el Decreto 35-2013 (reforma, derogación, adición) con los códigos que toque.
- No se sustituyen versiones históricas por una consolidación no verificada.

## 5. Lo que sigue en manos humanas
Decisiones del CLO para V4/V5 (fecha del Código de Comercio, F1 vs F2, verificación de los dominios, vigencia y entrada en vigor, reformas posteriores). Cargar a Supabase requiere una migración revisada y autorización expresa de Fredy; este procedimiento **no** lo hace.

---

## English summary (American English)

The environment proxy blocks downloads (403 on CONNECT from the shell, DNS failure from the web reader), so downloads will not be retried from it and no more link-hunting PRs will be opened. Instead, the owner (or an authorized environment) downloads each PDF in a browser from its institutional URL and delivers it through Drive (preferred) or a reviewed PR with a `SHA256SUMS`. One command per file, `tools/corpus/receive-pdf.ts`, then checks integrity (it really is a PDF, not saved HTML), computes the real SHA-256, compares the page count (Commerce Code 419, Decree 284-2013 17), extracts the full text (no OCR, no invented text), confirms identity from the text, hashes the text, builds the `OfficialSourcePackage`, and runs the offline receiver for segmentation, QA, candidate, and the CLO sheet. Decree and Gaceta numbers are recorded only if the PDF text contains them. Documents are processed one at a time, Commerce Code and Decree 284-2013 first. Nothing is verified, authoritative, or written to Supabase; V4/V5 stay with the CLO.

**English tip:** *to gate* means to stop something at a checkpoint until it passes. This procedure gates every file: it stops at the first failed check instead of passing a doubtful document along.
