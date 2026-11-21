import type { UserConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

export default {
  root: 'bench/engine',
  plugins: [wasm()],
  worker: {
    format: 'es',
    plugins: () => [wasm()]
  },
  build: {
    outDir: '../../dist-engine-bench',
    emptyOutDir: true,
    target: ['chrome89', 'edge89', 'firefox89', 'safari15', 'es2022']
  }
} satisfies UserConfig;
