import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'analysis/**', 'qa/**', 'rollback/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': hooks },
    rules: hooks.configs.recommended.rules,
  },
  { files: ['*.js'], languageOptions: { globals: globals.node } },
  // QA callbacks execute inside the test browser as well as in Node.
  { files: ['scripts/*.mjs'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
);
