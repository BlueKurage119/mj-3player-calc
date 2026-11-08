import { describe, expect, it } from 'vitest';
import { createDefaultRule } from '../../core/rule';
import type { Tile } from '../../core/tile';
import { type AppState, createInitialState } from './app-state';
import {
  canAddHandTile,
  isHandFull,
  maxHandLength,
  sortHand,
  splitWinningTile,
  usedTiles
} from './hand-rules';

describe('D2: 手牌の枚数・使用判定・整列 (条件2)', () => {
  it('D2-2: maxHandLength と isHandFull が副露数に応じた最大枚数を計算する', () => {
    expect(maxHandLength([])).toBe(14);
    expect(maxHandLength([{ type: 'pon', tile: { type: 'z', n: 1 } }])).toBe(
      11
    );

    const base = createInitialState(createDefaultRule());
    expect(isHandFull(base.input)).toBe(false);

    const hand14: Tile[] = [
      { type: 'm', n: 1 },
      { type: 'm', n: 1 },
      { type: 'm', n: 9 },
      { type: 'm', n: 9 },
      { type: 'p', n: 1 },
      { type: 'p', n: 2 },
      { type: 'p', n: 3 },
      { type: 's', n: 1 },
      { type: 's', n: 2 },
      { type: 's', n: 3 },
      { type: 'z', n: 1 },
      { type: 'z', n: 1 },
      { type: 'z', n: 2 },
      { type: 'z', n: 2 }
    ];
    expect(isHandFull({ ...base.input, hand: hand14 })).toBe(true);
  });

  it('D2-2a: canAddHandTile は同じ牌 4 枚の手牌に 5 枚目で偽を返す', () => {
    const base = createInitialState(createDefaultRule());
    const tile1p: Tile = { type: 'p', n: 1 };
    const state3: AppState = {
      ...base,
      input: { ...base.input, hand: [tile1p, tile1p, tile1p] }
    };
    const state4: AppState = {
      ...base,
      input: { ...base.input, hand: [tile1p, tile1p, tile1p, tile1p] }
    };
    expect(canAddHandTile(state3, tile1p)).toBe(true);
    expect(canAddHandTile(state4, tile1p)).toBe(false);
  });

  it('D2-2b: canAddHandTile は red=1 で赤五筒 1 枚使用後の赤五筒で偽・通常五筒で真を返す', () => {
    const ruleRed1 = { ...createDefaultRule(), red: 1 as const };
    const base = createInitialState(ruleRed1);
    const red5p: Tile = { type: 'p', n: 5, red: true };
    const normal5p: Tile = { type: 'p', n: 5, red: false };
    const stateWithRed: AppState = {
      ...base,
      input: { ...base.input, hand: [red5p] }
    };
    expect(canAddHandTile(stateWithRed, red5p)).toBe(false);
    expect(canAddHandTile(stateWithRed, normal5p)).toBe(true);
  });

  it('D2-2c: canAddHandTile は red=0 で赤五索に偽を返す', () => {
    const ruleRed0 = { ...createDefaultRule(), red: 0 as const };
    const base = createInitialState(ruleRed0);
    const red5s: Tile = { type: 's', n: 5, red: true };
    const normal5s: Tile = { type: 's', n: 5, red: false };
    expect(canAddHandTile(base, red5s)).toBe(false);
    expect(canAddHandTile(base, normal5s)).toBe(true);
  });

  it('D2-2d: canAddHandTile は手牌 14 枚で任意の牌に偽を返す', () => {
    const base = createInitialState(createDefaultRule());
    const hand14: Tile[] = [
      { type: 'm', n: 1 },
      { type: 'm', n: 1 },
      { type: 'm', n: 9 },
      { type: 'm', n: 9 },
      { type: 'p', n: 1 },
      { type: 'p', n: 2 },
      { type: 'p', n: 3 },
      { type: 's', n: 1 },
      { type: 's', n: 2 },
      { type: 's', n: 3 },
      { type: 'z', n: 1 },
      { type: 'z', n: 1 },
      { type: 'z', n: 2 },
      { type: 'z', n: 2 }
    ];
    const fullState: AppState = {
      ...base,
      input: { ...base.input, hand: hand14 }
    };
    expect(canAddHandTile(fullState, { type: 'z', n: 7 })).toBe(false);
  });

  it('D2-2e: canAddHandTile はドラに 1p 2 枚 + 裏ドラに 1p 1 枚 + 手牌 1p 1 枚で 1p に偽を返す', () => {
    const base = createInitialState(createDefaultRule());
    const tile1p: Tile = { type: 'p', n: 1 };
    const state: AppState = {
      ...base,
      input: {
        ...base.input,
        hand: [tile1p],
        dora: [tile1p, tile1p],
        uradora: [tile1p]
      }
    };
    expect(usedTiles(state.input, state.rule.red)).toEqual([
      tile1p,
      tile1p,
      tile1p,
      tile1p
    ]);
    expect(canAddHandTile(state, tile1p)).toBe(false);
  });

  it('D2-2f: canAddHandTile は nuki=2 + 手牌北 2 枚で北に偽を返す', () => {
    const base = createInitialState(createDefaultRule());
    const north: Tile = { type: 'z', n: 4 };
    const state: AppState = {
      ...base,
      input: {
        ...base.input,
        hand: [north, north],
        nuki: 2
      }
    };
    expect(canAddHandTile(state, north)).toBe(false);
  });

  it('D2-2g: canAddHandTile は三麻で使わない 2m に偽を返す', () => {
    const base = createInitialState(createDefaultRule());
    expect(canAddHandTile(base, { type: 'm', n: 2 })).toBe(false);
  });

  it('D2-2-sort: sortHand は 14 枚で末尾を残して先頭 13 枚を整列し、13 枚で全体を整列する', () => {
    const hand13: Tile[] = [
      { type: 'z', n: 7 },
      { type: 's', n: 9 },
      { type: 'p', n: 5, red: true },
      { type: 'p', n: 5, red: false },
      { type: 'm', n: 9 },
      { type: 'm', n: 1 },
      { type: 'z', n: 1 },
      { type: 's', n: 1 },
      { type: 'p', n: 1 },
      { type: 'z', n: 5 },
      { type: 's', n: 3 },
      { type: 'p', n: 3 },
      { type: 'm', n: 1 }
    ];
    expect(sortHand(hand13, 14)).toEqual([
      { type: 'm', n: 1 },
      { type: 'm', n: 1 },
      { type: 'm', n: 9 },
      { type: 'p', n: 1 },
      { type: 'p', n: 3 },
      { type: 'p', n: 5, red: false },
      { type: 'p', n: 5, red: true },
      { type: 's', n: 1 },
      { type: 's', n: 3 },
      { type: 's', n: 9 },
      { type: 'z', n: 1 },
      { type: 'z', n: 5 },
      { type: 'z', n: 7 }
    ]);

    const winningTile: Tile = { type: 'm', n: 9 };
    const hand14: Tile[] = [...hand13, winningTile];
    expect(sortHand(hand14, 14)).toEqual([
      { type: 'm', n: 1 },
      { type: 'm', n: 1 },
      { type: 'm', n: 9 },
      { type: 'p', n: 1 },
      { type: 'p', n: 3 },
      { type: 'p', n: 5, red: false },
      { type: 'p', n: 5, red: true },
      { type: 's', n: 1 },
      { type: 's', n: 3 },
      { type: 's', n: 9 },
      { type: 'z', n: 1 },
      { type: 'z', n: 5 },
      { type: 'z', n: 7 },
      { type: 'm', n: 9 }
    ]);
  });

  it('D2-2-split: splitWinningTile は元の index を保持して整列し、満杯時のみ末尾を winning に分離する', () => {
    const partial: Tile[] = [
      { type: 's', n: 9 },
      { type: 'm', n: 1 },
      { type: 'p', n: 5, red: false }
    ];
    expect(splitWinningTile(partial, 14)).toEqual({
      body: [
        { tile: { type: 'm', n: 1 }, index: 1 },
        { tile: { type: 'p', n: 5, red: false }, index: 2 },
        { tile: { type: 's', n: 9 }, index: 0 }
      ],
      winning: null
    });

    const full14: Tile[] = [
      { type: 'z', n: 7 },
      { type: 's', n: 9 },
      { type: 'p', n: 5, red: true },
      { type: 'p', n: 5, red: false },
      { type: 'm', n: 9 },
      { type: 'm', n: 1 },
      { type: 'z', n: 1 },
      { type: 's', n: 1 },
      { type: 'p', n: 1 },
      { type: 'z', n: 5 },
      { type: 's', n: 3 },
      { type: 'p', n: 3 },
      { type: 'm', n: 1 },
      { type: 'm', n: 9 }
    ];
    const split = splitWinningTile(full14, 14);
    expect(split.winning).toEqual({
      tile: { type: 'm', n: 9 },
      index: 13
    });
    expect(split.body.map(item => item.tile)).toEqual([
      { type: 'm', n: 1 },
      { type: 'm', n: 1 },
      { type: 'm', n: 9 },
      { type: 'p', n: 1 },
      { type: 'p', n: 3 },
      { type: 'p', n: 5, red: false },
      { type: 'p', n: 5, red: true },
      { type: 's', n: 1 },
      { type: 's', n: 3 },
      { type: 's', n: 9 },
      { type: 'z', n: 1 },
      { type: 'z', n: 5 },
      { type: 'z', n: 7 }
    ]);
    expect(
      [...split.body.map(item => item.index)].sort((a, b) => a - b)
    ).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});
