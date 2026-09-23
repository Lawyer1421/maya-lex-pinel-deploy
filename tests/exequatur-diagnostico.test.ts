import { describe, it, expect } from 'vitest';
import { BANCO_DIAGNOSTICO_EXEQUATUR } from '@/lib/exequatur/diagnostico/banco';
import {
  evaluarDiagnostico,
  parsearObjetivosQuery,
  parsearRespuestas,
  recomendarLecciones,
} from '@/lib/exequatur/diagnostico/evaluar';
import { idsObjetivosCurriculo, localizarObjetivo } from '@/lib/exequatur/curriculum/localizar';

const LIMITE_CAMPO_EDITORIAL = 300;

describe('BANCO_DIAGNOSTICO_EXEQUATUR — estructura Slice 3', () => {
  it('está versionado y cubre cada objetivo del currículo semilla', () => {
    expect(BANCO_DIAGNOSTICO_EXEQUATUR.version).toBe(1);
    const cubiertos = new Set(BANCO_DIAGNOSTICO_EXEQUATUR.items.map((item) => item.objetivoId));
    for (const objetivoId of idsObjetivosCurriculo()) {
      expect(cubiertos.has(objetivoId)).toBe(true);
    }
  });

  it('cada ítem apunta a un objetivo real y a una opción existente', () => {
    const idsItem = BANCO_DIAGNOSTICO_EXEQUATUR.items.map((item) => item.id);
    expect(new Set(idsItem).size).toBe(idsItem.length);

    for (const item of BANCO_DIAGNOSTICO_EXEQUATUR.items) {
      expect(localizarObjetivo(item.objetivoId)).not.toBeNull();
      expect(item.opciones.length).toBeGreaterThanOrEqual(2);
      expect(item.opciones.some((opcion) => opcion.id === item.respuestaCorrectaId)).toBe(true);
      expect(item.enunciado.length).toBeLessThan(LIMITE_CAMPO_EDITORIAL);
      for (const opcion of item.opciones) {
        expect(opcion.texto.length).toBeLessThan(LIMITE_CAMPO_EDITORIAL);
      }
    }
  });

  it('no usa chunk ids ni claves extra en el ítem', () => {
    for (const item of BANCO_DIAGNOSTICO_EXEQUATUR.items) {
      expect(Object.keys(item).sort()).toEqual([
        'enunciado',
        'id',
        'objetivoId',
        'opciones',
        'respuestaCorrectaId',
      ]);
    }
  });
});

describe('evaluarDiagnostico', () => {
  it('todas correctas → sin objetivos pendientes ni lecciones', () => {
    const respuestas: Record<string, string> = {};
    for (const item of BANCO_DIAGNOSTICO_EXEQUATUR.items) {
      respuestas[item.id] = item.respuestaCorrectaId;
    }
    const r = evaluarDiagnostico(respuestas);
    expect(r.aciertos).toHaveLength(r.total);
    expect(r.fallos).toHaveLength(0);
    expect(r.objetivosPendientes).toHaveLength(0);
    expect(r.leccionesRecomendadas).toHaveLength(0);
  });

  it('sin respuestas → todos los objetivos pendientes, lecciones del currículo', () => {
    const r = evaluarDiagnostico({});
    expect(r.sinRespuesta).toHaveLength(r.total);
    expect(r.objetivosPendientes).toEqual([...idsObjetivosCurriculo()]);
    expect(r.leccionesRecomendadas.length).toBe(11);
  });

  it('opción desconocida o incorrecta no puntúa', () => {
    const r = evaluarDiagnostico({
      'item-notariado-institucion': 'zzz',
      'item-funcion-notarial': 'a',
    });
    expect(r.aciertos).not.toContain('item-notariado-institucion');
    expect(r.aciertos).not.toContain('item-funcion-notarial');
    expect(r.fallos).toContain('item-notariado-institucion');
    expect(r.fallos).toContain('item-funcion-notarial');
  });

  it('ítems extra en el payload se ignoran (no inventan puntaje)', () => {
    const r = evaluarDiagnostico({ 'item-inventado': 'a' });
    expect(r.aciertos).toHaveLength(0);
    expect(r.sinRespuesta).toHaveLength(r.total);
  });
});

describe('plan de estudio fail-safe', () => {
  it('objetivo huérfano no produce lección', () => {
    expect(recomendarLecciones(['obj-no-existe', 'obj-definicion-notariado'])).toEqual([
      {
        moduloSlug: 'fundamentos-del-notariado',
        leccionSlug: 'la-institucion-del-notariado',
        titulo: 'La institución del Notariado y la función notarial',
        objetivoIds: ['obj-definicion-notariado'],
      },
    ]);
  });

  it('query string descarta IDs desconocidos y duplicados', () => {
    expect(
      parsearObjetivosQuery('obj-definicion-notariado,obj-hack,obj-definicion-notariado, obj-definicion-de-ley'),
    ).toEqual(['obj-definicion-notariado', 'obj-definicion-de-ley']);
  });

  it('dos objetivos de la misma lección colapsan a una sola recomendación', () => {
    const recs = recomendarLecciones(['obj-definicion-notariado', 'obj-definicion-funcion-notarial']);
    expect(recs).toHaveLength(1);
    expect(recs[0]?.objetivoIds).toEqual([
      'obj-definicion-notariado',
      'obj-definicion-funcion-notarial',
    ]);
  });

  it('parsearRespuestas solo lee claves item:<id> del banco', () => {
    const form = new FormData();
    form.set('item:item-notariado-institucion', 'a');
    form.set('item:item-inventado', 'a');
    form.set('otro', 'x');
    expect(parsearRespuestas(form)).toEqual({ 'item-notariado-institucion': 'a' });
  });
});
