export interface PlanV2 {
  id: 'explorar' | 'academico' | 'profesional' | 'bufete' | 'universidad';
  nombre: string;
  precio: string;
  periodo: string;
  destacado?: boolean;
  descripcion: string;
  caracteristicas: string[];
  notaUsoRazonable?: string;
  ctaLabel: string;
  /**
   * 'checkout' → monta PayPalSubscribeButton (paypalTier obligatorio).
   * 'enlace'   → CTA simple (link interno o mailto), nunca invoca PayPal.
   */
  ctaEstado: 'checkout' | 'enlace';
  /** Tier real que create-subscription/PayPal reconocen — solo para ctaEstado='checkout'. */
  paypalTier?: 'pro' | 'academico';
  /** Destino del CTA — solo para ctaEstado='enlace'. */
  ctaHref?: string;
}

/**
 * Interpreta ?plan= de /pricing (usado al regresar del login) como un tier
 * real de PayPal — nunca confía en el valor crudo de la URL sin validarlo
 * contra los únicos dos tiers de pago que existen.
 */
export function autoStartTierDesde(valor: string | undefined): 'pro' | 'academico' | null {
  return valor === 'pro' || valor === 'academico' ? valor : null;
}

export const PLANES_V2: PlanV2[] = [
  {
    id: 'explorar',
    nombre: 'Explorar',
    precio: 'Gratis',
    periodo: '',
    descripcion: 'Conozca Maya Lex antes de decidir.',
    caracteristicas: [
      'Demostración sin registro',
      'Consultas limitadas por día',
      'Acceso básico a artículos de referencia',
      'Sin herramientas profesionales completas',
    ],
    ctaLabel: 'Comenzar gratis',
    ctaEstado: 'enlace',
    ctaHref: '/demo',
  },
  {
    id: 'academico',
    nombre: 'Académico',
    precio: 'USD 9',
    periodo: '/mes',
    descripcion: 'Para estudiantes y docentes de derecho.',
    caracteristicas: [
      'Casos de estudio guiados',
      'Evaluaciones y guías de estudio',
      'Explicaciones paso a paso',
      'Historial académico personal',
    ],
    ctaLabel: 'Suscribirme',
    ctaEstado: 'checkout',
    paypalTier: 'academico',
  },
  {
    id: 'profesional',
    nombre: 'Profesional',
    precio: 'USD 15',
    periodo: '/mes',
    destacado: true,
    descripcion: 'Para el ejercicio activo de la abogacía.',
    caracteristicas: [
      'Análisis jurídico profundo',
      'Generación de documentos y escritos',
      'Herramientas procesales',
      'Exportación de análisis',
      'Expediente de trabajo personal',
      'Prioridad de respuesta',
    ],
    notaUsoRazonable: 'Sujeto a política de uso razonable — no es un plan de volumen ilimitado sin control técnico.',
    ctaLabel: 'Suscribirme',
    ctaEstado: 'checkout',
    paypalTier: 'pro',
  },
  {
    id: 'bufete',
    nombre: 'Bufete',
    precio: 'Personalizado',
    periodo: '',
    descripcion: 'Para equipos y despachos.',
    caracteristicas: [
      'Múltiples usuarios con roles',
      'Panel de administración',
      'Biblioteca privada del bufete',
      'Colaboración entre miembros',
      'Soporte prioritario',
    ],
    ctaLabel: 'Solicitar propuesta',
    ctaEstado: 'enlace',
    ctaHref: 'mailto:contacto@abogadofredypinelfirmalegal.com?subject=Plan%20Bufete%20%E2%80%94%20Maya%20Lex',
  },
  {
    id: 'universidad',
    nombre: 'Universidad',
    precio: 'Personalizado',
    periodo: '',
    descripcion: 'Para facultades y programas de derecho.',
    caracteristicas: [
      'Licencias para profesores y estudiantes',
      'Panel de administración académica',
      'Capacitación incluida',
      'Analítica de uso académico',
    ],
    ctaLabel: 'Contactar ventas',
    ctaEstado: 'enlace',
    ctaHref: 'mailto:contacto@abogadofredypinelfirmalegal.com?subject=Plan%20Universidad%20%E2%80%94%20Maya%20Lex',
  },
];
