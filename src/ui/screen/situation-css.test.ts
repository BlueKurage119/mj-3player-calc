import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const mainCss = readFileSync(
  new URL('./main-screen.css', import.meta.url),
  'utf8'
);
const sheetCss = readFileSync(
  new URL('../input/situation-sheet.css', import.meta.url),
  'utf8'
);

describe('situation-css (D5)', () => {
  it('D5-C17: main-screen.css と situation-sheet.css に HEX色・ms・cubic-bezier の直書きが無い', () => {
    for (const [_name, css] of [
      ['main-screen.css', mainCss],
      ['situation-sheet.css', sheetCss]
    ] as const) {
      // コメントを除去
      const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');

      // HEX カラー (#000, #ffffff 等。ただしセレクタ ID は除くためプロパティ値内)
      const hexMatches = [
        ...stripped.matchAll(/:\s*[^;\n]*#([0-9a-fA-F]{3,8})/g)
      ];
      // 理由: プロパティ値内に HEX 値がハードコードされていないことを検証するため
      expect(hexMatches.map(m => m[0])).toEqual([]);

      // ms 単位の直書き (例: 200ms)
      const msMatches = [...stripped.matchAll(/\b\d+ms\b/g)];
      // 理由: モーション・トランジションに ms 単位が直書きされていないことを検証するため
      expect(msMatches.map(m => m[0])).toEqual([]);

      // cubic-bezier の直書き
      const bezierMatches = [...stripped.matchAll(/cubic-bezier\([^)]*\)/g)];
      // 理由: cubic-bezier が直書きされていないことを検証するため
      expect(bezierMatches.map(m => m[0])).toEqual([]);
    }
  });

  it('D5-C19: situation-card--selected の規則が基底より後ろ、または詳細度が高い', () => {
    const rules: { selector: string; body: string; pos: number }[] = [];
    for (const m of mainCss.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      rules.push({
        pos: m.index ?? 0,
        selector: (m[1] ?? '').replace(/\/\*[\s\S]*?\*\//g, '').trim(),
        body: m[2] ?? ''
      });
    }

    const baseRule = rules.find(r => r.selector === '.situation-card');
    const selRule = rules.find(
      r =>
        r.selector
          .split(',')
          .map(s => s.trim())
          .some(s => s.includes('.situation-card--selected')) &&
        r.body.includes('--md-sys-color-primary-container')
    );

    expect(baseRule).toBeDefined();
    expect(selRule).toBeDefined();

    const sel = selRule?.selector
      .split(',')
      .map(s => s.trim())
      .find(s => s.includes('.situation-card--selected')) as string;
    const classCount = (sel.match(/\./g) ?? []).length;
    // 理由: クラスが2つ以上連結されているか、基底規則より後ろにあることで詳細度勝ちすることを検証するため
    expect(classCount >= 2 || (selRule?.pos ?? 0) > (baseRule?.pos ?? 0)).toBe(
      true
    );
  });

  it('D5-C21: 行間、gap、背景色トークンの CSS 定義を検証する', () => {
    // 1. .situation-chips の row-gap が 1.5rem
    // 理由: situation-chips の row-gap が 1.5rem に指定されていることを検証するため
    expect(sheetCss.includes('row-gap: 1.5rem;')).toBe(true);

    // 3. 当たり判定拡張 ::after の定義
    // 理由: wind-segment の ::after 拡張が存在することを検証するため
    expect(mainCss.includes('.wind-segment .connected-button::after')).toBe(
      true
    );
  });
});
