import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { crearRecuperadorRpc, RPC_RESOLVER_ARTICULO, type FilaResolucion, type LlamadaRpc } from '@/lib/legal-os/skills/corpus-retriever';
import { crearPuenteCorpus } from '@/lib/legal-os/skills/corpus-bridge';
import type { FiracSkill } from '@/lib/legal-os/skills/firac-schema';

const fila = (p: Partial<FilaResolucion> = {}): FilaResolucion => ({
  id: 'f1', coleccion: 'mayalex_normativos', materia: '02_CIVIL', contenido: 'Artículo 424. Texto.', num_articulo: '424',
  fuente: 'Código Procesal Civil', fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, ...p,
});
const rpc = (filas: FilaResolucion[] | null, error: { message: string } | null = null): LlamadaRpc => async () => ({ data: filas, error });
const plantilla = (articulos: string[]): FiracSkill => ({
  skill_id: 'procesal_civil', firac: { rules: [{ id: 'R1', basis: [{ instrument: 'Código Procesal Civil', articles: articulos, and_following: false }] }] },
} as unknown as FiracSkill);

describe('recuperador RPC → puente FIRAC', () => {
  it('llama a la RPC con instrumento y artículo normalizados', async () => {
    const vistos: unknown[] = [];
    await crearRecuperadorRpc(async (fn, args) => { vistos.push([fn, args]); return { data: [], error: null }; })({ instrumentId: 'CODIGO_PROCESAL_CIVIL', articulo: '0424' });
    expect(vistos).toEqual([[RPC_RESOLVER_ARTICULO, { p_instrumento_id: 'CODIGO_PROCESAL_CIVIL', p_num_articulo_norm: '424', p_limite: 5 }]]);
  });
  it('error de la RPC se propaga (el puente lo registra como RECUPERACION_FALLIDA)', async () => {
    await expect(crearRecuperadorRpc(rpc(null, { message: 'boom' }))({ instrumentId: 'CODIGO_PROCESAL_CIVIL', articulo: '424' })).rejects.toThrow(/boom/);
    const r = await crearPuenteCorpus(crearRecuperadorRpc(rpc(null, { message: 'boom' })), 'snap').verificarPlantilla(plantilla(['424']));
    expect(r.verificaciones[0].estado).toBe('RECUPERACION_FALLIDA');
    expect(r.evidencia).toEqual({});
  });
  it('fila vigente del mismo instrumento y artículo → VERIFICADA con evidencia sellada', async () => {
    const r = await crearPuenteCorpus(crearRecuperadorRpc(rpc([fila()])), 'snap').verificarPlantilla(plantilla(['424']));
    expect(r.verificaciones[0].estado).toBe('VERIFICADA');
    expect(r.evidencia.R1.map((e) => e.chunk_id)).toEqual(['f1']);
  });
  it('vigencia null o false NO se promueve a verificada', async () => {
    for (const v of [null, false]) {
      const r = await crearPuenteCorpus(crearRecuperadorRpc(rpc([fila({ es_norma_vigente: v })])), 'snap').verificarPlantilla(plantilla(['424']));
      expect(r.verificaciones[0].estado).toBe('NO_ENCONTRADA');
      expect(r.evidencia).toEqual({});
    }
  });
  it('fila de otro artículo, sentencia o sin filas no verifica', async () => {
    for (const filas of [[fila({ num_articulo: '425' })], [fila({ fuente_tipo: 'sentencia' })], []]) {
      const r = await crearPuenteCorpus(crearRecuperadorRpc(rpc(filas)), 'snap').verificarPlantilla(plantilla(['424']));
      expect(r.verificaciones[0].estado).toBe('NO_ENCONTRADA');
    }
  });
  it('el módulo no contiene el literal de verificación ni la función de sellado', () => {
    const src = readFileSync('lib/legal-os/skills/corpus-retriever.ts', 'utf8');
    expect(src).not.toMatch(/VERIFICADO_CORPUS|sellar\(/);
  });
});
