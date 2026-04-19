import { defineConfig } from 'oxlint';

export default defineConfig({
  categories: {
    correctness: 'error',
    perf: 'error',
    suspicious: 'error'
  },
  options: {
    typeAware: true,
    typeCheck: true
  },
  plugins: ['eslint', 'typescript', 'react', 'react-perf', 'oxc'],
  rules: {
    'react/jsx-filename-extension': ['error', { extensions: ['.tsx'] }],
    'react/react-in-jsx-scope': 'off'
  },
  env: {
    browser: true
  }
});
