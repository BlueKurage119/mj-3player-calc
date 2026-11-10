import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./settings.css', import.meta.url), 'utf8');

const block = (selector: string): string => {
  const escaped = selector.replace(/[.[\]]/g, '\\$&');
  return css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{[^}]*\\}`))?.[0] ?? '';
};

describe('D6-settings-css: help の当たり判定と間隔 (§4.4・A19)', () => {
  it('D6-css-help-hit-area: 当たり判定は 48×48 で、右端を見た目に揃え右へ張り出さない', () => {
    const b = block('.help-tooltip__button::before');
    // 理由: 右隣の操作要素と当たり判定が重ならないよう、右端をアイコンに揃えるため
    expect(/width:\s*48px/.test(b)).toBe(true);
    expect(/height:\s*48px/.test(b)).toBe(true);
    expect(/right:\s*0\b/.test(b)).toBe(true);
    expect(/left:/.test(b)).toBe(false);
  });

  it('D6-css-heading-row-height: 見出し行は 48dp 以上で、折り返し後に当たり判定が下の行へはみ出さない', () => {
    expect(/min-height:\s*3rem/.test(block('.settings-row__label-group'))).toBe(
      true
    );
  });

  it('D6-css-row-wrap-and-gap: 本場・供託と選択項目は折り返せ、行間・列間は 0.5rem 以上', () => {
    for (const sel of ['.settings-row--point', '.settings-row--choice']) {
      const b = block(sel);
      expect(/flex-wrap:\s*wrap/.test(b)).toBe(true);
      const gap = b.match(/gap:\s*([\d.]+)rem(?:\s+([\d.]+)rem)?/);
      expect(gap).not.toBeNull();
      expect(Number(gap?.[1])).toBeGreaterThanOrEqual(0.5);
      expect(Number(gap?.[2] ?? gap?.[1])).toBeGreaterThanOrEqual(0.5);
    }
    expect(
      Number(block('.settings-detail-group').match(/gap:\s*([\d.]+)rem/)?.[1])
    ).toBeGreaterThanOrEqual(0.5);
  });

  it('D6-css-tooltip-bridge: 吹き出しの上端に、ボタンとの隙間(4px)と同寸の透明な橋がある', () => {
    const bubble = block('.help-tooltip__bubble');
    const gap = Number(bubble.match(/top:\s*calc\(100%\s*\+\s*(\d+)px\)/)?.[1]);
    const bridge = block('.help-tooltip__bubble::before');
    // 理由: 斜め経路で隙間に入っても pointerleave で吹き出しが消えないようにするため
    expect(gap).toBe(4);
    expect(Number(bridge.match(/top:\s*-(\d+)px/)?.[1])).toBe(gap);
    expect(Number(bridge.match(/height:\s*(\d+)px/)?.[1])).toBe(gap);
    expect(/left:\s*0\b/.test(bridge)).toBe(true);
    expect(/right:\s*0\b/.test(bridge)).toBe(true);
    expect(/position:\s*absolute/.test(bridge)).toBe(true);
  });
});
