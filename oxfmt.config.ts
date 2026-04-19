import { defineConfig } from 'oxfmt';

export default defineConfig({
  ignorePatterns: ['.agents'],
  singleQuote: true,
  sortImports: {
    newlinesBetween: false,
    sortSideEffects: true
  },
  trailingComma: 'none'
});
