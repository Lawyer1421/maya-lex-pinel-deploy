import { describe, it, expect } from 'vitest';
import { medirPrivacidad, generarAdversariales, etapasDeFalsosPositivos } from './privacy/benchmark-adversarial';
import { GOLDEN_G1 } from './golden/gateway-g1-casos';

const golden = GOLDEN_G1.map((c) => c.input.sanitizedQuestion);
const m = medirPrivacidad(golden);

// Línea base G5-B. Subir un tope exige justificarlo en el PR; bajarlo es bienvenido.
const TOPE_RESIDUAL_MISS_RATE = 0.1;
const TOPE_PUBLIC_FALSE_POSITIVE_RATE = 0.07;

describe('G5-B benchmark adversarial de privacidad (métricas separadas)', () => {
  it('el conjunto adversarial es grande y cubre todos los grupos pedidos', () => {
    expect(generarAdversariales().length).toBeGreaterThanOrEqual(150);
    expect(Object.keys(m.residualMissPorGrupo).sort()).toEqual([
      'APELLIDO_RARO', 'DOCUMENTO_PRIVADO_DISFRAZADO', 'EMAIL_ROTO', 'ERROR_ORTOGRAFICO', 'IDENTIFICADOR_JUDICIAL_NO_ESTANDAR',
      'INICIALES', 'MINUSCULAS', 'NOMBRE_COMPUESTO', 'NOMBRE_CON_CONECTORES', 'NOMBRE_EXTRANJERO', 'NOMBRE_HONDUREÑO_RARO',
      'NUMERO_PARCIAL_EN_LETRAS', 'TELEFONO_FRAGMENTADO',
    ]);
  });
  it('requiredRecall: el benchmark exigido se detecta completo (denominador = solo lo exigido)', () => {
    expect(m.requiredRecall).toBe(1);
    expect(m.requiredTotal).toBeGreaterThanOrEqual(40);
  });
  it('residualMissRate: se mide sobre TODO el conjunto adversarial y se mantiene bajo el tope', () => {
    expect(m.residualMissRate).toBe(m.adversarialMissed / m.adversarialTotal);
    expect(m.residualMissRate).toBeLessThanOrEqual(TOPE_RESIDUAL_MISS_RATE);
  });
  it('el residual NO es cero y se reconoce: nombres en minúscula fuera del diccionario siguen pasando', () => {
    expect(m.adversarialMissed).toBeGreaterThan(0);
    expect(m.residualMissPorGrupo.MINUSCULAS.missed).toBeGreaterThan(0);
    // Nombres capitalizados raros, extranjeros, con errores, conectores o iniciales: los atrapa el gate.
    for (const g of ['NOMBRE_HONDUREÑO_RARO', 'APELLIDO_RARO', 'NOMBRE_EXTRANJERO', 'ERROR_ORTOGRAFICO', 'NOMBRE_CON_CONECTORES', 'INICIALES', 'EMAIL_ROTO', 'TELEFONO_FRAGMENTADO', 'NUMERO_PARCIAL_EN_LETRAS', 'IDENTIFICADOR_JUDICIAL_NO_ESTANDAR', 'DOCUMENTO_PRIVADO_DISFRAZADO']) {
      expect(m.residualMissPorGrupo[g].missed, g).toBe(0);
    }
  });
  it('overallMissRate incluye exigidos + adversariales: es la cifra sin maquillaje', () => {
    const esperado = (m.requiredTotal * (1 - m.requiredRecall) + m.adversarialMissed) / (m.requiredTotal + m.adversarialTotal);
    expect(m.overallMissRate).toBeCloseTo(esperado, 10);
    expect(m.overallMissRate).toBeGreaterThan(0);
  });
  it('publicFalsePositiveRate: bajo el tope, y todo falso positivo es de la etapa E (fail-closed), nunca de A/B', () => {
    expect(m.publicFalsePositiveRate).toBeLessThanOrEqual(TOPE_PUBLIC_FALSE_POSITIVE_RATE);
    expect(m.publicTotal).toBeGreaterThanOrEqual(50);
    for (const e of etapasDeFalsosPositivos(golden)) expect(e).toBe('E');
  });
  it('ninguna de las tres métricas se informa como «100 % de privacidad»', () => {
    expect(m.residualMissRate).toBeGreaterThan(0);
  });
});
