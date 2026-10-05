/**
 * Acumula fragmentos de texto de un stream y los publica como mucho
 * una vez por turno del planificador (un frame en el navegador).
 * El texto publicado es siempre el acumulado completo, nunca un recorte.
 */
export function createStreamTextBuffer(
  onFlush: (text: string) => void,
  schedule: (flush: () => void) => void,
): { push: (delta: string) => void; flushSync: () => void } {
  let text = '';
  let scheduled = false;
  let closed = false;

  const publish = () => {
    scheduled = false;
    if (closed) return;
    onFlush(text);
  };

  return {
    push(delta: string) {
      if (closed) return;
      text += delta;
      if (scheduled) return;
      scheduled = true;
      schedule(publish);
    },
    flushSync() {
      if (closed) return;
      closed = true;
      scheduled = false;
      onFlush(text);
    },
  };
}
