import { afterEach, describe, expect, it, vi } from 'vitest';
import { anotarFragmentosClo, diagnosticarContenidoNormativo, mencionesNoValidadas } from '@/lib/legal-retrieval/clo-guards';
import { evaluarRespuestaChatR3 } from '@/lib/legal-retrieval/r3-chat';

const frs = anotarFragmentosClo([{
  id: 'v2civil:mayalex_procedimental:424', contenido: 'PROCEDENCIA Y REQUISITOS.\n1. Todo proceso judicial comenzará por medio de demanda escrita, en la que el demandante interpondrá la pretensión.',
  num_articulo: '424', fuente: 'Codigo Procesal Civil', relevancia: 1, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '02_CIVIL', coleccion_origen: 'mayalex_procedimental',
}] as never);

afterEach(() => vi.restoreAllMocks());

const LITERAL = 'Según el artículo 424 del Código Procesal Civil, todo proceso judicial comenzará por medio de demanda escrita.';
const CIERRE = 'El plazo para subsanar los defectos de la demanda es de diez días.';

describe('diagnóstico de CONTENIDO_NORMATIVO_SIN_FRAGMENTO (sin texto)', () => {
  it('oración normativa en un bloque que no nombra fuente → SIN_FUENTE_NOMBRADA con bloque, oración y longitud', () => {
    const d = diagnosticarContenidoNormativo(`${LITERAL}\n\n${CIERRE}`, frs, {});
    expect(d).toEqual([`b1:o0:SIN_FUENTE_NOMBRADA:len${CIERRE.length}`]);
    expect(mencionesNoValidadas(`${LITERAL}\n\n${CIERRE}`, frs, {})).toContain('CONTENIDO_NORMATIVO_SIN_FRAGMENTO');
  });
  it('bloque que nombra la fuente pero la oración no está respaldada → FUENTE_NO_RESPALDA con los artículos nombrados', () => {
    const t = 'Según el artículo 424 del Código Procesal Civil, el plazo para presentar la demanda es de tres días.';
    const d = diagnosticarContenidoNormativo(t, frs, {});
    expect(d).toHaveLength(1);
    expect(d[0]).toMatch(/^b0:o0:FUENTE_NO_RESPALDA:arts424:len\d+$/);
  });
  it('una respuesta respaldada no genera diagnóstico', () => {
    expect(diagnosticarContenidoNormativo(LITERAL, frs, {})).toEqual([]);
  });
  it('el diagnóstico nunca contiene texto de la respuesta', () => {
    const d = diagnosticarContenidoNormativo(`${LITERAL}\n\n${CIERRE}`, frs, {}).join(' ');
    expect(d).not.toMatch(/plazo|subsanar|defectos|diez/i);
  });
  it('el log de abstención incluye el detalle solo cuando el código es CONTENIDO_NORMATIVO_SIN_FRAGMENTO', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    evaluarRespuestaChatR3({ texto: `${LITERAL}\n\n${CIERRE}`, fragmentos: frs, pregunta: 'requisitos de la demanda', conCorpus: true });
    const linea = info.mock.calls.map((c) => String(c[0])).find((l) => l.startsWith('[R4]'))!;
    expect(linea).toContain('CONTENIDO_NORMATIVO_SIN_FRAGMENTO');
    expect(linea).toContain('contenido=["b1:o0:SIN_FUENTE_NOMBRADA:len');
    expect(linea).not.toContain('subsanar');
  });
});
