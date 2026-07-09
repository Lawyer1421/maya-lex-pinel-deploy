#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seed_vectores.py — Migración masiva ChromaDB local → Supabase pgvector
=======================================================================
Lee las 3 colecciones de chroma_mayalex (76,381 chunks, e5-small 384 dims)
y las inyecta por lotes en biblioteca_vectores usando DATABASE_URL.

  - Idempotente: ON CONFLICT (id) DO NOTHING — se puede relanzar sin duplicar
  - Reanudable: si una colección ya tiene todos sus chunks en Supabase, se salta
  - Anti-contaminación: la columna `materia` viaja con cada chunk
  - El índice HNSW se crea AL FINAL de la carga (mucho más rápido que antes)

Uso:
  python scripts/seed_vectores.py            # carga completa
  python scripts/seed_vectores.py --dry-run  # solo cuenta, no toca Supabase

Requiere: chromadb, psycopg2-binary (Python 3.14 local de Don Fredy)
"""

import sys
import json
import time
import argparse
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)

# ── Configuración ────────────────────────────────────────────────────────────

APP_DIR     = Path(__file__).resolve().parent.parent
CHROMA_PATH = r"C:\Users\Fredy\OneDrive\SISTEMA_LEGAL_PRINCIPAL\04_PROYECTOS_IA\chroma_mayalex"
DDL_PATH    = APP_DIR / "supabase" / "vectores.sql"
ENV_PATH    = APP_DIR / ".env.local"

COLECCIONES = ["mayalex_normativos", "mayalex_procedimental", "mayalex_instrumentos"]

PAGE_SIZE  = 500   # chunks por página leída de ChromaDB
BATCH_SIZE = 250   # filas por INSERT hacia Supabase

# Claves de metadata que pueden contener el número de artículo / fuente
ART_KEYS    = ("articulo", "articulo_num", "num_articulo", "articulo_especifico")
FUENTE_KEYS = ("fuente", "codigo", "archivo_origen", "id_documento")


def leer_env(clave: str) -> str | None:
    """Parser mínimo de .env.local (evita dependencia de python-dotenv)."""
    if not ENV_PATH.exists():
        return None
    for linea in ENV_PATH.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if linea.startswith(f"{clave}="):
            return linea.split("=", 1)[1].strip()
    return None


def vec_a_texto(vec) -> str:
    """Serializa el embedding al formato textual de pgvector, 6 decimales."""
    return "[" + ",".join(f"{x:.6f}" for x in vec) + "]"


def limpiar(texto: str | None) -> str | None:
    """PostgreSQL no acepta NUL (0x00) en texto — algunos PDF los arrastran."""
    if texto is None:
        return None
    return texto.replace("\x00", "")


def meta_a_json(meta: dict) -> str:
    """Serializa metadata a JSON válido, truncando por CAMPO (nunca a mitad
    del JSON — un corte crudo rompería el cast ::jsonb)."""
    reducido = {
        k: (v[:500] if isinstance(v, str) else v)
        for k, v in meta.items()
    }
    return json.dumps(reducido, ensure_ascii=False)


def extraer_campo(meta: dict, claves: tuple) -> str | None:
    for k in claves:
        v = meta.get(k)
        if v not in (None, "", "None"):
            return limpiar(str(v)[:200])
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Solo contar, sin escribir")
    args = parser.parse_args()

    dsn = leer_env("DATABASE_URL")
    if not dsn:
        print("❌ DATABASE_URL no encontrada en .env.local")
        sys.exit(1)

    import chromadb
    from chromadb.config import Settings
    import psycopg2
    from psycopg2.extras import execute_values

    print("=" * 64)
    print("  SEED VECTORES — ChromaDB → Supabase pgvector")
    print("=" * 64)

    # ── ChromaDB ─────────────────────────────────────────────────────────
    chroma = chromadb.PersistentClient(
        path=CHROMA_PATH, settings=Settings(anonymized_telemetry=False)
    )
    conteos = {}
    for nombre in COLECCIONES:
        conteos[nombre] = chroma.get_collection(nombre).count()
    total_local = sum(conteos.values())
    print(f"\nChromaDB local: {total_local:,} chunks")
    for n, c in conteos.items():
        print(f"  {n}: {c:,}")

    if args.dry_run:
        print("\n[DRY-RUN] Sin cambios en Supabase.")
        return

    # ── Supabase ─────────────────────────────────────────────────────────
    print("\nConectando a Supabase (pooler)...")
    pg = psycopg2.connect(dsn, sslmode="require")
    pg.autocommit = False
    cur = pg.cursor()

    # DDL idempotente (extension + tabla + RLS + RPC)
    print("Aplicando DDL (vectores.sql)...")
    cur.execute(DDL_PATH.read_text(encoding="utf-8"))
    pg.commit()
    print("✅ DDL aplicado")

    inicio_global = time.time()
    total_insertados = 0

    for nombre in COLECCIONES:
        col   = chroma.get_collection(nombre)
        local = conteos[nombre]

        cur.execute(
            "SELECT count(*) FROM biblioteca_vectores WHERE coleccion = %s", (nombre,)
        )
        remoto = cur.fetchone()[0]
        if remoto >= local:
            print(f"\n⏭️  {nombre}: ya completa en Supabase ({remoto:,}/{local:,}) — saltada")
            continue

        print(f"\n▶️  {nombre}: {remoto:,}/{local:,} en Supabase — cargando restantes...")
        offset = 0
        insertados_col = 0
        t0 = time.time()

        while offset < local:
            pagina = col.get(
                limit=PAGE_SIZE,
                offset=offset,
                include=["embeddings", "metadatas", "documents"],
            )
            ids   = pagina["ids"]
            if not ids:
                break

            filas = []
            for cid, doc, meta, emb in zip(
                ids, pagina["documents"], pagina["metadatas"], pagina["embeddings"]
            ):
                meta = meta or {}
                filas.append((
                    limpiar(f"{nombre}:{cid}"),                # id global sin colisiones
                    nombre,                                    # coleccion
                    limpiar(meta.get("materia")),              # filtro anti-contaminación
                    limpiar((doc or "")[:8000]),               # contenido
                    extraer_campo(meta, ART_KEYS),             # num_articulo
                    extraer_campo(meta, FUENTE_KEYS),          # fuente
                    limpiar(meta_a_json(meta)),                # metadata jsonb (JSON siempre válido)
                    vec_a_texto(emb),                          # embedding
                ))

            for i in range(0, len(filas), BATCH_SIZE):
                lote = filas[i:i + BATCH_SIZE]
                execute_values(
                    cur,
                    """INSERT INTO biblioteca_vectores
                       (id, coleccion, materia, contenido, num_articulo, fuente, metadata, embedding)
                       VALUES %s
                       ON CONFLICT (id) DO NOTHING""",
                    lote,
                    template="(%s,%s,%s,%s,%s,%s,%s::jsonb,%s::vector)",
                )
            pg.commit()

            insertados_col += len(filas)
            offset += PAGE_SIZE

            if (offset // PAGE_SIZE) % 10 == 0 or offset >= local:
                pct   = min(100, offset * 100 // local)
                vel   = insertados_col / max(time.time() - t0, 1)
                print(f"   {nombre}: {min(offset, local):,}/{local:,} ({pct}%) — {vel:.0f} chunks/s")

        total_insertados += insertados_col
        print(f"✅ {nombre}: {insertados_col:,} chunks cargados en {time.time()-t0:.0f}s")

    # ── Índice HNSW al final (post-carga = construcción rápida) ─────────
    print("\n▶️  Creando índice HNSW (cosine, m=16, ef_construction=64)...")
    t0 = time.time()
    pg.autocommit = True
    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_biblio_hnsw
        ON biblioteca_vectores
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)
    cur.execute("ANALYZE biblioteca_vectores")
    print(f"✅ Índice HNSW listo en {time.time()-t0:.0f}s")

    # ── Verificación final ───────────────────────────────────────────────
    cur.execute("SELECT coleccion, count(*) FROM biblioteca_vectores GROUP BY coleccion")
    print("\n" + "=" * 64)
    print("  RESULTADO FINAL EN SUPABASE")
    print("=" * 64)
    for fila in cur.fetchall():
        print(f"  {fila[0]}: {fila[1]:,} chunks")
    cur.execute(
        "SELECT count(*) FROM biblioteca_vectores WHERE materia = '01_PENAL'"
    )
    print(f"  (filtro anti-contaminación: {cur.fetchone()[0]:,} chunks 01_PENAL)")
    print(f"\n🎉 Migración completa en {(time.time()-inicio_global)/60:.1f} min")

    cur.close()
    pg.close()


if __name__ == "__main__":
    main()
