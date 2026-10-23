/**
 * lib/ai-gateway/canary/evidence-integrity.ts
 * G6-E / G6-F: integridad de la evidencia automática. Cada archivo de evidencia lleva el SHA-256 del código que ejerció; si ese código
 * cambia después, la evidencia deja de ser vigente y el Authorization Pack lo detecta. Solo lectura de archivos del repositorio.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Código que decide la respuesta de producción y el despacho shadow. */
export const ARCHIVOS_RUTA_Y_SHADOW: readonly string[] = [
  'app/api/chat/route.ts',
  'lib/ai-gateway/shadow/dispatcher.ts',
  'lib/ai-gateway/shadow/despacho-diferido.ts',
  'lib/ai-gateway/shadow/config.ts',
  'lib/ai-gateway/shadow/shadow-model-config.ts',
  'lib/ai-gateway/shadow/public-provenance.ts',
  'lib/ai-gateway/shadow/public-provenance-manifest.ts',
  'lib/ai-gateway/shadow/privacy-gate.ts',
  'lib/ai-gateway/shadow/pii-gate.ts',
  'lib/ai-gateway/shadow/openai-adapter.ts',
];

/** Código de recuperación, resolvedor exacto, Evidence Gate y abstención que el rollback NO debe tocar. */
export const ARCHIVOS_PRODUCCION_JURIDICA: readonly string[] = [
  'app/api/chat/route.ts',
  'lib/rag/search.ts',
  'lib/legal-retrieval/exact-resolver.ts',
  'lib/legal-retrieval/evidence-engine.ts',
  'lib/legal-retrieval/semantic-retriever.ts',
  'lib/legal-retrieval/instrument-gate.ts',
  'lib/legal-retrieval/primitives.ts',
  'lib/legal-retrieval/types.ts',
];

export function hashArchivos(rutas: readonly string[], raiz = process.cwd()): Record<string, string> {
  const out: Record<string, string> = {};
  for (const ruta of [...rutas].sort()) {
    try {
      out[ruta] = createHash('sha256').update(readFileSync(join(raiz, ruta))).digest('hex');
    } catch {
      out[ruta] = 'ARCHIVO_AUSENTE';
    }
  }
  return out;
}

/** ¿La evidencia sigue siendo vigente? Los hashes guardados deben coincidir con el código actual. */
export function evidenciaVigente(guardados: Record<string, string> | undefined, raiz = process.cwd()): { vigente: boolean; cambiados: string[] } {
  if (!guardados || Object.keys(guardados).length === 0) return { vigente: false, cambiados: ['(sin hashes)'] };
  const actuales = hashArchivos(Object.keys(guardados), raiz);
  const cambiados = Object.keys(guardados).filter((k) => actuales[k] !== guardados[k]);
  return { vigente: cambiados.length === 0 && !Object.values(guardados).includes('ARCHIVO_AUSENTE'), cambiados };
}
