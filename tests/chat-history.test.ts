import { describe, expect, it } from 'vitest';
import { recortarHistorial, type MensajeChat } from '@/lib/chat-history';

function msg(role: 'user' | 'assistant', content: string): MensajeChat {
  return { role, content };
}

describe('recortarHistorial', () => {
  it('vacío → vacío', () => {
    expect(recortarHistorial([])).toEqual([]);
  });

  it('un solo mensaje (consulta actual) se conserva', () => {
    const solo = [msg('user', 'hola')];
    expect(recortarHistorial(solo, 10)).toEqual(solo);
  });

  it('un par + consulta actual: conserva el par y el último', () => {
    const hist = [msg('user', 'u1'), msg('assistant', 'a1'), msg('user', 'u2')];
    expect(recortarHistorial(hist, 10)).toEqual(hist);
  });

  it('N=1 con varios pares: último par + último mensaje', () => {
    const hist = [
      msg('user', 'u1'),
      msg('assistant', 'a1'),
      msg('user', 'u2'),
      msg('assistant', 'a2'),
      msg('user', 'u3'),
    ];
    expect(recortarHistorial(hist, 1)).toEqual([
      msg('user', 'u2'),
      msg('assistant', 'a2'),
      msg('user', 'u3'),
    ]);
  });

  it('último mensaje assistant de un par no se duplica', () => {
    const hist = [msg('user', 'u1'), msg('assistant', 'a1')];
    expect(recortarHistorial(hist, 10)).toEqual(hist);
  });

  it('N inválido usa 10 y no tira el último', () => {
    const muchos: MensajeChat[] = [];
    for (let i = 0; i < 15; i += 1) {
      muchos.push(msg('user', `u${i}`), msg('assistant', `a${i}`));
    }
    muchos.push(msg('user', 'ahora'));
    const recortado = recortarHistorial(muchos, 0);
    expect(recortado[recortado.length - 1]?.content).toBe('ahora');
    expect(recortado.filter((m) => m.role === 'user').length).toBe(11);
  });
});
