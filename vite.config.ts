import fs from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react-swc';
import type { Plugin, UserConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import wasm from 'vite-plugin-wasm';
import {
  type StatusBarColors,
  injectStatusBarColors,
  readStatusBarColors
} from './scripts/theme-colors.ts';

const tokensCssPath = path.resolve(
  import.meta.dirname,
  'src/ui/theme/tokens.css'
);
const statusBarColors = readStatusBarColors(
  fs.readFileSync(tokensCssPath, 'utf-8')
);
const appVersion: string = JSON.parse(
  fs.readFileSync(path.resolve(import.meta.dirname, 'package.json'), 'utf-8')
).version;

function injectThemeColorPlugin(colors: StatusBarColors): Plugin {
  return {
    name: 'inject-theme-color',
    transformIndexHtml(html) {
      return injectStatusBarColors(html, colors);
    }
  };
}

export default {
  base: '/mj-3player-calc/',
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
  },
  plugins: [
    react(),
    wasm(),
    injectThemeColorPlugin(statusBarColors),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      manifest: {
        name: '三麻点数計算機',
        short_name: '三麻計算機',
        description:
          '三人麻雀の点数計算機。和了形・聴牌形の役と打点、向聴数と何切るを表示する',
        lang: 'ja',
        start_url: '/mj-3player-calc/',
        scope: '/mj-3player-calc/',
        display: 'standalone',
        theme_color: statusBarColors.light,
        background_color: statusBarColors.light,
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
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
