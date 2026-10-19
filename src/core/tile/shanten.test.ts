import { describe, expect, test } from 'vitest';
import type { TileCounts } from '.';
import { minShanten } from './shanten';

// 34種の枚数配列 (m: 0-8, p: 9-17, s: 18-26, z: 27-33)
const counts = (entries: [number, number][]): TileCounts => {
  const c = Array<number>(34).fill(0);
  for (const [i, n] of entries) c[i] = n;
  return c as TileCounts;
};

describe('三麻の手牌を分解できる (2m〜8m なし)', () => {
  test('111m999m123p456s77z は和了形', () => {
    const c = counts([[0, 3], [8, 3], [9, 1], [10, 1], [11, 1], [21, 1], [22, 1], [23, 1], [33, 2]]);
    expect(minShanten(c, 0).shanten).toBe(-1);
  });
  test('111m999m123p456s7z は聴牌', () => {
    const c = counts([[0, 3], [8, 3], [9, 1], [10, 1], [11, 1], [21, 1], [22, 1], [23, 1], [33, 1]]);
    expect(minShanten(c, 0).shanten).toBe(0);
  });
  test('19m は順子にならない', () => {
    const c = counts([[0, 1], [8, 1], [9, 3], [12, 3], [15, 3], [27, 2]]);
    expect(minShanten(c, 0).shanten).toBe(1);
  });
});
