/**
 * lib/ai-gateway/shadow/circuit-breaker.ts
 * MAYALEX AI GATEWAY v1 — PR-G3a: circuit breaker mínimo EN MEMORIA para el despacho sombra.
 *
 * Sin Redis, sin base de datos, sin infraestructura nueva: el estado vive en la instancia y se
 * reinicia con ella. Tras `umbralFallos` fallos dentro de `ventanaMs` se abre y rechaza despachos
 * durante `enfriamientoMs`; luego deja pasar UNA sonda (semiabierto): si tiene éxito se cierra, si
 * falla vuelve a abrirse. Un fallo es un error de infraestructura o un timeout, no una salida inválida.
 */
export type EstadoBreaker = 'CERRADO' | 'ABIERTO' | 'SEMIABIERTO';

export interface OpcionesBreaker {
  umbralFallos?: number;
  ventanaMs?: number;
  enfriamientoMs?: number;
  /** Reloj inyectable para pruebas. */
  ahora?: () => number;
}

export interface CircuitBreaker {
  /** true si el despacho puede seguir. En semiabierto solo deja pasar una sonda a la vez. */
  permitir(): boolean;
  exito(): void;
  fallo(): void;
  estado(): EstadoBreaker;
}

export function crearCircuitBreaker(opciones: OpcionesBreaker = {}): CircuitBreaker {
  const umbral = opciones.umbralFallos ?? 5;
  const ventana = opciones.ventanaMs ?? 60_000;
  const enfriamiento = opciones.enfriamientoMs ?? 30_000;
  const ahora = opciones.ahora ?? Date.now;

  let fallos: number[] = [];
  let abiertoHasta = 0;
  let abierto = false;
  let sondaEnCurso = false;

  const abrir = () => {
    abierto = true;
    sondaEnCurso = false;
    abiertoHasta = ahora() + enfriamiento;
    fallos = [];
  };

  return {
    permitir() {
      if (!abierto) return true;
      if (ahora() < abiertoHasta) return false;
      if (sondaEnCurso) return false;
      sondaEnCurso = true;
      return true;
    },
    exito() {
      abierto = false;
      sondaEnCurso = false;
      fallos = [];
    },
    fallo() {
      if (abierto) {
        // La sonda falló: vuelve a abrirse.
        abrir();
        return;
      }
      const t = ahora();
      fallos = fallos.filter((x) => t - x < ventana);
      fallos.push(t);
      if (fallos.length >= umbral) abrir();
    },
    estado() {
      if (!abierto) return 'CERRADO';
      return ahora() < abiertoHasta ? 'ABIERTO' : 'SEMIABIERTO';
    },
  };
}
