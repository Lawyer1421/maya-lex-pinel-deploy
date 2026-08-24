/**
 * lib/v2/paginas-marketing.ts
 * Configuración única de las páginas públicas de marketing V2.
 * Una sola plantilla (components/v2/PaginaMarketing.tsx) renderiza las 6
 * páginas de producto y los 7 perfiles de /soluciones/[perfil] — cero
 * duplicación de layout, contenido versionado y auditable en un solo lugar.
 *
 * Regla editorial: ninguna afirmación jurídica no verificada. La cobertura
 * real del corpus se describe en términos positivos y factuales (qué está
 * verificado, con qué profundidad), sin lenguaje de "en construcción" o
 * "próximamente" — la plataforma se presenta como el producto comercial
 * terminado que es. El sistema de verificación V0–V5 en sí es una
 * funcionalidad real y permanente, no una disculpa por estar incompleta.
 */

export interface FuncionMarketing {
  titulo: string;
  descripcion: string;
}

export interface ConfigPaginaMarketing {
  eyebrow: string;
  titulo: string;
  metaTitle: string;
  metaDescription: string;
  propuesta: string;
  funcionesTitulo: string;
  funciones: FuncionMarketing[];
  casoUso: { titulo: string; parrafos: string[] };
  cobertura: { titulo: string; puntos: string[] };
  cierreTitulo: string;
  ctaPrimario: { label: string; href: string };
  ctaSecundario?: { label: string; href: string };
}

const LIMITES_COMUNES = [
  'Maya Lex es una herramienta de apoyo a la investigación jurídica; no sustituye el criterio profesional de un abogado colegiado ni constituye asesoría legal.',
  'Penal y Procesal Civil cuentan con la cobertura más profunda del corpus normativo hondureño; consulte el detalle completo en la página de Cobertura Jurídica.',
  'Cada fuente muestra su estado de verificación (V0–V5); el contenido no verificado nunca se presenta como norma vigente.',
];

/* ─────────────────────────── Páginas de producto ─────────────────────────── */

export const PAGINAS_PRODUCTO: Record<string, ConfigPaginaMarketing> = {
  producto: {
    eyebrow: 'Producto',
    titulo: 'Una plataforma de inteligencia jurídica hondureña',
    metaTitle: 'Producto — MAYA LEX IA',
    metaDescription:
      'Qué es Maya Lex: investigación normativa, análisis de documentos, estrategia procesal y generación de escritos para el derecho hondureño, con estado de verificación visible.',
    propuesta:
      'Investigue fuentes, analice documentos y organice su estrategia procesal en un solo lugar, con el estado de verificación de cada fuente siempre a la vista.',
    funcionesTitulo: 'Qué ofrece Maya Lex',
    funciones: [
      { titulo: 'Consulta normativa', descripcion: 'Busque artículos y decretos por materia, con citación clara del estado de verificación de cada fuente.' },
      { titulo: 'Análisis de documentos', descripcion: 'Suba un documento y obtenga un análisis estructurado de sus puntos jurídicos clave.' },
      { titulo: 'Estrategia procesal', descripcion: 'Organice etapas, plazos y argumentos de un caso con apoyo estructurado.' },
      { titulo: 'Generación de escritos', descripcion: 'Genere borradores de escritos y documentos con base en su información del caso.' },
      { titulo: 'Banco Jurídico Hondureño', descripcion: 'Un corpus normativo construido materia por materia, con verificación transparente en vez de promesas de cobertura total.' },
      { titulo: 'Formato profesional de respuesta', descripcion: 'Materia, cuestión jurídica, análisis, acción sugerida, riesgo, fuente y estado de verificación — siempre la misma estructura.' },
    ],
    casoUso: {
      titulo: 'Un día de uso real',
      parrafos: [
        'Un abogado recibe un caso nuevo por la mañana. Consulta la norma aplicable en el banco jurídico, sube el contrato del cliente para un análisis estructurado y organiza las etapas procesales con sus plazos.',
        'Antes de la reunión con el cliente, genera un borrador de escrito con base en la información del expediente y lo revisa con su propio criterio profesional — la herramienta acompaña; el abogado decide.',
      ],
    },
    cobertura: { titulo: 'Cobertura y límites', puntos: LIMITES_COMUNES },
    cierreTitulo: 'Vea el formato de respuesta con sus propios ojos',
    ctaPrimario: { label: 'Probar gratis', href: '/chat' },
    ctaSecundario: { label: 'Ver cobertura jurídica', href: '/cobertura-juridica' },
  },

  herramientas: {
    eyebrow: 'Herramientas',
    titulo: 'Herramientas para el ejercicio del derecho',
    metaTitle: 'Herramientas — MAYA LEX IA',
    metaDescription:
      'Consulta normativa, análisis de documentos, estrategia procesal y generación de escritos — herramientas diseñadas para acompañar la práctica jurídica hondureña.',
    propuesta:
      'Diseñadas para acompañar la práctica profesional, no para sustituir el criterio jurídico. Cada herramienta responde a una necesidad concreta del ejercicio diario.',
    funcionesTitulo: 'Las herramientas',
    funciones: [
      { titulo: 'Consulta normativa', descripcion: 'Busque artículos y decretos por materia. Cada resultado indica su estado de verificación y su fuente.' },
      { titulo: 'Análisis de documentos', descripcion: 'Suba un documento y reciba un análisis estructurado: puntos clave, riesgos y acciones sugeridas.' },
      { titulo: 'Estrategia procesal', descripcion: 'Organice un caso por etapas con plazos y argumentos, con apoyo estructurado para no perder de vista lo esencial.' },
      { titulo: 'Generación de escritos', descripcion: 'Borradores de escritos y documentos a partir de la información de su caso, listos para su revisión profesional.' },
    ],
    casoUso: {
      titulo: 'Preparar una audiencia',
      parrafos: [
        'La tarde previa a una audiencia, el abogado repasa la norma aplicable con la consulta normativa, verifica el estado de cada fuente citada y organiza sus argumentos por orden de fuerza en la herramienta de estrategia.',
        'Con el expediente estructurado, genera el borrador del escrito que presentará y lo ajusta con su criterio — el tiempo ganado se invierte en pensar el caso, no en buscar papeles.',
      ],
    },
    cobertura: { titulo: 'Cobertura y límites', puntos: LIMITES_COMUNES },
    cierreTitulo: 'Pruebe el formato de análisis gratis',
    ctaPrimario: { label: 'Probar gratis', href: '/chat' },
    ctaSecundario: { label: 'Ver planes', href: '/pricing' },
  },

  'cobertura-juridica': {
    eyebrow: 'Transparencia',
    titulo: 'El estado real de la cobertura jurídica',
    metaTitle: 'Cobertura jurídica — MAYA LEX IA',
    metaDescription:
      'Estado real y verificable del corpus normativo de Maya Lex, materia por materia, con verificación profesional visible en cada fuente.',
    propuesta:
      'Maya Lex verifica su corpus normativo materia por materia y publica el estado real de cada fuente.',
    funcionesTitulo: 'Cómo se verifica una fuente',
    funciones: [
      { titulo: 'V0–V2 · Captura e integridad', descripcion: 'La fuente se captura, se identifica su origen y se comprueba su integridad documental antes de avanzar en el proceso de verificación.' },
      { titulo: 'V3 · Vigencia analizada', descripcion: 'Se analiza la vigencia de la norma. El contenido V3 se muestra siempre con advertencia explícita.' },
      { titulo: 'V4–V5 · Revisión profesional', descripcion: 'Un abogado revisa la fuente antes de considerarla verificada. Solo V4–V5 se presenta como norma verificada.' },
    ],
    casoUso: {
      titulo: 'Por qué publicamos esto',
      parrafos: [
        'Un profesional del derecho necesita saber exactamente en qué puede confiar. Afirmar "toda la legislación hondureña" sin verificación sería irresponsable — y contrario al propósito mismo de la plataforma.',
        'Por eso cada materia muestra su estado real: Penal concentra la mayor cobertura verificada, con artículos de referencia públicos, seguida por Procesal Civil. El resto del corpus se incorpora de forma continua bajo el mismo pipeline de verificación V0–V5.',
      ],
    },
    cobertura: {
      titulo: 'Estado actual por materia',
      puntos: [
        'Penal: mayor cobertura verificada de la plataforma; 198 artículos de referencia públicos, con revisión de calidad editorial continua.',
        'Procesal Civil: segunda materia en cobertura verificada de la plataforma.',
        'Resto de materias (civil, laboral, mercantil, administrativo, entre otras): incorporación continua bajo el mismo estándar de verificación V0–V5.',
        'Este estado se actualiza conforme avanza la verificación; ninguna materia se anuncia como cubierta antes de estarlo.',
      ],
    },
    cierreTitulo: 'Vea cómo se cita una fuente verificada',
    ctaPrimario: { label: 'Probar gratis', href: '/chat' },
    ctaSecundario: { label: 'Conocer las herramientas', href: '/herramientas' },
  },

  seguridad: {
    eyebrow: 'Seguridad y privacidad',
    titulo: 'Seguridad y privacidad, no como promesa vacía',
    metaTitle: 'Seguridad y privacidad — MAYA LEX IA',
    metaDescription:
      'Cómo protege Maya Lex los documentos, datos y suscripciones: aislamiento de instrumentos privados y control de acceso a nivel de base de datos.',
    propuesta:
      'Los documentos de sus clientes son materia de secreto profesional. La arquitectura de Maya Lex parte de esa premisa, no la agrega después.',
    funcionesTitulo: 'Compromisos verificables',
    funciones: [
      { titulo: 'Instrumentos privados aislados', descripcion: 'Los instrumentos y documentos privados nunca alimentan respuestas públicas ni el corpus de referencia compartido.' },
      { titulo: 'Control de acceso en la base de datos', descripcion: 'Datos de suscripción y pagos protegidos con control de acceso a nivel de base de datos (RLS), no solo en la aplicación.' },
      { titulo: 'Mismo aislamiento para todos los planes', descripcion: 'El plan gratuito se procesa bajo el mismo control de acceso y aislamiento de datos que los planes de pago — no hay una vía distinta con menor protección.' },
      { titulo: 'Verificación siempre visible', descripcion: 'Ninguna respuesta se presenta como norma vigente sin verificación; el estado de cada fuente es siempre visible.' },
    ],
    casoUso: {
      titulo: 'Evaluación por un bufete',
      parrafos: [
        'Antes de adoptar cualquier herramienta, un bufete responsable pregunta: ¿dónde quedan los documentos de mis clientes? ¿quién puede verlos? ¿alimentan algún modelo o corpus compartido?',
        'En Maya Lex la respuesta es directa: los documentos privados quedan aislados del corpus de referencia y el acceso se controla a nivel de base de datos.',
      ],
    },
    cobertura: {
      titulo: 'Límites honestos',
      puntos: [
        'Los controles de seguridad de Maya Lex se documentan a nivel de arquitectura; la certificación formal de terceros (ISO 27001, SOC 2) no es parte del alcance descrito aquí.',
        'Los cambios de infraestructura se validan por etapas antes de llegar a producción.',
        'Maya Lex no sustituye las obligaciones deontológicas del abogado en el manejo del secreto profesional.',
      ],
    },
    cierreTitulo: 'La confianza se construye con evidencia',
    ctaPrimario: { label: 'Probar gratis', href: '/chat' },
    ctaSecundario: { label: 'Conocer al fundador', href: '/fundador' },
  },

  fundador: {
    eyebrow: 'El fundador',
    titulo: 'Construido por un abogado, para abogados',
    metaTitle: 'El fundador — MAYA LEX IA',
    metaDescription:
      'Maya Lex nace del ejercicio profesional real de Fredy Omar Pinel Flores, abogado y notario en Choluteca, Honduras — no de una idea genérica de chatbot legal.',
    propuesta:
      'Maya Lex nace del ejercicio profesional real de Fredy Omar Pinel Flores, abogado y notario en Choluteca, Honduras. Cada herramienta responde a una necesidad concreta del ejercicio diario del derecho hondureño.',
    funcionesTitulo: 'Los principios que gobiernan la plataforma',
    funciones: [
      { titulo: 'El criterio profesional primero', descripcion: 'La herramienta acompaña la investigación y el análisis; la decisión jurídica es siempre del abogado.' },
      { titulo: 'Transparencia de cobertura', descripcion: 'Se publica el estado real del corpus, materia por materia, en vez de prometer cobertura total.' },
      { titulo: 'Privacidad estructural', descripcion: 'El secreto profesional se protege en la arquitectura misma: instrumentos privados aislados del corpus compartido.' },
    ],
    casoUso: {
      titulo: 'La historia',
      parrafos: [
        'Maya Lex no empezó como una startup buscando un mercado: empezó como la necesidad real de un despacho en Choluteca de investigar más rápido, citar con seguridad y no perder horas en tareas repetitivas.',
        'De esa práctica diaria — litigio, notaría y docencia universitaria — salieron las herramientas de la plataforma: consulta normativa con estado de verificación, análisis de documentos, estrategia procesal y generación de escritos.',
        'La plataforma crece con la misma regla con la que se ejerce el derecho responsablemente: no afirmar lo que no está verificado.',
      ],
    },
    cobertura: { titulo: 'Cobertura y límites', puntos: LIMITES_COMUNES },
    cierreTitulo: 'Conozca la plataforma que salió de un despacho real',
    ctaPrimario: { label: 'Probar gratis', href: '/chat' },
    ctaSecundario: { label: 'Ver el producto', href: '/producto' },
  },

  recursos: {
    eyebrow: 'Recursos',
    titulo: 'Recursos para aprender y evaluar Maya Lex',
    metaTitle: 'Recursos — MAYA LEX IA',
    metaDescription:
      'Recursos de Maya Lex: prueba gratuita, artículos de referencia y páginas de transparencia de la plataforma.',
    propuesta:
      'Recursos para conocer y evaluar Maya Lex a fondo.',
    funcionesTitulo: 'Recursos de la plataforma',
    funciones: [
      { titulo: 'Prueba gratuita en /chat', descripcion: 'Hasta 3 consultas reales por día con una cuenta gratuita (sin tarjeta) — el mismo formato profesional de respuesta de 7 campos que usan los planes de pago.' },
      { titulo: 'Cobertura jurídica transparente', descripcion: 'La página de cobertura publica el estado real de verificación del corpus, materia por materia.' },
      { titulo: 'Detalle de seguridad y privacidad', descripcion: 'Los compromisos de manejo de documentos y datos, explicados con sus límites honestos.' },
    ],
    casoUso: {
      titulo: 'Cómo aprovechar estos recursos',
      parrafos: [
        'La prueba gratuita en /chat y la página de Cobertura Jurídica son el mejor punto de partida para evaluar el formato de análisis y el nivel de verificación de las fuentes.',
        'Cada recurso mantiene el mismo criterio de honestidad que gobierna la cobertura del corpus: nada se presenta como más completo de lo que realmente es.',
      ],
    },
    cobertura: {
      titulo: 'Límites de esta sección',
      puntos: [
        'Ningún recurso constituye asesoría legal ni sustituye la bibliografía académica formal.',
      ],
    },
    cierreTitulo: 'Empiece gratis en el chat',
    ctaPrimario: { label: 'Probar gratis', href: '/chat' },
    ctaSecundario: { label: 'Ver cobertura jurídica', href: '/cobertura-juridica' },
  },
};

/* ─────────────────────────── Perfiles /soluciones ─────────────────────────── */

export const PERFILES_SOLUCIONES: Record<string, ConfigPaginaMarketing> = {
  abogados: {
    eyebrow: 'Soluciones · Abogados',
    titulo: 'Investigación y análisis para el litigio diario',
    metaTitle: 'Maya Lex para Abogados — MAYA LEX IA',
    metaDescription:
      'Consulta normativa con verificación visible, análisis de documentos y estrategia procesal para el abogado litigante hondureño.',
    propuesta:
      'Menos horas buscando; más horas pensando el caso. Herramientas construidas desde la práctica real del litigio hondureño.',
    funcionesTitulo: 'Para su práctica',
    funciones: [
      { titulo: 'Consulta normativa verificada', descripcion: 'Cite con seguridad: cada fuente muestra su estado de verificación antes de que usted la use.' },
      { titulo: 'Análisis de documentos', descripcion: 'Contratos, resoluciones y escritos de la contraparte, analizados de forma estructurada.' },
      { titulo: 'Estrategia procesal', descripcion: 'Etapas, plazos y argumentos organizados por caso.' },
      { titulo: 'Borradores de escritos', descripcion: 'Puntos de partida sólidos que usted afina con su criterio.' },
    ],
    casoUso: {
      titulo: 'Un caso nuevo, de la consulta al escrito',
      parrafos: [
        'Llega un caso de incumplimiento contractual. En minutos: norma aplicable consultada con su estado de verificación, contrato del cliente analizado, etapas procesales organizadas con plazos y un borrador de demanda listo para su revisión.',
        'El criterio — qué argumentar, qué negociar, qué riesgo aceptar — sigue siendo suyo. La plataforma le devuelve el tiempo para ejercerlo.',
      ],
    },
    cobertura: { titulo: 'Cobertura y límites', puntos: LIMITES_COMUNES },
    cierreTitulo: 'Pruebe el formato de análisis profesional',
    ctaPrimario: { label: 'Probar gratis', href: '/chat' },
    ctaSecundario: { label: 'Ver plan Profesional', href: '/pricing' },
  },

  notarios: {
    eyebrow: 'Soluciones · Notarios',
    titulo: 'Referencia rápida para instrumentos y trámites',
    metaTitle: 'Maya Lex para Notarios — MAYA LEX IA',
    metaDescription:
      'Consulta normativa de referencia y análisis de documentos para la función notarial hondureña, con privacidad estructural de los instrumentos.',
    propuesta:
      'La función notarial exige precisión y confidencialidad. Maya Lex apoya la primera y protege la segunda por diseño.',
    funcionesTitulo: 'Para la notaría',
    funciones: [
      { titulo: 'Referencia normativa ágil', descripcion: 'Consulte requisitos y normas aplicables a instrumentos y trámites, con estado de verificación visible.' },
      { titulo: 'Análisis de documentos', descripcion: 'Revise documentos aportados por los otorgantes con un análisis estructurado de puntos clave.' },
      { titulo: 'Privacidad estructural', descripcion: 'Los instrumentos privados nunca alimentan el corpus compartido ni respuestas públicas — aislamiento a nivel de arquitectura.' },
    ],
    casoUso: {
      titulo: 'Antes de autorizar un instrumento',
      parrafos: [
        'Un otorgante presenta documentación para una escritura. El notario verifica los requisitos normativos aplicables en la consulta de referencia y analiza la documentación aportada de forma estructurada, antes de aplicar su juicio profesional sobre la procedencia del acto.',
      ],
    },
    cobertura: { titulo: 'Cobertura y límites', puntos: LIMITES_COMUNES },
    cierreTitulo: 'Vea la plataforma en acción',
    ctaPrimario: { label: 'Probar gratis', href: '/chat' },
    ctaSecundario: { label: 'Ver seguridad y privacidad', href: '/seguridad' },
  },

  estudiantes: {
    eyebrow: 'Soluciones · Estudiantes',
    titulo: 'Aprenda con casos guiados y explicaciones claras',
    metaTitle: 'Maya Lex para Estudiantes — MAYA LEX IA',
    metaDescription:
      'Casos de estudio guiados, explicaciones paso a paso y formato profesional de análisis para estudiantes de derecho en Honduras.',
    propuesta:
      'Estudie con el mismo formato de análisis que usan los profesionales — explicado paso a paso, a precio de estudiante.',
    funcionesTitulo: 'Para su formación',
    funciones: [
      { titulo: 'Casos de estudio guiados', descripcion: 'Aprenda razonamiento jurídico con casos estructurados en el formato profesional de 7 campos.' },
      { titulo: 'Explicaciones paso a paso', descripcion: 'Cada análisis se puede desglosar: qué norma aplica, por qué, y qué riesgos existen.' },
      { titulo: 'Guías y evaluaciones', descripcion: 'Material de estudio y autoevaluación alineado con la práctica real (plan Académico).' },
    ],
    casoUso: {
      titulo: 'Preparar un examen de derecho penal',
      parrafos: [
        'En vez de memorizar artículos aislados, el estudiante trabaja casos: identifica la cuestión jurídica, ubica la norma aplicable con su estado de verificación y estructura el análisis como lo haría un profesional — el mismo músculo que le pedirán en el ejercicio real.',
      ],
    },
    cobertura: { titulo: 'Cobertura y límites', puntos: LIMITES_COMUNES },
    cierreTitulo: 'Empiece gratis',
    ctaPrimario: { label: 'Probar gratis', href: '/chat' },
    ctaSecundario: { label: 'Ver plan Académico', href: '/pricing' },
  },

  docentes: {
    eyebrow: 'Soluciones · Docentes',
    titulo: 'Material de apoyo para la enseñanza del derecho',
    metaTitle: 'Maya Lex para Docentes — MAYA LEX IA',
    metaDescription:
      'Casos estructurados, formato profesional de análisis y transparencia de fuentes como material de apoyo para la docencia jurídica universitaria.',
    propuesta:
      'Construida por un abogado que también es docente universitario: casos estructurados y fuentes con estado de verificación, listos para el aula.',
    funcionesTitulo: 'Para su cátedra',
    funciones: [
      { titulo: 'Casos estructurados para el aula', descripcion: 'Ejemplos en formato profesional de 7 campos, útiles para discusión dirigida y evaluación.' },
      { titulo: 'Fuentes con estado visible', descripcion: 'Enseñe también a verificar: cada fuente muestra su nivel de verificación, un hábito profesional desde el primer día.' },
      { titulo: 'Guías de estudio', descripcion: 'Material de apoyo y evaluación para acompañar el programa de la asignatura (plan Académico).' },
    ],
    casoUso: {
      titulo: 'Una clase de obligaciones',
      parrafos: [
        'El docente presenta un caso ficticio en el formato de análisis profesional y pide a los estudiantes identificar la cuestión jurídica y el riesgo antes de revelar el análisis completo — la discusión se centra en el razonamiento, no en la búsqueda de materiales.',
      ],
    },
    cobertura: { titulo: 'Cobertura y límites', puntos: LIMITES_COMUNES },
    cierreTitulo: 'Pruebe el formato de caso con Maya Lex',
    ctaPrimario: { label: 'Probar gratis', href: '/chat' },
    ctaSecundario: { label: 'Ver plan Académico', href: '/pricing' },
  },

  bufetes: {
    eyebrow: 'Soluciones · Bufetes',
    titulo: 'Colaboración y biblioteca compartida de equipo',
    metaTitle: 'Maya Lex para Bufetes — MAYA LEX IA',
    metaDescription:
      'Múltiples usuarios con roles, biblioteca privada del bufete y panel de administración para despachos jurídicos hondureños.',
    propuesta:
      'El conocimiento del despacho, organizado y protegido: múltiples usuarios con roles, biblioteca privada y administración centralizada.',
    funcionesTitulo: 'Para el despacho',
    funciones: [
      { titulo: 'Usuarios con roles', descripcion: 'Socios, asociados y pasantes con permisos diferenciados bajo una misma cuenta.' },
      { titulo: 'Biblioteca privada del bufete', descripcion: 'El material interno del despacho, aislado del corpus público y de otros clientes.' },
      { titulo: 'Panel de administración', descripcion: 'Gestión de miembros y uso desde un solo lugar.' },
      { titulo: 'Soporte prioritario', descripcion: 'Acompañamiento directo durante la adopción.' },
    ],
    casoUso: {
      titulo: 'Estandarizar la investigación del equipo',
      parrafos: [
        'Un despacho con cinco abogados unifica su forma de investigar: mismas fuentes verificadas, mismo formato de análisis, biblioteca interna compartida. El socio revisa el trabajo de los asociados en un formato uniforme, y el conocimiento del despacho deja de vivir en carpetas personales dispersas.',
      ],
    },
    cobertura: { titulo: 'Cobertura y límites', puntos: LIMITES_COMUNES },
    cierreTitulo: 'Conversemos sobre su despacho',
    ctaPrimario: { label: 'Ver plan Bufete', href: '/pricing' },
    ctaSecundario: { label: 'Probar gratis', href: '/chat' },
  },

  universidades: {
    eyebrow: 'Soluciones · Universidades',
    titulo: 'Licencias académicas para facultades de derecho',
    metaTitle: 'Maya Lex para Universidades — MAYA LEX IA',
    metaDescription:
      'Licencias para profesores y estudiantes, panel de administración académica y analítica de uso para facultades y programas de derecho.',
    propuesta:
      'Lleve el formato de análisis profesional al aula completa: licencias para profesores y estudiantes con administración académica centralizada.',
    funcionesTitulo: 'Para la facultad',
    funciones: [
      { titulo: 'Licencias académicas', descripcion: 'Cobertura para profesores y estudiantes del programa, sin gestión individual de cuentas.' },
      { titulo: 'Panel de administración académica', descripcion: 'Altas, bajas y organización por asignatura o cohorte.' },
      { titulo: 'Analítica de uso académico', descripcion: 'Visibilidad del uso real por parte de estudiantes y docentes.' },
      { titulo: 'Capacitación incluida', descripcion: 'Formación inicial para el cuerpo docente en el uso responsable de la herramienta.' },
    ],
    casoUso: {
      titulo: 'Un semestre con Maya Lex',
      parrafos: [
        'Una facultad incorpora la plataforma en dos asignaturas piloto. Los docentes usan casos estructurados en clase; los estudiantes practican el formato profesional de análisis; la coordinación observa el uso real en la analítica académica y decide la ampliación con datos, no con impresiones.',
      ],
    },
    cobertura: { titulo: 'Cobertura y límites', puntos: LIMITES_COMUNES },
    cierreTitulo: 'Conversemos sobre su programa',
    ctaPrimario: { label: 'Ver plan Universidad', href: '/pricing' },
    ctaSecundario: { label: 'Probar gratis', href: '/chat' },
  },

  empresas: {
    eyebrow: 'Soluciones · Empresas',
    titulo: 'Investigación jurídica para equipos legales internos',
    metaTitle: 'Maya Lex para Empresas — MAYA LEX IA',
    metaDescription:
      'Consulta normativa verificada y análisis de documentos para departamentos legales de empresas que operan en Honduras.',
    propuesta:
      'Su equipo legal interno, con acceso a investigación normativa verificada y análisis estructurado de documentos — sin depender de cada consulta externa.',
    funcionesTitulo: 'Para el equipo legal',
    funciones: [
      { titulo: 'Consulta normativa verificada', descripcion: 'Requisitos y normas aplicables a la operación, con estado de verificación visible.' },
      { titulo: 'Análisis de contratos', descripcion: 'Contratos con proveedores y clientes analizados de forma estructurada antes de escalar al asesor externo.' },
      { titulo: 'Criterio de escalamiento', descripcion: 'El análisis estructurado ayuda a decidir qué se resuelve internamente y qué requiere asesoría externa especializada.' },
    ],
    casoUso: {
      titulo: 'Primer filtro interno',
      parrafos: [
        'El equipo legal de una empresa recibe un contrato de suministro. Con el análisis estructurado identifica riesgos y puntos de negociación en minutos, y decide con fundamento si el caso amerita escalarse al bufete externo — ahorro directo en horas facturables.',
      ],
    },
    cobertura: { titulo: 'Cobertura y límites', puntos: LIMITES_COMUNES },
    cierreTitulo: 'Evalúe la plataforma con su equipo',
    ctaPrimario: { label: 'Probar gratis', href: '/chat' },
    ctaSecundario: { label: 'Ver planes', href: '/pricing' },
  },
};

export const SLUGS_SOLUCIONES = Object.keys(PERFILES_SOLUCIONES);
