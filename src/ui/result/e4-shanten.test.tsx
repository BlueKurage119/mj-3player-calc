import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { HandOptions } from '../../core/input';
import { generateResult } from '../../core/result';
import { DEFAULT_RULE } from '../../core/rule';
import type { Table } from '../../core/table';
import type { Tile, TileAvailability } from '../../core/tile';
import { classifyResult } from './classify';
import { ShantenBody, ShantenGlance, summarizeAcceptance } from './slots';

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

const extractHeading = (markup: string) => {
  const m = markup.match(
    /<div class="result-body__heading"><h2 class="result-body__title">([^<]*)<\/h2><span class="result-body__summary tabular-nums" data-kinds="(\d+)" data-total="(\d+)">([^<]*)<\/span><\/div>/
  );
  if (!m) return null;
  return {
    title: m[1],
    kinds: Number(m[2]),
    total: Number(m[3]),
    summaryText: m[4]
  };
};

const extractWaitGroups = (markup: string) =>
  [
    ...markup.matchAll(
      /<span class="result-body__wait" data-tile-count="(\d+)"><span role="img" class="tile" aria-label="([^"]+)">.*?<\/span><span class="result-body__wait-count tabular-nums">([^<]*)<\/span><\/span>/g
    )
  ].map(m => ({
    count: Number(m[1]),
    tileLabel: m[2],
    text: m[3]
  }));

const extractTileLabels = (markup: string) =>
  [
    ...markup.matchAll(/<span role="img" class="tile" aria-label="([^"]+)">/g)
  ].map(m => m[1]);

describe('E4: 向聴数・有効牌の結果表示 (E4-01〜E4-07)', () => {
  it('E4-01: summarizeAcceptance は S5 で赤5sを同一種として 4種14枚・5要素を返し、S4 と空配列で 0種0枚・空配列を返す', () => {
    const s5: TileAvailability[] = [
      { tile: { type: 's', n: 2 }, count: 4 },
      { tile: { type: 's', n: 5, red: false }, count: 3 },
      { tile: { type: 's', n: 5, red: true }, count: 1 },
      { tile: { type: 'z', n: 1 }, count: 3 },
      { tile: { type: 'z', n: 5 }, count: 3 }
    ];
    expect(summarizeAcceptance(s5)).toEqual({
      available: s5,
      kinds: 4,
      total: 14
    });

    const s4: TileAvailability[] = [
      { tile: { type: 'z', n: 1 }, count: 0 },
      { tile: { type: 'z', n: 4 }, count: 0 },
      { tile: { type: 'z', n: 5 }, count: 0 }
    ];
    expect(summarizeAcceptance(s4)).toEqual({
      available: [],
      kinds: 0,
      total: 0
    });

    expect(summarizeAcceptance([])).toEqual({
      available: [],
      kinds: 0,
      total: 0
    });
  });

  it('E4-02: ShantenBody は S1 で見出し「1向聴」・data-kinds="3"・data-total="8"・「3種 8枚」・東×2/西×3/北×3 の3組を表示する', () => {
    const s1: TileAvailability[] = [
      { tile: { type: 'z', n: 1 }, count: 2 },
      { tile: { type: 'z', n: 3 }, count: 3 },
      { tile: { type: 'z', n: 4 }, count: 3 }
    ];
    const markup = renderToStaticMarkup(
      <ShantenBody shanten={1} tileAvailabilities={s1} />
    );

    const rootMatch = markup.match(
      /<div data-result-kind="([^"]+)" class="([^"]+)">/
    );
    expect(rootMatch?.[1]).toBe('shanten');
    expect(rootMatch?.[2]).toBe('result-body result-body--shanten');

    expect(extractHeading(markup)).toEqual({
      title: '1向聴',
      kinds: 3,
      total: 8,
      summaryText: '3種 8枚'
    });
    expect(extractWaitGroups(markup)).toEqual([
      { count: 2, tileLabel: '東', text: '×2' },
      { count: 3, tileLabel: '西', text: '×3' },
      { count: 3, tileLabel: '北', text: '×3' }
    ]);
    expect(extractTileLabels(markup)).toEqual(['東', '西', '北']);
  });

  it('E4-03: ShantenBody は S5 で「4種 14枚」と 2索・5索・赤5索・東・白 の5組を表示する', () => {
    const s5: TileAvailability[] = [
      { tile: { type: 's', n: 2 }, count: 4 },
      { tile: { type: 's', n: 5, red: false }, count: 3 },
      { tile: { type: 's', n: 5, red: true }, count: 1 },
      { tile: { type: 'z', n: 1 }, count: 3 },
      { tile: { type: 'z', n: 5 }, count: 3 }
    ];
    const markup = renderToStaticMarkup(
      <ShantenBody shanten={1} tileAvailabilities={s5} />
    );

    expect(extractHeading(markup)).toEqual({
      title: '1向聴',
      kinds: 4,
      total: 14,
      summaryText: '4種 14枚'
    });
    expect(extractWaitGroups(markup)).toEqual([
      { count: 4, tileLabel: '2索', text: '×4' },
      { count: 3, tileLabel: '5索', text: '×3' },
      { count: 1, tileLabel: '赤5索', text: '×1' },
      { count: 3, tileLabel: '東', text: '×3' },
      { count: 3, tileLabel: '白', text: '×3' }
    ]);
  });

  it('E4-04: ShantenBody・ShantenGlance は一部だけ0枚で本体に2組と「2種 5枚」・バナーに牌2枚を表示し「×0」を出さない', () => {
    const partialZero: TileAvailability[] = [
      { tile: { type: 'z', n: 1 }, count: 2 },
      { tile: { type: 'z', n: 4 }, count: 0 },
      { tile: { type: 'z', n: 5 }, count: 3 }
    ];

    const bodyMarkup = renderToStaticMarkup(
      <ShantenBody shanten={1} tileAvailabilities={partialZero} />
    );
    expect(extractHeading(bodyMarkup)).toEqual({
      title: '1向聴',
      kinds: 2,
      total: 5,
      summaryText: '2種 5枚'
    });
    expect(extractWaitGroups(bodyMarkup)).toEqual([
      { count: 2, tileLabel: '東', text: '×2' },
      { count: 3, tileLabel: '白', text: '×3' }
    ]);
    expect(extractTileLabels(bodyMarkup)).toEqual(['東', '白']);
    // 牌SVGのdata URIを含むため全体一致ができず、「×0」が表示されないことを部分一致否定で補う
    expect(bodyMarkup).not.toContain('×0');

    const glanceMarkup = renderToStaticMarkup(
      <ShantenGlance shanten={1} tileAvailabilities={partialZero} />
    );
    const glanceRoot = glanceMarkup.match(
      /<div data-result-kind="([^"]+)" class="([^"]+)">/
    );
    expect(glanceRoot?.[1]).toBe('shanten');
    expect(glanceRoot?.[2]).toBe('result-glance result-glance--shanten');
    expect(
      glanceMarkup.match(
        /<span class="result-glance__label">([^<]*)<\/span>/
      )?.[1]
    ).toBe('1向聴 受け入れ');
    expect(extractTileLabels(glanceMarkup)).toEqual(['東', '白']);
  });

  it('E4-05: ShantenBody・ShantenGlance は全0枚(S4)で本体に見出しと「0種 0枚」・空の牌一覧、バナーにラベルのみ表示する', () => {
    const s4: TileAvailability[] = [
      { tile: { type: 'z', n: 1 }, count: 0 },
      { tile: { type: 'z', n: 4 }, count: 0 },
      { tile: { type: 'z', n: 5 }, count: 0 }
    ];

    const bodyMarkup = renderToStaticMarkup(
      <ShantenBody shanten={1} tileAvailabilities={s4} />
    );
    expect(bodyMarkup).toBe(
      '<div data-result-kind="shanten" class="result-body result-body--shanten"><div class="result-body__heading"><h2 class="result-body__title">1向聴</h2><span class="result-body__summary tabular-nums" data-kinds="0" data-total="0">0種 0枚</span></div><div class="result-body__tiles"></div></div>'
    );

    const glanceMarkup = renderToStaticMarkup(
      <ShantenGlance shanten={1} tileAvailabilities={s4} />
    );
    expect(glanceMarkup).toBe(
      '<div data-result-kind="shanten" class="result-glance result-glance--shanten"><span class="result-glance__label">1向聴 受け入れ</span><div class="glance-tiles"></div></div>'
    );
  });

  it('E4-06: ShantenGlance は S1 で「1向聴 受け入れ」と牌3枚を表示し「×」と「枚」を含まない', () => {
    const s1: TileAvailability[] = [
      { tile: { type: 'z', n: 1 }, count: 2 },
      { tile: { type: 'z', n: 3 }, count: 3 },
      { tile: { type: 'z', n: 4 }, count: 3 }
    ];
    const markup = renderToStaticMarkup(
      <ShantenGlance shanten={1} tileAvailabilities={s1} />
    );

    const rootMatch = markup.match(
      /<div data-result-kind="([^"]+)" class="([^"]+)">/
    );
    expect(rootMatch?.[1]).toBe('shanten');
    expect(rootMatch?.[2]).toBe('result-glance result-glance--shanten');
    expect(
      markup.match(/<span class="result-glance__label">([^<]*)<\/span>/)?.[1]
    ).toBe('1向聴 受け入れ');
    expect(extractTileLabels(markup)).toEqual(['東', '西', '北']);
    // 牌SVGのdata URIを含むため全体一致ができず、バナーに枚数表記が出ないことを部分一致否定で補う
    expect(markup).not.toContain('×');
    expect(markup).not.toContain('枚');
  });

  it('E4-07: 結合: generateResult → classifyResult で S1〜S5 が仕様どおりの向聴数・有効牌になる', () => {
    const classifyHand = (hand: string, dora = '', nuki = 0) =>
      classifyResult(
        generateResult(
          southTable,
          {
            hand: parseTiles(hand),
            melds: [],
            dora: dora === '' ? [] : parseTiles(dora),
            nuki
          },
          defaultOptions,
          DEFAULT_RULE
        )
      );

    expect(classifyHand('123p456p789s11z34z')).toEqual({
      kind: 'shanten',
      shanten: 1,
      tileAvailabilities: [
        { tile: { type: 'z', n: 1 }, count: 2 },
        { tile: { type: 'z', n: 3 }, count: 3 },
        { tile: { type: 'z', n: 4 }, count: 3 }
      ]
    });

    expect(classifyHand('1199p1199s12345z')).toEqual({
      kind: 'shanten',
      shanten: 2,
      tileAvailabilities: [
        { tile: { type: 'z', n: 1 }, count: 3 },
        { tile: { type: 'z', n: 2 }, count: 3 },
        { tile: { type: 'z', n: 3 }, count: 3 },
        { tile: { type: 'z', n: 4 }, count: 3 },
        { tile: { type: 'z', n: 5 }, count: 3 }
      ]
    });

    expect(classifyHand('1m19p19s1234567z5p')).toEqual({
      kind: 'shanten',
      shanten: 1,
      tileAvailabilities: [
        { tile: { type: 'm', n: 1 }, count: 3 },
        { tile: { type: 'm', n: 9 }, count: 4 },
        { tile: { type: 'p', n: 1 }, count: 3 },
        { tile: { type: 'p', n: 9 }, count: 3 },
        { tile: { type: 's', n: 1 }, count: 3 },
        { tile: { type: 's', n: 9 }, count: 3 },
        { tile: { type: 'z', n: 1 }, count: 3 },
        { tile: { type: 'z', n: 2 }, count: 3 },
        { tile: { type: 'z', n: 3 }, count: 3 },
        { tile: { type: 'z', n: 4 }, count: 3 },
        { tile: { type: 'z', n: 5 }, count: 3 },
        { tile: { type: 'z', n: 6 }, count: 3 },
        { tile: { type: 'z', n: 7 }, count: 3 }
      ]
    });

    expect(classifyHand('1145z', '11555z', 3)).toEqual({
      kind: 'shanten',
      shanten: 1,
      tileAvailabilities: [
        { tile: { type: 'z', n: 1 }, count: 0 },
        { tile: { type: 'z', n: 4 }, count: 0 },
        { tile: { type: 'z', n: 5 }, count: 0 }
      ]
    });

    expect(classifyHand('123p456p789p34s15z')).toEqual({
      kind: 'shanten',
      shanten: 1,
      tileAvailabilities: [
        { tile: { type: 's', n: 2 }, count: 4 },
        { tile: { type: 's', n: 5, red: false }, count: 3 },
        { tile: { type: 's', n: 5, red: true }, count: 1 },
        { tile: { type: 'z', n: 1 }, count: 3 },
        { tile: { type: 'z', n: 5 }, count: 3 }
      ]
    });
  });
});
