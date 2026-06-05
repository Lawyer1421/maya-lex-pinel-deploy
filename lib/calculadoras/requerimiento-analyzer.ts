/**
 * MAYA PENAL 2.0 — Protocolo Pinel de Revisión del Requerimiento Fiscal
 * Base normativa: Arts. 276-294 CPP (D.9-99-E) | Art. 166 CPP (Nulidades)
 *                 Art. 200 CPP (Prueba Ilícita) | Art. 88 Constitución HN
 *
 * REGLA ABSOLUTA: Esta función aplica heurística doctrinal sobre el texto del
 * requerimiento. No predice resultados judiciales. La estrategia final la
 * determina el abogado responsable del caso.
 *
 * PLACEHOLDER PENDIENTE: El Abogado Pinel debe insertar los textos literales
 * de los artículos del CPP en las secciones marcadas con [INSERTAR...].
 */

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export type EstrategiaProcesal =
  | 'Excepción de Falta de Acción'
  | 'Nulidad de Actuaciones'
  | 'Sobreseimiento Definitivo'
  | 'Sobreseimiento Provisional'
  | 'Oposición a Medida Cautelar'
  | 'Defensa de Fondo — Preparar Juicio Oral';

export interface ElementoChecklist {
  elemento: string;
  norma: string;
  presente: boolean;
  indicadores_detectados: string[];
  vacio_identificado: string | null;
}

export interface ResultadoAnalisis {
  /** true solo cuando los 7 elementos del Art. 294 CPP están presentes */
  cumple_art_294: boolean;
  checklist_elementos: ElementoChecklist[];
  vicios_detectados: string[];
  /** Alertas de posible prueba ilícita (Art. 200 CPP) */
  alertas_prueba_ilicita: string[];
  estrategia_recomendada: EstrategiaProcesal;
  fundamento_estrategia: string;
  nota_litigante: string;
  advertencia_legal: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEXTOS NORMATIVOS — INSERTAR TEXTOS LITERALES
// ─────────────────────────────────────────────────────────────────────────────
// El Abogado Pinel debe reemplazar cada placeholder con el texto literal
// del artículo correspondiente del CPP (Decreto 9-99-E).

const NORMAS = {
  art_294_cpp: '[INSERTAR TEXTO LITERAL ART. 294 CPP — Contenido del Requerimiento Fiscal]',
  art_276_cpp: '[INSERTAR TEXTO LITERAL ART. 276 CPP — Inicio de la investigación]',
  art_166_cpp: '[INSERTAR TEXTO LITERAL ART. 166 CPP — Nulidades absolutas]',
  art_200_cpp: '[INSERTAR TEXTO LITERAL ART. 200 CPP — Prueba prohibida / ilícita]',
  art_88_cst: 'Art. 88 Constitución HN: "Nadie puede ser obligado a declarar contra sí mismo... No tendrá valor ninguna declaración obtenida por medio de incomunicación, amenaza o torturas."',
  art_89_cst: 'Art. 89 Constitución HN: "Toda persona es inocente mientras no se le haya declarado su responsabilidad por autoridad competente."',
  art_316_cpp: '[INSERTAR TEXTO LITERAL ART. 316 CPP — Excepciones procesales]',
  art_297_cpp: '[INSERTAR TEXTO LITERAL ART. 297 CPP — Sobreseimiento]',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// INDICADORES HEURÍSTICOS POR ELEMENTO
// ─────────────────────────────────────────────────────────────────────────────

/** Términos que el CPP exige en un requerimiento válido, detectables por texto */
const INDICADORES = {
  identificacion_imputado: [
    'imputado', 'acusado', 'nombre completo', 'dni', 'identidad nacional',
    'mayor de edad', 'vecino de', 'domicilio', 'nacionalidad hondureña',
  ],
  relacion_hechos: [
    'fecha', 'hora', 'lugar', 'circunstancias', 'hecho', 'hechos que se atribuyen',
    'día', 'mes del año', 'barrio', 'colonia', 'municipio', 'departamento',
  ],
  calificacion_juridica: [
    'delito de', 'tipificado en', 'artículo', 'decreto', 'código penal',
    'constituye el delito', 'configura el tipo penal', 'encuadra en',
  ],
  elementos_conviccion: [
    'prueba', 'indicio', 'evidencia', 'testigo', 'perito', 'dictamen',
    'certificación', 'acta', 'informe', 'declaración', 'consta',
  ],
  individualizacion_participacion: [
    'autor', 'coautor', 'cómplice', 'instigador', 'participó en',
    'ejecutó', 'realizó', 'llevó a cabo', 'intervino', 'contribuyó',
  ],
  peticion_concreta: [
    'solicita', 'solicito', 'pide', 'se pide', 'petición',
    'auto de formal procesamiento', 'requerimiento', 'comparecencia',
  ],
  fundamentacion_medidas_cautelares: [
    'peligro de fuga', 'periculum', 'arraigo', 'domicilio conocido',
    'obstaculización', 'obstrucción', 'destrucción de prueba',
    'influencia en testigos', 'antecedentes penales',
    'medida cautelar', 'prisión preventiva', 'garantizar la presencia',
  ],
} as const;

type ElementoKey = keyof typeof INDICADORES;

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analiza el texto de un requerimiento fiscal y devuelve:
 * - Checklist de los elementos del Art. 294 CPP
 * - Vicios detectados
 * - Estrategia procesal recomendada
 *
 * @param textoRequerimiento - Texto completo o parcial del requerimiento fiscal
 * @returns ResultadoAnalisis - Análisis estructurado listo para la defensa
 */
export function analizarRequerimientoFiscal(
  textoRequerimiento: string
): ResultadoAnalisis {
  if (!textoRequerimiento || textoRequerimiento.trim().length < 50) {
    return _resultadoVacio('Texto demasiado corto para análisis. Proporcione el texto completo del requerimiento.');
  }

  const texto = textoRequerimiento.toLowerCase();
  const vicios: string[] = [];
  const alertasPruebaIlicita: string[] = [];

  // ── 1. Verificar los 7 elementos del Art. 294 CPP ─────────────────────────
  const checklist = _verificarChecklist(texto, vicios);

  // ── 2. Detectar posible prueba ilícita (Art. 200 CPP) ────────────────────
  _detectarPruebaIlicita(texto, alertasPruebaIlicita);

  // ── 3. Detectar vicios formales adicionales ───────────────────────────────
  _detectarViciosFormales(texto, textoRequerimiento, vicios);

  // ── 4. Determinar estrategia procesal ────────────────────────────────────
  const { estrategia, fundamento } = _determinarEstrategia(vicios, alertasPruebaIlicita, checklist);

  const cumpleArt294 = checklist.every((e) => e.presente) && vicios.length === 0;

  return {
    cumple_art_294: cumpleArt294,
    checklist_elementos: checklist,
    vicios_detectados: vicios,
    alertas_prueba_ilicita: alertasPruebaIlicita,
    estrategia_recomendada: estrategia,
    fundamento_estrategia: fundamento,
    nota_litigante:
      '📌 Recuerde: Un requerimiento inepto que no describe los hechos de forma clara, precisa ' +
      'y circunstanciada, o que no individualiza la participación del imputado, genera indefensión ' +
      'y puede dar lugar a Nulidad Absoluta (Art. 166 CPP) o Excepción de Falta de Acción (Art. 316 CPP).',
    advertencia_legal:
      '⚠️ Este análisis es un borrador de apoyo profesional generado por MAYA PENAL. ' +
      'No sustituye la valoración del abogado responsable del caso. ' +
      'Verifique los artículos citados en el CPP (D.9-99-E) vigente.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIONES AUXILIARES
// ─────────────────────────────────────────────────────────────────────────────

function _contarIndicadoresPresentes(texto: string, indicadores: readonly string[]): string[] {
  return indicadores.filter((ind) => texto.includes(ind));
}

function _verificarChecklist(texto: string, vicios: string[]): ElementoChecklist[] {
  const definicionElementos: Array<{
    key: ElementoKey;
    nombre: string;
    norma: string;
    umbralMinimo: number;
    mensajeVicio: string;
  }> = [
    {
      key: 'identificacion_imputado',
      nombre: '1. Identificación completa del imputado',
      norma: 'Art. 294.1 CPP',
      umbralMinimo: 2,
      mensajeVicio:
        '🚩 FALTA DE IDENTIFICACIÓN: El requerimiento no identifica suficientemente al imputado ' +
        '(nombre, DNI, domicilio). Violación al Art. 294.1 CPP → genera indefensión.',
    },
    {
      key: 'relacion_hechos',
      nombre: '2. Relación clara, precisa y circunstanciada de los hechos',
      norma: 'Art. 294.2 CPP',
      umbralMinimo: 3,
      mensajeVicio:
        '🚩 HECHOS VAGOS O GENÉRICOS: No describe el hecho de forma clara, precisa y circunstanciada ' +
        '(sin fecha, hora, lugar o modo específicos). Violación al Art. 294.2 CPP → base para Nulidad.',
    },
    {
      key: 'calificacion_juridica',
      nombre: '3. Calificación jurídica provisional',
      norma: 'Art. 294.3 CPP',
      umbralMinimo: 2,
      mensajeVicio:
        '🚩 SIN CALIFICACIÓN JURÍDICA: No especifica el tipo penal ni el artículo del CP que se atribuye. ' +
        'Violación al Art. 294.3 CPP.',
    },
    {
      key: 'elementos_conviccion',
      nombre: '4. Elementos de convicción que fundan la imputación',
      norma: 'Art. 294.4 CPP',
      umbralMinimo: 1,
      mensajeVicio:
        '🚩 SIN ELEMENTOS DE CONVICCIÓN: No señala las pruebas o indicios que sustentan la imputación. ' +
        'Violación al Art. 294.4 CPP → requerimiento sin fundamento probatorio.',
    },
    {
      key: 'individualizacion_participacion',
      nombre: '5. Individualización de la participación del imputado',
      norma: 'Art. 294.5 CPP',
      umbralMinimo: 1,
      mensajeVicio:
        '🚩 FALTA DE INDIVIDUALIZACIÓN: No señala si el imputado es autor, coautor o cómplice ' +
        'ni describe su conducta específica. Violación al Art. 294.5 CPP.',
    },
    {
      key: 'peticion_concreta',
      nombre: '6. Petición concreta al juez',
      norma: 'Art. 294.6 CPP',
      umbralMinimo: 1,
      mensajeVicio:
        '🚩 SIN PETICIÓN CONCRETA: No especifica claramente qué solicita el Ministerio Público ' +
        'al juez competente. Violación al Art. 294.6 CPP.',
    },
    {
      key: 'fundamentacion_medidas_cautelares',
      nombre: '7. Fundamentación de medidas cautelares (si las solicita)',
      norma: 'Arts. 294.7 y 175-178 CPP',
      umbralMinimo: 1,
      mensajeVicio:
        '🚩 MEDIDA CAUTELAR INFUNDADA: Solicita prisión preventiva u otra medida restrictiva sin ' +
        'fundamentar el Periculum Libertatis (Arts. 178-180 CPP). ' +
        'La gravedad abstracta del delito NO sustituye la acreditación del peligro procesal concreto.',
    },
  ];

  return definicionElementos.map(({ key, nombre, norma, umbralMinimo, mensajeVicio }) => {
    const detectados = _contarIndicadoresPresentes(texto, INDICADORES[key]);
    const presente = detectados.length >= umbralMinimo;

    if (!presente) {
      vicios.push(mensajeVicio);
    }

    return {
      elemento: nombre,
      norma,
      presente,
      indicadores_detectados: detectados,
      vacio_identificado: presente ? null : mensajeVicio,
    };
  });
}

function _detectarPruebaIlicita(texto: string, alertas: string[]): void {
  // Confesión sin control judicial
  if (
    (texto.includes('confesión') || texto.includes('confesó') || texto.includes('admitió')) &&
    !texto.includes('ante el juez') &&
    !texto.includes('juzgado') &&
    !texto.includes('presencia del juez')
  ) {
    alertas.push(
      '🚩 POSIBLE PRUEBA ILÍCITA (Art. 200 CPP + Art. 88 Constitución): ' +
        'Se menciona confesión o admisión sin indicar que fue obtenida ante juez competente. ' +
        'Si fue tomada por la policía o el MP sin control judicial, es inadmisible.'
    );
  }

  // Allanamiento sin mención de orden judicial
  if (
    (texto.includes('allanamiento') || texto.includes('registro') || texto.includes('incautación')) &&
    !texto.includes('orden judicial') &&
    !texto.includes('autorización judicial') &&
    !texto.includes('flagrancia')
  ) {
    alertas.push(
      '🚩 POSIBLE PRUEBA ILÍCITA (Art. 200 CPP + Art. 99 Constitución): ' +
        'Menciona allanamiento, registro o incautación sin indicar orden judicial o flagrancia. ' +
        'Solicitar la exhibición de la orden de allanamiento o verificar si existía estado de flagrancia.'
    );
  }

  // Intercepción de comunicaciones
  if (
    texto.includes('interceptación') ||
    texto.includes('escucha') ||
    texto.includes('comunicaciones') ||
    texto.includes('llamadas')
  ) {
    if (!texto.includes('autorización') && !texto.includes('judicial')) {
      alertas.push(
        '🚩 POSIBLE PRUEBA ILÍCITA (Art. 200 CPP): ' +
          'Se hace referencia a interceptación de comunicaciones. ' +
          'Verificar si se obtuvo autorización judicial previa (Art. 205 CPP).'
      );
    }
  }
}

function _detectarViciosFormales(
  texto: string,
  textoOriginal: string,
  vicios: string[]
): void {
  // Requerimiento genérico sin fecha específica del hecho
  const tieneFechaEspecifica =
    /\d{1,2}\s+de\s+\w+\s+de\s+\d{4}|\d{2}[/-]\d{2}[/-]\d{4}/.test(textoOriginal);
  if (!tieneFechaEspecifica) {
    vicios.push(
      '🚩 SIN FECHA ESPECÍFICA DEL HECHO: El requerimiento no indica la fecha exacta de comisión ' +
        'del delito. Esto impide verificar la prescripción y viola la exigencia de circunstanciación.'
    );
  }

  // Imputación por gravedad abstracta sin peligro concreto
  const invocaGravedad =
    texto.includes('gravedad del delito') ||
    texto.includes('pena elevada') ||
    texto.includes('pena alta');
  const acreditaPeligroConcreto =
    texto.includes('peligro de fuga') ||
    texto.includes('antecedentes penales') ||
    texto.includes('arraigo insuficiente') ||
    texto.includes('riesgo de obstrucción');

  if (invocaGravedad && !acreditaPeligroConcreto) {
    vicios.push(
      '🚩 MEDIDA CAUTELAR POR GRAVEDAD ABSTRACTA: El fiscal funda la medida cautelar solo en la ' +
        'gravedad del delito sin acreditar un peligro procesal concreto y actual. ' +
        'La CSJ Honduras ha señalado que la gravedad abstracta no sustituye el Periculum Libertatis ' +
        '(Arts. 178-180 CPP).'
    );
  }

  // Imputación colectiva sin individualización
  const palabrasColectivas = ['todos', 'los imputados', 'los encausados', 'todos ellos'];
  const tieneImputacionColectiva = palabrasColectivas.some((p) => texto.includes(p));
  const tieneIndividualizacion =
    texto.includes('autor principal') ||
    texto.includes('coautor') ||
    texto.includes('cómplice') ||
    texto.includes('instigador');

  if (tieneImputacionColectiva && !tieneIndividualizacion) {
    vicios.push(
      '🚩 IMPUTACIÓN COLECTIVA SIN INDIVIDUALIZACIÓN: El requerimiento trata a todos los imputados ' +
        'como un bloque sin individualizar la conducta específica de cada uno. ' +
        'Esto viola el principio de responsabilidad personal (Art. 294.5 CPP).'
    );
  }
}

function _determinarEstrategia(
  vicios: string[],
  alertasPruebaIlicita: string[],
  checklist: ElementoChecklist[]
): { estrategia: EstrategiaProcesal; fundamento: string } {
  const elementosFaltantes = checklist.filter((e) => !e.presente).length;

  // Prioridad 1: Prueba ilícita → excluir antes del juicio
  if (alertasPruebaIlicita.length > 0) {
    return {
      estrategia: 'Nulidad de Actuaciones',
      fundamento:
        'Solicitar exclusión de prueba ilícita (Art. 200 CPP) en audiencia preliminar. ' +
        'Si la prueba ilícita es el único sustento del requerimiento, procede Sobreseimiento Definitivo (Art. 297 CPP).',
    };
  }

  // Prioridad 2: Falta de 3+ elementos → requerimiento inepto → nulidad o falta de acción
  if (elementosFaltantes >= 3) {
    return {
      estrategia: 'Excepción de Falta de Acción',
      fundamento:
        `El requerimiento no cumple ${elementosFaltantes} de los 7 elementos del Art. 294 CPP. ` +
        'Interponer Excepción de Falta de Acción (Art. 316 CPP) o solicitar Nulidad Absoluta (Art. 166 CPP) ' +
        'por requerimiento inepto que genera indefensión material.',
    };
  }

  // Prioridad 3: Hechos vagos + sin individualización → nulidad
  const hayHechosVagos = vicios.some((v) => v.includes('HECHOS VAGOS'));
  const hayFaltaIndividualizacion = vicios.some((v) => v.includes('INDIVIDUALIZACIÓN'));
  if (hayHechosVagos && hayFaltaIndividualizacion) {
    return {
      estrategia: 'Nulidad de Actuaciones',
      fundamento:
        'La vaguedad de los hechos más la ausencia de individualización de la participación ' +
        'configuran indefensión material. Solicitar nulidad del requerimiento (Art. 166 CPP) ' +
        'para que el fiscal reformule con especificidad.',
    };
  }

  // Prioridad 4: Solo medida cautelar infundada → oponerse en audiencia
  const hayMedidaInfundada = vicios.some((v) => v.includes('MEDIDA CAUTELAR'));
  if (hayMedidaInfundada && elementosFaltantes <= 1) {
    return {
      estrategia: 'Oposición a Medida Cautelar',
      fundamento:
        'El requerimiento puede sustentar el proceso pero la medida cautelar carece de fundamento ' +
        'en el Periculum Libertatis (Arts. 178-180 CPP). Oponerse en la audiencia inicial ' +
        'y proponer medida sustitutiva (Art. 184 CPP).',
    };
  }

  // Prioridad 5: Prescripción detectada
  const hayPrescripcion = vicios.some((v) => v.includes('prescripción'));
  if (hayPrescripcion) {
    return {
      estrategia: 'Sobreseimiento Definitivo',
      fundamento:
        'La acción penal puede estar prescrita. Verificar fechas y solicitar Sobreseimiento Definitivo ' +
        'por extinción de la acción penal (Arts. 93-99 CP y Art. 297 CPP).',
    };
  }

  // Default: El requerimiento es formal — preparar defensa de fondo
  if (elementosFaltantes === 0 && vicios.length === 0) {
    return {
      estrategia: 'Defensa de Fondo — Preparar Juicio Oral',
      fundamento:
        'El requerimiento cumple los requisitos formales del Art. 294 CPP. ' +
        'La estrategia debe centrarse en la teoría del caso, contrainterrogatorio y ' +
        'análisis de la suficiencia probatoria para el juicio oral.',
    };
  }

  return {
    estrategia: 'Defensa de Fondo — Preparar Juicio Oral',
    fundamento:
      'Vicios menores detectados. Evaluar si ameritan excepción formal o si conviene ' +
      'reservar los argumentos para la etapa intermedia o el juicio oral.',
  };
}

function _resultadoVacio(razon: string): ResultadoAnalisis {
  return {
    cumple_art_294: false,
    checklist_elementos: [],
    vicios_detectados: [`⚠️ ${razon}`],
    alertas_prueba_ilicita: [],
    estrategia_recomendada: 'Defensa de Fondo — Preparar Juicio Oral',
    fundamento_estrategia: 'No se pudo realizar el análisis por insuficiencia del texto.',
    nota_litigante: 'Proporcione el texto completo del requerimiento fiscal para un análisis preciso.',
    advertencia_legal:
      '⚠️ Este análisis es un borrador de apoyo profesional. No sustituye la valoración del abogado.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTAR NORMAS (para uso en UI o tests)
// ─────────────────────────────────────────────────────────────────────────────
export { NORMAS };
