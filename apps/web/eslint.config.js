import { node } from '@komercia-mcp/eslint-config';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Tests are excluded from the project-based linter because the package's
  // tsconfig.json deliberately excludes spec files (they're not emitted).
  // Vitest provides its own type checking through the test runner.
  // Astro components are not handled here either.
  {
    ignores: [
      '**/__tests__/**',
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/*.astro',
      'dist/**',
      '.astro/**',
    ],
  },
  ...node,
  { languageOptions: { parserOptions: { project: './tsconfig.json' } } },
);
