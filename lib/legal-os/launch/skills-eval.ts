/**
 * lib/legal-os/launch/skills-eval.ts
 * Evaluación de las skills de lanzamiento EN SOMBRA (pipeline con proveedor simulado y recuperador sintético). Mide, por skill:
 *   1. selección: ¿una pregunta representativa del tema la elige?
 *   2. evidencia cumplida: con evidencia del instrumento exigido, ¿se cumplen sus requisitos?
 *   3. abstención: con evidencia de OTRO instrumento, ¿se abstiene el pipeline?
 * Las preguntas son TEMÁTICAS y no afirman contenido jurídico; la evidencia es sintética. Esto mide el cableado de las skills (selección y
 * requisitos de evidencia), NO la corrección jurídica ni la cobertura del corpus real.
 */
import { ejecutarPipeline, type ChunkEvidencia } from '../pipeline';
import { crearProveedorFalso } from '../providers/provider';
import { todasLasSkillsDeLanzamiento } from '../skills/seeds-lanzamiento';

/** Pregunta temática representativa por skill. Sin números de artículo reales ni afirmaciones jurídicas. */
export const PREGUNTAS_SKILL: Readonly<Record<string, string>> = Object.freeze({
  'HN.CIVIL.CONTRACTS.SALE': '¿Qué regula el Código Civil sobre la compraventa?',
  'HN.PENAL.CRIMES.FRAUD': '¿Cómo regula el Código Penal el delito de fraude?',
  'HN.NOTARIAL.PUBLIC_DEED': 'Redacta un borrador de escritura pública conforme al Código del Notariado.',
  'HN.COMMERCIAL.NEGOTIABLE_INSTRUMENTS': '¿Qué regula el Código de Comercio sobre la letra de cambio?',
  'HN.FAMILY.DIVORCE': '¿Qué regula el Código de Familia sobre el divorcio?',
  'HN.LABOR.TERMINATION': '¿Qué regula el Código del Trabajo sobre el despido?',
  'HN.ADMINISTRATIVE.APPEAL': '¿Cómo se presenta un recurso de apelación en materia administrativa?',
  'HN.CONSTITUTIONAL.ARTICLE_LOOKUP': '¿Qué dice el artículo 5 de la Constitución de la República?',
  'HN.CIVIL.CONTRACTS': '¿Qué regula el Código Civil sobre las obligaciones y los contratos?',
  'HN.CIVIL.PROPERTY': '¿Qué regula el Código Civil sobre la posesión y la propiedad de un inmueble?',
  'HN.CIVIL.SUCCESSION': '¿Qué regula el Código Civil sobre la herencia y la sucesión?',
  'HN.PROCEDURAL_CIVIL.CLAIM': '¿Cómo regula el Código Procesal Civil la demanda?',
  'HN.PENAL.ARTICLE_LOOKUP': '¿Qué dice el artículo 10 del Código Penal?',
  'HN.PENAL.OFFENSE_ANALYSIS': 'Analiza la tipicidad y las agravantes de un delito según el Código Penal.',
  'HN.PROCEDURAL_PENAL': '¿Qué regula el Código Procesal Penal sobre las medidas cautelares en el proceso penal?',
  'HN.COMMERCIAL.CONTRACTS': '¿Qué regula el Código de Comercio sobre los contratos mercantiles?',
  'HN.FAMILY.CHILDREN': '¿Qué regula el Código de Familia sobre la custodia y los alimentos de los menores?',
  'HN.TAX.ARTICLE_LOOKUP': '¿Qué dice el artículo 20 del Código Tributario?',
  'HN.AML.COMPLIANCE': '¿Qué exige la debida diligencia para la prevención del lavado de activos?',
});

export type EstadoSkill = 'OK' | 'NO_SELECCIONADA' | 'EVIDENCIA_NO_CUMPLIDA' | 'NO_SE_ABSTIENE' | 'SIN_INSTRUMENTO_EXIGIDO';

export interface FilaSkill {
  skill_id: string;
  pregunta: string;
  instrumentos_exigidos: string[];
  seleccionada_como: string | null;
  seleccionada: boolean;
  evidencia_cumplida: boolean | null;
  /** null cuando la skill no exige instrumento (no hay evidencia «equivocada» que probar). */
  abstiene_con_evidencia_ajena: boolean | null;
  motivo_abstencion_ajena: string | null;
  estado: EstadoSkill;
}

export interface ResumenSkills {
  total: number;
  seleccionadas: number;
  evidencia_cumplida: number;
  con_instrumento_exigido: number;
  abstienen_con_evidencia_ajena: number;
  ok: number;
  sin_instrumento_exigido: number;
}

const chunk = (instrumento: string): ChunkEvidencia => ({ id: `c-${instrumento}`, hash: 'abcd1234', instrumento, articulo: '1', decreto: null, texto: 'Texto sintético de evidencia para la evaluación de skills.', vigente: null });
const reloj = (() => { let t = 0; return () => ++t; })();

async function correr(pregunta: string, chunks: ChunkEvidencia[]) {
  return ejecutarPipeline(
    { queryId: 'skills-eval', pregunta, tier: 'PREMIUM' },
    {
      recuperar: async () => ({ chunks, calidad: 0.8, confianza: 0.8 }),
      proveedor: crearProveedorFalso((req) => ({ decision: 'ANSWER', claims: [{ claim_id: 's1', text: 'sim', citation_ids: [JSON.parse(req.input).fragmentos[0].id] }] }), { id: 'simulated' }),
      reloj, permitirSkillsBorrador: true,
    },
  );
}

export async function evaluarSkills(): Promise<{ filas: FilaSkill[]; resumen: ResumenSkills }> {
  const filas: FilaSkill[] = [];
  for (const s of todasLasSkillsDeLanzamiento()) {
    const pregunta = PREGUNTAS_SKILL[s.skill_id] ?? '';
    const exigidos = s.evidence_requirements?.required_instruments ?? [];
    const conEvidencia = await correr(pregunta, [chunk(exigidos[0] ?? 'INSTRUMENTO_GENERICO')]);
    const seleccionada = conEvidencia.skill_id === s.skill_id;
    const cumplida = conEvidencia.skillEvidencia ? conEvidencia.skillEvidencia.met : null;
    let abstiene: boolean | null = null;
    let motivo: string | null = null;
    if (exigidos.length > 0) {
      const ajena = await correr(pregunta, [chunk('INSTRUMENTO_AJENO')]);
      abstiene = ajena.decision === 'ABSTAIN';
      motivo = ajena.motivo;
    }
    const estado: EstadoSkill = !seleccionada ? 'NO_SELECCIONADA' : cumplida !== true ? 'EVIDENCIA_NO_CUMPLIDA' : exigidos.length === 0 ? 'SIN_INSTRUMENTO_EXIGIDO' : abstiene !== true ? 'NO_SE_ABSTIENE' : 'OK';
    filas.push({ skill_id: s.skill_id, pregunta, instrumentos_exigidos: exigidos, seleccionada_como: conEvidencia.skill_id, seleccionada, evidencia_cumplida: cumplida, abstiene_con_evidencia_ajena: abstiene, motivo_abstencion_ajena: motivo, estado });
  }
  filas.sort((a, b) => a.skill_id.localeCompare(b.skill_id));
  const resumen: ResumenSkills = {
    total: filas.length,
    seleccionadas: filas.filter((f) => f.seleccionada).length,
    evidencia_cumplida: filas.filter((f) => f.evidencia_cumplida === true).length,
    con_instrumento_exigido: filas.filter((f) => f.instrumentos_exigidos.length > 0).length,
    abstienen_con_evidencia_ajena: filas.filter((f) => f.abstiene_con_evidencia_ajena === true).length,
    ok: filas.filter((f) => f.estado === 'OK').length,
    sin_instrumento_exigido: filas.filter((f) => f.estado === 'SIN_INSTRUMENTO_EXIGIDO').length,
  };
  return { filas, resumen };
}
