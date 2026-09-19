import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SHA_CODIGO =
  'efe971f876fa9b9bc23fad82fc3d669aab864f48dab6169a85f202c1dd2513c8';
const SHA_REGLAMENTO =
  '4d00378b07e06bba870fcda71eeedbb73abb6add41c20d1b5816df4eceaf2750';

interface InformeSesion {
  modo: string;
  sqlApply: boolean;
  corpusWrite: boolean;
  vigenciaDeclarada: boolean;
  productionIngestion: boolean;
  featureFlagActivation: boolean;
  instrumentos: Array<{
    instrumento: string;
    source: { sha256: string; path: string };
    vigenciaDeclarada: boolean;
    corpusWrite: boolean;
    sqlApply: boolean;
    hallazgos: {
      ocrLetraOPorCero: string[];
      huecosPorRechazo: string[];
      huecosSinCandidato: string[];
      curriculoBloqueadoPorDivergente: string[];
    };
    rechazados: Array<{ snippet: string }>;
  }>;
}

describe('informe committed — dry-run fuente real', () => {
  const raw = readFileSync(
    resolve(process.cwd(), 'docs/governance/exequatur-ingesta-notariado-dry-run-fuente-real.json'),
    'utf8',
  );
  const sesion = JSON.parse(raw) as InformeSesion;

  it('ancla SHA-256 de las fuentes primarias y mantiene barreras', () => {
    expect(sesion.modo).toBe('NOTARIAL_REAL_SOURCE_DRY_RUN');
    expect(sesion.sqlApply).toBe(false);
    expect(sesion.corpusWrite).toBe(false);
    expect(sesion.vigenciaDeclarada).toBe(false);
    expect(sesion.productionIngestion).toBe(false);
    expect(sesion.featureFlagActivation).toBe(false);

    const codigo = sesion.instrumentos.find((i) => i.instrumento === 'CODIGO_NOTARIADO');
    const reglamento = sesion.instrumentos.find((i) => i.instrumento === 'REGLAMENTO_NOTARIADO');
    expect(codigo?.source.sha256).toBe(SHA_CODIGO);
    expect(reglamento?.source.sha256).toBe(SHA_REGLAMENTO);
    expect(codigo?.source.path).toBe('drive-Codigo-del-Notariado.pdf');
    expect(codigo?.source.path.includes('/')).toBe(false);
    expect(codigo?.sqlApply).toBe(false);
    expect(reglamento?.sqlApply).toBe(false);
    expect(codigo?.hallazgos.ocrLetraOPorCero).toEqual(['2O', '3O', '5O', '6O', '9O']);
    expect(codigo?.hallazgos.huecosPorRechazo).toEqual(['21', '52']);
    expect(codigo?.hallazgos.huecosSinCandidato).toEqual(['17']);
    expect(codigo?.hallazgos.curriculoBloqueadoPorDivergente).toEqual(['2', '3']);
  });

  it('no versiona cuerpos legales: snippets de rechazados ≤ 60', () => {
    for (const i of sesion.instrumentos) {
      expect(i.rechazados.every((r) => r.snippet.length <= 60)).toBe(true);
    }
    expect(raw).not.toMatch(/INGESTION_PIPELINE_CAN_DECLARE_VIGENCIA/);
    expect(raw.includes('"sqlApply": true')).toBe(false);
  });
});
