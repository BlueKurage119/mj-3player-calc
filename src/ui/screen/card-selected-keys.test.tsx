import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { handleHandBodyKey } from './HandCard';
import { handleIndicatorBodyKey } from './IndicatorCard';
import { handleMeldBodyKey } from './MeldArea';

const css = readFileSync(new URL('./main-screen.css', import.meta.url), 'utf8');

/** セレクタ文字列を含む規則ブロックの {開始位置, セレクタ} を列挙する */
const rules = () => {
  const out: { pos: number; selector: string; body: string }[] = [];
  for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    out.push({
      pos: m.index ?? 0,
      selector: (m[1] ?? '').replace(/\/\*[\s\S]*?\*\//g, '').trim(),
      body: m[2] ?? ''
    });
  }
  return out;
};

describe('D4-C29: 選択中カードの背景が基底規則に上書きされない', () => {
  for (const base of ['hand-card', 'indicator-card', 'meld-card']) {
    it(`D4-C29-${base}: --selected の規則が基底より後ろ、または詳細度が高い`, () => {
      const rs = rules();
      const baseRule = rs.find(r => r.selector === `.${base}`);
      const selRule = rs.find(
        r =>
          r.selector
            .split(',')
            .map(s => s.trim())
            .some(s => s.includes(`.${base}--selected`)) &&
          r.body.includes('--md-sys-color-primary-container')
      );
      expect(baseRule).toBeDefined();
      expect(selRule).toBeDefined();
      const sel = selRule?.selector
        .split(',')
        .map(s => s.trim())
        .find(s => s.includes(`.${base}--selected`)) as string;
      const classCount = (sel.match(/\./g) ?? []).length;
      expect(
        classCount >= 2 || (selRule?.pos ?? 0) > (baseRule?.pos ?? 0)
      ).toBe(true);
    });
  }
});

const handlers = {
  手牌: handleHandBodyKey,
  ドラ: handleIndicatorBodyKey,
  副露: handleMeldBodyKey
};

describe('D4-C30: 本体 keydown は選択中なら Enter/Space を素通し、非選択なら開く', () => {
  for (const [name, handler] of Object.entries(handlers)) {
    for (const key of ['Enter', ' ']) {
      it(`D4-C30-${name}: 選択中 × "${key}" は open せず preventDefault しない`, () => {
        let opened = 0;
        let prevented = 0;
        handler(
          { key, preventDefault: () => prevented++ },
          true,
          () => opened++
        );
        expect(opened).toBe(0);
        expect(prevented).toBe(0);
      });
      it(`D4-C30-${name}: 非選択 × "${key}" は open し preventDefault する`, () => {
        let opened = 0;
        let prevented = 0;
        handler(
          { key, preventDefault: () => prevented++ },
          false,
          () => opened++
        );
        expect(opened).toBe(1);
        expect(prevented).toBe(1);
      });
    }
  }
});
