"""A04: convierte las decisiones firmadas por el CLO en RESOLUCION_TEXTUAL_A04.csv (2026-11-16) en correcciones de cotejo únicas sobre la v2.

Cada corrección localiza en la candidata v2 (25d7cc59…, bytes LF) el token del final de línea a partir de las palabras que lo preceden (tomadas del
contexto del OCR), y lo delimita con el comienzo de la línea siguiente. El `buscar` resultante debe aparecer EXACTAMENTE una vez en la v2, y
ningún tramo puede solaparse con otro. Si no, el script se detiene. `aplicar_correcciones_resolucion.ts` aplica el JSON con `aplicarCorrecciones`.

Uso (raíz del repo): python -I <este script> <v2 en bytes LF>
"""
import csv, hashlib, json, re, sys
from pathlib import Path

LOTE = Path('docs/corpus/staging/2026-11-05-hn-001-a04-orientacion')
SHA_V2 = '25d7cc59fe3542df3d0de666eab4a47e217ef5398fe2bae6920f683168f40685'
FIRMA = 'CLO Abg. y Not. Fredy Omar Pinel Flores (propietario_despacho), 2026-11-16, 03_RESOLUCION_TEXTUAL_A04.md'

# Casos cuyo `buscar` no sigue la regla general (token al final de la línea): se declaran literalmente.
ESPECIALES = {
    # P02, P03, P07 (pág. 41, borde IZQUIERDO: el token está al comienzo de la línea).
    'P02': ('emitido\níediante Decreto', 'emitido\nmediante Decreto'),
    'P03': ('1906, los\nuales se leerán', '1906, los\ncuales se leerán'),
    'P07': ('debidamente\níconocida, sus', 'debidamente\nreconocida, sus'),
    # B24: la capa de texto movió «la» (leída «y») al comienzo de la línea siguiente.
    'B24': ('Niñez y\ny Familia (IHNFA), los', 'Niñez y [ilegible]\nFamilia (IHNFA), los'),
    # B84: la palabra cortada tras «y» no está en la v2; la laguna se inserta en su lugar.
    'B84': ('Niñez y\nFamilia (IHNFA) ordenando', 'Niñez y [ilegible]\nFamilia (IHNFA) ordenando'),
}


def main():
    v2 = Path(sys.argv[1]).read_bytes()
    if hashlib.sha256(v2).hexdigest() != SHA_V2:
        sys.exit('la base no es la v2 25d7cc59… (¿bytes CRLF? usar git show)')
    texto = v2.decode('utf-8')
    paginas = texto.split('\f')
    offs = [0]
    for pg in paginas[:-1]:
        offs.append(offs[-1] + len(pg) + 1)

    filas = list(csv.DictReader(open(LOTE / 'RESOLUCION_TEXTUAL_A04.csv', encoding='utf-8')))
    corr, tramos = [], []
    for r in filas:
        if r['cambio_en_candidata'] not in ('sí',):
            continue
        i = r['id']
        if i in ESPECIALES:
            buscar, reemplazar = ESPECIALES[i]
            pos = texto.find(buscar)
        else:
            antes = r['contexto'].split(' ⏎')[0].lstrip('…').split()
            token = r['candidata_v2']
            assert antes[-1] == r['ocr'], (i, antes, r['ocr'])
            pg = paginas[int(r['pagina']) - 1]
            m = None
            for n in range(1, len(antes)):
                pre = r'\s+'.join(map(re.escape, antes[-1 - n:-1]))
                hallados = list(re.finditer(pre + r'[ \t]+(' + re.escape(token) + r')\n(\S+)', pg))
                # Único en la página Y en todo el texto: el `buscar` incluye las palabras previas necesarias.
                if len(hallados) == 1 and texto.count(hallados[0].group(0)) == 1:
                    m = hallados[0]
                    break
            if not m:
                sys.exit(f'{i}: no se localiza una sola vez en la pág. {r["pagina"]}')
            ini, fin = m.start(), m.end(2)
            buscar = pg[ini:fin]
            reemplazar = pg[ini:m.start(1)] + r['propuesta'] + pg[m.end(1):fin]
            pos = offs[int(r['pagina']) - 1] + ini
        if texto.count(buscar) != 1:
            sys.exit(f'{i}: «{buscar}» aparece {texto.count(buscar)} veces en la v2')
        tramos.append((pos, pos + len(buscar), i))
        corr.append({
            'articulo': f"{r['articulo']} ({r['id']}, {r['marca']})",
            'pagina_pdf': int(r['pagina']),
            'buscar': buscar,
            'reemplazar': reemplazar,
            'motivo': f"{r['marca']}: {r['nota'] or 'lectura de la imagen'}",
            'detectado_por': f'Claude (recorte {r["recorte"]}); decisión firmada por el {FIRMA}',
        })
    tramos.sort()
    for (a, b, x), (c, d, y) in zip(tramos, tramos[1:]):
        if c < b:
            sys.exit(f'los tramos de {x} y {y} se solapan')
    corr.sort(key=lambda c: texto.find(c['buscar']))
    salida = LOTE / 'transcripcion_candidata/correcciones_cotejo_resolucion.json'
    salida.write_text(json.dumps(corr, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(len(corr), 'correcciones')


if __name__ == '__main__':
    main()
