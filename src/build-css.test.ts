import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { build } from 'vite';
import { describe, expect, it } from 'vitest';

// 本番ビルドで CSS が落ちていないことを検査する。
// package.json の sideEffects: ["*.css"] により、バレル(index.ts)内の CSS 副作用 import は
// 本番ビルドで落ちる(dev では再現しない)。CSS は使うコンポーネントから直接 import すること。

const SRC = __dirname;
// ビルド成果物でトークンは別経路(main.tsx 直接 import)なので対象外
const EXCLUDED_DIR = `ui${sep}theme${sep}`;

const collectCss = (dir: string): string[] =>
  readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return collectCss(path);
    return name.endsWith('.css') ? [path] : [];
  });

// ファイル中で最初に現れるクラスセレクタ名を機械的に抽出する
const firstClassName = (css: string): string | undefined => {
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return /\.([A-Za-z_][\w-]*)/.exec(body)?.[1];
};

describe('本番ビルドの CSS', () => {
  it('src 配下の各 CSS の固有クラスがビルド成果物に含まれる', async () => {
    const result = await build({
      configFile: 'vite.config.ts',
      logLevel: 'silent',
      build: { write: false }
    });
    const outputs = (Array.isArray(result) ? result : [result]).flatMap(r =>
      'output' in r ? r.output : []
    );
    const bundledCss = outputs
      .filter(o => o.type === 'asset' && o.fileName.endsWith('.css'))
      .map(o => (o.type === 'asset' ? String(o.source) : ''))
      .join('\n');
    expect(bundledCss.length).toBeGreaterThan(0);

    const targets = collectCss(SRC).filter(
      f => !relative(SRC, f).startsWith(EXCLUDED_DIR)
    );
    expect(targets.length).toBeGreaterThan(0);

    const missing = targets.flatMap(f => {
      const cls = firstClassName(readFileSync(f, 'utf8'));
      if (cls === undefined) return [`${relative(SRC, f)}: クラスセレクタなし`];
      return bundledCss.includes(`.${cls}`)
        ? []
        : [`${relative(SRC, f)}: .${cls}`];
    });
    expect(missing).toEqual([]);
  }, 60_000);
});
