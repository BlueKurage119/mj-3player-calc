import { describe, expect, test } from 'vitest';
import type { Rule } from '../rule';
import {
  type Tile,
  type TileCounts,
  type TileCountsIndex,
  countsIndexToTile,
  isAvailableTiles,
  isSanmaIndex,
  isSanmaTile,
  nextIndex,
  tileAvailableCount,
  tileToCountsIndex,
  tilesToCounts
} from '.';

describe('tileToCountsIndex', () => {
  test('1m', () => {
    expect(tileToCountsIndex({ type: 'm', n: 1 })).toBe(0);
  });
  test('2p', () => {
    expect(tileToCountsIndex({ type: 'p', n: 2 })).toBe(10);
  });
  test('3s', () => {
    expect(tileToCountsIndex({ type: 's', n: 3 })).toBe(20);
  });
  test('4z', () => {
    expect(tileToCountsIndex({ type: 'z', n: 4 })).toBe(30);
  });
});

describe('countsIndexToTile', () => {
  test('0', () => {
    expect(countsIndexToTile(0)).toEqual<Tile>({ type: 'm', n: 1 });
  });
  test('4', () => {
    expect(countsIndexToTile(4)).toEqual<Tile>({ type: 'm', n: 5, red: false });
  });
  test('10', () => {
    expect(countsIndexToTile(10)).toEqual<Tile>({ type: 'p', n: 2 });
  });
  test('20', () => {
    expect(countsIndexToTile(20)).toEqual<Tile>({ type: 's', n: 3 });
  });
  test('30', () => {
    expect(countsIndexToTile(30)).toEqual<Tile>({ type: 'z', n: 4 });
  });
  test('33', () => {
    expect(countsIndexToTile(33)).toEqual<Tile>({ type: 'z', n: 7 });
  });
});

describe('tilesToCounts', () => {
  test('empty', () => {
    expect(tilesToCounts([])).toEqual<TileCounts>(
      // biome-ignore format:
      [
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0
      ]
    );
  });
  test('1m0p9s17z', () => {
    expect(
      tilesToCounts([
        { type: 'm', n: 1 },
        { type: 'p', n: 5, red: true },
        { type: 's', n: 9 },
        { type: 'z', n: 1 },
        { type: 'z', n: 7 }
      ])
    ).toEqual<TileCounts>(
      // biome-ignore format:
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 1, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 1,
        1, 0, 0, 0, 0, 0, 1
      ]
    );
  });
  test('1111m', () => {
    expect(
      tilesToCounts([
        { type: 'm', n: 1 },
        { type: 'm', n: 1 },
        { type: 'm', n: 1 },
        { type: 'm', n: 1 }
      ])
    ).toEqual<TileCounts>(
      // biome-ignore format:
      [
        4, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0
      ]
    );
  });
  test('11111m', () => {
    expect(() =>
      tilesToCounts([
        { type: 'm', n: 1 },
        { type: 'm', n: 1 },
        { type: 'm', n: 1 },
        { type: 'm', n: 1 },
        { type: 'm', n: 1 }
      ])
    ).toThrow();
  });
});

describe('nextIndex (三麻のドラ表示牌)', () => {
  test('1m(0) -> 9m(8)', () => {
    expect(nextIndex(0)).toBe(8);
  });
  test('9m(8) -> 1m(0)', () => {
    expect(nextIndex(8)).toBe(0);
  });
  test('9p(17) -> 1p(9)', () => {
    expect(nextIndex(17)).toBe(9);
  });
  test('4z(30) -> 1z(27)', () => {
    expect(nextIndex(30)).toBe(27);
  });
  test('7z(33) -> 5z(31)', () => {
    expect(nextIndex(33)).toBe(31);
  });
});

describe('isSanmaTile・isSanmaIndex', () => {
  test('1m・9m・赤5p・1z は真', () => {
    expect(isSanmaTile({ type: 'm', n: 1 })).toBe(true);
    expect(isSanmaTile({ type: 'm', n: 9 })).toBe(true);
    expect(isSanmaTile({ type: 'p', n: 5, red: true })).toBe(true);
    expect(isSanmaTile({ type: 'z', n: 1 })).toBe(true);
  });

  test('2m〜8m は偽', () => {
    for (let n = 2; n <= 8; n++) {
      const tile: Tile =
        n === 5 ? { type: 'm', n: 5, red: false } : ({ type: 'm', n } as Tile);
      expect(isSanmaTile(tile)).toBe(false);
    }
    expect(isSanmaTile({ type: 'm', n: 5, red: true })).toBe(false);
  });

  test('添字版: 0, 8〜33 は真、添字 1〜7 は偽', () => {
    expect(isSanmaIndex(0 as TileCountsIndex)).toBe(true);
    for (let i = 1; i <= 7; i++) {
      expect(isSanmaIndex(i as TileCountsIndex)).toBe(false);
    }
    for (let i = 8; i <= 33; i++) {
      expect(isSanmaIndex(i as TileCountsIndex)).toBe(true);
    }
  });
});

describe('isAvailableTiles・tileAvailableCount (三麻の牌可否判定)', () => {
  const red: Rule['red'] = { m: 0, p: 1, s: 1 };

  test('isAvailableTiles: 2m を含むときは false、1m は true', () => {
    expect(isAvailableTiles(red, [], [{ type: 'm', n: 2 }])).toBe(false);
    expect(isAvailableTiles(red, [], [{ type: 'm', n: 1 }])).toBe(true);
  });

  test('tileAvailableCount: 2m に対しては null、1m は 4', () => {
    expect(tileAvailableCount(red, [], { type: 'm', n: 2 })).toBeNull();
    expect(tileAvailableCount(red, [], { type: 'm', n: 1 })).toBe(4);
  });
});
