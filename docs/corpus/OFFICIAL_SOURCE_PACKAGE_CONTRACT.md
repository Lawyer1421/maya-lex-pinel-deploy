# Contrato de paquete de fuente oficial (OfficialSourcePackage)

Este entorno de ejecución no alcanza los sitios oficiales hondureños (`.gob.hn`). Este contrato permite que una **persona o ChatGPT investigue fuera** y entregue el material en un paquete verificable. **Importar no otorga autoridad.**

```
EXTERNAL DISCOVERY → PACKAGE → HASH VALIDATION → SOURCE VALIDATION → CORPUS QA → CLO → V4/V5
```

Las dos primeras etapas son de quien investiga; las siguientes las ejecuta el importador (validación automática) y personas (CORPUS_QA, CLO, V4/V5). Un agente nunca aprueba V4/V5/AVAILABLE.

## Campos (un archivo JSON por documento)

| Campo | Regla |
|---|---|
| `source_url` | https; URL real de donde se obtuvo el documento |
| `source_domain` | exactamente el host de `source_url` |
| `retrieved_at` | fecha/hora ISO real de la consulta; no puede estar en el futuro |
| `document_name` | nombre del documento tal como figura en la fuente |
| `document_type` | `LAW`, `DECREE`, `CODE`, `REGULATION`, `REFORM`, `JUDGMENT`, `TREATY`, `OTHER` |
| `decree`, `gaceta`, `gaceta_date` | solo si el documento los dice; si no, `"UNKNOWN"` (nunca se infieren) |
| `bytes_sha256` | SHA-256 del archivo original descargado (PDF) |
| `text_sha256` | SHA-256 de `extracted_text` en UTF-8, **exactamente como se entrega** |
| `extracted_text` | texto extraído, sin editar |
| `retrieval_method` | `MANUAL_BROWSER`, `CURL`, `API`, `OTHER` |
| `source_tier` | `null` salvo que el dominio esté verificado en el registro; nunca mayor al que el registro concede |
| `retriever` | quién lo obtuvo (`human`, `chatgpt-research`, `claude`) |
| `verification_state` | solo `UNVERIFIED` o `PENDING_VERIFICATION`; un paquete no se autoverifica |

## Cómo calcular los hashes

```sh
sha256sum documento.pdf                       # bytes_sha256
node -e "const c=require('crypto'),fs=require('fs');console.log(c.createHash('sha256').update(fs.readFileSync('texto.txt','utf8'),'utf8').digest('hex'))"   # text_sha256
```

`text_sha256` debe corresponder al mismo texto que va en `extracted_text`; cualquier cambio de un carácter (espacios, saltos de línea) invalida el hash.

## Resultado de la validación

- `REJECTED`: hash que no coincide, dominio ≠ URL, URL no https, fuente privada (p. ej. `lagaceta.hn` es un medio de noticias, no el Diario Oficial), tier mayor al concedido, fecha futura, texto vacío o demasiado corto, o verificación autoasignada.
- `DISCOVERED_UNVERIFIED`: dominio desconocido o no verificado. Se acepta como **descubrimiento**; la URL no se registra como oficial.
- `SOURCE_VALIDATED`: dominio verificado en `docs/retrieval/official-source-registry.json`. **Sigue sin ser autoridad.**

El dominio oficial de La Gaceta no está verificado (`domain: null`): un paquete con un dominio de La Gaceta será `DISCOVERED_UNVERIFIED` hasta que alguien verifique el dominio y lo registre.

## Uso

```sh
npx tsx tools/corpus/import-official-source-package.ts ruta/al/paquete.json --out docs/corpus/imports
```

Escribe `records.json` (historial append-only; un `text_sha256` nuevo del mismo documento crea una versión nueva, un duplicado exacto se descarta) e `IMPORT_REPORT.{json,md}`. Una sentencia (`JUDGMENT`) se convierte en registro de jurisprudencia con `precedential_status` y `public_private_status` en `UNKNOWN` (no indexable). El importador no hace red ni toca bases de datos. Ejemplo ficticio: `tools/corpus/examples/synthetic-package.json` (`example.invalid`).
