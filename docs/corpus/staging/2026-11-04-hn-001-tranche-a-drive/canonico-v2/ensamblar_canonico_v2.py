"""HN:CODIGO_NINEZ · texto canónico v2: v1 (69760d6a…) + dictamen del CLO del 2026-11-18 sobre los 141 artículos no tocados
(../canonico-v1/AUDITORIA_NO_TOCADOS_V1.md, firmado).

Cambios respecto de la v1 (solo en los 141 artículos A03; los 137 de la v8 y los 24 derogados no se tocan):
  1. Correcciones dictaminadas «mantener 1996» (cada una debe aparecer exactamente una vez):
     art. 35 «escuelas gratuitas» → «escuelas públicas gratuitas»; art. 125 b) «El mayor de (16)» → «El mayor de dieciséis (16)» y
     art. 125 c) «menores de diez y ocho (18)» → «menores de dieciocho (18)»;
     art. 156 «situación previa» → «situación prevista»; art. 159 «el Instituto de la Niñez» → «el Instituto Hondureño de la Niñez»;
     art. 275 «y, d) Deba» → «y, ch) Deba».
  2. Fuga de nota al pie de A03 en el art. 284: se elimina.
  3. Espacios pegados por la extracción del PDF de A03 («Despachosde», «ch)La»): se INSERTAN espacios donde el texto de 1996 separa las mismas
     letras. Nunca se quita ni se cambia una letra: se verifica que el texto sin espacios de cada artículo no cambia.
  Lo demás (categorías a, b, c y las 17 lecturas v1 de la d) queda como en la v1, aprobado por el CLO.

Uso (raíz del repo): python -I <este archivo> <texto_d73_96.txt (44c5fbe1…)> <dir_salida>
"""
import difflib
import hashlib
import json
import re
import sys
import unicodedata
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')
SHA_V1 = '69760d6a56c5f2b32d3eb111bdb863f7f018a1be04a9692f8bc51010ccda6064'
SHA_1996 = '44c5fbe1770391ce21317bde14f41116e12d9de2a8ee17d4ee2e57ba4c06fb5d'
FIRMA = 'Abg. y Not. Fredy Omar Pinel Flores (propietario_despacho, CLO / Director Maya Lex), 2026-11-18'
V1 = 'docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v1/'
salida = sys.argv[2].rstrip('/')

t1 = open(V1 + 'HN_CODIGO_NINEZ_canonico_v1.txt', encoding='utf-8', newline='').read().replace('\r\n', '\n')
if hashlib.sha256(t1.encode()).hexdigest() != SHA_V1:
    sys.exit('la v1 no es 69760d6a…')
src = open(sys.argv[1], encoding='utf-8-sig').read().replace('\r\n', '\n')
if hashlib.sha256(src.encode()).hexdigest() != SHA_1996:
    sys.exit('el texto de 1996 no es 44c5fbe1…')
man1 = json.load(open(V1 + 'HN_CODIGO_NINEZ_canonico_v1_manifiesto.json', encoding='utf-8'))
audit = {r.split(',')[0]: r.split(',')[1] for r in open(V1 + 'auditoria_no_tocados_v1.csv', encoding='utf-8').read().splitlines()[1:]}

arts = [(re.match(r'Artículo (\S+?)\.- ', a).group(1), a.split('.- ', 1)[1]) for a in re.split(r'\n\n(?=Artículo \d)', t1.strip())]
hs = list(re.finditer(r'(?m)^[ \t]*Art[íi]culo[ \t]+(\d{1,3})\.-', src))
o1996 = {}
for i, m in enumerate(hs):
    o1996.setdefault(m.group(1), src[m.end():hs[i + 1].start() if i + 1 < len(hs) else len(src)])
RÓTULO_FINAL = re.compile(r'\s(?:LIBRO|T[IÍ]TULO|CAP[IÍ]TULO|SECCI[OÓ]N)\b[^a-záéíóúñ]*$')
IHNFA = 'Instituto Hondureño de la Niñez y la Familia'
JNBS = [(re.compile(r'\b([Dd])e la Junta Nacional de Bienestar Social'), lambda m: f'{m.group(1)}el {IHNFA}'),
        (re.compile(r'\b([Aa]) la Junta Nacional de Bienestar Social'), lambda m: f'{m.group(1)}l {IHNFA}'),
        (re.compile(r'\b([Ll])a Junta Nacional de Bienestar Social'), lambda m: ('E' if m.group(1) == 'L' else 'e') + f'l {IHNFA}'),
        (re.compile(r'Junta Nacional de Bienestar Social'), lambda m: IHNFA)]

CORRECCIONES = {
    '35': [('escuelas gratuitas', 'escuelas públicas gratuitas')],
    '125': [('b) El mayor de (16) años', 'b) El mayor de dieciséis (16) años'),
            ('menores de diez y ocho (18)', 'menores de dieciocho (18)')],  # inciso c): dictamen del CLO del 2026-11-18 (segundo)
    '156': [('en la situación previa en esta', 'en la situación prevista en esta')],
    '159': [('el Instituto de la Niñez y la Familia', 'el Instituto Hondureño de la Niñez y la Familia')],
    '275': [('y, d) Deba darse', 'y, ch) Deba darse')],
    '284': [(' el Diario Oficial La Gaceta No. 33,222 de fecha 6 de septiembre de 2013.', '')],
}
MOTIVO = {'35': 'mantener 1996', '125': 'mantener 1996 (incisos b y c)', '156': 'mantener 1996 (errata «previa» de A03)',
          '159': 'denominación legal completa (art. 280-A)', '275': 'mantener 1996 (literal ch)', '284': 'fuga de nota al pie de A03'}


def k(c):
    c = unicodedata.normalize('NFD', c.lower())
    return re.sub(r'[^\w]', '', ''.join(x for x in c if not unicodedata.combining(x)))


def sin_espacios(s):
    return ''.join(k(c) for c in s)


def limites(s):
    """Para cada carácter alfanumérico (por índice) dice si en `s` hay un espacio antes del SIGUIENTE alfanumérico."""
    claves, corte, visto_espacio = [], [], False
    for c in s:
        kk = k(c)
        if c.isspace():
            visto_espacio = True
        elif kk:
            for _ in kk:
                if claves:
                    corte.append(visto_espacio)
                claves.append(_)
            visto_espacio = False
    return ''.join(claves), corte  # corte[i]: espacio entre el alfanumérico i y el i+1


def insertar_espacios(v1_span, ref_span):
    """Inserta en v1_span un espacio antes de cada alfanumérico que en ref_span empieza palabra nueva y en v1_span no."""
    ka, ca = limites(v1_span)
    kb, cb = limites(ref_span)
    if ka != kb:
        return v1_span
    out, idx, prev_alnum = [], -1, False
    for c in v1_span:
        if k(c):
            if idx >= 0 and cb[idx] and not ca[idx]:
                out.append(' ')
            idx += len(k(c))
        out.append(c)
    return ''.join(out)


def arreglar_espacios(texto, ref):
    toks = list(re.finditer(r'\S+', texto))
    A = [k(''.join(m.group(0))) for m in toks]
    B_toks = [x for x in re.sub(r'\s+', ' ', ref).split(' ') if x]
    B = [k(x) for x in B_toks]
    sm = difflib.SequenceMatcher(None, A, B, autojunk=False)
    cambios, nuevo, cursor = [], [], 0
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op != 'replace' or i2 <= i1:
            continue
        span_a = texto[toks[i1].start():toks[i2 - 1].end()]
        span_b = ' '.join(B_toks[j1:j2])
        if sin_espacios(span_a) != sin_espacios(span_b) or (i2 - i1) >= (j2 - j1):
            continue
        arreglado = insertar_espacios(span_a, span_b)
        if arreglado != span_a:
            nuevo.append(texto[cursor:toks[i1].start()] + arreglado)
            cursor = toks[i2 - 1].end()
            cambios.append(f'«{span_a}» → «{arreglado}»')
    nuevo.append(texto[cursor:])
    res = ''.join(nuevo)
    if sin_espacios(res) != sin_espacios(texto):
        sys.exit('el arreglo de espacios cambió letras')
    return res, cambios


det1 = {m['numero']: m for m in man1['articulos_detalle']}
salida_arts, detalle, total_espacios = [], [], 0
for num, txt in arts:
    m = dict(det1[num])
    if m['estado'] == 'A03_PENDIENTE_VERIFICACION':
        r96 = RÓTULO_FINAL.sub('', unicodedata.normalize('NFC', re.sub(r'\s+', ' ', o1996[num]))).strip()
        b = r96
        for rx, f in JNBS:
            b = rx.sub(f, b)
        aplicadas = []
        for buscar, reemplazar in CORRECCIONES.get(num, []):
            if txt.count(buscar) != 1:
                sys.exit(f'art. {num}: «{buscar}» no aparece exactamente una vez')
            txt = txt.replace(buscar, reemplazar)
            aplicadas.append({'buscar': buscar, 'reemplazar': reemplazar, 'motivo': MOTIVO[num], 'firma': FIRMA})
        # Referencia para los espacios: 1996 y, si hay Junta Nacional de Bienestar Social, también 1996 con la sustitución del art. 280-A.
        txt, espacios = arreglar_espacios(txt, r96)
        if b != r96:
            txt, mas = arreglar_espacios(txt, b)
            espacios += mas
        total_espacios += len(espacios)
        m['estado'] = 'TEXTO_A03_DICTAMINADO_CLO'
        m['categoria_auditoria'] = audit[num]
        m['fuente'] = 'A03_CONSOLIDADO_DICTAMINADO'
        if aplicadas:
            m['correcciones_clo'] = aplicadas
        if espacios:
            m['espacios_insertados'] = espacios
    for clave in ('sha256', 'caracteres'):
        m.pop(clave, None)
    txt = unicodedata.normalize('NFC', txt)
    m['sha256'] = hashlib.sha256(f'{num}\n{txt}'.encode()).hexdigest()
    m['caracteres'] = len(txt)
    # Encabezado «Artículo N.» (como A03): segmentarArticulos lo separa limpio; con «N.-» dejaría «- » al inicio del cuerpo.
    salida_arts.append(f'Artículo {num}. {txt}')
    detalle.append(m)

texto = '\n\n'.join(salida_arts) + '\n'
if '\r' in texto or 'poderjudicial' in texto or '[ilegible]' in texto or 'Diario Oficial La Gaceta No. 33,222 de fecha' in texto:
    sys.exit('la v2 contiene CR, pie del CEDIJ, lagunas o fugas de notas')
open(f'{salida}/HN_CODIGO_NINEZ_canonico_v2.txt', 'w', encoding='utf-8', newline='\n').write(texto)
sha = hashlib.sha256(texto.encode()).hexdigest()
conteo = dict(sorted(Counter(m['estado'] for m in detalle).items()))
manifiesto = {
    'instrumento': 'HN:CODIGO_NINEZ', 'version': 'canonico-v2', 'estado': 'TEXTO_DEFINITIVO_FIRMA_D3',
    'advertencia': ('v2 = v1 (69760d6a…) + dictamen del CLO ' + FIRMA + ' sobre los 141 artículos no tocados por el D.35-2013 '
                    '(AUDITORIA_NO_TOCADOS_V1.md): 5 correcciones «mantener 1996», fuga del art. 284 eliminada y espacios pegados normalizados. '
                    'Firma D3 sobre este sha256 el 2026-11-18 (incluye el art. 125 c, segundo dictamen). Pliego D1–D8 firmado el 2026-11-18 '
                    '(ADJUDICACION_CLO_CODIGO_NINEZ.md): D1 (b), los 141 artículos de A03 con reserva y solo CONTEXT.'),
    'base': {'archivo': '../canonico-v1/HN_CODIGO_NINEZ_canonico_v1.txt', 'sha256': SHA_V1},
    'cotejo_1996': {'archivo_doc_sha256': '15e3875d835d8be9ed1029cf6c2d3bf8e5635e68e58b70e62e184a410b9c90ce', 'texto_sha256': SHA_1996,
                    'estado': 'UNVERIFIED / DISCOVERY_ONLY'},
    'firma_d3': {'firmante': 'Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)',
                 'fecha': '2026-11-18', 'rol': 'propietario_despacho', 'sha256_lf': sha, 'dictamenes': ['../barrido-v7/HOJA_DECISION_A03_DIFIERE_V8.md', '../canonico-v1/AUDITORIA_NO_TOCADOS_V1.md']},
    'texto_sha256': sha, 'caracteres': len(texto), 'articulos': len(detalle), 'conteo_por_estado': conteo,
    'espacios_insertados_total': total_espacios,
    'correcciones_clo': [{'articulo': '96', 'buscar': 'Juegos artificiales', 'reemplazar': 'Fuegos artificiales', 'motivo': 'errata de imprenta de La Gaceta 33,222', 'firma': FIRMA}]
                       + [{'articulo': n, 'buscar': b, 'reemplazar': r, 'motivo': MOTIVO[n], 'firma': FIRMA} for n, lst in CORRECCIONES.items() for b, r in lst],
    'pendiente': ['C07 (art. 21)',
                  'Preámbulo y rótulos de Libros/Títulos/Capítulos/Secciones', 'Cotejo de La Gaceta 28,053 y PDF CEDIJ para los 141 artículos con reserva D1 (b)'],
    'notas_editoriales': '../canonico-v1/HN_CODIGO_NINEZ_notas_editoriales_A03.json',
    'articulos_detalle': detalle,
}
open(f'{salida}/HN_CODIGO_NINEZ_canonico_v2_manifiesto.json', 'w', encoding='utf-8', newline='\n').write(json.dumps(manifiesto, ensure_ascii=False, indent=1) + '\n')
print(f'v2 {sha} · {len(texto)} caracteres · {len(detalle)} artículos · {conteo} · espacios insertados: {total_espacios}')
for n in ['HN_CODIGO_NINEZ_canonico_v2.txt', 'HN_CODIGO_NINEZ_canonico_v2_manifiesto.json']:
    print(hashlib.sha256(open(f'{salida}/{n}', 'rb').read()).hexdigest(), n)
