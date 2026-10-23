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

/** ¿Hay una secuencia de al menos `minimo` dígitos escritos con palabras («nueve nueve ocho siete»)? */
export function contieneNumeroEnPalabras(texto: string, minimo = 4): boolean {
  const palabras = sinTildes(texto).match(/[a-zñ]+/g) ?? [];
  let racha = 0;
  for (const p of palabras) {
    if (DIGITOS.has(p)) {
      racha++;
      if (racha >= minimo) return true;
    } else if (!CONECTORES.has(p) || p === 'y') {
      // Una palabra que no es dígito corta la racha; «y» y los conectores no cuentan como corte entre dígitos.
      if (!CONECTORES.has(p)) racha = 0;
    }
  }
  return false;
}
