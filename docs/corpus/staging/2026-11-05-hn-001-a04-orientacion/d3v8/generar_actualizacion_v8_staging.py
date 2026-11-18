"""A04 · genera el SQL de actualización controlada v7 → v8 para mayalexhn-staging (lote A04_D35_2013_01, HN:DECRETO_35_2013).

SOLO GENERA archivos; no se conecta a ninguna base.
La v8 solo cambia el texto del art. 1 del decreto (arts. 152 y 217 del Código de la Niñez transcritos dentro de él): el SQL aplica en la base
las 3 sustituciones firmadas (correcciones_cotejo_v8.json) sobre el texto v7 cargado y se ABORTA si sha256(contenido) calculado por Postgres no
es el hash_contenido v8. Los embeddings no cambian (las correcciones caen fuera de los primeros 512 tokens que lee el modelo): se comprueba aquí.

Entradas (out/, no versionado): out/a04-d35-2013-v7/ y out/a04-d35-2013-v8/ (rows.jsonl y update_embeddings_staging.sql de cada ingesta).
Uso (raíz del repo): python -I <este archivo>
Salida: out/a04-d35-2013-v8/actualizacion_v8_staging.sql y reversion_v8_a_v7_staging.sql
"""
import hashlib
import json
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')
SHA_V7 = '460e493db5e97a9dba53345010281dc338642edee525b6cfbc9fee2f3ddab023'
SHA_V8 = '6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb'
LOTE = 'A04_D35_2013_01'
ID1 = f'{LOTE}:DECRETO_35_2013:1'
D3_V7 = 'Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v7 (ADJUDICACION_CLO_D35_2013.md §3)'
D3_V8 = 'Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v8 (ADJUDICACION_CLO_D35_2013.md §3)'
CORR = 'docs/corpus/staging/2026-11-05-hn-001-a04-orientacion/transcripcion_candidata/correcciones_cotejo_v8.json'


def filas(p):
    return {r['id']: r for r in map(json.loads, open(p, encoding='utf-8'))}


def embeddings(p):
    return {re.search(r"id = '([^']+)'", l).group(1): re.search(r"'(\[[^']*\])'", l).group(1)
            for l in open(p, encoding='utf-8') if l.startswith('UPDATE')}


def lit(s):
    return "'" + s.replace("'", "''") + "'"


v7, v8 = filas('out/a04-d35-2013-v7/rows.jsonl'), filas('out/a04-d35-2013-v8/rows.jsonl')
if list(v7) != list(v8) or len(v8) != 19:
    sys.exit('las filas v7/v8 no tienen los mismos 19 ids')
if any(r['metadata']['transcripcion_sha256'] != SHA_V7 for r in v7.values()) or any(r['metadata']['transcripcion_sha256'] != SHA_V8 or r['metadata']['cotejado_por'] != D3_V8 for r in v8.values()):
    sys.exit('las filas no llevan los hashes o la firma D3 esperados')
cambian = [i for i in v8 if v8[i]['contenido'] != v7[i]['contenido']]
if cambian != [ID1]:
    sys.exit(f'se esperaba que solo cambiara el art. 1 y cambian {cambian}')
if embeddings('out/a04-d35-2013-v7/update_embeddings_staging.sql') != embeddings('out/a04-d35-2013-v8/update_embeddings_staging.sql'):
    sys.exit('algún embedding cambia: este SQL no los actualiza')
corr = json.load(open(CORR, encoding='utf-8'))
t = v7[ID1]['contenido']
for c in corr:
    if t.count(c['buscar']) != 1:
        sys.exit(f"«{c['buscar']}» no aparece exactamente una vez en el art. 1 v7")
    t = t.replace(c['buscar'], c['reemplazar'])
if t != v8[ID1]['contenido'] or hashlib.sha256(t.encode()).hexdigest() != v8[ID1]['hash_contenido']:
    sys.exit('las sustituciones no reproducen el texto v8 del art. 1')
h7, h8 = v7[ID1]['hash_contenido'], v8[ID1]['hash_contenido']
a7, a8 = v7[ID1]['metadata']['article_sha256'], v8[ID1]['metadata']['article_sha256']


def bloque(origen, destino, sha_o, sha_d, d3_d, ho, hd, ad, pares, extra_meta, quitar_meta, titulo):
    L = [f'-- {titulo}', f'-- SOLO STAGING (mayalexhn-staging, aicakncgtuiiuomflkqj) · lote {LOTE} · HN:DECRETO_35_2013 · {origen} → {destino}',
         f'--   {origen} {sha_o} → {destino} {sha_d}',
         '-- Cambia solo el texto del art. 1 del decreto (3 sustituciones) y las claves de la transcripción en las 19 filas. No toca embedding,',
         '-- visibilidad, vigencia, rol, estado_v ni constancias. Atómico: se aborta sin cambios si algo no cuadra. PRODUCCIÓN: NO APLICAR.',
         'BEGIN;', 'DO $do$', 'DECLARE n int;', 'BEGIN']
    w = L.append
    w(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}' AND metadata->>'transcripcion_sha256' = '{sha_o}'")
    w("    AND encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido AND position(E'\\r' IN contenido) = 0;")
    w(f"  IF n <> 19 THEN RAISE EXCEPTION 'precondición: solo % de 19 filas en {origen} con sha256(contenido) = hash_contenido', n; END IF;")
    w(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE id = {lit(ID1)} AND hash_contenido = {lit(ho)};")
    w(f"  IF n <> 1 THEN RAISE EXCEPTION 'precondición: el art. 1 no tiene el texto {origen}'; END IF;")
    w(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}' AND revision_pendiente = false AND es_norma_vigente = true")
    w("    AND metadata->>'estado_v' = 'V4' AND embedding IS NOT NULL;")
    w("  IF n <> 19 THEN RAISE EXCEPTION 'precondición: % de 19 filas visibles, vigentes, V4, con embedding', n; END IF;")
    expr = 'contenido'
    for b, r in pares:
        expr = f'replace({expr}, {lit(b)}, {lit(r)})'
    w(f'  UPDATE public.biblioteca_vectores SET contenido = {expr},')
    w(f"    hash_contenido = {lit(hd)}, metadata = metadata || jsonb_build_object('article_sha256', {lit(ad)})")
    w(f'  WHERE id = {lit(ID1)} AND ingest_batch = {lit(LOTE)} AND hash_contenido = {lit(ho)};')
    w(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE id = {lit(ID1)} AND hash_contenido = {lit(hd)}")
    w("    AND encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido;")
    w(f"  IF n <> 1 THEN RAISE EXCEPTION 'el sha256 del texto resultante del art. 1 no es el de la {destino}'; END IF;")
    meta = ', '.join(f"{lit(k)}, {lit(v)}" for k, v in [('transcripcion_sha256', sha_d), ('text_sha256', sha_d), ('cotejado_por', d3_d)] + extra_meta)
    resta = ''.join(f" - {lit(k)}" for k in quitar_meta)
    w(f"  UPDATE public.biblioteca_vectores SET metadata = (metadata{resta}) || jsonb_build_object({meta})")
    w(f"  WHERE ingest_batch = '{LOTE}' AND metadata->>'transcripcion_sha256' = '{sha_o}';")
    w(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}' AND metadata->>'transcripcion_sha256' = '{sha_d}'")
    w("    AND encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido AND position(E'\\r' IN contenido) = 0;")
    w(f"  IF n <> 19 THEN RAISE EXCEPTION 'postcondición: solo % de 19 filas en {destino} con sha256(contenido) = hash_contenido', n; END IF;")
    w(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}' AND revision_pendiente = false AND es_norma_vigente = true")
    w("    AND metadata->>'estado_v' = 'V4' AND metadata->>'vigencia' = 'TRUE_PRESUNTA' AND embedding IS NOT NULL;")
    w("  IF n <> 19 THEN RAISE EXCEPTION 'postcondición: visibilidad/vigencia/V4/embedding alterados (% de 19)', n; END IF;")
    w(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}' AND metadata->>'rol' = 'CONTEXT';")
    w("  IF n <> 11 THEN RAISE EXCEPTION 'postcondición: CONTEXT alterado (%)', n; END IF;")
    w(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}' AND metadata ? 'interpretacion_pendiente_clo';")
    w("  IF n <> 1 THEN RAISE EXCEPTION 'postcondición: constancias pendientes alteradas (%)', n; END IF;")
    w(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}' AND metadata->>'interpretacion_estado' = 'RESUELTO_CLO_2026_11_18';")
    w("  IF n <> 1 THEN RAISE EXCEPTION 'postcondición: constancia resuelta del art. 11 alterada (%)', n; END IF;")
    L += ['END', '$do$;', 'COMMIT;']
    return L


pares = [(c['buscar'], c['reemplazar']) for c in corr]
ACT = bloque('v7', 'v8', SHA_V7, SHA_V8, D3_V8, h7, h8, a8, pares,
             [('transcripcion_anterior_sha256', SHA_V7), ('transcripcion_version', 'v8')], [], 'Actualización controlada v7 → v8 (firma D3 de la v8 del 2026-11-18)')
ACT += ['', '-- Verificación (solo lectura): esperado 19 · 19 · 19 · 0 · 11 · 1 · 1.',
        f"SELECT count(*) AS filas, count(*) FILTER (WHERE metadata->>'transcripcion_sha256' = '{SHA_V8}') AS en_v8,",
        "  count(*) FILTER (WHERE encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido) AS sha_ok,",
        "  count(*) FILTER (WHERE contenido LIKE '%[ilegible]%' OR contenido LIKE '%Íos(las)%' OR contenido LIKE '%público; x%') AS errores_v7,",
        "  count(*) FILTER (WHERE metadata->>'rol' = 'CONTEXT') AS context,",
        "  count(*) FILTER (WHERE metadata ? 'interpretacion_pendiente_clo') AS pendiente,",
        "  count(*) FILTER (WHERE metadata->>'interpretacion_estado' = 'RESUELTO_CLO_2026_11_18') AS resuelta",
        f"FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}';"]
REV = bloque('v8', 'v7', SHA_V8, SHA_V7, D3_V7, h8, h7, a7, [(r, b) for b, r in reversed(pares)],
             [('transcripcion_anterior_sha256', '7c8f40f844cc30f28f7bf6448151e995ed2df88bc3050a6f5b252a39709ce084'), ('transcripcion_version', 'v7')], [],
             'REVERSIÓN v8 → v7 · NO EJECUTAR salvo orden expresa del CLO')
for nombre, lineas in [('actualizacion_v8_staging.sql', ACT), ('reversion_v8_a_v7_staging.sql', REV)]:
    p = 'out/a04-d35-2013-v8/' + nombre
    open(p, 'w', encoding='utf-8', newline='\n').write('\n'.join(lineas) + '\n')
    print(p, hashlib.sha256(open(p, 'rb').read()).hexdigest())
print('art. 1:', h7[:12], '→', h8[:12], '· article_sha256', a8[:12])
