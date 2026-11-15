import { describe, expect, it } from 'vitest';
import type { Tile, TileOrBack } from '../../core/tile';
import type { ShareData } from './share-data';
import { layoutShareImage } from './share-layout';
import { SHARE_THEME_V1 } from './share-theme';

const t = (n: number): Tile => ({ type: 'p', n }) as Tile;
const tiles = (k: number): Tile[] => Array.from({ length: k }, () => t(1));
const meld = (k: number): TileOrBack[] => tiles(k);

function data(
  body: number,
  melds: number[],
  by: 'ron' | 'tsumo',
  dora: number
): ShareData {
  return {
    by,
    bodyTiles: tiles(body),
    meldTiles: melds.map(meld),
    horaTile: t(1),
    dora: tiles(dora),
    uradora: tiles(dora),
    nuki: 3,
    yaku: [{ label: '立直', han: '1翻' }],
    rankText: null,
    limitName: null,
    pointsText: '1,000点',
    situation: '南1局',
    appName: 'x',
    url: null,
    urlLabel: null
  };
}

const cases: [string, ShareData][] = [
  ['13枚+和了牌', data(13, [], 'ron', 5)],
  ['14枚(ツモ)', data(13, [], 'tsumo', 5)],
  ['副露4組', data(0, [3, 3, 3, 3], 'tsumo', 5)],
  ['最多枚数(副露4組の槓子)', data(0, [4, 4, 4, 4], 'ron', 5)]
];

describe('H2-AC10: ロン/ツモの印が牌に重ならない', () => {
  for (const [name, d] of cases) {
    it(`H2-AC10: ${name}で印の矩形が全牌・ドラ牌と交差しない`, () => {
      const l = layoutShareImage(d, SHARE_THEME_V1);
      const b = l.byBadge;
      const box = {
        x0: b.cx - b.radius,
        x1: b.cx + b.radius,
        y0: b.cy - b.radius,
        y1: b.cy + b.radius
      };
      for (const p of [...l.handTiles, ...l.doraTiles]) {
        const hit =
          box.x0 < p.x + p.width &&
          p.x < box.x1 &&
          box.y0 < p.y + p.height &&
          p.y < box.y1;
        expect(hit).toBe(false);
      }
      expect(box.y0).toBeGreaterThanOrEqual(0);
    });
  }
});
