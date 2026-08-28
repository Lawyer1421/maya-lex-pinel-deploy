import { describe, it, expect } from 'vitest';
import { validarRutaSalida, cruzarAusentesContraLista } from '../scripts/cruzar-ausentes-dossier';

/**
 * Prevención del incidente del 2026-08-27: un script anterior sobrescribió
 * HUMAN_LEGAL_REVIEW_QUEUE.jsonl con el resultado del cruce por un error de
 * índices de argv. Esta prueba fija el contrato de seguridad exigido por el
 * fundador: --out es obligatorio, y nunca puede apuntar al archivo fuente.
 */

describe('validarRutaSalida — nunca sobrescribe el archivo fuente', () => {
  const source = '/c/dev/mayalex-corpus/corpus-data/estructurado/HUMAN_LEGAL_REVIEW_QUEUE.jsonl';

  it('lanza si --out está ausente', () => {
    expect(() => validarRutaSalida(undefined, source)).toThrow('--out es obligatorio');
  });

  it('lanza si --out está vacío', () => {
    expect(() => validarRutaSalida('', source)).toThrow('--out es obligatorio');
  });

  it('lanza si --out es exactamente igual a --source', () => {
    expect(() => validarRutaSalida(source, source)).toThrow('no puede ser igual a --source');
  });

  it('lanza si --out contiene el nombre del archivo fuente protegido, aunque la ruta sea distinta', () => {
    const outDistintaRutaMismoNombre = '/tmp/otra/carpeta/HUMAN_LEGAL_REVIEW_QUEUE.jsonl';
    expect(() => validarRutaSalida(outDistintaRutaMismoNombre, source)).toThrow('archivo fuente protegido');
  });

  it('NO lanza para una ruta de salida legítima y distinta', () => {
    expect(() => validarRutaSalida('/tmp/scratch/resultado-cruce.json', source)).not.toThrow();
  });
});

describe('cruzarAusentesContraLista — clasificación correcta', () => {
  const hallazgos = [
    { tipo: 'AUSENTE_EN_VERSION_LOCAL_CAUSA_NO_CONFIRMADA', numArticulo: '1' },
    { tipo: 'AUSENTE_EN_VERSION_LOCAL_CAUSA_NO_CONFIRMADA', numArticulo: '2' },
    { tipo: 'AUSENTE_EN_VERSION_LOCAL_CAUSA_NO_CONFIRMADA', numArticulo: '120' },
    { tipo: 'AUSENTE_EN_VERSION_LOCAL_CAUSA_NO_CONFIRMADA', numArticulo: '131' },
    { tipo: 'CLASIFICACION_AMBIGUA_REFORMA_VS_EXTRACCION', numArticulo: '120' }, // no es AUSENTE, se ignora
  ];
  const lista = ['120', '121'];

  it('separa incidente (1,2), candidatos (en lista) y sin explicar', () => {
    const r = cruzarAusentesContraLista(hallazgos, lista);
    expect(r.incidente).toEqual(['1', '2']);
    expect(r.candidatos).toEqual(['120']);
    expect(r.noExplicados).toEqual(['131']);
    expect(r.totalAusentes).toBe(4); // el CLASIFICACION_AMBIGUA no cuenta
  });
});
