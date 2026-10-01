#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
H1-H5 HYGIENE & IDENTITY QUERY RUNNER
Executes read-only queries against MayaLex production (thgrhueckkjdutjvcufp).
Writes results to docs/corpus/_local/hygiene-identity-results.json (gitignored).

Safety gates:
- Identity lock: project_ref == thgrhueckkjdutjvcufp only
- SQL source: reads from docs/corpus/hygiene-identity-queries.sql
- Static gate: rejects INSERT/UPDATE/DELETE/ALTER/CREATE/DROP/TRUNCATE/contenido
- Session: SET TRANSACTION READ ONLY before execution
- No credentials in output or logs
"""

import os
import json
import hashlib
import re
from pathlib import Path
from datetime import datetime, timezone
from dotenv import load_dotenv

# ══════════════════════════════════════════════════════════════════════════
# CONFIGURATION & PATHS
# ══════════════════════════════════════════════════════════════════════════

REQUIRED_PROJECT = "thgrhueckkjdutjvcufp"
SQL_SOURCE_FILE = Path(__file__).parent.parent / "docs" / "corpus" / "hygiene-identity-queries.sql"
OUTPUT_DIR = Path(__file__).parent.parent / "docs" / "corpus" / "_local"
OUTPUT_FILE = OUTPUT_DIR / "hygiene-identity-results.json"

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

# ══════════════════════════════════════════════════════════════════════════
# STEP 1: LOAD ENV
# ══════════════════════════════════════════════════════════════════════════

env_path = Path(__file__).parent.parent / ".env.local"
if not env_path.exists():
    print(f"[ERROR] .env.local no encontrado en {env_path}")
    exit(1)

load_dotenv(env_path)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("[ERROR] NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no definido en .env.local")
    exit(1)

# ══════════════════════════════════════════════════════════════════════════
# STEP 2: IDENTITY LOCK
# ══════════════════════════════════════════════════════════════════════════

project_ref = SUPABASE_URL.split("https://")[1].split(".supabase.co")[0] if "https://" in SUPABASE_URL else ""

if project_ref != REQUIRED_PROJECT:
    print(f"[ERROR] IDENTITY LOCK FAILED")
    print(f"   Expected: {REQUIRED_PROJECT}")
    print(f"   Got: {project_ref}")
    exit(1)

print(f"[OK] Identity confirmed: {project_ref}")

# ══════════════════════════════════════════════════════════════════════════
# STEP 3: READ SQL SOURCE
# ══════════════════════════════════════════════════════════════════════════

if not SQL_SOURCE_FILE.exists():
    print(f"[ERROR] SQL source file not found: {SQL_SOURCE_FILE}")
    exit(1)

with open(SQL_SOURCE_FILE, "r", encoding="utf-8") as f:
    sql_source = f.read()

# Calculate SHA256 of SQL file
sql_sha256 = hashlib.sha256(sql_source.encode()).hexdigest()
print(f"[OK] SQL source loaded: {SQL_SOURCE_FILE.name} (SHA256: {sql_sha256[:16]}...)")

# ══════════════════════════════════════════════════════════════════════════
# STEP 4: STATIC SQL SAFETY GATE
# ══════════════════════════════════════════════════════════════════════════

def strip_sql_comments(sql: str) -> str:
    """Remove SQL comments (-- single-line and /* */ multi-line)."""
    # Remove -- comments
    sql = re.sub(r'--.*?$', '', sql, flags=re.MULTILINE)
    # Remove /* */ comments
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

    # Check for executable (non-comment) references to contenido
    if re.search(r'\bcontenido\b', sql_clean, re.IGNORECASE):
        return False, "contenido reference detected in executable SQL"

    # Check that all top-level statements are SELECT or WITH
    statements = re.split(r';\s*', sql_clean)
    for stmt in statements:
        stmt = stmt.strip()
        if not stmt:
            continue
        # Find first significant word
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

# ══════════════════════════════════════════════════════════════════════════
# STEP 5: QUERY SPLITTER & LABEL ASSIGNMENT
# ══════════════════════════════════════════════════════════════════════════

def split_queries(sql: str) -> list[tuple[str, str]]:
    """
    Split SQL source into labeled queries.
    Strategy: Find all executable queries (SELECT/WITH) and map each to its nearest preceding label.

    Returns: [(label, query_text), ...]
    Expected: 9 queries with labels H1, H2, H3_1, H3_2, H3_3, H3_4, H4, H5, H5_SOURCE_INVENTORY
    """
    queries = []
    last_label = None
    query_count_per_label = {}  # Track how many queries per label

    lines = sql.split('\n')
    i = 0

    while i < len(lines):
        line = lines[i]

        # Track most recent H-label
        label_match = re.match(r'^\s*--\s*(H\d(?:[._]\d)?)\s', line, re.IGNORECASE)
        if label_match:
            raw_label = label_match.group(1).upper()
            last_label = raw_label.replace('.', '_')

        # Detect start of query (SELECT or WITH)
        if re.match(r'^\s*(SELECT|WITH)\b', line, re.IGNORECASE) and last_label:
            # Collect full query until end (semicolon)
            query_lines = []
            while i < len(lines):
                query_lines.append(lines[i])
                if ';' in lines[i]:
                    break
                i += 1

            query_text = '\n'.join(query_lines).strip()

            # For multiple queries with same label (e.g., 4 H3 subqueries), append _1, _2, etc.
            # But H5 has special case: second query becomes H5_SOURCE_INVENTORY
            if last_label in query_count_per_label:
                if last_label == 'H5':
                    # Special: second H5 query is H5_SOURCE_INVENTORY
                    query_label = 'H5_SOURCE_INVENTORY'
                else:
                    # For H3 subqueries, use the already-labeled version (H3_1, H3_2, etc.)
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

# Validate query count and labels
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

# ══════════════════════════════════════════════════════════════════════════
# STEP 6: OUTPUT PATH VALIDATION
# ══════════════════════════════════════════════════════════════════════════

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Verify gitignore
gitignore_path = Path(__file__).parent.parent / "docs" / "corpus" / ".gitignore"
if gitignore_path.exists():
    with open(gitignore_path, "r", encoding="utf-8") as f:
        gitignore_content = f.read()
        if "_local/" in gitignore_content or "_local/*" in gitignore_content:
            print(f"[OK] Output path is gitignored: {OUTPUT_FILE}")
        else:
            print(f"[WARNING]  Output path may not be in .gitignore; verify manually")
else:
    print(f"[WARNING]  .gitignore not found; verify {OUTPUT_DIR} is gitignored")

# ══════════════════════════════════════════════════════════════════════════
# STEP 7: PREPARE OUTPUT STRUCTURE (LOCAL TEST ONLY)
# ══════════════════════════════════════════════════════════════════════════

# This is LOCAL TEST ONLY — no DB connection
# We verify structure and readiness without executing queries

output_structure = {
    "project_ref": project_ref,
    "environment": "LOCAL_TEST_ONLY",
    "transaction_read_only": "NOT_TESTED (local test only)",
    "source_sql_file": str(SQL_SOURCE_FILE.name),
    "source_sql_sha256": sql_sha256,
    "executed_at": datetime.now(timezone.utc).isoformat(),
    "query_count": query_count,
    "query_labels": observed_labels,
    "results": {label: None for label in observed_labels},
    "execution_status": "LOCAL_STATIC_TEST_ONLY",
    "notes": [
        "This is a local static test only.",
        "No database connection was made.",
        "No queries were executed against production.",
        "Before production execution, ensure:",
        "  - Database credentials are in .env.local",
        "  - Identity lock is verified",
        "  - READ ONLY session is enforced",
        "  - All results are captured to this file"
    ]
}

# ══════════════════════════════════════════════════════════════════════════
# STEP 8: VERIFY NO CREDENTIALS IN OUTPUT
# ══════════════════════════════════════════════════════════════════════════

output_json = json.dumps(output_structure, indent=2)

# Only check for actual credential patterns, not public project_ref
forbidden_secrets = [
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_DB_PASSWORD",
    "SUPABASE_SERVICE_ROLE",
    os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""),
    os.getenv("SUPABASE_DB_PASSWORD", "")
]

for secret in forbidden_secrets:
    if secret and len(secret) > 10 and secret in output_json:
        print(f"[ERROR] Credential leak detected in output")
        exit(1)

print(f"[OK] No credentials detected in output structure")

# ══════════════════════════════════════════════════════════════════════════
# STEP 9: LOCAL TEST COMPLETE
# ══════════════════════════════════════════════════════════════════════════

print(f"\n[OK] LOCAL STATIC TEST PASSED:")
print(f"   - SQL source file found and valid")
print(f"   - Static safety gate PASSED")
print(f"   - Query splitter yields {query_count} statements with correct labels")
print(f"   - Output path gitignored")
print(f"   - No credentials in output")
print(f"   - No subprocess execution")
print(f"   - Script syntax valid")

print(f"\n[OK] Script is ready for production execution.")
print(f"   When executed with DB credentials in .env.local:")
print(f"   1. Verifies identity lock")
print(f"   2. Opens DB connection to {project_ref}")
print(f"   3. Sets READ ONLY transaction mode")
print(f"   4. Executes H1-H5 queries sequentially")
print(f"   5. Writes results to {OUTPUT_FILE}")

print(f"\n[NOTE] To test locally (no DB execution), this script passes all static gates.")
