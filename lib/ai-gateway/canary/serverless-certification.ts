/**
 * lib/ai-gateway/canary/serverless-certification.ts
 * G6-E: certificación del modelo de ejecución serverless del shadow, con evidencia por punto y estado VERIFIED / NOT_VERIFIED.
 * No conecta after() a producción. La certificación solo es verdadera si TODOS los puntos están VERIFIED.
 *
 * Fuentes de la verificación (2026-10-23): código de la ruta; código fuente de Next 16.2.6 instalado (after-context.js); documentación
 * oficial de Vercel (límites de duración y waitUntil); lectura de solo lectura del proyecto y del último despliegue en Vercel; evidencia
 * automática de independencia (docs/governance/evidence/g6-production-independence.json).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evidenciaVigente } from './evidence-integrity';

export type EstadoPunto = 'VERIFIED' | 'NOT_VERIFIED';

export interface PuntoServerless {
  id: string;
  tema: string;
  valor: string;
  evidencia: string;
  estado: EstadoPunto;
  /** Qué hace falta para cerrarlo, si no está VERIFIED. */
  pendiente?: string;
}

export interface InspeccionRuta {
  runtime: 'nodejs' | 'edge';
  exportaMaxDuration: boolean;
  exportaRuntime: boolean;
  usaAfter: boolean;
  llamadasAfter: number;
  despachoShadowProtegidoConTryCatch: boolean;
}

/** Lectura estática de la ruta real: nada se supone. */
export function inspeccionarRuta(texto: string): InspeccionRuta {
  const runtimeExport = /export\s+const\s+runtime\s*=\s*['"](\w+)['"]/.exec(texto);
  const idx = texto.indexOf('despacharShadow({');
  const previo = idx >= 0 ? texto.slice(Math.max(0, idx - 80), idx) : '';
  return {
    runtime: runtimeExport?.[1] === 'edge' ? 'edge' : 'nodejs',
    exportaMaxDuration: /export\s+const\s+maxDuration\b/.test(texto),
    exportaRuntime: runtimeExport !== null,
    usaAfter: /\bafter\s*\(/.test(texto),
    llamadasAfter: (texto.match(/\bafter\s*\(/g) ?? []).length,
    despachoShadowProtegidoConTryCatch: /try\s*\{\s*$/.test(previo.replace(/\/\/.*$/gm, '').trimEnd() + ''),
  };
}

const V = 'VERIFIED' as const;
const N = 'NOT_VERIFIED' as const;

export function certificarServerless(raiz = process.cwd()): { certificada: boolean; PRODUCTION_HTTP_RESPONSE_INDEPENDENT: boolean; puntos: PuntoServerless[] } {
  const ruta = inspeccionarRuta(readFileSync(join(raiz, 'app', 'api', 'chat', 'route.ts'), 'utf8'));
  let independencia = { PRODUCTION_HTTP_RESPONSE_INDEPENDENT: false, vigente: false };
  try {
    const ev = JSON.parse(readFileSync(join(raiz, 'docs', 'governance', 'evidence', 'g6-production-independence.json'), 'utf8'));
    independencia = { PRODUCTION_HTTP_RESPONSE_INDEPENDENT: ev.PRODUCTION_HTTP_RESPONSE_INDEPENDENT === true, vigente: evidenciaVigente(ev.codigoHashes, raiz).vigente };
  } catch {
    /* sin evidencia */
  }
  const independiente = independencia.PRODUCTION_HTTP_RESPONSE_INDEPENDENT && independencia.vigente;

  const puntos: PuntoServerless[] = [
    {
      id: 'runtime-de-la-ruta', tema: 'Runtime real de la ruta /api/chat',
      valor: ruta.exportaRuntime ? `export const runtime = ${ruta.runtime}` : 'Sin export de runtime: Node.js (valor por defecto de Next.js).',
      evidencia: 'Lectura estática de app/api/chat/route.ts; el despliegue figura como LAMBDAS en Vercel (get_deployment, 2026-10-23).',
      estado: ruta.runtime === 'nodejs' ? V : N,
    },
    {
      id: 'version-de-node', tema: 'Versión / requisito de Node',
      valor: 'Proyecto de Vercel: nodeVersion 24.x; .nvmrc 22; openai@7.43.0 exige Node >=22.',
      evidencia: 'Vercel get_project (solo lectura, 2026-10-23); package.json; .nvmrc.',
      estado: V,
    },
    {
      id: 'max-duration', tema: 'maxDuration de la ruta',
      valor: ruta.exportaMaxDuration
        ? 'La ruta exporta maxDuration.'
        : 'La ruta NO exporta maxDuration: rige el valor por defecto de la plataforma. La documentación de Vercel fija 300 s por defecto (máximo 800 s en Pro) CON Fluid Compute, activado por defecto desde 2025-04-23; el proyecto se creó el 2026-06-25.',
      evidencia: 'Documentación oficial de Vercel (límites de duración y vercel.json/maxDuration), consultada 2026-10-23.',
      estado: N,
      pendiente: 'La API de solo lectura no expone si Fluid Compute está activo en este proyecto, así que la duración disponible (300 s con Fluid) no está confirmada. Cerrarlo: ver el interruptor en el panel de Vercel, o autorizar un export const maxDuration explícito en la ruta.',
    },
    {
      id: 'comportamiento-de-after', tema: 'Comportamiento de after() en esta versión',
      valor: 'Los callbacks se ejecutan al cerrar la respuesta, dentro de waitUntil; si el callback lanza, el error se captura y se registra (no llega a la respuesta); si waitUntil no existe, after() lanza de forma síncrona.',
      evidencia: 'node_modules/next/dist/server/after/after-context.js (Next 16.2.6): addCallback, runCallbacksOnClose, reportTaskError, errorWaitUntilNotAvailable; documentación after.md.',
      estado: V,
    },
    {
      id: 'ciclo-de-vida-tras-la-respuesta', tema: 'Ciclo de vida tras la respuesta HTTP',
      valor: 'waitUntil extiende la vida de la invocación hasta que la promesa termina, con el MISMO tiempo máximo de la función; si la función expira, la promesa se cancela.',
      evidencia: 'Documentación oficial de Vercel (waitUntil), consultada 2026-10-23.',
      estado: V,
    },
    {
      id: 'timeout-del-shadow', tema: 'Timeout del shadow frente a la duración',
      valor: 'SHADOW_TIMEOUT_MS = 5,000 ms con AbortSignal propagado: muy por debajo de cualquier duración de función razonable.',
      evidencia: 'lib/ai-gateway/shadow/config.ts; dispatcher.ts → conTimeout (probado en tests/ai-gateway-shadow-resilience.test.ts).',
      estado: V,
    },
    {
      id: 'excepcion-en-el-shadow', tema: 'Comportamiento ante excepción',
      valor: 'Una excepción del shadow se captura en el dispatcher, otra vez en despacho-diferido.ts y en la ruta (try/catch); ninguna llega a la respuesta.',
      evidencia: `Ruta: despacho protegido con try/catch = ${ruta.despachoShadowProtegidoConTryCatch}; escenario «despachador-lanza» de g6-production-independence.json.`,
      estado: ruta.despachoShadowProtegidoConTryCatch ? V : N,
    },
    {
      id: 'precedente-after-en-la-ruta', tema: 'after() ya se usa en esta misma ruta',
      valor: `${ruta.llamadasAfter} llamadas a after() (logConsulta): el entorno de Vercel ya proporciona waitUntil a esta ruta en producción.`,
      evidencia: 'Lectura estática de app/api/chat/route.ts.',
      estado: ruta.usaAfter ? V : N,
    },
    {
      id: 'aislamiento-http-vs-shadow', tema: 'Aislamiento entre la respuesta HTTP y el shadow',
      valor: independiente ? 'PRODUCTION_HTTP_RESPONSE_INDEPENDENT = TRUE: 12 escenarios, respuesta idéntica byte a byte a la línea base.' : 'Evidencia ausente, falsa o desactualizada.',
      evidencia: 'docs/governance/evidence/g6-production-independence.json (con SHA-256 del código que ejerció); tests/production-independence-g6.test.ts.',
      estado: independiente ? V : N,
    },
  ];
  return { certificada: puntos.every((p) => p.estado === V), PRODUCTION_HTTP_RESPONSE_INDEPENDENT: independiente, puntos };
}
