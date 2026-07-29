---
name: mayalex-corpus-ingest
description: Ingesta de una norma jurídica oficial hondureña al staging de Maya Lex siguiendo el pipeline de 15 pasos con procedencia, hash y estados V0–V5. Usar para cada documento del corpus.
---
# Ingesta oficial (por documento)
1. DISCOVER: localiza la fuente en SOURCE_REGISTRY.yaml (solo autoridades oficiales). Registra V0.
2. DOWNLOAD: descarga a corpus-data/raw/ (fuera del bundle público). Nunca desde blogs/copias anónimas.
3. HASH: SHA-256 → source record (scripts/corpus/registrar-fuente.mjs).
4. SOURCE RECORD: título, decreto, fecha, Gaceta, autoridad, URL, fecha de adquisición, formato, páginas. Registra V1.
5. EXTRACT→STRUCTURE→ARTICLE SPLIT: texto por artículo a JSONL en corpus-data/estructurado/.
6. METADATA + DUPLICATE CHECK (hash por artículo) + REFORM CHECK (buscar reformas en el registro).
7. VALIDITY REPORT: informe técnico de vigencia. Registra V2 ("Texto oficial extraído — vigencia pendiente de consolidación").
8. STAGING: cargar SOLO al proyecto Supabase de staging (aicak…lkqj) vía scripts/corpus/cargar-staging.mjs.
9. EMBEDDINGS + RETRIEVAL TEST + prueba de citas (verify-citations.mjs).
10. EDITORIAL STATE: V3 requiere análisis de vigencia; V4/V5 requieren revisión humana registrada — nunca automática.
Prohibido: publicar sin procedencia, tocar producción, incluir texto sin fuente, dejar pasar PII/nombres anonimizados/material privado (correr privacy-scan).
