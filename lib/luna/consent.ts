/**
 * lib/luna/consent.ts
 * Modalidad EXPLÍCITA «consulta jurídica general» (CLO 29-oct-2026). Luna solo corre si el usuario la activa Y acepta el aviso de
 * privacidad vigente en esa solicitud. Todo lo demás va por el proveedor actual. La versión del aviso viaja con la aceptación: si el
 * texto cambia (nueva versión), una aceptación anterior deja de valer.
 */
export const MODALIDAD_CONSULTA_GENERAL = 'consulta_juridica_general' as const;
export const AVISO_LUNA_VERSION = '2026-10-29.v1';

/** Texto que debe mostrar la interfaz antes de que el usuario acepte. PENDIENTE_VERIFICACIÓN legal por Fredy (propietario) o su delegado jurídico antes de producción. */
export const AVISO_LUNA_TEXTO =
  'Consulta jurídica general: tu pregunta y los textos normativos públicos recuperados se envían a un proveedor externo de IA (OpenAI) para ' +
  'redactar una respuesta con referencias. No escribas nombres, RTN, DNI, números de expediente, montos ni fechas de un caso concreto, ' +
  'ni cuentes hechos propios. No se envían tu historial, archivos ni datos de tu sesión. El proveedor puede conservar registros de ' +
  'monitoreo de abuso hasta 30 días. La respuesta es analítica y NO OFICIAL.';

/**
 * ¿El propietario (o su delegado jurídico) autorizó el texto del aviso para mostrarlo a usuarios? MIENTRAS SEA false la interfaz NO muestra el interruptor ni el aviso (el texto
 * vive solo en docs/luna/AVISO_LUNA_BORRADOR.md). Cambiarlo a true es un cambio revisado, posterior a la autorización expresa y escrita del propietario o de su delegado jurídico (ya no depende del antiguo CLO).
 */
export const AVISO_LUNA_AUTORIZADO_POR_PROPIETARIO = false;

/** Estado del interruptor en la interfaz: apagado por defecto; el consentimiento es una acción aparte y versionada. */
export interface EstadoInterruptorLuna {
  activo: boolean;
  aceptado: boolean;
}
export const INTERRUPTOR_LUNA_INICIAL: EstadoInterruptorLuna = Object.freeze({ activo: false, aceptado: false });

/** Campo `luna` del cuerpo de /api/chat. Sin interruptor visible, activo y aceptado, no se envía NADA (el servidor lo trata como no solicitada). */
export function construirCampoLuna(estado: EstadoInterruptorLuna, aprobado: boolean = AVISO_LUNA_AUTORIZADO_POR_PROPIETARIO): SolicitudLuna | undefined {
  if (!aprobado || !estado.activo || !estado.aceptado) return undefined;
  return { modalidad: MODALIDAD_CONSULTA_GENERAL, aceptado: true, aviso_version: AVISO_LUNA_VERSION };
}

export interface SolicitudLuna {
  modalidad?: unknown;
  aceptado?: unknown;
  aviso_version?: unknown;
}

export type DecisionConsentimiento = { ok: true } | { ok: false; motivo: 'NO_SOLICITADA' | 'AVISO_NO_ACEPTADO' | 'AVISO_VERSION_DISTINTA' };

/** Solo `modalidad` exacta + `aceptado === true` + versión vigente. Cualquier otra cosa (ausente, texto, 1, "true") no es aceptación. */
export function evaluarConsentimientoLuna(solicitud: unknown): DecisionConsentimiento {
  if (typeof solicitud !== 'object' || solicitud === null) return { ok: false, motivo: 'NO_SOLICITADA' };
  const s = solicitud as SolicitudLuna;
  if (s.modalidad !== MODALIDAD_CONSULTA_GENERAL) return { ok: false, motivo: 'NO_SOLICITADA' };
  if (s.aceptado !== true) return { ok: false, motivo: 'AVISO_NO_ACEPTADO' };
  if (s.aviso_version !== AVISO_LUNA_VERSION) return { ok: false, motivo: 'AVISO_VERSION_DISTINTA' };
  return { ok: true };
}
