import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Meld } from '../../core/input';
import { MeldAreaContent, meldTiles } from './MeldArea';

describe('D4: 副露領域・副露カード・追加ボタンの構造と表示 (2.5, C11, C12, C14)', () => {
  it('D4-MA1: 初期状態で追加ボタンが存在し副露カードが0枚 (renderToStaticMarkup)', () => {
    const html = renderToStaticMarkup(
      <MeldAreaContent
        melds={[]}
        onSelectMeld={() => {}}
        onRemoveMeld={() => {}}
        onAddMeld={() => {}}
      />
    );

    // .meld-add ボタンが存在すること
    expect(html.includes('class="meld-add"')).toBe(true);
    expect(html.includes('aria-label="副露を追加"')).toBe(true);

    // .meld-card が存在しないこと
    expect(html.includes('class="meld-card"')).toBe(false);
  });

  it('D4-MA2: meldTiles による牌列生成と牌姿レンダリング (ポン・明槓・暗槓・空枠)', () => {
    const tile1p = { type: 'p' as const, n: 1 as const };

    // meldTiles の純関数テスト
    expect(meldTiles({ type: 'pon', tile: null })).toEqual([]);
    expect(meldTiles({ type: 'pon', tile: tile1p })).toEqual([
      tile1p,
      tile1p,
      tile1p
    ]);
    expect(meldTiles({ type: 'kan', tile: tile1p, closed: false })).toEqual([
      tile1p,
      tile1p,
      tile1p,
      tile1p
    ]);
    expect(meldTiles({ type: 'kan', tile: tile1p, closed: true })).toEqual([
      { type: 'back' },
      tile1p,
      tile1p,
      { type: 'back' }
    ]);

    const melds: Meld[] = [
      { type: 'pon', tile: null },
      { type: 'pon', tile: tile1p },
      { type: 'kan', tile: tile1p, closed: false },
      { type: 'kan', tile: tile1p, closed: true }
    ];

    const html = renderToStaticMarkup(
      <MeldAreaContent
        melds={melds}
        onSelectMeld={() => {}}
        onRemoveMeld={() => {}}
        onAddMeld={() => {}}
      />
    );

    // 副露が 4 つあるため、追加ボタンが存在しないこと
    expect(html.includes('aria-label="副露を追加"')).toBe(false);

    // 空の副露 (melds[0]): .meld-card__empty が存在すること
    expect(html.includes('meld-card__empty')).toBe(true);

    // 各副露カードの aria-label
    expect(html.includes('aria-label="副露1を入力"')).toBe(true);
    expect(html.includes('aria-label="副露2を入力"')).toBe(true);
    expect(html.includes('aria-label="副露3を入力"')).toBe(true);
    expect(html.includes('aria-label="副露4を入力"')).toBe(true);

    // ゴミ箱ボタンの aria-label
    expect(html.includes('aria-label="副露1を削除"')).toBe(true);
    expect(html.includes('aria-label="副露2を削除"')).toBe(true);

    // 暗槓 (melds[3]) の両端裏牌: Back.svg が含まれること
    expect(html.includes('Back.svg')).toBe(true);
  });
});
