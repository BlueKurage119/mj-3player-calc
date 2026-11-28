import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildTo, removeBuild } from './build-artifacts.ts';
import { readTokenValues } from './theme-colors.ts';

// 本番ビルドで CSS が落ちていないこと、および Issue #158 M1・M3・M4・M8 のビルド成果物(本番・プレビュー)を検査する。
// package.json の sideEffects: ["*.css"] により、バレル(index.ts)内の CSS 副作用 import は
// 本番ビルドで落ちる(dev では再現しない)。CSS は使うコンポーネントから直接 import すること。
// vite.config.ts は process.env を読み込み時に解決するため、子プロセスでビルドする。

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.resolve(ROOT, 'src');
// ビルド成果物でトークンは別経路(main.tsx 直接 import)なので対象外
const EXCLUDED_DIR = `ui${path.sep}theme${path.sep}`;

const tokensCss = fs.readFileSync(
  path.join(ROOT, 'src/ui/theme/tokens.css'),
  'utf-8'
);
const light = readTokenValues(tokensCss, 'light');
const dark = readTokenValues(tokensCss, 'dark');

const collectCss = (dir: string): string[] =>
  fs.readdirSync(dir).flatMap(name => {
    const targetPath = path.join(dir, name);
    if (fs.statSync(targetPath).isDirectory()) return collectCss(targetPath);
    return name.endsWith('.css') ? [targetPath] : [];
  });

// ファイル中で最初に現れるクラスセレクタ名を機械的に抽出する
const firstClassName = (css: string): string | undefined => {
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return /\.([A-Za-z_][\w-]*)/.exec(body)?.[1];
};

const themeColors = (html: string) => {
  const re =
    /<meta\s+name="theme-color"\s+media="\(prefers-color-scheme: (light|dark)\)"\s+content="([^"]+)"/g;
  return [...html.matchAll(re)].map(m => [m[1], m[2]]);
};

describe.each([
  ['本番', 'production', 'surface-container'],
  ['プレビュー', 'preview', 'quaternary']
] as const)('ビルド成果物の検査: %s', (label, env, role) => {
  let outDir: string | undefined;

  const getOutDir = (): string => {
    if (outDir === undefined) {
      throw new Error('ビルド出力ディレクトリが未初期化です');
    }
    return outDir;
  };

  beforeAll(() => {
    outDir = buildTo(env);
  }, 120_000);

  afterAll(() => {
    removeBuild(outDir);
  });

  if (env === 'production') {
    it('I161-B1: src 配下の各 CSS の固有クラスが本番ビルド成果物に含まれる', () => {
      const dir = getOutDir();
      const bundledCss = collectCss(dir)
        .map(f => fs.readFileSync(f, 'utf8'))
        .join('\n');
      expect(bundledCss.length).toBeGreaterThan(0);

      const targets = collectCss(SRC).filter(
        f => !path.relative(SRC, f).startsWith(EXCLUDED_DIR)
      );
      expect(targets.length).toBeGreaterThan(0);

      const missing = targets.flatMap(f => {
        const cls = firstClassName(fs.readFileSync(f, 'utf8'));
        if (cls === undefined) {
          return [`${path.relative(SRC, f)}: クラスセレクタなし`];
        }
        // バンドル CSS は全ファイル連結で、クラス名の出現有無だけを見るため部分一致とする
        return bundledCss.includes(`.${cls}`)
          ? []
          : [`${path.relative(SRC, f)}: .${cls}`];
      });
      expect(missing).toEqual([]);
    });
  }

  it(`I161-M1-${label}: ガード要素が #root より前にちょうど1つある`, () => {
    const html = fs.readFileSync(path.join(getOutDir(), 'index.html'), 'utf-8');
    expect(html.match(/class="status-bar-guard"/g)).toHaveLength(1);
    expect(html.indexOf('class="status-bar-guard"')).toBeLessThan(
      html.indexOf('<div id="root">')
    );
  });

  it(`I161-M3-${label}: CSS アセットに status-bar-guard セレクタが残る`, () => {
    const assets = path.join(getOutDir(), 'assets');
    const cssTexts = fs
      .readdirSync(assets)
      .filter(f => f.endsWith('.css'))
      .map(f => fs.readFileSync(path.join(assets, f), 'utf-8'));
    // 圧縮後の CSS アセット内で該当セレクタ文字列が出現するかだけを確認するため部分一致とする
    expect(cssTexts.some(t => t.includes('status-bar-guard'))).toBe(true);
  });

  it(`I161-M4-${label}: theme-color meta が ${role} の light/dark 値に一致する`, () => {
    const html = fs.readFileSync(path.join(getOutDir(), 'index.html'), 'utf-8');
    expect(themeColors(html)).toEqual([
      ['light', light[role]],
      ['dark', dark[role]]
    ]);
  });

  it(`I161-M8-${label}: manifest の theme_color・background_color が ${role} の dark 値に一致する`, () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(getOutDir(), 'manifest.webmanifest'), 'utf-8')
    );
    expect(manifest.theme_color).toBe(dark[role]);
    expect(manifest.background_color).toBe(dark[role]);
  });
});

describe('buildTo / removeBuild の一時ディレクトリ管理', () => {
  it('I161-H1: ビルド失敗時に一時ディレクトリを残さず例外を再送出する', () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i161-h1-'));
    try {
      expect(() =>
        buildTo('production', {
          tmpRoot,
          run: outDir => {
            expect(fs.existsSync(outDir)).toBe(true);
            throw new Error('注入');
          }
        })
      ).toThrow('注入');
      expect(fs.readdirSync(tmpRoot)).toEqual([]);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('I161-H2: ビルド成功時は tmpRoot 配下の作成済みディレクトリを返し、run に同じパスと env を渡す', () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i161-h2-'));
    try {
      const calls: Array<[string, string]> = [];
      const outDir = buildTo('preview', {
        tmpRoot,
        run: (dir, env) => {
          calls.push([dir, env]);
        }
      });
      expect(path.dirname(outDir)).toBe(tmpRoot);
      const basename = path.basename(outDir);
      expect(fs.readdirSync(tmpRoot)).toEqual([basename]);
      expect(basename.startsWith('mj3-build-preview-')).toBe(true);
      expect(calls).toEqual([[outDir, 'preview']]);

      removeBuild(outDir);
      expect(fs.readdirSync(tmpRoot)).toEqual([]);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});
