"""A03 · barrido de calidad de los 302 artículos del consolidado frente a la v7 firmada del D.35-2013 — paso 2: comparación.

Entrada:  segmentos.json de exportar_segmentos.ts (A03 validado contra los 302 hashes del candidato; v7 460e493d…).
Opcional: texto del D.73-96 original (fuente orientativa 15e3875d…, DISCOVERY_ONLY) para los artículos que el D.35-2013 no tocó.
Salida:   barrido_a03_v7.csv (una fila por artículo de A03 y una por artículo de la v7 ausente en A03) y resumen en stdout.

No decide nada ni escribe en ninguna base: clasifica y mide diferencias para que el CLO las revise.
Uso (raíz del repo): python -I <este archivo> <segmentos.json> <salida.csv> [texto_d73_96.txt]
"""
import csv
import difflib
import hashlib
import json
import re
import sys
import unicodedata
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')
seg = json.load(open(sys.argv[1], encoding='utf-8'))
salida = sys.argv[2]
ruta_1996 = sys.argv[3] if len(sys.argv) > 3 else None

# Lo que dispone el D.35-2013 sobre el Código de la Niñez (v7; resolución del CLO del 2026-11-18 sobre el art. 11).
DEROGADOS_ART11 = {str(n) for n in range(62, 83)} | {'134', '170', '171'}
LITERALES_141 = 'ch), d), e) y f) del art. 141 (art. 11; resolución del CLO 2026-11-18)'
D130_2017 = {'21'}  # C07: reformado por el D.35-2013 y derogado después por el D.130-2017 (art. 632, num. 12), sin cotejar

internos = {x['numero']: x for x in seg['v7']['internos']}
reformados = {k for k, x in internos.items() if x['articulo_decreto'] == '1'}
adicionados = {k for k, x in internos.items() if x['articulo_decreto'] == '3'}
notas_por_art = {}
for n in seg['a03']['notas']:
    notas_por_art.setdefault(n['referido'].split(' ')[0], []).append(n['texto'])


RUIDO = re.compile(r'www\.poderjudicial\.gob\.hn')  # pie de página de la edición CEDIJ que la extracción mete en el texto (A03)
# Rótulos de la división SIGUIENTE que el segmentador deja pegados al final del artículo («… Título. SECCION PRIMERA DE LA NIÑEZ …29»).
RÓTULO_FINAL = re.compile(r'\s(?:LIBRO|T[IÍ]TULO|CAP[IÍ]TULO|SECCI[OÓ]N|"?\s*C[OÓ]DIGO)\b[^a-záéíóúñ]*$')  # «CÓDIGO DE FAMILIA»: rótulo del decreto tras el art. 280-A
JNBS = re.compile(r'Junta\s+Nacional\s+de\s+Bienestar\s+Social', re.I)


def n0(s):
    s = unicodedata.normalize('NFC', s).replace('\r', '').replace('­', '')
    s = RUIDO.sub(' ', s)
    s = re.sub(r'[“”«»„]', '"', s)
    s = re.sub(r'(\w)-\n(\w)', r'\1\2', s)          # guion de fin de renglón
    s = re.sub(r'\s+', ' ', s).strip()
    s = RÓTULO_FINAL.sub('', s)
    return s.strip('" ').strip()


def n1(s):
    s = unicodedata.normalize('NFD', n0(s).lower())
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r'[^\w ]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def comparar(a, b):
    if n0(a) == n0(b):
        return 'IDENTICO', 1.0, ''
    if n1(a) == n1(b):
        return 'IGUAL_SALVO_FORMATO', 1.0, ''
    # Similitud sobre palabras sin mayúsculas, tildes ni puntuación (lo sustantivo); el diff se muestra con el texto real (n0).
    r = difflib.SequenceMatcher(None, n1(a).split(' '), n1(b).split(' '), autojunk=False).ratio()
    wa, wb = n0(a).split(' '), n0(b).split(' ')
    sm = difflib.SequenceMatcher(None, wa, wb, autojunk=False)
    cambios = []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op != 'equal':
            cambios.append(f"{op}: «{' '.join(wa[i1:i2])[:80]}» → «{' '.join(wb[j1:j2])[:80]}»")
        if len(cambios) == 3:
            break
    return ('DIFIERE_MENOR' if r >= 0.97 else 'DIFIERE'), round(r, 4), ' | '.join(cambios)


texto_1996, sha_1996 = {}, None
if ruta_1996:
    t = open(ruta_1996, encoding='utf-8-sig').read().replace('\r\n', '\n')
    sha_1996 = hashlib.sha256(t.encode()).hexdigest()
    hs = list(re.finditer(r'(?m)^[ \t]*Art[íi]culo[ \t]+(\d{1,3})\.-', t))
    for i, m in enumerate(hs):
        fin = hs[i + 1].start() if i + 1 < len(hs) else len(t)
        texto_1996.setdefault(m.group(1), t[m.end():fin])

filas = []
for a in seg['a03']['articulos']:
    num, txt = a['numero'], a['texto']
    notas = notas_por_art.get(num, [])
    if notas:  # A03 deja al comienzo del artículo el número de llamada de su nota al pie («1 Para todos…»): no es texto del artículo
        txt = re.sub(r'^\s*\d{1,3}\s+(?=[^\d\s)])', '', txt)
    cita35 = any('35-2013' in x for x in notas)
    derog_a03 = bool(re.match(r'^\W*derogad[oa]', n1(txt))) or (len(n0(txt)) < 40 and 'derogad' in n1(txt))
    fila = {'numero': num, 'ordinal': a['ordinal'], 'sha256_a03': a['sha256'], 'caracteres_a03': len(txt),
            'notas_a03': len(notas), 'nota_cita_d35_2013': 'si' if cita35 else 'no', 'accion_d35_2013': '', 'referencia': '',
            'estado': '', 'similitud': '', 'diferencias': '', 'observacion': ''}
    if num in D130_2017:
        fila.update(accion_d35_2013='REFORMA (art. 1)', referencia='v7 art. 1',
                    estado='DEROGADO_POSTERIOR_D130_2017' if derog_a03 else 'REVISAR_D130_2017',
                    observacion='C07: reformado por el D.35-2013 y derogado después por el D.130-2017 (sin cotejar); pendiente del CLO')
    elif num in DEROGADOS_ART11:
        fila.update(accion_d35_2013='DEROGA (art. 11)', referencia='v7 art. 11',
                    estado='DEROGADO_CONCUERDA' if derog_a03 else 'DEROGADO_EN_D35_PERO_A03_CONSERVA_TEXTO')
        if num == '134':
            fila['observacion'] = 'Resolución del CLO 2026-11-18: el art. 134 queda derogado íntegro; A03 (notas 23 y 24) solo anota ch) y d)'
    elif num in reformados:
        e, r, dif = comparar(txt, internos[num]['texto'])
        fila.update(accion_d35_2013='REFORMA (art. 1)', referencia='v7 art. 1', estado=e, similitud=r, diferencias=dif)
        if num == '141':
            fila['observacion'] = f'Además, el art. 11 deroga los literales {LITERALES_141}'
    elif num in adicionados:
        e, r, dif = comparar(txt, internos[num]['texto'])
        fila.update(accion_d35_2013='ADICIONA (art. 3)', referencia='v7 art. 3', estado=e, similitud=r, diferencias=dif)
    else:
        fila['accion_d35_2013'] = 'NO_TOCADO'
        if derog_a03:
            fila.update(estado='A03_DEROGADO_SIN_BASE_EN_D35', observacion='A03 lo marca derogado y el D.35-2013 no lo deroga: buscar el acto')
        elif num in texto_1996:
            e, r, dif = comparar(txt, texto_1996[num])
            fila.update(referencia='D.73-96 original (orientativo)', estado='ORIENTATIVO_' + e, similitud=r, diferencias=dif)
            if JNBS.search(texto_1996[num]) and e not in ('IDENTICO', 'IGUAL_SALVO_FORMATO'):
                # Art. 280-A (adicionado por el D.35-2013): toda referencia a la Junta Nacional de Bienestar Social se entiende hecha al IHNFA.
                e2, r2, dif2 = comparar(txt, JNBS.sub('Instituto Hondureño de la Niñez y la Familia', texto_1996[num]))
                if r2 > r:
                    fila.update(estado='ORIENTATIVO_' + e2, similitud=r2, diferencias=dif2,
                                observacion='A03 sustituye «Junta Nacional de Bienestar Social» por el IHNFA (art. 280-A del D.35-2013); comparado tras esa sustitución')
        else:
            fila['estado'] = 'SIN_REFERENCIA'
    if cita35 and fila['accion_d35_2013'] == 'NO_TOCADO':
        fila['observacion'] = (fila['observacion'] + ' · ' if fila['observacion'] else '') + 'A03 cita el D.35-2013 pero la v7 no lo toca'
    if not cita35 and fila['accion_d35_2013'].startswith(('REFORMA', 'ADICIONA')) and num not in D130_2017:
        fila['observacion'] = (fila['observacion'] + ' · ' if fila['observacion'] else '') + 'A03 no tiene nota que cite el D.35-2013'
    filas.append(fila)

presentes = {a['numero'] for a in seg['a03']['articulos']}
for num in sorted(set(internos) - presentes, key=lambda x: (int(re.match(r'\d+', x).group()), x)):
    filas.append({'numero': num, 'ordinal': '', 'sha256_a03': '', 'caracteres_a03': 0, 'notas_a03': 0, 'nota_cita_d35_2013': '',
                  'accion_d35_2013': 'REFORMA (art. 1)' if num in reformados else 'ADICIONA (art. 3)', 'referencia': 'v7',
                  'estado': 'FALTA_EN_A03', 'similitud': '', 'diferencias': '', 'observacion': 'Artículo de la v7 que A03 no contiene'})

with open(salida, 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(filas[0]), lineterminator='\n')
    w.writeheader()
    w.writerows(filas)

print(f'filas: {len(filas)} (A03: {len(seg["a03"]["articulos"])}) · v7: {len(reformados)} reformados, {len(adicionados)} adicionados'
      f' · 1996: {len(texto_1996)} artículos (sha256 del texto {sha_1996})')
for k, v in sorted(Counter((x['accion_d35_2013'].split(' ')[0], x['estado']) for x in filas).items()):
    print(f'{v:4d}  {k[0]:<10} {k[1]}')
print('observaciones:', Counter(o.split(':')[0] for x in filas for o in x['observacion'].split(' · ') if o).most_common())
print(hashlib.sha256(open(salida, 'rb').read()).hexdigest(), salida)
