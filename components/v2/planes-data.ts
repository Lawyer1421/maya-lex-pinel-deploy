import { LIMITES_ACADEMICO, LIMITES_PREMIUM, PRECIOS_PLAN, formatoEntero, formatoLempiras, formatoUsd } from '@/lib/plan-limits';

export interface PlanV2 {
  id: 'explorar' | 'academico' | 'profesional' | 'bufete' | 'universidad';
  nombre: string;
  precio: string;
  /** Equivalente en lempiras, solo planes de pago (p. ej. «L 405»). */
  precioLempiras?: string;
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

/**
 * Self-serve (Explorar / Académico / Profesional): mismas funciones reales;
 * solo cambia la cuota. Los límites y precios de los planes de pago salen de
 * lib/plan-limits.ts (la misma fuente que hace cumplir el servidor);
 * Explorar (FREE) sigue con su env en lib/rate-limit.ts. No vender expediente / export / prioridad.
 */
export const PLANES_V2: PlanV2[] = [
  {
    id: 'explorar',
    nombre: 'Explorar',
    precio: 'Gratis',
    periodo: '',
    descripcion: 'Conozca Maya Lex antes de decidir.',
    caracteristicas: [
      '1 consulta/día',
      'Modos de chat: Sala IA, Análisis y Documento',
      'Adjuntar documentos (PDF, DOCX, TXT)',
      'Voz a texto y búsqueda web',
    ],
    ctaLabel: 'Comenzar gratis',
    ctaEstado: 'enlace',
    ctaHref: '/chat',
  },
  {
    id: 'academico',
    nombre: 'Académico',
    precio: formatoUsd(PRECIOS_PLAN.academico.usd),
    precioLempiras: formatoLempiras(PRECIOS_PLAN.academico.lempiras),
    periodo: '/mes',
    descripcion: 'Para estudiantes y docentes de derecho.',
    caracteristicas: [
      `${LIMITES_ACADEMICO.diario} consultas/día (hasta ${formatoEntero(LIMITES_ACADEMICO.mensual)} al mes)`,
      'Modos de chat: Sala IA, Análisis y Documento',
      'Adjuntar documentos (PDF, DOCX, TXT)',
      'Voz a texto y búsqueda web',
    ],
    ctaLabel: 'Suscribirme con PayPal',
    ctaEstado: 'checkout',
    paypalTier: 'academico',
  },
  {
    id: 'profesional',
    nombre: 'Premium',
    precio: formatoUsd(PRECIOS_PLAN.premium.usd),
    precioLempiras: formatoLempiras(PRECIOS_PLAN.premium.lempiras),
    periodo: '/mes',
    destacado: true,
    descripcion: 'Para el ejercicio activo de la abogacía.',
    caracteristicas: [
      `${LIMITES_PREMIUM.diario} consultas/día (hasta ${formatoEntero(LIMITES_PREMIUM.mensual)} al mes)`,
      'Modos de chat: Sala IA, Análisis y Documento',
      'Adjuntar documentos (PDF, DOCX, TXT)',
      'Voz a texto y búsqueda web',
    ],
    notaUsoRazonable: 'Sujeto a política de uso razonable — no es un plan de volumen ilimitado sin control técnico.',
    ctaLabel: 'Suscribirme con PayPal',
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
