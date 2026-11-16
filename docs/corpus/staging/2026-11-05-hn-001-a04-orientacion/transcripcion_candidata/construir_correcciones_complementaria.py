"""A04: tabla complementaria de resolución textual (04_RESOLUCION_COMPLEMENTARIA_A04.md) → correcciones de cotejo únicas sobre la v5.

La v5 (fa47cc72…, 2026-11-16) conserva defectos que el OCR y la candidata comparten y que la lista D3 (OCR ≠ candidata) nunca mostró. El barrido
sistemático de las 46 páginas (recortes nativos 200 ppi) los clasificó en los grupos G1–G10. Cada entrada nombra la línea de la v5, el texto exacto
que se cambia y su lectura; el script comprueba que el texto viejo está en esa línea (al comienzo con «^», al final con «$», la línea entera con «^…$»).
Después convierte cada línea modificada en una CorreccionCotejo cuyo `buscar` (la línea con el contexto mínimo necesario) aparece EXACTAMENTE una
vez en el texto en ese momento, en el mismo orden en que `aplicarCorrecciones` las aplica.

NADA de esto está firmado: el CSV sale con la columna `decision_clo` vacía. La v6 solo se genera después de la firma del CLO.

Uso (raíz del repo): python -I -X utf8 <este script> <v5 en bytes LF> <v3 en bytes LF> [--seco] [--vista <archivo>] [--cambios <archivo>]
  Escribe correcciones_cotejo_complementaria.json y ../RESOLUCION_COMPLEMENTARIA_A04.csv; con --seco solo informa el hash que tendría la v6.
"""
import csv, hashlib, json, re, sys
from pathlib import Path

LOTE = Path('docs/corpus/staging/2026-11-05-hn-001-a04-orientacion')
SHA_V5 = 'fa47cc72000a34c4dc56acc9af4ee53b32cc359f72202e4cddd56e0ca78c5b0e'
BORRAR = None  # nuevo = BORRAR → la línea se elimina

IMG, CTX, RUIDO, ENC, CANAL, PIE = 'LECTURA_DE_IMAGEN', 'LECTURA_POR_CONTEXTO_CLO', 'RUIDO_DE_ESCANEO', 'ENCABEZADO_RESIDUAL', 'REUBICACION_CANAL', 'LECTURA_DE_IMAGEN_PARCIAL'

G = {
    'G1': 'Art. 6, pág. 41 (art. 37 del Código Civil): lecturas YA APROBADAS el 2026-11-16 (P04–P06, P08–P11) que no se aplicaron',
    'G2': 'Borde izquierdo de la pág. 45 (art. 11): primera letra cortada',
    'G3': 'Borde derecho de las págs. impares: final de palabra cortado por el borde del escaneo',
    'G4': 'Canal entre columnas: palabra final de la columna izquierda pegada a la línea de la derecha',
    'G5': 'Errores sueltos del OCR (letras confundidas, palabras pegadas o partidas)',
    'G6': 'Ñ y tildes que el OCR perdió de forma sistemática (Hondureño, prohíbe, ARTÍCULO, títulos)',
    'G7': 'Letras espaciadas por el OCR en rótulos y nombres (solo se unen; no cambia ninguna letra)',
    'G8': 'Ruido del escaneo (símbolos y líneas sin texto impreso)',
    'G9': 'Encabezado residual y recuadro editorial de La Gaceta dentro del texto del decreto',
    'G10': 'Renglones del pie de la pág. 36 cortados por el borde inferior (se lee la mitad superior)',
}

# (línea v5, viejo, nuevo, grupo, marca, nota)
E = []
def e(n, viejo, nuevo, g, m=IMG, nota=''):
    E.append((n, viejo, nuevo, g, m, nota))

# ── G1: aprobadas el 2026-11-16 (03_RESOLUCION_TEXTUAL_A04.md, casillas P04–P06 y P08–P11), aplicadas ahora en el art. 6 ────────────────
for n, v, nu, p in [(3831, '^3 oiga', 'se oiga', 'P04'), (3832, '^omprendidos(as)', 'comprendidos(as)', 'P05'), (3833, '^ompañero(a)', 'compañero(a)', 'P06'),
                    (3835, '^iad.', 'edad.', 'P08'), (3836, '^as parientes', 'sus parientes', 'P09'), (3839, '^>s colaterales', 'los colaterales', 'P10'),
                    (3842, '^erbalmente', 'verbalmente', 'P11')]:
    e(n, v, nu, 'G1', CTX, f'{p} aprobada por el CLO el 2026-11-16; la v3 no la aplicó (la búsqueda halló el pasaje idéntico del art. 332-A, art. 5)')

# ── G2: borde izquierdo, pág. 45 ────────────────────────────────────────────────────────────────────────────────────────────────────────
e(4220, '^:ontentivo del C Ó D I G O D E L A N I Ñ E Z Y L A', 'contentivo del CÓDIGO DE LA NIÑEZ Y LA', 'G2', nota='«c» parcialmente visible; letras espaciadas unidas')
e(4221, '^\\DOLESCENCIA.', 'ADOLESCENCIA.', 'G2', nota='«A» parcialmente visible')
e(4224, '^leí Decreto Nq.73-96', 'del Decreto No.73-96', 'G2', nota='«d» parcialmente visible; «No.» legible')
e(4225, '^iel Código', 'del Código', 'G2')
e(4227, 'I I I y IV', 'III y IV', 'G2')
e(4228, '^3 rimera', 'Primera', 'G2')
e(4231, '^\\o. 76-84', 'No. 76-84', 'G2')

# ── G3: borde derecho (final de línea) ──────────────────────────────────────────────────────────────────────────────────────────────────
B = [
    (221, 'poi$', 'por'), (223, 'poi$', 'por'), (226, 'hay£$', 'haya'), (229, 'ser¿$', 'será'), (230, 'dentre$', 'dentro'), (232, 'recibe$', 'recibo'),
    (382, 'dentn$', 'dentro'), (387, 'tengai$', 'tengan'), (390, 'estéi$', 'estén'), (392, 'cost$', 'costo'), (397, 'enviará$', 'enviarán'),
    (403, '143,144$', '143, 144 y'), (404, 'cinco (5)$', 'cinco (5) a'), (407, 'responsabilida$', 'responsabilidad'), (410, 'informa$', 'informará'),
    (411, 'cuand$', 'cuando'), (414, 'Honduren$', 'Hondureño'), (415, 'investigar$', 'investigar y'), (419, '(IHNFA$', '(IHNFA)'),
    (420, 'debiend$', 'debiendo'), (421, 'argumento$', 'argumentos'), (422, 'desestimada$', 'desestimada la'),
    (570, 'nc$', 'no'), (571, 'come$', 'como'), (574, 'todc$', 'todo'), (579, 'discriminaciór$', 'discriminación'), (580, 'dé$', 'del'),
    (582, 'a lo$', 'a los'), (583, 'infant$', 'infantil'), (584, 'otro$', 'otros'), (585, 'par$', 'para'), (588, 'luga$', 'lugar'),
    (589, 'hostiles$', 'hostiles,'), (590, 'come$', 'como'), (591, 'droga$', 'drogas'), (592, 'qu$', 'que'), (594, 'física$', 'física,'),
    (595, 'hacer$', 'hacerlo'), (596, 'incluyend$', 'incluyendo'), (600, 'Famili$', 'Familia'), (601, 'trasgresión$', 'trasgresión,'),
    (604, 'conforme$', 'conforme a'), (607, 'Civi$', 'Civil,'), (608, 'Derecho,$', 'Derecho, el'), (613, 'programa$', 'programas'),
    (614, 'consejerí$', 'consejería'), (616, 'psicológic$', 'psicológica'),
    (764, 'mismo,$', 'mismo;'), (782, 'cualquiei$', 'cualquier'), (787, 'registroí$', 'registros'), (788, 'sobre si$', 'sobre su'), (789, 'quede$', 'queda'),
    (790, 'dt$', 'de'), (791, 'relacionado$', 'relacionados'), (792, 'trámite ($', 'trámite o'), (796, 'ta$', 'tal'), (800, 'sil$', 'sin'),
    (807, 'para 1$', 'para la'), (808, 'ést$', 'éste'),
    (978, 'evaluador$', 'evaluación'), (980, 'lesiones$', 'lesiones.'), (984, 'Códigc$', 'Código'), (985, 'regira$', 'regirá'), (988, 'por le$', 'por lo'),
    (989, 'decretal$', 'decretar'), (990, 'podr$', 'podrá'), (993, 'hay$', 'haya'), (995, 'impliqu$', 'implique'), (997, 'reiterada$', 'reiterada e'),
    (998, 'Medida*$', 'Medidas'), (999, 'autoridae$', 'autoridad'), (1005, 'resolverá le$', 'resolverá lo'),
    (1173, 'promove$', 'promover'), (1177, 'superior$', 'superior a'), (1185, 'en lo$', 'en los'), (1186, 'Hech$', 'Hecho'), (1187, 'Artículo$', 'Artículos'),
    (1188, 'Título$', 'Título."'), (1190, 'Domiciliari$', 'Domiciliaria'), (1195, 'ordenars$', 'ordenarse'), (1196, 'comprobad$', 'comprobada'),
    (1347, 'Procese$', 'Proceso'), (1352, 'de lí$', 'de la'), (1361, 'plazo$', 'plazos'), (1365, 'principio$', 'principios'), (1370, 'esfo$', 'este'),
    (1376, 'garantizand$', 'garantizando'), (1377, 'asiste$', 'asisten'), (1382, 'los qu$', 'los que'), (1385, 'sancione$', 'sanciones'),
    (1386, 'norma$', 'normas'), (1388, 'cualquie$', 'cualquier'), (1390, 'transcurrid$', 'transcurrido'), (1391, 'envié$', 'enviar'),
    (1745, 'Públicc$', 'Público'), (1746, 'procese$', 'proceso'), (1747, 'simplificaciór$', 'simplificación'), (1753, 'de lí$', 'de la'), (1763, 'dt$', 'de'),
    (1764, 'suspensiói$', 'suspensión'), (1765, 'seten$', 'setenta'), (1766, 'ante$', 'antes'), (1767, 'pronuncie e$', 'pronuncie el'), (1770, 'ser$', 'será'),
    (1773, 'en lo$', 'en los'), (1774, 'Jue$', 'Juez'),
    (1962, 'realizada$', 'realizada;'), (1968, 'gravedad)$', 'gravedad y'), (1969, 'cometido$', 'cometido.'),
    (2115, 'pudiei$', 'pudiera'), (2117, 'conveniente, le$', 'conveniente, los'), (2118, 'qu$', 'que'), (2120, 'Sancionado,$', 'Sancionado, la'),
    (2124, 'aplicable$', 'aplicables'), (2127, 'Rector$', 'Rectores'), (2131, 'responsabilida$', 'responsabilidad'), (2133, 'interne$', 'internos'),
    (2134, 'encuenu$', 'encuentre'), (2137, 'comunicació$', 'comunicación'), (2138, 'cualqui$', 'cualquier'), (2139, 'afectivo:$', 'afectivo;'),
    (2140, 'otra$', 'otras'), (2141, 'debidamen$', 'debidamente'), (2144, 'pri vaci$', 'privación'), (2145, 'médic$', 'médicos'), (2146, 'men$', 'mental'),
    (2148, 'Sancionad$', 'Sancionado'), (2149, 'Individu$', 'Individual'), (2151, 'Técni$', 'Técnica'), (2153, 'Defens$', 'Defensor'), (2156, '(1$', '(18)'),
    (2157, 'libert$', 'libertad'), (2158, 'parte$', 'parte de'), (2160, 'programa$', 'programas'),
    (2517, 'Código$', 'Código,'),
    (2687, 'autorida$', 'autoridad'), (2690, 'respald$', 'respaldo'), (2691, 'Jue$', 'Juez'), (2692, 'términ$', 'término'), (2693, 'qued$', 'quede'),
    (2696, 'procedimiento 1$', 'procedimiento lo'), (2699, 'Niñe$', 'Niñez'), (2700, 'niño$', 'niño o'), (2702, '(IHNFA), a$', '(IHNFA), así'),
    (2703, 'pa$', 'para'), (2704, 'dí$', 'días'), (2705, 'Juzgad$', 'Juzgado'), (2706, 'argumentaciones$', 'argumentaciones y'), (2707, 'audienci$', 'audiencia'),
    (2712, 'técnic$', 'técnicas'), (2713, 'Niñ$', 'Niñez'), (2715, 'opong$', 'opongan'), (2717, 'las que$', 'las que se'), (2719, 'mism$', 'mismo'),
    (2721, 'autorida$', 'autoridad'), (2724, 'aq$', 'aquí'), (2725, 'derech$', 'derechos'), (2726, 'derec$', 'derecho'), (2727, 'duran$', 'durante'),
    (2728, 'madure$', 'madurez'), (2731, 'o ni$', 'o niña'),
    (2913, '39$', '39,'), (2914, '163$', '163,'), (2915, ', de$', ', del'), (2920, 'naturalmente,$', 'naturalmente, a'), (2921, 'jurídic$', 'jurídica'),
    (2924, 'funcionari$', 'funcionario'),
    (3102, 'adoptar$', 'adoptar,'), (3111, 'ante$', 'antes'), (3112, 'exponiendo la$', 'exponiendo las'), (3117, 'legale$', 'legales'),
    (3303, 'vientr$', 'vientre'), (3304, 'muer$', 'muera'), (3309, 'nombrado(a$', 'nombrado(a)'),
    (3458, 'adopciói$', 'adopción'), (3461, 'edac$', 'edad'), (3462, 'la o lo$', 'la o los'), (3467, 'étnic$', 'étnica'), (3470, 'del(lg$', 'del(la)'),
    (3474, 'Instituí$', 'Instituto'), (3476, 'légale$', 'legales'), (3477, 'conocimiento,$', 'conocimiento, si'), (3478, 'Letr$', 'Letras'),
    (3485, 'prueb$', 'prueba'), (3488, 'cumpla$', 'cumpla lo'), (3489, 'respectiv$', 'respectiva'), (3492, 'Familia$', 'Familia o'),
    (3493, 'consentimient$', 'consentimiento'), (3498, '(IHNFA$', '(IHNFA)'), (3499, 'mientr$', 'mientras'), (3500, 'supervisada$', 'supervisada y'),
    (3504, 'únicament$', 'únicamente a'), (3505, 'paí$', 'país'),
]
for n, v, nu in B:
    e(n, v, nu, 'G3', nota='letras finales cortadas por el borde, visibles en parte en el recorte nativo')
for n, v, nu, nota in [(391, 'y 1$', 'y le', 'se ve «l»; la «e» no: «y le brindarán»'),
                       (2130, 'a te$', 'a las', 'se ve «a l»; «a las personas o funcionarios»'),
                       (2701, 'administrativa y$', 'administrativa y al', 'se ve «y a»; «y al Instituto»'),
                       (3501, 'técnico$', 'técnico y', 'el final no se ve; «personal técnico y profesional»')]:
    e(n, v, nu, 'G3', CTX, nota)

# ── G4: canal entre columnas (palabra a la columna izquierda; se quita de la derecha) ──────────────────────────────────────────────────────
CANAL_A = [(372, ' de', 5), (375, ' el', 5), (553, ' o', 7), (563, ' o', 7), (567, ' y', 7), (2073, ' la', 23), (2082, ' en', 23), (2094, ' los', 23),
           (2103, ' el', 23), (2104, ' de', 23), (2637, ' al', 29), (2644, ' la', 29), (2659, ' a', 29), (2666, ' de', 29), (2668, ' el', 29),
           (2671, ' de', 29), (2677, ' en', 29), (2681, ' o', 29), (2682, ' o', 29), (3451, ' las', 37)]
for n, w, p in CANAL_A:
    e(n, '$', w, 'G4', CANAL, f'final justificado de la columna izquierda (pág. {p}), impreso en el canal entre columnas')
for n, v, nu in [(419, '^de El', 'El'), (422, '^el presentados', 'presentados'), (2131, '^en personas', 'personas'), (2143, '^los adecuado', 'adecuado'),
                 (2153, '^el i)', 'i)'), (2154, '^de ante', 'ante'), (2685, '^al 4)', '4)'), (2692, '^la de Letras', 'de Letras'), (2707, '^a pruebas', 'pruebas'),
                 (2714, '^de y la Familia', 'y la Familia'), (2716, '^el en su caso', 'en su caso'), (2719, '^de 5)', '5)'), (2725, '^en indicados', 'indicados'),
                 (2729, '^o así como', 'así como'), (3500, '^las dure', 'dure')]:
    e(n, v, nu, 'G4', CANAL, 'la palabra pertenece a la columna izquierda (se reubica arriba)')
for n in (599, 602, 2121, 2730):
    e(n, '^.*$', BORRAR, 'G4', CANAL, 'línea suelta con la palabra del canal (se reubica en la columna izquierda)')

# ── G5: errores sueltos del OCR ─────────────────────────────────────────────────────────────────────────────────────────────────────────
for n, v, nu in [(35, 'Reformarlos', 'Reformar los'), (49, '^sn adelante', 'en adelante'), (113, '(3 0)', '(30)'), (218, '(3 0)', '(30)'),
                 (288, 'MinisterioPúblico', 'Ministerio Público'), (461, 'j erárquico', 'jerárquico'), (475, 'IFLNFA', 'IHNFA'),
                 (548, 'PorTrasgresión', 'Por Trasgresión'), (588, 'porTrasgresión', 'por Trasgresión'),
                 (609, 'aelministrativamenteporel Institu$', 'administrativamente por el Instituto'), (1061, 'no^privativas', 'no privativas'),
                 (1100, 'ert lo sucesivo', 'en lo sucesivo'), (1230, '^déla Niñez', 'de la Niñez'), (1312, 'paraNiños', 'para Niños'),
                 (1385, 'ej ecución', 'ejecución'), (1423, 'mtervinientes', 'intervinientes'), (1518, 'laconciliación', 'la conciliación'),
                 (1540, 'Suj eto', 'Sujeto'), (1594, 'dej ar', 'dejar'), (2583, '187-Ay280-', '187-A y 280-'),
                 (2882, 'JUSTICIARESTAURATIVA', 'JUSTICIA RESTAURATIVA'), (3268, 'mtimidación', 'intimidación'), (3268, 'consentimiento:', 'consentimiento;'), (3269, '^y$', 'y,'), (3351, 'temiina', 'termina'),
                 (3500, 'dé adopción', 'de adopción'), (3548, 'hij o(a)', 'hijo(a)'), (3643, 'fonnación', 'formación'), (3925, 'dimnto', 'difunto'),
                 (3929, '^,próximo,', 'próximo,'), (3962, 'j erárquica', 'jerárquica')]:
    e(n, v, nu, 'G5')
e(3216, '^.*$', 'arrendar, ni gravar los bienes de los hijos(as) sujetos(as) a', 'G5', nota='renglón al pie de la pág. 34; el OCR lo deformó («eravar», «hiiosí»)')

# ── G6: ñ y tildes ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
for n, v, nu in [(2530, '^"CAPÍTULO I V$', '"CAPÍTULO IV.'), (2534, "^'TITULO II$", '"TITULO II'), (2541, 'SITUACION', 'SITUACIÓN'),
                 (2543, 'SECCION SEGUNDA', 'SECCIÓN SEGUNDA'), (2558, "^'SECCION SEXTA$", '"SECCIÓN SEXTA'), (2562, 'SECCION SEPTIMA', 'SECCIÓN SÉPTIMA'),
                 (2572, 'SECCION PRIMERA', 'SECCIÓN PRIMERA'), (2577, 'RESTITUCION', 'RESTITUCIÓN'), (2911, '^CODIGO DE FAMILIA', 'CÓDIGO DE FAMILIA'),
                 (3942, '^CODIGO PENAL', 'CÓDIGO PENAL'), (4137, '^CODIGO PROCESAL PENAL', 'CÓDIGO PROCESAL PENAL')]:
    e(n, v, nu, 'G6')
# Las palabras y rótulos de G6 se generan sobre la v5 (abajo): Hondureno→Hondureño, hondurenos/hondurenas, «Se prohibe»→«Se prohíbe»,
# «ARTICULO» y «A R T I C U L O» (con o sin tilde) → «ARTÍCULO». Las 70 apariciones de «Hondureño» y las 10 de «prohíbe» se cotejaron una por una.

# ── G7: letras espaciadas (solo se unen) ────────────────────────────────────────────────────────────────────────────────────────────────
for n, v, nu in [(1, '^D E C R E T O No.', 'DECRETO No.'), (3, '^E L CONGRESO', 'EL CONGRESO'), (32, '^CODIGO DE L A NIÑEZ Y D E L A$', 'CÓDIGO DE LA NIÑEZ Y DE LA'),
                 (48, 'CÓDIGO D E L A NIÑEZ Y L A ADOLESCENCIA', 'CÓDIGO DE LA NIÑEZ Y LA ADOLESCENCIA'), (2521, 'CÓDIGO DE L A NIÑEZ$', 'CÓDIGO DE LA NIÑEZ'),
                 (2522, '^Y DE L A ADOLESCENCIA', 'Y DE LA ADOLESCENCIA'), (2580, 'CÓDIGO DE L A NIÑEZ$', 'CÓDIGO DE LA NIÑEZ'),
                 (2581, '^Y L A ADOLESCENCIA', 'Y LA ADOLESCENCIA'), (2818, 'FORMACIÓN I N T E G R A L :', 'FORMACIÓN INTEGRAL:'),
                 (2823, 'REINSERCIÓN D E E L NIÑO(A)', 'REINSERCIÓN DE EL NIÑO(A)'), (2824, '^Y E N L A SOCIEDAD:', 'Y EN LA SOCIEDAD:'),
                 (2830, '^J U S T I C I A E S P E C I A L I Z A D A :', 'JUSTICIA ESPECIALIZADA:'), (2842, '^L E G A L I D A D :', 'LEGALIDAD:'),
                 (2863, 'D E L A S MEDIDAS', 'DE LAS MEDIDAS'), (2871, '^E X C E P C I O N A L I D A D :', 'EXCEPCIONALIDAD:'),
                 (2875, '^O P O R T U N I D A D :', 'OPORTUNIDAD:'), (3823, '^CÓDIGO C I V I L$', 'CÓDIGO CIVIL'), (3826, 'CÓDIGO C I V I L', 'CÓDIGO CIVIL'),
                 (3949, 'E L ESTADO C I V I L , E L$', 'EL ESTADO CIVIL, EL'), (3950, '^ORDEN D E L A FAMILIA Y D E L O S', 'ORDEN DE LA FAMILIA Y DE LOS'),
                 (3951, '^CONTRALOS DERECHOS Y L A', 'CONTRA LOS DERECHOS Y LA'), (3952, '^L O S NIÑOS', 'LOS NIÑOS'),
                 (4155, '^L E Y CONTRA L A VIOLENCIA', 'LEY CONTRA LA VIOLENCIA'), (4159, 'L E Y C O N T R A L A V I O L E N C I A$', 'LEY CONTRA LA VIOLENCIA'),
                 (4232, '^CÓDIGO D E FAMILIA.', 'CÓDIGO DE FAMILIA.'), (4261, 'CÓDIGO C I V I L', 'CÓDIGO CIVIL'), (4300, 'H E R R E R A$', 'HERRERA'),
                 (4303, '^R I G O B E R T O CHANG C A S T I L L O$', 'RIGOBERTO CHANG CASTILLO'), (4315, 'L O B O', 'LOBO'), (4321, '^C A R L O S', 'CARLOS')]:
    e(n, v, nu, 'G7', nota='la imagen imprime la palabra sin espacios' + (' y «CÓDIGO» con tilde' if n == 32 else '') + ('; «CONTRA LOS» son dos palabras' if n == 3951 else ''))

# ── G8: ruido del escaneo ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
for n in (612, 1091, 1852, 2573):
    e(n, '^.*$', BORRAR, 'G8', RUIDO, 'línea sin texto impreso (mancha o filete)')
for n in (97, 1532, 2940, 4267):
    e(n, '^•$', '', 'G8', RUIDO, 'mancha entre párrafos: queda la línea en blanco que separa los párrafos')
e(2180, 'p) • No', 'p) No', 'G8', RUIDO)
e(2462, '^• "ARTÍCULO', '"ARTÍCULO', 'G8', RUIDO)
e(3704, 'que •$', 'que', 'G8', RUIDO)

# ── G9: encabezado residual y recuadro editorial ────────────────────────────────────────────────────────────────────────────────────────
for n in range(122, 139):
    e(n, '^.*$', BORRAR, 'G9', ENC, 'recuadro editorial de La Gaceta (pág. 2: «La Gaceta», gerencia, E.N.A.G., teléfonos) intercalado en el art. 32 del Código')
e(861, '^Sección Á Acuerdos y Leyes$', BORRAR, 'G9', ENC, 'encabezado de página «Sección A Acuerdos y Leyes» (pág. 10; el OCR leyó «Á»)')
e(3846, '^cuerdos y Leyes$', BORRAR, 'G9', ENC, 'resto del encabezado «Sección A Acuerdos y Leyes» (pág. 41)')

# ── G10: pie de la pág. 36 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
e(3359, '^11™$', 'bajando del tronco a los(las) otros(as) parientes, se llama', 'G10', PIE, 'último renglón de la columna izquierda; el OCR leyó «11™»')
e(3408, '^.*$', 'de las obligaciones legales derivadas de la adopción;', 'G10', PIE, 'último renglón de la columna derecha; el OCR leyó ruido')


def articulos(texto):
    """Inicio de cada artículo propio del decreto (serie 1, 2, 3…), como generar_lista_cotejo_d3.py."""
    pos, out = 0, []
    while True:
        m = re.compile(r'(?m)^[ \t]*A\s*R\s*T\s*[ÍI]\s*C\s*U\s*L\s*O\s+' + str(len(out) + 1) + r'\b\s*\.\s*-?').search(texto, pos)
        if not m:
            return out
        out.append(m.start()); pos = m.end()


def main():
    raw = Path(sys.argv[1]).read_bytes()
    if hashlib.sha256(raw).hexdigest() != SHA_V5:
        sys.exit('la base no es la v5 fa47cc72… (¿bytes CRLF? usar git show)')
    texto = raw.decode('utf-8')
    L = texto.split('\n')

    # G6 generado: palabras con ñ/tilde perdidas y rótulos «ARTÍCULO»
    for i, l in enumerate(L, 1):
        for v, nu in [('Hondureno', 'Hondureño'), ('hondurenos', 'hondureños'), ('hondurenas', 'hondureñas'), ('Se prohibe', 'Se prohíbe'), ('se prohibe', 'se prohíbe')]:
            for _ in re.finditer(r'\b' + v + r'\b', l):
                E.append((i, v, nu, 'G6', IMG, 'cotejado en la imagen (hoja de recortes por palabra)'))
        m = re.match(r'^("?)\s*(A R T [IÍ] C U L O|ARTICULO)(?= )', l)
        if m:
            E.append((i, '^' + m.group(0), m.group(1) + 'ARTÍCULO', 'G6', IMG, 'el rótulo está impreso «ARTÍCULO», con tilde y sin espaciar'))

    # aplica las ediciones línea a línea, en el orden declarado
    nuevo = list(L)
    filas = []
    for n, v, nu, g, m, nota in E:
        cur = nuevo[n - 1]
        if cur is None:
            sys.exit(f'L{n}: la línea ya se borró')
        antes = cur
        if v == '$':
            res = cur + nu
        elif v.startswith('^') and v.endswith('$') and len(v) > 1:
            pat = v[1:-1]
            if pat != '.*' and cur != pat:
                sys.exit(f'L{n}: se esperaba la línea entera {pat!r} y es {cur!r}')
            res = nu
        elif v.startswith('^'):
            if not cur.startswith(v[1:]):
                sys.exit(f'L{n}: {v[1:]!r} no está al comienzo de {cur!r}')
            res = nu + cur[len(v) - 1:]
        elif v.endswith('$'):
            if not cur.endswith(v[:-1]):
                sys.exit(f'L{n}: {v[:-1]!r} no está al final de {cur!r}')
            res = cur[:len(cur) - len(v) + 1] + nu
        else:
            k = len(re.findall(r'(?<![\wñÑáéíóú])' + re.escape(v) + r'(?![\wñÑáéíóú])', cur)) if v[0].isalnum() else cur.count(v)
            if k < 1:
                sys.exit(f'L{n}: {v!r} no está en {cur!r}')
            res = re.sub(r'(?<![\wñÑáéíóú])' + re.escape(v) + r'(?![\wñÑáéíóú])', nu, cur, count=1) if v[0].isalnum() else cur.replace(v, nu, 1)
        nuevo[n - 1] = res
        filas.append({'linea_v5': n, 'grupo': g, 'marca': m, 'antes': antes, 'despues': '(línea eliminada)' if res is None else res, 'nota': nota})

    # artículo y página de cada línea
    inicios = articulos(texto)
    off = [0]
    for l in L:
        off.append(off[-1] + len(l) + 1)
    art = lambda n: str(max([0] + [k + 1 for k, s in enumerate(inicios) if s <= off[n - 1]])).replace('0', 'preámbulo') if not any(s <= off[n - 1] for s in inicios) else str(max(k + 1 for k, s in enumerate(inicios) if s <= off[n - 1]))
    v3 = Path(sys.argv[2]).read_text(encoding='utf-8') if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else None
    pag = {}
    if v3:
        v3l = [(p, l) for p, pg in enumerate(v3.split('\f'), 1) for l in pg.split('\n')]
        j = 0
        for i, l in enumerate(L, 1):
            while v3l[j][1] != l:
                j += 1
            pag[i] = v3l[j][0]; j += 1

    # correcciones únicas, en orden de línea (una por línea modificada)
    cambiadas = sorted({f['linea_v5'] for f in filas})
    vivo = list(L)
    corr = []
    actual = lambda: '\n'.join(x for x in vivo if x is not None)
    for n in cambiadas:
        i = n - 1
        fin = nuevo[i]
        if fin == L[i]:
            continue
        txt = actual()
        vivas = [k for k, x in enumerate(vivo) if x is not None]
        p = vivas.index(i)
        # contexto: líneas vivas [pa, pb] alrededor de i; si se borra, siempre con la línea viva anterior (para quitar su salto de línea)
        pa, pb = (p - 1, p) if fin is None else (p, p)
        def ext(pa, pb, sin=None):
            ls = [vivo[vivas[k]] for k in range(pa, pb + 1) if vivas[k] != sin]
            pre = '\n' if pa > 0 else ''
            post = '\n' if pb < len(vivas) - 1 else ''
            return pre + '\n'.join(ls) + post
        while txt.count(ext(pa, pb)) != 1:
            if pa > 0:
                pa -= 1
            if txt.count(ext(pa, pb)) == 1:
                break
            if pb < len(vivas) - 1:
                pb += 1
        buscar = ext(pa, pb)
        if fin is None:
            reemplazar = ext(pa, pb, sin=i)
        else:
            vivo[i] = fin
            reemplazar = ext(pa, pb)
        vivo[i] = fin
        if buscar == reemplazar:
            sys.exit(f'L{n}: corrección vacía')
        mis = [f for f in filas if f['linea_v5'] == n]
        corr.append({
            'articulo': f"{art(n)} (L{n}; {', '.join(sorted({f['grupo'] for f in mis}))})",
            'pagina_pdf': pag.get(n, 0) or 1,
            'buscar': buscar,
            'reemplazar': reemplazar,
            'motivo': '; '.join(f"{f['grupo']} {f['marca']}" + (f": {f['nota']}" if f['nota'] else '') for f in mis),
            'detectado_por': 'Claude (barrido de las 46 págs., recortes nativos 200 ppi, 2026-11-16); PENDIENTE de la firma del CLO en 04_RESOLUCION_COMPLEMENTARIA_A04.md',
        })

    # verificación en seco: aplicar en orden con la misma regla que aplicarCorrecciones
    t = texto
    for c in corr:
        if t.count(c['buscar']) != 1:
            sys.exit(f"{c['articulo']}: «{c['buscar'][:60]}» aparece {t.count(c['buscar'])} veces")
        t = t.replace(c['buscar'], c['reemplazar'], 1)
    esperado = '\n'.join(x for x in nuevo if x is not None)
    if t != esperado:
        sys.exit('la aplicación secuencial no reproduce el texto esperado')
    print(f'{len(filas)} cambios en {len(corr)} líneas · grupos: ' + ', '.join(f"{g}={sum(f['grupo'] == g for f in filas)}" for g in G))
    print(f"v6 prevista (NO firmada): {len(t)} caracteres · sha256 {hashlib.sha256(t.encode('utf-8')).hexdigest()}")
    if '--vista' in sys.argv:
        Path(sys.argv[sys.argv.index('--vista') + 1]).write_bytes(t.encode('utf-8'))
    if '--cambios' in sys.argv:
        por = {}
        for f in filas:
            por.setdefault(f['linea_v5'], {'linea_v5': f['linea_v5'], 'antes': f['antes'], 'despues': f['despues']})['despues'] = f['despues']
        Path(sys.argv[sys.argv.index('--cambios') + 1]).write_text(json.dumps(list(por.values()), ensure_ascii=False), encoding='utf-8')
    if '--seco' in sys.argv:
        return
    (LOTE / 'transcripcion_candidata/correcciones_cotejo_complementaria.json').write_text(json.dumps(corr, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    coords = json.loads((LOTE / 'transcripcion_candidata/recortes_complementaria/coordenadas.json').read_text(encoding='utf-8'))
    with open(LOTE / 'RESOLUCION_COMPLEMENTARIA_A04.csv', 'w', encoding='utf-8', newline='') as fh:
        w = csv.writer(fh, lineterminator='\n')
        w.writerow(['id', 'grupo', 'linea_v5', 'pagina', 'articulo', 'antes', 'despues', 'marca', 'nota', 'recorte', 'decision_clo'])
        for k, f in enumerate(sorted(filas, key=lambda f: (list(G).index(f['grupo']), f['linea_v5'])), 1):
            n = f['linea_v5']
            w.writerow([f'K{k:03d}', f['grupo'], n, pag.get(n, ''), art(n), f['antes'], f['despues'], f['marca'], f['nota'], coords.get(str(n), ''), ''])


if __name__ == '__main__':
    main()
