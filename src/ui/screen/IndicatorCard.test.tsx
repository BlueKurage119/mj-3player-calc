import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { IndicatorCardContent } from './IndicatorCard';

describe('D4: ドラ・裏ドラカードの構造と表示 (2.4, C14, C15)', () => {
  it('D4-IC1: IndicatorCard の見出しとHTML構造 (renderToStaticMarkup)', () => {
    const htmlDora = renderToStaticMarkup(
      <IndicatorCardContent
        target="dora"
        tiles={[]}
        onSelect={() => {}}
        onClear={() => {}}
      />
    );

    // 外枠 .indicator-card に role 属性がないこと
    const doraCardTagMatch = htmlDora.match(
      /<div[^>]*class="[^"]*indicator-card[^"]*"[^>]*>/
    );
    expect(doraCardTagMatch).not.toBeNull();
    const doraCardTag = doraCardTagMatch?.[0] ?? '';
    // 理由: role 属性が一切含まれないことを検証するため
    expect(doraCardTag.includes('role=')).toBe(false);

    // 見出し「ドラ」が含まれること
    expect(htmlDora.includes('indicator-card__title">ドラ<')).toBe(true);

    // 本体に role="button" と aria-label="ドラ表示牌を入力" があること
    const bodyMatch = htmlDora.match(
      /<div[^>]*class="[^"]*indicator-card__body[^"]*"[^>]*>/
    );
    expect(bodyMatch).not.toBeNull();
    const bodyTag = bodyMatch?.[0] ?? '';
    // 理由: role="button" の付与を完全一致で検証するため
    expect(bodyTag.includes('role="button"')).toBe(true);
    // 理由: aria-label="ドラ表示牌を入力" の付与を完全一致で検証するため
    expect(bodyTag.includes('aria-label="ドラ表示牌を入力"')).toBe(true);

    // 0枚でゴミ箱ボタンが disabled 属性を持つこと
    const clearButtonMatch = htmlDora.match(
      /<button[^>]*class="[^"]*card-clear-button[^"]*"[^>]*>/
    );
    expect(clearButtonMatch).not.toBeNull();
    const clearButtonTag = clearButtonMatch?.[0] ?? '';
    // 理由: disabled 属性が存在することを検証するため
    expect(
      clearButtonTag.includes('disabled=""') ||
        clearButtonTag.includes('disabled')
    ).toBe(true);
    // 理由: aria-label="ドラ表示牌をクリア" を検証するため
    expect(clearButtonTag.includes('aria-label="ドラ表示牌をクリア"')).toBe(
      true
    );
  });

  it('D4-IC2: 裏ドラカードの文言と表示牌レンダリング', () => {
    const tiles = [{ type: 'p' as const, n: 1 as const }];

    const htmlUradora = renderToStaticMarkup(
      <IndicatorCardContent
        target="uradora"
        tiles={tiles}
        onSelect={() => {}}
        onClear={() => {}}
      />
    );

    // 見出し「裏ドラ」
    expect(htmlUradora.includes('indicator-card__title">裏ドラ<')).toBe(true);
    // aria-label="裏ドラ表示牌を入力"
    expect(htmlUradora.includes('aria-label="裏ドラ表示牌を入力"')).toBe(true);

    // 牌が存在するためゴミ箱ボタンが disabled でないこと
    const clearButtonMatch = htmlUradora.match(
      /<button[^>]*class="[^"]*card-clear-button[^"]*"[^>]*>/
    );
    expect(clearButtonMatch).not.toBeNull();
    const clearButtonTag = clearButtonMatch?.[0] ?? '';
    // 理由: 牌がある場合は disabled でないことを検証するため
    expect(clearButtonTag.includes('disabled')).toBe(false);
  });
});
