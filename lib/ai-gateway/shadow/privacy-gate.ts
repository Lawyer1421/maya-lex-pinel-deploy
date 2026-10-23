/**
 * lib/ai-gateway/shadow/privacy-gate.ts
 * MAYALEX AI GATEWAY v1 — PR-G3: privacy gate FAIL-CLOSED y determinista. Ningún LLM participa.
 *
 * Solo `estado: 'PASS'` permite un egress. Etapas en orden; la primera que rechaza gana:
 *  A. identificadores/PII conocidos            → REJECT   (pii-gate.ts)
 *  B. señales de expediente, cliente o doc.    → REJECT   (pii-gate.ts)
 *  C. texto largo o con apariencia documental  → REJECT
 *  D. consulta jurídica pública y abstracta    → PASS     (señal jurídica positiva, sin nombres propios)
 *  E. duda                                     → REJECT   (token capitalizado desconocido o sin señal jurídica)
 *
 * El resultado nombra la etapa y una razón-código; nunca el texto ni el dato detectado.
 *
 * G4-B: el benchmark offline (tests/privacy/benchmark-privacidad.ts) mide recall por categoría y falsos positivos. Cerrado
 * en G4: nombres completos por diccionario (nombres-propios.ts), números escritos con palabras, números judiciales,
 * correos y teléfonos con formatos adicionales, IBAN, pasaporte en inglés. PRIVACY_GATE_KNOWN_FALSE_NEGATIVES_PENDING
 * pasa a RIESGO RESIDUAL ACEPTABLE SOLO CON DECISIÓN EXPRESA (ver docs/governance/g4-pre-canary.md).
 *
 * FALSOS POSITIVOS CONOCIDOS (se rechaza algo público): nombres propios legítimos fuera del vocabulario
 *   («Tratado de Libre Comercio con Estados Unidos»), siglas no listadas, preguntas sin vocabulario jurídico
 *   reconocible, dos años o números de 4 dígitos seguidos («2019 2020») por la regla de teléfonos.
 * FALSOS NEGATIVOS RESIDUALES (pasa algo privado): nombres fuera del diccionario en minúscula y sin marcador
 *   («zacarias quiroz»), nombres que coinciden con palabras comunes, identificadores con formato no previsto.
 *   Un filtro determinista no los elimina; por eso va combinado con el gate de corpus público, un
 *   presupuesto fail-closed y un kill switch apagado por defecto. Las pruebas documentan ambos grupos.
 */
import { IDENTIFICADORES_DOCUMENTALES } from '../../legal-retrieval/instrument-gate';
import { ETAPA_POR_CATEGORIA, detectarPii } from './pii-gate';
import { enmascararEntidadesPublicas } from './entidades-publicas';

export type ResultadoPrivacidad =
  | { estado: 'PASS' }
  | { estado: 'REJECT'; etapa: 'A' | 'B' | 'C' | 'E'; razon: string };

export const LONGITUD_MAXIMA_PREGUNTA = 500;

const sinTildes = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Raíces léxicas jurídicas (sin tildes, minúsculas): al menos una prueba que la consulta es jurídica. */
const SENALES_JURIDICAS: readonly string[] = [
  'articulo', 'art.', 'codigo', 'ley', 'leyes', 'decreto', 'constitu', 'reglamento', 'gaceta', 'vigen', 'derog', 'abrog',
  'reform', 'norma', 'plazo', 'prescrip', 'caducidad', 'procedimiento', 'proceso', 'competencia', 'sancion', 'pena', 'delito',
  'recurso', 'apelacion', 'casacion', 'amparo', 'nulidad', 'garantia', 'derecho', 'obligacion', 'imputado', 'detencion',
  'prision', 'cautelar', 'juicio', 'audiencia', 'tribunal', 'juez', 'fiscal', 'notari', 'escritura', 'registro', 'contrato',
  'sociedad', 'tribut', 'impuesto', 'laboral', 'trabajo', 'familia', 'civil', 'penal', 'mercantil', 'comercio', 'herencia',
  'sucesion', 'propiedad', 'prueba', 'competente', 'jurisdiccion', 'legal', 'juridic', 'instrumento', 'resolucion',
  // G6-C: más raíces de consultas jurídicas públicas (civil, penal, procesal, mercantil, internacional).
  'demand', 'rebeld', 'testament', 'heredar', 'hereder', 'fianza', 'fiador', 'hipotec', 'usufruct', 'arrend', 'alquiler', 'inquilin',
  'divorc', 'patern', 'alimento', 'habeas', 'embargo', 'nulid', 'pagare', 'cheque', 'lavado', 'estafa', 'peculado', 'cohecho',
  'homicidio', 'lesion', 'hurto', 'extorsion', 'secuestro', 'fraude', 'usura', 'dolo', 'culpa', 'tutela', 'curatela', 'adopcion',
  'matrimonio', 'fideicomiso', 'quiebra', 'arbitraje', 'notificacion', 'citacion', 'emplazamiento', 'edicto', 'mandato', 'poder',
  'testigo', 'perito', 'allanamiento', 'flagrancia', 'costas', 'comiso', 'litispendencia', 'reconvencion', 'cosa juzgada', 'derechos humanos',
  'tratado', 'convencion', 'convenio', 'pacto', 'jurisprudencia', 'doctrina', 'teoria', 'principio', 'garantias', 'debido proceso',
  'electoral', 'municipal', 'administrativ', 'constituc', 'penal', 'tributar', 'aduaner', 'migrac', 'agrari', 'ambient', 'energia',
  'telecomunic', 'bancari', 'financier', 'consumidor', 'seguro', 'valores', 'competencia desleal', 'propiedad intelectual', 'patente',
  'ordenamiento', 'seguridad', 'policia', 'carrera judicial', 'procesal', 'accion', 'corte', 'justicia', 'atribucion', 'funcion', 'competencia',
  'sentenc', 'caso', 'archivo nacional', 'dominio', 'oportunidad', 'emancipa', 'patria potestad', 'nino', 'consejo', 'anticorrup', 'tradicion',
  'criterio', 'interes superior', 'convenc',
];

/** Palabras capitalizadas permitidas en una consulta jurídica pública (sin tildes, minúsculas). */
const CAPITALIZADAS_PERMITIDAS: ReadonlySet<string> = new Set([
  'codigo', 'ley', 'decreto', 'constitucion', 'reglamento', 'gaceta', 'honduras', 'republica', 'estado', 'procesal', 'penal',
  'civil', 'comercio', 'trabajo', 'familia', 'tributario', 'notariado', 'ninez', 'adolescencia', 'propiedad', 'registro',
  'nacional', 'personas', 'justicia', 'constitucional', 'organica', 'especial', 'electoral', 'municipalidades', 'contencioso',
  'administrativo', 'mercantil', 'sociedades', 'mercantiles', 'proteccion', 'consumidor', 'inquilinato', 'arrendamientos',
  'adopciones', 'violencia', 'domestica', 'armas', 'migracion', 'extranjeria', 'telecomunicaciones', 'energia', 'banca',
  'seguros', 'bancos', 'procedimiento', 'corte', 'suprema', 'congreso', 'poder', 'judicial', 'ejecutivo', 'legislativo',
  'ministerio', 'publico', 'fiscalia', 'tribunal', 'sala', 'articulo', 'titulo', 'capitulo', 'libro', 'seccion', 'segun',
  'sobre', 'del', 'de', 'la', 'el',
  // G6-C: vocabulario capitalizado de instituciones, leyes y tratados (palabras comunes, no nombres de persona).
  'interamericana', 'derechos', 'humanos', 'superior', 'cuentas', 'procuraduria', 'general', 'banco', 'central', 'servicio',
  'administracion', 'rentas', 'instituto', 'agrario', 'comisionado', 'alcaldia', 'municipal', 'inmueble', 'sistema', 'financiero',
  'contratacion', 'impuesto', 'renta', 'vehicular', 'testimonio', 'ordenamiento', 'ingresos', 'direccion', 'ejecutiva', 'secretaria',
  'seguridad', 'policia', 'carrera', 'supremo', 'unidas', 'naciones', 'carta', 'convencion', 'convenio', 'pacto', 'tratado',
  'declaracion', 'universal', 'americana', 'fiscal', 'juez', 'letras', 'magistrado', 'notario', 'procurador', 'presidente',
  'empresa', 'electrica', 'justicia', 'equidad', 'libre', 'estados', 'unidos', 'internacional', 'privado', 'reforma', 'aduanas',
  'hondureno', 'honduras', 'honduran', 'agraria', 'defensa', 'nacional', 'derecho', 'organizacion', 'instituciones', 'tributaria',
  'inversiones', 'proteccion', 'orgánica', 'lavado', 'activos', 'medio', 'ambiente', 'recursos', 'naturales', 'trabajadores',
  'archivo', 'consejo', 'anticorrupcion', 'nacion', 'nino', 'ninos', 'migratoria', 'electrico', 'financiera', 'valores', 'mercado', 'competencia', 'propiedad', 'intelectual', 'publica', 'publicas',
  // Palabras de los nombres de instrumentos que ya conoce instrument-gate (CODIGO_PROCESAL_PENAL → codigo, procesal, penal).
  ...Object.keys(IDENTIFICADORES_DOCUMENTALES).flatMap((k) => k.toLowerCase().split('_')),
]);

const SIGLAS_PERMITIDAS: ReadonlySet<string> = new Set(['cpp', 'cpc', 'cp', 'cc', 'ct', 'isr', 'isv', 'pcsj', 'bis', 'dni' /* rechazado antes por la etapa A */]);

const FORMULAS_DOCUMENTALES = /\b(?:CONSIDERANDO|POR TANTO|RESUELVE|FALLA|VISTOS?|RESULTANDO|ANTECEDENTES|HECHOS PROBADOS)\b|\ba las \d{1,2}[:.]\d{2}\s+horas\b/;

/** Palabras con las que empieza normalmente una consulta jurídica pública. */
const INICIOS_COMUNES: ReadonlySet<string> = new Set([
  'que', 'cual', 'cuales', 'como', 'cuando', 'donde', 'quien', 'quienes', 'cuanto', 'cuanta', 'cuantos', 'cuantas', 'por', 'para', 'si',
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo', 'al', 'del', 'de', 'en', 'con', 'sin', 'segun', 'sobre', 'ante', 'bajo',
  'contra', 'desde', 'entre', 'hacia', 'hasta', 'mediante', 'tras', 'durante', 'y', 'o', 'u', 'e', 'ni', 'pero', 'aunque', 'tambien', 'cuando',
  'es', 'son', 'esta', 'estan', 'hay', 'existe', 'existen', 'puede', 'pueden', 'debe', 'deben', 'se', 'me', 'mi', 'mis', 'tu', 'su', 'nuestro',
  'tengo', 'tiene', 'tienen', 'tenemos', 'quiero', 'necesito', 'queremos', 'busco', 'dime', 'digame', 'explica', 'explique', 'explicame',
  'indica', 'indique', 'cita', 'cite', 'resume', 'resuma', 'define', 'defina', 'compara', 'compare', 'lista', 'liste', 'enumera', 'enumere',
  'muestra', 'muestre', 'ayuda', 'ayudame', 'consulta', 'consulto', 'consultas', 'hola', 'buenos', 'buenas', 'gracias', 'favor', 'quisiera',
  'podria', 'podrian', 'seria', 'serian', 'habria', 'hablame', 'cuentame', 'dame', 'dar', 'dice', 'dicen', 'establece', 'regula', 'ahora',
  'entonces', 'ademas', 'asimismo', 'adicionalmente', 'otra', 'otro', 'otras', 'otros', 'este', 'esta', 'estos', 'estas', 'ese', 'esa',
  'aquel', 'cada', 'todo', 'toda', 'todos', 'todas', 'algun', 'alguna', 'algunos', 'algunas', 'ningun', 'ninguna', 'nuestra', 'nuestros',
  'a', 'ha', 'han', 'fue', 'fueron', 'ser', 'estar', 'tener', 'poder', 'deber', 'hacer', 'existe', 'procede', 'proceden', 'aplica', 'aplican',
  'sigue', 'siguen', 'rige', 'rigen', 'vale', 'valen', 'corresponde', 'corresponden', 'cabe', 'caben', 'requiere', 'exige', 'prescribe', 'caduca',
  'vence', 'vencen', 'cuenta', 'cuentan', 'queda', 'quedan', 'permite', 'prohibe', 'obliga', 'autoriza', 'faculta', 'otorga', 'concede', 'impone',
  'sanciona', 'castiga', 'penaliza', 'tipifica', 'preve', 'contempla', 'dispone', 'determina', 'fija', 'senala', 'consagra', 'garantiza',
  'reconoce', 'protege', 'ampara', 'contiene', 'incluye', 'comprende', 'abarca', 'cubre', 'significa', 'implica', 'consiste', 'constituye',
  'sera', 'seran', 'era', 'eran', 'fuera', 'sea', 'sean', 'haya', 'hubo', 'habia', 'hubiera', 'conviene', 'importa', 'sirve', 'sirven',
]);
function esInicioComun(palabra: string): boolean {
  return INICIOS_COMUNES.has(palabra) || SENALES_JURIDICAS.some((s) => palabra.startsWith(s.replace(/\.$/, '')));
}

function rechazo(etapa: 'A' | 'B' | 'C' | 'E', razon: string): ResultadoPrivacidad {
  return { estado: 'REJECT', etapa, razon };
}

/** Palabras con inicial mayúscula que no abren una oración. */
function capitalizadasFueraDeInicio(texto: string): string[] {
  const fuera: string[] = [];
  const re = /[\p{L}][\p{L}\p{N}'’-]*/gu;
  for (const m of texto.matchAll(re)) {
    const palabra = m[0];
    if (!/^\p{Lu}/u.test(palabra)) continue;
    // «173-B», «12-BIS»: la letra pegada a un número es parte de la referencia, no un nombre propio.
    const previo = texto[(m.index ?? 0) - 1];
    if (previo !== undefined && /[\d-]/.test(previo)) continue;
    const antes = texto.slice(0, m.index ?? 0).replace(/[\s¿¡"“«(]+$/u, '');
    const abreOracion = antes === '' || /[.?!:;]$/.test(antes);
    if (abreOracion) continue;
    fuera.push(palabra);
  }
  return fuera;
}

export function privacyGate(texto: unknown): ResultadoPrivacidad {
  if (typeof texto !== 'string' || texto.trim() === '') return rechazo('E', 'texto_invalido');
  const t = texto.trim();

  // A y B: identificadores y señales de cliente/expediente/documento privado.
  const categoria = detectarPii(t);
  if (categoria) return rechazo(ETAPA_POR_CATEGORIA[categoria], categoria);

  // C: texto largo o con apariencia documental.
  if (t.length > LONGITUD_MAXIMA_PREGUNTA) return rechazo('C', 'texto_largo');
  if (/[\r\n]/.test(t)) return rechazo('C', 'multilinea');
  if (FORMULAS_DOCUMENTALES.test(t)) return rechazo('C', 'formula_documental');
  if ((t.match(/[.?!]\s+\p{Lu}/gu) ?? []).length >= 3) return rechazo('C', 'varias_oraciones');

  // D: señal jurídica pública y abstracta.
  const plano = sinTildes(t);
  if (!SENALES_JURIDICAS.some((s) => plano.includes(s))) return rechazo('E', 'sin_senal_juridica');

  // B (ronda 2): una consulta que EMPIEZA por una palabra que no es interrogativa, función ni vocabulario jurídico suele empezar por un
  // nombre propio («wenceslao maldonado quiere…», «aceituno vendió…»). Se rechaza: un nombre al inicio no se distingue de una palabra rara.
  const primera = sinTildes(t).match(/^[^a-z0-9ñ]*([a-zñ]+)/);
  if (primera && !esInicioComun(primera[1])) return rechazo('B', 'NOMBRE_AL_INICIO');

  // E: cualquier palabra capitalizada fuera del vocabulario jurídico puede ser un nombre propio.
  for (const palabra of capitalizadasFueraDeInicio(enmascararEntidadesPublicas(t))) {
    if (/\d/.test(palabra)) continue;
    const p = sinTildes(palabra);
    if (CAPITALIZADAS_PERMITIDAS.has(p) || SIGLAS_PERMITIDAS.has(p)) continue;
    return rechazo('E', 'token_capitalizado_desconocido');
  }
  return { estado: 'PASS' };
}
