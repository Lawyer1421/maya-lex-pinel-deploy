import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ANCLA_ART2_CODIGO,
  ANCLA_ART2_TRAMITE_77,
  ANCLA_ART3_CODIGO,
  ANCLA_ART3_TRAMITE_77,
} from '../scripts/ingesta-notariado';

const SHA_CODIGO =
  'efe971f876fa9b9bc23fad82fc3d669aab864f48dab6169a85f202c1dd2513c8';
const SHA_REGLAMENTO =
  '4d00378b07e06bba870fcda71eeedbb73abb6add41c20d1b5816df4eceaf2750';
const HASH_ART2 =
  'bb5b820f5d15028b9730bba2dad8c80b2d23ca451615a29a05efff048877e108';
const HASH_ART3 =
  'f120e970858f4a4ee119bee8f6d327b3f4fa08e89cc303c3b94ab7488dc5d9c2';
const HASH_ART11 =
  '3a43da030ce35e184ae21fa4d7e23226bff85eeb39b6bc10b76f0ea0358a8de5';
const HASH_ART27 =
  'd027e279d7fa3b61f0634de7614763c1818ecb38099c60a091424bff9e30e947';

interface RegistroLote {
  id: string;
  num_articulo: string;
  es_norma_vigente: boolean;
  contenido: string;
  contenido_sha256: string;
  metadata: Record<string, unknown>;
}

interface InstrumentoLote {
  instrumento: string;
  source: { sha256: string; path: string };
  counts: { registros: number };
  articulos: string[];
  ids: string[];
  adjudicadosReforma77: string[];
  adjudicadosTramite77: string[];
  ocrNormalizados: string[];
  gapsDocumentales: Array<{ numArticulo: string; codigo: string }>;
  anclasSustantivas?: {
    articulo2: { id: string; coincideCodigo2005: boolean };
    articulo3: { id: string; coincideCodigo2005: boolean };
  };
  registros: RegistroLote[];
  manifest: {
    vigenciaDeclarada: boolean;
    networkWrites: number;
  };
}

interface InformeLote {
  modo: string;
  carril: string;
  baseline: string;
  guardianAnclas: string;
  matrizCanonica: {
    primeraOcurrencia_353_2005: string[];
    ultimaOcurrencia_77_2006: string[];
  };
  sqlApply: boolean;
  corpusWrite: boolean;
  vigenciaDeclarada: boolean;
  productionIngestion: boolean;
  featureFlagActivation: boolean;
  networkWrites: number;
  instrumentos: InstrumentoLote[];
}

function cargarLote(): { raw: string; sesion: InformeLote } {
  const raw = readFileSync(
    resolve(process.cwd(), 'docs/governance/exequatur-ingesta-notariado-lote-formal.json'),
    'utf8',
  );
  return { raw, sesion: JSON.parse(raw) as InformeLote };
}

describe('lote formal committed — Carril B', () => {
  const { raw, sesion } = cargarLote();
  const codigo = sesion.instrumentos.find((i) => i.instrumento === 'CODIGO_NOTARIADO');
  const reglamento = sesion.instrumentos.find((i) => i.instrumento === 'REGLAMENTO_NOTARIADO');

  it('ancla baseline, matriz y barreras fail-closed', () => {
    expect(sesion.modo).toBe('INGESTA_FORMAL_NOTARIADO_LOTE');
    expect(sesion.carril).toBe('B');
    expect(sesion.baseline).toBe('d569790');
    expect(sesion.guardianAnclas).toBe('verificarAnclasSustantivasNotariado');
    expect(sesion.matrizCanonica.primeraOcurrencia_353_2005).toEqual(['1', '2', '3', '4']);
    expect(sesion.matrizCanonica.ultimaOcurrencia_77_2006).toEqual(['11', '27']);
    expect(sesion.networkWrites).toBe(0);
    expect(sesion.sqlApply).toBe(false);
    expect(sesion.corpusWrite).toBe(false);
    expect(sesion.vigenciaDeclarada).toBe(false);
    expect(sesion.productionIngestion).toBe(false);
    expect(sesion.featureFlagActivation).toBe(false);
    expect(raw.includes('"sqlApply": true')).toBe(false);
    expect(raw.includes('"es_norma_vigente": true')).toBe(false);
    expect(raw).not.toMatch(/INGESTION_PIPELINE_CAN_DECLARE_VIGENCIA/);
  });

  it('Código: 91 registros, SHA-256 oficial, matriz 1–4 / 11 / 27 y gaps 17/21/52', () => {
    expect(codigo).toBeDefined();
    expect(codigo?.source.sha256).toBe(SHA_CODIGO);
    expect(codigo?.source.path).toBe('drive-Codigo-del-Notariado.pdf');
    expect(codigo?.source.path.includes('/')).toBe(false);
    expect(codigo?.counts.registros).toBe(91);
    expect(codigo?.registros).toHaveLength(91);
    expect(codigo?.ids).toHaveLength(91);
    expect(new Set(codigo?.ids).size).toBe(91);
    expect(codigo?.adjudicadosReforma77).toEqual(['11', '27']);
    expect(codigo?.adjudicadosTramite77).toEqual(['1', '2', '3', '4']);
    expect(codigo?.ocrNormalizados).toEqual(['20', '30', '50', '60', '90']);
    expect(codigo?.gapsDocumentales.map((g) => g.numArticulo)).toEqual(['17', '21', '52']);
    expect(
      codigo?.gapsDocumentales.every(
        (g) => g.codigo === 'GAPS_DOCUMENTALES_PENDIENTES_DE_FE_DE_ERRATAS_O_COPIA_GACETA',
      ),
    ).toBe(true);
    expect(codigo?.articulos).toEqual(expect.arrayContaining(['2', '3', '7', '8', '11', '20', '27']));
    expect(codigo?.articulos).not.toEqual(expect.arrayContaining(['17', '21', '52']));
    expect(codigo?.manifest.vigenciaDeclarada).toBe(false);
    expect(codigo?.manifest.networkWrites).toBe(0);
    expect(codigo?.registros.every((r) => r.es_norma_vigente === false)).toBe(true);
    expect(codigo?.registros.every((r) => r.id.startsWith('mayalex_normativos:codigo_notariado_2005_a'))).toBe(
      true,
    );
  });

  it('anclas sustantivas 2/3 son Decreto 353-2005, no cláusulas 77-2006', () => {
    const art2 = codigo?.registros.find((r) => r.num_articulo === '2');
    const art3 = codigo?.registros.find((r) => r.num_articulo === '3');
    expect(art2?.id).toBe('mayalex_normativos:codigo_notariado_2005_a2');
    expect(art3?.id).toBe('mayalex_normativos:codigo_notariado_2005_a3');
    expect(art2?.contenido_sha256).toBe(HASH_ART2);
    expect(art3?.contenido_sha256).toBe(HASH_ART3);
    expect(art2?.contenido).toMatch(/El Notariado es la instituci[oó]n del Estado/i);
    expect(art3?.contenido).toMatch(/funci[oó]n notarial es aquella funci[oó]n de inter[eé]s p[uú]blico/i);
    expect(ANCLA_ART2_CODIGO.test(art2?.contenido ?? '')).toBe(true);
    expect(ANCLA_ART3_CODIGO.test(art3?.contenido ?? '')).toBe(true);
    expect(ANCLA_ART2_TRAMITE_77.test(art2?.contenido ?? '')).toBe(false);
    expect(ANCLA_ART3_TRAMITE_77.test(art3?.contenido ?? '')).toBe(false);
    expect(codigo?.anclasSustantivas?.articulo2.coincideCodigo2005).toBe(true);
    expect(codigo?.anclasSustantivas?.articulo3.coincideCodigo2005).toBe(true);
    expect(art2?.metadata.adjudicacion_editorial).toBe('primera_ocurrencia_tramite_77_2006');
    expect(art3?.metadata.adjudicacion_editorial).toBe('primera_ocurrencia_tramite_77_2006');
  });

  it('11/27 son última ocurrencia (reforma 77-2006) y OCR 20 queda canónico', () => {
    const art11 = codigo?.registros.find((r) => r.num_articulo === '11');
    const art27 = codigo?.registros.find((r) => r.num_articulo === '27');
    const art20 = codigo?.registros.find((r) => r.num_articulo === '20');
    expect(art11?.contenido_sha256).toBe(HASH_ART11);
    expect(art27?.contenido_sha256).toBe(HASH_ART27);
    expect(art11?.metadata.reforma_adjudicada).toBe('Decreto 77-2006');
    expect(art27?.metadata.reforma_adjudicada).toBe('Decreto 77-2006');
    expect(art11?.metadata.adjudicacion_editorial).toBe('prevalece_anexo_77_2006');
    expect(art20?.id).toBe('mayalex_normativos:codigo_notariado_2005_a20');
    expect(art20?.metadata.ocr_numero_normalizado).toBe(true);
  });

  it('Reglamento: 111 registros 1–111, SHA-256 oficial, sin vigencia', () => {
    expect(reglamento).toBeDefined();
    expect(reglamento?.source.sha256).toBe(SHA_REGLAMENTO);
    expect(reglamento?.source.path).toBe('drive-REGLAMENTO-DEL-CODIGO-DEL-NOTARIADO.pdf');
    expect(reglamento?.counts.registros).toBe(111);
    expect(reglamento?.registros).toHaveLength(111);
    expect(reglamento?.articulos).toEqual(Array.from({ length: 111 }, (_, i) => String(i + 1)));
    expect(reglamento?.adjudicadosReforma77).toEqual([]);
    expect(reglamento?.adjudicadosTramite77).toEqual([]);
    expect(reglamento?.ocrNormalizados).toEqual([]);
    expect(reglamento?.gapsDocumentales).toEqual([]);
    expect(reglamento?.registros.every((r) => r.es_norma_vigente === false)).toBe(true);
    expect(
      reglamento?.registros.every((r) => r.id.startsWith('mayalex_normativos:reglamento_notariado_2012_a')),
    ).toBe(true);
    expect(reglamento?.ids[0]).toBe('mayalex_normativos:reglamento_notariado_2012_a1');
    expect(reglamento?.ids[110]).toBe('mayalex_normativos:reglamento_notariado_2012_a111');
  });

  it('el generador y el artefacto no abren red ni declaran apply', () => {
    const src = readFileSync(resolve(process.cwd(), 'scripts/generar-lote-formal-notariado.ts'), 'utf8');
    expect(src).not.toMatch(/@supabase|createClient\s*\(|\bfetch\s*\(/);
    expect(src).not.toContain('segmentarGenerico');
    expect(src).toMatch(/NETWORK_WRITES/);
    const md = readFileSync(
      resolve(process.cwd(), 'docs/governance/exequatur-ingesta-notariado-lote-formal.md'),
      'utf8',
    );
    expect(md).toContain('NETWORK_WRITES = 0');
    expect(md).toContain('institución del Estado');
    expect(md).toMatch(/funci[oó]n notarial es aquella funci[oó]n/i);
    expect(md).not.toMatch(/Derogar el Cap[ií]tulo/);
  });
});
