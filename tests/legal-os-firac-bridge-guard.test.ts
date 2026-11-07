import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Guarda estática: el resultado «verificado contra el corpus» y la función que sella evidencia solo pueden existir en el puente.
 * Si aparecen en otro archivo de código de la aplicación (lib/, app/, components/, pages/), esta prueba falla. Quitar un archivo de la lista
 * permitida o añadirlo es una decisión del CLO, no un ajuste de código.
 */
const RAIZ = process.cwd();
const CARPETAS = ['lib', 'app', 'components', 'pages', 'tools', 'scripts'];
const LITERAL = 'VERIFICADO_CORPUS';
const SELLO = 'sellar(';
const PERMITIDO_LITERAL = new Set(['lib/legal-os/skills/corpus-bridge.ts']);
const PERMITIDO_SELLO = new Set(['lib/legal-os/skills/corpus-bridge.ts']);

function* archivos(dir: string): Generator<string> {
  let entradas: string[];
  try { entradas = readdirSync(dir); } catch { return; }
  for (const e of entradas) {
    if (e === 'node_modules' || e === '.next' || e.startsWith('.')) continue;
    const ruta = join(dir, e);
    const st = statSync(ruta);
    if (st.isDirectory()) yield* archivos(ruta);
    else if (/\.(ts|tsx|mjs|js|jsx)$/.test(e)) yield ruta;
  }
}

describe('guarda del puente del corpus', () => {
  const fuentes = CARPETAS.flatMap((c) => [...archivos(join(RAIZ, c))]).map((f) => ({ rel: relative(RAIZ, f).split('\\').join('/'), txt: readFileSync(f, 'utf8') }));

  it('hay código que revisar (la guarda no puede pasar en vacío)', () => {
    expect(fuentes.length).toBeGreaterThan(100);
    expect(fuentes.some((f) => f.rel === 'lib/legal-os/skills/corpus-bridge.ts')).toBe(true);
  });
  it('el literal del resultado verificado solo aparece en el puente', () => {
    const fuera = fuentes.filter((f) => f.txt.includes(LITERAL) && !PERMITIDO_LITERAL.has(f.rel)).map((f) => f.rel);
    expect(fuera).toEqual([]);
  });
  it('la función que sella solo existe en el puente', () => {
    const fuera = fuentes.filter((f) => f.txt.includes(SELLO) && !PERMITIDO_SELLO.has(f.rel)).map((f) => f.rel);
    expect(fuera).toEqual([]);
  });
  it('el módulo del puente no exporta el sello ni el conjunto de sellos', () => {
    const puente = fuentes.find((f) => f.rel === 'lib/legal-os/skills/corpus-bridge.ts')!.txt;
    expect(puente).not.toMatch(/export\s+(?:const|function)\s+sellar\b/);
    expect(puente).not.toMatch(/export\s+const\s+SELLOS\b/);
  });
});
