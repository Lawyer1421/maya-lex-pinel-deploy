"""Lista de cotejo D3 del A04 (Decreto 35-2013, La Gaceta 33,222), por artículo del decreto.

Compara, palabra por palabra y CONSERVANDO los guiones, el OCR del PDF del TSC (paquete 2026-11-16, text_sha256 f2c67cb4…) con la transcripción
candidata (SHA-256 977f0489… sobre los bytes LF del blob de git), ambos sin las líneas de encabezado de página. No corrige nada ni declara nada
cotejado: produce la lista de lo que una persona debe comprobar en la imagen de cada página.

Uso (desde la raíz del repositorio, con Python 3, sin dependencias):
  git show HEAD:docs/corpus/staging/2026-11-05-hn-001-a04-orientacion/transcripcion_candidata/A04_transcripcion_candidata.txt > cand_lf.txt
  python -I docs/corpus/staging/2026-11-05-hn-001-a04-orientacion/transcripcion_candidata/generar_lista_cotejo_d3.py cand_lf.txt
El hash se comprueba sobre los bytes LF: en un checkout de Windows con core.autocrlf=true el archivo del árbol de trabajo tiene CRLF y otro hash.
"""
import csv, difflib, hashlib, json, re, sys
from collections import Counter
from pathlib import Path

LOTE = Path('docs/corpus/staging/2026-11-05-hn-001-a04-orientacion')
OCR_PAQUETE = Path('docs/corpus/inbox/2026-11-16-hn-001-a04-tsc/pending-review/HN-001-A04.fbd87f3396e5.json')
SHA_CAND = '977f0489225d5cdf058f852b43b0f8af87b5db30f3128828386fcd2c17066355'
SHA_OCR = 'f2c67cb4a019a094cbacb4690323810e7215d0904297483b1a725a4dbb7fca0a'

# Correcciones firmadas por el CLO el 2026-11-16 (C01–C06) que la candidata 977f0489… todavía NO incorpora.
FIRMADAS = {
    5: 'C04 (123-F, «prohíbe») y C05 (207-F, «deudor(a)»): firmadas, pendientes de aplicar a la candidata',
    6: 'C06: lectura dual «11» (lista) / «511» (rótulo) firmada; el carácter inicial de «11» sigue abierto',
    10: 'C01: el orden 7)/8) ya está en la candidata (reconstrucción geométrica); falta «A la» (la candidata dice «8) Ala protección»)',
    11: 'C02 («67»): firmada, pendiente de aplicar a la candidata',
    14: 'C03 («334»): firmada, pendiente de aplicar a la candidata',
}


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


def paginas(texto: str, ini: int, fin: int) -> str:
    a = texto.count('\f', 0, ini) + 1
    b = texto.count('\f', 0, max(ini, fin - 1)) + 1
    return str(a) if a == b else f'{a}–{b}'


def limpiar(fragmento: str):
    quitadas = 0
    lineas = []
    for l in fragmento.replace('\r\n', '\n').replace('\r', '\n').replace('\f', '\n').split('\n'):
        if es_encabezado(l):
            quitadas += 1
        else:
            lineas.append(l)
    return '\n'.join(lineas), quitadas


def main():
    cand_bytes = Path(sys.argv[1]).read_bytes()
    if hashlib.sha256(cand_bytes).hexdigest() != SHA_CAND:
        sys.exit('la candidata no es 977f0489… (¿bytes CRLF? usar git show)')
    cand = cand_bytes.decode('utf-8')
    ocr = json.loads(OCR_PAQUETE.read_text(encoding='utf-8'))['extracted_text']
    if hashlib.sha256(ocr.encode('utf-8')).hexdigest() != SHA_OCR:
        sys.exit('el OCR no es f2c67cb4…')

    lineas_borde = list(csv.DictReader(open(LOTE / 'transcripcion_candidata/borde_derecho_88_lecturas.csv', encoding='utf-8')))
    ac, ao = articulos(cand), articulos(ocr)
    assert [k for k, _, _ in ac] == [k for k, _, _ in ao], 'la serie de artículos difiere entre la candidata y el OCR'

    filas, resumen = [], []
    for (k, ci, cf), (_, oi, of) in zip(ac, ao):
        pags = paginas(cand, ci, cf)
        pa, pb = (int(x) for x in (pags.split('–') + [pags])[:2])
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
        borde = Counter(r['estado'] for r in lineas_borde if pa <= int(r['pagina']) <= pb)
        resumen.append({
            'articulo': k, 'paginas': pags, 'tipo': tipo, 'diferencias': len(dif), 'encabezados_quitados': f'{qo}/{qc}',
            'borde_derecho': ', '.join(f'{v} {e}' for e, v in sorted(borde.items())) or '—',
            'pag41': 'sí (11 líneas con carácter inicial ausente)' if pa <= 41 <= pb else '—',
            'firmadas': FIRMADAS.get(k, '—'),
        })

    salida = LOTE / 'transcripcion_candidata'
    with open(salida / 'lista_cotejo_d3_diferencias.csv', 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['articulo', 'paginas', 'ocr_tsc', 'transcripcion'], lineterminator='\n')
        w.writeheader(); w.writerows(filas)
    with open(salida / 'lista_cotejo_d3_resumen.csv', 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(resumen[0].keys()), lineterminator='\n')
        w.writeheader(); w.writerows(resumen)
    json.dump({'candidata_sha256': SHA_CAND, 'ocr_text_sha256': SHA_OCR, 'articulos': len(resumen), 'diferencias': len(filas),
               'por_tipo': Counter(r['tipo'] for r in resumen)}, sys.stdout, ensure_ascii=False)
    print()


if __name__ == '__main__':
    main()
