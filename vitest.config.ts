import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Suite del sprint de emergencia PayPal — solo unidades puras y mocks.
// Nunca debe requerir red real ni credenciales: cero llamadas a PayPal
// Live/Sandbox, cero escrituras a Supabase real. Ver tests/README.md.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // 15s (default 5s): en la corrida completa, con ~43 archivos compitiendo
    // por CPU en runners de 2 núcleos, tests async puros llegan al timeout de
    // 5s de forma intermitente (p.ej. extract-text-route "401 AUTH_REQUIRED").
    // Aislados pasan en <1s. Subir el margen evita flakes que bloquearían PRs
    // cuando `test` sea un required check.
    testTimeout: 15000,
    // Límite de arranque de PGlite, no de las pruebas: los `beforeAll` de
    // tests/sql instancian PGlite (WASM) y aplican migraciones. En la corrida
    // completa, con la CPU compartida entre ~80 archivos, ese arranque supera
    // los 10s por defecto y falla el hook (4 suites en una corrida local);
    // aisladas pasan en ~15s en total. Sólo afecta a hooks (beforeAll/afterAll);
    // `testTimeout` no se toca, así que una prueba lenta o colgada sigue
    // fallando a los 15s.
    hookTimeout: 120_000,
  },
});
