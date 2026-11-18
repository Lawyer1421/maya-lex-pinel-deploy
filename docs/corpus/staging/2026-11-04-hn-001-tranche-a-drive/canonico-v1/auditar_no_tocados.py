"""HN:CODIGO_NINEZ · auditoría de los 141 artículos A03_PENDIENTE_VERIFICACION de la v1 frente al texto original del D.73-96 (1996).

Fuente de comparación: .doc de la Biblioteca Electrónica del Poder Judicial (© 1997), archivo 15e3875d… (FUENTE_ORIENTATIVA_D73_96_ORIGINAL.md),
texto extraído (UTF-8) 44c5fbe1… — orientativo, DISCOVERY_ONLY. No se versiona: se pasa por argumento y se verifica su hash.

Clasificación determinista (una categoría principal por artículo; las diferencias se listan todas):
  a) IDENTICO_O_FORMATO        igual sin mayúsculas, tildes, puntuación ni espacios (incluye palabras pegadas por la extracción de A03).
  b) SUSTITUCION_280A          igual tras sustituir en 1996 «(la|a la|de la) Junta Nacional de Bienestar Social» por «(el|al|del) Instituto
                               Hondureño de la Niñez y la Familia» (art. 280-A, adicionado por el D.35-2013).
  c) SECRETARIAS_DE_ESTADO     alguna diferencia es un nombre de Secretaría de Estado (Previsión→Seguridad Social, Gobernación y Justicia→Interior
                               y Población, «Salud Pública y Asistencia Social»→«Salud»…). Se listan también las demás diferencias del artículo.
  d) DIFERENCIA_TEXTUAL        el resto: diferencias de palabras que el CLO debe calificar (errata de 1996 corregida o reforma que requiere decreto).
  Marca adicional FUGA_NOTA_A03 si el texto de la v1 contiene una nota al pie de A03 («…Diario Oficial La Gaceta No. …»).

Uso (raíz del repo): python -I <este archivo> <texto_d73_96.txt> <salida.csv> <salida.md>
"""
import csv
import difflib
import hashlib
import json
import re
import sys
import unicodedata

sys.stdout.reconfigure(encoding='utf-8')
SHA_1996_TXT = '44c5fbe1770391ce21317bde14f41116e12d9de2a8ee17d4ee2e57ba4c06fb5d'
C = 'docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v1/'
SHA_V1 = '69760d6a56c5f2b32d3eb111bdb863f7f018a1be04a9692f8bc51010ccda6064'

texto_v1 = open(C + 'HN_CODIGO_NINEZ_canonico_v1.txt', encoding='utf-8').read()
if hashlib.sha256(texto_v1.encode()).hexdigest() != SHA_V1:
    sys.exit('la v1 no es 69760d6a…')
src = open(sys.argv[1], encoding='utf-8-sig').read().replace('\r\n', '\n')
if hashlib.sha256(src.encode()).hexdigest() != SHA_1996_TXT:
    sys.exit('el texto de 1996 no es 44c5fbe1…')
man = json.load(open(C + 'HN_CODIGO_NINEZ_canonico_v1_manifiesto.json', encoding='utf-8'))
v1 = {re.match(r'Artículo (\S+?)\.- ', a).group(1): a.split('.- ', 1)[1] for a in re.split(r'\n\n(?=Artículo \d)', texto_v1.strip())}
pend = [m['numero'] for m in man['articulos_detalle'] if m['estado'] == 'A03_PENDIENTE_VERIFICACION']
hs = list(re.finditer(r'(?m)^[ \t]*Art[íi]culo[ \t]+(\d{1,3})\.-', src))
o1996 = {}
for i, m in enumerate(hs):
    o1996.setdefault(m.group(1), src[m.end():hs[i + 1].start() if i + 1 < len(hs) else len(src)])

RÓTULO_FINAL = re.compile(r'\s(?:LIBRO|T[IÍ]TULO|CAP[IÍ]TULO|SECCI[OÓ]N)\b[^a-záéíóúñ]*$')
FUGA = re.compile(r'(?:el\s+)?(?:Diario\s+)?Oficial\s+La\s+Gaceta\s+No\.\s*[\d,]+\s+de\s+fecha[^.]*\.')
IHNFA = 'Instituto Hondureño de la Niñez y la Familia'
JNBS = [(re.compile(r'\b([Dd])e la Junta Nacional de Bienestar Social'), lambda m: f'{m.group(1)}el {IHNFA}'),
        (re.compile(r'\b([Aa]) la Junta Nacional de Bienestar Social'), lambda m: f'{m.group(1)}l {IHNFA}'),
        (re.compile(r'\b([Ll])a Junta Nacional de Bienestar Social'), lambda m: ('E' if m.group(1) == 'L' else 'e') + f'l {IHNFA}'),
        (re.compile(r'Junta Nacional de Bienestar Social'), lambda m: IHNFA)]
SECRETARIA = {'prevision', 'seguridad', 'gobernacion', 'interior', 'justicia', 'poblacion', 'publica', 'asistencia', 'social', 'salud',
              'trabajo', 'educacion', 'y', 'de', 'la', 'del', 'despachos', 'despacho', 'secretaria', 'secretarias', 'estado', 'en', 'los', 'ramos'}
NUCLEO = {'prevision', 'seguridad', 'gobernacion', 'interior', 'justicia', 'poblacion', 'publica', 'asistencia'}


def limpio1996(s):
    s = unicodedata.normalize('NFC', re.sub(r'\s+', ' ', s.replace('\t', ' '))).strip()
    return RÓTULO_FINAL.sub('', s).strip()


def con_280a(s):
    for rx, f in JNBS:
        s = rx.sub(f, s)
    return s


def k(w):
    w = unicodedata.normalize('NFD', w.lower())
    return re.sub(r'[^\w]', '', ''.join(c for c in w if not unicodedata.combining(c)))


def sin_espacios(s):
    return ''.join(k(c) for c in s)


def toks(s):
    s = re.sub(r'\s+\((a|as|o|os)\)', r'(\1)', re.sub(r'\s+', ' ', s))
    return [x for x in s.split(' ') if x and k(x)]


def ops(a, b):
    A, B = toks(a), toks(b)
    sm = difflib.SequenceMatcher(None, [k(x) for x in A], [k(x) for x in B], autojunk=False)
    res = []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == 'equal':
            continue
        x, y = ' '.join(A[i1:i2]), ' '.join(B[j1:j2])
        if sin_espacios(x) == sin_espacios(y):
            continue  # solo espacios (palabras pegadas por la extracción)
        res.append({'tipo': {'replace': 'cambia', 'delete': 'solo en 1996', 'insert': 'solo en v1'}[op], '1996': x, 'v1': y,
                    'antes': ' '.join(A[max(0, i1 - 6):i1]), 'despues': ' '.join(A[i2:i2 + 6])})
    return res


def es_secretaria(op):
    palabras = {k(w) for w in (op['1996'] + ' ' + op['v1']).split()} - {''}
    return bool(palabras) and palabras <= SECRETARIA and bool(palabras & NUCLEO)


filas = []
for n in pend:
    a96 = limpio1996(o1996[n])
    txt = v1[n]
    fuga = FUGA.search(txt)
    txt_c = FUGA.sub('', txt).strip() if fuga else txt
    if sin_espacios(a96) == sin_espacios(txt_c):
        cat, lista, ref = 'a_IDENTICO_O_FORMATO', [], '1996'
    else:
        b = con_280a(a96)
        if b != a96 and sin_espacios(b) == sin_espacios(txt_c):
            cat, lista, ref = 'b_SUSTITUCION_280A', [], '1996+280A'
        else:
            l_raw, l_280 = ops(a96, txt_c), ops(b, txt_c)
            lista, ref = (l_280, '1996+280A') if b != a96 and len(l_280) < len(l_raw) else (l_raw, '1996')
            cat = 'c_SECRETARIAS_DE_ESTADO' if any(es_secretaria(x) for x in lista) else 'd_DIFERENCIA_TEXTUAL'
    filas.append({'numero': n, 'categoria': cat, 'comparado_con': ref, 'aplica_280A': 'si' if ref == '1996+280A' else 'no',
                  'fuga_nota_a03': fuga.group(0) if fuga else '', 'diferencias': lista})

with open(sys.argv[2], 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f, lineterminator='\n')
    w.writerow(['numero', 'categoria', 'comparado_con', 'aplica_280A', 'fuga_nota_a03', 'n_diferencias', 'diferencias'])
    for r in filas:
        w.writerow([r['numero'], r['categoria'], r['comparado_con'], r['aplica_280A'], r['fuga_nota_a03'], len(r['diferencias']),
                    ' | '.join(f"{d['tipo']}: «{d['1996']}» → «{d['v1']}»" for d in r['diferencias'])])

from collections import Counter
cont = Counter(r['categoria'] for r in filas)
esc = lambda s: (s or '—').replace('|', '\\|')
L = ['# HN:CODIGO_NINEZ · auditoría de los 141 artículos no tocados por el D. 35-2013 (v1 frente al D. 73-96 de 1996)', '',
     f'**v1:** `{SHA_V1[:8]}…` · **1996:** `.doc` `15e3875d…`, texto `{SHA_1996_TXT[:8]}…` (orientativo, `DISCOVERY_ONLY`) · **Fecha:** 2026-11-18 · '
     '**Determinista** (`auditar_no_tocados.py`). No decide nada.', '',
     '| Categoría | Artículos |', '|---|---:|']
for c in ['a_IDENTICO_O_FORMATO', 'b_SUSTITUCION_280A', 'c_SECRETARIAS_DE_ESTADO', 'd_DIFERENCIA_TEXTUAL']:
    L.append(f'| {c} | {cont.get(c, 0)} |')
L += [f'| **Total** | **{len(filas)}** |', '']
for c, titulo in [('a_IDENTICO_O_FORMATO', 'a) Idénticos o solo formato'), ('b_SUSTITUCION_280A', 'b) Solo la sustitución del art. 280-A')]:
    L += [f'## {titulo} ({cont.get(c, 0)})', '', ', '.join(r['numero'] for r in filas if r['categoria'] == c), '']
for c, titulo in [('c_SECRETARIAS_DE_ESTADO', 'c) Actualización de Secretarías de Estado'), ('d_DIFERENCIA_TEXTUAL', 'd) Diferencias textuales')]:
    L += [f'## {titulo} ({cont.get(c, 0)})', '']
    for r in [x for x in filas if x['categoria'] == c]:
        L += [f"### Art. {r['numero']}" + (' · comparado tras la sustitución del art. 280-A' if r['aplica_280A'] == 'si' else ''), '',
              '| # | Tipo | Contexto (1996) | 1996 | v1 (A03) | Contexto siguiente |', '|---|---|---|---|---|---|']
        for i, d in enumerate(r['diferencias'], 1):
            marca = ' (Secretaría)' if es_secretaria(d) else ''
            L.append(f"| {i} | {d['tipo']}{marca} | …{esc(d['antes'])} | **{esc(d['1996'])}** | **{esc(d['v1'])}** | {esc(d['despues'])}… |")
        L += ['', 'Dictamen: ☐ Errata de 1996 corregida (se acepta la v1) · ☐ Reforma posterior: citar decreto ________ · ☐ Mantener el texto de 1996', '']
fugas = [r for r in filas if r['fuga_nota_a03']]
L += [f'## Fugas de notas al pie de A03 en la v1 ({len(fugas)})', '']
L += [f"- **Art. {r['numero']}:** «{r['fuga_nota_a03']}» — no es texto del artículo; debe quitarse en la v2." for r in fugas] or ['Ninguna.']
L += ['', '## Firma', '', 'Decide el CLO: ________________________ · Rol: ☐ propietario_despacho ☐ abogado_revisor_senior · Fecha: __________']
open(sys.argv[3], 'w', encoding='utf-8', newline='\n').write('\n'.join(L) + '\n')
print(dict(sorted(cont.items())), 'fugas:', [r['numero'] for r in fugas])
for p in sys.argv[2:4]:
    print(hashlib.sha256(open(p, 'rb').read()).hexdigest(), p)
