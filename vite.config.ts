import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'MdProcessorToml',
      formats: ['cjs'],
      fileName: () => 'main.js',
    },
    outDir: 'dist',
    rollupOptions: {
      external: ['obsidian', 'electron'],
      output: {
        globals: {
          obsidian: 'obsidian',
          electron: 'electron',
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
