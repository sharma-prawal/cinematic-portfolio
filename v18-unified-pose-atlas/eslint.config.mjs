import js from '@eslint/js';
import globals from 'globals';
export default [
  {ignores: ['.venv/**', 'data/**', 'report/**']},
  {files: ['**/*.mjs'], ...js.configs.recommended, languageOptions: {ecmaVersion: 'latest', sourceType: 'module', globals: {...globals.node, ...globals.browser}}},
];
