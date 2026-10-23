/**
 * G6-C — privacidad, ronda 2. Seis métricas SEPARADAS más tres conjuntos de retención. Nada de esto es «100 % de privacy recall»:
 * requiredRecall solo mide los formatos canónicos exigidos, y el holdout 3 (escrito después de cerrar las reglas, sin ajustar el gate)
 * conserva falsos negativos.
 */
import { describe, expect, it } from 'vitest';
import { ENTIDADES_PUBLICAS, enmascararEntidadesPublicas } from '@/lib/ai-gateway/shadow/entidades-publicas';
import { NOMBRES_INEQUIVOCOS } from '@/lib/ai-gateway/shadow/nombres-inequivocos';
import { privacyGate } from '@/lib/ai-gateway/shadow/privacy-gate';
import { GOLDEN_G1 } from './golden/gateway-g1-casos';
import {
  GRUPOS_DOCUMENTO, HOLDOUT2_PRIVADOS, generarPrivadosG6, generarPublicosG6, medirG6, medirHoldout, medirHoldout2, medirHoldout3,
} from './privacy/benchmark-g6';

const m = medirG6(GOLDEN_G1.map((c) => c.input.sanitizedQuestion));
const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

describe('G6-C benchmark ronda 2 (conjunto ajustado: sirve de línea base de regresión, NO como estimación)', () => {
  it('es amplio y cubre todos los grupos pedidos', () => {
    expect(generarPrivadosG6().length).toBeGreaterThanOrEqual(500);
    expect(m.privateTotal).toBeGreaterThanOrEqual(700);
    expect(Object.keys(m.missPorGrupo)).toEqual(expect.arrayContaining([
      'NOMBRE_HN_FUERA_DICCIONARIO', 'NOMBRE_CENTROAMERICANO', 'NOMBRE_EXTRANJERO', 'NOMBRE_INDIGENA', 'NOMBRE_POCO_FRECUENTE', 'NOMBRE_MINUSCULA',
      'NOMBRE_MAYUSCULA', 'ERROR_ORTOGRAFICO', 'INICIALES', 'NOMBRE_COMPUESTO', 'APELLIDO_DOBLE', 'CONECTORES', 'NOMBRE_EN_PREGUNTA_JURIDICA',
      'DEMANDA', 'CONTRATO', 'ESCRITURA', 'SENTENCIA', 'EXPEDIENTE', 'PROTOCOLO', 'INSTRUMENTO', 'FOLIO_TOMO', 'DIRECCION', 'DNI', 'RTN', 'PASAPORTE',
      'TELEFONO', 'EMAIL', 'CUENTA', 'ID_OFUSCADO', 'NUMERO_EN_PALABRAS',
    ]));
  });
  it('requiredRecall: formatos canónicos exigidos (no es un recall de privacidad)', () => {
    expect(m.requiredRecall).toBe(1);
    expect(m.requiredTotal).toBeGreaterThanOrEqual(90);
  });
  it('residualMissRate y overallMissRate: sobre TODO el conjunto adversarial / privado, con tope de regresión', () => {
    expect(m.residualMissRate).toBe(m.adversarialMissed / m.adversarialTotal);
    expect(m.overallMissRate).toBe(m.privateMissed / m.privateTotal);
    expect(m.residualMissRate).toBeLessThanOrEqual(0.02);
    expect(m.overallMissRate).toBeLessThanOrEqual(0.02);
  });
  it('privateDocumentRecall: documentos privados disfrazados de consulta', () => {
    const docs = generarPrivadosG6().filter((c) => GRUPOS_DOCUMENTO.includes(c.grupo));
    expect(m.privateDocumentTotal).toBe(docs.length);
    expect(m.privateDocumentRecall).toBeGreaterThanOrEqual(0.98);
  });
  it('publicFalsePositiveRate y publicNamedEntityFalsePositiveRate se miden POR SEPARADO', () => {
    expect(m.publicPlainTotal).toBeGreaterThanOrEqual(80);
    expect(m.publicNamedTotal).toBeGreaterThanOrEqual(40);
    expect(m.publicFalsePositiveRate).toBe(m.publicPlainRejected / m.publicPlainTotal);
    expect(m.publicNamedEntityFalsePositiveRate).toBe(m.publicNamedRejected / m.publicNamedTotal);
    expect(m.publicFalsePositiveRate).toBeLessThanOrEqual(0.03);
    expect(m.publicNamedEntityFalsePositiveRate).toBeLessThanOrEqual(0.05);
  });
  it('las consultas públicas incluyen funcionarios (por cargo), jueces, autores, juristas, instituciones, empresas, casos y legislación', () => {
    const subtipos = new Set(generarPublicosG6().filter((p) => p.tipo === 'ENTIDAD_PUBLICA').map((p) => p.subtipo));
    for (const s of ['INSTITUCION', 'EMPRESA', 'AUTOR_JURISTA', 'CASO_PUBLICO', 'LEGISLACION_CON_NOMBRE', 'FUNCIONARIO_O_JUEZ_POR_CARGO']) expect(subtipos.has(s), s).toBe(true);
  });
  it('todo falso positivo sobre consultas públicas sin nombres es de la etapa E (fail-closed), nunca A/B', () => {
    for (const e of m.etapasFalsosPositivos) expect(e).toBe('E');
  });
});

describe('G6-C retención: estimación HONESTA de generalización (no se ajusta el gate contra ella)', () => {
  const h1 = medirHoldout();
  const h2 = medirHoldout2();
  const h3 = medirHoldout3();
  it('holdout 3 (final) conserva falsos negativos reales y falsos positivos con nombres públicos nuevos', () => {
    expect(h3.holdout3PrivateTotal).toBeGreaterThanOrEqual(35);
    expect(h3.holdout3PrivateMissed).toBeGreaterThan(0);
    expect(h3.holdout3NamedFalsePositiveRate).toBeGreaterThan(0.5);
  });
  it('holdout 3: tope de regresión (si sube, el gate empeoró; si baja, actualizar el informe, no el tope a la baja sin explicar)', () => {
    expect(h3.holdout3PrivateMissRate).toBeLessThanOrEqual(0.2);
    expect(h3.holdout3PublicFalsePositiveRate).toBeLessThanOrEqual(0.1);
  });
  it('holdout 1 y 2 fueron inspeccionados al ajustar las reglas: sus cifras NO son una estimación independiente', () => {
    expect(h1.holdoutPrivateTotal).toBeGreaterThan(0);
    expect(h2.holdout2PrivateTotal).toBe(HOLDOUT2_PRIVADOS.length);
    expect(h2.holdout2PrivateMissRate).toBeLessThanOrEqual(0.1);
  });
});

describe('G6-C reglas nuevas', () => {
  const rechaza = (t: string) => privacyGate(t).estado === 'REJECT';
  it('nombre de pila inequívoco en minúscula, con o sin tildes', () => {
    expect(rechaza('¿Qué plazo tiene xiomara para apelar según el Código Procesal Penal?')).toBe(true);
    expect(rechaza('¿Qué plazo tiene Xiomara para apelar según el Código Procesal Penal?')).toBe(true);
  });
  it('tratamiento seguido de un nombre en minúscula; los cargos y roles no cuentan', () => {
    expect(rechaza('el señor tomás aguilera fue notificado, ¿es válida la notificación según el Código Procesal Civil?')).toBe(true);
    expect(rechaza('¿Qué facultades tiene el señor juez en la audiencia inicial según el Código Procesal Penal?')).toBe(false);
    expect(rechaza('¿Qué debe hacer el señor notario si falta un testigo según la Ley del Notariado?')).toBe(false);
  });
  it('«de + apellido» inequívoco; un apellido que también es palabra común no activa la regla', () => {
    expect(rechaza('sobre el caso de turcios, ¿qué dice el Código Procesal Penal?')).toBe(true);
    expect(rechaza('¿Cuáles son las fuentes del derecho de reyes según el Código Civil?')).toBe(false);
  });
  it('relato personal en primera persona sobre bienes, empleo o deudas', () => {
    expect(rechaza('el banco me embargó el salario, ¿qué porcentaje es embargable según el Código de Trabajo?')).toBe(true);
    expect(rechaza('mi empleador no me paga, ¿qué dice el Código de Trabajo?')).toBe(true);
  });
  it('consulta que empieza por una palabra que no es interrogativa, función ni vocabulario jurídico', () => {
    expect(privacyGate('aceituno vendió un lote, ¿qué dice el Código Civil sobre la compraventa?')).toMatchObject({ estado: 'REJECT', razon: 'NOMBRE_AL_INICIO' });
    expect(rechaza('¿Sigue vigente el Decreto 57-2020?')).toBe(false);
  });
  it('identificadores ofuscados nuevos', () => {
    for (const t of [
      'escríbame a abogado en gmail punto com sobre el artículo 173',
      'mi correo ju4n.p3rez(arroba)hotmail(punto)com sobre el Código Civil',
      'identidad 0801-1990-1**** consulta sobre el artículo 173',
    ]) expect(rechaza(t), t).toBe(true);
  });
  it('el registro de entidades públicas NO esconde un dato personal: los identificadores se evalúan antes del enmascarado', () => {
    expect(rechaza('¿Qué sostiene Hans Kelsen? Llámeme al 9876-5432 por el artículo 173')).toBe(true);
    expect(rechaza('Marbury contra Madison, mi correo es juan@example.com, ¿qué dice el artículo 173?')).toBe(true);
    expect(enmascararEntidadesPublicas('Hans Kelsen y Eduardo Couture')).not.toMatch(/kelsen|couture/i);
  });
  it('un apellido suelto del registro no activa el enmascarado: solo la frase completa', () => {
    expect(enmascararEntidadesPublicas('consulta de kelsen')).toContain('kelsen');
  });
});

describe('G6-C higiene de los registros', () => {
  it('ningún nombre de persona privada de los benchmarks está en el registro de entidades públicas', () => {
    const publicos = ENTIDADES_PUBLICAS.map(norm).join(' | ');
    const privados = [...generarPrivadosG6().map((c) => c.texto), ...HOLDOUT2_PRIVADOS];
    for (const frase of ['xiomara betancourth', 'wilmer zelaya', 'suyapa escoto', 'zacarias quiroz', 'odalis cacho', 'ixchel tzul', 'wenceslao maldonado']) {
      expect(publicos, frase).not.toContain(frase);
    }
    expect(privados.length).toBeGreaterThan(0);
  });
  it('los nombres de pila inequívocos excluyen palabras comunes del español jurídico', () => {
    for (const comun of ['amparo', 'mercedes', 'concepcion', 'transito', 'inocente', 'marina', 'julio', 'abril', 'domingo', 'segundo', 'maximo', 'cesar', 'marco', 'justo', 'rosa', 'luz', 'paz', 'reina', 'salvador', 'tomas']) {
      expect(NOMBRES_INEQUIVOCOS.has(comun), comun).toBe(false);
    }
    expect(NOMBRES_INEQUIVOCOS.size).toBeGreaterThan(500);
  });
  it('las preguntas del Golden Set siguen pasando el gate', () => {
    for (const c of GOLDEN_G1) expect(privacyGate(c.input.sanitizedQuestion).estado, c.id).toBe('PASS');
  });
});
