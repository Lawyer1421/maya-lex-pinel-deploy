import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { evaluarSkills } from '../lib/legal-os/launch/skills-eval';
import { clasificarIntencion } from '../lib/legal-os/router/intent';

describe('evaluación de skills en sombra', () => {
  it('las 19 skills son elegidas por su pregunta temática y cumplen su evidencia', async () => {
    const { resumen } = await evaluarSkills();
    expect(resumen.total).toBe(19);
    expect(resumen.seleccionadas).toBe(19);
    expect(resumen.evidencia_cumplida).toBe(19);
  });
  it('toda skill con instrumento exigido se abstiene ante evidencia ajena', async () => {
    const { resumen, filas } = await evaluarSkills();
    expect(resumen.abstienen_con_evidencia_ajena).toBe(resumen.con_instrumento_exigido);
    expect(filas.filter((f) => f.estado !== 'OK' && f.estado !== 'SIN_INSTRUMENTO_EXIGIDO')).toEqual([]);
  });
  it('gana la skill más específica (compraventa sobre contratos civiles)', async () => {
    const { filas } = await evaluarSkills();
    expect(filas.find((f) => f.skill_id === 'HN.CIVIL.CONTRACTS.SALE')?.seleccionada_como).toBe('HN.CIVIL.CONTRACTS.SALE');
    expect(filas.find((f) => f.skill_id === 'HN.CIVIL.CONTRACTS')?.seleccionada_como).toBe('HN.CIVIL.CONTRACTS');
  });
  it('«contratos mercantiles» se clasifica como comercial, no civil', () => {
    expect(clasificarIntencion('¿Qué regula el Código de Comercio sobre los contratos mercantiles?').matter).toBe('comercial');
  });
  it('el scorecard versionado coincide con el regenerado', async () => {
    const j = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'docs/launch/LAUNCH_SCORECARD.json'), 'utf8'));
    const { resumen } = await evaluarSkills();
    expect(j.skills.resumen).toEqual(resumen);
  });
});
