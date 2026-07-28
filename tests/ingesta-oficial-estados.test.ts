import { describe, it, expect } from 'vitest';
import {
  MaquinaEstadosCorpus,
  disponibleParaRespuestasProfesionales,
  requiereAdvertencia,
  disponibleParaBetaProfesional,
  disponibleParaProduccionGeneral,
} from '@/lib/ingesta-oficial/estados';

describe('reglas de disponibilidad por estado', () => {
  it('V0-V2 no disponibles para respuestas profesionales', () => {
    expect(disponibleParaRespuestasProfesionales('V0')).toBe(false);
    expect(disponibleParaRespuestasProfesionales('V1')).toBe(false);
    expect(disponibleParaRespuestasProfesionales('V2')).toBe(false);
  });
  it('V3 disponible solo con advertencia', () => {
    expect(disponibleParaRespuestasProfesionales('V3')).toBe(false);
    expect(requiereAdvertencia('V3')).toBe(true);
  });
  it('V4 disponible para beta profesional', () => {
    expect(disponibleParaBetaProfesional('V4')).toBe(true);
    expect(disponibleParaProduccionGeneral('V4')).toBe(false);
  });
  it('V5 disponible para producción general', () => {
    expect(disponibleParaProduccionGeneral('V5')).toBe(true);
  });
});

describe('MaquinaEstadosCorpus — transiciones normales', () => {
  it('permite avanzar un nivel a la vez con cualquier rol', () => {
    const maquina = new MaquinaEstadosCorpus();
    const r = maquina.promover('HN-DEMO-1', 'V0', 'V1', { identificador: 'sistema', rol: 'pipeline_automatico' });
    expect(r.resultado).toBe('aprobado');
  });

  it('rechaza saltar estados (V0 -> V3 directo)', () => {
    const maquina = new MaquinaEstadosCorpus();
    const r = maquina.promover('HN-DEMO-1', 'V0', 'V3', { identificador: 'sistema', rol: 'pipeline_automatico' });
    expect(r.resultado).toBe('rechazado');
    expect(r.motivo).toMatch(/no se puede saltar/);
  });

  it('rechaza retroceder de estado', () => {
    const maquina = new MaquinaEstadosCorpus();
    const r = maquina.promover('HN-DEMO-1', 'V2', 'V1', { identificador: 'sistema', rol: 'pipeline_automatico' });
    expect(r.resultado).toBe('rechazado');
    expect(r.motivo).toMatch(/no es un avance/);
  });
});

describe('MaquinaEstadosCorpus — transiciones restringidas V3→V4 y V4→V5', () => {
  it('rechaza V3->V4 si el actor no tiene rol autorizado', () => {
    const maquina = new MaquinaEstadosCorpus();
    const r = maquina.promover('HN-DEMO-1', 'V3', 'V4', { identificador: 'bot', rol: 'pipeline_automatico' });
    expect(r.resultado).toBe('rechazado');
    expect(r.motivo).toMatch(/rol autorizado/);
  });

  it('aprueba V3->V4 con rol autorizado (abogado_revisor_senior)', () => {
    const maquina = new MaquinaEstadosCorpus();
    const r = maquina.promover('HN-DEMO-1', 'V3', 'V4', { identificador: 'abogada-1', rol: 'abogado_revisor_senior' });
    expect(r.resultado).toBe('aprobado');
  });

  it('rechaza V4->V5 sin rol autorizado', () => {
    const maquina = new MaquinaEstadosCorpus();
    const r = maquina.promover('HN-DEMO-1', 'V4', 'V5', { identificador: 'bot', rol: 'pipeline_automatico' });
    expect(r.resultado).toBe('rechazado');
  });

  it('aprueba V4->V5 con rol autorizado (propietario_despacho)', () => {
    const maquina = new MaquinaEstadosCorpus();
    const r = maquina.promover('HN-DEMO-1', 'V4', 'V5', { identificador: 'don-fredy', rol: 'propietario_despacho' });
    expect(r.resultado).toBe('aprobado');
  });
});

describe('MaquinaEstadosCorpus — auditoría', () => {
  it('toda promoción, aprobada o rechazada, queda registrada', () => {
    const maquina = new MaquinaEstadosCorpus();
    maquina.promover('HN-DEMO-1', 'V0', 'V1', { identificador: 'a', rol: 'x' });
    maquina.promover('HN-DEMO-1', 'V3', 'V4', { identificador: 'b', rol: 'no_autorizado' });
    maquina.promover('HN-DEMO-1', 'V3', 'V4', { identificador: 'c', rol: 'abogado_revisor_senior' });

    const auditoria = maquina.obtenerAuditoria();
    expect(auditoria).toHaveLength(3);
    expect(auditoria[0].resultado).toBe('aprobado');
    expect(auditoria[1].resultado).toBe('rechazado');
    expect(auditoria[2].resultado).toBe('aprobado');
    expect(auditoria.every((r) => typeof r.timestamp === 'string' && r.timestamp.length > 0)).toBe(true);
  });
});
