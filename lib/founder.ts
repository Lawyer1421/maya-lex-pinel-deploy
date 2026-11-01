/**
 * lib/founder.ts — exención del fundador (founder bypass).
 *
 * El fundador y propietario de MayaLex no debe quedar sujeto a límites de consultas, suscripciones ni pasarela de pago al probar el producto. En lugar
 * de repartir excepciones por el código, el fundador se resuelve al tier interno 'admin' en el ÚNICO lugar donde se decide el plan
 * (`resolveTodayTier`, lib/rate-limit.ts) y en el adaptador `resolveCurrentAccess` (lib/paypal/access.ts). 'admin' ya significa: acceso activo,
 * sin tope diario ni mensual de consultas (lib/rate-limit.ts) y sin cuota de adjuntos (lib/paypal/document-analysis.ts).
 *
 * SEGURIDAD: la identidad que se compara es siempre el identificador que sale del JWT de Supabase validado en el servidor (`getVerifiedEmail` →
 * `email:{correo}`). Una petición sin token válido se identifica por IP (`ip:…`), nunca por un correo que mande el cliente, así que no se puede
 * suplantar con un header o un parámetro. La coincidencia es exacta (no por sufijo ni por dominio).
 *
 * LO QUE NO EXIME: los topes DUROS de costo de Luna (USD 0.01 por consulta y USD 5 al día por plan, lib/luna/config.ts) y el contador global de
 * costos. Son límites de gasto con el proveedor, no límites comerciales: el fundador también los respeta. Tampoco toca el cobro de PayPal ni
 * crea suscripciones.
 */
/** Prefijo de la bolsa MCP (igual a PREFIJO_BOLSA_MCP de lib/rate-limit.ts; una prueba lo verifica). Se repite aquí para no crear un ciclo de importación. */
export const PREFIJO_BOLSA_MCP = 'mcp:';

/** Correos de fundador (minúsculas, exactos). Cambiar esta lista es un cambio de código revisado. */
export const CORREOS_FUNDADOR: ReadonlySet<string> = Object.freeze(new Set(['abogadofredypinel.firmalegal@gmail.com'])) as ReadonlySet<string>;

/** ¿Este correo (ya verificado en el servidor) es de fundador? */
export function esCorreoFundador(email: string | null | undefined): boolean {
  return typeof email === 'string' && CORREOS_FUNDADOR.has(email.trim().toLowerCase());
}

/**
 * ¿Este identificador de usuario (`email:{correo}` o `mcp:email:{correo}`) es de fundador? Los identificadores por IP, vacíos o con otro prefijo
 * nunca lo son.
 */
export function esIdentificadorFundador(userIdentifier: string | null | undefined): boolean {
  if (typeof userIdentifier !== 'string') return false;
  const id = userIdentifier.startsWith(PREFIJO_BOLSA_MCP) ? userIdentifier.slice(PREFIJO_BOLSA_MCP.length) : userIdentifier;
  if (!id.startsWith('email:')) return false;
  return esCorreoFundador(id.slice('email:'.length));
}
