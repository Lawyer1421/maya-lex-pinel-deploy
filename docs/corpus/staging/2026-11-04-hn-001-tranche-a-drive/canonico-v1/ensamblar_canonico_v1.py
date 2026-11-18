"""HN:CODIGO_NINEZ (D. 73-96) · ensambla el texto canónico v1 según el dictamen del CLO del 2026-11-18 (HOJA_DECISION_A03_DIFIERE_V8.md).

Reglas (una por artículo de los 302 de A03, en su orden):
  · 123 reformados (art. 1 del D.35-2013) y 14 adicionados (art. 3): texto de la v8 firmada (66919246…, La Gaceta 33,222), sin las comillas
    de la transcripción ni el rótulo «CÓDIGO DE FAMILIA» que sigue al 280-A. Art. 96: única corrección del CLO, «Juegos» → «Fuegos artificiales».
    Art. 21: texto de la v8 con la constancia C07 (derogación posterior por el D.130-2017, sin cotejar).
  · 24 derogados por el art. 11 del D.35-2013 (62–82, 134, 170, 171): marca [DEROGADO]; el 134 como DEROGADO_INTEGRO (resolución del CLO).
  · 141 no tocados por el D.35-2013: texto de A03 limpio (sin llamada de nota, sin pie «www.poderjudicial.gob.hn», sin rótulos pegados de la
    división siguiente, sin saltos de página), con estado A03_PENDIENTE_VERIFICACION: no tienen D1–D3.
  · Las 153 notas al pie de A03 se guardan aparte (notas editoriales; no son texto normativo).
No incluye el preámbulo ni los rótulos de Libros/Títulos/Capítulos/Secciones (pendientes). No escribe en ninguna base.

Uso (raíz del repo): python -I <este archivo> <segmentos_v8.json> <dir_salida>
  (segmentos_v8.json: npx tsx …/barrido-v7/exportar_segmentos.ts out/barrido-a03/segmentos_v8.json v8)
"""
import csv
import hashlib
import json
import re
import sys
import unicodedata

sys.stdout.reconfigure(encoding='utf-8')
SHA_V8 = '6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb'
FIRMA = 'Abg. y Not. Fredy Omar Pinel Flores (propietario_despacho, CLO / Director Maya Lex), 2026-11-18'
seg = json.load(open(sys.argv[1], encoding='utf-8'))
salida = sys.argv[2].rstrip('/')
if seg['v7'].get('version') != 'v8' or seg['v7']['sha256'] != SHA_V8:
    sys.exit('los segmentos no son de la v8 66919246…')

DEROGADOS = {str(n) for n in range(62, 83)} | {'134', '170', '171'}
RUIDO = re.compile(r'\s*www\.poderjudicial\.gob\.hn\s*')
RÓTULO_FINAL = re.compile(r'\s(?:LIBRO|T[IÍ]TULO|CAP[IÍ]TULO|SECCI[OÓ]N|"?\s*C[OÓ]DIGO)\b[^a-záéíóúñ]*$')
INICIO_PARRAFO = re.compile(r'^(?:[A-ZÁÉÍÓÚÑ¿¡"“]|\d{1,2}[.)]|[a-zñ]{1,2}[.)]\s)')


def parrafos_por_linea_en_blanco(t):
    """v8: los párrafos van separados por líneas en blanco; dentro de un párrafo, los saltos son cortes de columna."""
    ps = [re.sub(r'\s+', ' ', re.sub(r'(\w)-\n(\w)', r'\1\2', p)).strip() for p in re.split(r'\n\s*\n', t)]
    return [p for p in ps if p]


def parrafos_heuristicos(t):
    """A03: solo hay saltos simples. Nuevo párrafo si la línea anterior cierra en . : ; y la siguiente empieza en mayúscula o enumerador."""
    lineas = [l.strip() for l in t.split('\n') if l.strip()]
    ps, cur = [], ''
    for l in lineas:
        if cur and re.search(r'[.:;]$', cur) and INICIO_PARRAFO.match(l):
            ps.append(cur)
            cur = l
        else:
            cur = (cur[:-1] + l) if re.search(r'\w-$', cur) and l[:1].islower() else (f'{cur} {l}' if cur else l)
    if cur:
        ps.append(cur)
    return ps


def limpiar_final(texto):
    texto = RÓTULO_FINAL.sub('', texto).rstrip()
    return texto.strip('"“” ').strip()


notas_por_art = {}
for n in seg['a03']['notas']:
    notas_por_art.setdefault(n['referido'].split(' ')[0], []).append(n)
v8 = {x['numero']: x for x in seg['v7']['internos']}

articulos, manifiesto_arts, pendientes = [], [], []
for a in seg['a03']['articulos']:
    num = a['numero']
    obs, correcciones = [], []
    if num in DEROGADOS:
        fuente, estado = 'D35_2013_ART_11', ('DEROGADO_INTEGRO' if num == '134' else 'DEROGADO')
        texto = '[DEROGADO — art. 11 del Decreto No. 35-2013]'
        if num == '134':
            obs.append('Derogado íntegro (resolución del CLO 2026-11-18, PASAJES_134_141.md §6); el tipo pasa al art. 179-F del Código Penal (art. 8 del D.35-2013). A03 conservaba a)–c): no se adopta.')
    elif num in v8:
        x = v8[num]
        fuente = 'V8_LA_GACETA_33222'
        estado = 'TEXTO_V8_D3' if x['articulo_decreto'] == '1' else 'TEXTO_V8_D3_ADICIONADO'
        texto = limpiar_final('\n\n'.join(parrafos_por_linea_en_blanco(x['texto'])))
        if num == '96':
            antes = '2. - Juegos artificiales'
            if texto.count(antes) != 1:
                sys.exit('art. 96: no se encontró «2. - Juegos artificiales» exactamente una vez')
            texto = texto.replace(antes, '2. - Fuegos artificiales')
            correcciones.append({'buscar': 'Juegos artificiales', 'reemplazar': 'Fuegos artificiales',
                                 'motivo': 'Errata material de imprenta de La Gaceta 33,222 (numeral 2); corrección expresa del CLO', 'firma': FIRMA})
        if num == '21':
            estado = 'TEXTO_V8_D3_C07_PENDIENTE'
            obs.append('C07: derogado después por el D.130-2017 (art. 632, num. 12); La Gaceta 34,940 / 39,940 y fecha de efecto sin cotejar (EVENTOS_ARTICULO_21.md).')
        if num == '141':
            obs.append('Texto reformado (a–c); el art. 11 del D.35-2013 deroga los literales ch)–f) del 141 original (resolución del CLO 2026-11-18).')
    else:
        fuente, estado = 'A03_CONSOLIDADO', 'A03_PENDIENTE_VERIFICACION'
        t = a['texto'].replace('\f', '\n')
        if num in notas_por_art:
            t = re.sub(r'^\s*\d{1,3}\s+(?=[^\d\s)])', '', t)
        t = RUIDO.sub('\n', t)
        texto = limpiar_final('\n\n'.join(parrafos_heuristicos(t)))
        if re.match(r'^\W*derogad', unicodedata.normalize('NFD', texto.lower())):
            sys.exit(f'art. {num}: A03 lo marca derogado y no está en el art. 11 del D.35-2013')
    texto = unicodedata.normalize('NFC', texto)
    sha = hashlib.sha256(f'{num}\n{texto}'.encode()).hexdigest()
    articulos.append(f'Artículo {num}.- {texto}')
    m = {'numero': num, 'ordinal': a['ordinal'], 'fuente': fuente, 'estado': estado, 'sha256': sha, 'caracteres': len(texto),
         'notas_a03': [n['sha256'] for n in notas_por_art.get(num, [])]}
    if correcciones:
        m['correcciones_clo'] = correcciones
    if obs:
        m['observaciones'] = obs
    manifiesto_arts.append(m)
    if estado in ('A03_PENDIENTE_VERIFICACION', 'TEXTO_V8_D3_C07_PENDIENTE'):
        pendientes.append({'numero': num, 'ordinal': a['ordinal'], 'estado': estado, 'sha256': sha, 'que_falta': (
            'D1–D3: cotejo con La Gaceta 28,053 (opción A) y procedencia del consolidado (opción B, CEDIJ)' if estado.startswith('A03') else 'C07: cotejo del D.130-2017')})

texto_final = '\n\n'.join(articulos) + '\n'
if '\r' in texto_final or 'poderjudicial' in texto_final or '[ilegible]' in texto_final:
    sys.exit('el texto canónico contiene CR, el pie del CEDIJ o lagunas')
open(f'{salida}/HN_CODIGO_NINEZ_canonico_v1.txt', 'w', encoding='utf-8', newline='\n').write(texto_final)
sha_texto = hashlib.sha256(texto_final.encode()).hexdigest()
notas = [{'referido': n['referido'], 'texto': n['texto'], 'sha256': n['sha256']} for n in seg['a03']['notas']]
open(f'{salida}/HN_CODIGO_NINEZ_notas_editoriales_A03.json', 'w', encoding='utf-8', newline='\n').write(json.dumps(notas, ensure_ascii=False, indent=1) + '\n')
with open(f'{salida}/HN_CODIGO_NINEZ_pendientes_verificacion.csv', 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(pendientes[0]), lineterminator='\n')
    w.writeheader()
    w.writerows(pendientes)
from collections import Counter
conteo = Counter(m['estado'] for m in manifiesto_arts)
manifiesto = {
    'instrumento': 'HN:CODIGO_NINEZ',
    'version': 'canonico-v1',
    'estado': 'CANONICO_V1_PARCIAL_PENDIENTE_D1_D3',
    'advertencia': ('Texto ensamblado según el dictamen del CLO ' + FIRMA + ' (HOJA_DECISION_A03_DIFIERE_V8.md). Solo los 137 artículos de la v8 '
                    '(La Gaceta 33,222, D3 firmada) y las 24 derogaciones del art. 11 del D.35-2013 tienen respaldo cotejado; los 141 artículos no '
                    'tocados vienen del consolidado A03 (procedencia NO acreditada) y están pendientes de D1–D3. Sin vigencia declarada. No se carga en '
                    'ninguna base hasta completar D1–D8.'),
    'fuentes': {
        'v8': {'archivo': '../../2026-11-05-hn-001-a04-orientacion/transcripcion_candidata/A04_transcripcion_candidata_v8.txt', 'sha256': SHA_V8},
        'a03': {'bytes_sha256': seg['a03']['bytes_sha256'], 'text_sha256': seg['a03']['text_sha256'], 'procedencia': 'NO_ACREDITADA (SOURCE_HOLD)'},
        'dictamen': '../barrido-v7/HOJA_DECISION_A03_DIFIERE_V8.md',
    },
    'texto_sha256': sha_texto,
    'caracteres': len(texto_final),
    'articulos': len(manifiesto_arts),
    'conteo_por_estado': dict(sorted(conteo.items())),
    'correcciones_clo': [{'articulo': '96', 'buscar': 'Juegos artificiales', 'reemplazar': 'Fuegos artificiales',
                          'motivo': 'Errata material de imprenta de La Gaceta 33,222 (numeral 2)', 'firma': FIRMA}],
    'pendiente': ['Preámbulo del D.73-96 y rótulos de Libros/Títulos/Capítulos/Secciones (incluidas las denominaciones reformadas por el art. 2 '
                  'y derogadas por el art. 12 del D.35-2013)', 'D1–D3 de los 141 artículos no tocados (A03_PENDIENTE_VERIFICACION)',
                  'C07 (art. 21)', 'D4–D8 del pliego de HN:CODIGO_NINEZ'],
    'parrafos': 'v8: párrafos de la transcripción (líneas en blanco). A03: reconstrucción heurística (cierre en . : ; seguido de mayúscula o enumerador).',
    'notas_editoriales': {'archivo': 'HN_CODIGO_NINEZ_notas_editoriales_A03.json', 'cantidad': len(notas)},
    'articulos_detalle': manifiesto_arts,
}
open(f'{salida}/HN_CODIGO_NINEZ_canonico_v1_manifiesto.json', 'w', encoding='utf-8', newline='\n').write(json.dumps(manifiesto, ensure_ascii=False, indent=1) + '\n')
print(f'texto {sha_texto} · {len(texto_final)} caracteres · {len(manifiesto_arts)} artículos · {dict(sorted(conteo.items()))}')
for nombre in ['HN_CODIGO_NINEZ_canonico_v1.txt', 'HN_CODIGO_NINEZ_canonico_v1_manifiesto.json', 'HN_CODIGO_NINEZ_notas_editoriales_A03.json', 'HN_CODIGO_NINEZ_pendientes_verificacion.csv']:
    print(hashlib.sha256(open(f'{salida}/{nombre}', 'rb').read()).hexdigest(), nombre)
