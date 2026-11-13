import { describe, expect, it } from 'vitest';
import type { HandOptions, Meld } from '../../core/input';
import {
  type Discard,
  type ScoredHora,
  generateResult
} from '../../core/result';
import { DEFAULT_RULE } from '../../core/rule';
import type { Table } from '../../core/table';
import { type Tile, compareTiles } from '../../core/tile';
import { classifyResult } from './classify';
import {
  compareTileOrder,
  discardHeading,
  discardNextKind,
  discardRange,
  discardWaits,
  formatDiscardRange,
  sortDiscards
} from './discard-summary';

const southTable: Table = {
  round: 'east',
  seat: 'south',
  continue: 0,
  deposit: 0
};

const defaultOptions: HandOptions = {
  riichi: 'none',
  ippatsu: false,
  rinshan: false,
  chankan: false,
  haitei: false,
  tenho: false,
  tsubameGaeshi: false,
  kanFuri: false
};

const parseTiles = (s: string): Tile[] => {
  const tiles: Tile[] = [];
  let digits: string[] = [];
  for (const ch of s) {
    if (ch >= '0' && ch <= '9') {
      digits.push(ch);
      continue;
    }
    if (ch !== 'm' && ch !== 'p' && ch !== 's' && ch !== 'z') {
      throw new Error(`不正な牌種: ${ch}`);
    }
    for (const d of digits) {
      const n = Number(d);
      if (ch === 'z') {
        tiles.push({ type: 'z', n } as Tile);
      } else if (n === 0) {
        tiles.push({ type: ch, n: 5, red: true });
      } else if (n === 5) {
        tiles.push({ type: ch, n: 5, red: false });
      } else {
        tiles.push({ type: ch, n } as Tile);
      }
    }
    digits = [];
  }
  return tiles;
};

const tileStr = (t: Tile): string => {
  if (t.type !== 'z' && t.n === 5 && t.red) {
    return `0${t.type}`;
  }
  return `${t.n}${t.type}`;
};

const generateDiscards = (hand: string, melds: Meld[] = []): Discard[] => {
  const view = classifyResult(
    generateResult(
      southTable,
      {
        hand: parseTiles(hand),
        melds,
        dora: [],
        nuki: 0
      },
      defaultOptions,
      DEFAULT_RULE
    )
  );
  if (view.kind !== 'discard') {
    throw new Error(`discard ではない: ${view.kind} (${hand})`);
  }
  return view.discards;
};

const pon1p: Meld[] = [{ type: 'pon', tile: { type: 'p', n: 1 } }];

const makeMockHora = (
  horaTile: Tile,
  by: 'ron' | 'tsumo',
  total: number,
  options?: { noYaku?: boolean; yakumanPoint?: number }
): ScoredHora => ({
  type: 'mentsu',
  by,
  horaTile,
  melds: [],
  fu: [],
  yaku: options?.noYaku
    ? [{ type: 'yaku', name: 'dora', han: 1 }]
    : [{ type: 'yaku', name: 'tanyao', han: 1 }],
  score: {
    basePoint: total,
    han: options?.yakumanPoint ? 0 : 1,
    fu: 30,
    yakumanPoint: options?.yakumanPoint ?? 0,
    payment: {
      detail:
        by === 'ron'
          ? { by: 'ron', discarder: { base: total, withHonba: total } }
          : {
              by: 'tsumo',
              winner: 'nonDealer',
              dealer: { base: total, withHonba: total },
              nonDealer: { base: 0, withHonba: 0 }
            },
      total,
      honba: 0,
      deposit: 0,
      bonus: 0
    }
  }
});

// 1.4 の手牌
const HANDS = {
  D1: '123p456p789s11z345z',
  D2: '1199p1199s1234z56z',
  D3: '123p456p789s11z34z9p',
  D4: '234p567p34s678s99p1z',
  D5: '123p789p12s789s11z5z',
  D6: '123p456p789s12s99p1z',
  D7: '234s678s55z99s1z',
  D8: '234s678s99s22p1z',
  D9: '1m9m19p19s123456z1z2p',
  D10: '123p456p789p34s15z0s',
  D11: '234p567p34s678s0s5s1z',
  D12: '1111p456p789s111z2z',
  D13: '123p1z5z'
} as const;

describe('F1: 打牌候補の一覧 (F1-01〜F1-05, F1-12)', () => {
  it('F1-01: compareTileOrder は 1m〜7z の全ての組で符号が core の compareTiles と一致する', () => {
    const tiles = parseTiles('1m9m1p5p0p9p1s5s0s1z7z');
    for (const a of tiles) {
      for (const b of tiles) {
        expect(Math.sign(compareTileOrder(a, b))).toBe(
          Math.sign(compareTiles(a, b))
        );
      }
    }
  });

  it('F1-02: sortDiscards・discardHeading は向聴を受け入れ降順・牌順に並べ、聴牌は入力順のままにする', () => {
    const d2 = generateDiscards(HANDS.D2);
    const d2Sorted = sortDiscards(d2);
    expect(d2Sorted.map(d => tileStr(d.tile))).toEqual([
      '1z',
      '2z',
      '3z',
      '4z',
      '5z',
      '6z',
      '1p',
      '9p',
      '1s',
      '9s'
    ]);
    expect(discardHeading(d2Sorted)).toBe('2向聴');

    const d3 = generateDiscards(HANDS.D3);
    expect(sortDiscards(d3).map(d => tileStr(d.tile))).toEqual([
      '3z',
      '4z',
      '9p'
    ]);
    expect(discardHeading(d3)).toBe('1向聴');

    const d11 = generateDiscards(HANDS.D11);
    const d11Sorted = sortDiscards(d11);
    expect(d11Sorted.map(d => tileStr(d.tile))).toEqual([
      '8s',
      '0s',
      '5s',
      '1z'
    ]);
    expect(discardHeading(d11Sorted)).toBe('聴牌');

    expect(sortDiscards([])).toEqual([]);
    expect(discardHeading([])).toBeNull();
  });

  it('F1-03: discardWaits は hora の horaTile と tempai の count>0 を牌順・重複除去(赤五別)で返す', () => {
    const d4 = generateDiscards(HANDS.D4);
    const d4Candidate = d4[0];
    if (!d4Candidate) throw new Error('D4 の候補が空');
    expect(discardWaits(d4Candidate).map(tileStr)).toEqual(['2s', '5s', '0s']);

    const tempaiDiscard: Discard = {
      tile: { type: 'p', n: 1 },
      next: {
        type: 'tempai',
        tileAvailabilities: [
          { tile: { type: 'z', n: 3 }, count: 1 },
          { tile: { type: 'z', n: 2 }, count: 0 },
          { tile: { type: 'z', n: 1 }, count: 2 }
        ]
      }
    };
    expect(discardWaits(tempaiDiscard).map(tileStr)).toEqual(['1z', '3z']);

    const emptyHoraDiscard: Discard = {
      tile: { type: 'z', n: 2 },
      next: {
        type: 'hora-shanten',
        info: { type: 'hora', hora: [] }
      }
    };
    expect(discardWaits(emptyHoraDiscard)).toEqual([]);
  });

  it('F1-04: discardRange・formatDiscardRange は D4〜D9・D11・D12 の打点レンジを正しく集計・整形する', () => {
    const getHora = (discards: Discard[], targetTile: string): ScoredHora[] => {
      const found = discards.find(d => tileStr(d.tile) === targetTile);
      if (
        !found ||
        found.next.type !== 'hora-shanten' ||
        found.next.info.type !== 'hora'
      ) {
        throw new Error(`hora 候補が見つからない: ${targetTile}`);
      }
      return found.next.info.hora;
    };

    const cases = [
      {
        name: 'D4 1z',
        hora: getHora(generateDiscards(HANDS.D4), '1z'),
        expectedRange: {
          kind: 'points' as const,
          min: 1000,
          max: 2000,
          hasNoYakuWait: false
        },
        expectedText: '（1,000〜2,000点）'
      },
      {
        name: 'D5 5z',
        hora: getHora(generateDiscards(HANDS.D5), '5z'),
        expectedRange: {
          kind: 'points' as const,
          min: 2600,
          max: 3000,
          hasNoYakuWait: false
        },
        expectedText: '（2,600〜3,000点）'
      },
      {
        name: 'D6 1z',
        hora: getHora(generateDiscards(HANDS.D6), '1z'),
        expectedRange: {
          kind: 'points' as const,
          min: 800,
          max: 800,
          hasNoYakuWait: false
        },
        expectedText: '（800点）'
      },
      {
        name: 'D7 1z',
        hora: getHora(generateDiscards(HANDS.D7, pon1p), '1z'),
        expectedRange: {
          kind: 'points' as const,
          min: 1000,
          max: 1100,
          hasNoYakuWait: true
        },
        expectedText: '（役なし/1,000〜1,100点）'
      },
      {
        name: 'D8 1z',
        hora: getHora(generateDiscards(HANDS.D8, pon1p), '1z'),
        expectedRange: { kind: 'no-yaku' as const },
        expectedText: '役なし'
      },
      {
        name: 'D9 2p',
        hora: getHora(generateDiscards(HANDS.D9), '2p'),
        expectedRange: {
          kind: 'points' as const,
          min: 24000,
          max: 32000,
          hasNoYakuWait: false
        },
        expectedText: '（24,000〜32,000点）'
      },
      {
        name: 'D11 0s',
        hora: getHora(generateDiscards(HANDS.D11), '0s'),
        expectedRange: {
          kind: 'points' as const,
          min: 800,
          max: 800,
          hasNoYakuWait: false
        },
        expectedText: '（800点）'
      },
      {
        name: 'D11 1z',
        hora: getHora(generateDiscards(HANDS.D11), '1z'),
        expectedRange: {
          kind: 'points' as const,
          min: 2600,
          max: 3900,
          hasNoYakuWait: false
        },
        expectedText: '（2,600〜3,900点）'
      },
      {
        name: 'D12 2z',
        hora: getHora(generateDiscards(HANDS.D12), '2z'),
        expectedRange: { kind: 'none' as const },
        expectedText: null
      }
    ];

    for (const c of cases) {
      const range = discardRange(c.hora);
      expect(range, c.name).toEqual(c.expectedRange);
      expect(formatDiscardRange(range), c.name).toBe(c.expectedText);
    }
  });

  it('F1-05: discardRange は同じ待ち・by 内で役あり最大だけを採り、役満も数字だけにする', () => {
    const waitTile: Tile = { type: 's', n: 3 };
    const mixedHora: ScoredHora[] = [
      makeMockHora(waitTile, 'ron', 5000, { noYaku: true }),
      makeMockHora(waitTile, 'ron', 2000),
      makeMockHora(waitTile, 'ron', 3900)
    ];
    const mixedRange = discardRange(mixedHora);
    expect(mixedRange).toEqual({
      kind: 'points',
      min: 3900,
      max: 3900,
      hasNoYakuWait: false
    });
    expect(formatDiscardRange(mixedRange)).toBe('（3,900点）');

    const yakumanHora: ScoredHora[] = [
      makeMockHora(waitTile, 'ron', 32000, { yakumanPoint: 1 })
    ];
    const yakumanRange = discardRange(yakumanHora);
    expect(yakumanRange).toEqual({
      kind: 'points',
      min: 32000,
      max: 32000,
      hasNoYakuWait: false
    });
    expect(formatDiscardRange(yakumanRange)).toBe('（32,000点）');
  });

  it('F1-12: 結合: generateResult → classifyResult で D1〜D13 が kind: discard、14枚和了が kind: hora になる', () => {
    const summarize = (hand: string, melds: Meld[] = []) => {
      const discards = generateDiscards(hand, melds);
      const sorted = sortDiscards(discards);
      return {
        heading: discardHeading(sorted),
        items: sorted.map(d => ({
          tile: tileStr(d.tile),
          nextKind: discardNextKind(d),
          waits: discardWaits(d).map(tileStr),
          range:
            d.next.type === 'hora-shanten' && d.next.info.type === 'hora'
              ? formatDiscardRange(discardRange(d.next.info.hora))
              : null
        }))
      };
    };

    expect(summarize(HANDS.D1)).toEqual({
      heading: '1向聴',
      items: [
        { tile: '3z', nextKind: 'shanten', waits: [], range: null },
        { tile: '4z', nextKind: 'shanten', waits: [], range: null },
        { tile: '5z', nextKind: 'shanten', waits: [], range: null }
      ]
    });
    expect(summarize(HANDS.D2).items.map(i => i.tile)).toEqual([
      '1z',
      '2z',
      '3z',
      '4z',
      '5z',
      '6z',
      '1p',
      '9p',
      '1s',
      '9s'
    ]);
    expect(summarize(HANDS.D3).items.map(i => i.tile)).toEqual([
      '3z',
      '4z',
      '9p'
    ]);
    expect(summarize(HANDS.D4)).toEqual({
      heading: '聴牌',
      items: [
        {
          tile: '1z',
          nextKind: 'tempai',
          waits: ['2s', '5s', '0s'],
          range: '（1,000〜2,000点）'
        }
      ]
    });
    expect(summarize(HANDS.D5)).toEqual({
      heading: '聴牌',
      items: [
        {
          tile: '5z',
          nextKind: 'tempai',
          waits: ['3s'],
          range: '（2,600〜3,000点）'
        }
      ]
    });
    expect(summarize(HANDS.D6)).toEqual({
      heading: '聴牌',
      items: [
        {
          tile: '1z',
          nextKind: 'tempai',
          waits: ['3s'],
          range: '（800点）'
        }
      ]
    });
    expect(summarize(HANDS.D7, pon1p)).toEqual({
      heading: '聴牌',
      items: [
        {
          tile: '1z',
          nextKind: 'tempai',
          waits: ['9s', '5z'],
          range: '（役なし/1,000〜1,100点）'
        }
      ]
    });
    expect(summarize(HANDS.D8, pon1p)).toEqual({
      heading: '聴牌',
      items: [
        {
          tile: '1z',
          nextKind: 'tempai',
          waits: ['2p', '9s'],
          range: '役なし'
        }
      ]
    });
    expect(summarize(HANDS.D9)).toEqual({
      heading: '聴牌',
      items: [
        {
          tile: '2p',
          nextKind: 'tempai',
          waits: ['7z'],
          range: '（24,000〜32,000点）'
        }
      ]
    });
    expect(summarize(HANDS.D10)).toEqual({
      heading: '聴牌',
      items: [
        {
          tile: '1z',
          nextKind: 'tempai',
          waits: ['5z'],
          range: '（5,200〜5,900点）'
        },
        {
          tile: '5z',
          nextKind: 'tempai',
          waits: ['1z'],
          range: '（5,200〜5,900点）'
        }
      ]
    });
    expect(summarize(HANDS.D11)).toEqual({
      heading: '聴牌',
      items: [
        { tile: '8s', nextKind: 'tempai', waits: ['1z'], range: '（1,500点）' },
        { tile: '0s', nextKind: 'tempai', waits: ['1z'], range: '（800点）' },
        { tile: '5s', nextKind: 'tempai', waits: ['1z'], range: '（1,500点）' },
        {
          tile: '1z',
          nextKind: 'tempai',
          waits: ['2s', '5s', '8s'],
          range: '（2,600〜3,900点）'
        }
      ]
    });
    expect(summarize(HANDS.D12)).toEqual({
      heading: '聴牌',
      items: [
        {
          tile: '1p',
          nextKind: 'tempai',
          waits: ['2z'],
          range: '（1,600〜2,400点）'
        },
        { tile: '2z', nextKind: 'tempai', waits: [], range: null }
      ]
    });
    expect(summarize(HANDS.D13)).toEqual({
      heading: '聴牌',
      items: [
        { tile: '1z', nextKind: 'tempai', waits: ['5z'], range: null },
        { tile: '5z', nextKind: 'tempai', waits: ['1z'], range: null }
      ]
    });

    const horaView = classifyResult(
      generateResult(
        southTable,
        {
          hand: parseTiles('234p567p34s678s99p2s'),
          melds: [],
          dora: [],
          nuki: 0
        },
        defaultOptions,
        DEFAULT_RULE
      )
    );
    expect(horaView.kind).toBe('hora');
  });
});
