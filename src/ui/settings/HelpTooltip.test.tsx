import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HelpTooltip, HelpTooltipScope } from './HelpTooltip';

describe('D6-HelpTooltip (§4.4)', () => {
  it('D6-HelpTooltip-closed: 閉状態で aria-expanded="false" かつ吹き出しに hidden が付く', () => {
    const html = renderToStaticMarkup(
      <HelpTooltipScope>
        <HelpTooltip id="tip-test" label="ツモ損" text="ツモ損の説明文" />
      </HelpTooltipScope>
    );

    // 理由: ボタンに aria-expanded="false" が設定されていることを検証するため
    expect(html.includes('aria-expanded="false"')).toBe(true);

    // 理由: 吹き出し要素に hidden 属性が付与されていることを検証するため
    expect(html.includes('id="tip-test"') && html.includes('hidden=""')).toBe(
      true
    );

    // 理由: aria-describedby が吹き出しの id と一致していることを検証するため
    expect(html.includes('aria-describedby="tip-test"')).toBe(true);

    // 理由: role="tooltip" が設定されていることを検証するため
    expect(html.includes('role="tooltip"')).toBe(true);
  });

  it('D6-HelpTooltip-open: 開状態(Scope初期openId指定)で aria-expanded="true" かつ hidden が無い', () => {
    const html = renderToStaticMarkup(
      <HelpTooltipScope initialState={{ openId: 'tip-test', via: 'click' }}>
        <HelpTooltip id="tip-test" label="ツモ損" text="ツモ損の説明文" />
      </HelpTooltipScope>
    );

    // 理由: ボタンに aria-expanded="true" が設定されていることを検証するため
    expect(html.includes('aria-expanded="true"')).toBe(true);

    // 理由: 開状態では hidden 属性が付いていないことを検証するため
    expect(html.includes('hidden=""')).toBe(false);

    // 理由: 吹き出しのテキストが含まれていることを検証するため
    expect(html.includes('ツモ損の説明文')).toBe(true);

    // 理由: aria-describedby が吹き出しの id と一致していることを検証するため
    expect(html.includes('aria-describedby="tip-test"')).toBe(true);
  });
});
