/**
 * lib/ingesta-oficial/estados.ts
 * Máquina de estados V0-V5 (Paquete D). Toda promoción queda auditada —
 * incluso los intentos rechazados por falta de autorización, para que
 * quede constancia de quién intentó qué y cuándo.
 */
import type { EstadoV } from './types';

export const ORDEN_ESTADOS: EstadoV[] = ['V0', 'V1', 'V2', 'V3', 'V4', 'V5'];

export const DESCRIPCION_ESTADO: Record<EstadoV, string> = {
  V0: 'Capturado',
  V1: 'Fuente identificada',
  V2: 'Integridad comprobada',
  V3: 'Vigencia analizada',
  V4: 'Revisión profesional',
  V5: 'Producción',
};

/** Reglas de disponibilidad — usadas por el Modo Litigante y por cualquier consumidor de contenido. */
export function disponibleParaRespuestasProfesionales(estado: EstadoV): boolean {
  return estado === 'V4' || estado === 'V5';
}

export function requiereAdvertencia(estado: EstadoV): boolean {
  return estado === 'V3';
}

export function disponibleParaBetaProfesional(estado: EstadoV): boolean {
  return estado === 'V4';
}

export function disponibleParaProduccionGeneral(estado: EstadoV): boolean {
  return estado === 'V5';
}

/** Transiciones que requieren un rol autorizado (no cualquier proceso automático). */
const TRANSICIONES_RESTRINGIDAS: ReadonlySet<string> = new Set(['V3->V4', 'V4->V5']);

/** Roles autorizados para promover V3→V4 o V4→V5. Ampliar solo con decisión explícita del propietario del despacho. */
export const ROLES_AUTORIZADOS_PROMOCION: ReadonlySet<string> = new Set(['abogado_revisor_senior', 'propietario_despacho']);

export interface ActorPromocion {
  identificador: string;
  rol: string;
}

export interface RegistroAuditoria {
  timestamp: string;
  normId: string;
  estadoOrigen: EstadoV;
  estadoDestino: EstadoV;
  actor: ActorPromocion;
  resultado: 'aprobado' | 'rechazado';
  motivo: string;
}

export class MaquinaEstadosCorpus {
  private auditoria: RegistroAuditoria[] = [];

  constructor(private readonly ahora: () => string = () => new Date().toISOString()) {}

  obtenerAuditoria(): readonly RegistroAuditoria[] {
    return this.auditoria;
  }

  /**
   * Intenta promover un norm_id de estadoOrigen a estadoDestino. Siempre
   * registra el intento en la auditoría, apruebe o no.
   */
  promover(normId: string, estadoOrigen: EstadoV, estadoDestino: EstadoV, actor: ActorPromocion): RegistroAuditoria {
    const registrar = (resultado: 'aprobado' | 'rechazado', motivo: string): RegistroAuditoria => {
      const registro: RegistroAuditoria = {
        timestamp: this.ahora(),
        normId,
        estadoOrigen,
        estadoDestino,
        actor,
        resultado,
        motivo,
      };
      this.auditoria.push(registro);
      return registro;
    };

    const idxOrigen = ORDEN_ESTADOS.indexOf(estadoOrigen);
    const idxDestino = ORDEN_ESTADOS.indexOf(estadoDestino);

    if (idxDestino <= idxOrigen) {
      return registrar('rechazado', `transición inválida: ${estadoDestino} no es un avance respecto de ${estadoOrigen}`);
    }
    if (idxDestino - idxOrigen > 1) {
      return registrar('rechazado', `transición inválida: no se puede saltar de ${estadoOrigen} directo a ${estadoDestino} sin pasar por los estados intermedios`);
    }

    const clave = `${estadoOrigen}->${estadoDestino}`;
    if (TRANSICIONES_RESTRINGIDAS.has(clave) && !ROLES_AUTORIZADOS_PROMOCION.has(actor.rol)) {
      return registrar('rechazado', `promoción ${clave} requiere un rol autorizado (${[...ROLES_AUTORIZADOS_PROMOCION].join(' o ')}); actor tiene rol "${actor.rol}"`);
    }

    return registrar('aprobado', `promoción ${clave} autorizada`);
  }
}
