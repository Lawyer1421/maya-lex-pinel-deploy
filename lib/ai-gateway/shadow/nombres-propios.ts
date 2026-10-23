/**
 * lib/ai-gateway/shadow/nombres-propios.ts
 * PR-G4-B: detección DETERMINISTA y conservadora de nombres de persona sin marcador, para el privacy gate.
 *
 * Diccionario de nombres de pila y apellidos frecuentes en Honduras y el mundo hispano (conocimiento común, no
 * datos personales de nadie). Un nombre se detecta solo como PAR de palabras consecutivas del diccionario
 * (nombre + nombre, nombre + apellido, apellido + apellido), con «de», «de la», «del» o «y» opcionales, sin
 * importar mayúsculas ni tildes. Una palabra suelta nunca se marca por sí sola: muchas son palabras comunes
 * («rosa», «flores», «reyes», «cruz»).
 *
 * LÍMITES CONOCIDOS: un nombre fuera del diccionario, un nombre de una sola palabra sin marcador o un nombre
 * extranjero poco común no se detectan. El benchmark (tests/privacy-benchmark.test.ts) los mide y documenta.
 */
const sinTildes = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const NOMBRES = new Set(
  (
    'juan jose carlos luis maria ana carmen rosa marta sandra wilmer kevin dilcia gloria fredy pedro miguel jorge manuel ' +
    'francisco antonio javier ricardo roberto daniel david fernando oscar victor hector mario eduardo alberto sergio ' +
    'rafael marvin nelson allan denis edgar elvin franklin german henry ivan jairo josue marlon noe omar raul ' +
    'ramon samuel santos selvin walter yeison alex andres angel armando cesar cristian erick esteban gustavo hugo ' +
    'isaac jesus joel julio leonel lorenzo lucas mauricio nicolas pablo rene salvador tomas ' +
    'lucia sofia isabel patricia laura claudia sara elena teresa dolores olga norma silvia yolanda mirian ' +
    'karla keila lesly lourdes mayra nancy reina sonia suyapa vilma wendy yessenia zoila alba blanca cecilia ' +
    'delia elsa emma fabiola flor gabriela graciela irma jessica juana karen leticia liliana lidia magdalena ' +
    'margarita martha melissa miriam nidia paola rebeca rocio ruth soledad susana victoria vanessa ' +
    'jimmy darwin delmer dunia glenda ingrid jacqueline kenia maribel yadira'
  ).split(' '),
);

const APELLIDOS = new Set(
  (
    'perez gonzalez rodriguez martinez lopez hernandez garcia sanchez ramirez flores mejia zelaya reyes cruz castro ' +
    'ortiz rivera mendoza aguilar carcamo funes maradiaga banegas bonilla euceda lagos pinel torres vasquez morales ' +
    'ramos gutierrez diaz alvarez romero ruiz jimenez moreno munoz alonso gomez fernandez medina vargas castillo ' +
    'navarro dominguez molina suarez ortega delgado cabrera salinas paz pineda rodas rosales sierra solis trejo ' +
    'urbina valladares velasquez villanueva zuniga acosta amador andino arriaga baca barahona bautista bustillo ' +
    'cardona carranza chavez coello colindres contreras cortes erazo escoto espinal fajardo figueroa fuentes galindo ' +
    'godoy guerrero guzman herrera irias izaguirre lara lemus lobo madrid mancia matute montoya nunez ochoa orellana ' +
    'oseguera padilla palma paredes pavon portillo quan quintanilla raudales reconco sabillon santos serrano sevilla ' +
    'tabora turcios umana varela vega vijil williams zepeda'
  ).split(' '),
);

const CONECTORES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e']);

type Clase = 'N' | 'A' | 'NA' | 'X';

function claseDe(palabra: string): Clase {
  const n = NOMBRES.has(palabra);
  const a = APELLIDOS.has(palabra);
  if (n && a) return 'NA';
  if (n) return 'N';
  if (a) return 'A';
  return 'X';
}

/** ¿El texto contiene un par consecutivo de nombre/apellido del diccionario? */
export function contieneNombreCompleto(texto: string): boolean {
  const palabras = sinTildes(texto).match(/[a-zñ]+/g) ?? [];
  // Se compacta cada palabra a su clase saltando conectores entre dos palabras del diccionario.
  for (let i = 0; i < palabras.length; i++) {
    const a = claseDe(palabras[i]);
    if (a === 'X') continue;
    let j = i + 1;
    while (j < palabras.length && CONECTORES.has(palabras[j])) j++;
    if (j >= palabras.length) continue;
    const b = claseDe(palabras[j]);
    if (b === 'X') continue;
    // Pares válidos: N+N, N+A, A+A (y las combinaciones con NA). Un apellido seguido de nombre de pila es raro
    // y se acepta igualmente: la prioridad es no dejar pasar nombres.
    return true;
  }
  return false;
}

const DIGITOS = new Set(['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve']);
/** Decenas y «once…diecinueve»: valen 2 dígitos en la cuenta mixta. */
const DECENAS = new Set([
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
  'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa',
]);

/**
 * ¿Hay dígitos escritos con palabras? Dos reglas independientes:
 *  1. al menos `minimo` palabras-dígito seguidas («nueve nueve ocho siete»);
 *  2. mezcla de palabras y cifras («9 8 siete 6 5 4 3 2», «noventa y ocho 7654») que sumen 6 o más dígitos,
 *     con al menos UNA palabra-número (así «artículos 12, 13, 14 y 15» o «2019 2020» no disparan esta regla).
 * Cualquier otra palabra corta la racha; los conectores («y», «de»…) no.
 */
export function contieneNumeroEnPalabras(texto: string, minimo = 4): boolean {
  const fichas = sinTildes(texto).match(/[a-zñ]+|\d+/g) ?? [];
  let racha = 0;
  let peso = 0;
  let hayPalabra = false;
  for (const f of fichas) {
    const esDigito = DIGITOS.has(f);
    const esDecena = DECENAS.has(f);
    if (esDigito) {
      racha++;
      if (racha >= minimo) return true;
    } else if (!CONECTORES.has(f) && !/^\d+$/.test(f)) racha = 0;
    if (esDigito || esDecena || /^\d+$/.test(f)) {
      peso += esDecena ? 2 : esDigito ? 1 : f.length;
      if (esDigito || esDecena) hayPalabra = true;
      if (hayPalabra && peso >= 6) return true;
    } else if (!CONECTORES.has(f)) {
      peso = 0;
      hayPalabra = false;
    }
  }
  return false;
}
