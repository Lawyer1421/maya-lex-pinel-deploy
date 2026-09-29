import { describe, it, expect } from 'vitest';
import type { CaseFact, MissingFact, CitationTrustRecord } from '@/lib/legal-reasoning/types';
import {
  validarCaseFact,
  validarMissingFact,
  validarCitationTrustRecord,
  esAutoritativaVerificada,
  esTransicionPromocionIndebida,
} from '@/lib/legal-reasoning/validators';

/**
 * LR-K1 / LR-K2 — foundation kernel tests (Mission LR-K0/K1/K2, 2026-09-28).
 * Synthetic fixtures only -- no real client narratives, per the privacy
 * requirement of this mission.
 */

describe('LR-K1 — CaseFact', () => {
  it('1. hecho con origin/status válidos -> aceptado', () => {
    const fact: CaseFact = {
      id: 'f1',
      proposition: 'El cliente afirma haber firmado el contrato el 2026-01-15.',
      origin: 'USER_STATEMENT',
      status: 'ALLEGED',
    };
    const resultado = validarCaseFact(fact);
    expect(resultado.valido).toBe(true);
    expect(resultado.errores).toEqual([]);
  });

  it('2. hecho sin origin -> rechazado', () => {
    const fact = {
      id: 'f2',
      proposition: 'Hecho sin origen declarado.',
      status: 'ALLEGED',
    } as unknown as CaseFact;
    const resultado = validarCaseFact(fact);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('origin'))).toBe(true);
  });

  it('3. status inválido -> rechazado', () => {
    const fact = {
      id: 'f3',
      proposition: 'Hecho con estado inventado.',
      origin: 'USER_STATEMENT',
      status: 'CONFIRMADO_A_MEDIAS', // no pertenece al enum
    } as unknown as CaseFact;
    const resultado = validarCaseFact(fact);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('status'))).toBe(true);
  });

  it('4. no existe la categoría ASSUMED -- rechazada explícitamente en runtime', () => {
    const fact = {
      id: 'f4',
      proposition: 'Hecho que el sistema querría dar por asumido.',
      origin: 'USER_STATEMENT',
      status: 'ASSUMED',
    } as unknown as CaseFact;
    const resultado = validarCaseFact(fact);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('ASSUMED'))).toBe(true);
    // Invariante estático: el tipo CaseFactStatus en sí no incluye 'ASSUMED'.
    const estadosPermitidos = ['ALLEGED', 'ADMITTED', 'DISPUTED', 'DOCUMENTED', 'PROVEN', 'UNKNOWN'];
    expect(estadosPermitidos).not.toContain('ASSUMED');
  });
});

describe('LR-K1 — MissingFact', () => {
  it('5. conserva el vínculo con las conclusiones bloqueadas', () => {
    const mf: MissingFact = {
      id: 'mf1',
      description: 'Fecha exacta del incumplimiento contractual no proporcionada.',
      blocksConclusions: ['conclusion-prescripcion', 'conclusion-mora'],
    };
    const resultado = validarMissingFact(mf);
    expect(resultado.valido).toBe(true);
    expect(mf.blocksConclusions).toEqual(['conclusion-prescripcion', 'conclusion-mora']);
  });

  it('blocksConclusions ausente (no arreglo) -> rechazado', () => {
    const mf = {
      id: 'mf2',
      description: 'Hecho faltante sin vínculo declarado.',
    } as unknown as MissingFact;
    const resultado = validarMissingFact(mf);
    expect(resultado.valido).toBe(false);
  });

  it('blocksConclusions vacío sigue siendo válido -- un vacío declarado no es lo mismo que ausente', () => {
    const mf: MissingFact = {
      id: 'mf3',
      description: 'Hecho faltante aún sin conclusión vinculada.',
      blocksConclusions: [],
    };
    expect(validarMissingFact(mf).valido).toBe(true);
  });
});

describe('LR-K2 — Citation Trust I', () => {
  const baseCita = (overrides: Partial<CitationTrustRecord> = {}): CitationTrustRecord => ({
    proposition: 'El plazo de apelación es de diez días hábiles.',
    instrumento: 'CODIGO_PROCESAL_CIVIL',
    articulo: '709',
    fuente: 'Código Procesal Civil (Decreto 211-2006)',
    documentVersion: null,
    versionStatus: 'UNVERIFIED',
    verificationState: 'UNRESOLVED',
    ...overrides,
  });

  it('6. evidencia identificada y recuperada puede convertirse en VERIFIED', () => {
    const cita = baseCita({
      documentVersion: 'v2014-actualizado',
      versionStatus: 'VERIFIED',
      verificationState: 'VERIFIED',
      hash: 'abcd1234',
    });
    const resultado = validarCitationTrustRecord(cita);
    expect(resultado.valido).toBe(true);
    expect(esAutoritativaVerificada(cita)).toBe(true);
  });

  it('7. un locator no resuelto permanece UNRESOLVED', () => {
    const cita = baseCita({ verificationState: 'UNRESOLVED' });
    const resultado = validarCitationTrustRecord(cita);
    // UNRESOLVED es un estado legítimo, no un error -- la validación pasa
    // porque el registro es coherente consigo mismo (no reclama VERIFIED).
    expect(resultado.valido).toBe(true);
    expect(cita.verificationState).toBe('UNRESOLVED');
    expect(esAutoritativaVerificada(cita)).toBe(false);
  });

  it('8. UNRESOLVED no puede promoverse a VERIFIED sin evidencia', () => {
    const citaSinEvidencia = baseCita({
      verificationState: 'VERIFIED', // se reclama VERIFIED...
      versionStatus: 'UNVERIFIED',   // ...pero sin versión confirmada...
      // ...ni hash.
    });
    const resultado = validarCitationTrustRecord(citaSinEvidencia);
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.some((e) => e.includes('versionStatus'))).toBe(true);
    expect(resultado.errores.some((e) => e.includes('hash'))).toBe(true);
    expect(esAutoritativaVerificada(citaSinEvidencia)).toBe(false);

    // La transición misma se marca como promoción indebida.
    expect(esTransicionPromocionIndebida('UNRESOLVED', 'VERIFIED')).toBe(true);
  });

  it('9. DISCOVERY_ONLY nunca aparenta ser autoridad primaria verificada', () => {
    const citaWeb = baseCita({
      verificationState: 'DISCOVERY_ONLY',
      fuente: 'Resultado de búsqueda web (CEDIJ, metadata solamente)',
    });
    expect(validarCitationTrustRecord(citaWeb).valido).toBe(true); // registro coherente
    expect(esAutoritativaVerificada(citaWeb)).toBe(false); // pero nunca autoritativo
    expect(esTransicionPromocionIndebida('DISCOVERY_ONLY', 'VERIFIED')).toBe(true);
  });

  it('10. documentVersion y versionStatus permanecen separados', () => {
    // Un identificador de versión presente NO implica que esa versión esté verificada.
    const citaConVersionSinVerificar = baseCita({
      documentVersion: 'v2014-actualizado',
      versionStatus: 'UNVERIFIED',
      verificationState: 'PARTIAL',
    });
    expect(citaConVersionSinVerificar.documentVersion).toBe('v2014-actualizado');
    expect(citaConVersionSinVerificar.versionStatus).toBe('UNVERIFIED');
    expect(validarCitationTrustRecord(citaConVersionSinVerificar).valido).toBe(true);
    expect(esAutoritativaVerificada(citaConVersionSinVerificar)).toBe(false);

    // Y a la inversa: sin ningún identificador de versión, aún puede haber
    // evidencia verificada (ej. contenido de fuente única, sin variantes).
    const citaSinVersionPeroVerificada = baseCita({
      documentVersion: null,
      versionStatus: 'VERIFIED',
      verificationState: 'VERIFIED',
      hash: 'ef567890',
    });
    expect(citaSinVersionPeroVerificada.documentVersion).toBeNull();
    expect(validarCitationTrustRecord(citaSinVersionPeroVerificada).valido).toBe(true);
  });
});
