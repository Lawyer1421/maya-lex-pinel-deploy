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
  },
});
