import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/content.ts'],
  format: ['iife'],
  minify: true,
  sourcemap: false,
  clean: true,
  outDir: 'dist',
  dts: false,
  bundle: true,
  loader: {
    '.css': 'css',
  },
});
