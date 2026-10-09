const STOPWORDS = new Set([
  'de', 'la', 'el', 'en', 'y', 'a', 'que', 'los', 'las', 'del', 'por', 'para',
  'con', 'un', 'una', 'se', 'o', 'lo', 'al', 'su', 'sus', 'es', 'son',
]);

const RE_DECRETO = /decreto\s*(?:n[º°o]?\.?\s*)?(\d{1,4})\s*[-/]\s*(\d{2,4})/i;

export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokensSignificativos(texto: string): Set<string> {
  return new Set(
    normalizarTexto(texto)
      .split(' ')
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t)),
  );
}

export function bigramas(texto: string): Set<string> {
  const palabras = normalizarTexto(texto).split(' ').filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i < palabras.length - 1; i++) {
    out.add(`${palabras[i]} ${palabras[i + 1]}`);
  }
  return out;
}

export function identificadorDecreto(texto: string): string | null {
  const m = RE_DECRETO.exec(texto);
  return m ? `${m[1]}-${m[2]}` : null;
}

export function interseccionTamano<T>(a: Set<T>, b: Set<T>): number {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
}
