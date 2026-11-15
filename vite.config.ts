import fs from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react-swc';
import type { Plugin, UserConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import wasm from 'vite-plugin-wasm';
import { readTokenValues } from './scripts/theme-colors.ts';
import { SEED } from './scripts/theme-seed.ts';

if (!/^#[0-9A-Fa-f]{6}$/.test(SEED)) {
  throw new Error(`SEED の形式が不正です: ${SEED}`);
}

const tokensCssPath = path.resolve(
  import.meta.dirname,
  'src/ui/theme/tokens.css'
);
const tokensCss = fs.readFileSync(tokensCssPath, 'utf-8');
const SURFACE_ROLE = 'surface';
const lightTokens = readTokenValues(tokensCss, 'light', [SURFACE_ROLE]);
const lightSurface = lightTokens[SURFACE_ROLE];
if (!lightSurface) {
  throw new Error('ライトテーマの --md-sys-color-surface が取得できません。');
}

function injectThemeColorPlugin(themeColor: string): Plugin {
  return {
    name: 'inject-theme-color',
    transformIndexHtml(html) {
      return html.replaceAll('%THEME_COLOR%', themeColor);
    }
  };
}

export default {
  base: '/mj-3player-calc/',
  plugins: [
    react(),
    wasm(),
    injectThemeColorPlugin(SEED),
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
        theme_color: SEED,
        background_color: lightSurface,
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
