import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CREDIT_GROUPS, LICENSE_TEXTS } from './license-data';

describe('G3L: ライセンス掲載データ (license-data.ts)', () => {
  it('G3L-T1: CREDIT_GROUPS の節見出しが定義順と完全一致する', () => {
    expect(CREDIT_GROUPS.map(g => g.title)).toEqual([
      '三麻点数計算機',
      '素材',
      'ライブラリ',
      '手牌分解器(WASM)'
    ]);
  });

  it('G3L-T2: 第1節を除く全項目の name と全項目の https URL が仕様と一致し、第1節は name が undefined', () => {
    const firstGroup = CREDIT_GROUPS[0];
    expect(firstGroup?.entries).toHaveLength(1);
    expect(firstGroup?.entries[0]?.name).toBeUndefined();

    const otherNames = CREDIT_GROUPS.slice(1).flatMap(g =>
      g.entries.map(e => e.name)
    );
    expect(otherNames).toEqual([
      '牌画像(FluffyStuff/riichi-mahjong-tiles)',
      '牌の下地・裏(livewing/mahjong-calc)',
      'Material Symbols',
      'React(react・react-dom・scheduler)',
      'Material Web(@material/web)',
      'Lit(lit-html・lit-element・@lit/reactive-element)',
      'tslib',
      'uqr',
      'Vite',
      'vite-plugin-wasm',
      'vite-plugin-pwa',
      'Workbox',
      'decomposer(livewing/mahjong-calc)',
      'shanten-dp',
      'Rust 標準ライブラリ',
      'wasm-bindgen・js-sys',
      'serde',
      'serde-wasm-bindgen',
      'itertools',
      'either'
    ]);

    const allUrls = CREDIT_GROUPS.flatMap(g => g.entries.map(e => e.url));
    expect(allUrls.every(url => url.startsWith('https://'))).toBe(true);
  });

  it('G3L-T3: LICENSE_TEXTS の id と各 text が LICENSES/*.txt の実ファイル内容と完全一致する', () => {
    expect(LICENSE_TEXTS.map(t => t.id)).toEqual([
      'MIT',
      'Apache-2.0',
      'BSD-3-Clause'
    ]);

    const licensesDir = resolve(import.meta.dirname, '../../../LICENSES');
    const expectedFiles: Record<'MIT' | 'Apache-2.0' | 'BSD-3-Clause', string> =
      {
        MIT: readFileSync(resolve(licensesDir, 'MIT.txt'), 'utf8'),
        'Apache-2.0': readFileSync(
          resolve(licensesDir, 'Apache-2.0.txt'),
          'utf8'
        ),
        'BSD-3-Clause': readFileSync(
          resolve(licensesDir, 'BSD-3-Clause.txt'),
          'utf8'
        )
      };

    for (const item of LICENSE_TEXTS) {
      expect(item.text).toBe(expectedFiles[item.id]);
    }
  });

  it('F31-D4: shanten-dp の項目(MIT・Copyright (c) 2026 tomohxx)が含まれる', () => {
    const entries = CREDIT_GROUPS.flatMap(g => g.entries);
    const shantenDp = entries.find(e => e.name === 'shanten-dp');
    expect(shantenDp).toEqual({
      name: 'shanten-dp',
      license: 'MIT',
      copyrights: ['Copyright (c) 2026 tomohxx'],
      url: 'https://github.com/tomohxx/shanten-dp-rust'
    });
  });
});
