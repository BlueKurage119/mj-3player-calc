import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Meld } from '../../core/input';
import { MeldAreaContent, meldTiles } from './MeldArea';

describe('D4: 副露領域・副露カード・追加ボタンの構造と表示 (2.5, C11, C12, C14)', () => {
  it('D4-MA1: 初期状態で追加ボタンが存在し副露カードが0枚 (renderToStaticMarkup)', () => {
    const html = renderToStaticMarkup(
      <MeldAreaContent
        red={1}
        melds={[]}
        selectedIndex={null}
        buffer=""
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
    expect(meldTiles({ type: 'pon', tile: null }, 1)).toEqual([]);
    expect(meldTiles({ type: 'pon', tile: tile1p }, 1)).toEqual([
      tile1p,
      tile1p,
      tile1p
    ]);
    expect(meldTiles({ type: 'kan', tile: tile1p, closed: false }, 1)).toEqual([
      tile1p,
      tile1p,
      tile1p,
      tile1p
    ]);
    expect(meldTiles({ type: 'kan', tile: tile1p, closed: true }, 1)).toEqual([
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
        red={1}
        melds={melds}
        selectedIndex={null}
        buffer=""
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

  it('D4-C14g-4: 副露カードは1行(meld-card__row 内で牌の行の後ろに消すボタン)で上段の行が無い', () => {
    const html = renderToStaticMarkup(
      <MeldAreaContent
        red={1}
        melds={[{ type: 'pon', tile: { type: 'p', n: 1 } }]}
        selectedIndex={null}
        buffer=""
        onSelectMeld={() => {}}
        onRemoveMeld={() => {}}
        onAddMeld={() => {}}
      />
    );
    expect(html.includes('meld-card__top-row')).toBe(false);
    const row = html.indexOf('meld-card__row');
    const body = html.indexOf('meld-card__body');
    const clear = html.indexOf('card-clear-zone');
    expect(row).toBeGreaterThan(-1);
    expect(body).toBeGreaterThan(row);
    expect(clear).toBeGreaterThan(body);
  });

  it('D4-C22: meldTiles が instantiateMeld の展開結果に合わせる (red=0/1/2、5p)', () => {
    const p5 = { type: 'p' as const, n: 5 as const, red: false };
    const p5r = { type: 'p' as const, n: 5 as const, red: true };
    const back = { type: 'back' as const };
    const pon = (red: boolean): Meld => ({
      type: 'pon',
      tile: red ? p5r : p5
    });
    const minkan: Meld = { type: 'kan', tile: p5, closed: false };
    const ankan: Meld = { type: 'kan', tile: p5, closed: true };

    // red=0: 赤なし
    expect(meldTiles(pon(false), 0)).toEqual([p5, p5, p5]);
    expect(meldTiles(pon(true), 0)).toEqual([p5, p5, p5]);
    expect(meldTiles(minkan, 0)).toEqual([p5, p5, p5, p5]);
    expect(meldTiles(ankan, 0)).toEqual([back, p5, p5, back]);

    // red=1
    expect(meldTiles(pon(false), 1)).toEqual([p5, p5, p5]);
    expect(meldTiles(pon(true), 1)).toEqual([p5, p5, p5r]);
    expect(meldTiles(minkan, 1)).toEqual([p5, p5, p5, p5r]);
    expect(meldTiles(ankan, 1)).toEqual([back, p5, p5r, back]);

    // red=2
    expect(meldTiles(pon(false), 2)).toEqual([p5, p5, p5r]);
    expect(meldTiles(pon(true), 2)).toEqual([p5, p5r, p5r]);
    expect(meldTiles(minkan, 2)).toEqual([p5, p5, p5r, p5r]);
    expect(meldTiles(ankan, 2)).toEqual([back, p5r, p5r, back]);

    // 5 以外は従来どおり
    const s1 = { type: 's' as const, n: 1 as const };
    expect(meldTiles({ type: 'pon', tile: s1 }, 2)).toEqual([s1, s1, s1]);
    expect(meldTiles({ type: 'kan', tile: s1, closed: true }, 2)).toEqual([
      back,
      s1,
      s1,
      back
    ]);
  });
});
