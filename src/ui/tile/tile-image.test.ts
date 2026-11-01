import { describe, expect, it } from 'vitest';
import type { Tile, TileOrBack } from '../../core/tile';
import { tileImageOf, tileLabelOf } from './tile-image';

describe('C3: 牌画像マッピング (tileImageOf)', () => {
  it('C3-T01: back は base が base/Back.svg で face が null', () => {
    const tile: TileOrBack = { type: 'back' };
    const res = tileImageOf(tile);
    expect(res.face).toBeNull();
    // Viteの解決パスプレフィックスに依存しないようbase配下のファイルパス部分一致で検証
    expect(res.base).toContain('base/Back.svg');
  });

  it('C3-T02: m1, m9, p1, s9 の URL 検証', () => {
    const m1 = tileImageOf({ type: 'm', n: 1 });
    // Viteの解決パスプレフィックスに依存しないようbase配下のファイルパスおよび図柄ファイル名部分一致で検証
    expect(m1.base).toContain('base/Front.svg');
    expect(m1.face).toContain('Man1.svg');

    const m9 = tileImageOf({ type: 'm', n: 9 });
    // Viteの解決パスプレフィックスに依存しないようbase配下のファイルパスおよび図柄ファイル名部分一致で検証
    expect(m9.base).toContain('base/Front.svg');
    expect(m9.face).toContain('Man9.svg');

    const p1 = tileImageOf({ type: 'p', n: 1 });
    // Viteの解決パスプレフィックスに依存しないようbase配下のファイルパスおよび図柄ファイル名部分一致で検証
    expect(p1.base).toContain('base/Front.svg');
    expect(p1.face).toContain('Pin1.svg');

    const s9 = tileImageOf({ type: 's', n: 9 });
    // Viteの解決パスプレフィックスに依存しないようbase配下のファイルパスおよび図柄ファイル名部分一致で検証
    expect(s9.base).toContain('base/Front.svg');
    expect(s9.face).toContain('Sou9.svg');
  });

  it('C3-T03: 赤5筒 (p5 red:true) は Pin5-Dora.svg', () => {
    const p5Red = tileImageOf({ type: 'p', n: 5, red: true });
    // Viteの解決パスプレフィックスに依存しないようbase配下のファイルパスおよび図柄ファイル名部分一致で検証
    expect(p5Red.base).toContain('base/Front.svg');
    expect(p5Red.face).toContain('Pin5-Dora.svg');
  });

  it('C3-T04: 通常5索 (s5 red:false) は Sou5.svg', () => {
    const s5Normal = tileImageOf({ type: 's', n: 5, red: false });
    // Viteの解決パスプレフィックスに依存しないようbase配下のファイルパスおよび図柄ファイル名部分一致で検証
    expect(s5Normal.base).toContain('base/Front.svg');
    expect(s5Normal.face).toContain('Sou5.svg');
  });

  it('C3-T05: z1..z7 の 7 種 (白 z5 は face: null)', () => {
    const z1 = tileImageOf({ type: 'z', n: 1 });
    // Viteの解決パスプレフィックスに依存しないようbase配下のファイルパスおよび図柄ファイル名部分一致で検証
    expect(z1.base).toContain('base/Front.svg');
    expect(z1.face).toContain('Ton.svg');

    const z2 = tileImageOf({ type: 'z', n: 2 });
    // Viteの解決パスプレフィックスに依存しないようbase配下のファイルパスおよび図柄ファイル名部分一致で検証
    expect(z2.base).toContain('base/Front.svg');
    expect(z2.face).toContain('Nan.svg');

    const z3 = tileImageOf({ type: 'z', n: 3 });
    // Viteの解決パスプレフィックスに依存しないようbase配下のファイルパスおよび図柄ファイル名部分一致で検証
    expect(z3.base).toContain('base/Front.svg');
    expect(z3.face).toContain('Shaa.svg');

    const z4 = tileImageOf({ type: 'z', n: 4 });
    // Viteの解決パスプレフィックスに依存しないようbase配下のファイルパスおよび図柄ファイル名部分一致で検証
    expect(z4.base).toContain('base/Front.svg');
    expect(z4.face).toContain('Pei.svg');

    // 白 (z5) は face: null
    const z5 = tileImageOf({ type: 'z', n: 5 });
    // Viteの解決パスプレフィックスに依存しないようbase配下のファイルパス部分一致で検証
    expect(z5.base).toContain('base/Front.svg');
    expect(z5.face).toBeNull();

    const z6 = tileImageOf({ type: 'z', n: 6 });
    // Viteの解決パスプレフィックスに依存しないようbase配下のファイルパスおよび図柄ファイル名部分一致で検証
    expect(z6.base).toContain('base/Front.svg');
    expect(z6.face).toContain('Hatsu.svg');

    const z7 = tileImageOf({ type: 'z', n: 7 });
    // Viteの解決パスプレフィックスに依存しないようbase配下のファイルパスおよび図柄ファイル名部分一致で検証
    expect(z7.base).toContain('base/Front.svg');
    expect(z7.face).toContain('Chun.svg');
  });

  it('C3-T06: 三麻で使わない牌 (m5, m2) で例外を投げる', () => {
    // 2m
    expect(() => tileImageOf({ type: 'm', n: 2 } as Tile)).toThrow(
      '三麻で使わない牌'
    );
    // 5m (通常・赤)
    expect(() => tileImageOf({ type: 'm', n: 5, red: false } as Tile)).toThrow(
      '三麻で使わない牌'
    );
    expect(() => tileImageOf({ type: 'm', n: 5, red: true } as Tile)).toThrow(
      '三麻で使わない牌'
    );
  });
});

describe('C3: 牌ラベルマッピング (tileLabelOf)', () => {
  it('C3-T07: 赤5筒、發、裏 を正しく返す', () => {
    // 完全一致で検証
    expect(tileLabelOf({ type: 'p', n: 5, red: true })).toBe('赤5筒');
    expect(tileLabelOf({ type: 'z', n: 6 })).toBe('發');
    expect(tileLabelOf({ type: 'back' })).toBe('裏');
  });

  it('C3-T08: 三麻で使わない牌 (m2) で例外を投げる', () => {
    expect(() => tileLabelOf({ type: 'm', n: 2 } as Tile)).toThrow(
      '三麻で使わない牌'
    );
  });
});
