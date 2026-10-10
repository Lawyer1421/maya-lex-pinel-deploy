import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { cargarSnapshot, SHA256_ARTEFACTO, FALSOS_CA01_CODIGO, sha256Normalizado } from './snapshot';
import { PREGUNTAS_V1, resolverOro } from './gold';
import { ejecutarPregunta, seleccionarPoliticaSimulada, seleccionCongelada } from './variants';
import { NOMBRE_PROXY, puntuarProxy } from './proxy';
import {
  reciprocalRank, articuloHitEn, instrumentoHitEn, metricasDe, mrrDe, clasificarFallo, primaryPassEn,
  type ItemEvidencia, type ResultadoPregunta, type ContextoFallo,
} from './metrics';
import { ejecutarModo } from './run';
import { recuperarLab } from '@/lib/legal-retrieval/lab/pipeline';
import { evaluarSuficiencia } from '@/lib/legal-retrieval/lab/sufficiency';

const CA01 = cargarSnapshot('CA01');
const ORO = resolverOro(PREGUNTAS_V1, CA01.filas);
const IDS = new Set(CA01.filas.map((f) => f.id));

describe('snapshot compartido', () => {
  it('el artefacto coincide con el sha256 fijado', () => {
    expect(CA01.sha256).toBe(SHA256_ARTEFACTO);
  });

  it('todas las variantes usan el mismo snapshot: sus ids pertenecen a él', () => {
    for (const p of ORO.slice(0, 20)) {
      const r = ejecutarPregunta(p, CA01.filas, { k: 5 });
      for (const v of [r.A, r.B, r.C]) {
        for (const id of v.pool) expect(IDS.has(id)).toBe(true);
        for (const it of v.items) expect(IDS.has(it.id)).toBe(true);
      }
    }
  });

  it('el snapshot no contiene fuente nula ni capa doc_*', () => {
    expect(CA01.filas.some((f) => f.fuente === null)).toBe(false);
    expect(CA01.filas.some((f) => (f.fuente ?? '').startsWith('doc_'))).toBe(false);
  });

  it('en modo CA01 los artículos 11, 27, 72, 73, 84, 87 y 93 del Código son falsos; el resto vigente', () => {
    const codigo = CA01.filas.filter((f) => f.instrumento === 'CODIGO_NOTARIADO');
    for (const f of codigo) {
      const falso = (FALSOS_CA01_CODIGO as readonly string[]).includes(f.num_articulo!);
      expect(f.es_norma_vigente).toBe(!falso);
    }
    const reglamento = CA01.filas.filter((f) => f.instrumento === 'REGLAMENTO_NOTARIADO');
    expect(reglamento.every((f) => f.es_norma_vigente === null)).toBe(true);
  });

  it('el modo DECLARADO no adjudica vigencia: todas las filas quedan en null', () => {
    const d = cargarSnapshot('DECLARADO');
    expect(d.filas.every((f) => f.es_norma_vigente === null)).toBe(true);
    expect(d.sha256).toBe(CA01.sha256);
  });
});

describe('oro determinista y sin fabricación', () => {
  it('la resolución del oro es idéntica en dos ejecuciones', () => {
    expect(JSON.stringify(resolverOro(PREGUNTAS_V1, CA01.filas))).toBe(JSON.stringify(ORO));
  });

  it('los ids de las preguntas son únicos y las categorías tienen los tamaños previstos', () => {
    const ids = PREGUNTAS_V1.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    const cuenta = (c: string) => PREGUNTAS_V1.filter((p) => p.categoria === c).length;
    expect([cuenta('A_EXACTA'), cuenta('B_CONCEPTUAL'), cuenta('C_MULTI_REMISION_EXCEPCION'), cuenta('D_ADVERSARIAL'), cuenta('E_EVIDENCIA_INSUFICIENTE'), cuenta('F_HISTORICA_VIGENCIA_ROL')])
      .toEqual([10, 10, 10, 10, 7, 6]);
  });

  it('cada id aceptable existe en el snapshot; los casos sin fuente no inventan oro', () => {
    for (const p of ORO) {
      for (const id of p.acceptable_source_ids) expect(IDS.has(id)).toBe(true);
      if (p.expected_instrument === 'NONE_IN_SNAPSHOT') {
        expect(p.acceptable_source_ids).toHaveLength(0);
        expect(p.legal_validation_status).toBe('GOLD_SOURCE_INSUFFICIENT');
      }
    }
  });

  it('ninguna pregunta usa E2/E5/E6 como PRIMARY requerido en el oro', () => {
    for (const p of ORO) {
      if (p.id.startsWith('F02') || p.id.startsWith('F04')) expect(p.expected_primary_required).toBe(false);
    }
  });

  it('ninguna pregunta de oro legal está marcada como legal_gold', () => {
    expect(ORO.every((p) => p.legal_gold === false)).toBe(true);
  });
});

describe('métricas de ranking', () => {
  const it_ = (id: string, instrumento: ItemEvidencia['instrumento'], num: string): ItemEvidencia => ({
    id, instrumento, num_articulo: num, hash: id, rol: 'PRIMARY', relevancia: 'PASS',
  });

  it('reciprocal rank: 1/posición del primer acierto, 0 si no hay', () => {
    const items = [it_('a', 'CODIGO_NOTARIADO', '1'), it_('b', 'CODIGO_NOTARIADO', '2'), it_('c', 'CODIGO_NOTARIADO', '3')];
    expect(reciprocalRank(items, ['a'])).toBe(1);
    expect(reciprocalRank(items, ['b'])).toBe(0.5);
    expect(reciprocalRank(items, ['c'])).toBeCloseTo(1 / 3, 10);
    expect(reciprocalRank(items, ['z'])).toBe(0);
  });

  it('acierto de instrumento y de artículo distinguen el instrumento', () => {
    const items = [it_('r', 'REGLAMENTO_NOTARIADO', '6'), it_('c', 'CODIGO_NOTARIADO', '6')];
    expect(instrumentoHitEn(items, 'CODIGO_NOTARIADO', 1)).toBe(false);
    expect(instrumentoHitEn(items, 'CODIGO_NOTARIADO', 2)).toBe(true);
    expect(articuloHitEn(items, 'CODIGO_NOTARIADO', ['6'], 1)).toBe(false);
    expect(articuloHitEn(items, 'CODIGO_NOTARIADO', ['6'], 2)).toBe(true);
  });

  it('la métrica de fuga de fuente prohibida cuenta los ids prohibidos presentes', () => {
    const p = { ...ORO[0], forbidden_source_ids: ['x'] };
    const res: ResultadoPregunta = {
      pregunta: p, variante: 'B_HIBRIDA_RAW', items: [it_('x', 'CODIGO_NOTARIADO', '1'), it_('y', 'CODIGO_NOTARIADO', '2')],
      pool: [], latenciaMs: {}, tiempoTotalMs: 0,
    };
    expect(metricasDe([res], 'B_HIBRIDA_RAW').forbidden_source_leakage).toBe(1);
  });

  it('MRR agrega reciprocal ranks sobre preguntas evaluables', () => {
    const p = ORO.find((x) => x.acceptable_source_ids.length > 0)!;
    const r1: ResultadoPregunta = { pregunta: p, variante: 'C_HIBRIDA_PAQUETE', items: [], pool: [], latenciaMs: {}, tiempoTotalMs: 0 };
    const m = mrrDe([r1], 'C_HIBRIDA_PAQUETE');
    expect(m.total).toBe(1);
    expect(m.valor).toBe(0);
  });
});

describe('simulación de límite bruto', () => {
  it('objetivo fuera del pool no aumenta al ampliar el tope (monótono)', () => {
    const d = ejecutarModo('CA01');
    const s = d.sensibilidadLimite;
    expect(s[0].fueraDelPool).toBeGreaterThanOrEqual(s[1].fueraDelPool);
    expect(s[1].fueraDelPool).toBeGreaterThanOrEqual(s[2].fueraDelPool);
  });
});

describe('simulación de políticas X e Y', () => {
  it('X reproduce exactamente la selección congelada en todas las preguntas', () => {
    for (const p of ORO) {
      const r = ejecutarPregunta(p, CA01.filas, { k: 5 });
      void r;
      const res = recuperarLab({ id: p.id, categoria: 'adversarial_semantico_negativo', texto: p.pregunta, relevantes: p.acceptable_source_ids, distractores: [], abstencion_esperada: p.expected_abstention, semantic_hits: puntuarProxy(p.pregunta, CA01.filas), validacion: 'PENDIENTE_VALIDACION_JURIDICA' }, CA01.filas, { k: 5, modo: 'HYBRID' });
      const congelada = seleccionCongelada(res.rawRanking, 5).map((c) => `${c.id}:${c.uso_paquete}`).join('|');
      const X = seleccionarPoliticaSimulada(res.rawRanking, 5, 'X').map((c) => `${c.id}:${c.uso_paquete}`).join('|');
      expect(X).toBe(congelada);
    }
  });

  it('simular Y no muta la selección congelada', () => {
    const p = ORO.find((x) => x.id === 'C02')!;
    const res = recuperarLab({ id: p.id, categoria: 'adversarial_semantico_negativo', texto: p.pregunta, relevantes: p.acceptable_source_ids, distractores: [], abstencion_esperada: p.expected_abstention, semantic_hits: puntuarProxy(p.pregunta, CA01.filas), validacion: 'PENDIENTE_VALIDACION_JURIDICA' }, CA01.filas, { k: 5, modo: 'HYBRID' });
    const antes = JSON.stringify(seleccionCongelada(res.rawRanking, 5));
    seleccionarPoliticaSimulada(res.rawRanking, 5, 'Y');
    expect(JSON.stringify(seleccionCongelada(res.rawRanking, 5))).toBe(antes);
  });
});

describe('taxonomía de fallos', () => {
  it('la clasificación es determinista', () => {
    const p = ORO.find((x) => x.id === 'D06')!;
    const r = ejecutarPregunta(p, CA01.filas, { k: 5 });
    const ctx: ContextoFallo = r.ctx.C_HIBRIDA_PAQUETE;
    expect(clasificarFallo(r.C, ctx)).toBe(clasificarFallo(r.C, ctx));
    expect(clasificarFallo(r.C, ctx)).toBe('IDENTITY_MISS');
  });

  it('un fallo de abstención sobre un artículo presente se atribuye al gate, no a la recuperación', () => {
    const p = ORO.find((x) => x.id === 'B04')!;
    const r = ejecutarPregunta(p, CA01.filas, { k: 5 });
    expect(clasificarFallo(r.B, r.ctx.B_HIBRIDA_RAW)).toBe('RELEVANCE_UNKNOWN_GATE');
  });

  it('un caso sin fuente en el snapshot es fallo sólo si aparece un PRIMARY con relevancia PASS', () => {
    const p = ORO.find((x) => x.id === 'E01')!;
    const r = ejecutarPregunta(p, CA01.filas, { k: 5 });
    const hayPrimarioPass = r.C.items.some((i) => i.rol === 'PRIMARY' && i.relevancia === 'PASS');
    const esperado = hayPrimarioPass ? 'CORPUS_GAP' : null;
    expect(clasificarFallo(r.C, r.ctx.C_HIBRIDA_PAQUETE)).toBe(esperado);
  });
});

describe('casos de FALSE exacto', () => {
  it('F01–F04 (artículos falsos localizados por número) quedan CONTEXT y no PRIMARY', () => {
    const d = ejecutarModo('CA01');
    expect(d.exactoFalso.map((x) => x.id).sort()).toEqual(['F01', 'F02', 'F03', 'F04']);
    for (const x of d.exactoFalso) expect(x.resultadoC).toBe('CONTEXT/PASS');
  });

  it('ninguna unidad E2 aparece como PRIMARY en el paquete de C', () => {
    for (const p of ORO) {
      const r = ejecutarPregunta(p, CA01.filas, { k: 5 });
      for (const it of r.C.items) {
        const e2 = it.instrumento === 'CODIGO_NOTARIADO' && (['72', '73', '84', '87', '93'] as string[]).includes(it.num_articulo ?? '');
        if (e2) expect(it.rol).not.toBe('PRIMARY');
      }
    }
  });
});

describe('material de la capa de sombra y proxy', () => {
  it('el proxy se declara como no e5', () => {
    expect(NOMBRE_PROXY).toBe('CHAR3GRAM_TFIDF_LOCAL_NOT_E5');
  });

  it('el paquete de C nunca contiene relevancia FAIL', () => {
    for (const p of ORO) {
      const r = ejecutarPregunta(p, CA01.filas, { k: 5 });
      expect(r.C.items.some((i) => i.relevancia === 'FAIL')).toBe(false);
    }
  });

  it('los archivos congelados de la capa de sombra no cambian respecto a la base', () => {
    const sha = (f: string) => sha256Normalizado(readFileSync(join(process.cwd(), f)));
    expect(sha('lib/legal-retrieval/lab/evidence-selection.ts')).toBe('9c2c548a4958e5f37c7e30bf1abf11586c10f5f8145f3d208027286e61261835');
    expect(sha('lib/legal-retrieval/lab/shadow.ts')).toBe('5ec53c469bd46786c37315c73aab41d9ab274f5c36de93e3a99f709066198f47');
  });

  it('código de producción no importa el paquete de evaluación', () => {
    const raiz = join(process.cwd(), 'app');
    const archivos: string[] = [];
    const recorrer = (dir: string) => {
      for (const n of readdirSync(dir)) {
        const p = join(dir, n);
        if (statSync(p).isDirectory()) recorrer(p);
        else if (/\.(ts|tsx)$/.test(n)) archivos.push(p);
      }
    };
    recorrer(raiz);
    for (const a of archivos) expect(readFileSync(a, 'utf8')).not.toMatch(/retrieval-eval-v1|legal-retrieval\/lab/);
  });
});

describe('suficiencia sobre el paquete', () => {
  it('evaluar suficiencia sobre el paquete de C coincide con la de la pipeline', () => {
    const p = ORO.find((x) => x.id === 'A01')!;
    const res = recuperarLab({ id: p.id, categoria: 'adversarial_semantico_negativo', texto: p.pregunta, relevantes: p.acceptable_source_ids, distractores: [], abstencion_esperada: p.expected_abstention, semantic_hits: puntuarProxy(p.pregunta, CA01.filas), validacion: 'PENDIENTE_VALIDACION_JURIDICA' }, CA01.filas, { k: 5, modo: 'HYBRID' });
    expect(evaluarSuficiencia(res.ranking).veredicto).toBe(res.suficiencia.veredicto);
  });
});
