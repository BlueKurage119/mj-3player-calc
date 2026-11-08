import { describe, expect, it } from 'vitest';
import { createDefaultRule } from '../../core/rule';
import type { Tile } from '../../core/tile';
import { type AppState, createInitialState } from './app-state';
import {
  canAddHandTile,
  canAppendTenkeyDigit,
  isHandFull,
  maxHandLength,
  planAddTiles,
  resolveTenkeyBuffer,
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

describe('D3: テンキー入力の純関数 (D3-R・B・P)', () => {
  it('D3-R1: resolveTenkeyBuffer は "123","m" を 1m 2m 3m に変換する', () => {
    expect(resolveTenkeyBuffer('123', 'm')).toEqual([
      { type: 'm', n: 1 },
      { type: 'm', n: 2 },
      { type: 'm', n: 3 }
    ]);
  });

  it('D3-R2: resolveTenkeyBuffer は "406","p" を 4p・赤5p(red:true)・6p に変換する', () => {
    expect(resolveTenkeyBuffer('406', 'p')).toEqual([
      { type: 'p', n: 4 },
      { type: 'p', n: 5, red: true },
      { type: 'p', n: 6 }
    ]);
  });

  it('D3-R3: resolveTenkeyBuffer は "5","s" を red:false の 5s に変換する', () => {
    expect(resolveTenkeyBuffer('5', 's')).toEqual([
      { type: 's', n: 5, red: false }
    ]);
  });

  it('D3-R4: resolveTenkeyBuffer は "1234","z" を 東南西北 に変換する', () => {
    expect(resolveTenkeyBuffer('1234', 'z')).toEqual([
      { type: 'z', n: 1 },
      { type: 'z', n: 2 },
      { type: 'z', n: 3 },
      { type: 'z', n: 4 }
    ]);
  });

  it('D3-R5: resolveTenkeyBuffer は "567","z" を 白發中 に変換する', () => {
    expect(resolveTenkeyBuffer('567', 'z')).toEqual([
      { type: 'z', n: 5 },
      { type: 'z', n: 6 },
      { type: 'z', n: 7 }
    ]);
  });

  it('D3-R6: resolveTenkeyBuffer は z に 0・8・9 を含む場合 ("18","10","9") に null を返す', () => {
    expect(resolveTenkeyBuffer('18', 'z')).toBeNull();
    expect(resolveTenkeyBuffer('10', 'z')).toBeNull();
    expect(resolveTenkeyBuffer('9', 'z')).toBeNull();
  });

  it('D3-R7: resolveTenkeyBuffer は空文字列で null を返す', () => {
    expect(resolveTenkeyBuffer('', 'm')).toBeNull();
  });

  it('D3-B1: canAppendTenkeyDigit は手牌 0・バッファ空で "1" が真', () => {
    const base = createInitialState(createDefaultRule());
    expect(canAppendTenkeyDigit(base, '1')).toBe(true);
  });

  it('D3-B2: canAppendTenkeyDigit は手牌 11+バッファ 3 桁で偽、手牌 14 で偽', () => {
    const base = createInitialState(createDefaultRule());
    const tile1p: Tile = { type: 'p', n: 1 };
    const stateHand11 = {
      ...base,
      input: {
        ...base.input,
        hand: Array.from({ length: 11 }, () => tile1p)
      },
      tenkeyBuffer: '123'
    };
    expect(canAppendTenkeyDigit(stateHand11, '4')).toBe(false);

    const stateHand14 = {
      ...base,
      input: {
        ...base.input,
        hand: Array.from({ length: 14 }, () => tile1p)
      },
      tenkeyBuffer: ''
    };
    expect(canAppendTenkeyDigit(stateHand14, '1')).toBe(false);
  });

  it('D3-B3: canAppendTenkeyDigit はポン 1 つ+手牌 5+バッファ 5 桁で真・6 桁で偽', () => {
    const base = createInitialState(createDefaultRule());
    const tile1p: Tile = { type: 'p', n: 1 };
    const stateMeld1Hand5 = {
      ...base,
      input: {
        ...base.input,
        melds: [
          { type: 'pon' as const, tile: { type: 'z' as const, n: 1 as const } }
        ],
        hand: Array.from({ length: 5 }, () => tile1p)
      },
      tenkeyBuffer: '12345'
    };
    // maxHandLength = 11, hand=5, buffer=5 -> 10 < 11 なので真
    expect(canAppendTenkeyDigit(stateMeld1Hand5, '6')).toBe(true);

    const stateMeld1Hand5Buffer6 = {
      ...stateMeld1Hand5,
      tenkeyBuffer: '123456'
    };
    // hand=5, buffer=6 -> 11 >= 11 なので偽
    expect(canAppendTenkeyDigit(stateMeld1Hand5Buffer6, '7')).toBe(false);
  });

  it('D3-B4: canAppendTenkeyDigit はバッファ "1111" で "1" が偽・"2" が真、"x" が偽', () => {
    const base = createInitialState(createDefaultRule());
    const state = {
      ...base,
      tenkeyBuffer: '1111'
    };
    expect(canAppendTenkeyDigit(state, '1')).toBe(false);
    expect(canAppendTenkeyDigit(state, '2')).toBe(true);
    expect(canAppendTenkeyDigit(state, 'x')).toBe(false);
  });

  it('D3-P1: planAddTiles は全部可なら同じ牌列を返す', () => {
    const base = createInitialState(createDefaultRule());
    const tiles: Tile[] = [
      { type: 'm', n: 1 },
      { type: 'p', n: 1 },
      { type: 's', n: 1 }
    ];
    expect(planAddTiles(base, tiles)).toEqual(tiles);
  });

  it('D3-P2: planAddTiles は 2m を含むと null を返す', () => {
    const base = createInitialState(createDefaultRule());
    const tiles: Tile[] = [
      { type: 'm', n: 1 },
      { type: 'm', n: 2 }
    ];
    expect(planAddTiles(base, tiles)).toBeNull();
  });

  it('D3-P3: planAddTiles は同じ牌の 5 枚目を含むと null を返す', () => {
    const base = createInitialState(createDefaultRule());
    const tile1p: Tile = { type: 'p', n: 1 };
    const state = {
      ...base,
      input: {
        ...base.input,
        hand: [tile1p, tile1p, tile1p]
      }
    };
    const tiles: Tile[] = [tile1p, tile1p];
    expect(planAddTiles(state, tiles)).toBeNull();
  });

  it('D3-P4: planAddTiles は red=1 で赤五筒の 2 枚目を含むと null を返す', () => {
    const base = createInitialState({ ...createDefaultRule(), red: 1 });
    const red5p: Tile = { type: 'p', n: 5, red: true };
    const state = {
      ...base,
      input: {
        ...base.input,
        hand: [red5p]
      }
    };
    expect(planAddTiles(state, [red5p])).toBeNull();
  });

  it('D3-P5: planAddTiles は red=0 の赤で null を返す', () => {
    const base = createInitialState({ ...createDefaultRule(), red: 0 });
    const red5p: Tile = { type: 'p', n: 5, red: true };
    expect(planAddTiles(base, [red5p])).toBeNull();
  });

  it('D3-P6: planAddTiles は red=1・通常五筒 3 枚使用で通常五筒を含むと null を返す', () => {
    const base = createInitialState({ ...createDefaultRule(), red: 1 });
    const normal5p: Tile = { type: 'p', n: 5, red: false };
    const state = {
      ...base,
      input: {
        ...base.input,
        hand: [normal5p, normal5p, normal5p]
      }
    };
    expect(planAddTiles(state, [normal5p])).toBeNull();
  });

  it('D3-P7: planAddTiles は手牌 13 枚に 2 枚で null を返す', () => {
    const base = createInitialState(createDefaultRule());
    const hand13: Tile[] = [
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
      { type: 'z', n: 2 }
    ];
    const state = {
      ...base,
      input: {
        ...base.input,
        hand: hand13
      }
    };
    const tiles: Tile[] = [
      { type: 'z', n: 2 },
      { type: 'z', n: 3 }
    ];
    expect(planAddTiles(state, tiles)).toBeNull();
  });

  it('D3-P8: planAddTiles は複数の手牌と牌列の組で、非 null ⇔ 逐次の canAddHandTile がすべて真', () => {
    const base = createInitialState({ ...createDefaultRule(), red: 1 });
    const testCases: { hand: Tile[]; candidate: Tile[] }[] = [
      {
        hand: [],
        candidate: [
          { type: 'm', n: 1 },
          { type: 'p', n: 1 }
        ]
      },
      {
        hand: [],
        candidate: [{ type: 'm', n: 2 }] // 2m 不可
      },
      {
        hand: [{ type: 'p', n: 5, red: true }],
        candidate: [{ type: 'p', n: 5, red: true }] // 赤重複不可
      },
      {
        hand: [
          { type: 's', n: 1 },
          { type: 's', n: 1 },
          { type: 's', n: 1 }
        ],
        candidate: [
          { type: 's', n: 1 },
          { type: 's', n: 1 } // 5枚目不可
        ]
      },
      {
        hand: Array.from({ length: 13 }, () => ({
          type: 'z' as const,
          n: 1 as const
        })),
        candidate: [
          { type: 'z', n: 2 },
          { type: 'z', n: 3 }
        ] // 15枚目不可
      }
    ];

    for (const { hand, candidate } of testCases) {
      const state = {
        rule: base.rule,
        input: { ...base.input, hand }
      };
      const result = planAddTiles(state, candidate);

      // 逐次判定
      const current = [...hand];
      let allPassed = true;
      for (const t of candidate) {
        const curState = {
          rule: base.rule,
          input: { ...base.input, hand: current }
        };
        if (!canAddHandTile(curState, t)) {
          allPassed = false;
          break;
        }
        current.push(t);
      }

      if (allPassed) {
        expect(result).toEqual(candidate);
      } else {
        expect(result).toBeNull();
      }
    }
  });
});
