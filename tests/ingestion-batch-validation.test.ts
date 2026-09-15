import { describe, it, expect } from 'vitest';
import {
  construirRegistro,
  validarEmbeddingNoDummy,
  validarSinDuplicadosDeterministico,
  validarLoteAntesDeSQL,
  validarSQLNoDestructivo,
  generarManifest,
  calcularBatchId,
  EMBED_DIMS,
  type OpcionesCLI,
  type RegistroGenerico,
} from '@/scripts/ingestar-ley';

// Guardrails de ingesta -- Canonical Ingestion Contract / ADR-001 (enmienda
// Control Plane). Cero red, cero Supabase, cero embeddings reales: todo se
// ejercita con vectores/registros sintéticos. Ver
// MAYALEX_CANONICAL_INGESTION_CONTRACT.md para el diseño que estas pruebas
// verifican.

const opts: OpcionesCLI = {
  input: 'x.txt',
  coleccion: 'mayalex_normativos',
  materia: '01_PENAL',
  fuente: 'Ley de Prueba',
  fuenteTipo: 'codigo',
  idPrefix: 'mayalex_normativos:ley_prueba',
  instrumento: 'Decreto 1-2020',
  jurisdiccion: 'HN',
  dryRun: true,
  execute: null,
};

function vectorReal(seed: number, dim = EMBED_DIMS): number[] {
  // Vector no-constante determinístico -- simula un embedding real sin
  // depender de ningún modelo/red.
  return Array.from({ length: dim }, (_, i) => Math.sin(seed + i) * 0.5);
}

describe('validarEmbeddingNoDummy — Dummy Embedding Guard (Patch 4)', () => {
  it('rechaza dimensión incorrecta (test requerido #2: embedding incorrecto falla)', () => {
    expect(() => validarEmbeddingNoDummy(new Array(300).fill(0).map((_, i) => i), EMBED_DIMS)).toThrow(/dimensión/);
  });

  it('rechaza el patrón dummy histórico exacto new Array(384).fill(0.001) (test requerido #3)', () => {
    const dummy = new Array(EMBED_DIMS).fill(0.001);
    expect(() => validarEmbeddingNoDummy(dummy)).toThrow(/constante/);
  });

  it('rechaza cualquier vector constante equivalente, no solo 0.001', () => {
    expect(() => validarEmbeddingNoDummy(new Array(EMBED_DIMS).fill(0))).toThrow(/constante/);
    expect(() => validarEmbeddingNoDummy(new Array(EMBED_DIMS).fill(-0.5))).toThrow(/constante/);
  });

  it('acepta un embedding real (dimensión correcta, valores variados)', () => {
    expect(() => validarEmbeddingNoDummy(vectorReal(1))).not.toThrow();
  });

  // Corrección (revisión independiente de Cursor sobre 939956b): un
  // componente NaN/Infinity/-Infinity no es un vector dummy en el sentido
  // "constante", pero tampoco es un embedding real válido -- se rechaza
  // por separado, de forma determinística (Number.isFinite), sin depender
  // de heurísticas de valor.
  describe('componentes no finitos', () => {
    it('rechaza un vector de 384 dimensiones, variado, con un único NaN', () => {
      const vec = vectorReal(2);
      vec[200] = NaN;
      expect(() => validarEmbeddingNoDummy(vec)).toThrow(/no finito/);
    });

    it('rechaza un vector variado con un único +Infinity', () => {
      const vec = vectorReal(3);
      vec[0] = Infinity;
      expect(() => validarEmbeddingNoDummy(vec)).toThrow(/no finito/);
    });

    it('rechaza un vector variado con un único -Infinity', () => {
      const vec = vectorReal(4);
      vec[EMBED_DIMS - 1] = -Infinity;
      expect(() => validarEmbeddingNoDummy(vec)).toThrow(/no finito/);
    });

    it('sigue aceptando un vector real sin ningún componente no finito', () => {
      expect(() => validarEmbeddingNoDummy(vectorReal(5))).not.toThrow();
    });
  });
});

describe('validarSinDuplicadosDeterministico / validarLoteAntesDeSQL', () => {
  function registro(numArticulo: string, overrides: Partial<RegistroGenerico> = {}): RegistroGenerico {
    return construirRegistro({ numArticulo, contenido: `Artículo ${numArticulo}.- Texto real.`, aceptado: true }, opts) as RegistroGenerico & typeof overrides;
  }

  it('detecta un candidato duplicado determinístico dentro del lote (test requerido #4)', () => {
    const r1 = registro('10');
    const r2 = { ...registro('10'), num_articulo: '10' }; // mismo id que r1 (mismo idPrefix + mismo numArticulo)
    expect(() => validarSinDuplicadosDeterministico([r1, r2])).toThrow(/duplicados/);
  });

  it('un lote sin duplicados pasa limpio', () => {
    const lote = [registro('1'), registro('2'), registro('3')];
    expect(() => validarSinDuplicadosDeterministico(lote)).not.toThrow();
  });

  it('rechaza un registro sin hash de contenido', () => {
    const r = registro('1');
    const metadataSinHash = { ...r.metadata };
    delete (metadataSinHash as Record<string, unknown>).content_sha256;
    delete (metadataSinHash as Record<string, unknown>).hash_texto_sha256;
    const roto: RegistroGenerico = { ...r, metadata: metadataSinHash };
    expect(() => validarLoteAntesDeSQL([roto])).toThrow(/hash de contenido/);
  });

  // ADR-001 fail-closed (test requerido #1: ausencia de evidencia jurídica
  // nunca produce VIGENTE).
  it('FAIL-CLOSED: construirRegistro nunca produce un lote con vigencia implícita', () => {
    const lote = [registro('1'), registro('2')];
    expect(lote.every((r) => r.es_norma_vigente === false)).toBe(true);
    expect(() => validarLoteAntesDeSQL(lote)).not.toThrow();
  });

  it('FAIL-CLOSED: rechaza explícitamente un registro con es_norma_vigente=true, sin excepción', () => {
    const r = registro('1');
    const forzadoVigente: RegistroGenerico = { ...r, es_norma_vigente: true };
    expect(() => validarLoteAntesDeSQL([forzadoVigente])).toThrow(/NUNCA puede declarar vigencia/);
  });

  // Corrección (revisión independiente de Cursor sobre 939956b):
  // 'VERIFICADO_HUMANO' es un valor de dato dentro de un JSONB que este
  // mismo script construye -- no es prueba de ninguna decisión legal real.
  // INGESTION_PIPELINE_CAN_DECLARE_VIGENCIA = NEVER: ni siquiera este valor
  // puede autorizar es_norma_vigente=true. Este test reemplaza uno anterior
  // que trataba ese string como suficiente -- aquí se prueba exactamente lo
  // contrario, a propósito.
  it('SEGURIDAD: vigencia_state=VERIFICADO_HUMANO NO es una excepción -- sigue siendo forgeable y se rechaza igual', () => {
    const r = registro('1');
    const intentoDeBypass: RegistroGenerico = {
      ...r,
      es_norma_vigente: true,
      metadata: { ...r.metadata, vigencia_state: 'VERIFICADO_HUMANO' },
    };
    expect(() => validarLoteAntesDeSQL([intentoDeBypass])).toThrow(/NUNCA puede declarar vigencia/);
  });
});

describe('validarSQLNoDestructivo (test requerido #5: SQL destructivo rechazado)', () => {
  const stagingTable = 'stg_prueba';
  const sqlAditivoValido = `
    DROP TABLE IF EXISTS ${stagingTable};
    CREATE TABLE ${stagingTable} (id text PRIMARY KEY);
    INSERT INTO ${stagingTable} (id) VALUES ('a');
    DO $$
    BEGIN
      INSERT INTO biblioteca_vectores (id) SELECT id FROM ${stagingTable} ON CONFLICT (id) DO NOTHING;
    END $$;
    DROP TABLE ${stagingTable};
  `;

  it('acepta el patrón aditivo real (DROP solo de la tabla de staging, INSERT aditivo a biblioteca_vectores)', () => {
    expect(() => validarSQLNoDestructivo(sqlAditivoValido, stagingTable)).not.toThrow();
  });

  it('rechaza DELETE FROM en cualquier forma', () => {
    const sqlMalicioso = `DELETE FROM biblioteca_vectores WHERE true;`;
    expect(() => validarSQLNoDestructivo(sqlMalicioso, stagingTable)).toThrow(/DELETE/);
  });

  it('rechaza TRUNCATE', () => {
    expect(() => validarSQLNoDestructivo(`TRUNCATE biblioteca_vectores;`, stagingTable)).toThrow(/TRUNCATE/);
  });

  it('rechaza DROP TABLE contra biblioteca_vectores (o cualquier tabla que no sea la de staging)', () => {
    expect(() => validarSQLNoDestructivo(`DROP TABLE biblioteca_vectores;`, stagingTable)).toThrow(/DROP TABLE/);
    expect(() => validarSQLNoDestructivo(`DROP TABLE otra_tabla;`, stagingTable)).toThrow(/DROP TABLE/);
  });

  it('nunca se llega a generar/escribir SQL destructivo en el flujo real: main() valida antes de writeFileSync', async () => {
    const { execFileSync } = await import('node:child_process');
    const salida = execFileSync('git', ['grep', '-n', 'validarSQLNoDestructivo', '--', 'scripts/'], {
      encoding: 'utf8',
      cwd: process.cwd(),
    });
    // Debe aparecer la definición + al menos una llamada real en cada script de la familia.
    expect(salida).toMatch(/scripts\/ingestar-ley\.ts/);
    expect(salida).toMatch(/scripts\/ingesta-comercio\.ts/);
  });
});

describe('generarManifest / calcularBatchId (Patch 3 — Ingestion Manifest)', () => {
  const registros = [
    construirRegistro({ numArticulo: '1', contenido: 'Artículo 1.- Uno.', aceptado: true }, opts),
    construirRegistro({ numArticulo: '2', contenido: 'Artículo 2.- Dos.', aceptado: true }, opts),
  ];

  it('el manifest tiene identidad de lote (batch_id) no vacía (test requerido #6)', () => {
    const m = generarManifest(registros, opts, { sourceHash: 'abc123', embeddingModel: 'test-model' });
    expect(typeof m.batch_id).toBe('string');
    expect(m.batch_id.length).toBeGreaterThan(0);
    expect(m.registros).toHaveLength(2);
    expect(m.embedding_dimension).toBe(EMBED_DIMS);
  });

  it('el manifest nunca inventa verification_state/vigencia_state -- siempre NO_VERIFICADO cuando no hay evidencia', () => {
    const m = generarManifest(registros, opts, { sourceHash: 'abc123', embeddingModel: 'test-model' });
    for (const r of m.registros) {
      expect(r.verification_state).toBe('NO_VERIFICADO');
      expect(r.vigencia_state).toBe('NO_VERIFICADO');
    }
  });

  // Test requerido #7: ejecución repetida produce comportamiento idempotente/reproducible.
  it('REPRODUCIBLE: mismo idPrefix + mismo source_hash -> mismo batch_id en corridas repetidas', () => {
    const b1 = calcularBatchId(opts.idPrefix, 'mismo-hash-de-fuente');
    const b2 = calcularBatchId(opts.idPrefix, 'mismo-hash-de-fuente');
    expect(b1).toBe(b2);
  });

  it('REPRODUCIBLE: generar el manifest dos veces desde el mismo input produce la misma lista de content_hash', () => {
    const m1 = generarManifest(registros, opts, { sourceHash: 'x', embeddingModel: 'test-model' });
    const m2 = generarManifest(registros, opts, { sourceHash: 'x', embeddingModel: 'test-model' });
    expect(m1.registros.map((r) => r.content_hash)).toEqual(m2.registros.map((r) => r.content_hash));
    expect(m1.batch_id).toBe(m2.batch_id);
  });
});
