import { describe, expect, it } from 'vitest';
import type { Tile, TileOrBack } from '../../core/tile';
import type { ShareData } from './share-data';
import { layoutShareImage } from './share-layout';
import { SHARE_THEME_V1 } from './share-theme';

const t = (n: number): Tile => ({ type: 'p', n }) as Tile;
const tiles = (k: number): Tile[] => Array.from({ length: k }, () => t(1));
const backs = (k: number): TileOrBack[] =>
  Array.from({ length: k }, () => ({ type: 'back' }));
const meld = (k: number): TileOrBack[] => tiles(k);

interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

function overlaps(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

function overlapArea(a: Box, b: Box): number {
  const w = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
  const h = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  return w * h;
}

function data(
  body: number,
  melds: number[],
  by: 'ron' | 'tsumo',
  visibleDoraCount: number
): ShareData {
  const pad5 = (k: number): TileOrBack[] => [...tiles(k), ...backs(5 - k)];
  return {
    by,
    bodyTiles: tiles(body),
    meldTiles: melds.map(meld),
    horaTile: t(1),
    dora: pad5(visibleDoraCount),
    uradora: pad5(visibleDoraCount),
    nuki: 4,
    continueCount: 1,
    deposit: 0,
    isYakuman: false,
    yaku: [{ label: '立直', han: '1飜' }],
    rankText: '30符 1飜',
    limitName: null,
    totalDigits: by === 'ron' ? '1,000' : '1,100',
    totalUnit: '点',
    declarationText: by === 'tsumo' ? '300・500' : null,
    situation: '南場・南家',
    appName: '三麻点数計算機',
    url: null,
    urlLabel: null
  };
}

const cases: [string, ShareData][] = [
  ['14枚(13枚+和了牌・ロン)', data(13, [], 'ron', 4)],
  ['14枚(13枚+和了牌・ツモ)', data(13, [], 'tsumo', 4)],
  ['副露4組(ポン4組・ツモ)', data(1, [3, 3, 3, 3], 'tsumo', 4)],
  ['副露4組(槓子4組・ロン)', data(1, [4, 4, 4, 4], 'ron', 5)],
  ['副露4組(槓子4組・ドラ各5枚・ツモ)', data(0, [4, 4, 4, 4], 'tsumo', 5)]
];

describe('H2-AC10: ロン/ツモの印の配置・非交差・背面土台仕様', () => {
  for (const [name, d] of cases) {
    it(`H2-AC10: ${name}で印と文字の非交差・左基準配置・和了牌内包を満たす`, () => {
      const l = layoutShareImage(d, SHARE_THEME_V1);
      const b = l.byBadge;

      // 牌列は x=64 起点・y=293 の左基準
      expect(l.handTiles[0]?.x).toBe(64);
      expect(l.handTiles[0]?.y).toBe(293);

      const badgeBox: Box = {
        x0: b.x,
        x1: b.x + b.width,
        y0: b.y,
        y1: b.y + b.height
      };

      // 文字帯の文字矩形 (全角2文字 × fontSize)
      const labelW = b.label.length * b.fontSize;
      const labelBox: Box = {
        x0: b.labelX - labelW / 2,
        x1: b.labelX + labelW / 2,
        y0: b.labelY - b.fontSize / 2,
        y1: b.labelY + b.fontSize / 2
      };

      // 1. 印は和了牌を完全に内包し、文字は和了牌を含む全牌と交差しない
      const horaTile = l.handTiles[l.handTiles.length - 1];
      expect(horaTile).toBeDefined();
      if (!horaTile) return;
      const horaBox: Box = {
        x0: horaTile.x,
        x1: horaTile.x + horaTile.width,
        y0: horaTile.y,
        y1: horaTile.y + horaTile.height
      };
      expect(badgeBox.x0).toBeLessThanOrEqual(horaBox.x0);
      expect(badgeBox.x1).toBeGreaterThanOrEqual(horaBox.x1);
      expect(badgeBox.y0).toBeLessThanOrEqual(horaBox.y0);
      expect(badgeBox.y1).toBeGreaterThanOrEqual(horaBox.y1);
      expect(horaBox.x1).toBeLessThanOrEqual(1002 + 1e-6);
      expect(badgeBox.x1).toBeLessThanOrEqual(1016 + 1e-6);

      // 2. 和了牌以外の牌とは印も文字も交差しない
      for (const p of l.handTiles.slice(0, -1)) {
        const pBox: Box = {
          x0: p.x,
          x1: p.x + p.width,
          y0: p.y,
          y1: p.y + p.height
        };
        expect(overlaps(badgeBox, pBox)).toBe(false);
        expect(overlaps(labelBox, pBox)).toBe(false);
      }
      // 文字は和了牌とも交差しない
      expect(overlaps(labelBox, horaBox)).toBe(false);

      // 3. ドラ・裏ドラのチップ・ラベルピル・牌、見出しピル(北含む)と交差しない
      for (const p of l.doraTiles) {
        const pBox: Box = {
          x0: p.x,
          x1: p.x + p.width,
          y0: p.y,
          y1: p.y + p.height
        };
        expect(overlaps(badgeBox, pBox)).toBe(false);
        expect(overlaps(labelBox, pBox)).toBe(false);
      }
      for (const chip of l.doraChips) {
        const cBox: Box = {
          x0: chip.x,
          x1: chip.x + chip.width,
          y0: chip.y,
          y1: chip.y + chip.height
        };
        expect(overlaps(badgeBox, cBox)).toBe(false);
        expect(overlaps(labelBox, cBox)).toBe(false);
      }
      for (const lbl of l.doraLabels) {
        const lBox: Box = {
          x0: lbl.x,
          x1: lbl.x + lbl.width,
          y0: lbl.y,
          y1: lbl.y + lbl.height
        };
        expect(overlaps(badgeBox, lBox)).toBe(false);
        expect(overlaps(labelBox, lBox)).toBe(false);
      }
      for (const pill of l.headerPills) {
        const pillBox: Box = {
          x0: pill.x,
          x1: pill.x + pill.width,
          y0: pill.y,
          y1: pill.y + pill.height
        };
        expect(overlaps(badgeBox, pillBox)).toBe(false);
        expect(overlaps(labelBox, pillBox)).toBe(false);
      }

      // 4. ヘッダー文字矩形との交差面積は 10% 以下
      const headerWidth = l.header.text.length * l.header.fontSize;
      const headerBox: Box = {
        x0: l.header.x,
        x1: l.header.x + Math.min(l.header.maxWidth, headerWidth),
        y0: SHARE_THEME_V1.paddingTop,
        y1: SHARE_THEME_V1.paddingTop + SHARE_THEME_V1.header.height
      };
      const headerArea =
        (headerBox.x1 - headerBox.x0) * (headerBox.y1 - headerBox.y0);
      expect(overlapArea(badgeBox, headerBox) / headerArea).toBeLessThanOrEqual(
        0.1
      );
      expect(overlapArea(labelBox, headerBox) / headerArea).toBeLessThanOrEqual(
        0.1
      );

      // 5. 役一覧と交差しない
      expect(badgeBox.y1).toBeLessThanOrEqual(l.yakuTop);
      expect(badgeBox.y0).toBeGreaterThanOrEqual(0);
    });
  }

  it('H2-AC10: ロンは primaryContainer/onPrimaryContainer、ツモは tertiaryContainer/onTertiaryContainer を使う', () => {
    const ronLayout = layoutShareImage(data(13, [], 'ron', 1), SHARE_THEME_V1);
    expect(ronLayout.byBadge.bgColorRole).toBe('primaryContainer');
    expect(ronLayout.byBadge.fgColorRole).toBe('onPrimaryContainer');
    expect(ronLayout.byBadge.cornerRadius).toBe(20);

    const tsumoLayout = layoutShareImage(
      data(13, [], 'tsumo', 1),
      SHARE_THEME_V1
    );
    expect(tsumoLayout.byBadge.bgColorRole).toBe('tertiaryContainer');
    expect(tsumoLayout.byBadge.fgColorRole).toBe('onTertiaryContainer');
  });

  it('H2-AC10: 短い牌列でドラと重なる位置になっても牌列を押し下げて非交差を守る', () => {
    const shortData = data(1, [], 'ron', 5);
    const l = layoutShareImage(shortData, SHARE_THEME_V1);
    const b = l.byBadge;
    const badgeBox: Box = {
      x0: b.x,
      x1: b.x + b.width,
      y0: b.y,
      y1: b.y + b.height
    };
    for (const p of l.doraTiles) {
      const pBox: Box = {
        x0: p.x,
        x1: p.x + p.width,
        y0: p.y,
        y1: p.y + p.height
      };
      expect(overlaps(badgeBox, pBox)).toBe(false);
    }
    for (const c of l.doraChips) {
      const cBox: Box = {
        x0: c.x,
        x1: c.x + c.width,
        y0: c.y,
        y1: c.y + c.height
      };
      expect(overlaps(badgeBox, cBox)).toBe(false);
    }
    expect(badgeBox.y1).toBeLessThanOrEqual(l.yakuTop);
  });
});
