#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ingestar_cpc_base.py — Texto base completo del CPC (D.211-2006) → RAG
======================================================================
Cierra el hueco de cobertura detectado en la auditoría 2026-07-09:
el CPC Comentado Romero cubre 420/932 artículos (recursos 690+ ausentes).

Fuente: PDF oficial "Codigo_Procesal Civil_.pdf" (332 págs, 932 artículos)
Destino DUAL (paridad dev/prod):
  1. Supabase pgvector  → biblioteca_vectores  (producción)
  2. ChromaDB local     → mayalex_normativos   (desarrollo, FastAPI :8100)

Parser monotónico: acepta "Artículo N.-" como encabezado solo si N sigue
la secuencia (prev+1..prev+5). Los artículos de OTRAS leyes citados en las
reformas finales del decreto (Ley Prop. Industrial, C. Familia, etc.) se
absorben como contenido del artículo CPC padre — nunca como artículo propio.

Uso:
  python scripts/ingestar_cpc_base.py --dry-run   # parsea y muestra, no escribe
  python scripts/ingestar_cpc_base.py             # ingesta real (dual)
"""

import sys
import json
import re
import time
import argparse
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)

# ── Configuración ────────────────────────────────────────────────────────────

PDF_PATH = Path(
    r"C:\Users\Fredy\OneDrive\Email attachments\Documentos\bufete\juan cavino"
    r"\Desktop\trabajos abg Acosta\Codigo_Procesal Civil_.pdf"
)
CHROMA_PATH = r"C:\Users\Fredy\OneDrive\SISTEMA_LEGAL_PRINCIPAL\04_PROYECTOS_IA\chroma_mayalex"
APP_DIR     = Path(__file__).resolve().parent.parent
ENV_PATH    = APP_DIR / ".env.local"

COLECCION   = "mayalex_normativos"
MATERIA     = "02_CIVIL"
FUENTE      = "CPC_TEXTO_BASE_D211-2006"
ID_PREFIX   = "cpc_base_"
MODELO      = "intfloat/multilingual-e5-small"

CHUNK_SIZE    = 1400
CHUNK_OVERLAP = 120
GAP_MAX       = 5      # tolerancia de saltos en la numeración (derogados)
BATCH_PG      = 250

# Guion opcional: el PDF alterna "Artículo N.-" y "Artículo N. EPÍGRAFE"
# (el parser monotónico filtra las referencias in-text que pudieran colarse)
PATRON_ART = re.compile(r"(?m)^\s*Art[íi]culo\s+(\d+)\s*\.\s*[-–—]?")


def leer_env(clave: str) -> str | None:
    for linea in ENV_PATH.read_text(encoding="utf-8").splitlines():
        if linea.strip().startswith(f"{clave}="):
            return linea.split("=", 1)[1].strip()
    return None


def limpiar(t: str) -> str:
    return t.replace("\x00", "")


def vec_a_texto(vec) -> str:
    return "[" + ",".join(f"{x:.6f}" for x in vec) + "]"


# ── Extracción y parseo ──────────────────────────────────────────────────────

def extraer_articulos() -> list[dict]:
    """Devuelve [{num, epigrafe, texto}] con parser monotónico."""
    import fitz

    doc  = fitz.open(str(PDF_PATH))
    todo = "".join(doc[i].get_text() for i in range(len(doc)))
    todo = limpiar(todo)

    matches = [(int(m.group(1)), m.start(), m.end()) for m in PATRON_ART.finditer(todo)]

    # Localizar el inicio real del código: primer "Artículo 1.-"
    idx_inicio = next(i for i, (n, _, _) in enumerate(matches) if n == 1)

    # Parser monotónico
    aceptados = []          # índices de matches que son encabezados reales del CPC
    prev = 0
    for i in range(idx_inicio, len(matches)):
        n = matches[i][0]
        if prev < n <= prev + GAP_MAX:
            aceptados.append(i)
            prev = n
        # si no sigue la secuencia → es cita de reforma u otra ley: se absorbe

    articulos = []
    for j, i in enumerate(aceptados):
        n, pos, fin_head = matches[i]
        fin = matches[aceptados[j + 1]][1] if j + 1 < len(aceptados) else len(todo)
        cuerpo = todo[fin_head:fin]

        # Epígrafe: texto en MAYÚSCULAS al inicio del cuerpo, hasta el primer punto.
        # Se RETIRA del cuerpo para no duplicarlo (ya va en el encabezado del chunk).
        m_epi = re.match(r"\s*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s,;/().\-]{3,120}?)\.\s", cuerpo)
        epigrafe = m_epi.group(1).strip() if m_epi else ""
        if m_epi:
            cuerpo = cuerpo[m_epi.end():]

        texto = re.sub(r"\s+", " ", cuerpo).strip()
        if len(texto) < 20:
            continue
        articulos.append({"num": n, "epigrafe": epigrafe, "texto": texto})

    return articulos


def fragmentar(texto: str) -> list[str]:
    if len(texto) <= CHUNK_SIZE:
        return [texto]
    partes, inicio = [], 0
    while inicio < len(texto):
        fin = inicio + CHUNK_SIZE
        if fin >= len(texto):
            partes.append(texto[inicio:].strip())
            break
        corte = texto.rfind(" ", inicio, fin)
        if corte <= inicio:
            corte = fin
        partes.append(texto[inicio:corte].strip())
        inicio = max(inicio + 1, corte - CHUNK_OVERLAP)
    return [p for p in partes if p]


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    print("=" * 64)
    print("  INGESTA CPC TEXTO BASE — D.211-2006 (dual: pgvector + Chroma)")
    print("=" * 64)

    if not PDF_PATH.exists():
        print(f"❌ PDF no encontrado: {PDF_PATH}")
        sys.exit(1)

    print("\nExtrayendo artículos del PDF...")
    articulos = extraer_articulos()
    nums = [a["num"] for a in articulos]
    print(f"  Artículos extraídos: {len(articulos)} (1 → {max(nums)})")
    faltantes = sorted(set(range(1, max(nums) + 1)) - set(nums))
    if faltantes:
        print(f"  ⚠️  Números ausentes ({len(faltantes)}): {faltantes[:15]}{'...' if len(faltantes) > 15 else ''}")

    # Generar chunks
    chunks = []
    for a in articulos:
        encabezado = f"Artículo {a['num']} CPC (D.211-2006)"
        if a["epigrafe"]:
            encabezado += f" — {a['epigrafe']}"
        for sub, frag in enumerate(fragmentar(a["texto"])):
            contenido = f"{encabezado}. {frag}"
            chunks.append({
                "chunk_id":  f"{ID_PREFIX}a{a['num']:04d}_c{sub:02d}",
                "num":       str(a["num"]),
                "contenido": contenido,
                "texto_emb": f"passage: [{MATERIA} · norma_articulo · normativo] {contenido}",
                "meta": {
                    "codigo":      "CPC",
                    "decreto":     "D.211-2006",
                    "materia":     MATERIA,
                    "fuente":      FUENTE,
                    "tipo_fuente": "codigo_base",
                    "tipo_chunk":  "norma_articulo",
                    "articulo":    str(a["num"]),
                    "epigrafe":    a["epigrafe"][:150],
                },
            })
    print(f"  Chunks generados: {len(chunks)}")

    # Verificación clave del hueco de recursos
    arts_recursos = [c for c in chunks if 690 <= int(c["num"]) <= 720]
    print(f"  Chunks en rango recursos (690-720): {len(arts_recursos)} ✓")

    if args.dry_run:
        print("\n[DRY-RUN] Muestra:")
        for c in chunks[:2] + arts_recursos[:2]:
            print(f"  {c['chunk_id']}: {c['contenido'][:100]}...")
        return

    # ── Embeddings ────────────────────────────────────────────────────────
    from sentence_transformers import SentenceTransformer
    print(f"\nCargando {MODELO}...")
    model = SentenceTransformer(MODELO)
    print("Generando embeddings...")
    t0 = time.time()
    vectores = model.encode(
        [c["texto_emb"] for c in chunks],
        normalize_embeddings=True, batch_size=64, show_progress_bar=False,
    )
    print(f"  {len(vectores)} embeddings en {time.time()-t0:.0f}s")

    # ── Destino 1: Supabase pgvector ─────────────────────────────────────
    import psycopg2
    from psycopg2.extras import execute_values

    dsn = leer_env("DATABASE_URL")
    print("\n▶️  Supabase pgvector...")
    pg = psycopg2.connect(dsn, sslmode="require")
    cur = pg.cursor()
    filas = [(
        f"{COLECCION}:{c['chunk_id']}",
        COLECCION, MATERIA,
        limpiar(c["contenido"])[:8000],
        c["num"], FUENTE,
        json.dumps(c["meta"], ensure_ascii=False),
        vec_a_texto(v),
    ) for c, v in zip(chunks, vectores)]

    insertados = 0
    for i in range(0, len(filas), BATCH_PG):
        lote = filas[i:i + BATCH_PG]
        execute_values(
            cur,
            """INSERT INTO biblioteca_vectores
               (id, coleccion, materia, contenido, num_articulo, fuente, metadata, embedding)
               VALUES %s ON CONFLICT (id) DO NOTHING""",
            lote,
            template="(%s,%s,%s,%s,%s,%s,%s::jsonb,%s::vector)",
        )
        pg.commit()
        insertados += len(lote)
        if (i // BATCH_PG) % 4 == 0:
            print(f"   {insertados}/{len(filas)}")
    cur.execute(
        "SELECT count(*) FROM biblioteca_vectores WHERE fuente = %s", (FUENTE,)
    )
    print(f"✅ Supabase: {cur.fetchone()[0]} chunks con fuente {FUENTE}")
    pg.close()

    # ── Destino 2: ChromaDB local ─────────────────────────────────────────
    import chromadb
    from chromadb.config import Settings

    print("\n▶️  ChromaDB local...")
    client = chromadb.PersistentClient(
        path=CHROMA_PATH, settings=Settings(anonymized_telemetry=False)
    )
    col = client.get_collection(COLECCION)
    antes = col.count()
    B = 500
    for i in range(0, len(chunks), B):
        lote_c = chunks[i:i + B]
        lote_v = vectores[i:i + B]
        col.upsert(
            ids=[c["chunk_id"] for c in lote_c],
            documents=[c["contenido"] for c in lote_c],
            embeddings=[v.tolist() for v in lote_v],
            metadatas=[c["meta"] for c in lote_c],
        )
    print(f"✅ ChromaDB: {antes} → {col.count()} chunks en {COLECCION}")

    print("\n🎉 Ingesta dual completada.")


if __name__ == "__main__":
    main()
