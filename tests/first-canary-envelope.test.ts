/** G6-D — envolvente de privacidad del primer canary: vocabulario cerrado, fail-closed por construcción. */
import { describe, expect, it } from 'vitest';
import {
  CONDICIONES_ENVOLVENTE, INSTRUMENTOS_ENVOLVENTE, condicionesEnvolvente, evaluarEnvolvente, todasLasCondicionesEnvolvente,
} from '@/lib/ai-gateway/canary/first-canary-envelope';
import { GOLDEN_G1 } from './golden/gateway-g1-casos';
import { BENCH_PII } from './privacy/benchmark-privacidad';
import { generarAdversariales } from './privacy/benchmark-adversarial';
import { HOLDOUT2_PRIVADOS, HOLDOUT3_PRIVADOS, HOLDOUT_PRIVADOS, generarPrivadosG6 } from './privacy/benchmark-g6';

const ok = (q: string) => evaluarEnvolvente(q).elegible;

describe('G6-D formas permitidas', () => {
  const VALIDAS = [
    '¿Qué dice el artículo 173 del Código Procesal Penal?',
    '¿Qué dice el artículo 500 del Código del Notariado?',
    '¿Qué establece el artículo 173-B del Código Procesal Penal?',
    '¿Qué deroga el artículo 634 del Código Penal (Decreto 130-2017) y desde cuándo está vigente?',
    '¿Sigue vigente el Decreto 57-2020?',
    '¿Está vigente el Código de Comercio?',
    '¿Cuál es el texto del artículo 1 de la Constitución de la República?',
    'qué reforma el decreto 46-2020 al código penal',
  ];
  for (const q of VALIDAS) it(`elegible: ${q}`, () => expect(evaluarEnvolvente(q).elegible, q).toBe(true));
  it('las preguntas del Golden Set de artículo exacto, vigencia y derogación son elegibles', () => {
    const elegibles = GOLDEN_G1.filter((c) => ok(c.input.sanitizedQuestion)).map((c) => c.id);
    expect(elegibles).toEqual(expect.arrayContaining(['G1-ABS-NOTARIADO-ART-500', 'G1-REF-ART-173-B-CPP', 'G1-VIG-CODIGO-PENAL-130-2017', 'G1-ART-TRIBUTARIO-214']));
  });
});

describe('G6-D rechazos (fail-closed)', () => {
  const RECHAZOS: Array<[string, string]> = [
    ['nombre propio capitalizado', '¿Qué dice el artículo 173 del Código Penal sobre Xiomara Betancourth?'],
    ['nombre propio en minúscula', '¿qué dice el artículo 173 sobre zacarias quiroz?'],
    ['tema libre', '¿Cuál es el plazo de prescripción de la acción penal?'],
    ['documento pegado (varias líneas)', '¿Qué dice el artículo 173?\nCONSIDERANDO que el contrato'],
    ['demasiado larga', `¿Qué dice el artículo 173 del Código Penal? ${'artículo '.repeat(30)}`],
    ['DNI', 'Mi DNI es 0801-1990-12345, ¿qué dice el artículo 173?'],
    ['email', '¿Qué dice el artículo 173? escríbame a x@gmail.com'],
    ['teléfono', '¿Qué dice el artículo 173? llámeme al 9876-5432'],
    ['dirección', '¿Qué dice el artículo 173 del Código Civil en la colonia Kennedy?'],
    ['cuenta', '¿Qué dice el artículo 173 y mi cuenta 12345678901?'],
    ['expediente', 'En el expediente 2024-00123 consta el artículo 173'],
    ['archivo adjunto', '¿Qué dice el artículo 173 del documento adjunto?'],
    ['primera persona', 'Mi cliente pregunta qué dice el artículo 173 del Código Penal'],
    ['instrumento fuera del registro', '¿Qué dice el artículo 173 del Código Inventado?'],
    ['número fuera de formato', '¿Qué dice el artículo 17333333 del Código Penal?'],
    ['comillas', '¿Qué dice el artículo 173 del "Código Penal"?'],
    ['sin ancla normativa', '¿Qué dice la ley?'],
    ['vacía', '   '],
  ];
  for (const [nombre, q] of RECHAZOS) it(`rechaza: ${nombre}`, () => expect(ok(q), q).toBe(false));
  it('una entrada que no es texto se rechaza', () => {
    for (const v of [undefined, null, 5, {}]) expect(evaluarEnvolvente(v).elegible).toBe(false);
  });
});

describe('G6-D cobertura de privacidad', () => {
  const privados = [
    ...BENCH_PII.map((c) => c.texto), ...generarAdversariales().map((c) => c.texto), ...generarPrivadosG6().map((c) => c.texto),
    ...HOLDOUT_PRIVADOS, ...HOLDOUT2_PRIVADOS, ...HOLDOUT3_PRIVADOS,
  ];
  it('NINGUNO de los casos privados de TODOS los conjuntos (incluidos los holdouts con falsos negativos del gate general) es elegible', () => {
    expect(privados.length).toBeGreaterThan(800);
    expect(privados.filter(ok)).toEqual([]);
  });
  it('fuzz: insertar una palabra fuera del vocabulario en una pregunta válida siempre la rechaza', () => {
    const base = '¿Qué dice el artículo 173 del Código Procesal Penal?';
    for (const intruso of ['xiomara', 'zacarias', 'betancourth', 'pregunta', 'prescripcion', 'cliente', 'abogado', 'juan', 'zelaya', 'ixchel', 'tzul', 'ambrosio', 'padgett', 'contrato', 'casa']) {
      expect(ok(base.replace('artículo', `${intruso} artículo`)), intruso).toBe(false);
      expect(ok(`${base} ${intruso}`), intruso).toBe(false);
    }
  });
  it('el vocabulario del registro no contiene nombres propios ni palabras de tema libre', () => {
    for (const i of INSTRUMENTOS_ENVOLVENTE) expect(i).toMatch(/^[a-z ]+$/);
    expect(INSTRUMENTOS_ENVOLVENTE.length).toBeLessThan(40);
  });
});

describe('G6-D las 13 condiciones del mandato, una por una', () => {
  it('existen las 13 y todas se cumplen en una pregunta válida', () => {
    expect(CONDICIONES_ENVOLVENTE).toHaveLength(13);
    const q = '¿Qué dice el artículo 173 del Código Procesal Penal?';
    expect(Object.values(condicionesEnvolvente(q)).every(Boolean)).toBe(true);
    expect(todasLasCondicionesEnvolvente(q)).toBe(true);
  });
  const FALLAS: Array<[string, string, string]> = [
    ['sin_DNI', 'Mi DNI es 0801-1990-12345, ¿qué dice el artículo 173?', 'sin_DNI'],
    ['sin_email', '¿Qué dice el artículo 173? x@gmail.com', 'sin_email'],
    ['sin_cuentas', '¿Qué dice el artículo 173 con la cuenta 12345678901?', 'sin_cuentas'],
    ['sin_expediente_privado', 'En el expediente 2024-00123 consta el artículo 173', 'sin_expediente_privado'],
    ['sin_archivos', '¿Qué dice el artículo 173 del archivo adjunto?', 'sin_archivos'],
    ['sin_contexto_privado_del_cliente', 'Mi cliente pregunta el artículo 173', 'sin_contexto_privado_del_cliente'],
    ['sin_direccion_privada', 'colonia Kennedy artículo 173 del Código Civil', 'sin_direccion_privada'],
  ];
  for (const [nombre, q, clave] of FALLAS) {
    it(`falla ${nombre}`, () => {
      expect(condicionesEnvolvente(q)[clave as keyof ReturnType<typeof condicionesEnvolvente>], q).toBe(false);
      expect(todasLasCondicionesEnvolvente(q)).toBe(false);
    });
  }
});
