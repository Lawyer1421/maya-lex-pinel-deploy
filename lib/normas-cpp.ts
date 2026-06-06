/**
 * MAYA PENAL 2.0 — BANCO DE NORMAS JURÍDICAS
 * ============================================================
 * Repositorio central de textos legales para Honduras.
 * Fuentes: CPP (D.9-99-E) · CP (D.130-2017) · Constitución HN
 *
 * INSTRUCCIÓN PARA EL ABOGADO PINEL:
 * Cada constante marcada con [INSERTAR TEXTO LITERAL...] requiere
 * que usted copie y pegue el texto exacto del artículo desde el PDF.
 * Cuando todas las marcadas 🔴 estén llenas, el motor funciona al 100%.
 *
 * CÓMO USAR:
 *   import { ART_294_CPP, NORMAS_CPP } from '@/lib/normas-cpp';
 *
 * FUENTES LOCALES:
 *   CPP: C:\Users\Fredy\OneDrive\...\05_LEYES_Y_CODIGOS\Codigo Procesal penal de Honduras.pdf
 *   CP:  C:\Users\Fredy\OneDrive\...\05_LEYES_Y_CODIGOS\CODIGO PENAL VIGENTE HONDURAS.pdf
 */

// ─────────────────────────────────────────────────────────────────────────────
// ESTADO DE IMPLEMENTACIÓN
// ─────────────────────────────────────────────────────────────────────────────
// 🔴 = CRÍTICO — bloquea funcionamiento básico (insertar primero)
// 🟠 = ALTA    — consolida la calidad del análisis
// 🟡 = MEDIA   — delitos especiales y recursos
// ✅ = COMPLETO — texto ya insertado
// ─────────────────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN A — CONSTITUCIÓN DE LA REPÚBLICA DE HONDURAS
// ══════════════════════════════════════════════════════════════════════════════

/** ✅ Art. 69 Const. HN — Libertad personal e inviolabilidad */
export const ART_69_CONST = `
Artículo 69. La libertad personal es inviolable y sólo con arreglo a las leyes podrá ser
restringida o suspendida temporalmente.
`.trim();

/** ✅ Art. 84 Const. HN — Derecho a la defensa */
export const ART_84_CONST = `
Artículo 84. Nadie puede ser arrestado o detenido sino en virtud de mandato escrito de
autoridad competente, expedido con las formalidades legales y por motivo previamente
definido en la Ley. Sin embargo, el delincuente in fraganti puede ser aprehendido por
cualquier persona para el único efecto de entregarlo a la autoridad.
`.trim();

/** ✅ Art. 88 Const. HN — Prohibición de autoincriminación */
export const ART_88_CONST = `
Artículo 88. Nadie puede ser obligado a declarar contra sí mismo, ni contra su cónyuge o
compañero de hogar, ni contra sus parientes dentro del cuarto grado de consanguinidad o
segundo de afinidad. No tendrá valor ninguna declaración obtenida por medio de
incomunicación, amenaza o torturas. Únicamente serán válidas las declaraciones rendidas
ante autoridad judicial competente.
`.trim();

/** ✅ Art. 89 Const. HN — Presunción de inocencia */
export const ART_89_CONST = `
Artículo 89. Toda persona es inocente mientras no se le haya declarado su
responsabilidad por autoridad competente.
`.trim();

/** ✅ Art. 99 Const. HN — Inviolabilidad del domicilio */
export const ART_99_CONST = `
Artículo 99. El hogar es inviolable. No se podrá efectuar en él ningún allanamiento o
registro, salvo en los casos y formas que la Ley prescribe.
`.trim();

/** ✅ Art. 16 Const. HN — Vinculación de tratados internacionales */
export const ART_16_CONST = `
Artículo 16. Los tratados internacionales celebrados por Honduras con otros Estados,
una vez que entran en vigor, forman parte del derecho interno.
`.trim();

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN B — CÓDIGO PROCESAL PENAL (D.9-99-E)
// PRINCIPIOS Y GARANTÍAS FUNDAMENTALES (Arts. 1-20)
// ══════════════════════════════════════════════════════════════════════════════

/** 🔴 Art. 1 CPP — Juicio previo (nulla poena sine iudicio) */
export const ART_1_CPP = `[INSERTAR TEXTO LITERAL ART. 1 CPP — Juicio previo]`;

/** 🔴 Art. 2 CPP — Presunción de inocencia procesal */
export const ART_2_CPP = `[INSERTAR TEXTO LITERAL ART. 2 CPP — Presunción de inocencia]`;

/** 🔴 Art. 4 CPP — Inviolabilidad del derecho de defensa */
export const ART_4_CPP = `[INSERTAR TEXTO LITERAL ART. 4 CPP — Inviolabilidad del derecho de defensa]`;

/** 🟠 Art. 11 CPP — Ne bis in idem (prohibición de doble juzgamiento) */
export const ART_11_CPP = `[INSERTAR TEXTO LITERAL ART. 11 CPP — Ne bis in idem]`;

/** 🟠 Art. 14 CPP — Igualdad procesal entre las partes */
export const ART_14_CPP = `[INSERTAR TEXTO LITERAL ART. 14 CPP — Igualdad procesal]`;

/** 🟠 Art. 28 CPP — Criterio de oportunidad (Ministerio Público) */
export const ART_28_CPP = `[INSERTAR TEXTO LITERAL ART. 28 CPP — Criterio de oportunidad]`;

/** 🟠 Art. 29 CPP — Suspensión condicional del proceso */
export const ART_29_CPP = `[INSERTAR TEXTO LITERAL ART. 29 CPP — Suspensión condicional del proceso]`;

// ── Derechos del imputado (Arts. 84-101 CPP) ─────────────────────────────────

/** 🟠 Art. 84 CPP — Derechos procesales del imputado (no confundir con Art. 84 Const.) */
export const ART_84_CPP = `[INSERTAR TEXTO LITERAL ART. 84 CPP — Derechos del imputado en el proceso]`;

/** 🟠 Art. 90 CPP — Derecho a la asistencia de defensor */
export const ART_90_CPP = `[INSERTAR TEXTO LITERAL ART. 90 CPP — Derecho a asistencia letrada]`;

/** 🟠 Art. 94 CPP — Derecho del imputado a ser oído */
export const ART_94_CPP = `[INSERTAR TEXTO LITERAL ART. 94 CPP — Derecho a ser oído]`;

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN C — NULIDADES PROCESALES (Art. 166 CPP)
// ══════════════════════════════════════════════════════════════════════════════

/** 🔴 Art. 166 CPP — Nulidades absolutas del proceso */
export const ART_166_CPP = `[INSERTAR TEXTO LITERAL ART. 166 CPP — Nulidades absolutas]`;

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN D — MEDIDAS CAUTELARES (Arts. 172-186 CPP)
// ══════════════════════════════════════════════════════════════════════════════

/** 🔴 Art. 172 CPP — Presupuestos de las medidas cautelares (Fumus + Periculum) */
export const ART_172_CPP = `[INSERTAR TEXTO LITERAL ART. 172 CPP — Presupuestos legitimadores de medidas cautelares]`;

/** 🔴 Art. 175 CPP — Tipos de medidas cautelares personales (catálogo) */
export const ART_175_CPP = `[INSERTAR TEXTO LITERAL ART. 175 CPP — Tipos de medidas cautelares]`;

/** 🔴 Art. 178 CPP — Prisión preventiva: presupuestos específicos */
export const ART_178_CPP = `[INSERTAR TEXTO LITERAL ART. 178 CPP — Presupuestos de la prisión preventiva]`;

/** 🔴 Art. 179 CPP — Criterios específicos del peligro de fuga */
export const ART_179_CPP = `[INSERTAR TEXTO LITERAL ART. 179 CPP — Criterios del peligro de fuga (incisos a-h)]`;

/** 🔴 Art. 180 CPP — Criterios del peligro de obstaculización de la investigación */
export const ART_180_CPP = `[INSERTAR TEXTO LITERAL ART. 180 CPP — Criterios del peligro de obstaculización]`;

/** 🟠 Art. 181 CPP — Duración máxima de la prisión preventiva */
export const ART_181_CPP = `[INSERTAR TEXTO LITERAL ART. 181 CPP — Duración máxima de la prisión preventiva]`;

/** 🔴 Art. 183 CPP — Prohibiciones absolutas de la prisión preventiva */
export const ART_183_CPP = `[INSERTAR TEXTO LITERAL ART. 183 CPP — Prohibiciones absolutas (mayores 60 años, embarazadas, enfermos terminales)]`;

/** 🔴 Art. 184 CPP — Medidas cautelares sustitutivas a la prisión preventiva */
export const ART_184_CPP = `[INSERTAR TEXTO LITERAL ART. 184 CPP — Medidas cautelares sustitutivas]`;

/** 🔴 Art. 185 CPP — Tipos de medidas sustitutivas (caución, arresto domiciliario, monitoreo) */
export const ART_185_CPP = `[INSERTAR TEXTO LITERAL ART. 185 CPP — Catálogo de medidas sustitutivas con incisos]`;

/** 🟠 Art. 186 CPP — Revisión y sustitución de medidas cautelares */
export const ART_186_CPP = `[INSERTAR TEXTO LITERAL ART. 186 CPP — Revisión de medidas cautelares]`;

/** 🟡 Art. 187 CPP — Acta de la audiencia de medidas cautelares */
export const ART_187_CPP = `[INSERTAR TEXTO LITERAL ART. 187 CPP — Requisitos del acta de medidas cautelares]`;

// ── Objeto consolidado de medidas sustitutivas para referencia rápida ─────────
export const MEDIDAS_SUSTITUTIVAS_ART185 = [
  'Art. 185.1 CPP — Presentación periódica ante el juzgado',
  'Art. 185.2 CPP — Prohibición de salida del país',
  'Art. 185.3 CPP — Prohibición de salida del municipio o departamento',
  'Art. 185.4 CPP — Caución económica o fianza',
  'Art. 185.5 CPP — Arresto domiciliar con o sin vigilancia',
  'Art. 185.6 CPP — Dispositivo de monitoreo electrónico',
] as const;

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN E — PRUEBA Y VALORACIÓN (Arts. 200-202 CPP)
// ══════════════════════════════════════════════════════════════════════════════

/** 🔴 Art. 200 CPP — Prueba prohibida / prueba ilícita */
export const ART_200_CPP = `[INSERTAR TEXTO LITERAL ART. 200 CPP — Prueba ilícita (medios ilícitos, tortura, vulneración de derechos)]`;

/** 🟠 Art. 202 CPP — Valoración de la prueba por sana crítica racional */
export const ART_202_CPP = `[INSERTAR TEXTO LITERAL ART. 202 CPP — Valoración por sana crítica racional]`;

/** 🟡 Art. 205 CPP — Interceptación de comunicaciones: requisitos judiciales */
export const ART_205_CPP = `[INSERTAR TEXTO LITERAL ART. 205 CPP — Interceptación de comunicaciones privadas]`;

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN F — ETAPA PREPARATORIA: INVESTIGACIÓN Y REQUERIMIENTO (Arts. 276-316)
// ══════════════════════════════════════════════════════════════════════════════

/** 🟠 Art. 276 CPP — Inicio de la investigación / Rol del Ministerio Público */
export const ART_276_CPP = `[INSERTAR TEXTO LITERAL ART. 276 CPP — Inicio de la investigación penal]`;

/** 🔴 Art. 294 CPP — Contenido obligatorio del requerimiento fiscal (7 elementos) */
export const ART_294_CPP = `[INSERTAR TEXTO LITERAL ART. 294 CPP — Contenido del requerimiento fiscal (todos los numerales)]`;

/**
 * Los 7 elementos del Art. 294 CPP que deben verificarse en todo requerimiento.
 * Usar con analizarRequerimientoFiscal() en lib/calculadoras/requerimiento-analyzer.ts
 */
export const ART_294_CPP_ELEMENTOS = {
  identificacion_imputado: '[INSERTAR TEXTO NUMERAL 1 ART. 294 CPP — Identificación del imputado]',
  relacion_hechos:          '[INSERTAR TEXTO NUMERAL 2 ART. 294 CPP — Relación clara, precisa y circunstanciada de los hechos]',
  calificacion_juridica:    '[INSERTAR TEXTO NUMERAL 3 ART. 294 CPP — Calificación jurídica provisional]',
  elementos_conviccion:     '[INSERTAR TEXTO NUMERAL 4 ART. 294 CPP — Elementos de convicción]',
  individualizacion:        '[INSERTAR TEXTO NUMERAL 5 ART. 294 CPP — Individualización de la participación]',
  peticion_concreta:        '[INSERTAR TEXTO NUMERAL 6 ART. 294 CPP — Petición concreta al juzgado]',
  fundamentacion_medidas:   '[INSERTAR TEXTO NUMERAL 7 ART. 294 CPP — Fundamentación de medidas cautelares solicitadas]',
} as const;

/** 🔴 Art. 297 CPP — Sobreseimiento definitivo y provisional */
export const ART_297_CPP = `[INSERTAR TEXTO LITERAL ART. 297 CPP — Sobreseimiento (definitivo y provisional, causales)]`;

/** 🔴 Art. 316 CPP — Excepciones procesales y tramitación */
export const ART_316_CPP = `[INSERTAR TEXTO LITERAL ART. 316 CPP — Excepciones procesales: enumeración y procedimiento]`;

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN G — ETAPA INTERMEDIA Y JUICIO ORAL (Arts. 337-338 CPP)
// ══════════════════════════════════════════════════════════════════════════════

/** 🟠 Art. 337 CPP — Principio de congruencia entre acusación y sentencia */
export const ART_337_CPP = `[INSERTAR TEXTO LITERAL ART. 337 CPP — Congruencia entre acusación y sentencia]`;

/** 🟠 Art. 338 CPP — Hechos no controvertidos / admitidos por las partes */
export const ART_338_CPP = `[INSERTAR TEXTO LITERAL ART. 338 CPP — Hechos no controvertidos]`;

/** 🟡 Art. 392 CPP — Procedimiento abreviado: presupuestos y tramitación */
export const ART_392_CPP = `[INSERTAR TEXTO LITERAL ART. 392 CPP — Procedimiento abreviado]`;

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN H — RECURSOS (Arts. 391-430 CPP)
// ══════════════════════════════════════════════════════════════════════════════

/** 🔴 Art. 391 CPP — Recurso de apelación de autos interlocutorios */
export const ART_391_CPP = `[INSERTAR TEXTO LITERAL ART. 391 CPP — Recurso de apelación de autos: causales, plazo y efectos]`;

/** 🟡 Art. 395 CPP — Recurso de casación: causales taxativas */
export const ART_395_CPP = `[INSERTAR TEXTO LITERAL ART. 395 CPP — Recurso de casación penal]`;

/** 🟡 Arts. 426-430 CPP — Recurso de revisión: causales excepcionales */
export const ARTS_426_430_CPP = `[INSERTAR TEXTO LITERAL ARTS. 426-430 CPP — Recurso de revisión: causales post-sentencia firme]`;

// ── Resumen ejecutivo de recursos para uso en plantillas ─────────────────────
export const RECURSOS_PENALES_RESUMEN = {
  apelacion: {
    articulo: 'Art. 391 CPP',
    texto_base: ART_391_CPP,
    plazo: '[INSERTAR PLAZO EN DÍAS HÁBILES — Art. 391 CPP]',
    tribunal: 'Corte de Apelaciones Penal del Departamento',
    efecto: '[DEVOLUTIVO / SUSPENSIVO — según el tipo de auto]',
  },
  casacion: {
    articulo: 'Art. 395 CPP',
    texto_base: ART_395_CPP,
    plazo: '[INSERTAR PLAZO — Art. 395 CPP]',
    tribunal: 'Sala de lo Penal, Corte Suprema de Justicia',
    efecto: 'Devolutivo con efecto suspensivo',
  },
  revision: {
    articulo: 'Arts. 426-430 CPP',
    texto_base: ARTS_426_430_CPP,
    plazo: 'Sin plazo (contra sentencia firme)',
    tribunal: 'Sala de lo Penal, Corte Suprema de Justicia',
    efecto: 'Restitutorio — nulidad de sentencia',
  },
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN I — CÓDIGO PENAL HONDURAS (D.130-2017)
// ══════════════════════════════════════════════════════════════════════════════

// ── Causas de justificación e inculpabilidad (Arts. 23-28 CP) ────────────────

/** 🟠 Art. 23 CP — Causas de justificación (legítima defensa, estado de necesidad) */
export const ART_23_CP = `[INSERTAR TEXTO LITERAL ART. 23 CP — Causas de justificación con incisos]`;

/** 🟡 Art. 24 CP — Cumplimiento del deber y ejercicio legítimo de un derecho */
export const ART_24_CP = `[INSERTAR TEXTO LITERAL ART. 24 CP — Cumplimiento del deber]`;

/** 🟡 Art. 27 CP — Error de tipo (excluye dolo) */
export const ART_27_CP = `[INSERTAR TEXTO LITERAL ART. 27 CP — Error de tipo]`;

/** 🟡 Art. 28 CP — Error de prohibición (excluye culpabilidad) */
export const ART_28_CP = `[INSERTAR TEXTO LITERAL ART. 28 CP — Error de prohibición]`;

// ── Prescripción de la acción penal (Arts. 93-99 CP) ─────────────────────────

/** 🔴 Art. 93 CP — Prescripción: delitos con pena superior a 10 años */
export const ART_93_CP = `[INSERTAR TEXTO LITERAL ART. 93 CP — Prescripción para delitos con pena máxima > 10 años]`;

/** 🔴 Art. 94 CP — Prescripción: delitos con pena entre 5 y 10 años */
export const ART_94_CP = `[INSERTAR TEXTO LITERAL ART. 94 CP — Prescripción para pena 5-10 años]`;

/** 🔴 Art. 95 CP — Prescripción: delitos con pena entre 3 y 5 años */
export const ART_95_CP = `[INSERTAR TEXTO LITERAL ART. 95 CP — Prescripción para pena 3-5 años]`;

/** 🔴 Art. 96 CP — Prescripción: delitos con pena entre 1 y 3 años */
export const ART_96_CP = `[INSERTAR TEXTO LITERAL ART. 96 CP — Prescripción para pena 1-3 años]`;

/** 🔴 Art. 97 CP — Prescripción: delitos con pena menor de 1 año + Interrupción del plazo */
export const ART_97_CP = `[INSERTAR TEXTO LITERAL ART. 97 CP — Prescripción < 1 año + causales de interrupción]`;

/** 🟠 Art. 98 CP — Cómputo del plazo de prescripción */
export const ART_98_CP = `[INSERTAR TEXTO LITERAL ART. 98 CP — Cómputo del plazo de prescripción]`;

/** 🟠 Art. 99 CP — Interrupción del plazo de prescripción */
export const ART_99_CP = `[INSERTAR TEXTO LITERAL ART. 99 CP — Interrupción de la prescripción]`;

/**
 * Tabla de prescripción consolidada (para CalculadoraPrescripcionSchema).
 * Llenar con los plazos exactos una vez insertados los artículos.
 */
export const TABLA_PRESCRIPCION_CP = {
  pena_mas_10_anos:  { plazo_prescripcion_anos: 0,  norma: ART_93_CP, descripcion: '[INSERTAR PLAZO ART. 93 CP]' },
  pena_5_a_10_anos:  { plazo_prescripcion_anos: 0,  norma: ART_94_CP, descripcion: '[INSERTAR PLAZO ART. 94 CP]' },
  pena_3_a_5_anos:   { plazo_prescripcion_anos: 0,  norma: ART_95_CP, descripcion: '[INSERTAR PLAZO ART. 95 CP]' },
  pena_1_a_3_anos:   { plazo_prescripcion_anos: 0,  norma: ART_96_CP, descripcion: '[INSERTAR PLAZO ART. 96 CP]' },
  pena_menos_1_ano:  { plazo_prescripcion_anos: 0,  norma: ART_97_CP, descripcion: '[INSERTAR PLAZO ART. 97 CP]' },
} as const;

// ── Tipos penales frecuentes (Arts. 116-228 CP) ───────────────────────────────

/** 🟡 Art. 116 CP — Homicidio simple */
export const ART_116_CP = `[INSERTAR TEXTO LITERAL ART. 116 CP — Homicidio simple: tipo y pena]`;

/** 🟡 Art. 117 CP — Asesinato (circunstancias agravantes calificadas) */
export const ART_117_CP = `[INSERTAR TEXTO LITERAL ART. 117 CP — Asesinato: circunstancias y pena]`;

/** 🟡 Art. 140 CP — Violación (elementos del tipo) */
export const ART_140_CP = `[INSERTAR TEXTO LITERAL ART. 140 CP — Violación: tipo objetivo y subjetivo]`;

/** 🟡 Art. 141 CP — Abuso sexual (tipo penal) */
export const ART_141_CP = `[INSERTAR TEXTO LITERAL ART. 141 CP — Abuso sexual]`;

/** 🟡 Art. 222 CP — Robo con violencia o intimidación */
export const ART_222_CP = `[INSERTAR TEXTO LITERAL ART. 222 CP — Robo: tipo y circunstancias]`;

/** 🟡 Art. 228 CP — Hurto (sin violencia) */
export const ART_228_CP = `[INSERTAR TEXTO LITERAL ART. 228 CP — Hurto: tipo y pena]`;

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN J — JURISPRUDENCIA SALA PENAL CSJ HONDURAS (para plantillas)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Citas jurisprudenciales listas para insertar en escritos.
 * Fuente: Sala de lo Penal, Corte Suprema de Justicia de Honduras.
 * INSTRUCCIÓN: Verificar vigencia en www.poderjudicial.gob.hn
 */
export const JURISPRUDENCIA_CSJ = {
  prision_preventiva: {
    expediente: '[INSERTAR EXPEDIENTE CSJ — Sentencia sobre periculum libertatis]',
    extracto: '[INSERTAR RATIO DECIDENDI — Criterios para prisión preventiva]',
    fecha: '[INSERTAR FECHA DE LA SENTENCIA]',
    fuente: 'Sala de lo Penal, Corte Suprema de Justicia de Honduras',
  },
  medidas_cautelares: {
    expediente: '[INSERTAR EXPEDIENTE CSJ — Sentencia sobre medidas cautelares alternativas]',
    extracto: '[INSERTAR RATIO DECIDENDI — Proporcionalidad y ultima ratio]',
    fecha: '[INSERTAR FECHA]',
    fuente: 'Sala de lo Penal, Corte Suprema de Justicia de Honduras',
  },
  prueba_ilicita: {
    expediente: '[INSERTAR EXPEDIENTE CSJ — Exclusión de prueba ilícita]',
    extracto: '[INSERTAR RATIO DECIDENDI — Cadena de custodia y Art. 200 CPP]',
    fecha: '[INSERTAR FECHA]',
    fuente: 'Sala de lo Penal, Corte Suprema de Justicia de Honduras',
  },
} as const;

// ── Corte IDH — Criterios vinculantes para Honduras (Art. 16 Const.) ─────────
export const JURISPRUDENCIA_CIDH = {
  suarez_rosero_1997: {
    caso: 'Caso Suárez Rosero vs. Ecuador (1997)',
    parrafo: 'párr. 77',
    extracto: `"La prisión preventiva es una medida cautelar, no punitiva... la obligación del Estado de no restringir la libertad del detenido más allá de los límites estrictamente necesarios para asegurar que no impedirá el desarrollo eficiente de las investigaciones y que no eludirá la acción de la justicia."`,
    aplicacion: 'Fundamento del carácter excepcional y proporcional de la prisión preventiva',
  },
  pacheco_teruel_2012: {
    caso: 'Caso Pacheco Teruel y otros vs. Honduras (2012)',
    parrafo: '[INSERTAR PÁRRAFO ESPECÍFICO]',
    extracto: '[INSERTAR CITA ESPECÍFICA APLICABLE AL CASO — Condiciones de reclusión o prisión preventiva]',
    aplicacion: 'Precedente directo contra Honduras — máxima fuerza vinculante',
  },
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN K — OBJETO BARREL: NORMAS_CPP
// Para importar todo de una vez: import { NORMAS_CPP } from '@/lib/normas-cpp'
// ══════════════════════════════════════════════════════════════════════════════

export const NORMAS_CPP = {
  // Constitución HN
  const_69: ART_69_CONST,
  const_84: ART_84_CONST,
  const_88: ART_88_CONST,
  const_89: ART_89_CONST,
  const_99: ART_99_CONST,
  const_16: ART_16_CONST,

  // CPP — Principios
  art_1:  ART_1_CPP,
  art_2:  ART_2_CPP,
  art_4:  ART_4_CPP,
  art_11: ART_11_CPP,
  art_14: ART_14_CPP,
  art_28: ART_28_CPP,
  art_29: ART_29_CPP,
  art_84: ART_84_CPP,
  art_90: ART_90_CPP,
  art_94: ART_94_CPP,

  // CPP — Nulidades
  art_166: ART_166_CPP,

  // CPP — Medidas cautelares
  art_172: ART_172_CPP,
  art_175: ART_175_CPP,
  art_178: ART_178_CPP,
  art_179: ART_179_CPP,
  art_180: ART_180_CPP,
  art_181: ART_181_CPP,
  art_183: ART_183_CPP,
  art_184: ART_184_CPP,
  art_185: ART_185_CPP,
  art_186: ART_186_CPP,
  art_187: ART_187_CPP,

  // CPP — Prueba
  art_200: ART_200_CPP,
  art_202: ART_202_CPP,
  art_205: ART_205_CPP,

  // CPP — Investigación y requerimiento
  art_276: ART_276_CPP,
  art_294: ART_294_CPP,
  art_294_elementos: ART_294_CPP_ELEMENTOS,
  art_297: ART_297_CPP,
  art_316: ART_316_CPP,

  // CPP — Juicio oral y congruencia
  art_337: ART_337_CPP,
  art_338: ART_338_CPP,
  art_392: ART_392_CPP,

  // CPP — Recursos
  art_391: ART_391_CPP,
  art_395: ART_395_CPP,
  recursos_resumen: RECURSOS_PENALES_RESUMEN,

  // CP — Causas de justificación
  cp_23: ART_23_CP,
  cp_24: ART_24_CP,
  cp_27: ART_27_CP,
  cp_28: ART_28_CP,

  // CP — Prescripción
  cp_93: ART_93_CP,
  cp_94: ART_94_CP,
  cp_95: ART_95_CP,
  cp_96: ART_96_CP,
  cp_97: ART_97_CP,
  cp_98: ART_98_CP,
  cp_99: ART_99_CP,
  prescripcion_tabla: TABLA_PRESCRIPCION_CP,

  // CP — Tipos penales
  cp_116: ART_116_CP,
  cp_117: ART_117_CP,
  cp_140: ART_140_CP,
  cp_141: ART_141_CP,
  cp_222: ART_222_CP,
  cp_228: ART_228_CP,

  // Jurisprudencia
  csj: JURISPRUDENCIA_CSJ,
  cidh: JURISPRUDENCIA_CIDH,
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN L — UTILIDADES DE DIAGNÓSTICO
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Verifica qué artículos siguen siendo placeholders (no han sido llenados).
 * Llamar en desarrollo: import { diagnosticarNormas } from '@/lib/normas-cpp'
 */
export function diagnosticarNormas(): {
  total: number;
  pendientes: string[];
  completados: number;
  porcentaje: number;
} {
  const entradas = Object.entries(NORMAS_CPP).filter(
    ([, v]) => typeof v === 'string'
  ) as [string, string][];

  const pendientes = entradas
    .filter(([, v]) => v.startsWith('[INSERTAR'))
    .map(([k]) => k);

  const total = entradas.length;
  const completados = total - pendientes.length;

  return {
    total,
    pendientes,
    completados,
    porcentaje: Math.round((completados / total) * 100),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// FIN DEL ARCHIVO
// Abogado Pinel: complete los [INSERTAR...] abriendo el CPP PDF y copiando
// los textos literales. Empiece por los marcados 🔴 CRÍTICO.
// Tiempo estimado: ~4 horas con el CPP abierto en pantalla.
// ──────────────────────────────────────────────────────────────────────────────
