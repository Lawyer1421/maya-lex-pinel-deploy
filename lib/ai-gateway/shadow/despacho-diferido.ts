/**
 * lib/ai-gateway/shadow/despacho-diferido.ts
 * G5-F: adaptador PREPARADO (no conectado) para ejecutar el despacho sombra DESPUÉS de que termine la respuesta HTTP,
 * con el mecanismo `after()` de Next.js (sobre Vercel se apoya en `waitUntil`, que extiende la vida de la invocación).
 *
 * Hoy el despacho es fire-and-forget dentro del manejador: si la función serverless se congela al terminar la respuesta,
 * el trabajo puede cortarse. Este módulo recibe el programador (`after`) por parámetro, de modo que:
 *  - no importa `next/server` (sin acoplamiento ni efectos al cargarse);
 *  - la respuesta de producción nunca espera ni depende del shadow (el programador solo agenda);
 *  - cualquier fallo del programador o del despacho se traga: jamás llega al usuario.
 * NO está conectado a app/api/chat/route.ts. Conectarlo exige autorización expresa (ver docs/governance/g5-canary-readiness.md).
 */
import { despacharShadow, esperarDespachos, type ParametrosDespacho } from './dispatcher';

export type ProgramadorPostRespuesta = (tarea: () => Promise<void>) => void;

export function programarShadowDiferido(params: ParametrosDespacho, programar: ProgramadorPostRespuesta): void {
  try {
    programar(async () => {
      try {
        despacharShadow(params);
        // Mantiene viva la invocación hasta que terminen los despachos en vuelo (acotados por SHADOW_TIMEOUT_MS).
        await esperarDespachos();
      } catch {
        // Un fallo del shadow no se propaga.
      }
    });
  } catch {
    // Si el programador no está disponible, el shadow simplemente no corre.
  }
}
