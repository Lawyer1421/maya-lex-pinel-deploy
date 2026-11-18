"""A04 · genera el SQL de actualización controlada v6 → v7 para mayalexhn-staging (lote A04_D35_2013_01, HN:DECRETO_35_2013).

SOLO GENERA el archivo; no se conecta a ninguna base. El CLO lo revisa y lo aplica en el SQL Editor de staging.

Entradas (la carpeta out/ no se versiona, igual que en la carga de la v6):
  out/a04-d35-2013/rows.jsonl                     filas v6 (8e08cca2…), base de la precondición y de la reversión
  out/a04-d35-2013/update_embeddings_staging.sql  embeddings v6 (fdd8e57a…), para la reversión
  out/a04-d35-2013-v7/rows.jsonl                  filas v7 (ingesta con --transcripcion v7 y --transcripcion-sha256 460e493d…)
  out/a04-d35-2013-v7/update_embeddings_staging.sql embeddings v7 (mismo modelo y tratamiento)

Uso (raíz del repo): python -I <este archivo>
Salida: out/a04-d35-2013-v7/actualizacion_v7_staging.sql
"""
import hashlib
import json
import re
import sys

SHA_V6 = '7c8f40f844cc30f28f7bf6448151e995ed2df88bc3050a6f5b252a39709ce084'
SHA_V7 = '460e493db5e97a9dba53345010281dc338642edee525b6cfbc9fee2f3ddab023'
SHA_ROWS_V6 = '8e08cca224ab9d9e51526b2742f0c9c60ab0af3aef53254f8e33851728d534ad'
LOTE = 'A04_D35_2013_01'
D3 = 'Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v7 (ADJUDICACION_CLO_D35_2013.md §3)'


def sha_file(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()


def filas(p):
    return {r['id']: r for r in map(json.loads, open(p, encoding='utf-8'))}


def embeddings(p):
    out = {}
    for line in open(p, encoding='utf-8'):
        if line.startswith('UPDATE'):
            out[re.search(r"id = '([^']+)'", line).group(1)] = re.search(r"'(\[[^']*\])'", line).group(1)
    return out


def lit(s):
    return "'" + s.replace("'", "''") + "'"


if sha_file('out/a04-d35-2013/rows.jsonl') != SHA_ROWS_V6:
    sys.exit('rows.jsonl v6 no es el de la carga firmada (8e08cca2…)')
v6, v7 = filas('out/a04-d35-2013/rows.jsonl'), filas('out/a04-d35-2013-v7/rows.jsonl')
e6, e7 = embeddings('out/a04-d35-2013/update_embeddings_staging.sql'), embeddings('out/a04-d35-2013-v7/update_embeddings_staging.sql')
if list(v6) != list(v7) or len(v7) != 19 or set(e6) != set(v6) or set(e7) != set(v7):
    sys.exit('las filas o los embeddings v6/v7 no tienen los mismos 19 ids')
for r in v7.values():
    if r['metadata']['transcripcion_sha256'] != SHA_V7 or r['metadata']['cotejado_por'] != D3:
        sys.exit(f"{r['id']}: la fila v7 no lleva el hash o el firmante D3 de la v7")
cambian = [i for i in v7 if v7[i]['contenido'] != v6[i]['contenido']]
arts = [i.split(':')[-1] for i in cambian]
if arts != ['1', '3', '5', '6']:
    sys.exit(f'se esperaban cambios de texto solo en los arts. 1, 3, 5 y 6 y hay {arts}')

L = []
w = L.append
w('-- ═══════════════════════════════════════════════════════════════════════════════════════════')
w(f'-- SOLO STAGING (mayalexhn-staging, aicakncgtuiiuomflkqj) · lote {LOTE} · HN:DECRETO_35_2013')
w('-- Actualización controlada v6 → v7 de la transcripción cotejada (firma D3 de la v7 del 2026-11-18).')
w(f'--   v6 {SHA_V6} → v7 {SHA_V7}')
w('-- Cambia el texto de los arts. 1, 3, 5 y 6 del decreto (18 correcciones del cotejo con el ejemplar 2) y, en las 19 filas,')
w('-- solo las claves de metadata de la transcripción. NO toca visibilidad, vigencia, rol, estado_v, constancias ni es_norma_vigente.')
w('-- Atómico: se aborta (sin cambios) si el lote no está exactamente en el estado v6 esperado o si el resultado no es el previsto.')
w('-- PRODUCCIÓN: NO APLICAR. V4→V5 sigue sin firmar.')
w('-- ═══════════════════════════════════════════════════════════════════════════════════════════')
w('BEGIN;')
w('DO $do$')
w('DECLARE n int;')
w('BEGIN')
w('  -- Precondición: 19 filas, todas con la v6, visibles, V4, 11 CONTEXT, constancias en 1 y 11, y el texto v6 en los 4 artículos que cambian.')
w(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}';")
w("  IF n <> 19 THEN RAISE EXCEPTION 'precondición: se esperaban 19 filas del lote y hay %', n; END IF;")
w(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}' AND metadata->>'transcripcion_sha256' = '{SHA_V6}'")
w("    AND revision_pendiente = false AND es_norma_vigente = true AND metadata->>'estado_v' = 'V4' AND embedding IS NOT NULL;")
w("  IF n <> 19 THEN RAISE EXCEPTION 'precondición: solo % filas están en v6 · visibles · vigentes · V4 · con embedding', n; END IF;")
w(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}' AND metadata->>'rol' = 'CONTEXT';")
w("  IF n <> 11 THEN RAISE EXCEPTION 'precondición: se esperaban 11 filas CONTEXT y hay %', n; END IF;")
w(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}' AND (" + ' OR '.join(
    f"(id = {lit(i)} AND hash_contenido = {lit(v6[i]['hash_contenido'])})" for i in cambian) + ');')
w("  IF n <> 4 THEN RAISE EXCEPTION 'precondición: el texto de los arts. 1, 3, 5 y 6 no es el de la v6 (% de 4)', n; END IF;")
w('')
w('  -- 1) Texto, hash, article_sha256 y embedding de los 4 artículos que cambian.')
for i in cambian:
    r = v7[i]
    w(f"  UPDATE public.biblioteca_vectores SET contenido = {lit(r['contenido'])},")
    w(f"    hash_contenido = {lit(r['hash_contenido'])},")
    w(f"    embedding = '{e7[i]}'::vector(384),")
    w(f"    metadata = metadata || jsonb_build_object('article_sha256', {lit(r['metadata']['article_sha256'])})")
    w(f"  WHERE id = {lit(i)} AND ingest_batch = '{LOTE}' AND hash_contenido = {lit(v6[i]['hash_contenido'])};")
w('')
w('  -- 2) Claves de la transcripción en las 19 filas (se conservan todas las demás claves de metadata).')
w(f"  UPDATE public.biblioteca_vectores SET metadata = metadata || jsonb_build_object(")
w(f"      'transcripcion_sha256', '{SHA_V7}', 'text_sha256', '{SHA_V7}', 'cotejado_por', {lit(D3)},")
w(f"      'transcripcion_anterior_sha256', '{SHA_V6}', 'transcripcion_version', 'v7')")
w(f"  WHERE ingest_batch = '{LOTE}' AND metadata->>'transcripcion_sha256' = '{SHA_V6}';")
w('')
w('  -- Postcondición: todo en v7 y el régimen de visibilidad intacto.')
w(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}' AND metadata->>'transcripcion_sha256' = '{SHA_V7}'")
w(f"    AND metadata->>'cotejado_por' = {lit(D3)};")
w("  IF n <> 19 THEN RAISE EXCEPTION 'postcondición: solo % filas quedaron en v7', n; END IF;")
w(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}' AND (" + ' OR '.join(
    f"(id = {lit(i)} AND hash_contenido = {lit(v7[i]['hash_contenido'])})" for i in cambian) + ');')
w("  IF n <> 4 THEN RAISE EXCEPTION 'postcondición: el texto v7 quedó en % de 4 artículos', n; END IF;")
w(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}' AND revision_pendiente = false AND es_norma_vigente = true")
w("    AND metadata->>'estado_v' = 'V4' AND metadata->>'vigencia' = 'TRUE_PRESUNTA' AND embedding IS NOT NULL;")
w("  IF n <> 19 THEN RAISE EXCEPTION 'postcondición: visibilidad/vigencia/V4/embedding alterados (% de 19)', n; END IF;")
w(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}' AND metadata->>'rol' = 'CONTEXT';")
w("  IF n <> 11 THEN RAISE EXCEPTION 'postcondición: CONTEXT alterado (%)', n; END IF;")
w(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}' AND metadata ? 'interpretacion_pendiente_clo'")
w("    AND split_part(id, ':', 3) IN ('1', '11');")
w("  IF n <> 2 THEN RAISE EXCEPTION 'postcondición: constancias INTERPRETACION_PENDIENTE_CLO alteradas (%)', n; END IF;")
w('END')
w('$do$;')
w('COMMIT;')
w('')
w('-- Verificación (solo lectura): esperado 19 · 19 · 4 · 19 · 11 · 2.')
w(f"SELECT count(*) AS filas,")
w(f"  count(*) FILTER (WHERE metadata->>'transcripcion_sha256' = '{SHA_V7}') AS en_v7,")
w(f"  count(*) FILTER (WHERE " + ' OR '.join(f"(id = {lit(i)} AND hash_contenido = {lit(v7[i]['hash_contenido'])})" for i in cambian) + ') AS texto_v7_arts_1_3_5_6,')
w("  count(*) FILTER (WHERE revision_pendiente = false AND es_norma_vigente AND metadata->>'estado_v' = 'V4' AND embedding IS NOT NULL) AS visibles_v4,")
w("  count(*) FILTER (WHERE metadata->>'rol' = 'CONTEXT') AS context,")
w("  count(*) FILTER (WHERE metadata ? 'interpretacion_pendiente_clo') AS constancias")
w(f"FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}';")
w('-- La reversión exacta a la v6 está en reversion_v7_a_v6_staging.sql (archivo aparte; solo por orden del CLO).')

R = []
r_ = R.append
r_('-- REVERSIÓN v7 → v6 · SOLO STAGING (aicakncgtuiiuomflkqj) · lote ' + LOTE + ' · NO EJECUTAR salvo orden expresa del CLO.')
r_('-- Devuelve exactamente el texto, hash, article_sha256 y embedding v6 de los arts. 1, 3, 5 y 6, y las claves v6 de la transcripción.')
r_('BEGIN;')
r_('DO $do$')
r_('DECLARE n int;')
r_('BEGIN')
r_(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}' AND metadata->>'transcripcion_sha256' = '{SHA_V7}';")
r_("  IF n <> 19 THEN RAISE EXCEPTION 'precondición: se esperaban 19 filas en v7 y hay %', n; END IF;")
for i in cambian:
    r = v6[i]
    r_(f"  UPDATE public.biblioteca_vectores SET contenido = {lit(r['contenido'])},")
    r_(f"    hash_contenido = {lit(r['hash_contenido'])}, embedding = '{e6[i]}'::vector(384),")
    r_(f"    metadata = metadata || jsonb_build_object('article_sha256', {lit(r['metadata']['article_sha256'])})")
    r_(f"  WHERE id = {lit(i)} AND ingest_batch = '{LOTE}' AND hash_contenido = {lit(v7[i]['hash_contenido'])};")
r_(f"  UPDATE public.biblioteca_vectores SET metadata = (metadata - 'transcripcion_anterior_sha256' - 'transcripcion_version') || jsonb_build_object(")
r_(f"      'transcripcion_sha256', '{SHA_V6}', 'text_sha256', '{SHA_V6}', 'cotejado_por', {lit(v6[cambian[0]]['metadata']['cotejado_por'])})")
r_(f"  WHERE ingest_batch = '{LOTE}' AND metadata->>'transcripcion_sha256' = '{SHA_V7}';")
r_(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}' AND metadata->>'transcripcion_sha256' = '{SHA_V6}';")
r_("  IF n <> 19 THEN RAISE EXCEPTION 'postcondición: solo % filas volvieron a v6', n; END IF;")
r_('END')
r_('$do$;')
r_('COMMIT;')

# ── Variante compacta (mismo efecto): aplica en la base las 18 sustituciones sobre el texto v6 ya cargado y se ABORTA si el
# sha256 calculado por Postgres no es el hash_contenido de la v7. Existe porque el archivo completo (texto íntegro del art. 1)
# no cabe de forma fiable en una llamada de la herramienta de Supabase. El estado final es idéntico byte a byte.
CORR = json.load(open('docs/corpus/staging/2026-11-05-hn-001-a04-orientacion/transcripcion_candidata/correcciones_cotejo_ejemplar2.json', encoding='utf-8'))
por_fila = {}
for x in CORR:
    dueños = [i for i in cambian if v6[i]['contenido'].count(x['buscar']) == 1]
    if len(dueños) != 1 or sum(v6[i]['contenido'].count(x['buscar']) for i in v6) != 1:
        sys.exit(f"la corrección «{x['buscar']}» no está exactamente una vez en una sola fila v6")
    por_fila.setdefault(dueños[0], []).append(x)
for i, xs in por_fila.items():
    t = v6[i]['contenido']
    for x in xs:
        t = t.replace(x['buscar'], x['reemplazar'])
    if t != v7[i]['contenido']:
        sys.exit(f'{i}: las sustituciones no reproducen el texto v7')
emb_cambia = [i for i in cambian if e6[i] != e7[i]]

C = []
c_ = C.append
c_(L[0]); c_(L[1])
c_('-- Variante COMPACTA de actualizacion_v7_staging.sql (mismo efecto, mismo estado final): en vez de incrustar el texto íntegro,')
c_('-- aplica las 18 sustituciones firmadas sobre el texto v6 cargado y aborta si sha256(contenido) calculado por Postgres no es el')
c_('-- hash_contenido v7. Precondiciones y postcondiciones idénticas a las del archivo completo.')
c_(f'--   v6 {SHA_V6} → v7 {SHA_V7}')
c_('-- PRODUCCIÓN: NO APLICAR.')
c_('BEGIN;')
c_('DO $do$')
c_('DECLARE n int;')
c_('BEGIN')
inicio = L.index('BEGIN') + 1
fin_pre = next(k for k, s in enumerate(L) if s.startswith('  -- 1) Texto'))
C.extend(L[inicio:fin_pre])
c_('  -- 0) Normalización de fin de línea (decisión del CLO, 2026-11-18): la carga v6 dejó «\\r\\n» en el contenido de las 19 filas')
c_('  --    (el SQL pasó por un editor de Windows). Solo se aplica si, quitando los «\\r», las 19 filas vuelven a su hash_contenido v6.')
c_(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}'")
c_("    AND encode(sha256(convert_to(replace(contenido, E'\\r\\n', E'\\n'), 'UTF8')), 'hex') = hash_contenido;")
c_("  IF n <> 19 THEN RAISE EXCEPTION 'precondición: solo % filas recuperan su hash v6 al normalizar a LF', n; END IF;")
c_(f"  UPDATE public.biblioteca_vectores SET contenido = replace(contenido, E'\\r\\n', E'\\n') WHERE ingest_batch = '{LOTE}' AND position(E'\\r' IN contenido) > 0;")
c_(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}' AND encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido;")
c_("  IF n <> 19 THEN RAISE EXCEPTION 'normalización: solo % filas coinciden con su hash v6', n; END IF;")
c_('')
c_('  -- 1) Las 18 sustituciones, fila por fila (cada texto buscado está exactamente una vez en su fila v6).')
for i in cambian:
    expr = 'contenido'
    for x in por_fila[i]:
        expr = f"replace({expr}, {lit(x['buscar'])}, {lit(x['reemplazar'])})"
    extra = f",\n    embedding = '{e7[i]}'::vector(384)" if i in emb_cambia else ''
    c_(f"  UPDATE public.biblioteca_vectores SET contenido = {expr},")
    c_(f"    hash_contenido = {lit(v7[i]['hash_contenido'])}{extra},")
    c_(f"    metadata = metadata || jsonb_build_object('article_sha256', {lit(v7[i]['metadata']['article_sha256'])})")
    c_(f"  WHERE id = {lit(i)} AND ingest_batch = '{LOTE}' AND hash_contenido = {lit(v6[i]['hash_contenido'])};")
c_(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}' AND id IN ({', '.join(lit(i) for i in cambian)})")
c_("    AND encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido;")
c_("  IF n <> 4 THEN RAISE EXCEPTION 'el sha256 del texto resultante no es el de la v7 en % de 4 artículos', n; END IF;")
c_('')
ini2 = next(k for k, s in enumerate(L) if s.startswith('  -- 2) Claves'))
fin = L.index('COMMIT;')
C.extend(L[ini2:fin - 2])
c_(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}' AND encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido")
c_("    AND position(E'\\r' IN contenido) = 0;")
c_("  IF n <> 19 THEN RAISE EXCEPTION 'postcondición: sha256(contenido) = hash_contenido y sin CR en solo % de 19 filas', n; END IF;")
C.extend(L[fin - 2:fin + 1])
C.extend(L[fin + 1:])

# ── Resolución del CLO sobre el art. 11 (PASAJES_134_141.md §6), aparte de la v7.
RES = ('RESUELTO_CLO_2026_11_18 (Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho, 2026-11-18): el art. 11 del D.35-2013 deroga '
       'íntegramente el art. 134 del D.73-96 («Artículos» es plural tipográfico; el delito de explotación económica pasa al art. 179-F del '
       'Código Penal, adicionado por el art. 8 del mismo decreto) y los literales ch), d), e) y f) del art. 141 del D.73-96, que queda con a), b) '
       'y c) por el art. 1. Las notas 23 y 24 del consolidado A03 son un error editorial de atribución. Base: La Gaceta 33,222 (ejemplares TSC '
       'y CEDIJ) y fuente orientativa del D.73-96 (15e3875d…); el cotejo con La Gaceta 28,053 se reserva para D1–D2 de HN:CODIGO_NINEZ '
       '(PASAJES_134_141.md §6).')
MOTIVO = ('DISPOSICION_DEROGATORIA: deroga los arts. 62–82, 134 (íntegro), 170 y 171 y los literales ch)–f) del art. 141 del D.73-96 '
          '(resuelto por el CLO el 2026-11-18, PASAJES_134_141.md §6); se mantiene CONTEXT por el reparto 11/8 de D5 '
          '(ADJUDICACION_CLO_D35_2013 §7)')
ID11, ID1 = f'{LOTE}:DECRETO_35_2013:11', f'{LOTE}:DECRETO_35_2013:1'
S = []
s_ = S.append
s_('-- ═══════════════════════════════════════════════════════════════════════════════════════════')
s_(f'-- SOLO STAGING (mayalexhn-staging, aicakncgtuiiuomflkqj) · lote {LOTE} · HN:DECRETO_35_2013 · art. 11')
s_('-- Resolución del CLO (2026-11-18) sobre los puntos (a)–(d) de los arts. 134 y 141 (PASAJES_134_141.md §6).')
s_('-- Art. 11: la constancia INTERPRETACION_PENDIENTE_CLO pasa a RESUELTO_CLO_2026_11_18. Art. 1: su constancia (C07) NO cambia.')
s_('-- No cambia rol (11 CONTEXT), visibilidad, vigencia, estado_v ni texto. Se aplica DESPUÉS de la actualización v7.')
s_('-- PRODUCCIÓN: NO APLICAR.')
s_('-- ═══════════════════════════════════════════════════════════════════════════════════════════')
s_('BEGIN;')
s_('DO $do$')
s_('DECLARE n int;')
s_('BEGIN')
s_(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}' AND metadata->>'transcripcion_sha256' = '{SHA_V7}';")
s_("  IF n <> 19 THEN RAISE EXCEPTION 'precondición: la actualización v7 no está aplicada (% de 19 en v7)', n; END IF;")
s_(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE id = {lit(ID11)} AND metadata->>'interpretacion_pendiente_clo' LIKE 'INTERPRETACION_PENDIENTE_CLO: alcance de la derogación de los arts. 134 y 141%';")
s_("  IF n <> 1 THEN RAISE EXCEPTION 'precondición: el art. 11 no tiene la constancia pendiente esperada'; END IF;")
s_(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE id = {lit(ID1)} AND metadata->>'interpretacion_pendiente_clo' LIKE 'INTERPRETACION_PENDIENTE_CLO (C07)%';")
s_("  IF n <> 1 THEN RAISE EXCEPTION 'precondición: el art. 1 no tiene la constancia C07 esperada'; END IF;")
s_(f"  UPDATE public.biblioteca_vectores SET metadata = (metadata - 'interpretacion_pendiente_clo') || jsonb_build_object(")
s_(f"      'interpretacion_estado', 'RESUELTO_CLO_2026_11_18',")
s_(f"      'interpretacion_resuelta_clo', {lit(RES)},")
s_(f"      'interpretacion_pendiente_clo_anterior', metadata->>'interpretacion_pendiente_clo',")
s_(f"      'motivo_rol', {lit(MOTIVO)})")
s_(f"  WHERE id = {lit(ID11)} AND ingest_batch = '{LOTE}' AND metadata ? 'interpretacion_pendiente_clo';")
s_(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}' AND metadata ? 'interpretacion_pendiente_clo';")
s_("  IF n <> 1 THEN RAISE EXCEPTION 'postcondición: se esperaba 1 constancia pendiente (art. 1) y hay %', n; END IF;")
s_(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}' AND metadata->>'interpretacion_estado' = 'RESUELTO_CLO_2026_11_18';")
s_("  IF n <> 1 THEN RAISE EXCEPTION 'postcondición: se esperaba 1 constancia resuelta (art. 11) y hay %', n; END IF;")
s_(f"  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}' AND metadata->>'rol' = 'CONTEXT';")
s_("  IF n <> 11 THEN RAISE EXCEPTION 'postcondición: CONTEXT alterado (%)', n; END IF;")
s_('END')
s_('$do$;')
s_('COMMIT;')
s_('')
s_('-- Verificación final (solo lectura): esperado 19 · 19 · 0 · 11 · 8 · 1 (art. 1) · 1 (art. 11).')
s_("SELECT count(*) FILTER (WHERE revision_pendiente = false AND es_norma_vigente AND metadata->>'estado_v' = 'V4' AND embedding IS NOT NULL) AS visibles_v4,")
s_(f"  count(*) FILTER (WHERE metadata->>'transcripcion_sha256' = '{SHA_V7}' AND encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido) AS en_v7,")
s_("  count(*) FILTER (WHERE contenido LIKE '%[ilegible]%') AS lagunas,")
s_("  count(*) FILTER (WHERE metadata->>'rol' = 'CONTEXT') AS context,")
s_("  count(*) FILTER (WHERE metadata->>'rol' IS NULL) AS fuente_principal,")
s_("  string_agg(split_part(id, ':', 3), ',') FILTER (WHERE metadata ? 'interpretacion_pendiente_clo') AS pendiente,")
s_("  string_agg(split_part(id, ':', 3), ',') FILTER (WHERE metadata->>'interpretacion_estado' = 'RESUELTO_CLO_2026_11_18') AS resuelta")
s_(f"FROM public.biblioteca_vectores WHERE ingest_batch = '{LOTE}';")
s_('')
s_('-- REVERSIÓN (solo por orden del CLO): vuelve a dejar pendiente la constancia del art. 11 con su texto y motivo anteriores.')
s_(f"-- UPDATE public.biblioteca_vectores SET metadata = (metadata - 'interpretacion_estado' - 'interpretacion_resuelta_clo' - 'interpretacion_pendiente_clo_anterior') || jsonb_build_object('interpretacion_pendiente_clo', metadata->>'interpretacion_pendiente_clo_anterior', 'motivo_rol', 'INTERPRETACION_PENDIENTE_CLO: alcance derogatorio sobre los arts. 134 y 141 del D.73-96 sin contrastar; solo contexto por decisión del CLO (ADJUDICACION_CLO_D35_2013 §7, D5)') WHERE id = {lit(ID11)} AND metadata->>'interpretacion_estado' = 'RESUELTO_CLO_2026_11_18';")

for nombre, lineas in [('actualizacion_v7_staging.sql', L), ('reversion_v7_a_v6_staging.sql', R),
                       ('actualizacion_v7_staging_compacta.sql', C), ('resolucion_art11_staging.sql', S)]:
    salida = 'out/a04-d35-2013-v7/' + nombre
    open(salida, 'w', encoding='utf-8', newline='\n').write('\n'.join(lineas) + '\n')
    print(salida, sha_file(salida))
