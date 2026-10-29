/**
 * lib/luna/privacy.ts
 * Privacidad de la modalidad «consulta jurídica general» (CLO 29-oct-2026). Capa ESTRICTA sobre el privacy gate del gateway
 * (PII, RTN/DNI, expediente, nombres, texto largo/documental, señal jurídica): añade lo que el gate base deja pasar a propósito para
 * consultas públicas — primera persona sobre hechos particulares, montos y fechas de un caso. Determinista, sin red, sin LLM.
 * Fail-closed y con falsos positivos aceptados: rechazar manda la consulta al proveedor actual SIN llamar a OpenAI.
 * El resultado nombra una razón-código; nunca el texto ni el dato detectado.
 */
import { privacyGate } from '../ai-gateway/shadow/privacy-gate';

export type ResultadoPrivacidadLuna = { estado: 'PASS' } | { estado: 'REJECT'; razon: string };

const sinTildes = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const PRIMERA_PERSONA =
  /\b(?:yo|me|mi|mis|mio|mia|mios|mias|conmigo|nosotros|nosotras|nos|nuestro|nuestra|nuestros|nuestras|soy|somos|estoy|estamos|tengo|tenemos|quiero|queremos|necesito|necesitamos|debo|debemos|puedo|podemos|fui|fuimos|hice|hicimos|vendi|compre|firme|demande|presente|pague|cobre|despidieron|despidio|denuncie|alquile|heredo|heredamos)\b/;
// Pretérito de 1.ª persona del singular con tilde («firmé», «vendí»); el texto se evalúa sin quitar tildes para esto.
const PRETERITO_1SG = /(?<!\p{L})\p{L}{3,}(?:é|í)(?!\p{L})/u;
const PRETERITO_NO_PERSONAL = new Set(['porque', 'aqui', 'alli', 'asi', 'mediante', 'jose', 'cafe', 'bebe']);

const MONTO = /(?:\b(?:l|lps?|usd|us|eur)\.?\s*[$]?\s*\d)|[$€]\s*\d|\d[\d.,]*\s*(?:lempiras?|lps?|dolares?|usd|euros?|mil\b|millones?\b)|\b(?:monto|suma|cantidad|valor|precio|deuda|salario|sueldo)\s+(?:de|por|es|fue|son)?\s*[l$]?\s*\d/;

const MESES = '(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)';
const FECHA_CONCRETA = new RegExp(
  [
    String.raw`\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b`,
    String.raw`\b\d{4}-\d{1,2}-\d{1,2}\b`,
    String.raw`\b\d{1,2}\s+de\s+${MESES}\b`,
    String.raw`\b${MESES}\s+(?:de\s+)?\d{4}\b`,
    String.raw`\b(?:ayer|anteayer|hoy|manana|el\s+(?:mes|ano)\s+pasado|la\s+semana\s+pasada|el\s+pasado\s+\w+)\b`,
    String.raw`\bhace\s+\d+\s+(?:dias?|semanas?|meses|anos?)\b`,
  ].join('|'),
);

const NUMERO_DE_CASO = /\b(?:exp(?:ediente)?|causa|caso|juicio|proceso|recurso|amparo|folio|tomo|asiento|matricula|escritura|poder|sentencia|auto|oficio|denuncia)s?\b\.?\s*(?:n[o°º]\.?|num(?:ero)?\.?|#)?\s*\d/;

// ── Generalidad POSITIVA (fail-closed) ────────────────────────────────────────────────────────────────────────────────────────────────
// Si el escaneo no puede clasificar la consulta como general con seguridad, se rechaza y la consulta va al proveedor actual.
// 1) Narración de hechos en tercera persona: pretérito o verbos de relato («despidió», «firmaron», «fue»): una consulta abstracta usa presente,
//    modales o condicionales.
const NARRACION_TERCERA = /(?:\b[a-z]{3,}(?:aron|ieron|yeron)\b|\b(?:fue|fueron|hubo|estuvo|tuvo|tuvieron|dijo|dijeron|hizo|hicieron|quiso|pudo|puso|vino|murio|caso|cometio|robo|golpeo|agredio|denuncio|demando)\b)/;
const NARRACION_TERCERA_ACENTUADA = /(?<!\p{L})\p{L}{3,}(?:ó|ió)(?!\p{L})/u;
// 2) Marcadores de persona concreta: tratamientos, «llamado», «cliente», «vecino»… seguidos de una palabra que puede ser un nombre.
const MARCADOR_PERSONA = /\b(?:senor|senora|senorita|don|dona|sr|sra|srta|lic|licenciado|licenciada|ing|ingeniero|ingeniera|dr|dra|doctor|doctora|llamado|llamada|apellidado|de nombre|cliente|clienta|vecino|vecina|patrono|patrona|empleado|empleada|demandado|demandada|denunciado|denunciada|imputado|imputada|acusado|acusada)\s+(?!de\b|del\b|la\b|el\b|los\b|las\b|que\b|en\b|por\b|con\b|sin\b|ante\b|para\b|puede\b|debe\b|tiene\b|pueden\b|deben\b|como\b|cuando\b|segun\b|si\b|y\b|o\b|a\b|es\b|ha\b|se\b|no\b|tambien\b|durante\b|despues\b|antes\b|dentro\b|fuera\b|frente\b|ni\b|al\b|un\b|una\b)[a-z]{3,}/;
// 3) Dos palabras desconocidas seguidas (p. ej. un nombre en minúscula): ni función, ni vocabulario jurídico, ni forma de sustantivo abstracto.
const FUNCION = new Set(('que cual cuales como cuando donde quien quienes cuanto cuanta cuantos cuantas por para sin con ante bajo contra desde entre hacia hasta segun sobre tras durante mediante ' +
  'el la los las un una unos unas lo al del de en y o u e ni pero aunque tambien es son esta estan hay existe existen puede pueden debe deben se ha han sea sean ser seria sera seran haya ' +
  'este esta estos estas ese esa esos esas aquel cada todo toda todos todas algun alguna algunos algunas ningun ninguna otro otra otros otras mismo misma si no mas menos muy ya aun ' +
  'cuando cual dice dicen establece regula dispone preve contempla exige requiere procede proceden aplica aplican rige rigen significa implica consiste constituye explica explique define ' +
  'defina indica indique cita cite resume resuma compara compare lista liste enumera enumere muestra muestre hablame dime digame cuenta cuentan lleva llevan tiene tienen puede hacer hace hacen ' +
  'caso casos forma modo manera tipo tipos parte partes persona personas cosa cosas ambito efectos efecto razon razones limite limites').split(/\s+/));
const SUFIJO_COMUN = /(?:cion|siones?|ciones|sion|dad|dades|mente|ario|aria|arios|arias|oso|osa|ivo|iva|ivos|ivas|ales?|ares?|ente|entes|ante|antes|ismo|ncia|ncias|miento|mientos|torio|toria|orio|oria|icos?|icas?|idos?|idas?|ando|iendo|ar|er|ir|ura|uras)$/;
const VOCABULARIO_EXTRA = /^(?:codigo|ley|leyes|decreto|articulo|articulos|norma|normas|constitu|reglament|gaceta|derech|proces|penal|civil|comerc|trabaj|familia|notari|tribut|medida|medidas|cautelar|prision|preventiva|preventivo|accion|plazo|recurs|apelac|casac|amparo|nulidad|prescrip|caducidad|pena|delito|juicio|audiencia|tribunal|juez|fiscal|sociedad|responsabilidad|limitada|poder|escritura|protocolo|registro|contrato|obligacion|herencia|sucesion|propiedad|prueba|competen|jurisdic|sentencia|demanda|fianza|hipoteca|arrend|alquiler|divorcio|alimento|embargo|testament|mandato|tutela|adopcion|matrimonio|quiebra|arbitraje|honduras|hondureno|republica|estado|publico|publica|diferencia|requisito|requisitos|vigencia|vigente|derogacion|reforma|instrumento|resolucion|garantia|garantias|debido|proceso|imputado|detencion|flagrancia|allanamiento)/;
function esDesconocida(w: string): boolean {
  return w.length >= 4 && !FUNCION.has(w) && !VOCABULARIO_EXTRA.test(w) && !SUFIJO_COMUN.test(w);
}
function dosDesconocidasSeguidas(plano: string): boolean {
  const palabras = plano.match(/[a-zñ]+|\d+|[.?!,;:]/g) ?? [];
  for (let i = 0; i + 1 < palabras.length; i++) if (esDesconocida(palabras[i]) && esDesconocida(palabras[i + 1])) return true;
  return false;
}

// 4) Lugar de un caso y persona indefinida con condición procesal: «alguien que vive en la aldea el ocotal es demandado». Una residencia o localidad
//    concreta, o «alguien» + parte procesal, es un hecho particular aunque no traiga nombre propio.
const RESIDENCIA = /\b(?:vive|viven|vivia|vivian|reside|residen|residia|habita|habitan|domiciliad[oa]s?|radicad[oa]s?|vecin[oa]s?\s+de|oriund[oa]s?\s+de|originari[oa]s?\s+de|natural\s+de|ubicad[oa]s?\s+en|con\s+domicilio\s+en)\b/;
const LOCALIDAD = /\b(?:aldea|aldeas|caserio|caserios|colonia|colonias|barrio|barrios|residencial|bo\.|col\.|municipio\s+de|ciudad\s+de|departamento\s+de|cantón|canton)\s+(?:de\s+|del\s+|la\s+|el\s+|las\s+|los\s+)?[a-zñ]{3,}/;
const PERSONA_INDEFINIDA = /\b(?:alguien|cierta\s+persona|determinad[oa]\s+persona|un\s+individuo|una\s+persona\s+de\s+nombre|fulan[oa]|mengan[oa]|zutan[oa])\b/;

export function privacidadConsultaGeneral(texto: unknown): ResultadoPrivacidadLuna {
  const base = privacyGate(texto);
  if (base.estado !== 'PASS') return { estado: 'REJECT', razon: `BASE_${base.etapa}_${base.razon}` };
  const t = (texto as string).trim();
  const plano = sinTildes(t);

  if (PRIMERA_PERSONA.test(plano)) return { estado: 'REJECT', razon: 'PRIMERA_PERSONA' };
  const m = PRETERITO_1SG.exec(t.toLowerCase());
  if (m && !PRETERITO_NO_PERSONAL.has(sinTildes(m[0]))) return { estado: 'REJECT', razon: 'PRETERITO_PRIMERA_PERSONA' };
  if (MONTO.test(plano)) return { estado: 'REJECT', razon: 'MONTO' };
  if (FECHA_CONCRETA.test(plano)) return { estado: 'REJECT', razon: 'FECHA_DE_CASO' };
  if (NUMERO_DE_CASO.test(plano)) return { estado: 'REJECT', razon: 'NUMERO_DE_CASO' };

  if (RESIDENCIA.test(plano)) return { estado: 'REJECT', razon: 'RESIDENCIA_O_LUGAR_DE_CASO' };
  if (LOCALIDAD.test(plano)) return { estado: 'REJECT', razon: 'LUGAR_DE_CASO' };
  if (PERSONA_INDEFINIDA.test(plano)) return { estado: 'REJECT', razon: 'PERSONA_INDEFINIDA_DE_CASO' };

  // Fail-closed: lo que no se puede clasificar como general con seguridad NO sale.
  if (NARRACION_TERCERA.test(plano) || NARRACION_TERCERA_ACENTUADA.test(t.toLowerCase())) return { estado: 'REJECT', razon: 'HECHOS_TERCERA_PERSONA' };
  if (MARCADOR_PERSONA.test(plano)) return { estado: 'REJECT', razon: 'MARCADOR_DE_PERSONA' };
  if (dosDesconocidasSeguidas(plano)) return { estado: 'REJECT', razon: 'NO_CLASIFICABLE_COMO_GENERAL' };
  return { estado: 'PASS' };
}
