import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  // Base recommended config
  js.configs.recommended,
  
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/*.min.js',
    ],
  },
  
  // Backend JavaScript files
  {
    files: ['my-backend/**/*.js', 'jobs/**/*.js', 'libs/**/*.js', 'scripts/**/*.js', 'database/**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off', // Allow console in backend
      'prefer-const': 'warn',
      'no-var': 'error',
    },
  },
  
  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
  
  // Frontend specific
  {
    files: ['my-frontend/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];
