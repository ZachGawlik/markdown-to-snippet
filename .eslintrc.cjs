module.exports = {
  env: {
    node: true,
    es2021: true,
    'jest/globals': true,
  },
  parserOptions: {
    sourceType: 'module',
  },
  plugins: ['prettier', 'jest'],
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:jest/recommended',
    // Must be last
    'plugin:prettier/recommended',
  ],
  rules: {
    'no-console': ['error', { allow: ['error'] }],
    'no-var': 'error',
    'prefer-const': 'error',
  },
};
