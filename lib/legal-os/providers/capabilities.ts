/**
 * lib/legal-os/providers/capabilities.ts
 * Alias de capacidad en vez de IDs de modelo cableados: FAST, STANDARD, DEEP_REASONING, DOCUMENT, CLASSIFIER.
 * La configuración del proveedor mapea capacidad → modelo VERIFICADO. Una capacidad sin modelo verificado se degrada de forma segura
 * (DEEP_REASONING → STANDARD → FAST) y, si ni FAST está verificada, no hay modelo. Un ID que no esté en el registro verificado
 * NUNCA sale de `resolverCapacidad`, ni siquiera si la configuración lo declara «verified».
 */
import type { ModelPolicy } from '../policies/model-policy';

export const CAPABILITIES = ['FAST', 'STANDARD', 'DEEP_REASONING', 'DOCUMENT', 'CLASSIFIER'] as const;
export type Capability = (typeof CAPABILITIES)[number];

export interface ModeloDeCapacidad {
  modelId: string | null;
  verified: boolean;
  verifiedOn: string | null;
  source: string | null;
}
export type ConfigProveedor = Readonly<Record<Capability, ModeloDeCapacidad>>;

const SIN_MODELO: ModeloDeCapacidad = Object.freeze({ modelId: null, verified: false, verifiedOn: null, source: null });

/** Único modelo verificado hoy (verificación oficial de OpenAI del 2026-10-23). Ampliar este registro exige una verificación oficial nueva. */
class RegistroInmutable extends Set<string> {
  constructor(ids: readonly string[]) {
    super();
    for (const id of ids) super.add(id);
  }
  override add(): this { throw new Error('el registro de modelos verificados es inmutable'); }
  override delete(): boolean { throw new Error('el registro de modelos verificados es inmutable'); }
  override clear(): void { throw new Error('el registro de modelos verificados es inmutable'); }
}
export const REGISTRO_VERIFICADO: ReadonlySet<string> = Object.freeze(new RegistroInmutable(['gpt-6-luna']));

export const CONFIG_PROVEEDOR_OPENAI: ConfigProveedor = Object.freeze({
  FAST: Object.freeze({ modelId: 'gpt-6-luna', verified: true, verifiedOn: '2026-10-23', source: 'Registro de verificación oficial de OpenAI (G6-A)' }),
  STANDARD: SIN_MODELO,
  DEEP_REASONING: SIN_MODELO,
  DOCUMENT: SIN_MODELO,
  CLASSIFIER: SIN_MODELO,
});

/** Cadena de degradación segura por capacidad. */
const DEGRADACION: Readonly<Record<Capability, readonly Capability[]>> = Object.freeze({
  FAST: ['FAST'],
  STANDARD: ['STANDARD', 'FAST'],
  DEEP_REASONING: ['DEEP_REASONING', 'STANDARD', 'FAST'],
  DOCUMENT: ['DOCUMENT', 'STANDARD', 'FAST'],
  CLASSIFIER: ['CLASSIFIER', 'FAST'],
});

export interface CapacidadResuelta {
  modelId: string | null;
  /** Capacidad cuyo modelo se usará (puede diferir de la pedida). */
  capabilityUsed: Capability | null;
  /** Presente solo si hubo degradación: la capacidad pedida. */
  degradedFrom?: Capability;
}

export const esModeloVerificado = (id: unknown, registro: ReadonlySet<string> = REGISTRO_VERIFICADO): id is string => typeof id === 'string' && registro.has(id);

/** Lanza si el ID no está en el registro verificado. */
export function assertVerified(id: unknown, registro: ReadonlySet<string> = REGISTRO_VERIFICADO): asserts id is string {
  if (!esModeloVerificado(id, registro)) throw new Error(`modelo no verificado: ${String(id)}`);
}

const utilizable = (m: ModeloDeCapacidad | undefined, registro: ReadonlySet<string>): m is ModeloDeCapacidad & { modelId: string } =>
  !!m && m.verified === true && esModeloVerificado(m.modelId, registro);

export function resolverCapacidad(cap: Capability, config: ConfigProveedor = CONFIG_PROVEEDOR_OPENAI, registro: ReadonlySet<string> = REGISTRO_VERIFICADO): CapacidadResuelta {
  for (const c of DEGRADACION[cap] ?? []) {
    const m = config[c];
    if (utilizable(m, registro)) return c === cap ? { modelId: m.modelId, capabilityUsed: c } : { modelId: m.modelId, capabilityUsed: c, degradedFrom: cap };
  }
  return { modelId: null, capabilityUsed: null };
}

/** Adapta una ModelPolicy (fast/deep) a alias de capacidad. Su registro de confianza son los modelos que la propia política marca verificados. */
export function configDesdePolitica(p: Pick<ModelPolicy, 'fast' | 'deep'>): { config: ConfigProveedor; registro: ReadonlySet<string> } {
  const entrada = (m: { modelId: string | null; verified: boolean }): ModeloDeCapacidad =>
    m.verified && m.modelId ? { modelId: m.modelId, verified: true, verifiedOn: null, source: 'ModelPolicy' } : SIN_MODELO;
  const registro = new Set<string>();
  for (const m of [p.fast, p.deep]) if (m.verified && m.modelId) registro.add(m.modelId);
  return { config: { FAST: entrada(p.fast), STANDARD: SIN_MODELO, DEEP_REASONING: entrada(p.deep), DOCUMENT: SIN_MODELO, CLASSIFIER: SIN_MODELO }, registro };
}
