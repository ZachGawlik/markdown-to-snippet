module.exports = {
  env: {
    node: true,
    es6: true,
    'jest/globals': true,
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
};
