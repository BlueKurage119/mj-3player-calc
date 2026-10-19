import react from '@vitejs/plugin-react-swc';
import type { UserConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import wasm from 'vite-plugin-wasm';

export default {
  plugins: [
    react(),
    wasm(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,wasm,svg,png}']
      }
    })
  ],
  build: {
    // top-level await
    target: ['chrome89', 'edge89', 'firefox89', 'safari15', 'es2022']
  }
} satisfies UserConfig;
