"""A03 · detalle de los artículos que DIFIEREN de la v7 (barrido_a03_v7.csv) más los cambios de una palabra señalados (arts. 5 y 96).

Para cada artículo: texto íntegro en A03 y en la v7 (La Gaceta 33,222), y la lista EXACTA de diferencias de contenido. Las palabras se
alinean sin mayúsculas, tildes ni puntuación, y las diferencias solo de formato se cuentan aparte. Genera la hoja de decisión del CLO.

Uso (raíz del repo): python -I <este archivo> <segmentos.json> <barrido_a03_v7.csv> <salida.md>
"""
import csv
import difflib
import json
import re
import sys
import unicodedata

sys.stdout.reconfigure(encoding='utf-8')
seg = json.load(open(sys.argv[1], encoding='utf-8'))
filas = list(csv.DictReader(open(sys.argv[2], encoding='utf-8')))
EXTRA = ['5', '96']  # cambios de una palabra señalados en el informe (DIFIERE_MENOR)

RUIDO = re.compile(r'www\.poderjudicial\.gob\.hn')
RÓTULO_FINAL = re.compile(r'\s(?:LIBRO|T[IÍ]TULO|CAP[IÍ]TULO|SECCI[OÓ]N|"?\s*C[OÓ]DIGO)\b[^a-záéíóúñ]*$')
notas = {n['referido'].split(' ')[0] for n in seg['a03']['notas']}


def limpio(s, numero=None):
    s = unicodedata.normalize('NFC', s).replace('\r', '').replace('­', '')
    if numero in notas:
        s = re.sub(r'^\s*\d{1,3}\s+(?=[^\d\s)])', '', s)
    s = RUIDO.sub(' ', s)
    s = re.sub(r'[“”«»„]', '"', s)
    s = re.sub(r'(\w)-\n(\w)', r'\1\2', s)
    s = re.sub(r'\s+', ' ', s).strip()
    s = RÓTULO_FINAL.sub('', s)
    return s.strip('" ').strip()


def clave(tok):
    t = unicodedata.normalize('NFD', tok.lower())
    return re.sub(r'[^\w]', '', ''.join(c for c in t if not unicodedata.combining(c)))


def tokens(s):
    # Una palabra por token. «niño (a)» y «niño(a)» son la misma forma: se quita el espacio antes del sufijo de género para no contar ruido.
    s = re.sub(r'\s+\((a|as|o|os|la|el|las|los)\)', r'(\1)', s, flags=re.I)
    return [t for t in re.split(r' ', s) if t]


def diferencias(a, b):
    ta, tb = tokens(a), tokens(b)
    ka, kb = [clave(t) for t in ta], [clave(t) for t in tb]
    # Tokens que quedan vacíos tras quitar puntuación («-», «;») se alinean como cualquier otro.
    sm = difflib.SequenceMatcher(None, ka, kb, autojunk=False)
    contenido, formato = [], 0
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == 'equal':
            formato += sum(1 for x, y in zip(ta[i1:i2], tb[j1:j2]) if x != y)
            continue
        ctx_a = ' '.join(ta[max(0, i1 - 5):i1])
        ctx_d = ' '.join(ta[i2:i2 + 5])
        contenido.append({'tipo': {'replace': 'cambia', 'delete': 'solo en A03', 'insert': f'solo en {REF}'}[op],
                          'a03': ' '.join(ta[i1:i2]), 'v7': ' '.join(tb[j1:j2]), 'antes': ctx_a, 'despues': ctx_d})
    return contenido, formato


REF = seg['v7'].get('version', 'v7')
SHA_REF = seg['v7']['sha256']
v7 = {x['numero']: x['texto'] for x in seg['v7']['internos']}
a03 = {a['numero']: a['texto'] for a in seg['a03']['articulos']}
sel = [f for f in filas if f['estado'] == 'DIFIERE' and f['referencia'].startswith(REF)]
sel += [f for f in filas if f['numero'] in EXTRA and f not in sel]

out = []
w = out.append
w(f'# A03 · Hoja de decisión del CLO: artículos que difieren de la {REF} del D. 35-2013')
w('')
w(f'**Fuente de A03:** consolidado `bd115673…` (procedencia NO ACREDITADA, `SOURCE_HOLD`) · **Referencia:** {REF} `{SHA_REF[:8]}…`, transcripción firmada (D3) de La Gaceta 33,222 · **Fecha:** 2026-11-18.')
w('')
w('> Lecturas generadas por comparación automática. **No deciden nada.** Para cada artículo, el CLO elige qué texto queda en el D3 canónico de `HN:CODIGO_NINEZ`:')
w(f'> ☐ **{REF}** (La Gaceta 33,222) · ☐ **A03** (consolidado) · ☐ **Otro** (redacción del CLO). Las diferencias de formato (mayúsculas, tildes, puntuación, espacios) se cuentan aparte y no se listan.')
w('')
w(f'Artículos: {len(sel)} ({len(sel) - len([f for f in sel if f["numero"] in EXTRA])} `DIFIERE` frente a la {REF} y los arts. 5 y 96, `DIFIERE_MENOR` con cambio de una palabra).')
w('')
resumen = []
for f in sel:
    n = f['numero']
    a, b = limpio(a03[n], n), limpio(v7[n])
    cont, fmt = diferencias(a, b)
    resumen.append((n, f['accion_d35_2013'], f['estado'], f['similitud'], len(cont), fmt))
    w(f'## Art. {n} · {f["accion_d35_2013"]} · {f["estado"]} (similitud {f["similitud"]})')
    w('')
    w(f'**Diferencias de contenido ({len(cont)})** · diferencias solo de formato: {fmt}')
    w('')
    w(f'| # | Tipo | Contexto previo | A03 | {REF} / La Gaceta 33,222 | Contexto siguiente |')
    w('|---|---|---|---|---|---|')
    for k, c in enumerate(cont, 1):
        esc = lambda s: (s or '—').replace('|', '\\|')
        w(f"| {k} | {c['tipo']} | …{esc(c['antes'])} | **{esc(c['a03'])}** | **{esc(c['v7'])}** | {esc(c['despues'])}… |")
    w('')
    w('<details><summary>Texto íntegro</summary>')
    w('')
    w(f'**A03:** {a}')
    w('')
    w(f'**{REF} (La Gaceta 33,222):** {b}')
    w('')
    w('</details>')
    w('')
    w(f'Decisión: ☐ {REF} · ☐ A03 · ☐ Otro: ____________________')
    w('')

w('## Resumen')
w('')
w('| Art. | Disposición | Estado | Similitud | Diferencias de contenido | Solo formato |')
w('|---|---|---|---:|---:|---:|')
for r in resumen:
    w(f'| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} | {r[5]} |')
w('')
w('## Firma')
w('')
w('Decide el CLO: ________________________ · Rol: ☐ propietario_despacho ☐ abogado_revisor_senior · Fecha: __________')
open(sys.argv[3], 'w', encoding='utf-8', newline='\n').write('\n'.join(out) + '\n')
print(json.dumps(resumen, ensure_ascii=False))
