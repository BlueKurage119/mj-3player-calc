import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { HandOptions } from '../../core/input';
import { generateResult } from '../../core/result';
import { DEFAULT_RULE } from '../../core/rule';
import type { Table } from '../../core/table';
import type { Tile, TileAvailability } from '../../core/tile';
import { classifyResult } from './classify';
import { HoraBody, HoraGlance, TempaiBody, TempaiGlance } from './slots';

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

describe('E3: 聴牌・和了0件の表示 (E3-01〜E3-06)', () => {
  it('E3-01: HoraGlance は空の hora[] で「和了牌なし」を表示し「役なし」を表示しない', () => {
    const markup = renderToStaticMarkup(<HoraGlance hora={[]} />);
    expect(markup).toBe(
      '<div data-result-kind="hora" class="result-glance result-glance--hora"><span class="result-glance__text">和了牌なし</span></div>'
    );
  });

  it('E3-02: HoraBody は空の hora[] で「和了牌なし」を表示し .hora-detail を含まず data-result-kind="hora" を保つ', () => {
    const markup = renderToStaticMarkup(<HoraBody hora={[]} />);
    expect(markup).toBe(
      '<div data-result-kind="hora" class="result-body result-body--hora"><p class="result-body__text">和了牌なし</p></div>'
    );
  });

  it('E3-03: TempaiBody は T05 で .result-body__wait を3組・data-tile-count 4,3,1・「×4」「×3」「×1」・見出し「聴牌」を表示する', () => {
    // T05: 7枚 34s567p11z -> [2s:4, 5s:3, 赤5s:1]
    const tileAvailabilities: TileAvailability[] = [
      { tile: { type: 's', n: 2 }, count: 4 },
      { tile: { type: 's', n: 5, red: false }, count: 3 },
      { tile: { type: 's', n: 5, red: true }, count: 1 }
    ];
    const markup = renderToStaticMarkup(
      <TempaiBody tileAvailabilities={tileAvailabilities} />
    );

    const rootMatch = markup.match(
      /<div data-result-kind="([^"]+)" class="([^"]+)">/
    );
    expect(rootMatch?.[1]).toBe('tempai');
    expect(rootMatch?.[2]).toBe('result-body result-body--tempai');

    const titleMatch = markup.match(
      /<h2 class="result-body__title">([^<]*)<\/h2>/
    );
    expect(titleMatch?.[1]).toBe('聴牌');

    expect(extractWaitGroups(markup)).toEqual([
      { count: 4, tileLabel: '2索', text: '×4' },
      { count: 3, tileLabel: '5索', text: '×3' },
      { count: 1, tileLabel: '赤5索', text: '×1' }
    ]);
    expect(extractTileLabels(markup)).toEqual(['2索', '5索', '赤5索']);
  });

  it('E3-04: TempaiBody は全0枚(T03・T04)と0件([])で「和了牌なし」のみを表示し見出し「聴牌」と「×0」を出さない', () => {
    const cases: TileAvailability[][] = [
      // T03: [1z:0]
      [{ tile: { type: 'z', n: 1 }, count: 0 }],
      // T04: [4z:0]
      [{ tile: { type: 'z', n: 4 }, count: 0 }],
      // T07: []
      []
    ];

    for (const tileAvailabilities of cases) {
      const markup = renderToStaticMarkup(
        <TempaiBody tileAvailabilities={tileAvailabilities} />
      );
      expect(markup).toBe(
        '<div data-result-kind="tempai" class="result-body result-body--tempai"><p class="result-body__text">和了牌なし</p></div>'
      );
    }
  });

  it('E3-05: TempaiBody・TempaiGlance は一部だけ0枚(T10)で本体に「×2」1組のみ、バナーに「聴牌」のバッジと牌1枚を表示する', () => {
    // T10: 4枚 1144z・抜き北2 -> [1z:2, 4z:0]
    const tileAvailabilities: TileAvailability[] = [
      { tile: { type: 'z', n: 1 }, count: 2 },
      { tile: { type: 'z', n: 4 }, count: 0 }
    ];

    const bodyMarkup = renderToStaticMarkup(
      <TempaiBody tileAvailabilities={tileAvailabilities} />
    );
    const bodyRoot = bodyMarkup.match(
      /<div data-result-kind="([^"]+)" class="([^"]+)">/
    );
    expect(bodyRoot?.[1]).toBe('tempai');
    expect(bodyRoot?.[2]).toBe('result-body result-body--tempai');
    expect(
      bodyMarkup.match(/<h2 class="result-body__title">([^<]*)<\/h2>/)?.[1]
    ).toBe('聴牌');
    expect(extractWaitGroups(bodyMarkup)).toEqual([
      { count: 2, tileLabel: '東', text: '×2' }
    ]);
    expect(extractTileLabels(bodyMarkup)).toEqual(['東']);
    // 牌SVGのdata URIを含むため全体一致ができず、「×0」が表示されないことを部分一致否定で補う
    expect(bodyMarkup).not.toContain('×0');

    const glanceMarkup = renderToStaticMarkup(
      <TempaiGlance tileAvailabilities={tileAvailabilities} />
    );
    const glanceRoot = glanceMarkup.match(
      /<div data-result-kind="([^"]+)" class="([^"]+)">/
    );
    expect(glanceRoot?.[1]).toBe('tempai');
    expect(glanceRoot?.[2]).toBe('result-glance result-glance--tempai');
    expect(
      glanceMarkup.match(
        /<span class="result-glance__badge">([^<]*)<\/span>/
      )?.[1]
    ).toBe('聴牌');
    expect(extractTileLabels(glanceMarkup)).toEqual(['東']);
  });

  it('E3-06: 結合: generateResult → classifyResult で T01・T03・T07・T10 の分類と待ち牌が仕様どおりになる', () => {
    // T01: 13枚 1111p456p789s111z -> hora・0件
    const t01 = classifyResult(
      generateResult(
        southTable,
        {
          hand: parseTiles('1111p456p789s111z'),
          melds: [],
          dora: [],
          nuki: 0
        },
        defaultOptions,
        DEFAULT_RULE
      )
    );
    expect(t01).toEqual({ kind: 'hora', hora: [] });

    // T03: 7枚 123456p1z・ドラ表示 111z -> tempai・[1z:0]
    const t03 = classifyResult(
      generateResult(
        southTable,
        {
          hand: parseTiles('123456p1z'),
          melds: [],
          dora: parseTiles('111z'),
          nuki: 0
        },
        defaultOptions,
        DEFAULT_RULE
      )
    );
    expect(t03).toEqual({
      kind: 'tempai',
      tileAvailabilities: [{ tile: { type: 'z', n: 1 }, count: 0 }]
    });

    // T07: 7枚 1111p456p / 4枚 1111p -> tempai・[]
    const t07a = classifyResult(
      generateResult(
        southTable,
        {
          hand: parseTiles('1111p456p'),
          melds: [],
          dora: [],
          nuki: 0
        },
        defaultOptions,
        DEFAULT_RULE
      )
    );
    expect(t07a).toEqual({ kind: 'tempai', tileAvailabilities: [] });

    const t07b = classifyResult(
      generateResult(
        southTable,
        {
          hand: parseTiles('1111p'),
          melds: [],
          dora: [],
          nuki: 0
        },
        defaultOptions,
        DEFAULT_RULE
      )
    );
    expect(t07b).toEqual({ kind: 'tempai', tileAvailabilities: [] });

    // T10: 4枚 1144z・抜き北2 -> tempai・[1z:2, 4z:0]
    const t10 = classifyResult(
      generateResult(
        southTable,
        {
          hand: parseTiles('1144z'),
          melds: [],
          dora: [],
          nuki: 2
        },
        defaultOptions,
        DEFAULT_RULE
      )
    );
    expect(t10).toEqual({
      kind: 'tempai',
      tileAvailabilities: [
        { tile: { type: 'z', n: 1 }, count: 2 },
        { tile: { type: 'z', n: 4 }, count: 0 }
      ]
    });
  });
});

describe('E3: 13枚形のバナーは点数でなく待ちを出す', () => {
  it('E3-07: waitInput で 13枚 234p567p34s678s99p は「聴牌」のバッジ + 2s・5s・赤5s(重複なし)、ロン・ツモの文字が無い', () => {
    const view = classifyResult(
      generateResult(
        southTable,
        {
          hand: parseTiles('234p567p34s678s99p'),
          melds: [],
          dora: [],
          nuki: 0
        },
        defaultOptions,
        DEFAULT_RULE
      )
    );
    if (view.kind !== 'hora') throw new Error('hora ではない');
    const markup = renderToStaticMarkup(
      <HoraGlance hora={view.hora} waitInput />
    );
    expect(markup).toContain('<span class="result-glance__badge">聴牌</span>');
    expect(markup).not.toContain('待ち');
    expect(extractTileLabels(markup)).toHaveLength(3);
    expect(markup).not.toContain('ロン');
    expect(markup).not.toContain('ツモ');
    // waitInput なし(14枚形)は従来どおり点数
    expect(renderToStaticMarkup(<HoraGlance hora={view.hora} />)).toContain(
      'ロン'
    );
  });

  it('E3-08: waitInput でも hora[] が空なら「和了牌なし」', () => {
    const markup = renderToStaticMarkup(<HoraGlance hora={[]} waitInput />);
    expect(markup).toContain('和了牌なし');
  });
});
