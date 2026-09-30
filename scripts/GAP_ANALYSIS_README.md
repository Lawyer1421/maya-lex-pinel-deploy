# GAP ANALYSIS — Script Seguro con Identity Lock

## Flujo

1. **Tú ejecutas** `gap-analysis-local.py` en tu máquina local
   - Lee credenciales SOLO desde `.env.local`
   - Verifica que estés conectado a `thgrhueckkjdutjvcufp` (identity lock)
   - Ejecuta 4 queries SELECT (A/B/C/D)
   - Escribe resultados JSON a `docs/corpus/_local/gap-results.json` (gitignored)
   - Tarda ~10-30s

2. **Claude genera** `MAYALEX_CORPUS_GAP_ANALYSIS.md|.json`
   - Lee el JSON local (sin credenciales)
   - Genera análisis narrativo + matriz de cobertura
   - Commitealo en `feature/corpus-inventory-v2`
   - Pushea a origin

## Cómo ejecutar

### Requisitos
- Python 3.8+
- `psycopg2` (conexión PostgreSQL)
- `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Acceso de lectura a `biblioteca_vectores` en `thgrhueckkjdutjvcufp`

### Instalar dependencias (una sola vez)
```bash
pip install python-dotenv psycopg2-binary
```

### Ejecutar
```bash
cd C:\Users\fredy\maya-lex-pinel-deploy
python scripts/gap-analysis-local.py
```

### Salida esperada
```
✅ Identity confirmed: thgrhueckkjdutjvcufp
✅ Connected to thgrhueckkjdutjvcufp
📋 SECCIÓN A: Confirmación de esquema...
   ✅ XX columnas encontradas
📊 SECCIÓN B: Inventario físico (fuente)...
   ✅ XX fuentes, YYYY filas totales
📈 SECCIÓN C: Agregados...
   ✅ XX rows
🚩 SECCIÓN C: Revisión pendiente...
   ✅ X flagged
🔍 SECCIÓN D: Análisis de duplicados...
   ✅ X fuentes con duplicados
✅ Resultados guardados en docs/corpus/_local/gap-results.json
   NO COMMIT: archivo está en .gitignore
```

## Seguridad

✅ **Credenciales nunca inlineadas en código**
- `.env.local` cargado en runtime via `python-dotenv`
- No aparece en el repo ni en chat

✅ **Identity lock**
- Script verifica `project_ref == thgrhueckkjdutjvcufp`
- Falla si intenta conectarse a otro proyecto

✅ **Solo lectura**
- 4 queries SELECT/WITH
- No INSERT/UPDATE/DELETE/ALTER

✅ **Resultados gitignored**
- `docs/corpus/_local/` está en `.gitignore`
- JSON nunca se commitealo

## Próximo paso

Cuando el JSON esté en `docs/corpus/_local/gap-results.json`:
- Claude lo lee
- Genera `MAYALEX_CORPUS_GAP_ANALYSIS.md|.json` con análisis
- Commitealo y pushea a feature/corpus-inventory-v2
