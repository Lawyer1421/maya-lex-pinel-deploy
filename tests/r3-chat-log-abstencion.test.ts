import { afterEach, describe, expect, it, vi } from 'vitest';
import { evaluarRespuestaChatR3 } from '@/lib/legal-retrieval/r3-chat';
import { anotarFragmentosClo } from '@/lib/legal-retrieval/clo-guards';

const frag = anotarFragmentosClo([{
  id: 'v2civil:mayalex_procedimental:424', contenido: 'PROCEDENCIA Y REQUISITOS.\n1. Todo proceso judicial comenzará por medio de demanda escrita.', num_articulo: '424',
  fuente: 'Codigo Procesal Civil', relevancia: 1, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '02_CIVIL', coleccion_origen: 'mayalex_procedimental',
}] as never);

afterEach(() => vi.restoreAllMocks());

describe('log de abstención R4', () => {
  it('registra los códigos de la mención sin respaldo y no el texto', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const texto = 'Según el art. 424 del Código Procesal Civil la demanda es escrita. Además aplica el artículo 92 de la Constitución.';
    const v = evaluarRespuestaChatR3({ texto, fragmentos: frag, pregunta: 'requisitos de la demanda', conCorpus: true });
    expect(v.suficiente).toBe(false);
    const linea = info.mock.calls.map((c) => String(c[0])).find((l) => l.startsWith('[R4]'))!;
    expect(linea).toContain('motivo=MENCION_NO_VALIDADA');
    expect(linea).toContain('ARTICULO_SIN_FRAGMENTO:92');
    expect(linea).toContain('INSTRUMENTO_SIN_FRAGMENTO:CONSTITUCION');
    expect(linea).not.toContain('demanda es escrita');
  });
  it('si no hay mención sin respaldo, no registra MENCION_NO_VALIDADA y el veredicto sigue la guarda', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    evaluarRespuestaChatR3({ texto: 'Según el art. 424 del Código Procesal Civil, todo proceso judicial comenzará por medio de demanda escrita.', fragmentos: frag, pregunta: 'requisitos de la demanda', conCorpus: true });
    expect(info.mock.calls.some((c) => String(c[0]).includes('MENCION_NO_VALIDADA'))).toBe(false);
  });
});
