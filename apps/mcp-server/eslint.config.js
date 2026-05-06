import { node } from '@komercia-mcp/eslint-config';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...node,
  { languageOptions: { parserOptions: { project: './tsconfig.json' } } }
);
