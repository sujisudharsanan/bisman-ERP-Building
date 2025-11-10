/* eslint-env node */
module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  rules: {
    'header/header': 'off'
  },
  overrides: [
    {
      files: ['*.config.js', '*.config.cjs', 'babel.config.js', 'webpack.config.js', 'jest.config.js'],
      env: { node: true }
    }
  ]
};
