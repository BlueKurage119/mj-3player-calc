import { describe, expect, test } from 'vitest';
import type { TileCounts, TileCountsIndex } from '.';
import { chitoitsuShantenTiles, minShanten, shantenTiles } from './shanten';

// 34種の枚数配列 (m: 0-8, p: 9-17, s: 18-26, z: 27-33)
const counts = (entries: [number, number][]): TileCounts => {
  const c = Array<number>(34).fill(0);
  for (const [i, n] of entries) c[i] = n;
  return c as TileCounts;
};

describe('三麻の手牌を分解できる (2m〜8m なし)', () => {
  test('111m999m123p456s77z は和了形', () => {
    const c = counts([
      [0, 3],
      [8, 3],
      [9, 1],
      [10, 1],
      [11, 1],
      [21, 1],
      [22, 1],
      [23, 1],
      [33, 2]
    ]);
    expect(minShanten(c, 0).shanten).toBe(-1);
  });
  test('111m999m123p456s7z は聴牌', () => {
    const c = counts([
      [0, 3],
      [8, 3],
      [9, 1],
      [10, 1],
      [11, 1],
      [21, 1],
      [22, 1],
      [23, 1],
      [33, 1]
    ]);
    expect(minShanten(c, 0).shanten).toBe(0);
  });
  test('19m は順子にならない', () => {
    const c = counts([
      [0, 1],
      [8, 1],
      [9, 3],
      [12, 3],
      [15, 3],
      [27, 2]
    ]);
    expect(minShanten(c, 0).shanten).toBe(1);
  });
});

describe('shantenTiles (三麻の有効牌除外)', () => {
  test('H1: 19m123456p789s12z の有効牌に 2m〜8m(添字1〜7)が無く、1m・9m(添字0・8)が含まれる', () => {
    // H1: 13枚。孤立 1m・9m の前後(2m・3m・7m・8m)が候補から除外されることを検証する
    const c = counts([
      [0, 1],
      [8, 1],
      [9, 1],
      [10, 1],
      [11, 1],
      [12, 1],
      [13, 1],
      [14, 1],
      [24, 1],
      [25, 1],
      [26, 1],
      [27, 1],
      [28, 1]
    ]);
    const { results } = minShanten(c, 0);
    const tiles = shantenTiles(results, c, 0);

    // 設計書 §5-4: 添字1〜7(2m〜8m)が存在しないことの検証
    for (let i = 1; i <= 7; i++) {
      expect(tiles.includes(i as TileCountsIndex)).toBe(false);
    }
    // 設計書 §5-4: 添字0(1m)・8(9m)が含まれることの検証
    expect(tiles.includes(0)).toBe(true);
    expect(tiles.includes(8)).toBe(true);
  });
});

describe('chitoitsuShantenTiles (三麻の七対子有効牌除外)', () => {
  test('H2: 1m999m11p22p33s444s の結果に 2m〜8m(添字1〜7)が無く、1m(添字0)が含まれる', () => {
    // H2: 13枚・6種(種類数<7)。枚数0の 2m〜8m が除外され、枚数1の 1m が残ることを検証する
    const c = counts([
      [0, 1],
      [8, 3],
      [9, 2],
      [10, 2],
      [20, 2],
      [21, 3]
    ]);
    const tiles = chitoitsuShantenTiles(c);

    // 設計書 §5-5: 添字1〜7(2m〜8m)が存在しないことの検証
    for (let i = 1; i <= 7; i++) {
      expect(tiles.includes(i as TileCountsIndex)).toBe(false);
    }
    // 設計書 §5-5: 添字0(1m)が含まれることの検証
    expect(tiles.includes(0)).toBe(true);
  });
});
