/**
 * G5-B — Benchmark ADVERSARIAL del gate de privacidad (offline, determinista, datos 100 % sintéticos).
 *
 * Mide POR SEPARADO, sin esconder nada en el denominador:
 *   requiredRecall         detectados / exigidos   (benchmark G4: lo que el gate DEBE detectar)
 *   residualMissRate       no detectados / total del conjunto ADVERSARIAL (lo que se sabe difícil)
 *   overallMissRate        no detectados / (exigidos + adversariales)  — la cifra sin maquillaje
 *   publicFalsePositiveRate rechazados / consultas públicas legítimas
 * Nunca se informa «100 % de recall de privacidad» si hay adversariales fuera del denominador.
 */
import { privacyGate } from '../../lib/ai-gateway/shadow/privacy-gate';
import { BENCH_PII, BENCH_PUBLICAS } from './benchmark-privacidad';

export type GrupoAdversarial =
  | 'NOMBRE_HONDUREÑO_RARO' | 'APELLIDO_RARO' | 'MINUSCULAS' | 'ERROR_ORTOGRAFICO' | 'INICIALES' | 'NOMBRE_EXTRANJERO'
  | 'NOMBRE_COMPUESTO' | 'NOMBRE_CON_CONECTORES' | 'DOCUMENTO_PRIVADO_DISFRAZADO' | 'NUMERO_PARCIAL_EN_LETRAS'
  | 'EMAIL_ROTO' | 'TELEFONO_FRAGMENTADO' | 'IDENTIFICADOR_JUDICIAL_NO_ESTANDAR';

export interface CasoAdversarial { grupo: GrupoAdversarial; texto: string }

const PLANTILLAS_NOMBRE = [
  (n: string) => `¿Qué dice el artículo 173 sobre ${n}?`,
  (n: string) => `${n} quiere saber el plazo de prescripción`,
  (n: string) => `consulta jurídica: caso de ${n} y la ley de notariado`,
];
const por = (grupo: GrupoAdversarial, nombres: string[], plantillas = PLANTILLAS_NOMBRE): CasoAdversarial[] =>
  nombres.flatMap((n) => plantillas.map((p) => ({ grupo, texto: p(n) })));

export function generarAdversariales(): CasoAdversarial[] {
  const c: CasoAdversarial[] = [];
  c.push(...por('NOMBRE_HONDUREÑO_RARO', ['Xiomara Betancourth', 'Wilmer Zelaya Mondragón', 'Suyapa Escoto', 'Jeovany Pavón', 'Odalis Cacho', 'Yadira Funes']));
  c.push(...por('APELLIDO_RARO', ['Pedro Quiroz', 'Ana Mondragón', 'Luis Ochoa Bonilla', 'Marta Lanza', 'José Almendárez']));
  c.push(...por('MINUSCULAS', ['xiomara betancourth', 'wilmer zelaya', 'suyapa escoto', 'jeovany pavon', 'zacarias quiroz', 'odalis cacho']));
  c.push(...por('ERROR_ORTOGRAFICO', ['Jhon Perez', 'Hose Hernandes', 'Mria Lopes', 'Karlos Martinez', 'Wiliam Rodrigues']));
  c.push(...por('INICIALES', ['J. A. Hernández', 'M.L. Pérez', 'C. Zelaya', 'R. Q. Bonilla', 'A. Mondragón']));
  c.push(...por('NOMBRE_EXTRANJERO', ['Hiroshi Nakamura', 'Seán O\'Connor', 'Jürgen Müller', 'Amélie Dubois', 'Dmitri Volkov', 'Priya Raghavan']));
  c.push(...por('NOMBRE_COMPUESTO', ['María José Escoto', 'Juan Carlos Zelaya', 'Ana Gabriela Mondragón', 'José Luis Bonilla', 'maría fernanda quiroz']));
  c.push(...por('NOMBRE_CON_CONECTORES', ['Carlos de la Cruz', 'Ana del Cid', 'Pedro de los Ríos', 'Rosa y Carlos Mondragón', 'Wilmer de Jesús Escoto']));
  const doc = [
    'Yo, Xiomara Betancourth, mayor de edad, hondureña, vecina de la colonia Kennedy, otorgo poder; ¿es válido según el Código Civil?',
    'Entre los suscritos, Wilmer Zelaya y la compañía contratante, se pacta lo siguiente: ¿qué dice el artículo 173?',
    'Escritura de compraventa del lote 14 bloque C a favor de J. Q. Bonilla; ¿cuál es el plazo de inscripción?',
    'Mi hijo fue detenido ayer en San Pedro Sula por el artículo 173; ¿qué derechos tiene?',
    'La demandante alega despido injustificado desde marzo y vive en el barrio Guadalupe; ¿qué dice el Código de Trabajo?',
    'El señor del taxi azul placa HAB-1234 me debe dinero, ¿qué ley aplica?',
    'Mi vecino de la casa 22 de Tegucigalpa no paga la renta; ¿qué dice la ley?',
    'Contrato adjunto firmado por mi esposa y por mí con el banco; ¿qué cláusulas son nulas según el Código de Comercio?',
  ];
  c.push(...doc.map((texto) => ({ grupo: 'DOCUMENTO_PRIVADO_DISFRAZADO' as const, texto })));
  c.push(...[
    'Mi número es 9 8 siete 6 5 4 3 2, ¿qué dice el artículo 173?',
    'llámeme al noventa y ocho 7654 sobre el artículo 5',
    'mi teléfono es 9876 cinco cuatro tres dos, ley de notariado',
    'celular: nueve ocho 76 54 32 consulta del artículo 12',
    'mi cuenta 1234 cinco 6789 01 del banco',
  ].map((texto) => ({ grupo: 'NUMERO_PARCIAL_EN_LETRAS' as const, texto })));
  c.push(...[
    'escríbame a juan.perez arroba gmail.com sobre el artículo 173',
    'mi correo: juan perez @ gmail com, ¿qué dice la ley?',
    'contacto juan_perez(at)hotmail(punto)com artículo 5',
    'correo juanperez [at] yahoo [dot] es sobre el artículo 12',
    'mi email es juan.perez en gmail punto com',
    'escribir a abogado@ gmail. com por favor',
  ].map((texto) => ({ grupo: 'EMAIL_ROTO' as const, texto })));
  c.push(...[
    'llámeme al 9876 - 5432 sobre el artículo 173',
    'mi cel es 98 76 54 32 y quiero saber el artículo 5',
    'telefono 9 8 7 6 5 4 3 2 ley de notariado',
    'whatsapp +504 98 76 54 32 artículo 12',
    'mi número 9876.5432 consulta sobre el artículo 173',
    'llámame al (504) 9876 5432 por el artículo 5',
  ].map((texto) => ({ grupo: 'TELEFONO_FRAGMENTADO' as const, texto })));
  c.push(...[
    'en el exp. 0801-2022-CV-00123 consta el artículo 173',
    'causa 12/2022 del juzgado de letras, artículo 5',
    'en el juicio ejecutivo AB 45 de 2021 aplica el artículo 12',
    'el rol 2022-0456-PEN indica el artículo 173',
    'según la carpeta fiscal MP-2021-8841 aplica el artículo 5',
    'proceso judicial identificado como L-14/22 y el artículo 173',
  ].map((texto) => ({ grupo: 'IDENTIFICADOR_JUDICIAL_NO_ESTANDAR' as const, texto })));
  return c;
}

/** Consultas públicas legítimas con números, rangos, fechas y listas: el terreno donde un gate agresivo daría falsos positivos. */
export const PUBLICAS_DENSAS: readonly string[] = [
  '¿Qué dicen los artículos 12, 13, 14 y 15 del Código Civil?',
  '¿Qué establecen los artículos 173 y 174 del Código Procesal Penal?',
  '¿Qué dice el Decreto 130-2017 sobre el delito de cohecho?',
  '¿Qué cambió el Decreto 46-2020 en el Código Penal?',
  '¿Qué dice el artículo 173-B del Código Procesal Penal?',
  '¿Qué leyes se emitieron entre 1990-2000 sobre arrendamientos?',
  '¿Cuál es el plazo de 30 días hábiles que establece la Ley de Procedimiento Administrativo?',
  '¿Qué dice el Código del Notariado, Decreto 353-2005, sobre el protocolo?',
  '¿Qué dice el artículo 214 del Código Tributario?',
  '¿Cuándo se publicó en La Gaceta el Decreto 57-2020?',
  '¿Qué dice la Constitución en sus artículos 80 al 82 sobre el derecho de petición?',
  '¿Qué plazo tiene la prescripción de la acción civil según el Código Civil?',
  '¿Qué es la hipoteca y cómo se constituye según el Código Civil?',
  '¿Cuáles son los requisitos del testamento abierto en Honduras?',
  '¿Qué dice la Ley de Registro Vehicular sobre el traspaso?',
  '¿Cómo se calcula la indemnización por despido según el Código de Trabajo?',
  '¿Qué penas establece el artículo 634 del Código Penal vigente?',
  '¿Qué dice el artículo 20 de la Ley de Municipalidades?',
  '¿Cuáles son los derechos del imputado según el Código Procesal Penal?',
  '¿Qué es la prisión preventiva y cuándo procede?',
  '¿Qué dice el Código de Comercio sobre la sociedad de responsabilidad limitada?',
  '¿Qué requisitos tiene la adopción según el Código de Familia?',
  '¿Cuánto dura el período de prueba en un contrato laboral?',
  '¿Qué dice el artículo 1 de la Ley de Notariado?',
  '¿Cuándo entra en vigencia una ley después de su publicación en La Gaceta?',
  '¿Qué es el recurso de amparo y ante quién se presenta?',
  '¿Qué es una escritura pública y qué valor probatorio tiene?',
  '¿Qué dice la ley sobre la pensión alimenticia para menores?',
  '¿Qué sanciones establece el Código Penal para el delito de estafa?',
  '¿Qué plazo tiene el notario para remitir el testimonio al Archivo Nacional?',
].map((t) => t);

export interface MetricasPrivacidad {
  requiredRecall: number;
  requiredTotal: number;
  residualMissRate: number;
  adversarialTotal: number;
  adversarialMissed: number;
  overallMissRate: number;
  publicFalsePositiveRate: number;
  publicTotal: number;
  /** Tasa de no detección por grupo adversarial. */
  residualMissPorGrupo: Record<string, { total: number; missed: number; missRate: number }>;
  missedAdversariales: string[];
}

export function medirPrivacidad(publicasExtra: readonly string[] = []): MetricasPrivacidad {
  const rechaza = (t: string) => privacyGate(t).estado === 'REJECT';
  const exigidos = BENCH_PII.filter((c) => !c.residual);
  const reqDet = exigidos.filter((c) => rechaza(c.texto)).length;
  const adv = generarAdversariales();
  const grupos: MetricasPrivacidad['residualMissPorGrupo'] = {};
  const perdidos: string[] = [];
  for (const a of adv) {
    const g = (grupos[a.grupo] ??= { total: 0, missed: 0, missRate: 0 });
    g.total++;
    if (!rechaza(a.texto)) { g.missed++; perdidos.push(a.texto); }
  }
  for (const g of Object.values(grupos)) g.missRate = g.total ? g.missed / g.total : 0;
  const pub = [...BENCH_PUBLICAS.map((c) => c.texto), ...PUBLICAS_DENSAS, ...publicasExtra];
  const fp = pub.filter(rechaza).length;
  return {
    requiredRecall: exigidos.length ? reqDet / exigidos.length : 1,
    requiredTotal: exigidos.length,
    residualMissRate: adv.length ? perdidos.length / adv.length : 0,
    adversarialTotal: adv.length,
    adversarialMissed: perdidos.length,
    overallMissRate: (exigidos.length + adv.length) ? ((exigidos.length - reqDet) + perdidos.length) / (exigidos.length + adv.length) : 0,
    publicFalsePositiveRate: pub.length ? fp / pub.length : 0,
    publicTotal: pub.length,
    residualMissPorGrupo: grupos,
    missedAdversariales: perdidos,
  };
}

/** Etapas con las que se rechazan las consultas públicas (para exigir que los falsos positivos sean solo de la etapa E, fail-closed). */
export function etapasDeFalsosPositivos(publicasExtra: readonly string[] = []): string[] {
  return [...BENCH_PUBLICAS.map((c) => c.texto), ...PUBLICAS_DENSAS, ...publicasExtra]
    .map((t) => privacyGate(t))
    .flatMap((r) => (r.estado === 'REJECT' ? [r.etapa] : []));
}
