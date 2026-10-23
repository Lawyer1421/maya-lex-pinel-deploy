/**
 * G4-B — Benchmark offline del gate de privacidad (sin red, sin LLM).
 * Cada caso lleva su categoría y si DEBE ser rechazado (`pii: true`) o pasar (`pii: false`).
 * `residual: true` marca un falso negativo CONOCIDO: el benchmark lo mide pero no lo exige.
 * Todos los datos son sintéticos.
 */
import { privacyGate } from '../../lib/ai-gateway/shadow/privacy-gate';

export type CategoriaBench =
  | 'NOMBRE_COMPLETO' | 'NOMBRE_SIN_TRATAMIENTO' | 'NOMBRE_CON_TRATAMIENTO'
  | 'DNI' | 'RTN' | 'TELEFONO' | 'EMAIL' | 'EMAIL_OFUSCADO' | 'PASAPORTE'
  | 'CUENTA' | 'EXPEDIENTE' | 'NUMERO_JUDICIAL' | 'NUMERO_EN_PALABRAS' | 'PUBLICA';

export interface CasoPrivacidad { categoria: CategoriaBench; texto: string; pii: boolean; residual?: boolean }

const P = (categoria: CategoriaBench, texto: string, residual = false): CasoPrivacidad => ({ categoria, texto, pii: true, residual });
const L = (texto: string): CasoPrivacidad => ({ categoria: 'PUBLICA', texto, pii: false });

export const BENCH_PII: readonly CasoPrivacidad[] = [
  P('NOMBRE_COMPLETO', 'Qué dice el artículo 173 sobre Pedro Martínez'),
  P('NOMBRE_COMPLETO', 'el caso de maria lopez y el artículo 173'),
  P('NOMBRE_COMPLETO', 'JOSE ANTONIO HERNANDEZ pregunta por la prescripción'),
  P('NOMBRE_COMPLETO', 'sobre carlos de la cruz y la ley de notariado'),
  P('NOMBRE_COMPLETO', 'Ana Gabriela Rodriguez Mejía quiere saber el plazo'),
  P('NOMBRE_COMPLETO', 'zacarias quiroz y el artículo 173', true),
  P('NOMBRE_SIN_TRATAMIENTO', 'Juan Pérez fue citado, ¿qué plazo hay?'),
  P('NOMBRE_SIN_TRATAMIENTO', 'luis fernandez necesita una escritura'),
  P('NOMBRE_SIN_TRATAMIENTO', 'ramon castillo vendió su casa'),
  P('NOMBRE_SIN_TRATAMIENTO', 'xiomara betancourth consulta el artículo 12', true),
  P('NOMBRE_CON_TRATAMIENTO', 'El señor Pedro Martínez pregunta por el artículo 173'),
  P('NOMBRE_CON_TRATAMIENTO', 'La licenciada María pidió el artículo 173'),
  P('NOMBRE_CON_TRATAMIENTO', 'Don Carlos consulta el artículo 173'),
  P('NOMBRE_CON_TRATAMIENTO', 'mi cliente quiere saber qué dice el artículo 173'),
  P('NOMBRE_CON_TRATAMIENTO', 'El imputado Rodríguez pregunta por el artículo 173'),
  P('NOMBRE_CON_TRATAMIENTO', 'la doctora Zuniga revisa el artículo 5'),
  P('DNI', 'Mi DNI es 0801-1990-12345, ¿qué dice el artículo 173?'),
  P('DNI', 'identidad 0801199012345 artículo 173'),
  P('DNI', 'dni 0501 1985 01234 consulta'),
  P('RTN', 'Mi RTN es 08011990123456, ¿qué dice el artículo 173?'),
  P('RTN', 'RTN 0801-1990-123456 y el artículo 10'),
  P('TELEFONO', 'Mi celular es +504 3345 6789, artículo 173'),
  P('TELEFONO', 'llámeme al 9876-5432 sobre el artículo 12'),
  P('TELEFONO', 'Escríbame al 7123 4567 sobre el artículo 173'),
  P('TELEFONO', 'mi teléfono 98765432 artículo 173'),
  P('TELEFONO', 'whatsapp 98 76 54 32 por favor'),
  P('TELEFONO', 'contacto (504) 2234-5678'),
  P('EMAIL', 'Mi correo es juan.perez@example.com, ¿qué dice el artículo 173?'),
  P('EMAIL', 'escribir a abogado@gmail.com sobre el artículo 5'),
  P('EMAIL_OFUSCADO', 'Escríbame a juan arroba gmail punto com sobre el artículo 173'),
  P('EMAIL_OFUSCADO', 'Escríbame a juan (at) gmail (dot) com sobre la ley'),
  P('EMAIL_OFUSCADO', 'mi correo juan @ gmail . com artículo 173'),
  P('EMAIL_OFUSCADO', 'mi correo juan at gmail dot com artículo 173'),
  P('PASAPORTE', 'Mi pasaporte A1234567 venció, ¿qué dice la ley?'),
  P('PASAPORTE', 'passport number C01234567 expired'),
  P('CUENTA', 'Mi cuenta 12345678901 del banco, ¿qué dice el artículo 173?'),
  P('CUENTA', 'Pagué con la tarjeta 4111 1111 1111 1111, artículo 173'),
  P('CUENTA', 'IBAN HN12BANC00000012345678901234 artículo 173'),
  P('EXPEDIENTE', 'En el expediente 2024-00123 consta el artículo 173'),
  P('EXPEDIENTE', 'Según el folio No. 45 del tomo, artículo 173'),
  P('EXPEDIENTE', 'En la causa No. 77 aplica el artículo 173'),
  P('NUMERO_JUDICIAL', 'caso número 123456 sobre el artículo 173'),
  P('NUMERO_JUDICIAL', 'en el proceso 0801-2022-00456 dictaron sentencia'),
  P('NUMERO_JUDICIAL', 'amparo 45-2022 y el artículo 173'),
  P('NUMERO_JUDICIAL', 'recurso de casación CP-123-2021 pendiente'),
  P('NUMERO_EN_PALABRAS', 'Mi número es nueve nueve ocho siete, ¿qué dice el artículo 173?'),
  P('NUMERO_EN_PALABRAS', 'llámeme al ocho uno dos tres cuatro cinco seis siete'),
  P('NUMERO_EN_PALABRAS', 'mi nÚmero: cero ocho cero uno uno nueve nueve cero'),
];

export const BENCH_PUBLICAS: readonly CasoPrivacidad[] = [
  L('¿Qué dice el artículo 173 del Código Procesal Penal?'),
  L('¿Cuál es el plazo de prescripción de la acción penal en Honduras?'),
  L('¿Qué requisitos tiene una escritura pública según el Código del Notariado?'),
  L('¿Qué establece el artículo 500 del Código del Notariado?'),
  L('¿Cuándo entró en vigencia el Código Penal de 2017?'),
  L('¿Qué dice la Constitución sobre el derecho de defensa?'),
  L('¿Qué es el principio de legalidad?'),
  L('¿Cuántos días tiene el empleador según el Código de Trabajo para pagar el decimotercer mes?'),
  L('¿Qué dice el artículo 12 de la Ley de Procedimiento Administrativo?'),
  L('¿Qué sanciones establece el Código de Comercio para la sociedad anónima?'),
  L('¿Qué es el habeas corpus según la Ley sobre Justicia Constitucional?'),
  L('¿Qué dice la Ley de Notariado sobre el protocolo del notario?'),
  L('¿Cuál es la edad mínima para contraer matrimonio en el Código de Familia?'),
  L('¿Qué dice el artículo 1 del Código Civil sobre la ley?'),
  L('¿Qué establece el Decreto 130-2017 sobre el delito de cohecho?'),
  L('¿Cuál es el procedimiento para la prueba anticipada?'),
];

/** Falsos positivos CONOCIDOS (etapa E, fail-closed): consultas sin vocabulario jurídico reconocible. Se registran, no se exigen. */
export const FP_CONOCIDOS: readonly string[] = ['¿Cuántos días tiene el empleador para pagar el decimotercer mes?'];

export interface ResultadoBench {
  recallPorCategoria: Record<string, { total: number; detectados: number; recall: number }>;
  recallGlobal: number;
  falsosNegativosExigidos: string[];
  residualesNoDetectados: string[];
  falsosPositivos: string[];
  tasaFalsosPositivos: number;
}

export function ejecutarBenchmark(publicasExtra: readonly string[] = []): ResultadoBench {
  const rechaza = (t: string) => privacyGate(t).estado === 'REJECT';
  const por: ResultadoBench['recallPorCategoria'] = {};
  const fnExigidos: string[] = [];
  const residuales: string[] = [];
  let tot = 0, det = 0;
  for (const c of BENCH_PII) {
    const ok = rechaza(c.texto);
    const e = (por[c.categoria] ??= { total: 0, detectados: 0, recall: 0 });
    if (!c.residual) { e.total++; tot++; if (ok) { e.detectados++; det++; } else fnExigidos.push(c.texto); }
    else if (!ok) residuales.push(c.texto);
  }
  for (const e of Object.values(por)) e.recall = e.total ? e.detectados / e.total : 1;
  const pub = [...BENCH_PUBLICAS.map((c) => c.texto), ...publicasExtra];
  const fp = pub.filter(rechaza);
  return {
    recallPorCategoria: por, recallGlobal: tot ? det / tot : 1,
    falsosNegativosExigidos: fnExigidos, residualesNoDetectados: residuales,
    falsosPositivos: fp, tasaFalsosPositivos: pub.length ? fp.length / pub.length : 0,
  };
}
