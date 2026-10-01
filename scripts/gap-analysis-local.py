#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
H1-H5 HYGIENE & IDENTITY QUERY RUNNER
Executes read-only queries against MayaLex production (thgrhueckkjdutjvcufp).
Writes results to docs/corpus/_local/hygiene-identity-results.json (gitignored).

Usage:
  python scripts/gap-analysis-local.py --dry-run    # Static validation only
  python scripts/gap-analysis-local.py              # Execute against production

Safety gates:
- Identity lock: project_ref == thgrhueckkjdutjvcufp only
- SQL source: reads from docs/corpus/hygiene-identity-queries.sql
- Static gate: rejects INSERT/UPDATE/DELETE/ALTER/CREATE/DROP/TRUNCATE/contenido
- Session: SET TRANSACTION READ ONLY before execution
- No credentials in output or logs
"""

import os
import sys
import json
import hashlib
import re
import psycopg2
from psycopg2.extras import RealDictCursor
from pathlib import Path
from datetime import datetime, timezone
from dotenv import load_dotenv

# ============================================================================
# CONFIGURATION & PATHS
# ============================================================================

REQUIRED_PROJECT = "thgrhueckkjdutjvcufp"
SQL_SOURCE_FILE = Path(__file__).parent.parent / "docs" / "corpus" / "hygiene-identity-queries.sql"
OUTPUT_DIR = Path(__file__).parent.parent / "docs" / "corpus" / "_local"
OUTPUT_FILE = OUTPUT_DIR / "hygiene-identity-results.json"
ROOT_GITIGNORE = Path(__file__).parent.parent / ".gitignore"

EXPECTED_QUERIES = {
    "H1": "fuente=NULL DISTRIBUTION",
    "H2": "doc_* INVENTORY",
    "H3_1": "Codigo Procesal Civil",
    "H3_2": "CPC_TEXTO_BASE_D211-2006",
    "H3_3": "CPC_COMENTADO_ROMERO_2024",
    "H3_4": "Repeated num_articulo count per CPC layer",
    "H4": "NOTARIADO RECONCILIATION",
    "H5": "DECREE / ALIAS DISCOVERY",
    "H5_SOURCE_INVENTORY": "Full source inventory"
}

# ============================================================================
# GLOBAL STATE
# ============================================================================

conn = None
cursor = None

def cleanup():
    """Ensure all resources are properly closed."""
    global conn, cursor
    if cursor:
        try:
            cursor.close()
        except:
            pass
    if conn:
        try:
            conn.rollback()
            conn.close()
        except:
            pass

# ============================================================================
# STEP 1: LOAD ENV
# ============================================================================

env_path = Path(__file__).parent.parent / ".env.local"
if not env_path.exists():
    print(f"[ERROR] .env.local not found at {env_path}")
    exit(1)

load_dotenv(env_path)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
SUPABASE_DB_PASSWORD = os.getenv("SUPABASE_DB_PASSWORD", "")

if not SUPABASE_URL:
    print("[ERROR] NEXT_PUBLIC_SUPABASE_URL not defined in .env.local")
    exit(1)

# ============================================================================
# STEP 2: IDENTITY LOCK
# ============================================================================

project_ref = SUPABASE_URL.split("https://")[1].split(".supabase.co")[0] if "https://" in SUPABASE_URL else ""

if project_ref != REQUIRED_PROJECT:
    print(f"[ERROR] IDENTITY LOCK FAILED")
    print(f"   Expected: {REQUIRED_PROJECT}")
    print(f"   Got: {project_ref}")
    exit(1)

print(f"[OK] Identity confirmed: {project_ref}")

# ============================================================================
# STEP 3: READ SQL SOURCE
# ============================================================================

if not SQL_SOURCE_FILE.exists():
    print(f"[ERROR] SQL source file not found: {SQL_SOURCE_FILE}")
    exit(1)

with open(SQL_SOURCE_FILE, "r", encoding="utf-8") as f:
    sql_source = f.read()

sql_sha256 = hashlib.sha256(sql_source.encode()).hexdigest()
print(f"[OK] SQL source loaded: {SQL_SOURCE_FILE.name} (SHA256: {sql_sha256[:16]}...)")

# ============================================================================
# STEP 4: STATIC SQL SAFETY GATE
# ============================================================================

def strip_sql_comments(sql: str) -> str:
    """Remove SQL comments (-- single-line and /* */ multi-line)."""
    sql = re.sub(r'--.*?$', '', sql, flags=re.MULTILINE)
    sql = re.sub(r'/\*.*?\*/', '', sql, flags=re.DOTALL)
    return sql

def validate_sql_safety(sql: str) -> tuple[bool, str]:
    """Validate SQL for forbidden operations."""
    sql_clean = strip_sql_comments(sql)

    forbidden_patterns = [
        r'\bINSERT\b', r'\bUPDATE\b', r'\bDELETE\b', r'\bUPSERT\b',
        r'\bMERGE\b', r'\bALTER\b', r'\bCREATE\b', r'\bDROP\b',
        r'\bTRUNCATE\b', r'\bGRANT\b', r'\bREVOKE\b', r'\bCALL\b',
        r'\bDO\b', r'\bCOPY\b', r'\bVACUUM\b', r'\bANALYZE\b',
        r'\bREFRESH\b', r'\bREINDEX\b', r'\bCLUSTER\b'
    ]

    for pattern in forbidden_patterns:
        if re.search(pattern, sql_clean, re.IGNORECASE):
            return False, f"Forbidden operation detected: {pattern}"

    if re.search(r'\bcontenido\b', sql_clean, re.IGNORECASE):
        return False, "contenido reference detected in executable SQL"

    statements = re.split(r';\s*', sql_clean)
    for stmt in statements:
        stmt = stmt.strip()
        if not stmt:
            continue
        first_word = re.match(r'^\s*(\w+)', stmt, re.IGNORECASE)
        if first_word:
            word = first_word.group(1).upper()
            if word not in ('SELECT', 'WITH'):
                return False, f"Non-SELECT/WITH top-level statement detected: {word}"

    return True, "OK"

is_safe, safety_msg = validate_sql_safety(sql_source)
if not is_safe:
    print(f"[ERROR] Static SQL safety gate FAILED: {safety_msg}")
    exit(1)

print(f"[OK] Static SQL safety gate PASSED: {safety_msg}")

# ============================================================================
# STEP 5: QUERY SPLITTER & LABEL ASSIGNMENT
# ============================================================================

def split_queries(sql: str) -> list[tuple[str, str]]:
    """
    Split SQL source into labeled queries.
    Strategy: Find all executable queries (SELECT/WITH) and map each to its nearest preceding label.
    """
    queries = []
    last_label = None
    query_count_per_label = {}

    lines = sql.split('\n')
    i = 0

    while i < len(lines):
        line = lines[i]

        label_match = re.match(r'^\s*--\s*(H\d(?:[._]\d)?)\s', line, re.IGNORECASE)
        if label_match:
            raw_label = label_match.group(1).upper()
            last_label = raw_label.replace('.', '_')

        if re.match(r'^\s*(SELECT|WITH)\b', line, re.IGNORECASE) and last_label:
            query_lines = []
            while i < len(lines):
                query_lines.append(lines[i])
                if ';' in lines[i]:
                    break
                i += 1

            query_text = '\n'.join(query_lines).strip()

            if last_label in query_count_per_label:
                if last_label == 'H5':
                    query_label = 'H5_SOURCE_INVENTORY'
                else:
                    query_label = last_label
            else:
                query_label = last_label
                query_count_per_label[last_label] = 0

            query_count_per_label[last_label] += 1
            queries.append((query_label, query_text))

        i += 1

    return queries

queries = split_queries(sql_source)
query_count = len(queries)

print(f"\n[RESULTS] Query splitter results:")
print(f"   Found {query_count} labeled queries:")
for label, _ in queries:
    print(f"   - {label}")

if query_count != len(EXPECTED_QUERIES):
    print(f"[ERROR] Query count mismatch: expected {len(EXPECTED_QUERIES)}, got {query_count}")
    exit(1)

observed_labels = [label for label, _ in queries]
expected_labels = list(EXPECTED_QUERIES.keys())
if observed_labels != expected_labels:
    print(f"[ERROR] Query label mismatch:")
    print(f"   Expected: {expected_labels}")
    print(f"   Got: {observed_labels}")
    exit(1)

print(f"[OK] Query count and labels validated")

# ============================================================================
# STEP 6: FIX ROOT GITIGNORE CHECK
# ============================================================================

if not ROOT_GITIGNORE.exists():
    print(f"[ERROR] Root .gitignore not found at {ROOT_GITIGNORE}")
    exit(1)

with open(ROOT_GITIGNORE, "r", encoding="utf-8") as f:
    gitignore_content = f.read()

if "docs/corpus/_local/" not in gitignore_content:
    print(f"[ERROR] Output path 'docs/corpus/_local/' not found in .gitignore")
    exit(1)

print(f"[OK] Output path is gitignored")

# ============================================================================
# STEP 7: CHECK DRY-RUN MODE
# ============================================================================

dry_run_mode = "--dry-run" in sys.argv

if dry_run_mode:
    print(f"\n[NOTE] DRY-RUN MODE: Static validation only (no DB connection)")
    print(f"[OK] All static gates passed. Ready for production execution.")
    exit(0)

# ============================================================================
# STEP 8: REQUIRE DB PASSWORD FOR REAL EXECUTION
# ============================================================================

if not SUPABASE_DB_PASSWORD:
    print("[ERROR] SUPABASE_DB_PASSWORD not defined in .env.local")
    print("[ERROR] Required for production execution (not in --dry-run mode)")
    exit(1)

# ============================================================================
# STEP 9: REAL DB CONNECTION
# ============================================================================

print(f"\n[INFO] Connecting to {project_ref}...")

try:
    conn = psycopg2.connect(
        host=f"db.{project_ref}.supabase.co",
        port=5432,
        database="postgres",
        user="postgres",
        password=SUPABASE_DB_PASSWORD,
        sslmode="require",
        connect_timeout=10
    )
    print(f"[OK] Connected to PostgreSQL")
except Exception as e:
    print(f"[ERROR] Database connection failed: {str(e)[:100]}")
    cleanup()
    exit(1)

# ============================================================================
# STEP 10: ENFORCE READ-ONLY SESSION
# ============================================================================

try:
    conn.set_session(readonly=True, autocommit=False)
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    cursor.execute("SHOW transaction_read_only;")
    result = cursor.fetchone()

    if not result or result[0] != 'on':
        print(f"[ERROR] transaction_read_only not enforced. Got: {result}")
        cleanup()
        exit(1)

    print(f"[OK] Read-only session enforced and verified")
except Exception as e:
    print(f"[ERROR] Failed to enforce read-only: {str(e)[:100]}")
    cleanup()
    exit(1)

# ============================================================================
# STEP 11: EXECUTE H1-H5 QUERIES
# ============================================================================

results = {}
executed_labels = []

for label, query_text in queries:
    try:
        print(f"[INFO] Executing {label}...", end=" ", flush=True)
        cursor.execute(query_text)
        rows = cursor.fetchall()
        results[label] = [dict(row) for row in rows]
        executed_labels.append(label)
        print(f"[OK] ({len(rows)} rows)")
    except Exception as e:
        print(f"[ERROR] Query failed: {str(e)[:100]}")
        print(f"[ERROR] Rollback and exit without writing partial output")
        cleanup()
        exit(1)

print(f"\n[OK] All {len(executed_labels)} queries executed successfully")

# ============================================================================
# STEP 12: WRITE OUTPUT ONLY AFTER ALL SUCCESS
# ============================================================================

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

output_structure = {
    "project_ref": project_ref,
    "transaction_read_only": True,
    "source_sql_file": str(SQL_SOURCE_FILE.relative_to(Path(__file__).parent.parent)),
    "source_sql_sha256": sql_sha256,
    "executed_at": datetime.now(timezone.utc).isoformat(),
    "query_count": len(results),
    "query_labels": list(results.keys()),
    "results": results
}

try:
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output_structure, f, indent=2, default=str)
    print(f"[OK] Results written to {OUTPUT_FILE}")
except Exception as e:
    print(f"[ERROR] Failed to write output: {str(e)[:100]}")
    cleanup()
    exit(1)

# ============================================================================
# STEP 13: CLEANUP
# ============================================================================

cleanup()
print(f"[OK] All operations completed successfully")
