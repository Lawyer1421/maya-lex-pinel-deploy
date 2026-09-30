#!/usr/bin/env python3

"""
GAP ANALYSIS: 13 instrumentos canónicos vs biblioteca_vectores
Lee credenciales SOLO desde .env.local (nunca inlineadas).
Identity lock: thgrhueckkjdutjvcufp únicamente.
"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

# Load .env.local (credenciales nunca en código)
env_path = Path(__file__).parent.parent / ".env.local"
if not env_path.exists():
    print(f"❌ .env.local no encontrado en {env_path}")
    exit(1)

load_dotenv(env_path)

# Extract Supabase credentials
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("❌ NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no definido en .env.local")
    exit(1)

# Extract project_ref from URL (identity lock)
project_ref = SUPABASE_URL.split("https://")[1].split(".supabase.co")[0] if "https://" in SUPABASE_URL else ""
REQUIRED_PROJECT = "thgrhueckkjdutjvcufp"

if project_ref != REQUIRED_PROJECT:
    print(f"❌ IDENTITY LOCK FAILED")
    print(f"   Expected: {REQUIRED_PROJECT}")
    print(f"   Got: {project_ref}")
    exit(1)

print(f"✅ Identity confirmed: {project_ref}")

# Connect to Supabase PostgreSQL
try:
    conn = psycopg2.connect(
        host=f"{project_ref}.supabase.co",
        port=5432,
        database="postgres",
        user="postgres",
        password=os.getenv("SUPABASE_DB_PASSWORD", ""),
        sslmode="require"
    )
    cur = conn.cursor(cursor_factory=RealDictCursor)
except Exception as e:
    print(f"❌ Connection failed: {e}")
    exit(1)

print("✅ Connected to thgrhueckkjdutjvcufp")

results = {}

# SECCIÓN A: Confirmar columnas reales
print("\n📋 SECCIÓN A: Confirmación de esquema...")
try:
    cur.execute("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'biblioteca_vectores'
        ORDER BY ordinal_position
    """)
    results["section_a_columns"] = [dict(row) for row in cur.fetchall()]
    print(f"   ✅ {len(results['section_a_columns'])} columnas encontradas")
except Exception as e:
    print(f"   ❌ Error: {e}")
    results["section_a_columns"] = None

# SECCIÓN B: Inventario físico real
print("\n📊 SECCIÓN B: Inventario físico (fuente)...")
try:
    cur.execute("""
        SELECT
          fuente,
          COUNT(*) AS filas,
          COUNT(DISTINCT num_articulo) AS articulos_distintos
        FROM biblioteca_vectores
        GROUP BY fuente
        ORDER BY filas DESC
    """)
    results["section_b_inventory"] = [dict(row) for row in cur.fetchall()]
    total_b = sum(row["filas"] for row in results["section_b_inventory"])
    print(f"   ✅ {len(results['section_b_inventory'])} fuentes, {total_b} filas totales")
except Exception as e:
    print(f"   ❌ Error: {e}")
    results["section_b_inventory"] = None

# SECCIÓN C: Agregados (materia + vigencia)
print("\n📈 SECCIÓN C: Agregados (materia/vigencia)...")
try:
    cur.execute("""
        SELECT
          materia,
          es_norma_vigente,
          COUNT(*) AS filas
        FROM biblioteca_vectores
        GROUP BY materia, es_norma_vigente
        ORDER BY materia, es_norma_vigente
    """)
    results["section_c_materia_vigencia"] = [dict(row) for row in cur.fetchall()]
    print(f"   ✅ {len(results['section_c_materia_vigencia'])} rows")
except Exception as e:
    print(f"   ❌ Error: {e}")
    results["section_c_materia_vigencia"] = None

# SECCIÓN C: revision_pendiente
print("\n🚩 SECCIÓN C: Revisión pendiente...")
try:
    cur.execute("""
        SELECT COUNT(*) AS revision_pendiente_total
        FROM biblioteca_vectores
        WHERE revision_pendiente = true
    """)
    row = cur.fetchone()
    results["section_c_revision_pendiente"] = dict(row) if row else {"revision_pendiente_total": 0}
    print(f"   ✅ {results['section_c_revision_pendiente']['revision_pendiente_total']} flagged")
except Exception as e:
    print(f"   ❌ Error: {e}")
    results["section_c_revision_pendiente"] = None

# SECCIÓN D: Duplicados
print("\n🔍 SECCIÓN D: Análisis de duplicados...")
try:
    cur.execute("""
        WITH article_counts AS (
          SELECT
            fuente,
            num_articulo,
            COUNT(*) AS occurrences
          FROM biblioteca_vectores
          GROUP BY fuente, num_articulo
        )
        SELECT
          fuente,
          COUNT(*) AS duplicated_articles,
          MAX(occurrences) AS max_occurrences
        FROM article_counts
        WHERE occurrences > 1
        GROUP BY fuente
        ORDER BY fuente
    """)
    results["section_d_duplicates"] = [dict(row) for row in cur.fetchall()]
    print(f"   ✅ {len(results['section_d_duplicates'])} fuentes con duplicados")
except Exception as e:
    print(f"   ❌ Error: {e}")
    results["section_d_duplicates"] = None

conn.close()

# Write results to JSON (gitignored)
output_dir = Path(__file__).parent.parent / "docs" / "corpus" / "_local"
output_dir.mkdir(parents=True, exist_ok=True)
output_file = output_dir / "gap-results.json"

results["project_ref"] = project_ref
results["timestamp"] = str(Path(__file__).parent.parent / ".env.local").split("\\")[-1] # marker only

with open(output_file, "w") as f:
    json.dump(results, f, indent=2, default=str)

print(f"\n✅ Resultados guardados en {output_file}")
print(f"   NO COMMIT: archivo está en .gitignore")
print(f"   Próximo paso: Claude genera MAYALEX_CORPUS_GAP_ANALYSIS.md|.json desde este JSON")
