import fs from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react-swc';
import type { Plugin, UserConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import wasm from 'vite-plugin-wasm';
import {
  type ResolvedBuildConfig,
  resolveBuildConfig
} from './scripts/build-config.ts';
import {
  type StatusBarColors,
  injectStatusBarColors,
  readStatusBarColors
} from './scripts/theme-colors.ts';

const buildConfig = resolveBuildConfig(process.env);
const tokensCssPath = path.resolve(
  import.meta.dirname,
  'src/ui/theme/tokens.css'
);
const tokensCss = fs.readFileSync(tokensCssPath, 'utf-8');
const statusBarColors = readStatusBarColors(
  tokensCss,
  buildConfig.statusBarColorRole
);
const manifestThemeColor = readStatusBarColors(tokensCss, 'surface').light;
const appVersion: string = JSON.parse(
  fs.readFileSync(path.resolve(import.meta.dirname, 'package.json'), 'utf-8')
).version;

function injectThemeColorPlugin(
  colors: StatusBarColors,
  config: ResolvedBuildConfig
): Plugin {
  return {
    name: 'inject-theme-color',
    transformIndexHtml(html) {
      let transformed = injectStatusBarColors(html, colors);
      if (config.isPreview) {
        const htmlTag = '<html lang="ja">';
        if (!transformed.includes(htmlTag)) {
          throw new Error('index.html に <html lang="ja"> が見つかりません。');
        }
        transformed = transformed.replace(
          htmlTag,
          `<html lang="ja" data-app-env="preview" data-preview-color="${config.previewColor}">`
        );
      }
      return transformed;
    }
  };
}

export default {
  base: buildConfig.base,
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __IS_PREVIEW__: JSON.stringify(buildConfig.isPreview),
    __SHARE_URL__: JSON.stringify(buildConfig.shareUrl)
  },
  plugins: [
    react(),
    wasm(),
    injectThemeColorPlugin(statusBarColors, buildConfig),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      manifest: {
        name: '三麻点数計算機',
        short_name: '三麻計算機',
        description:
          '三人麻雀の点数計算機。和了形・聴牌形の役と打点、向聴数と何切るを表示する',
        lang: 'ja',
        start_url: buildConfig.base,
        scope: buildConfig.base,
        display: 'standalone',
        theme_color: manifestThemeColor,
        background_color: manifestThemeColor,
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
        globPatterns: ['**/*.{js,css,html,wasm,svg,png}'],
        ...(buildConfig.isPreview
          ? { navigateFallbackDenylist: [/^\/robots\.txt$/] }
          : {})
      }
    })
  ],
  build: {
    // top-level await
    target: ['chrome89', 'edge89', 'firefox89', 'safari15', 'es2022']
  }
} satisfies UserConfig;
