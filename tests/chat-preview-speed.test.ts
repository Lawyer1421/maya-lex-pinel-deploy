import { describe, expect, it } from 'vitest';
import { filterSuggestions, foldSearchText } from '@/lib/chat/suggestion-filter';
import { createStreamTextBuffer } from '@/lib/chat/stream-text-buffer';

const EXAMPLES = [
  '¿Cuál es el plazo para apelar una sentencia civil en Honduras?',
  'Redacta un contrato de compraventa de bien inmueble',
  'Plazo para presentar recurso de casación penal',
];

describe('filterSuggestions', () => {
  it('devuelve todos los ejemplos cuando la consulta está vacía', () => {
    expect(filterSuggestions(EXAMPLES, '   ')).toEqual(EXAMPLES);
  });

  it('filtra sin distinguir acentos ni mayúsculas', () => {
    expect(filterSuggestions(EXAMPLES, 'casacion')).toEqual([
      'Plazo para presentar recurso de casación penal',
    ]);
  });

  it('deja la lista vacía cuando ningún ejemplo coincide', () => {
    expect(filterSuggestions(EXAMPLES, 'amparo constitucional')).toEqual([]);
  });

  it('pliega diacríticos', () => {
    expect(foldSearchText('Casación')).toBe('casacion');
  });
});

describe('createStreamTextBuffer', () => {
  it('publica una sola vez varios fragmentos encolados en el mismo turno', () => {
    const flushed: string[] = [];
    const queued: Array<() => void> = [];
    const buffer = createStreamTextBuffer(
      (text) => flushed.push(text),
      (flush) => queued.push(flush),
    );

    buffer.push('Art. ');
    buffer.push('709');
    buffer.push(' CPC');
    expect(flushed).toEqual([]);
    expect(queued).toHaveLength(1);

    queued[0]();
    expect(flushed).toEqual(['Art. 709 CPC']);
  });

  it('publica el texto completo al cerrar el stream aunque el frame no haya corrido', () => {
    const flushed: string[] = [];
    const buffer = createStreamTextBuffer(
      (text) => flushed.push(text),
      () => {
        /* el frame queda pendiente */
      },
    );

    buffer.push('hola');
    buffer.push(' ley');
    buffer.flushSync();
    expect(flushed).toEqual(['hola ley']);
  });

  it('un frame tardío no vuelve a publicar después del cierre', () => {
    const flushed: string[] = [];
    const queued: Array<() => void> = [];
    const buffer = createStreamTextBuffer(
      (text) => flushed.push(text),
      (flush) => queued.push(flush),
    );

    buffer.push('texto');
    buffer.flushSync();
    queued[0]?.();
    buffer.push(' extra');
    expect(flushed).toEqual(['texto']);
  });
});
