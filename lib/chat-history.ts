import { HISTORY_TURNS_DEFAULT, leerHistoryTurns } from './model-config';

export interface MensajeChat {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Recorta a los últimos N turnos (par user+assistant), siempre conserva
 * el último mensaje (la consulta actual, que suele ir sin respuesta).
 */
export function recortarHistorial<T extends MensajeChat>(
  messages: T[],
  nTurns: number = HISTORY_TURNS_DEFAULT,
): T[] {
  const limite = !Number.isFinite(nTurns) || nTurns < 1 ? HISTORY_TURNS_DEFAULT : Math.floor(nTurns);
  if (messages.length === 0) return [];

  const pares: T[][] = [];
  let huerfanoFinal: T | undefined;
  let i = 0;
  while (i < messages.length) {
    const a = messages[i];
    const b = messages[i + 1];
    if (a?.role === 'user' && b?.role === 'assistant') {
      pares.push([a, b]);
      i += 2;
      continue;
    }
    if (i === messages.length - 1) {
      huerfanoFinal = a;
    }
    i += 1;
  }

  const conservados = pares.slice(-limite).flat();
  if (huerfanoFinal && conservados[conservados.length - 1] !== huerfanoFinal) {
    return [...conservados, huerfanoFinal];
  }
  return conservados;
}

export function recortarHistorialDesdeEnv<T extends MensajeChat>(messages: T[]): T[] {
  return recortarHistorial(messages, leerHistoryTurns());
}
