import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
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
import { DiscardBody, DiscardGlance } from './discard';
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

const extractTileLabels = (markup: string) =>
  [
    ...markup.matchAll(/<span role="img" class="tile" aria-label="([^"]+)">/g)
  ].map(m => m[1]);

const extractDiscardItems = (markup: string) =>
  [
    ...markup.matchAll(
      /<li class="discard-item" data-discard-next="([^"]+)">([\s\S]*?)<\/li>/g
    )
  ].map(m => ({
    nextKind: m[1] ?? '',
    html: m[2] ?? ''
  }));

const discardTileLabel = (html: string) =>
  html.match(
    /<span class="discard-item__tile"><span class="discard-item__label">打<\/span><span role="img" class="tile" aria-label="([^"]+)">/
  )?.[1];

const extractHeadLabels = (html: string) =>
  [...html.matchAll(/<span class="discard-item__label">([^<]*)<\/span>/g)].map(
    m => m[1]
  );

const extractHead = (html: string) =>
  html.match(/<div class="discard-item__head">([\s\S]*?)<\/div>/)?.[1] ?? '';

const detailOf = (html: string) =>
  html.match(/<div class="discard-item__detail">([\s\S]*)$/)?.[1] ?? '';

const extractSummary = (html: string) => {
  const m = html.match(
    /<span class="result-body__summary tabular-nums" data-kinds="(\d+)" data-total="(\d+)">([^<]*)<\/span>/
  );
  if (!m) return null;
  return {
    kinds: Number(m[1]),
    total: Number(m[2]),
    text: m[3]
  };
};

const extractRange = (html: string) => {
  const m = html.match(
    /<span class="discard-item__range tabular-nums" data-range-kind="([^"]+)">([^<]*)<\/span>/
  );
  if (!m) return null;
  return {
    kind: m[1],
    text: m[2]
  };
};

describe('F1: 打牌候補の一覧 (F1-01〜F1-12)', () => {
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
          hasNoYaku: false
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
          hasNoYaku: false
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
          hasNoYaku: true
        },
        expectedText: '（役なし / 800点）'
      },
      {
        name: 'D7 1z',
        hora: getHora(generateDiscards(HANDS.D7, pon1p), '1z'),
        expectedRange: {
          kind: 'points' as const,
          min: 1000,
          max: 1100,
          hasNoYaku: true
        },
        expectedText: '（役なし / 1,000〜1,100点）'
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
          hasNoYaku: false
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
          hasNoYaku: true
        },
        expectedText: '（役なし / 800点）'
      },
      {
        name: 'D11 1z',
        hora: getHora(generateDiscards(HANDS.D11), '1z'),
        expectedRange: {
          kind: 'points' as const,
          min: 2600,
          max: 3900,
          hasNoYaku: false
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
      hasNoYaku: false
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
      hasNoYaku: false
    });
    expect(formatDiscardRange(yakumanRange)).toBe('（32,000点）');
  });

  it('F1-05b: discardRange は待ちごと・by ごとに役なしを判定し、片側だけ役なしでも前置する', () => {
    const w1: Tile = { type: 's', n: 3 };
    const w2: Tile = { type: 's', n: 6 };
    const noYaku = { noYaku: true };
    const table = [
      {
        name: 'ロンだけ役なし',
        hora: [
          makeMockHora(w1, 'ron', 700, noYaku),
          makeMockHora(w1, 'tsumo', 800)
        ],
        text: '（役なし / 800点）'
      },
      {
        name: 'ツモだけ役なし',
        hora: [
          makeMockHora(w1, 'ron', 1000),
          makeMockHora(w1, 'tsumo', 600, noYaku)
        ],
        text: '（役なし / 1,000点）'
      },
      {
        name: '一方の待ちだけ両側役なし',
        hora: [
          makeMockHora(w1, 'ron', 500, noYaku),
          makeMockHora(w1, 'tsumo', 600, noYaku),
          makeMockHora(w2, 'ron', 1000),
          makeMockHora(w2, 'tsumo', 1100)
        ],
        text: '（役なし / 1,000〜1,100点）'
      },
      {
        name: '全部役あり',
        hora: [makeMockHora(w1, 'ron', 1000), makeMockHora(w1, 'tsumo', 1100)],
        text: '（1,000〜1,100点）'
      },
      {
        name: 'ツモのみ存在し役あり(ロン無しは役なし扱いしない)',
        hora: [makeMockHora(w1, 'tsumo', 1100)],
        text: '（1,100点）'
      },
      {
        name: '全部役なし',
        hora: [
          makeMockHora(w1, 'ron', 500, noYaku),
          makeMockHora(w1, 'tsumo', 600, noYaku)
        ],
        text: '役なし'
      }
    ];
    for (const c of table) {
      expect(formatDiscardRange(discardRange(c.hora)), c.name).toBe(c.text);
    }
  });

  it('F1-06: DiscardBody は D3 で見出し「1向聴」と3件の向聴候補・有効牌を表示する', () => {
    const markup = renderToStaticMarkup(
      <DiscardBody discards={generateDiscards(HANDS.D3)} />
    );

    expect(
      markup.match(/<h2 class="result-body__title">([^<]*)<\/h2>/)?.[1]
    ).toBe('1向聴');

    const items = extractDiscardItems(markup);
    expect(items).toHaveLength(3);
    expect(items.map(i => i.nextKind)).toEqual([
      'shanten',
      'shanten',
      'shanten'
    ]);
    expect(items.map(i => discardTileLabel(i.html))).toEqual([
      '西',
      '北',
      '9筒'
    ]);

    const firstHtml = items[0]?.html ?? '';
    expect(extractSummary(firstHtml)).toEqual({
      kinds: 5,
      total: 16,
      text: '5種 16枚'
    });
    const firstDetail = detailOf(firstHtml);
    expect(extractTileLabels(firstDetail)).toEqual([
      '7筒',
      '8筒',
      '9筒',
      '東',
      '北'
    ]);
    expect(firstDetail).not.toContain('×');
    expect(firstDetail).not.toContain('result-body__wait');
    expect(firstDetail).not.toContain('data-tile-count');
    expect(markup).not.toContain('×');
    for (const item of items) {
      expect(extractHeadLabels(item.html)[0]).toBe('打');
    }
    expect(extractHeadLabels(firstHtml)).toContain('受け入れ');
  });

  it('F1-07: DiscardBody は D4 で見出し「聴牌」・1件・待ち牌3枚・レンジを表示し枚数表記を出さない', () => {
    const markup = renderToStaticMarkup(
      <DiscardBody discards={generateDiscards(HANDS.D4)} />
    );

    expect(
      markup.match(/<h2 class="result-body__title">([^<]*)<\/h2>/)?.[1]
    ).toBe('聴牌');

    const items = extractDiscardItems(markup);
    expect(items).toHaveLength(1);
    expect(items[0]?.nextKind).toBe('tempai');

    const itemHtml = items[0]?.html ?? '';
    const detailHtml = detailOf(itemHtml);
    expect(extractHeadLabels(itemHtml)).toEqual(['打', '待ち']);
    expect(itemHtml).not.toContain('受け入れ');
    const head = extractHead(detailHtml);
    expect(head).toContain('待ち');
    expect(extractRange(head)).toEqual({
      kind: 'points',
      text: '（1,000〜2,000点）'
    });
    expect(extractTileLabels(head)).toEqual([]);
    expect(extractTileLabels(detailHtml)).toEqual(['2索', '5索', '赤5索']);
    expect(detailHtml.indexOf('glance-tiles')).toBeGreaterThan(
      detailHtml.indexOf('discard-item__head')
    );
    // 牌SVGのdata URIを含むため全体一致ができず、枚数表記が出ないことを部分一致否定で補う
    expect(markup).not.toContain('×');
    expect(markup).not.toContain('種');
    expect(markup).not.toContain('枚');
  });

  it('F1-08: DiscardBody は D7 で役なし前置、D8 で役なし、D12 で和了牌なしを表示する', () => {
    const d7Markup = renderToStaticMarkup(
      <DiscardBody discards={generateDiscards(HANDS.D7, pon1p)} />
    );
    const d7Items = extractDiscardItems(d7Markup);
    expect(d7Items).toHaveLength(1);
    expect(extractRange(d7Items[0]?.html ?? '')).toEqual({
      kind: 'points',
      text: '（役なし / 1,000〜1,100点）'
    });

    const d8Markup = renderToStaticMarkup(
      <DiscardBody discards={generateDiscards(HANDS.D8, pon1p)} />
    );
    const d8Items = extractDiscardItems(d8Markup);
    expect(d8Items).toHaveLength(1);
    expect(extractRange(d8Items[0]?.html ?? '')).toEqual({
      kind: 'no-yaku',
      text: '役なし'
    });

    const d12Markup = renderToStaticMarkup(
      <DiscardBody discards={generateDiscards(HANDS.D12)} />
    );
    const d12Items = extractDiscardItems(d12Markup);
    expect(d12Items).toHaveLength(2);
    expect(d12Items.map(i => discardTileLabel(i.html))).toEqual(['1筒', '南']);
    expect(extractRange(d12Items[0]?.html ?? '')).toEqual({
      kind: 'points',
      text: '（1,600〜2,400点）'
    });
    const d12SecondHtml = d12Items[1]?.html ?? '';
    expect(extractHeadLabels(d12SecondHtml)).toEqual(['打', '待ち']);
    expect(extractHead(d12SecondHtml)).not.toContain('discard-item__range');
    expect(
      d12SecondHtml.match(
        /<span class="result-body__text">([^<]*)<\/span>/
      )?.[1]
    ).toBe('和了牌なし');
    expect(extractRange(d12SecondHtml)).toBeNull();
  });

  it('F1-09: DiscardBody は tempai 型や全0枚で仕様どおりに待ち牌・和了牌なし・0種 0枚を表示する', () => {
    const d13Markup = renderToStaticMarkup(
      <DiscardBody discards={generateDiscards(HANDS.D13)} />
    );
    const d13Items = extractDiscardItems(d13Markup);
    expect(d13Items).toHaveLength(2);
    for (const item of d13Items) {
      const detailHtml =
        item.html.match(/<div class="discard-item__detail">([\s\S]*)$/)?.[1] ??
        '';
      expect(extractTileLabels(detailHtml)).toHaveLength(1);
      expect(extractRange(detailHtml)).toBeNull();
    }

    const tempaiWithAvail: Discard[] = [
      {
        tile: { type: 'p', n: 1 },
        next: {
          type: 'tempai',
          tileAvailabilities: [
            { tile: { type: 'z', n: 1 }, count: 2 },
            { tile: { type: 'z', n: 2 }, count: 0 },
            { tile: { type: 'z', n: 3 }, count: 1 }
          ]
        }
      }
    ];
    const tempaiMarkup = renderToStaticMarkup(
      <DiscardBody discards={tempaiWithAvail} />
    );
    const tempaiItems = extractDiscardItems(tempaiMarkup);
    expect(tempaiItems).toHaveLength(1);
    const tempaiDetail =
      tempaiItems[0]?.html.match(
        /<div class="discard-item__detail">([\s\S]*)$/
      )?.[1] ?? '';
    expect(extractTileLabels(tempaiDetail)).toEqual(['東', '西']);
    expect(extractRange(tempaiDetail)).toBeNull();

    const tempaiAllZero: Discard[] = [
      {
        tile: { type: 'p', n: 1 },
        next: {
          type: 'tempai',
          tileAvailabilities: [{ tile: { type: 'z', n: 1 }, count: 0 }]
        }
      }
    ];
    const tempaiZeroMarkup = renderToStaticMarkup(
      <DiscardBody discards={tempaiAllZero} />
    );
    expect(
      tempaiZeroMarkup.match(
        /<span class="result-body__text">([^<]*)<\/span>/
      )?.[1]
    ).toBe('和了牌なし');

    const shantenAllZero: Discard[] = [
      {
        tile: { type: 'p', n: 1 },
        next: {
          type: 'hora-shanten',
          info: {
            type: 'shanten',
            shanten: 1,
            tileAvailabilities: [{ tile: { type: 'z', n: 1 }, count: 0 }]
          }
        }
      }
    ];
    const shantenZeroMarkup = renderToStaticMarkup(
      <DiscardBody discards={shantenAllZero} />
    );
    expect(extractSummary(shantenZeroMarkup)).toEqual({
      kinds: 0,
      total: 0,
      text: '0種 0枚'
    });
    expect(
      extractTileLabels(
        detailOf(extractDiscardItems(shantenZeroMarkup)[0]?.html ?? '')
      )
    ).toEqual([]);
    expect(shantenZeroMarkup).not.toContain('×');
  });

  it('F1-10: DiscardGlance は D2・D11 でバッジと打牌一覧を表示し不要なラベルを含まない', () => {
    const d2Glance = renderToStaticMarkup(
      <DiscardGlance discards={generateDiscards(HANDS.D2)} />
    );
    expect(
      d2Glance
        .match(
          /<div data-result-kind="([^"]+)" data-discard-next="([^"]+)" class="([^"]+)">/
        )
        ?.slice(1, 4)
    ).toEqual(['discard', 'shanten', 'result-glance result-glance--discard']);
    const d2Badges = [
      ...d2Glance.matchAll(
        /<span class="result-glance__badge">([^<]*)<\/span>/g
      )
    ];
    expect(d2Badges).toHaveLength(1);
    expect(d2Badges[0]?.[1]).toBe('2向聴');
    expect(extractTileLabels(d2Glance)).toEqual([
      '東',
      '南',
      '西',
      '北',
      '白',
      '發',
      '1筒',
      '9筒',
      '1索',
      '9索'
    ]);

    const d11Glance = renderToStaticMarkup(
      <DiscardGlance discards={generateDiscards(HANDS.D11)} />
    );
    expect(
      d11Glance
        .match(
          /<div data-result-kind="([^"]+)" data-discard-next="([^"]+)" class="([^"]+)">/
        )
        ?.slice(1, 4)
    ).toEqual(['discard', 'tempai', 'result-glance result-glance--discard']);
    expect(
      d11Glance.match(/<span class="result-glance__badge">([^<]*)<\/span>/)?.[1]
    ).toBe('聴牌');
    expect(extractTileLabels(d11Glance)).toEqual(['8索', '赤5索', '5索', '東']);

    for (const markup of [d2Glance, d11Glance]) {
      // 牌SVGのdata URIを含むため全体一致ができず、禁止ラベル・旧クラスが含まれないことを部分一致否定で補う
      expect(markup).not.toContain('打');
      expect(markup).not.toContain('待ち');
      expect(markup).not.toContain('受け入れ');
      expect(markup).not.toContain('何切る');
      expect(markup).not.toContain('result-glance__label');
    }
  });

  it('F1-11: DiscardBody・DiscardGlance は空配列で外枠だけを描画する', () => {
    expect(renderToStaticMarkup(<DiscardBody discards={[]} />)).toBe(
      '<div data-result-kind="discard" class="result-body result-body--discard"></div>'
    );
    expect(renderToStaticMarkup(<DiscardGlance discards={[]} />)).toBe(
      '<div data-result-kind="discard" class="result-glance result-glance--discard"></div>'
    );
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
          range: '（役なし / 800点）'
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
          range: '（役なし / 1,000〜1,100点）'
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
        {
          tile: '8s',
          nextKind: 'tempai',
          waits: ['1z'],
          range: '（役なし / 1,500点）'
        },
        {
          tile: '0s',
          nextKind: 'tempai',
          waits: ['1z'],
          range: '（役なし / 800点）'
        },
        {
          tile: '5s',
          nextKind: 'tempai',
          waits: ['1z'],
          range: '（役なし / 1,500点）'
        },
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

  it('F1-13: 打牌の牌の --tile-width は本体の有効牌・待ち牌より大きい', () => {
    const css = readFileSync(new URL('./result.css', import.meta.url), 'utf8');
    const rem = (selector: string): number | null => {
      const escaped = selector.replace(/[.]/g, '\\$&');
      const b =
        css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{[^}]*\\}`))?.[0] ?? '';
      const m = b.match(/--tile-width:\s*([\d.]+)rem/);
      return m?.[1] ? Number(m[1]) : null;
    };
    const base = rem('.result-body');
    const discard = rem('.discard-item__tile');
    expect(base).toBe(1.5);
    expect(discard).not.toBeNull();
    expect(discard ?? 0).toBeGreaterThan(base ?? Number.POSITIVE_INFINITY);
  });
});
