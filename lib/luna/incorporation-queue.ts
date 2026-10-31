/**
 * lib/luna/incorporation-queue.ts
 * Cola FUTURA de incorporación supervisada. Este módulo SOLO define el tipo y construye un candidato en memoria: no escribe
 * en ninguna base de datos, no toca `biblioteca_vectores` ni ningún corpus. Persistirlo y revisarlo es una decisión posterior
 * del propietario (migración + supervisión humana). Una fuente externa verificada nunca pasa al corpus por aquí.
 */
export interface CandidatoIncorporacion {
  readonly estado: 'PENDIENTE_REVISION_HUMANA';
  readonly queryId: string;
  readonly fuenteUrl: string;
  readonly fuenteNombre: string;
  readonly titulo: string;
  readonly detectadoEn: string;
}

export function construirCandidato(
  p: { queryId: string; fuenteUrl: string; fuenteNombre: string; titulo: string },
  ahora: () => Date = () => new Date(),
): CandidatoIncorporacion {
  return Object.freeze({ estado: 'PENDIENTE_REVISION_HUMANA', ...p, detectadoEn: ahora().toISOString() });
}
