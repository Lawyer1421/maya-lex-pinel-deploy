import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Pre-slice MCP v1: lib/legal-retrieval/retrieval-session.ts se extrajo 1:1 de
 * app/api/chat/route.ts. Los tests de la ruta (chat-route-fail-closed,
 * evidence-gate-procedural-masking, retrieval-*) cubren el comportamiento de
 * extremo a extremo; aquí se fija el contrato del módulo compartido.
 */

const buscarRAG = vi.fn();
const permitidos = vi.fn();

vi.mock('@/lib/rag/search', () => ({
  buscarRAG: (...a: unknown[]) => buscarRAG(...a),
  formatearContextoRAG: (r: { fragmentos: { contenido: string }[] }) => r.fragmentos.map((f) => f.contenido).join('|'),
  requiereEvidenciaCorpus: (_p: string, obligatoria: boolean) => obligatoria,
  CORPUS_EVIDENCE_NOT_FOUND: 'CORPUS_EVIDENCE_NOT_FOUND',
  MENSAJE_ABSTENCION_CORPUS: 'ABSTENCION',
}));
vi.mock('@/lib/legal-retrieval/instrument-gate', () => ({
  clasificarIntencionInstrumental: () => ({ tipo: 'NONE' }),
  evidenciaProcedimentalPermitida: (...a: unknown[]) => permitidos(...a),
}));
vi.mock('@/lib/legal-retrieval/retrieval-outcome', () => ({
  MENSAJE_CONFIGURACION_NO_DISPONIBLE: 'CONFIG',
  MENSAJE_RETRIEVAL_ERROR: 'RETRIEVAL',
}));

const { recuperarEvidenciaCorpus, decidirAbstencion } = await import('@/lib/legal-retrieval/retrieval-session');

const frag = (contenido: string, num_articulo: string | null = null) => ({ contenido, num_articulo, fuente: 'X', relevancia: 1 });

describe('recuperarEvidenciaCorpus', () => {
  beforeEach(() => {
    buscarRAG.mockReset();
    permitidos.mockReset();
  });

  it('sin pasada procedimental: una sola búsqueda (k=5) con colección, materia y rerank', async () => {
    buscarRAG.mockResolvedValueOnce({ fragmentos: [frag('a')], articulos_encontrados: [], backend: 'supabase', outcome: { state: 'VERIFIED_EVIDENCE', evidenceCount: 1 } });
    const r = await recuperarEvidenciaCorpus({ pregunta: 'q', coleccionPrincipal: 'col', materiaFiltro: '01_PENAL', pasadaProcedimental: false, rerank: true });
    expect(buscarRAG).toHaveBeenCalledTimes(1);
    expect(buscarRAG).toHaveBeenCalledWith('q', 5, 'col', '01_PENAL', { rerank: true });
    expect(r).toEqual({ texto: 'a', fragmentos: [frag('a')], outcome: { state: 'VERIFIED_EVIDENCE', evidenceCount: 1 } });
  });

  it('con pasada procedimental: k=3 en mayalex_procedimental; sólo añade los permitidos y conserva el outcome principal', async () => {
    buscarRAG
      .mockResolvedValueOnce({ fragmentos: [frag('a', '1')], articulos_encontrados: ['1'], backend: 'supabase', outcome: { state: 'VERIFIED_EVIDENCE', evidenceCount: 1 } })
      .mockResolvedValueOnce({ fragmentos: [frag('p1', '2'), frag('p2', '3')], articulos_encontrados: [], backend: 'supabase', outcome: { state: 'VERIFIED_EVIDENCE', evidenceCount: 2 } });
    permitidos.mockImplementation((_principal, proc: unknown[]) => [proc[0]]);
    const r = await recuperarEvidenciaCorpus({ pregunta: 'q', coleccionPrincipal: 'col', pasadaProcedimental: true, rerank: false });
    expect(buscarRAG).toHaveBeenNthCalledWith(2, 'q', 3, 'mayalex_procedimental', undefined, { rerank: false });
    expect(r.fragmentos.map((f) => f.contenido)).toEqual(['a', 'p1']);
    expect(r.texto).toBe('a\n\np1');
    expect(r.outcome).toEqual({ state: 'VERIFIED_EVIDENCE', evidenceCount: 1 });
  });

  it('pasada procedimental sin permitidos: no altera texto ni fragmentos', async () => {
    buscarRAG
      .mockResolvedValueOnce({ fragmentos: [], articulos_encontrados: [], backend: 'supabase', outcome: { state: 'OFFICIAL_FALLBACK_REQUIRED', evidenceCount: 0 } })
      .mockResolvedValueOnce({ fragmentos: [frag('p1')], articulos_encontrados: [], backend: 'supabase' });
    permitidos.mockReturnValue([]);
    const r = await recuperarEvidenciaCorpus({ pregunta: 'q', coleccionPrincipal: 'col', pasadaProcedimental: true, rerank: false });
    expect(r).toEqual({ texto: '', fragmentos: [], outcome: { state: 'OFFICIAL_FALLBACK_REQUIRED', evidenceCount: 0 } });
  });
});

describe('decidirAbstencion', () => {
  it('la pasada procedimental no enmascara la insuficiencia primaria (se mide por outcome.evidenceCount)', () => {
    const d = decidirAbstencion('q', true, { fragmentos: [frag('p1')], outcome: { state: 'OFFICIAL_FALLBACK_REQUIRED', evidenceCount: 0 } as never });
    expect(d).toEqual({ evidenciaInsuficiente: true, esFalloDeSistema: false, mensajeAbstencion: 'ABSTENCION', codigoAbstencion: 'CORPUS_EVIDENCE_NOT_FOUND' });
  });
  it('sin outcome usa fragmentos.length como respaldo', () => {
    expect(decidirAbstencion('q', true, { fragmentos: [] }).evidenciaInsuficiente).toBe(true);
    expect(decidirAbstencion('q', true, { fragmentos: [frag('a')] }).evidenciaInsuficiente).toBe(false);
  });
  it('si la consulta no exige corpus no se abstiene', () => {
    expect(decidirAbstencion('q', false, { fragmentos: [] }).evidenciaInsuficiente).toBe(false);
  });
  it.each([
    ['CONFIGURATION_ERROR', 'CONFIG'],
    ['RETRIEVAL_ERROR', 'RETRIEVAL'],
  ])('%s: fallo de sistema con mensaje propio, nunca «no existe»', (state, mensaje) => {
    const d = decidirAbstencion('q', true, { fragmentos: [], outcome: { state, evidenceCount: 0 } as never });
    expect(d).toEqual({ evidenciaInsuficiente: true, esFalloDeSistema: true, mensajeAbstencion: mensaje, codigoAbstencion: state });
  });
  it('evidencia primaria presente: no se abstiene', () => {
    expect(decidirAbstencion('q', true, { fragmentos: [frag('a')], outcome: { state: 'VERIFIED_EVIDENCE', evidenceCount: 1 } as never }).evidenciaInsuficiente).toBe(false);
  });
});
