import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

describe('OAuth Google — origin del navegador, no un dominio residual', () => {
  it('login construye redirectTo con window.location.origin', () => {
    const src = readFileSync(resolve(process.cwd(), 'app/login/page.tsx'), 'utf8');
    expect(src).toMatch(/signInWithOAuth/);
    expect(src).toMatch(/options:\s*\{\s*redirectTo:\s*callbackUrl\s*\}/);
    expect(src).toMatch(/buildAuthCallbackUrl\(window\.location\.origin/);
    expect(src).not.toMatch(/process\.env\.NEXT_PUBLIC_APP_URL/);
  });

  it('/auth/callback redirige con el origin de la request actual', () => {
    const src = readFileSync(resolve(process.cwd(), 'app/auth/callback/route.ts'), 'utf8');
    expect(src).toMatch(/new URL\(next, requestUrl\.origin\)/);
    expect(src).toMatch(/destino\.origin !== requestUrl\.origin/);
    expect(src).not.toMatch(/process\.env\.NEXT_PUBLIC_APP_URL/);
  });

  it('signout no usa NEXT_PUBLIC_APP_URL', () => {
    const src = readFileSync(resolve(process.cwd(), 'app/api/auth/signout/route.ts'), 'utf8');
    expect(src).toMatch(/new URL\(request\.url\)\.origin/);
    expect(src).not.toMatch(/process\.env\.NEXT_PUBLIC_APP_URL/);
  });

  it('app/ lib/ scripts/ components/ src/ no contienen el dominio residual de otro producto', () => {
    let stdout = '';
    try {
      stdout = execFileSync(
        'git',
        ['grep', '-i', 'k12bilingualschool', '--', 'app/', 'lib/', 'scripts/', 'components/', 'src/'],
        { encoding: 'utf8', cwd: process.cwd() },
      );
    } catch (err) {
      const status = (err as { status?: number }).status;
      expect(status).toBe(1);
      stdout = '';
    }
    expect(stdout.trim()).toBe('');
  });
});
