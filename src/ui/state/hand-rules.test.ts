import { describe, expect, it } from 'vitest';
import { createDefaultRule } from '../../core/rule';
import type { Tile } from '../../core/tile';
import { type AppState, appReducer, createInitialState } from './app-state';
import {
  canAddHandTile,
  canAddIndicatorTile,
  canAppendTenkeyDigit,
  canAppendTenkeyDigitFor,
  canSetMeld,
  isHandFull,
  kindOfMeld,
  maxHandLength,
  meldOfKind,
  meldRedToggle,
  meldTileForKey,
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

  describe('D4: 副露・ドラ表示牌の判定関数 (2.2)', () => {
    it('D4-R1: meldOfKind と kindOfMeld の相互変換', () => {
      const tile1p: Tile = { type: 'p', n: 1 };
      expect(meldOfKind('pon', tile1p)).toEqual({ type: 'pon', tile: tile1p });
      expect(meldOfKind('minkan', tile1p)).toEqual({
        type: 'kan',
        tile: tile1p,
        closed: false
      });
      expect(meldOfKind('ankan', tile1p)).toEqual({
        type: 'kan',
        tile: tile1p,
        closed: true
      });

      expect(kindOfMeld({ type: 'pon', tile: null })).toBe('pon');
      expect(kindOfMeld({ type: 'kan', tile: null, closed: false })).toBe(
        'minkan'
      );
      expect(kindOfMeld({ type: 'kan', tile: null, closed: true })).toBe(
        'ankan'
      );
    });

    it('D4-R2: canSetMeld は null で真・自身除外カウント・上限超過で偽', () => {
      const base = createInitialState(createDefaultRule());
      const tile1p: Tile = { type: 'p', n: 1 };
      const tile2p: Tile = { type: 'p', n: 2 };
      const tile2m: Tile = { type: 'm', n: 2 };

      // tile: null は常に真
      expect(canSetMeld(base, 0, { type: 'pon', tile: null })).toBe(true);

      // 手牌に 1p が 1 枚あるとき、副露 0 にポン 1p (3枚) は 1+3=4 枚で真
      const stateWith1p = {
        ...base,
        input: { ...base.input, hand: [tile1p] }
      };
      expect(canSetMeld(stateWith1p, 0, { type: 'pon', tile: tile1p })).toBe(
        true
      );

      // 手牌に 1p が 2 枚あるとき、副露 0 にポン 1p (3枚) は 2+3=5 枚で偽
      const stateWith2_1p = {
        ...base,
        input: { ...base.input, hand: [tile1p, tile1p] }
      };
      expect(canSetMeld(stateWith2_1p, 0, { type: 'pon', tile: tile1p })).toBe(
        false
      );

      // 存在しない 2m は偽
      expect(canSetMeld(base, 0, { type: 'pon', tile: tile2m })).toBe(false);

      // 確定済みのポン 1p に対し、自身 (index 0) の牌を 1p のままにすることは真
      const stateWithPon1p = {
        ...base,
        input: {
          ...base.input,
          melds: [{ type: 'pon' as const, tile: tile1p }]
        }
      };
      expect(canSetMeld(stateWithPon1p, 0, { type: 'pon', tile: tile1p })).toBe(
        true
      );
      // 確定済みのポン 1p を 2p に変更することは真
      expect(canSetMeld(stateWithPon1p, 0, { type: 'pon', tile: tile2p })).toBe(
        true
      );
      // 手牌に 1p が 1 枚ある状態でポン 1p を明槓 (4枚) に変更しようとすると 1+4=5 枚で偽
      const stateWithPonAndHand = {
        ...base,
        input: {
          ...base.input,
          hand: [tile1p],
          melds: [{ type: 'pon' as const, tile: tile1p }]
        }
      };
      expect(
        canSetMeld(stateWithPonAndHand, 0, {
          type: 'kan',
          tile: tile1p,
          closed: false
        })
      ).toBe(false);
    });

    it('D4-R3: canAddIndicatorTile は 5 枚未満で在庫内なら真・5 枚以上や在庫切れで偽', () => {
      const base = createInitialState(createDefaultRule());
      const tile1p: Tile = { type: 'p', n: 1 };
      const tile2m: Tile = { type: 'm', n: 2 };

      expect(canAddIndicatorTile(base, 'dora', tile1p)).toBe(true);
      expect(canAddIndicatorTile(base, 'uradora', tile1p)).toBe(true);
      // 2m は偽
      expect(canAddIndicatorTile(base, 'dora', tile2m)).toBe(false);

      // ドラ 4 枚なら 5 枚目を追加可能
      const state4 = {
        ...base,
        input: {
          ...base.input,
          dora: [
            { type: 'p' as const, n: 1 as const },
            { type: 'p' as const, n: 2 as const },
            { type: 'p' as const, n: 3 as const },
            { type: 'p' as const, n: 4 as const }
          ]
        }
      };
      expect(canAddIndicatorTile(state4, 'dora', tile1p)).toBe(true);

      // ドラ 5 枚なら偽
      const state5 = {
        ...base,
        input: {
          ...base.input,
          dora: [
            { type: 'p' as const, n: 1 as const },
            { type: 'p' as const, n: 2 as const },
            { type: 'p' as const, n: 3 as const },
            { type: 'p' as const, n: 4 as const },
            { type: 'p' as const, n: 5 as const, red: false }
          ]
        }
      };
      expect(canAddIndicatorTile(state5, 'dora', tile1p)).toBe(false);

      // ドラ 3 枚 + 裏ドラ 1 枚で 1p を 4 枚使っている場合、ドラに 1p は偽
      const state4Used = {
        ...base,
        input: {
          ...base.input,
          dora: [tile1p, tile1p, tile1p],
          uradora: [tile1p]
        }
      };
      expect(canAddIndicatorTile(state4Used, 'dora', tile1p)).toBe(false);
    });

    it('D4-R4: canAppendTenkeyDigitFor は対象別の容量と数字制限に従う', () => {
      const base = createInitialState(createDefaultRule());

      // 不正文字は偽
      expect(
        canAppendTenkeyDigitFor({ ...base, inputFocus: { type: 'hand' } }, 'a')
      ).toBe(false);

      // inputFocus が null または situation のときは偽
      expect(canAppendTenkeyDigitFor({ ...base, inputFocus: null }, '1')).toBe(
        false
      );
      expect(
        canAppendTenkeyDigitFor(
          { ...base, inputFocus: { type: 'situation' } },
          '1'
        )
      ).toBe(false);

      // hand: 11 枚 + バッファ 2 桁で真、3 桁 (計 14 枚) で偽
      const hand11State = {
        ...base,
        input: {
          ...base.input,
          hand: Array.from({ length: 11 }, () => ({
            type: 'p' as const,
            n: 1 as const
          }))
        },
        inputFocus: { type: 'hand' as const },
        tenkeyBuffer: '12'
      };
      expect(canAppendTenkeyDigitFor(hand11State, '3')).toBe(true);
      const hand11FullBufState = {
        ...hand11State,
        tenkeyBuffer: '123'
      };
      expect(canAppendTenkeyDigitFor(hand11FullBufState, '4')).toBe(false);

      // dora: 3 枚のときバッファ 1 桁で真 (計 4 枚)、2 桁 (計 5 枚) で偽
      const dora3State = {
        ...base,
        input: {
          ...base.input,
          dora: Array.from({ length: 3 }, () => ({
            type: 'p' as const,
            n: 1 as const
          }))
        },
        inputFocus: { type: 'dora' as const },
        tenkeyBuffer: '1'
      };
      expect(canAppendTenkeyDigitFor(dora3State, '2')).toBe(true);
      const dora3FullBufState = {
        ...dora3State,
        tenkeyBuffer: '12'
      };
      expect(canAppendTenkeyDigitFor(dora3FullBufState, '3')).toBe(false);

      // meld: 容量は常に 1。バッファ空で真、1 桁で偽
      const meldState = {
        ...base,
        inputFocus: { type: 'meld' as const, i: 0 },
        tenkeyBuffer: ''
      };
      expect(canAppendTenkeyDigitFor(meldState, '1')).toBe(true);
      const meldFullState = {
        ...meldState,
        tenkeyBuffer: '1'
      };
      expect(canAppendTenkeyDigitFor(meldFullState, '2')).toBe(false);

      // 同じ数字 5 つ目は偽
      const fourOnesState = {
        ...base,
        inputFocus: { type: 'hand' as const },
        tenkeyBuffer: '1111'
      };
      expect(canAppendTenkeyDigitFor(fourOnesState, '1')).toBe(false);
      expect(canAppendTenkeyDigitFor(fourOnesState, '2')).toBe(true);

      // rule.red === 0 のときは 0 を拒否
      const stateRed0 = {
        ...createInitialState({ ...createDefaultRule(), red: 0 }),
        inputFocus: { type: 'hand' as const }
      };
      expect(canAppendTenkeyDigitFor(stateRed0, '0')).toBe(false);
      expect(canAppendTenkeyDigitFor(stateRed0, '1')).toBe(true);

      const stateRed1 = {
        ...createInitialState({ ...createDefaultRule(), red: 1 }),
        inputFocus: { type: 'hand' as const }
      };
      expect(canAppendTenkeyDigitFor(stateRed1, '0')).toBe(true);
    });
  });
});

describe('D4-C24・C25: 赤牌切替の判定と5キーの代替 (確定事項 25〜28・33・34)', () => {
  const p5: Tile = { type: 'p', n: 5, red: false };
  const p5r: Tile = { type: 'p', n: 5, red: true };
  const mk = (
    red: 0 | 1 | 2,
    melds: AppState['input']['melds'],
    hand: Tile[] = []
  ): AppState => {
    const base = createInitialState({ ...createDefaultRule(), red });
    return { ...base, input: { ...base.input, hand, melds } };
  };
  const redCount = (s: AppState): number =>
    usedTiles(s.input, s.rule.red).filter(
      t => t.type === 'p' && t.n === 5 && t.red === true
    ).length;

  it('D4-C24a: red=0 では visible=false', () => {
    const s = mk(0, [{ type: 'pon', tile: p5 }]);
    expect(meldRedToggle(s, 0).visible).toBe(false);
    expect(meldRedToggle(mk(1, []), 0).visible).toBe(true);
  });

  it('D4-C24b: red=1 のポン 5p は赤なし⇄赤ありを往復でき、赤の数が 0⇄1 になる', () => {
    let s = mk(1, [{ type: 'pon', tile: p5 }]);
    expect(redCount(s)).toBe(0);
    const t1 = meldRedToggle(s, 0);
    expect(t1.disabled).toBe(false);
    expect(t1.next).toEqual(p5r);
    s = appReducer(s, { type: 'set-meld-tile', i: 0, tile: p5r });
    expect(redCount(s)).toBe(1);
    const t2 = meldRedToggle(s, 0);
    expect(t2.disabled).toBe(false);
    expect(t2.next).toEqual(p5);
    s = appReducer(s, { type: 'set-meld-tile', i: 0, tile: p5 });
    expect(redCount(s)).toBe(0);
  });

  it('D4-C24c: red=1 で手牌に赤5p があると赤なし→赤ありは disabled', () => {
    const s = mk(1, [{ type: 'pon', tile: p5 }], [p5r]);
    expect(meldRedToggle(s, 0).disabled).toBe(true);
  });

  it('D4-C24d: red=2 のポン 5p(赤なし=赤1枚)は有効で、赤の数が 1⇄2。手牌に赤 5p があれば disabled', () => {
    let s = mk(2, [{ type: 'pon', tile: p5 }]);
    expect(redCount(s)).toBe(1);
    expect(meldRedToggle(s, 0).disabled).toBe(false);
    s = appReducer(s, { type: 'set-meld-tile', i: 0, tile: p5r });
    expect(redCount(s)).toBe(2);
    s = appReducer(s, { type: 'set-meld-tile', i: 0, tile: p5 });
    expect(redCount(s)).toBe(1);
    const blocked = mk(2, [{ type: 'pon', tile: p5 }], [p5r]);
    expect(meldRedToggle(blocked, 0).disabled).toBe(true);
  });

  it('D4-C24e: 槓・5 以外・牌未確定・副露なしは disabled(next は null または無関係)', () => {
    expect(
      meldRedToggle(mk(1, [{ type: 'kan', tile: p5, closed: false }]), 0)
        .disabled
    ).toBe(true);
    expect(
      meldRedToggle(mk(1, [{ type: 'kan', tile: p5, closed: true }]), 0)
        .disabled
    ).toBe(true);
    expect(
      meldRedToggle(mk(1, [{ type: 'pon', tile: { type: 'p', n: 1 } }]), 0)
        .disabled
    ).toBe(true);
    expect(
      meldRedToggle(mk(1, [{ type: 'pon', tile: null }]), 0).disabled
    ).toBe(true);
    expect(meldRedToggle(mk(1, []), 0).disabled).toBe(true);
  });

  it('D4-C24f: set-rule(red:2) の dispatch で red=2 の状態を作って判定できる', () => {
    const base = mk(1, []);
    const afterRule = appReducer(base, {
      type: 'set-rule',
      rule: { ...base.rule, red: 2 }
    });
    const s = {
      ...afterRule,
      input: { ...afterRule.input, melds: [{ type: 'pon' as const, tile: p5 }] }
    };
    expect(s.rule.red).toBe(2);
    expect(redCount(s)).toBe(1);
    expect(meldRedToggle(s, 0).disabled).toBe(false);
  });

  it('D4-C25a: red=1・手牌に普通の 5p 1枚で、5p キーは赤ありポンになる', () => {
    const s = mk(1, [{ type: 'pon', tile: null }], [p5]);
    // 赤なしポン(普通3枚)は不可、赤ありは可
    expect(meldTileForKey(s, 0, 'pon', p5)).toEqual(p5r);
  });

  it('D4-C25b: 赤ありの 5p ポンに 5p キーを押しても赤のまま', () => {
    const s = mk(1, [{ type: 'pon', tile: p5r }]);
    expect(meldTileForKey(s, 0, 'pon', p5)).toEqual(p5r);
    const n = mk(1, [{ type: 'pon', tile: p5 }]);
    expect(meldTileForKey(n, 0, 'pon', p5)).toEqual(p5);
  });

  it('D4-C25c: 槓・5 以外は red:false のまま、置けなければ null', () => {
    const s = mk(1, [{ type: 'kan', tile: null, closed: false }]);
    expect(meldTileForKey(s, 0, 'minkan', p5)).toEqual(p5);
    const one: Tile = { type: 'p', n: 1 };
    expect(meldTileForKey(s, 0, 'minkan', one)).toEqual(one);
    const full = mk(1, [{ type: 'pon', tile: null }], [one, one]);
    expect(meldTileForKey(full, 0, 'pon', one)).toBeNull();
  });

  it('D4-C25d: テンキー(副露)で 5→p は代替で赤ありに、0→p は赤のまま、赤なしが入るなら赤なし', () => {
    const base = mk(1, [{ type: 'pon', tile: null }], [p5]);
    const focused: AppState = { ...base, inputFocus: { type: 'meld', i: 0 } };
    const via5 = appReducer(
      { ...focused, tenkeyBuffer: '5' },
      { type: 'tenkey-commit', suit: 'p' }
    );
    expect(via5.input.melds[0]).toEqual({ type: 'pon', tile: p5r });
    const via0 = appReducer(
      { ...focused, tenkeyBuffer: '0' },
      { type: 'tenkey-commit', suit: 'p' }
    );
    expect(via0.input.melds[0]).toEqual({ type: 'pon', tile: p5r });
    const free = mk(1, [{ type: 'pon', tile: null }]);
    const plain = appReducer(
      { ...free, inputFocus: { type: 'meld', i: 0 }, tenkeyBuffer: '5' },
      { type: 'tenkey-commit', suit: 'p' }
    );
    expect(plain.input.melds[0]).toEqual({ type: 'pon', tile: p5 });
  });
});
