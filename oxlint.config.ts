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
    'react/react-in-jsx-scope': 'off',
    // React Compiler memoizes render callbacks, option arrays and JSX props in the build.
    // Keep hook/correctness rules enabled; hand-memoization rules duplicate the compiler.
    'react-perf/jsx-no-new-function-as-prop': 'off',
    'react-perf/jsx-no-new-array-as-prop': 'off',
    'react-perf/jsx-no-new-object-as-prop': 'off'
  },
  env: {
    browser: true
  }
});
