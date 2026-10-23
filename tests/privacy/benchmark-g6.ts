/**
 * G6-C — Benchmark de privacidad, ronda 2 (offline, determinista, datos 100 % SINTÉTICOS; sin LLM, sin red).
 *
 * Mide POR SEPARADO:
 *   requiredRecall                      detectados / exigidos (formatos canónicos que el gate DEBE detectar). No es «privacy recall».
 *   residualMissRate                    no detectados / todo el conjunto ADVERSARIAL (G5 + ronda 2)
 *   overallMissRate                     no detectados / (exigidos + adversariales)
 *   publicFalsePositiveRate             consultas públicas SIN nombres propios rechazadas / total
 *   privateDocumentRecall               documentos privados disfrazados de consulta detectados / total
 *   publicNamedEntityFalsePositiveRate  consultas públicas CON nombres de funcionarios, jueces, autores, instituciones, empresas, casos o leyes rechazadas / total
 * Todos los nombres de personas privadas son inventados. Los nombres públicos son de obras, instituciones y casos de dominio público.
 */
import { privacyGate } from '../../lib/ai-gateway/shadow/privacy-gate';
import { BENCH_PII, BENCH_PUBLICAS } from './benchmark-privacidad';
import { generarAdversariales, PUBLICAS_DENSAS } from './benchmark-adversarial';

export type GrupoPrivado =
  | 'NOMBRE_HN_FUERA_DICCIONARIO' | 'NOMBRE_CENTROAMERICANO' | 'NOMBRE_EXTRANJERO' | 'NOMBRE_INDIGENA' | 'NOMBRE_POCO_FRECUENTE'
  | 'NOMBRE_MINUSCULA' | 'NOMBRE_MAYUSCULA' | 'ERROR_ORTOGRAFICO' | 'INICIALES' | 'NOMBRE_COMPUESTO' | 'APELLIDO_DOBLE'
  | 'CONECTORES' | 'NOMBRE_EN_PREGUNTA_JURIDICA'
  | 'DEMANDA' | 'CONTRATO' | 'ESCRITURA' | 'SENTENCIA' | 'EXPEDIENTE' | 'PROTOCOLO' | 'INSTRUMENTO' | 'FOLIO_TOMO' | 'DIRECCION'
  | 'DNI' | 'RTN' | 'PASAPORTE' | 'TELEFONO' | 'EMAIL' | 'CUENTA' | 'ID_OFUSCADO' | 'NUMERO_EN_PALABRAS';

export const GRUPOS_DOCUMENTO: readonly GrupoPrivado[] = ['DEMANDA', 'CONTRATO', 'ESCRITURA', 'SENTENCIA', 'EXPEDIENTE', 'PROTOCOLO', 'INSTRUMENTO', 'FOLIO_TOMO', 'DIRECCION'];
/** Identificadores en formato canónico: el gate DEBE detectarlos (cuentan en requiredRecall). */
export const GRUPOS_EXIGIDOS: readonly GrupoPrivado[] = ['DNI', 'RTN', 'PASAPORTE', 'EMAIL', 'CUENTA'];

export interface CasoPrivado { grupo: GrupoPrivado; texto: string }
export interface CasoPublico { tipo: 'SIN_NOMBRES' | 'ENTIDAD_PUBLICA'; subtipo?: string; texto: string }

const cada = (grupo: GrupoPrivado, valores: readonly string[], plantillas: ReadonlyArray<(v: string) => string>): CasoPrivado[] =>
  valores.flatMap((v) => plantillas.map((p) => ({ grupo, texto: p(v) })));

const PN = [
  (n: string) => `¿Qué dice el artículo 173 del Código Procesal Penal sobre la situación de ${n}?`,
  (n: string) => `${n} quiere saber cuál es el plazo de prescripción de la acción penal`,
  (n: string) => `consulta de ${n}: ¿procede la apelación contra el auto de prisión preventiva?`,
];

export function generarPrivadosG6(): CasoPrivado[] {
  const c: CasoPrivado[] = [];
  c.push(...cada('NOMBRE_HN_FUERA_DICCIONARIO', ['Xiomara Betancourth', 'Wilmer Zelaya', 'Suyapa Escoto', 'Jeovany Pavón', 'Odalis Cacho', 'Yadira Funes', 'Brayan Ordóñez', 'Heidy Mondragón', 'Olvin Quiñónez', 'Lesly Rápalo', 'Marbin Alvarenga', 'Berlis Fiallos'], PN));
  c.push(...cada('NOMBRE_CENTROAMERICANO', ['Nahúm Chavarría', 'Yenifer Barrientos', 'Ottoniel Cifuentes', 'Rigoberta Matzir', 'Danilo Jirón', 'Karelia Obando', 'Sonia Calderón Vega', 'Yorleny Chacón', 'Ariel Sandino Ruiz', 'Itzel Quijada'], PN));
  c.push(...cada('NOMBRE_EXTRANJERO', ['Hiroshi Nakamura', 'Seán O\'Connor', 'Jürgen Müller', 'Amélie Dubois', 'Dmitri Volkov', 'Priya Raghavan', 'Chen Wei', 'Olufemi Adeyemi', 'Ingrid Johansson', 'Matteo Bianchi'], PN));
  c.push(...cada('NOMBRE_INDIGENA', ['Ixchel Tzul', 'Kukulkán Pop', 'Tzunun Chub', 'Mayra Xol', 'Waslala Bans', 'Pedro Coy', 'Lempi Pech', 'Anaya Bodden', 'Tolupán Matute', 'Nayeli Chuc'], PN));
  c.push(...cada('NOMBRE_POCO_FRECUENTE', ['Zacarías Quiroz', 'Anastasio Mejicano', 'Bernabé Hernández Colindres', 'Edeltrudis Banegas', 'Eufemio Cáceres', 'Eustaquia Handal', 'Telésforo Amador', 'Hermógenes Padilla', 'Nicasia Turcios', 'Jacinta Rosales Mairena'], PN));
  c.push(...cada('NOMBRE_MINUSCULA', ['xiomara betancourth', 'wilmer zelaya', 'suyapa escoto', 'zacarias quiroz', 'odalis cacho', 'maria fernanda quiroz', 'juan carlos zelaya', 'ixchel tzul', 'jose luis bonilla', 'carlos de la cruz'], PN));
  c.push(...cada('NOMBRE_MAYUSCULA', ['XIOMARA BETANCOURTH', 'WILMER ZELAYA MONDRAGON', 'SUYAPA ESCOTO', 'ZACARIAS QUIROZ', 'JOSE ANTONIO HERNANDEZ', 'MARIA JOSE ESCOTO', 'IXCHEL TZUL', 'DILCIA PAVON'], PN));
  c.push(...cada('ERROR_ORTOGRAFICO', ['Jhon Perez', 'Hose Hernandes', 'Mria Lopes', 'Karlos Martinez', 'Wiliam Rodrigues', 'Xiomara Betancur', 'Wilmer Selaya', 'Suyapa Escoto Mondragon'], PN));
  c.push(...cada('INICIALES', ['J. A. Hernández', 'M.L. Pérez', 'C. Zelaya', 'R. Q. Bonilla', 'A. Mondragón', 'X. Betancourth', 'W. Z. Mondragón', 'S. Escoto'], PN));
  c.push(...cada('NOMBRE_COMPUESTO', ['María José Escoto', 'Juan Carlos Zelaya', 'Ana Gabriela Mondragón', 'José Luis Bonilla', 'maría fernanda quiroz', 'Luz Marina Cacho', 'Carlos Andrés Funes', 'Rosa Elvira Pavón'], PN));
  c.push(...cada('APELLIDO_DOBLE', ['Pedro Zelaya Mondragón', 'Ana Escoto Betancourth', 'Luis Quiñónez Rápalo', 'Marta Cacho Funes', 'José Ordóñez Alvarenga', 'Rosa Pavón Fiallos', 'Carlos Handal Banegas'], PN));
  c.push(...cada('CONECTORES', ['Carlos de la Cruz', 'Ana del Cid', 'Pedro de los Ríos', 'Rosa y Carlos Mondragón', 'Wilmer de Jesús Escoto', 'María de los Ángeles Pavón', 'José de la Paz Zelaya', 'Luz de María Cacho'], PN));
  c.push(...cada('NOMBRE_EN_PREGUNTA_JURIDICA', ['Xiomara Betancourth', 'wilmer zelaya', 'Suyapa Escoto', 'zacarias quiroz'], [
    (n) => `Según el Código Civil, ¿puede ${n} revocar el poder que otorgó?`,
    (n) => `¿Cuántos días tiene ${n} para contestar la demanda según el Código Procesal Civil?`,
    (n) => `¿Qué pena prevé el Código Penal para el delito que se le imputa a ${n}?`,
    (n) => `En el caso de ${n}, ¿qué dice la Ley de Notariado sobre la nulidad de la escritura?`,
  ]));

  const A = 'Xiomara Betancourth';
  const B = 'Wilmer Zelaya';
  c.push(
    ...cada('DEMANDA', [A, 'suyapa escoto', 'Odalis Cacho'], [
      (n) => `Demanda ejecutiva promovida por ${n} contra ${B}: ¿es admisible según el Código Procesal Civil?`,
      (n) => `La demandante ${n} reclama el pago de L 85,000; ¿qué plazo tiene para presentar la demanda?`,
      (n) => `Mi demanda de desahucio contra ${n} por falta de pago, ¿qué requisitos exige la ley?`,
      (n) => `Demanda de divorcio de ${n} por abandono del hogar; ¿qué dice el Código de Familia?`,
    ]),
    ...cada('CONTRATO', [A, 'wilmer zelaya', 'Suyapa Escoto'], [
      (n) => `Contrato de arrendamiento entre ${n} y la sociedad arrendadora: ¿es nula la cláusula de renovación automática?`,
      (n) => `En el contrato que firmé con ${n}, el comprador paga L 120,000 en cuotas; ¿qué dice el Código de Comercio?`,
      (n) => `Contrato adjunto entre ${n} y mi empresa: ¿qué cláusulas son nulas según la ley?`,
    ]),
    ...cada('ESCRITURA', [A, 'wilmer zelaya', 'Odalis Cacho'], [
      (n) => `Escritura de compraventa a favor de ${n} sobre el lote 14 bloque C, ¿cuál es el plazo de inscripción?`,
      (n) => `Escritura pública otorgada por ${n} ante notario: ¿qué requisitos de forma exige la Ley del Notariado?`,
      (n) => `¿Es válida la escritura de poder que otorgó ${n} sin testigos?`,
    ]),
    ...cada('SENTENCIA', [A, 'wilmer zelaya', 'Suyapa Escoto'], [
      (n) => `La sentencia que condena a ${n} a cuatro años, ¿cuándo prescribe la pena según el Código Penal?`,
      (n) => `Sentencia dictada en el juicio entre ${n} y ${B}: ¿qué recurso procede?`,
      (n) => `Contra la sentencia de primera instancia en el proceso de ${n}, ¿cuánto dura el plazo de apelación?`,
    ]),
    ...cada('EXPEDIENTE', [A, 'Odalis Cacho', 'wilmer zelaya'], [
      (n) => `En el expediente de ${n} consta una denuncia, ¿qué plazo tiene el fiscal según el Código Procesal Penal?`,
      (n) => `El expediente judicial de ${n} fue archivado; ¿puede reabrirse según la ley?`,
      (n) => `Revisando el legajo de ${n}, ¿qué dice el artículo 173 del Código Procesal Penal?`,
    ]),
    ...cada('PROTOCOLO', [A, 'Wilmer Zelaya', 'Suyapa Escoto'], [
      (n) => `En el protocolo del notario consta el testimonio de ${n}; ¿cuál es el plazo de remisión al Archivo Nacional?`,
      (n) => `Protocolo notarial, instrumento otorgado por ${n}: ¿qué dice la Ley del Notariado sobre su nulidad?`,
      (n) => `El testimonio otorgado a ${n} tiene un error en el nombre; ¿se corrige según la Ley del Notariado?`,
    ]),
    ...cada('INSTRUMENTO', [A, 'wilmer zelaya', 'Odalis Cacho'], [
      (n) => `Instrumento público número 45 otorgado por ${n}: ¿qué requisitos exige la ley?`,
      (n) => `El acta notarial que firmó ${n} el lunes, ¿tiene valor probatorio según el Código Procesal Civil?`,
      (n) => `Declaración jurada de ${n} sobre la propiedad, ¿qué valor tiene en un proceso civil?`,
    ]),
    ...cada('FOLIO_TOMO', ['folio 45 tomo 12', 'folio 118 del tomo 7', 'tomo 3 folio 20', 'folio No. 9 del tomo 21', 'inscrita en el tomo 15, folio 88'], [
      (v) => `La propiedad consta en ${v} del Registro; ¿qué dice la Ley de Propiedad sobre la inscripción?`,
      (v) => `Según ${v}, ¿cuál es el plazo para reclamar una servidumbre según el Código Civil?`,
    ]),
    ...cada('DIRECCION', ['barrio Los Almendros, casa 12, Choloma', 'colonia Kennedy, bloque C, casa 40', 'residencial El Trapiche, calle 3, casa 9', 'aldea La Venta, Francisco Morazán', 'avenida Circunvalación 5 calle, San Pedro Sula', 'bulevar Suyapa, apartamento 4B', 'lote 7 de la colonia Miraflores', 'casa 22 de la colonia Alameda'], [
      (v) => `Vivo en ${v} y mi vecino construyó un muro; ¿qué dice el Código Civil sobre las servidumbres?`,
      (v) => `El inmueble ubicado en ${v} fue embargado; ¿qué plazo hay para oponerse según el Código Procesal Civil?`,
    ]),
    ...cada('DNI', ['0801-1990-12345', '0501199001234', '1501 1985 00567', '0801-1975-04321', '0703 1992 01098', '0301-2000-00789'], [
      (v) => `Mi DNI es ${v}, ¿qué dice el artículo 173 del Código Procesal Penal?`,
      (v) => `identidad ${v} necesito saber el plazo de prescripción`,
    ]),
    ...cada('RTN', ['08011990123456', '0801-1990-123456', '05011985012345', '0801 1975 043210', '15011985001234'], [
      (v) => `Mi RTN es ${v}, ¿qué dice el Código Tributario sobre la prescripción?`,
      (v) => `RTN ${v} consulta sobre el artículo 214 del Código Tributario`,
    ]),
    ...cada('PASAPORTE', ['A1234567', 'C01234567', 'BB1234567', 'HN123456', 'E5678901'], [
      (v) => `Mi pasaporte ${v} venció, ¿qué dice la Ley de Migración?`,
      (v) => `passport number ${v} expired, what does the migration law say`,
    ]),
    ...cada('TELEFONO', ['9876-5432', '+504 3345 6789', '98 76 54 32', '9 8 7 6 5 4 3 2', '(504) 2234-5678', '3345.6789', '9876 5432', '504 9876 5432'], [
      (v) => `Llámeme al ${v} sobre el artículo 173 del Código Procesal Penal`,
      (v) => `mi celular es ${v}, ¿qué plazo establece la ley?`,
    ]),
    ...cada('EMAIL', ['juan.perez@example.com', 'abogado@gmail.com', 'x.betancourth@mail.hn', 'wilmer_zelaya@outlook.com'], [
      (v) => `Mi correo es ${v}, ¿qué dice el artículo 173?`,
      (v) => `escribir a ${v} sobre el plazo de prescripción`,
    ]),
    ...cada('CUENTA', ['12345678901', '4111 1111 1111 1111', 'HN12BANC00000012345678901234', '00112233445566', '3001-2345-6789-0123'], [
      (v) => `Mi cuenta ${v} del banco fue embargada, ¿qué dice el Código Procesal Civil?`,
      (v) => `Pagué con la tarjeta ${v}, ¿qué dice la Ley de Protección al Consumidor?`,
    ]),
    ...cada('ID_OFUSCADO', ['juan arroba gmail punto com', 'juan (at) gmail (dot) com', 'juan.perez [at] yahoo [dot] es', 'juan perez @ gmail com', 'abogado en gmail punto com', 'ju4n.p3rez(arroba)hotmail(punto)com', '0801-1990-1****', 'identidad cero ocho cero uno uno nueve nueve cero'], [
      (v) => `Escríbame a ${v} sobre el artículo 173 del Código Procesal Penal`,
      (v) => `mi dato de contacto es ${v}, ¿qué plazo establece la ley?`,
    ]),
    ...cada('NUMERO_EN_PALABRAS', ['nueve ocho siete seis cinco cuatro tres dos', '9 8 siete 6 5 4 3 2', 'noventa y ocho 7654 3210', 'ocho uno dos tres cuatro cinco seis siete', 'cero ocho cero uno mil novecientos noventa'], [
      (v) => `Mi número es ${v}, ¿qué dice el artículo 173?`,
      (v) => `llámeme al ${v} por la consulta del Código Penal`,
    ]),
  );
  return c;
}

const ENT = (subtipo: string, textos: readonly string[]): CasoPublico[] => textos.map((texto) => ({ tipo: 'ENTIDAD_PUBLICA', subtipo, texto }));

export function generarPublicosG6(): CasoPublico[] {
  const plain: CasoPublico[] = [
    ...BENCH_PUBLICAS.map((x) => x.texto),
    ...PUBLICAS_DENSAS,
    '¿Qué es la cosa juzgada y cuándo opera según el Código Procesal Civil?',
    '¿Cuál es el plazo para interponer un recurso de apelación en materia penal?',
    '¿Qué requisitos tiene el poder especial para vender un inmueble?',
    '¿Qué sanciones establece la Ley del Impuesto sobre la Renta por omisión de declaración?',
    '¿Qué es la legítima defensa y cuáles son sus requisitos en el Código Penal?',
    '¿Cuándo prescribe la acción civil derivada del delito?',
    '¿Qué dice la Ley de Contratación del Estado sobre la licitación pública?',
    '¿Cómo se computan los plazos procesales en días hábiles?',
    '¿Qué es el principio de favorabilidad en materia penal?',
    '¿Qué derechos tiene el trabajador en caso de despido indirecto según el Código de Trabajo?',
    '¿Qué dice el Código de Familia sobre la patria potestad?',
    '¿Cuál es el procedimiento para inscribir una sociedad mercantil en el Registro?',
    '¿Qué es la nulidad absoluta de un acto procesal?',
    '¿Qué prueba admite el Código Procesal Penal para acreditar un hecho?',
    '¿Cuáles son las causales de divorcio en el Código de Familia?',
    '¿Qué es el amparo y contra qué actos procede?',
    '¿Qué dice la Constitución sobre la nacionalidad hondureña?',
    '¿Cuál es la diferencia entre dolo y culpa en el Código Penal?',
    '¿Qué es la hipoteca y cómo se cancela según el Código Civil?',
    '¿Qué plazo tiene el empleador para pagar las vacaciones según el Código de Trabajo?',
    '¿Cómo se otorga un testamento cerrado según el Código Civil?',
    '¿Qué es una medida cautelar y cuándo se decreta en el proceso civil?',
    '¿Qué función cumple el notario en la autorización de una escritura pública?',
    '¿Qué dice el artículo 80 de la Constitución sobre el derecho de petición?',
    '¿Qué dice la ley sobre la prescripción adquisitiva de bienes inmuebles?',
    '¿Cuál es el plazo para reclamar el pago del aguinaldo según la ley laboral?',
    '¿Qué es el delito continuado en el Código Penal?',
    '¿Cuál es el efecto de la derogación de una ley sobre las situaciones anteriores?',
    '¿Qué dice el Código Procesal Civil sobre la notificación por edicto?',
    '¿Qué es el embargo preventivo y cuándo procede?',
  ].map((t) => (typeof t === 'string' ? { tipo: 'SIN_NOMBRES' as const, texto: t } : t));
  return [
    ...plain,
    ...ENT('INSTITUCION', [
      '¿Qué competencias tiene la Corte Suprema de Justicia según la Constitución?',
      '¿Qué funciones tiene el Ministerio Público en el proceso penal según el Código Procesal Penal?',
      '¿Qué atribuciones tiene el Congreso Nacional para reformar la Constitución?',
      '¿Qué dice la ley sobre las funciones del Registro de la Propiedad Inmueble y Mercantil?',
      '¿Qué es el Instituto Nacional Agrario y qué funciones establece la Ley de Reforma Agraria?',
      '¿Qué facultades tiene el Servicio de Administración de Rentas según el Código Tributario?',
      '¿Qué competencia tiene el Tribunal Superior de Cuentas según la ley?',
      '¿Qué funciones tiene la Procuraduría General de la República según la ley?',
      '¿Qué atribuciones tiene el Banco Central de Honduras según su ley orgánica?',
      '¿Cuál es la competencia de la Corte Interamericana de Derechos Humanos respecto de Honduras?',
      '¿Qué funciones tiene el Comisionado Nacional de los Derechos Humanos según la ley?',
      '¿Qué dice la Ley de Municipalidades sobre las atribuciones de la Alcaldía Municipal?',
    ]),
    ...ENT('EMPRESA', [
      '¿Qué dice el Código de Comercio sobre las sociedades anónimas como Banco Atlántida?',
      '¿Qué regula la Ley del Sistema Financiero sobre instituciones como Banco Ficohsa?',
      '¿Cómo regula la ley las obligaciones de la Empresa Nacional de Energía Eléctrica?',
      '¿Qué dice la Ley de Telecomunicaciones sobre concesiones a empresas como Tigo?',
    ]),
    ...ENT('AUTOR_JURISTA', [
      '¿Qué sostiene Hans Kelsen sobre la validez de las normas jurídicas?',
      '¿Cómo define Eduardo Couture la cosa juzgada en el proceso civil?',
      '¿Qué dice Luigi Ferrajoli sobre las garantías penales y el derecho penal mínimo?',
      '¿Qué teoría de los derechos fundamentales propone Robert Alexy?',
      '¿Cómo explica Francesco Carnelutti el concepto de acción procesal?',
      '¿Qué diferencia hace Ronald Dworkin entre reglas y principios jurídicos?',
      '¿Qué plantea Claus Roxin sobre la teoría del delito en el derecho penal?',
      '¿Qué dice Herbert Hart sobre la regla de reconocimiento en el derecho?',
    ]),
    ...ENT('CASO_PUBLICO', [
      '¿Qué resolvió la Corte Interamericana en el caso Velásquez Rodríguez contra Honduras sobre desaparición forzada?',
      '¿Qué estableció la Corte Interamericana en el caso López Lone y otros contra Honduras?',
      '¿Qué dijo el caso Marbury contra Madison sobre el control de constitucionalidad?',
      '¿Qué resolvió la Corte Interamericana en el caso Juan Humberto Sánchez contra Honduras?',
      '¿Qué doctrina sentó el caso Miranda contra Arizona sobre los derechos del detenido?',
    ]),
    ...ENT('LEGISLACION_CON_NOMBRE', [
      '¿Qué dice la Convención Americana sobre Derechos Humanos acerca de las garantías judiciales?',
      '¿Qué establece el Pacto de San José sobre el derecho a la libertad personal?',
      '¿Qué contiene la Ley de Justicia Constitucional sobre el hábeas corpus?',
      '¿Qué dice el Tratado de Libre Comercio entre Honduras y Estados Unidos sobre inversiones?',
      '¿Qué regula el Convenio de La Haya sobre la apostilla de documentos públicos?',
      '¿Qué dice la Declaración Universal de Derechos Humanos sobre el debido proceso?',
    ]),
    ...ENT('FUNCIONARIO_O_JUEZ_POR_CARGO', [
      '¿Qué funciones tiene el Fiscal General de la República según la ley?',
      '¿Qué competencia tiene un Juez de Letras de lo Penal según el Código Procesal Penal?',
      '¿Qué atribuciones tiene el Presidente de la Corte Suprema de Justicia?',
      '¿Qué puede resolver el Magistrado de la Sala de lo Constitucional en un amparo?',
      '¿Qué funciones tiene el Notario Público según la Ley del Notariado?',
      '¿Qué atribuciones tiene el Procurador General según la Constitución?',
    ]),
    ...ENT('PRECEDENTE_HISTORICO', [
      '¿Qué papel tuvo José Cecilio del Valle en la historia constitucional de Honduras?',
      '¿Qué principios defendía Francisco Morazán en la Constitución federal centroamericana?',
    ]),
  ];
}

export interface MetricasG6 {
  requiredRecall: number; requiredTotal: number;
  residualMissRate: number; adversarialTotal: number; adversarialMissed: number;
  overallMissRate: number; privateTotal: number; privateMissed: number;
  publicFalsePositiveRate: number; publicPlainTotal: number; publicPlainRejected: number;
  privateDocumentRecall: number; privateDocumentTotal: number;
  publicNamedEntityFalsePositiveRate: number; publicNamedTotal: number; publicNamedRejected: number;
  missPorGrupo: Record<string, { total: number; missed: number }>;
  fpPorSubtipo: Record<string, { total: number; rejected: number }>;
  etapasFalsosPositivos: string[];
  perdidos: string[];
  publicosRechazados: string[];
}

export function medirG6(extraPublicas: readonly string[] = []): MetricasG6 {
  const rechaza = (t: string) => privacyGate(t).estado === 'REJECT';
  const exigidosG4 = BENCH_PII.filter((x) => !x.residual);
  let reqTotal = exigidosG4.length;
  let reqDet = exigidosG4.filter((x) => rechaza(x.texto)).length;
  const g6 = generarPrivadosG6();
  const miss: string[] = [];
  const por: MetricasG6['missPorGrupo'] = {};
  let advTotal = generarAdversariales().length;
  let advMiss = generarAdversariales().filter((x) => !rechaza(x.texto)).length;
  for (const x of generarAdversariales().filter((y) => !rechaza(y.texto))) miss.push(x.texto);
  let docTotal = 0;
  let docDet = 0;
  for (const x of g6) {
    const ok = rechaza(x.texto);
    const e = (por[x.grupo] ??= { total: 0, missed: 0 });
    e.total++;
    if (!ok) { e.missed++; miss.push(x.texto); }
    if (GRUPOS_EXIGIDOS.includes(x.grupo)) { reqTotal++; if (ok) reqDet++; }
    else { advTotal++; if (!ok) advMiss++; }
    if (GRUPOS_DOCUMENTO.includes(x.grupo)) { docTotal++; if (ok) docDet++; }
  }
  const privTotal = exigidosG4.length + generarAdversariales().length + g6.length;
  const privMiss = (exigidosG4.length - exigidosG4.filter((x) => rechaza(x.texto)).length) + generarAdversariales().filter((y) => !rechaza(y.texto)).length + g6.filter((x) => !rechaza(x.texto)).length;

  const pub = generarPublicosG6();
  const plain = [...pub.filter((p) => p.tipo === 'SIN_NOMBRES').map((p) => p.texto), ...extraPublicas];
  const named = pub.filter((p) => p.tipo === 'ENTIDAD_PUBLICA');
  const plainRej = plain.filter(rechaza);
  const namedRej = named.filter((p) => rechaza(p.texto));
  const fp: MetricasG6['fpPorSubtipo'] = {};
  for (const p of named) {
    const e = (fp[p.subtipo ?? '?'] ??= { total: 0, rejected: 0 });
    e.total++;
    if (rechaza(p.texto)) e.rejected++;
  }
  const etapas = [...plainRej, ...namedRej.map((p) => p.texto)].map((t) => {
    const r = privacyGate(t);
    return r.estado === 'REJECT' ? r.etapa : 'PASS';
  });
  return {
    requiredRecall: reqTotal ? reqDet / reqTotal : 1, requiredTotal: reqTotal,
    residualMissRate: advTotal ? advMiss / advTotal : 0, adversarialTotal: advTotal, adversarialMissed: advMiss,
    overallMissRate: privTotal ? privMiss / privTotal : 0, privateTotal: privTotal, privateMissed: privMiss,
    publicFalsePositiveRate: plain.length ? plainRej.length / plain.length : 0, publicPlainTotal: plain.length, publicPlainRejected: plainRej.length,
    privateDocumentRecall: docTotal ? docDet / docTotal : 1, privateDocumentTotal: docTotal,
    publicNamedEntityFalsePositiveRate: named.length ? namedRej.length / named.length : 0, publicNamedTotal: named.length, publicNamedRejected: namedRej.length,
    missPorGrupo: por, fpPorSubtipo: fp, etapasFalsosPositivos: etapas, perdidos: miss, publicosRechazados: [...plainRej, ...namedRej.map((p) => p.texto)],
  };
}

// ── Conjunto de RETENCIÓN (holdout) ─────────────────────────────────────────────
// Escrito ANTES de mejorar el gate en la ronda 2 y no usado para ajustarlo: mide si la mejora generaliza o solo se ajustó al benchmark.
export const HOLDOUT_PRIVADOS: readonly string[] = [
  'mi tío edwin ardón quiere vender un terreno en Danlí, ¿necesita autorización según el Código Civil?',
  '¿maribel sarmiento puede heredar si no hay testamento según el Código Civil?',
  'el señor tomás aguilera fue notificado por edicto, ¿es válida la notificación según el Código Procesal Civil?',
  'nubia yanes demandó a su patrono por despido, ¿qué plazo tiene según el Código de Trabajo?',
  '¿Qué pena enfrenta ramón alberto cardona por el delito de estafa según el Código Penal?',
  'leticia banegas firmó un pagaré, ¿cuándo prescribe la acción cambiaria según el Código de Comercio?',
  'gerson andino y nohemy bulnes quieren divorciarse, ¿qué requisitos exige el Código de Familia?',
  'kevin matute fue detenido en flagrancia, ¿cuánto dura la detención según el Código Procesal Penal?',
  'para darwin ochoa, ¿qué dice la Ley de Notariado sobre la nulidad de un testamento?',
  'consulta por ivonne mairena: ¿puede el arrendador subir el alquiler según la ley de inquilinato?',
  'Hilda Zúniga Pagoada quiere impugnar la paternidad, ¿qué plazo establece el Código de Familia?',
  'el contrato de Rigoberto Alvarado con el banco, ¿es nulo por usura según el Código Civil?',
  'Mi cliente Elvia Sauceda necesita saber el plazo del recurso de casación',
  'la escritura de Amílcar Pineda presenta un error en el nombre, ¿se rectifica según la Ley de Notariado?',
  'el pasaporte de mi hija es P0987654 y se venció, ¿qué dice la ley de migración?',
  'mi identidad es cero ocho cero uno guion mil novecientos ochenta y ocho, ¿qué plazo establece la ley?',
  'correo: jperez ARROBA gmail PUNTO com, consulta sobre el Código de Comercio',
  'tel 9988 7766, ¿qué dice el Código Penal sobre la estafa?',
  'cuenta número 4532 1234 5678 9010, ¿qué dice el Código de Comercio sobre el cheque?',
  'vivo en la colonia Los Pinos, calle 4, casa 31 de Comayagüela y tengo un conflicto de linderos',
  'sentencia contra Wilfredo Matamoros por homicidio culposo, ¿qué pena prevé el Código Penal?',
  'el expediente 2025-0457 de la señora Dina Zepeda está en apelación, ¿qué plazo hay?',
  'folio 77 tomo 9 del protocolo de la notaria Ada Lanza, ¿qué dice la Ley del Notariado?',
  'mi hermano osmin pavón heredó una casa; ¿cómo se hace la partición según el Código Civil?',
  'erick dubón cosigned un préstamo, ¿qué responsabilidad tiene el fiador según el Código Civil?',
  '¿qué derechos tiene yolany chinchilla como trabajadora doméstica según el Código de Trabajo?',
  'demanda de alimentos de Karla Lagos contra su exesposo, ¿qué documentos exige el Código de Familia?',
  'Mi vecina Doris Flores tiene un perro peligroso, ¿qué dice el Código Penal sobre las lesiones?',
  'el testamento de don Telmo Rivas fue impugnado, ¿qué plazo establece el Código Civil?',
  'la señora Reina Oseguera ofreció su finca como garantía hipotecaria, ¿qué requisitos exige la ley?',
];

export const HOLDOUT_PUBLICOS: readonly CasoPublico[] = [
  ...[
    '¿Qué es el principio pro homine en derechos humanos?',
    '¿Qué significa in dubio pro reo en el proceso penal?',
    '¿Qué es la anticresis y cómo se constituye según el Código Civil?',
    '¿Qué es la enfiteusis en el derecho civil?',
    '¿Cuándo opera el beneficio de inventario en la herencia según el Código Civil?',
    '¿Qué es el fideicomiso según el Código de Comercio?',
    '¿Qué es el usufructo y cómo se extingue según el Código Civil?',
    '¿Qué es el ius cogens en el derecho internacional?',
    '¿Qué es la litispendencia en el proceso civil?',
    '¿Qué efectos tiene el allanamiento a la demanda según el Código Procesal Civil?',
    '¿Qué es la reconvención en el proceso civil?',
    '¿Qué es el comiso de bienes en el Código Penal?',
    '¿Quién paga las costas procesales según la ley?',
    '¿Qué es el peculado en el Código Penal?',
    '¿Qué es el cohecho pasivo según el Código Penal?',
    '¿Qué es la prescripción extintiva en el Código Civil?',
    '¿Qué es una cláusula penal en un contrato?',
    '¿Qué es el pacto comisorio y por qué lo prohíbe el Código Civil?',
    '¿Qué es la lesión enorme en los contratos según la ley?',
    '¿Qué dice la ley sobre la teoría de la imprevisión en los contratos?',
    '¿Cuál es el plazo de caducidad de la acción de nulidad de matrimonio?',
    '¿Qué es el habeas corpus y quién puede interponerlo?',
    '¿Qué es la jurisdicción voluntaria en el Código Procesal Civil?',
    '¿Qué es la rebeldía del demandado y cuáles son sus efectos?',
    '¿Qué sanciones prevé el Código Penal para el delito de lavado de activos?',
  ].map((texto) => ({ tipo: 'SIN_NOMBRES' as const, texto })),
  ...[
    '¿Qué dijo Norberto Bobbio sobre la teoría del ordenamiento jurídico?',
    '¿Qué establece la Carta de las Naciones Unidas sobre el uso de la fuerza entre Estados?',
    '¿Qué dice el Código Bustamante sobre el derecho internacional privado?',
    '¿Qué competencia tiene el Tribunal Supremo Electoral según la Ley Electoral?',
    '¿Qué plantea John Rawls en su teoría de la justicia como equidad?',
    '¿Qué funciones tiene la Dirección Ejecutiva de Ingresos según la ley?',
    '¿Qué dice la Convención de Viena sobre el derecho de los tratados?',
    '¿Qué atribuciones tiene la Secretaría de Seguridad según la Ley de la Policía?',
    '¿Qué dice la Ley Orgánica del Poder Judicial sobre la carrera judicial?',
    '¿Qué doctrina estableció la Corte Interamericana en el caso Almonacid Arellano contra Chile?',
  ].map((texto) => ({ tipo: 'ENTIDAD_PUBLICA' as const, subtipo: 'HOLDOUT', texto })),
];

export function medirHoldout() {
  const rechaza = (t: string) => privacyGate(t).estado === 'REJECT';
  const privMiss = HOLDOUT_PRIVADOS.filter((t) => !rechaza(t));
  const plain = HOLDOUT_PUBLICOS.filter((p) => p.tipo === 'SIN_NOMBRES');
  const named = HOLDOUT_PUBLICOS.filter((p) => p.tipo === 'ENTIDAD_PUBLICA');
  const plainRej = plain.filter((p) => rechaza(p.texto));
  const namedRej = named.filter((p) => rechaza(p.texto));
  return {
    holdoutPrivateMissRate: privMiss.length / HOLDOUT_PRIVADOS.length,
    holdoutPrivateTotal: HOLDOUT_PRIVADOS.length,
    holdoutPublicFalsePositiveRate: plainRej.length / plain.length,
    holdoutPublicTotal: plain.length,
    holdoutPublicNamedFalsePositiveRate: namedRej.length / named.length,
    holdoutNamedTotal: named.length,
    privadosPerdidos: privMiss,
    publicosRechazados: [...plainRej, ...namedRej].map((p) => p.texto),
  };
}

// ── Conjunto de RETENCIÓN 2 (fresco, hostil) ────────────────────────────────────
// Escrito DESPUÉS de las mejoras de la ronda 2, pensando como un atacante y SIN ajustar el gate a sus resultados.
// Es la estimación honesta de generalización: los dos benchmarks anteriores quedaron «contaminados» al ajustar el gate contra sus fallos.
export const HOLDOUT2_PRIVADOS: readonly string[] = [
  // nombres poco comunes, en minúscula y sin tratamiento
  'wenceslao maldonado quiere impugnar un testamento, ¿qué plazo establece el Código Civil?',
  'gumersindo pineda vendió dos veces el mismo lote, ¿qué dice el Código Penal sobre la estafa?',
  'aracely villatoro pidió una pensión alimenticia, ¿qué requisitos exige el Código de Familia?',
  'bayron sevilla firmó un pagaré en blanco, ¿es válido según el Código de Comercio?',
  'cleotilde mejía quiere revocar una donación, ¿qué dice el Código Civil?',
  'dagoberto castellanos fue absuelto, ¿puede apelar la fiscalía según el Código Procesal Penal?',
  'hosman lainez reclama indemnización por despido según el Código de Trabajo',
  'idania sabillón pretende inscribir una propiedad, ¿qué exige la Ley de Propiedad?',
  'joaquín ulloa dejó una deuda hipotecaria, ¿qué pasa con los herederos según el Código Civil?',
  'kenia madrid solicita el divorcio por mutuo consentimiento, ¿qué dice el Código de Familia?',
  'eufrasia tinoco heredó una casa en Olancho, ¿cómo se inscribe según la ley?',
  'ubaldina canales demandó por daños, ¿qué prescripción aplica según el Código Civil?',
  'pergentino lara fue citado a declarar, ¿tiene derecho a abogado según el Código Procesal Penal?',
  'herminio zambrana alega nulidad de contrato, ¿qué plazo prevé el Código Civil?',
  // un solo token
  'consulta de aceituno sobre el plazo de prescripción de la acción civil',
  'la denuncia de ochoa por estafa, ¿qué pena prevé el Código Penal?',
  'sobre el caso de turcios, ¿qué dice el Código Procesal Penal acerca de la prisión preventiva?',
  // apodos
  'el chele fue capturado, ¿qué plazo tiene el juez para audiencia inicial según el Código Procesal Penal?',
  'doña chepa quiere vender su casa, ¿necesita escritura pública según el Código Civil?',
  // con tratamiento y apellidos raros
  'el licenciado ardón presentó un recurso fuera de plazo, ¿qué dice el Código Procesal Civil?',
  'la señora ixmucané coy quiere inscribir un nacimiento tardío según el Código de Familia',
  // formatos de identificadores poco comunes
  'mi dni es 0801199912345, ¿qué plazo establece la ley?',
  'rtn 0801 1999 123456 consulta sobre el Código Tributario',
  'mi número de pasaporte es hn7654321, ¿qué dice la ley de migración?',
  'mi teléfono es nueve nueve uno dos tres cuatro cinco seis, ¿qué plazo establece la ley?',
  'contacto: alicia.mejia en outlook punto com, consulta sobre el Código Civil',
  'iban HN55 BAMC 0000 1234 5678 9012 3456 consulta sobre el Código de Comercio',
  'cuenta de ahorros 2201-01-000345 consulta sobre el Código de Comercio',
  'whatsapp 3344-5566 consulta sobre el artículo 173 del Código Procesal Penal',
  // documentos y direcciones disfrazados
  'otorgante: Teodora Pineda Sevilla, vecina de Choluteca; ¿es válido el poder que otorgó según el Código Civil?',
  'se presenta el siguiente contrato de compraventa: el vendedor Ovidio Salgado vende a Nelly Cruz el lote 8; ¿es nulo según el Código Civil?',
  'según el acta del tomo 5 folio 122, comparece Evelio Mondragón; ¿qué valor tiene según la Ley del Notariado?',
  'mi casa queda en el sector 3 de Villanueva, casa 14, y tengo un problema de linderos; ¿qué dice el Código Civil?',
  'la finca de mi abuelo, ubicada en El Zapotal de Yoro, ¿cómo se hereda según el Código Civil?',
  'mi madre y yo somos copropietarios, ¿cómo se divide el inmueble según el Código Civil?',
  'mi jefe me despidió ayer, ¿qué indemnización me corresponde según el Código de Trabajo?',
  'el banco me embargó el salario, ¿qué porcentaje es embargable según el Código de Trabajo?',
];

export const HOLDOUT2_PUBLICOS: readonly CasoPublico[] = [
  ...[
    '¿Qué es la acción pauliana y cuándo procede?',
    '¿Qué es el abuso de derecho en el Código Civil?',
    '¿Qué es el enriquecimiento sin causa según el Código Civil?',
    '¿Cuál es la diferencia entre posesión y tenencia en el Código Civil?',
    '¿Qué es la tradición como modo de adquirir el dominio?',
    '¿Qué son los bienes de dominio público según la Constitución?',
    '¿Qué es una servidumbre de paso y cómo se constituye?',
    '¿Qué es el principio de oportunidad en el Código Procesal Penal?',
    '¿Cuándo procede la suspensión condicional de la persecución penal?',
    '¿Qué es el criterio de oportunidad y quién lo aplica?',
    '¿Qué requisitos tiene la sentencia según el Código Procesal Civil?',
    '¿Qué recursos admite la sentencia definitiva en materia mercantil?',
    '¿Qué es el concordato preventivo según el Código de Comercio?',
    '¿Cómo se disuelve una sociedad mercantil según el Código de Comercio?',
    '¿Qué es la letra de cambio y qué requisitos formales exige la ley?',
    '¿Qué es la interrupción de la prescripción en el Código Civil?',
    '¿Qué prevé el Código Penal sobre el concurso real de delitos?',
    '¿Qué es la tentativa y cómo se sanciona según el Código Penal?',
    '¿Qué es el error de prohibición en el derecho penal?',
    '¿Qué dice la ley sobre la responsabilidad penal de las personas jurídicas?',
    '¿Cuál es el plazo para impugnar un acuerdo de la asamblea de accionistas?',
    '¿Qué es la hipoteca abierta y qué garantiza?',
    '¿Qué dice el Código de Familia sobre la unión de hecho y sus efectos patrimoniales?',
    '¿Qué es la emancipación y cómo se extingue la patria potestad?',
    '¿Cuándo es nulo un testamento por vicios de la voluntad?',
  ].map((texto) => ({ tipo: 'SIN_NOMBRES' as const, texto })),
  ...[
    '¿Qué sostuvo Piero Calamandrei sobre la función del proceso civil?',
    '¿Qué decidió la Corte Suprema de Justicia de la Nación Argentina en el caso Ekmekdjian contra Sofovich?',
    '¿Qué dice la Ley de Procedimiento Administrativo sobre el silencio administrativo?',
    '¿Qué atribuciones tiene el Consejo Nacional Anticorrupción según su ley?',
    '¿Qué funciones tiene el Registro Nacional de las Personas según la ley?',
    '¿Qué regula el Reglamento de la Ley de Contratación del Estado sobre las garantías?',
    '¿Qué competencia tiene la Sala de lo Constitucional respecto de la inconstitucionalidad?',
    '¿Qué dice la Convención sobre los Derechos del Niño acerca del interés superior?',
  ].map((texto) => ({ tipo: 'ENTIDAD_PUBLICA' as const, subtipo: 'HOLDOUT2', texto })),
];

export function medirHoldout2() {
  const rechaza = (t: string) => privacyGate(t).estado === 'REJECT';
  const privMiss = HOLDOUT2_PRIVADOS.filter((t) => !rechaza(t));
  const plain = HOLDOUT2_PUBLICOS.filter((p) => p.tipo === 'SIN_NOMBRES');
  const named = HOLDOUT2_PUBLICOS.filter((p) => p.tipo === 'ENTIDAD_PUBLICA');
  const plainRej = plain.filter((p) => rechaza(p.texto));
  const namedRej = named.filter((p) => rechaza(p.texto));
  return {
    holdout2PrivateMissRate: privMiss.length / HOLDOUT2_PRIVADOS.length,
    holdout2PrivateTotal: HOLDOUT2_PRIVADOS.length,
    holdout2PublicFalsePositiveRate: plainRej.length / plain.length,
    holdout2PublicTotal: plain.length,
    holdout2NamedFalsePositiveRate: namedRej.length / named.length,
    holdout2NamedTotal: named.length,
    privadosPerdidos: privMiss,
    publicosRechazados: [...plainRej, ...namedRej].map((p) => p.texto),
  };
}

// ── Conjunto de RETENCIÓN 3 (final; NO se ajusta el gate contra él) ─────────────
// Escrito después de cerrar las reglas de la ronda 2. Se mide UNA vez y se informa tal cual. Si alguien ajusta el gate para mejorar
// estas cifras, deja de ser retención y hay que escribir un conjunto nuevo.
export const HOLDOUT3_PRIVADOS: readonly string[] = [
  'quiero demandar a florencio aguiluz por no pagarme, ¿cuánto tarda un juicio ejecutivo según el Código Procesal Civil?',
  'se murió ambrosio padgett sin testamento, ¿quién hereda según el Código Civil?',
  '¿puede cirila banegas vender el terreno que le dejó su padre sin permiso de sus hermanos según el Código Civil?',
  'el patrono dagoberto sarmiento no me paga las vacaciones, ¿qué dice el Código de Trabajo?',
  'denuncié a ludovina quesada por injurias, ¿qué pena prevé el Código Penal?',
  'contra herlinda oquelí se presentó una querella, ¿qué plazo tiene para responder según el Código Procesal Penal?',
  'fidelina cabrera tiene un cheque sin fondos, ¿es delito según el Código Penal?',
  '¿cuánto tiempo tiene prosperina zavala para reclamar una pensión según el Código de Familia?',
  'mi abogada es nidia suazo y me cobró de más, ¿hay un límite de honorarios según la Ley del Notariado?',
  'anselmo irías compró una moto robada, ¿es delito de receptación según el Código Penal?',
  'rafaelina lópez de bonilla demanda la nulidad de su matrimonio, ¿qué causales establece el Código de Familia?',
  'm. a. cruz solicita la inscripción de una sociedad, ¿qué exige el Código de Comercio?',
  'el finado benedicto amaya dejó deudas, ¿responden los herederos según el Código Civil?',
  'según el expediente civil número 2025-1187, ¿qué plazo hay para apelar el auto de embargo?',
  'mi colega Yaneth Orellana pregunta si el notario puede autorizar un poder fuera de su jurisdicción según la Ley del Notariado',
  'en la causa 0801-2024-00912 el juez negó la fianza; ¿procede apelación según el Código Procesal Penal?',
  'escritura 118 de la notaria ruth esperanza lanza, ¿es nula si faltó un testigo según la Ley del Notariado?',
  'dirección: aldea Río Blanco, casa sin número, Olancho; ¿qué dice el Código Civil sobre la servidumbre?',
  'llámame al nueve cuatro cinco dos 3 3 1 8 para explicarte el caso penal',
  'escribe a lucila.reyes.abogada (arroba) gmail (punto) com con tu respuesta sobre el Código Civil',
  'mi número de identidad: 0 8 0 1 1 9 9 5 0 4 5 6 7, ¿qué plazo establece el Código Tributario?',
  'la tarjeta 5500 0000 0000 0004 fue clonada, ¿qué delito tipifica el Código Penal?',
  'el preso gelacio valladares lleva 14 meses sin juicio, ¿qué plazo máximo permite el Código Procesal Penal?',
  'gaudencio ordóñez, vecino de Danlí, ¿puede ser extraditado según el Código Procesal Penal?',
  'mi inquilino wilfredo cantarero no paga hace seis meses, ¿qué proceso inicio según el Código Procesal Civil?',
  '¿Qué responsabilidad tiene Merlin Argueta como socio de una sociedad anónima según el Código de Comercio?',
  'se presentó una demanda contra casimira paz y otros por usurpación de aguas, ¿qué dice la Ley de Aguas?',
  'oscar y brenda tzul acuerdan separación de bienes, ¿cómo se hace según el Código de Familia?',
  'jeremias mairena escribió: "te pago el lunes"; ¿vale ese mensaje como prueba según el Código Procesal Civil?',
  'cobraron a mi mamá una multa injusta, ¿cómo se impugna según la Ley de Procedimiento Administrativo?',
  'el niño tiene 12 años y vive con su abuela doña tomasa cálix, ¿puede ella pedir la guarda según el Código de la Niñez?',
  'felisa y gregorio sorto adoptaron a un menor en 2019, ¿qué efectos tiene la adopción según el Código de Familia?',
  'adriel colindres tiene 17 años y cometió un robo, ¿qué proceso aplica según el Código de la Niñez?',
  'ya firmé el contrato de arrendamiento con mi nuevo casero, ¿puede subirme el alquiler a mitad de año según el Código Civil?',
  'ubícame el expediente de la señora epifania ramos en el juzgado de Santa Rosa y dime qué dice el artículo 173',
  'la finca "La Esperanza" de mi familia en Yoro fue invadida, ¿qué acciones prevé el Código Penal?',
  'sofonías avilés pide la nulidad de una compraventa, ¿qué plazo establece el Código Civil?',
  'el testigo protegido anselma funes declaró en la audiencia, ¿puede la defensa conocer su identidad según el Código Procesal Penal?',
  'Pamela Ruth Matamoros Euceda, ¿qué plazo tiene para apelar una sentencia según el Código Procesal Penal?',
];

export const HOLDOUT3_PUBLICOS: readonly CasoPublico[] = [
  ...[
    'qué es la prescripción adquisitiva ordinaria y en cuánto tiempo opera',
    'cuál es la diferencia entre embargo y secuestro en el proceso civil',
    '¿Cuándo caduca la instancia en el proceso civil según el Código Procesal Civil?',
    '¿Qué es el desistimiento de la acción y qué efectos tiene?',
    '¿Qué se entiende por fuerza mayor en el derecho de obligaciones?',
    '¿Qué es una cláusula abusiva en un contrato de adhesión?',
    '¿Cuándo hay delito flagrante según el Código Procesal Penal?',
    '¿Qué es la libertad condicional y qué requisitos exige el Código Penal?',
    '¿Qué es la reincidencia y cómo agrava la pena?',
    '¿Qué es el cheque posdatado y qué valor tiene en el Código de Comercio?',
    '¿Qué dice la Constitución sobre la inviolabilidad del domicilio?',
    '¿Cuál es la edad de responsabilidad penal juvenil según la ley?',
    '¿Cómo se acredita la posesión de un inmueble en un título supletorio?',
    '¿Qué es la sociedad conyugal y cómo se liquida?',
    '¿Qué obligaciones tiene el fiador solidario según el Código Civil?',
    '¿Cuál es el plazo máximo de la detención preventiva en el Código Procesal Penal?',
    '¿Qué es la nulidad relativa y quién puede pedirla?',
    '¿Qué contiene un acta notarial de presencia?',
    '¿Qué dice la Ley del Notariado sobre el protocolo y su custodia?',
    '¿Cómo se solicita un habeas data según la Ley de Justicia Constitucional?',
    '¿Qué es el principio de non bis in idem?',
    '¿Qué es la acumulación de procesos y cuándo procede?',
    '¿Qué recursos caben contra el auto que deniega la prueba?',
    '¿Qué es la caución juratoria en el proceso penal?',
    '¿Qué pena corresponde a la tentativa de homicidio según el Código Penal?',
    '¿Qué dice el artículo 1 del Código de Comercio sobre los comerciantes?',
    '¿Qué es el derecho de retención en el Código Civil?',
    '¿Cuándo opera la compensación de deudas según el Código Civil?',
    '¿Qué es la confusión como modo de extinguir obligaciones?',
    '¿Qué es una prenda sin desplazamiento?',
  ].map((texto) => ({ tipo: 'SIN_NOMBRES' as const, texto })),
  ...[
    '¿Qué dijo el Tribunal Europeo de Derechos Humanos en el caso Golder contra el Reino Unido?',
    '¿Qué atribuciones tiene el Instituto de Acceso a la Información Pública?',
    '¿Qué es el Código de Hammurabi y qué influencia tuvo en el derecho?',
    '¿Qué dice el Estatuto de Roma sobre los crímenes de lesa humanidad?',
    '¿Qué regula el Acuerdo de Escazú sobre acceso a la información ambiental?',
    '¿Qué funciones tiene la Defensa Pública según la ley?',
    '¿Qué dice la Ley de Transparencia y Acceso a la Información Pública sobre la información reservada?',
    '¿Qué propone Gustavo Zagrebelsky sobre el derecho dúctil?',
    '¿Qué atribuciones tiene la Comisión Interamericana de Derechos Humanos?',
    '¿Qué estableció el caso Brown contra la Junta de Educación sobre la igualdad ante la ley?',
  ].map((texto) => ({ tipo: 'ENTIDAD_PUBLICA' as const, subtipo: 'HOLDOUT3', texto })),
];

export function medirHoldout3() {
  const rechaza = (t: string) => privacyGate(t).estado === 'REJECT';
  const privMiss = HOLDOUT3_PRIVADOS.filter((t) => !rechaza(t));
  const plain = HOLDOUT3_PUBLICOS.filter((p) => p.tipo === 'SIN_NOMBRES');
  const named = HOLDOUT3_PUBLICOS.filter((p) => p.tipo === 'ENTIDAD_PUBLICA');
  const plainRej = plain.filter((p) => rechaza(p.texto));
  const namedRej = named.filter((p) => rechaza(p.texto));
  return {
    holdout3PrivateMissRate: privMiss.length / HOLDOUT3_PRIVADOS.length,
    holdout3PrivateTotal: HOLDOUT3_PRIVADOS.length,
    holdout3PrivateMissed: privMiss.length,
    holdout3PublicFalsePositiveRate: plainRej.length / plain.length,
    holdout3PublicTotal: plain.length,
    holdout3PublicRejected: plainRej.length,
    holdout3NamedFalsePositiveRate: namedRej.length / named.length,
    holdout3NamedTotal: named.length,
    holdout3NamedRejected: namedRej.length,
    privadosPerdidos: privMiss,
    publicosRechazados: [...plainRej, ...namedRej].map((p) => p.texto),
  };
}
