import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@common': resolve(__dirname, './src/common'),
      '@modules': resolve(__dirname, './src/modules'),
      '@my-app/contract': resolve(__dirname, '../contract/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./test/setup.ts'],
    // Integration tests share a real DB — run files sequentially to avoid cross-file races
    fileParallelism: false,
  },
});
