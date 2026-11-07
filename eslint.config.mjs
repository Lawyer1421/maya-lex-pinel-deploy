// Configuración flat de ESLint 9 (Next 16 ya no incluye `next lint`).
// Reutiliza la config oficial de Next (core-web-vitals + TypeScript).
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  {
    // Exclusiones explícitas.
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'docs/**',
      // Textos y datos de fixtures (no son código de la app).
      'tests/fixtures/**',
      'lib/legal-retrieval/fixtures/**',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Deuda previa a esta config: se deja en `warn` para no corregir en masa
    // (ver descripción del PR). Subir a `error` cuando se salde cada regla.
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      'react/no-unescaped-entities': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];

export default eslintConfig;
