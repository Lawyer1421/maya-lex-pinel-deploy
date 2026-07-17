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
  },
});
