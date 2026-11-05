# MayaLex A04 — transferencia documental offline

Estado: SOURCE_HOLD. **SOLO TRANSFERENCIA; NO MERGE.**

Procedencia: copia de Google Drive aportada por el propietario. La integridad SHA-256 no acredita autenticidad institucional, vigencia ni aprobación V4/V5.

Origen: La Gaceta No. 33,222, 6 de septiembre de 2013; Decreto No. 35-2013 (páginas A.1–A.46, únicamente columna izquierda en página 46). La columna derecha de la última página inicia el Decreto No. 107-2013 y debe excluirse.

Se incluyen nueve bloques binarios sin modificación, `MANIFEST_A04.json` y `reconstruir_A04.py`.

Instrucciones:
1. Clonar esta rama aislada o descargar estos 11 archivos, colocándolos en la misma carpeta.
2. Ejecutar `python3 reconstruir_A04.py`. El script rechaza partes incompletas o alteradas.
3. Verificar independientemente tamaño **18,625,608 bytes** y SHA-256 `fbd87f3396e5d0b6601a246008a1ae5bd870841b795d75ac42076245a154f2ff`.
4. Solo tras verificar, ejecutar el receptor offline A04 del PR #121, con delimitación de columnas y control de QA; completar matriz interinstrumental para revisión por el CLO.
5. No tocar Supabase, producción, Luna, las migraciones ni las banderas V4/V5. Mantener PR #120 y #121 en borrador, sin merge.
