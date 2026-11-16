"""Lista de cotejo D3 del A04 (Decreto 35-2013, La Gaceta 33,222), por artículo del decreto.

Compara, palabra por palabra y CONSERVANDO los guiones, el OCR del PDF del TSC (paquete 2026-11-16, text_sha256 f2c67cb4…) con una transcripción
candidata (v1 977f0489… o v2 25d7cc59…, siempre sobre bytes LF), ambos sin las líneas de encabezado de página. No corrige nada ni declara nada
cotejado: produce la lista de lo que una persona debe comprobar en la imagen de cada página.

Uso (desde la raíz del repositorio, con Python 3, sin dependencias):
  python -I docs/corpus/staging/2026-11-05-hn-001-a04-orientacion/transcripcion_candidata/generar_lista_cotejo_d3.py \
    docs/corpus/staging/2026-11-05-hn-001-a04-orientacion/transcripcion_candidata/A04_transcripcion_candidata_v2.txt
En un checkout de Windows con core.autocrlf=true el archivo del árbol de trabajo puede tener CRLF y otro hash: en ese caso, pasar la salida de
`git show HEAD:<ruta>` guardada en un archivo. El script rechaza un hash que no sea el de una candidata conocida.
"""
import csv, difflib, hashlib, json, re, sys
from collections import Counter
from pathlib import Path

LOTE = Path('docs/corpus/staging/2026-11-05-hn-001-a04-orientacion')
OCR_PAQUETE = Path('docs/corpus/inbox/2026-11-16-hn-001-a04-tsc/pending-review/HN-001-A04.fbd87f3396e5.json')
SHA_OCR = 'f2c67cb4a019a094cbacb4690323810e7215d0904297483b1a725a4dbb7fca0a'
CANDIDATAS = {
    '977f0489225d5cdf058f852b43b0f8af87b5db30f3128828386fcd2c17066355': 'v1',
    '25d7cc59fe3542df3d0de666eab4a47e217ef5398fe2bae6920f683168f40685': 'v2',
    'fa47cc72000a34c4dc56acc9af4ee53b32cc359f72202e4cddd56e0ca78c5b0e': 'v5',
    '7c8f40f844cc30f28f7bf6448151e995ed2df88bc3050a6f5b252a39709ce084': 'v6',
}
# La v5 ya no tiene saltos de página (\f): las páginas de cada artículo se toman de la v3, que sí los tiene y conserva los mismos artículos.
V3 = LOTE / 'transcripcion_candidata/A04_transcripcion_candidata_v3.txt'
SHA_V3 = 'f70d874b4e2f787f4551c722eb776cceda00f0a109a8993683d7c9aa56583abd'

# Correcciones firmadas por el CLO el 2026-11-16 (C01–C06), según la versión de la candidata.
FIRMADAS = {
    'v1': {
        5: 'C04 y C05: firmadas, sin aplicar',
        6: 'C06: lectura dual «11»/«511» firmada; carácter inicial de «11» abierto',
        10: 'C01: orden 7)/8) ya en la candidata; falta «A la»',
        11: 'C02 («67»): firmada, sin aplicar',
        14: 'C03 («334»): firmada, sin aplicar',
    },
    'v2': {
        5: 'C04 (123-F, «prohíbe») y C05 (207-F, «deudor(a)»): aplicadas',
        6: 'C06: lectura dual «11»/«511» (sin cambio); carácter inicial de «11» abierto',
        10: 'C01 («A la»): aplicada',
        11: 'C02 («67»): aplicada',
        14: 'C03 («334»): aplicada',
    },
    'v5': {
        5: 'C04 y C05 aplicadas; resolución del 2026-11-16 aplicada',
        6: 'C06: lectura dual «11»/«511» (sin cambio); pág. 41 resuelta (LECTURA_POR_CONTEXTO_CLO)',
        10: 'C01 aplicada',
        11: 'C02 aplicada',
        14: 'C03 aplicada; saltos de la lista verificados en el impreso',
    },
    'v6': {
        1: 'Resolución complementaria aplicada (G3–G9; recuadro editorial de la pág. 2 retirado)',
        5: 'C04 y C05 aplicadas; resolución del 2026-11-16 y complementaria aplicadas',
        6: 'C06: lectura dual «11»/«511» (sin cambio); pág. 41 resuelta y aplicada en el art. 6 (G1)',
        10: 'C01 aplicada',
        11: 'C02 aplicada; borde izquierdo de la pág. 45 (G2)',
        14: 'C03 aplicada; saltos de la lista verificados en el impreso',
    },
}

# Páginas que comparten dos o más artículos y tienen líneas en el borde derecho. Cada línea se asigna a UN artículo según la posición del rótulo
# del artículo siguiente, medida con `pdftotext -tsv` (Poppler 25.07) sobre el PDF fbd87f33… (página de 612 pt, columna derecha con x > 306):
#   pág. 27: «ARTÍCULO 2.-» en la columna derecha, y = 476 → el borde por encima es del art. 1; desde y = 476, del art. 2;
#   pág. 31: «ARTÍCULO 4.-» en la columna derecha, y = 629 → por encima, art. 3; desde y = 629, art. 4;
#   pág. 46: el acto termina en la columna IZQUIERDA (arts. 17–19 y firmas); la columna derecha es el acto siguiente: las líneas de su borde
#            derecho NO son del D.35-2013.
CORTES = {27: (476, 1, 2), 31: (629, 3, 4)}
FUERA_DEL_ACTO = {46}


def es_encabezado(linea: str) -> bool:
    s = linea.strip()
    c = re.sub(r'\s+', '', s).upper()
    if not s:
        return False
    if re.fullmatch(r'La (Gaceta|Caceta)|A\.(\s*\d{1,3})?|\d{1,3}|Secci[óo]n A Acuerdos y Leyes', s):
        return True
    # Variantes partidas o espaciadas del mismo encabezado («L a Gaceta», «- TEGUCIGA», «Secci», «Sección Á»).
    if c in {'LAGACETA', 'LACACETA', 'SECCI', 'SECCIÓNA', 'SECCIONA', 'SECCIÓNÁ'} or re.fullmatch(r'-?TEGUC\w*', c):
        return True
    if c.startswith('REP') and 'HONDURAS' in c and 'TEGUC' in c and len(c) < 40:
        return True
    if ('REPUBLICADEHONDURAS' in c or 'REPÚBLICADEHONDURAS' in c) and 'TEGUC' in c and len(c) < 60:
        return True  # p. ej. «A. 45L a Gaceta R E P U B L I C A D E HONDURAS - T E G U C I G A»
    if 'SEPTIEMBREDEL2013' in c and len(c) < 60:
        return True
    if re.fullmatch(r'No\.?\s*33,?222', s):
        return True
    return False


def articulos(texto: str):
    """Artículos propios del decreto, en secuencia 1, 2, 3…: los artículos citados de otras leyes («ARTÍCULO 973.-») no rompen la serie. Admite el rótulo espaciado del escaneo («A R T I C U L O 18.-»)."""
    pos, out = 0, []
    while True:
        k = len(out) + 1
        m = re.compile(r'(?m)^[ \t]*A\s*R\s*T\s*[ÍI]\s*C\s*U\s*L\s*O\s+' + str(k) + r'\b\s*\.\s*-?').search(texto, pos)
        if not m:
            break
        out.append((k, m.start()))
        pos = m.end()
    res = []
    for i, (k, ini) in enumerate(out):
        fin = out[i + 1][1] if i + 1 < len(out) else len(texto)
        res.append((k, ini, fin))
    return res


def rango_paginas(texto: str, ini: int, fin: int):
    return texto.count('\f', 0, ini) + 1, texto.count('\f', 0, max(ini, fin - 1)) + 1


def limpiar(fragmento: str):
    quitadas = 0
    lineas = []
    for l in fragmento.replace('\r\n', '\n').replace('\r', '\n').replace('\f', '\n').split('\n'):
        if es_encabezado(l):
            quitadas += 1
        else:
            lineas.append(l)
    return '\n'.join(lineas), quitadas


def asignar_borde(lineas_borde, rangos):
    """Cada línea del borde derecho a UN artículo (o fuera del acto). Falla si una línea queda sin asignar o en dos."""
    asignacion = {}
    for r in lineas_borde:
        p, y = int(r['pagina']), float(r['y_pt'])
        if p in FUERA_DEL_ACTO:
            asignacion[r['id']] = 'fuera'
            continue
        if p in CORTES:
            corte, antes, despues = CORTES[p]
            asignacion[r['id']] = despues if y >= corte else antes
            continue
        dueños = [k for k, (a, b) in rangos.items() if a <= p <= b]
        if len(dueños) != 1:
            raise SystemExit(f"la línea {r['id']} (pág. {p}) cae en {len(dueños)} artículos y no hay corte declarado")
        asignacion[r['id']] = dueños[0]
    assert len(asignacion) == len(lineas_borde)
    return asignacion


def main():
    cand_bytes = Path(sys.argv[1]).read_bytes()
    sha_cand = hashlib.sha256(cand_bytes).hexdigest()
    version = CANDIDATAS.get(sha_cand)
    if not version:
        sys.exit(f'la candidata ({sha_cand[:8]}…) no es una versión conocida (¿bytes CRLF? usar git show)')
    cand = cand_bytes.decode('utf-8')
    ocr = json.loads(OCR_PAQUETE.read_text(encoding='utf-8'))['extracted_text']
    if hashlib.sha256(ocr.encode('utf-8')).hexdigest() != SHA_OCR:
        sys.exit('el OCR no es f2c67cb4…')

    lineas_borde = list(csv.DictReader(open(LOTE / 'transcripcion_candidata/borde_derecho_88_lecturas.csv', encoding='utf-8')))
    ac, ao = articulos(cand), articulos(ocr)
    assert [k for k, _, _ in ac] == [k for k, _, _ in ao], 'la serie de artículos difiere entre la candidata y el OCR'
    if '\f' in cand:
        rangos = {k: rango_paginas(cand, ci, cf) for k, ci, cf in ac}
    else:
        v3 = V3.read_bytes().replace(b'\r\n', b'\n')
        if hashlib.sha256(v3).hexdigest() != SHA_V3:
            sys.exit('la v3 de referencia de páginas no es f70d874b…')
        v3t = v3.decode('utf-8')
        a3 = articulos(v3t)
        assert [k for k, _, _ in a3] == [k for k, _, _ in ac], 'la serie de artículos difiere entre la v3 y la candidata'
        rangos = {k: rango_paginas(v3t, ci, cf) for k, ci, cf in a3}
    asignacion = asignar_borde(lineas_borde, rangos)
    estado = {r['id']: r['estado'] for r in lineas_borde}

    filas, resumen = [], []
    for (k, ci, cf), (_, oi, of) in zip(ac, ao):
        pa, pb = rangos[k]
        pags = str(pa) if pa == pb else f'{pa}–{pb}'
        tc, qc = limpiar(cand[ci:cf])
        to, qo = limpiar(ocr[oi:of])
        wc, wo = tc.split(), to.split()
        dif = [op for op in difflib.SequenceMatcher(None, wo, wc, autojunk=False).get_opcodes() if op[0] != 'equal']
        for _, i1, i2, j1, j2 in dif:
            filas.append({'articulo': k, 'paginas': pags, 'ocr_tsc': ' '.join(wo[i1:i2]) or '∅', 'transcripcion': ' '.join(wc[j1:j2]) or '∅'})
        if not dif:
            tipo = 'igual'
        elif re.sub(r'\s+', '', tc) == re.sub(r'\s+', '', to):
            tipo = 'solo espacios'
        else:
            tipo = 'texto'
        borde = Counter(estado[i] for i, a in asignacion.items() if a == k)
        resumen.append({
            'articulo': k, 'paginas': pags, 'tipo': tipo, 'diferencias': len(dif), 'encabezados_quitados': f'{qo}/{qc}',
            'borde_legible': borde.get('LEGIBLE', 0), 'borde_parcial': borde.get('PARCIAL_BORDE', 0),
            'borde_ilegible_parcial': borde.get('ILEGIBLE_PARCIAL', 0),
            'pag41': 'sí (11 líneas con carácter inicial ausente)' if k == 6 else '—',
            'lagunas_ilegible': tc.count('[ilegible]'),
            'firmadas': FIRMADAS[version].get(k, '—'),
        })
    fuera = Counter(estado[i] for i, a in asignacion.items() if a == 'fuera')
    total = Counter(estado.values())
    dentro = sum(r['borde_legible'] + r['borde_parcial'] + r['borde_ilegible_parcial'] for r in resumen)
    assert dentro + sum(fuera.values()) == len(lineas_borde) == 88, 'el reparto del borde no cuadra con las 88 filas'

    salida = LOTE / 'transcripcion_candidata'
    with open(salida / 'lista_cotejo_d3_diferencias.csv', 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['articulo', 'paginas', 'ocr_tsc', 'transcripcion'], lineterminator='\n')
        w.writeheader(); w.writerows(filas)
    with open(salida / 'lista_cotejo_d3_resumen.csv', 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(resumen[0].keys()), lineterminator='\n')
        w.writeheader(); w.writerows(resumen)
    json.dump({'candidata': version, 'candidata_sha256': sha_cand, 'ocr_text_sha256': SHA_OCR, 'articulos': len(resumen),
               'diferencias': len(filas), 'por_tipo': Counter(r['tipo'] for r in resumen),
               'borde_total': dict(total), 'borde_dentro_del_acto': dentro, 'borde_fuera_del_acto': dict(fuera)}, sys.stdout, ensure_ascii=False)
    print()


if __name__ == '__main__':
    main()
