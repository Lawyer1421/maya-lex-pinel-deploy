import { describe, expect, it } from 'vitest';
import { CLAUDE_CONFIG, construirSystemConCache, textoDeSystem } from '@/lib/system-prompt';

describe('construirSystemConCache', () => {
  it('el bloque estático lleva cache_control ephemeral', () => {
    const bloques = construirSystemConCache(CLAUDE_CONFIG.analisis.systemPrompt, '');
    expect(bloques).toHaveLength(1);
    expect(bloques[0]?.cache_control).toEqual({ type: 'ephemeral' });
    expect(bloques[0]?.text).toBe(CLAUDE_CONFIG.analisis.systemPrompt);
  });

  it('el RAG / dinámico va después del punto de caché, sin cache_control', () => {
    const rag = 'Fuente documental: Código Civil\nArtículo 1.';
    const bloques = construirSystemConCache(CLAUDE_CONFIG.analisis.systemPrompt, rag);
    expect(bloques).toHaveLength(2);
    expect(bloques[0]?.cache_control).toEqual({ type: 'ephemeral' });
    expect(bloques[0]?.text).not.toContain('Fuente documental');
    expect(bloques[1]?.text).toBe(rag);
    expect(bloques[1]?.cache_control).toBeUndefined();
    expect(textoDeSystem(bloques)).toContain('Fuente documental');
  });
});
