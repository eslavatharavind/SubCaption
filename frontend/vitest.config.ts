import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname) },
  },
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    exclude: ['node_modules/**', '.next/**', 'e2e/**', 'tests/**'],
  },
});
