import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readTokenValues } from './theme-colors.ts';

// Issue #158 M1・M3・M4・M8: ビルド成果物(本番・プレビュー)の検査。
// vite.config.ts は process.env を読み込み時に解決するため、子プロセスでビルドする。
const ROOT = path.resolve(__dirname, '..');
const tokensCss = fs.readFileSync(
  path.join(ROOT, 'src/ui/theme/tokens.css'),
  'utf-8'
);
const light = readTokenValues(tokensCss, 'light');
const dark = readTokenValues(tokensCss, 'dark');

function buildTo(env: 'production' | 'preview'): string {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), `sbg-${env}-`));
  execFileSync(
    path.join(ROOT, 'node_modules/.bin/vite'),
    ['build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'silent'],
    { cwd: ROOT, env: { ...process.env, VITE_APP_ENV: env }, stdio: 'pipe' }
  );
  return outDir;
}

const themeColors = (html: string) => {
  const re =
    /<meta\s+name="theme-color"\s+media="\(prefers-color-scheme: (light|dark)\)"\s+content="([^"]+)"/g;
  return [...html.matchAll(re)].map(m => [m[1], m[2]]);
};

describe.each([
  ['production', 'surface-container'],
  ['preview', 'quaternary']
] as const)('ステータスバー対策のビルド成果物: %s', (env, role) => {
  it(`ガード要素・theme-color・manifest が ${role} に一致する`, () => {
    const outDir = buildTo(env);
    try {
      const html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf-8');

      // M1: ガード要素は #root より前に1つだけ
      expect(html.match(/class="status-bar-guard"/g)).toHaveLength(1);
      expect(html.indexOf('class="status-bar-guard"')).toBeLessThan(
        html.indexOf('<div id="root">')
      );

      // M3: CSS アセットにセレクタが残る
      const assets = path.join(outDir, 'assets');
      const cssTexts = fs
        .readdirSync(assets)
        .filter(f => f.endsWith('.css'))
        .map(f => fs.readFileSync(path.join(assets, f), 'utf-8'));
      expect(cssTexts.some(t => t.includes('status-bar-guard'))).toBe(true);

      // M4: theme-color meta
      expect(themeColors(html)).toEqual([
        ['light', light[role]],
        ['dark', dark[role]]
      ]);

      // M8: manifest の theme_color / background_color は dark 値
      const manifest = JSON.parse(
        fs.readFileSync(path.join(outDir, 'manifest.webmanifest'), 'utf-8')
      );
      expect(manifest.theme_color).toBe(dark[role]);
      expect(manifest.background_color).toBe(dark[role]);
    } finally {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  }, 120_000);
});
