/**
 * MAYA PENAL 2.0 — Esquemas de Validación (Calculadoras Jurídicas)
 * Base normativa: CPP Honduras D.9-99-E | CP Honduras D.130-2017
 * Versión 1.0 | 2026-06-02
 *
 * REGLA: Los schemas validan ENTRADAS del usuario.
 * Las SALIDAS (recomendaciones) son inferencias del motor de IA, no conclusiones hardcodeadas.
 * Los transformers producen análisis heurístico — el abogado toma la decisión final.
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS COMPARTIDOS
// ─────────────────────────────────────────────────────────────────────────────

export const TipoDelito = z.enum([
  'Homicidio simple',
  'Asesinato',
  'Femicidio',
  'Lesiones',
  'Violación',
  'Abuso sexual',
  'Robo',
  'Robo agravado',
  'Hurto',
  'Extorsión',
  'Secuestro',
  'Estafa',
  'Falsificación de documentos',
  'Peculado',
  'Cohecho',
  'Tráfico de drogas',
  'Posesión de drogas',
  'Lavado de activos',
  'Trata de personas',
  'Crimen organizado',
  'Otro',
]);

export type TipoDelito = z.infer<typeof TipoDelito>;

export const NivelAcreditacion = z.enum(['Acreditado', 'Insuficiente', 'No acreditado']);
export type NivelAcreditacion = z.infer<typeof NivelAcreditacion>;

// ─────────────────────────────────────────────────────────────────────────────
// CALCULADORA DE MEDIDAS CAUTELARES
// Base normativa: Arts. 172, 175, 178, 179, 180, 183, 184, 185 CPP (D.9-99-E)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * INPUT: Datos del caso para evaluar procedencia de medida cautelar.
 * El transform aplica la heurística doctrinal del CPP hondureño.
 */
export const CalculadoraMedidasCautelaresInputSchema = z.object({
  // ── Identificación del hecho ─────────────────────────────────────────────
  delito_imputado: TipoDelito.describe(
    'Tipo de delito que el Ministerio Público atribuye al imputado'
  ),
  pena_maxima_abstracta_anos: z
    .number()
    .min(0)
    .max(40)
    .describe(
      'Pena máxima en años que establece el CP para el delito imputado'
    ),

  // ── Indicadores de arraigo (Art. 179 CPP) ────────────────────────────────
  arraigo: z.object({
    domicilio_fijo_conocido: z.boolean().describe(
      'El imputado tiene domicilio fijo y verificable en Honduras'
    ),
    empleo_o_actividad_economica: z.boolean().describe(
      'Tiene trabajo estable, negocio propio o actividad económica demostrable'
    ),
    familia_en_honduras: z.boolean().describe(
      'Cónyuge, hijos u otros dependientes que residan en Honduras'
    ),
    anos_residencia_en_honduras: z
      .number()
      .min(0)
      .describe('Años continuos de residencia en Honduras'),
    bienes_inmuebles_en_honduras: z.boolean().describe(
      'Propietario de bienes raíces en Honduras (escrituras)'
    ),
  }),

  // ── Indicadores de peligro procesal (Art. 178 CPP) ───────────────────────
  peligro_procesal: z.object({
    antecedentes_penales: z.boolean().describe(
      'Tiene condenas previas (Art. 178 CPP — agrava el periculum)'
    ),
    procesos_penales_pendientes: z.boolean().describe(
      'Enfrenta otros procesos penales activos'
    ),
    fue_declarado_rebelde: z.boolean().describe(
      'Ha sido declarado rebelde en proceso anterior'
    ),
    riesgo_destruccion_prueba: z.boolean().describe(
      'Indicios de que podría alterar, destruir u ocultar evidencia (Art. 180 CPP)'
    ),
    riesgo_influencia_testigos_victimas: z.boolean().describe(
      'Indicios de intimidación o contacto con testigos o víctimas'
    ),
    oferta_de_fuga_documentada: z.boolean().describe(
      'Hay evidencia documental o testimonial de intención de huir'
    ),
  }),

  // ── Prohibiciones absolutas (Art. 183 CPP) ───────────────────────────────
  prohibicion_prision_preventiva: z.object({
    mayor_60_anos: z.boolean().describe('El imputado tiene más de 60 años'),
    mujer_embarazada_o_lactante: z.boolean().describe(
      'Mujer en estado de embarazo o en período de lactancia'
    ),
    enfermedad_terminal_o_grave: z.boolean().describe(
      'Padece enfermedad terminal o grave que hace peligrosa la reclusión'
    ),
  }),
});

export type CalculadoraMedidasCautelaresInput = z.infer<
  typeof CalculadoraMedidasCautelaresInputSchema
>;

/**
 * OUTPUT: Resultado del análisis heurístico de medidas cautelares.
 * IMPORTANTE: Este output es un apoyo doctrinal, no una decisión judicial.
 */
export const CalculadoraMedidasCautelaresOutputSchema = z.object({
  fumus_commissi_delicti: z.object({
    acreditado: z.boolean(),
    nivel: NivelAcreditacion,
    fundamento: z.string(),
    norma: z.literal(
      '[INSERTAR TEXTO LITERAL ART. 172 CPP AQUÍ — Indicios suficientes de participación]'
    ),
  }),
  periculum_libertatis: z.object({
    acreditado: z.boolean(),
    nivel: NivelAcreditacion,
    factores_detectados: z.array(z.string()),
    norma_peligro_fuga: z.literal(
      '[INSERTAR TEXTO LITERAL ART. 179 CPP AQUÍ — Criterios del peligro de fuga]'
    ),
    norma_peligro_obstruccion: z.literal(
      '[INSERTAR TEXTO LITERAL ART. 180 CPP AQUÍ — Criterios de obstaculización]'
    ),
  }),
  prohibicion_absoluta_art183: z.boolean().describe(
    'true = el Art. 183 CPP prohíbe la prisión preventiva en este caso'
  ),
  recomendacion: z.enum([
    'Libertad Plena',
    'Medida Cautelar Sustitutiva',
    'Prisión Preventiva Procedente',
  ]),
  medidas_sustitutivas_aplicables: z.array(
    z.enum([
      'Presentación periódica — Art. 185.1 CPP',
      'Prohibición de salida del país — Art. 185.2 CPP',
      'Prohibición de salida del municipio — Art. 185.3 CPP',
      'Caución económica — Art. 185.4 CPP',
      'Arresto domiciliar — Art. 185.5 CPP',
      'Dispositivo de monitoreo electrónico — Art. 185.6 CPP',
    ])
  ),
  argumentario_defensa: z.array(z.string()).describe(
    'Argumentos jurídicos listos para la audiencia de medidas cautelares'
  ),
  riesgos_si_no_se_opone: z.array(z.string()),
  norma_general_aplicable: z.string(),
});

export type CalculadoraMedidasCautelaresOutput = z.infer<
  typeof CalculadoraMedidasCautelaresOutputSchema
>;

// ─────────────────────────────────────────────────────────────────────────────
// CONSTRUCTOR DE TEORÍA DEL CASO
// Base normativa: Arts. 337, 338 CPP (Congruencia) | Art. 4 CPP (Defensa)
// ─────────────────────────────────────────────────────────────────────────────

export const TeoríaJurídicaDefensa = z.enum([
  'Negación total — Los hechos no ocurrieron como los describe el fiscal',
  'Justificación — Legítima defensa (Art. 23.1 CP)',
  'Justificación — Estado de necesidad (Art. 23.2 CP)',
  'Justificación — Cumplimiento del deber (Art. 24.1 CP)',
  'Inculpabilidad — Error de tipo (Art. 27 CP)',
  'Inculpabilidad — Error de prohibición (Art. 28 CP)',
  'Inculpabilidad — Inimputabilidad (Art. 23.3 CP)',
  'Atipicidad — La conducta no encuadra en el tipo penal imputado',
  'Falta de prueba — Insuficiencia probatoria del fiscal',
  'Atenuación — Menor culpabilidad (pedir pena mínima)',
]);

export type TeoriaJurídicaDefensa = z.infer<typeof TeoríaJurídicaDefensa>;

export const PruebaDefensaSchema = z.object({
  tipo: z.enum([
    'Testifical — presencial',
    'Testifical — referencial',
    'Pericial',
    'Documental',
    'Material',
    'Digital',
  ]),
  descripcion: z.string().min(10).describe(
    'Qué aporta esta prueba a la teoría de la defensa'
  ),
  disponible: z.boolean().describe(
    'false = prueba a obtener / true = ya en poder de la defensa'
  ),
  acredita_hecho: z.string().describe(
    'Hecho específico de la teoría de la defensa que esta prueba corrobora'
  ),
  controvierte_hecho_fiscal: z.string().optional().describe(
    'Hecho de la teoría del fiscal que esta prueba rebate o debilita'
  ),
});

export const TeoriaDelCasoBuilderSchema = z.object({
  // ── Versión de los hechos ─────────────────────────────────────────────────
  version_fiscal_hechos: z.string().min(50).describe(
    'Narración exacta o resumida de los hechos según el requerimiento fiscal'
  ),
  hechos_admitidos: z.array(z.string()).describe(
    'Hechos que la defensa no controvierte (Art. 337 CPP — congruencia)'
  ),
  hechos_negados: z.array(z.string()).min(1).describe(
    'Hechos de la versión fiscal que la defensa rebate o niega'
  ),
  hechos_alternativos: z.array(z.string()).optional().describe(
    'Versión alternativa de los hechos que la defensa afirma'
  ),

  // ── Teoría jurídica ───────────────────────────────────────────────────────
  teoria_juridica_defensa: TeoríaJurídicaDefensa.describe(
    'Posición jurídica central de la defensa (elegir la más sólida)'
  ),

  // ── Prueba ────────────────────────────────────────────────────────────────
  prueba_defensa: z.array(PruebaDefensaSchema).describe(
    'Lista de medios probatorios de la defensa — sin valoración subjetiva'
  ),
  prueba_fiscal_debilidades: z.array(z.string()).optional().describe(
    'Vicios, contradicciones o insuficiencias detectadas en la prueba del fiscal'
  ),

  // ── Línea temática ────────────────────────────────────────────────────────
  linea_tematica: z
    .string()
    .max(200)
    .describe(
      'Una oración de alto impacto que resume la defensa para el tribunal. ' +
        'Debe ser clara, memorable y basada en hechos — sin términos jurídicos que parezcan argumentos preconcebidos.'
    ),

  // ── Estrategia procesal ───────────────────────────────────────────────────
  estrategia_fase_preparatoria: z.string().optional().describe(
    '[INSERTAR ESTRATEGIA PINEL PARA ETAPA PREPARATORIA]'
  ),
  estrategia_etapa_intermedia: z.string().optional().describe(
    '[INSERTAR ESTRATEGIA PINEL PARA ETAPA INTERMEDIA — excepciones, impugnar prueba]'
  ),
  estrategia_juicio_oral: z.string().optional().describe(
    '[INSERTAR ESTRATEGIA PINEL PARA JUICIO ORAL — alegatos, contrainterrogatorio]'
  ),
});

export type TeoriaDelCasoBuilder = z.infer<typeof TeoriaDelCasoBuilderSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// CALCULADORA DE PRESCRIPCIÓN DE LA ACCIÓN PENAL
// Base normativa: Arts. 93-99 CP (D.130-2017)
// ─────────────────────────────────────────────────────────────────────────────

export const CalculadoraPrescripcionSchema = z.object({
  pena_maxima_del_delito_anos: z.number().min(0).max(40),
  fecha_comision_del_hecho: z.string().datetime({ offset: true }).describe(
    'Fecha ISO 8601 en que se cometió el hecho punible'
  ),
  hubo_acto_interruptivo: z.boolean().describe(
    'Hubo imputación formal u otro acto que interrumpe la prescripción (Art. 97 CP)'
  ),
  fecha_ultimo_acto_interruptivo: z.string().datetime({ offset: true }).optional(),
  es_delito_imprescriptible: z.boolean().describe(
    'Lesa humanidad, genocidio o delito sexual contra menor (imprescriptibles en HN)'
  ),
});

export type CalculadoraPrescripcion = z.infer<typeof CalculadoraPrescripcionSchema>;

export const CalculadoraPrescripcionOutputSchema = z.object({
  plazo_prescripcion_anos: z.number(),
  fecha_prescripcion: z.string(),
  ya_prescribio: z.boolean(),
  dias_restantes: z.number().nullable(),
  norma_aplicable: z.string(),
  excepcion_procesal_disponible: z.enum([
    'Excepción de Extinción de la Acción Penal (Art. 97 CP)',
    'No aplica — acción penal vigente',
    'Delito imprescriptible — no procede',
  ]),
  advertencia: z.string(),
});

// ─────────────────────────────────────────────────────────────────────────────
// ESQUEMA DE ANÁLISIS DE ACREDITACIÓN (Motor de Riesgo)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estructura de análisis de acreditación de elementos del tipo.
 * REGLA: Solo describe el estado de acreditación — NO predice resultado judicial.
 */
export const AnalisisAcreditacionSchema = z.object({
  elemento: z.string().describe('Elemento del tipo penal analizado'),
  nivel: NivelAcreditacion,
  prueba_disponible: z.array(z.string()),
  prueba_faltante: z.array(z.string()),
  vicio_procesal_detectado: z.string().optional(),
  norma_relevante: z.string(),
});

export const InformeAcreditacionSchema = z.object({
  tipo_penal_analizado: z.string(),
  norma_base: z.string().describe(
    '[INSERTAR TEXTO LITERAL DEL TIPO PENAL DEL CP AQUÍ]'
  ),
  elementos_tipicos: z.array(AnalisisAcreditacionSchema),
  resumen: z.enum([
    'Todos los elementos acreditados — riesgo de condena alto sin estrategia',
    'Elementos con acreditación insuficiente — espacio de defensa identificado',
    'Elementos no acreditados — base para excepción o sobreseimiento',
  ]),
  advertencia_legal: z
    .literal(
      '⚠️ Este análisis es un borrador de apoyo profesional. No sustituye la valoración del abogado responsable del caso ni la decisión del tribunal.'
    )
    .default(
      '⚠️ Este análisis es un borrador de apoyo profesional. No sustituye la valoración del abogado responsable del caso ni la decisión del tribunal.'
    ),
});

export type InformeAcreditacion = z.infer<typeof InformeAcreditacionSchema>;
