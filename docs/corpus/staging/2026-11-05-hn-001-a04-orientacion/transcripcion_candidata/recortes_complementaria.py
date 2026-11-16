"""A04: coordenadas de recorte (200 ppi, PDF fbd87f33…) de cada línea de la v5 que toca la tabla complementaria, y lista de filas de las hojas.

Ubica cada línea en la capa de texto de su página (pdftotext -tsv, Poppler) y devuelve el renglón de la columna, con 6 pt de margen. Las págs. 39, 41,
43 y 45 tienen /Rotate 180: sus cajas se pasan a coordenadas de pantalla (612 − x − w, 842 − y − h).

Uso (raíz del repo): python -I -X utf8 <este script> <v5 LF> <v3 LF> <dir con p<N>.tsv de las 46 págs.> <cambios.json: [{linea_v5, antes, despues}]>
Salida: recortes_complementaria/coordenadas.json  {linea: "pág. P · pdftoppm -r 200 -f P -l P -x X -y Y -W W -H H"} y filas_hojas.json.
"""
import difflib, json, sys
from pathlib import Path

AQUI = Path(__file__).parent / 'recortes_complementaria'
ROT = {39, 41, 43, 45}
K = 200 / 72


def main():
    v5 = Path(sys.argv[1]).read_text(encoding='utf-8').split('\n')
    v3 = Path(sys.argv[2]).read_text(encoding='utf-8')
    tsv = Path(sys.argv[3])
    cambios = json.loads(Path(sys.argv[4]).read_text(encoding='utf-8'))
    v3l = [(p, l) for p, pg in enumerate(v3.split('\f'), 1) for l in pg.split('\n')]
    pag, j = [], 0
    for l in v5:
        while v3l[j][1] != l:
            j += 1
        pag.append(v3l[j][0]); j += 1
    cache = {}

    def lineas(p):
        if p not in cache:
            out, cur = [], None
            for r in (tsv / f'p{p}.tsv').read_text(encoding='utf-8').split('\n')[1:]:
                c = r.split('\t')
                if len(c) < 12:
                    continue
                if c[0] == '4':
                    x, y, w, h = map(float, c[6:10])
                    if p in ROT:
                        x, y = 612 - x - w, 842 - y - h
                    cur = {'x': x, 'y': y, 'w': w, 'h': h, 'pal': []}; out.append(cur)
                elif c[0] == '5' and cur is not None:
                    cur['pal'].append(c[11])
            cache[p] = out
        return cache[p]

    coords, filas = {}, []
    for c in sorted(cambios, key=lambda c: c['linea_v5']):
        n = c['linea_v5']
        texto = v5[n - 1].strip() or v5[n - 2].strip()
        p = pag[n - 1]
        b = max(lineas(p), key=lambda L: difflib.SequenceMatcher(None, ' '.join(L['pal']), texto).ratio())
        # columna completa: desde el comienzo del renglón (o del canal) hasta el borde de la columna
        x0 = 0 if b['x'] < 300 else 300
        x1 = 316 if b['x'] < 300 else 612
        X, Y = round(x0 * K), round(max(0, b['y'] - 5) * K)
        W, H = round((x1 - x0) * K), round(20 * K)
        coords[str(n)] = f'pág. {p} · pdftoppm -r 200 -f {p} -l {p} -x {X} -y {Y} -W {W} -H {H}'
        filas.append({'linea': n, 'pagina': p, 'x': X, 'y': Y, 'w': W, 'h': H, 'antes': c['antes'], 'despues': c['despues']})
    AQUI.mkdir(exist_ok=True)
    (AQUI / 'coordenadas.json').write_text(json.dumps(coords, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    Path(sys.argv[4]).with_name('filas_hojas.json').write_text(json.dumps(filas, ensure_ascii=False), encoding='utf-8')
    print(len(coords), 'líneas con recorte')


if __name__ == '__main__':
    main()
