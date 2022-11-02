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
    'no-console':
      process.env.NODE_ENV === 'production'
        ? ['error', { allow: ['error'] }]
        : 'off',
    'no-unused-vars': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-var': 'error',
    'prefer-const': 'error',
  },
};
