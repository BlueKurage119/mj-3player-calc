import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HandOptions, Meld } from '../../core/input';
import { generateResult } from '../../core/result';
import { DEFAULT_RULE, type Rule } from '../../core/rule';
import type { Table } from '../../core/table';
import type { Tile } from '../../core/tile';
import type { ResultContext, ShareInput } from '../result/hora/HoraDetail';
import { readLightColors } from './light-colors';
import { qrMatrix } from './qr';
import { renderShareImage } from './render-share-image';
import {
  APP_NAME,
  SHARE_URL,
  buildShareFileName,
  buildShareText,
  shareUrlLabel
} from './share-config';
import { type ShareColors, type ShareData, buildShareData } from './share-data';
import { layoutShareImage } from './share-layout';
import { SHARE_THEME_V1 } from './share-theme';
import { detectShareSupport } from './support';
import { ensureSvgSize } from './svg-image';

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

const defaultTable: Table = {
  round: 'south',
  seat: 'south',
  continue: 1,
  deposit: 0
};

const BACK_TILE = { type: 'back' } as const;

function makeShareContext(
  hand: Tile[],
  overrides: {
    table?: Table;
    rule?: Rule;
    melds?: Meld[];
    dora?: Tile[];
    uradora?: Tile[];
    nuki?: number;
    riichi?: HandOptions['riichi'];
  } = {}
): ResultContext & { share: ShareInput } {
  const table = overrides.table ?? defaultTable;
  const rule = overrides.rule ?? DEFAULT_RULE;
  return {
    table,
    rule,
    share: {
      hand,
      melds: overrides.melds ?? [],
      dora: overrides.dora ?? [],
      uradora: overrides.uradora ?? [],
      nuki: overrides.nuki ?? 0,
      riichi: overrides.riichi ?? 'none',
      red: rule.red,
      nukiEnabled: rule.north !== 'yakuhai'
    }
  };
}

describe('SNS共有画像データ・レイアウト・ユーティリティ (H2-AC9, H2-AC14)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('H2-AC9-a: 14枚で最後の入力牌を和了牌として末尾に置き、門前部分を整列する', () => {
    const hand: Tile[] = [
      { type: 's', n: 8 },
      { type: 'p', n: 2 },
      { type: 'p', n: 3 },
      { type: 'p', n: 4 },
      { type: 'p', n: 5, red: false },
      { type: 'p', n: 6 },
      { type: 'p', n: 7 },
      { type: 's', n: 3 },
      { type: 's', n: 4 },
      { type: 's', n: 6 },
      { type: 's', n: 7 },
      { type: 'p', n: 9 },
      { type: 'p', n: 9 },
      { type: 's', n: 2 }
    ];
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      DEFAULT_RULE
    );
    expect(res?.type).toBe('hora-shanten');
    if (res?.type !== 'hora-shanten' || res.info.type !== 'hora') return;
    const ron = res.info.hora.find(h => h.by === 'ron');
    expect(ron).toBeDefined();
    if (!ron) return;

    const data = buildShareData(ron, makeShareContext(hand));
    expect(data.bodyTiles).toEqual([
      { type: 'p', n: 2 },
      { type: 'p', n: 3 },
      { type: 'p', n: 4 },
      { type: 'p', n: 5, red: false },
      { type: 'p', n: 6 },
      { type: 'p', n: 7 },
      { type: 'p', n: 9 },
      { type: 'p', n: 9 },
      { type: 's', n: 3 },
      { type: 's', n: 4 },
      { type: 's', n: 6 },
      { type: 's', n: 7 },
      { type: 's', n: 8 }
    ]);
    expect(data.horaTile).toEqual({ type: 's', n: 2 });
  });

  it('H2-AC9-b: 13枚の双碰で同種牌を門前部分に残し、末尾に和了牌を置く', () => {
    const hand: Tile[] = [
      { type: 'm', n: 1 },
      { type: 'm', n: 1 },
      { type: 'p', n: 2 },
      { type: 'p', n: 2 },
      { type: 's', n: 1 },
      { type: 's', n: 2 },
      { type: 's', n: 3 },
      { type: 's', n: 4 },
      { type: 's', n: 5, red: false },
      { type: 's', n: 6 },
      { type: 'z', n: 7 },
      { type: 'z', n: 7 },
      { type: 'z', n: 7 }
    ];
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      DEFAULT_RULE
    );
    expect(res?.type).toBe('hora-shanten');
    if (res?.type !== 'hora-shanten' || res.info.type !== 'hora') return;
    const m1Ron = res.info.hora.find(
      h => h.by === 'ron' && h.horaTile.type === 'm' && h.horaTile.n === 1
    );
    expect(m1Ron).toBeDefined();
    if (!m1Ron) return;

    const data = buildShareData(m1Ron, makeShareContext(hand));
    expect(data.bodyTiles).toHaveLength(13);
    expect(
      data.bodyTiles.filter(t => t.type === 'm' && t.n === 1)
    ).toHaveLength(2);
    expect(data.horaTile).toEqual({ type: 'm', n: 1 });
  });

  it('H2-AC14: buildShareData - ドラ・裏ドラは常に長さ5(未入力はback)、立直なしは裏ドラ入力ありでも5枚back、抜き北0/無効、赤5、場況、合計と申告', () => {
    const hand: Tile[] = [
      { type: 'p', n: 2 },
      { type: 'p', n: 3 },
      { type: 'p', n: 4 },
      { type: 's', n: 4 },
      { type: 's', n: 5, red: true },
      { type: 's', n: 6 },
      { type: 'p', n: 9 },
      { type: 'p', n: 9 },
      { type: 'p', n: 5, red: true },
      { type: 'p', n: 5, red: false }
    ];
    const melds: Meld[] = [
      { type: 'kan', closed: true, tile: { type: 'z', n: 1 } }
    ];
    const res = generateResult(
      defaultTable,
      {
        hand,
        melds,
        dora: [{ type: 'p', n: 1 }],
        nuki: 0
      },
      defaultOptions,
      DEFAULT_RULE
    );
    expect(res?.type).toBe('hora-shanten');
    if (res?.type !== 'hora-shanten' || res.info.type !== 'hora') return;
    const ron = res.info.hora.find(h => h.by === 'ron');
    const tsumo = res.info.hora.find(h => h.by === 'tsumo');
    expect(ron).toBeDefined();
    expect(tsumo).toBeDefined();
    if (!ron || !tsumo) return;

    // ドラ0枚 -> back 5枚、非立直+裏ドラ入力あり -> uradora は 5枚とも back、nuki 0 かつ有効 -> 0
    const nonRiichiData = buildShareData(
      ron,
      makeShareContext(hand, {
        melds,
        dora: [],
        uradora: [{ type: 's', n: 1 }],
        nuki: 0,
        riichi: 'none',
        table: { round: 'south', seat: 'south', continue: 1, deposit: 2 }
      })
    );
    expect(nonRiichiData.dora).toEqual([
      BACK_TILE,
      BACK_TILE,
      BACK_TILE,
      BACK_TILE,
      BACK_TILE
    ]);
    expect(nonRiichiData.uradora).toEqual([
      BACK_TILE,
      BACK_TILE,
      BACK_TILE,
      BACK_TILE,
      BACK_TILE
    ]);
    expect(nonRiichiData.nuki).toBe(0);
    expect(nonRiichiData.situation).toBe('南場 1本場 供託2 南家');
    // ロン: 70符3飜(満貫)のため totalText は payment.total の「8,000点」(本場・供託を含まない)、declarationText は null
    expect(nonRiichiData.totalText).toBe('8,000点');
    expect(nonRiichiData.declarationText).toBeNull();
    // 暗槓は両端が裏向き
    expect(nonRiichiData.meldTiles).toEqual([
      [BACK_TILE, { type: 'z', n: 1 }, { type: 'z', n: 1 }, BACK_TILE]
    ]);
    // 赤5が保持される
    expect(
      nonRiichiData.bodyTiles.some(
        t => t.type === 's' && t.n === 5 && t.red === true
      )
    ).toBe(true);
    expect(
      nonRiichiData.bodyTiles.some(
        t => t.type === 'p' && t.n === 5 && t.red === true
      )
    ).toBe(true);

    // 北役牌ルールでは nuki === null、立直ありで裏ドラ1枚+ドラ2枚 -> 先頭が表で残りが back(計5枚)
    const northYakuhaiRule: Rule = { ...DEFAULT_RULE, north: 'yakuhai' };
    const riichiTsumoData = buildShareData(
      tsumo,
      makeShareContext(hand, {
        melds,
        rule: northYakuhaiRule,
        nuki: 2,
        riichi: 'riichi',
        dora: [
          { type: 'p', n: 1 },
          { type: 's', n: 2 }
        ],
        uradora: [{ type: 's', n: 1 }],
        table: { round: 'south', seat: 'south', continue: 2, deposit: 1 }
      })
    );
    expect(riichiTsumoData.nuki).toBeNull();
    expect(riichiTsumoData.dora).toEqual([
      { type: 'p', n: 1 },
      { type: 's', n: 2 },
      BACK_TILE,
      BACK_TILE,
      BACK_TILE
    ]);
    expect(riichiTsumoData.uradora).toEqual([
      { type: 's', n: 1 },
      BACK_TILE,
      BACK_TILE,
      BACK_TILE,
      BACK_TILE
    ]);
    // ツモ: 門前ツモ+赤2+ドラ1で4飜60符(満貫)のため totalText は「6,000点」(本場・供託を含まない)、declarationText は「2,000・4,000」
    expect(riichiTsumoData.totalText).toBe('6,000点');
    expect(riichiTsumoData.declarationText).toBe('2,000・4,000');

    // 立直でも uradora が空配列なら 5枚とも back
    const emptyUraData = buildShareData(
      ron,
      makeShareContext(hand, {
        melds,
        riichi: 'riichi',
        uradora: []
      })
    );
    expect(emptyUraData.uradora).toEqual([
      BACK_TILE,
      BACK_TILE,
      BACK_TILE,
      BACK_TILE,
      BACK_TILE
    ]);
  });

  it('H2-AC14: buildShareData - 親ツモの declarationText は「◯オール」、totalText は合計点、本場抜き', () => {
    const hand: Tile[] = [
      { type: 'p', n: 2 },
      { type: 'p', n: 3 },
      { type: 'p', n: 4 },
      { type: 'p', n: 5, red: false },
      { type: 'p', n: 6 },
      { type: 'p', n: 7 },
      { type: 's', n: 3 },
      { type: 's', n: 4 },
      { type: 's', n: 6 },
      { type: 's', n: 7 },
      { type: 'p', n: 9 },
      { type: 'p', n: 9 },
      { type: 's', n: 2 },
      { type: 's', n: 8 }
    ];
    const dealerTable: Table = {
      round: 'east',
      seat: 'east',
      continue: 3,
      deposit: 2
    };
    const res = generateResult(
      dealerTable,
      { hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      DEFAULT_RULE
    );
    expect(res?.type).toBe('hora-shanten');
    if (res?.type !== 'hora-shanten' || res.info.type !== 'hora') return;
    const tsumo = res.info.hora.find(h => h.by === 'tsumo');
    expect(tsumo).toBeDefined();
    if (!tsumo) return;

    const data = buildShareData(
      tsumo,
      makeShareContext(hand, { table: dealerTable })
    );
    // 親の平和ツモ(20符2飜) = 700オール = 合計 1,400点 (3本場・供託2は含まない)
    expect(data.totalText).toBe('1,400点');
    expect(data.declarationText).toBe('700オール');
  });

  it('H2-AC14: buildShareData - 真の役満は rankText が null、数え役満は「◯符 N飜」が出る', () => {
    // 真の役満 (大三元)
    const yakumanHand: Tile[] = [
      { type: 'z', n: 5 },
      { type: 'z', n: 5 },
      { type: 'z', n: 5 },
      { type: 'z', n: 6 },
      { type: 'z', n: 6 },
      { type: 'z', n: 6 },
      { type: 'z', n: 7 },
      { type: 'z', n: 7 },
      { type: 'p', n: 1 },
      { type: 'p', n: 2 },
      { type: 'p', n: 3 },
      { type: 's', n: 9 },
      { type: 's', n: 9 },
      { type: 'z', n: 7 }
    ];
    const ykRes = generateResult(
      defaultTable,
      { hand: yakumanHand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      DEFAULT_RULE
    );
    expect(ykRes?.type).toBe('hora-shanten');
    if (ykRes?.type !== 'hora-shanten' || ykRes.info.type !== 'hora') return;
    const ykRon = ykRes.info.hora.find(h => h.by === 'ron');
    expect(ykRon).toBeDefined();
    if (!ykRon) return;

    const ykData = buildShareData(ykRon, makeShareContext(yakumanHand));
    expect(ykData.rankText).toBeNull();
    expect(ykData.limitName).toBe('役満');
    expect(ykData.declarationText).toBeNull();
    expect(ykData.totalText).toBe('32,000点');

    // 数え役満 (13飜以上、yakumanPoint === 0)
    const kazoeHand: Tile[] = [
      { type: 'p', n: 1 },
      { type: 'p', n: 2 },
      { type: 'p', n: 3 },
      { type: 'p', n: 4 },
      { type: 'p', n: 5, red: false },
      { type: 'p', n: 6 },
      { type: 'p', n: 7 },
      { type: 'p', n: 8 },
      { type: 'p', n: 9 },
      { type: 'p', n: 2 },
      { type: 'p', n: 3 },
      { type: 'p', n: 9 },
      { type: 'p', n: 9 },
      { type: 'p', n: 4 }
    ];
    const kzRes = generateResult(
      defaultTable,
      {
        hand: kazoeHand,
        melds: [],
        dora: [{ type: 'p', n: 3 }],
        nuki: 0
      },
      { ...defaultOptions, riichi: 'riichi', ippatsu: true },
      DEFAULT_RULE
    );
    expect(kzRes?.type).toBe('hora-shanten');
    if (kzRes?.type !== 'hora-shanten' || kzRes.info.type !== 'hora') return;
    const kzTsumo = kzRes.info.hora.find(h => h.by === 'tsumo');
    expect(kzTsumo).toBeDefined();
    if (!kzTsumo) return;

    const kzData = buildShareData(
      kzTsumo,
      makeShareContext(kazoeHand, {
        dora: [{ type: 'p', n: 3 }],
        riichi: 'riichi'
      })
    );
    expect(kzData.limitName).toBe('数え役満');
    expect(kzData.rankText).toBe(
      `${kzTsumo.score.fu}符 ${kzTsumo.score.han}飜`
    );
    expect(kzData.declarationText).not.toBeNull();
  });

  it('H2-AC14: shareUrlLabel・buildShareText・無効URL保険・ファイル名生成', () => {
    expect(SHARE_URL).toBe('https://bluekurage119.github.io/mj-3player-calc/');
    expect(shareUrlLabel(SHARE_URL)).toBe(
      'bluekurage119.github.io/mj-3player-calc'
    );
    expect(buildShareText(SHARE_URL)).toBe(
      '三麻点数計算機\nhttps://bluekurage119.github.io/mj-3player-calc/'
    );

    for (const invalid of [
      null,
      '',
      'http://bluekurage119.github.io/mj-3player-calc/',
      'https://',
      'ftp://example.com'
    ]) {
      expect(shareUrlLabel(invalid)).toBeNull();
      expect(buildShareText(invalid)).toBe(APP_NAME);
    }

    const d = new Date(2026, 10, 15, 9, 5, 3);
    expect(buildShareFileName('ron', d)).toBe(
      'mj3calc-ron-20261115-090503.png'
    );
    expect(buildShareFileName('tsumo', d)).toBe(
      'mj3calc-tsumo-20261115-090503.png'
    );
  });

  it('H2-AC14: layoutShareImage - 役15行でもフッターと重ならず、副露4組でも左基準で余白内、ドラ常に10枚、URL無効時はnull', () => {
    const hand: Tile[] = [
      { type: 'p', n: 1 },
      { type: 'p', n: 1 }
    ];
    const melds: Meld[] = [
      { type: 'kan', closed: true, tile: { type: 'm', n: 1 } },
      { type: 'kan', closed: false, tile: { type: 'm', n: 9 } },
      { type: 'kan', closed: true, tile: { type: 'z', n: 5 } },
      { type: 'kan', closed: false, tile: { type: 'z', n: 6 } }
    ];
    const res = generateResult(
      defaultTable,
      { hand, melds, dora: [], nuki: 0 },
      defaultOptions,
      DEFAULT_RULE
    );
    expect(res?.type).toBe('hora-shanten');
    if (res?.type !== 'hora-shanten' || res.info.type !== 'hora') return;
    const ron = res.info.hora.find(h => h.by === 'ron');
    expect(ron).toBeDefined();
    if (!ron) return;

    const baseData = buildShareData(ron, makeShareContext(hand, { melds }));
    const manyYakuData: ShareData = {
      ...baseData,
      yaku: Array.from({ length: 15 }, (_, i) => ({
        label: `テスト役${i + 1}`,
        han: '1飜'
      }))
    };

    const layout = layoutShareImage(manyYakuData, SHARE_THEME_V1);
    expect(layout.width).toBe(1080);
    expect(layout.height).toBe(1350);
    expect(layout.yakuRows).toHaveLength(15);
    // ドラ・裏ドラは常に5枚ずつ = 計10枚
    expect(layout.doraTiles).toHaveLength(10);
    expect(layout.doraLabels.map(l => l.text)).toEqual([
      'ドラ',
      '裏ドラ',
      '北×0'
    ]);

    const lastYaku = layout.yakuRows[14];
    expect(lastYaku).toBeDefined();
    if (lastYaku) {
      expect(lastYaku.fontSize).toBeGreaterThanOrEqual(30);
      expect(lastYaku.y + lastYaku.fontSize / 2).toBeLessThan(
        layout.footer.band.y
      );
    }

    // 副露4組(槓4つ=16枚+雀頭2枚=18枚)が x=64 起点ですべて左右余白内(右端 <= 1004)
    expect(layout.handTiles).toHaveLength(18);
    expect(layout.handTiles[0]?.x).toBe(64);
    for (const tile of layout.handTiles) {
      expect(tile.x).toBeGreaterThanOrEqual(64);
      expect(tile.x + tile.width).toBeLessThanOrEqual(1004);
    }
    expect(layout.byBadge.x + layout.byBadge.width).toBeLessThanOrEqual(1016);

    // QR 領域と URL
    expect(layout.footer.qr).toMatchObject({
      x: 848,
      y: 1166,
      size: 168,
      quietZone: 4
    });
    expect(layout.footer.url?.text).toBe(
      'bluekurage119.github.io/mj-3player-calc'
    );

    // URL 無効時は url と qr が null
    const noUrlData = buildShareData(
      ron,
      makeShareContext(hand, { melds }),
      'http://insecure.example.com/'
    );
    expect(noUrlData.url).toBeNull();
    expect(noUrlData.urlLabel).toBeNull();
    const noUrlLayout = layoutShareImage(noUrlData, SHARE_THEME_V1);
    expect(noUrlLayout.footer.url).toBeNull();
    expect(noUrlLayout.footer.qr).toBeNull();
  });

  it('H2-AC14: layoutShareImage - 計測関数差し替えによる符・飜+申告の一体縮小・次行送り・省略時動作・役満ロン行省略', () => {
    const base: ShareData = {
      by: 'tsumo',
      bodyTiles: Array.from({ length: 13 }, () => ({ type: 'p', n: 1 })),
      meldTiles: [],
      horaTile: { type: 'p', n: 1 },
      dora: Array.from({ length: 5 }, () => BACK_TILE),
      uradora: Array.from({ length: 5 }, () => BACK_TILE),
      nuki: 0,
      yaku: [{ label: '立直', han: '1飜' }],
      rankText: '30符 1飜',
      limitName: null,
      totalText: '1,100点',
      declarationText: '300・500',
      situation: '南場 0本場 供託0 南家',
      appName: APP_NAME,
      url: SHARE_URL,
      urlLabel: 'bluekurage119.github.io/mj-3player-calc'
    };

    // 1. 計測関数省略時も例外なく座標が返り、72px で 1 行に収まる
    const defaultLayout = layoutShareImage(base, SHARE_THEME_V1);
    expect(defaultLayout.rank?.fontPx).toBe(72);
    expect(defaultLayout.declaration?.fontPx).toBe(72);
    expect(defaultLayout.declaration?.y).toBe(defaultLayout.rank?.y);
    expect(defaultLayout.rankBlockHeight).toBe(72);

    // 2. 1文字 = fontPx の固定幅計測関数で、72px で 952 を超え 64px で収まる入力を検証
    // 「110符 13飜」(7文字) + 「4,000・8,000」(11文字) + 間隔 0.8em = 18.8 * fontPx
    // 72 * 18.8 = 1353.6 > 952, 52 * 18.8 = 977.6 > 952, 48 * 18.8 = 902.4 <= 952
    // もう少し長い/短いケースで途中縮小 (例: 合計 14.8em: 「30符 3飜」(6) + 「1,000・2,000」(11) -> 17.8em -> 52pxで 925.6 <= 952)
    const fixedMeasurer = (text: string, fontPx: number) =>
      text.length * fontPx;
    const shrinkCase: ShareData = {
      ...base,
      rankText: '30符 3飜', // 6文字
      declarationText: '1,000・2,000' // 11文字 -> 6 + 0.8 + 11 = 17.8em
    };
    // 56px: 56 * 17.8 = 996.8 > 952, 52px: 52 * 17.8 = 925.6 <= 952
    const shrunkLayout = layoutShareImage(
      shrinkCase,
      SHARE_THEME_V1,
      fixedMeasurer
    );
    expect(shrunkLayout.rank?.fontPx).toBe(52);
    expect(shrunkLayout.declaration?.fontPx).toBe(52);
    expect(shrunkLayout.rank?.fontPx).toBeGreaterThanOrEqual(48);
    expect(shrunkLayout.declaration?.y).toBe(shrunkLayout.rank?.y);
    expect(shrunkLayout.declaration?.x).toBeGreaterThan(
      shrunkLayout.rank?.x ?? 0
    );

    // 3. 48px でも 952 を超える入力 -> 48px で次行送り (declaration.y > rank.y) かつ yakuBottom が 1 行時より小さい
    const wrapCase: ShareData = {
      ...base,
      rankText: '110符 13飜', // 7文字
      declarationText: '12,000・24,000' // 13文字 -> 7 + 0.8 + 13 = 20.8em -> 48 * 20.8 = 998.4 > 952
    };
    const wrappedLayout = layoutShareImage(
      wrapCase,
      SHARE_THEME_V1,
      fixedMeasurer
    );
    expect(wrappedLayout.rank?.fontPx).toBe(48);
    expect(wrappedLayout.declaration?.fontPx).toBe(48);
    expect(wrappedLayout.declaration?.x).toBe(64);
    expect(wrappedLayout.declaration?.y ?? 0).toBeGreaterThan(
      wrappedLayout.rank?.y ?? 0
    );
    expect(wrappedLayout.yakuBottom).toBeLessThan(defaultLayout.yakuBottom);
    expect(wrappedLayout.yakuBottom).toBeLessThan(shrunkLayout.yakuBottom);

    // 4. 真の役満ロン: 符・飜の行が無く rankBlockHeight === 0 で点数行が詰まる
    const yakumanRon: ShareData = {
      ...base,
      by: 'ron',
      rankText: null,
      declarationText: null,
      limitName: '役満',
      totalText: '32,000点'
    };
    const ykRonLayout = layoutShareImage(yakumanRon, SHARE_THEME_V1);
    expect(ykRonLayout.rank).toBeNull();
    expect(ykRonLayout.declaration).toBeNull();
    expect(ykRonLayout.rankBlockHeight).toBe(0);
    expect(ykRonLayout.yakuBottom).toBeGreaterThan(defaultLayout.yakuBottom);

    // 5. 真の役満ツモ: rank は null、declaration だけ左寄せ 72px で出る
    const yakumanTsumo: ShareData = {
      ...base,
      by: 'tsumo',
      rankText: null,
      declarationText: '8,000・16,000',
      limitName: '役満',
      totalText: '24,000点'
    };
    const ykTsumoLayout = layoutShareImage(yakumanTsumo, SHARE_THEME_V1);
    expect(ykTsumoLayout.rank).toBeNull();
    expect(ykTsumoLayout.declaration?.x).toBe(64);
    expect(ykTsumoLayout.declaration?.fontPx).toBe(72);

    // 6. ドラ行が 952 を超える計測幅のとき、ドラ牌幅が 36 に縮む
    const wideDoraMeasurer = (text: string, fontPx: number) =>
      text === 'ドラ' || text === '裏ドラ' || text.startsWith('北×')
        ? text.length * fontPx * 2.5
        : text.length * fontPx * 0.5;
    const compactDoraLayout = layoutShareImage(
      base,
      SHARE_THEME_V1,
      wideDoraMeasurer
    );
    expect(compactDoraLayout.doraTiles[0]?.width).toBe(36);
  });

  it('H2-AC14: ensureSvgSize はルート <svg に width/height が無い場合だけ挿入する', () => {
    const frontSvg = readFileSync(
      new URL('../tile/base/Front.svg', import.meta.url),
      'utf8'
    );
    const sized = ensureSvgSize(frontSvg, 300, 400);
    // 意図的アサーション: 属性追加結果の開始タグを検証
    expect(sized).toContain('width="300"');
    expect(sized).toContain('height="400"');
    expect(sized.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(
      true
    );

    const alreadySized =
      '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400"></svg>';
    expect(ensureSvgSize(alreadySized, 300, 400)).toBe(alreadySized);
  });

  it('H2-AC14: readLightColors は Container 系4色を含む全ライト規則を読み、無ければ getComputedStyle にフォールバックする', () => {
    const lightMap: Record<string, string> = {
      '--md-sys-color-surface': 'rgb(247, 251, 241)',
      '--md-sys-color-on-surface': 'rgb(25, 29, 23)',
      '--md-sys-color-on-surface-variant': 'rgb(66, 73, 64)',
      '--md-sys-color-surface-container-highest': 'rgb(224, 228, 219)',
      '--md-sys-color-primary-container': 'rgb(188, 240, 180)',
      '--md-sys-color-on-primary-container': 'rgb(36, 80, 35)',
      '--md-sys-color-tertiary-container': 'rgb(188, 235, 240)',
      '--md-sys-color-on-tertiary-container': 'rgb(30, 77, 82)',
      '--md-sys-color-primary': 'rgb(60, 105, 57)',
      '--md-sys-color-on-primary': 'rgb(255, 255, 255)',
      '--md-sys-color-tertiary': 'rgb(56, 101, 106)',
      '--md-sys-color-on-tertiary': 'rgb(255, 255, 255)',
      '--md-sys-color-error': 'rgb(186, 26, 26)'
    };
    const darkMap: Record<string, string> = {
      '--md-sys-color-surface': 'rgb(16, 20, 15)',
      '--md-sys-color-on-surface': 'rgb(224, 228, 219)'
    };

    const sheets = [
      {
        // static-tokens 相当 (:root だが --md-sys-color-surface を持たない)
        cssRules: [
          {
            selectorText: ':root',
            style: { getPropertyValue: () => '' }
          }
        ]
      },
      {
        // tokens.css 相当 (dark と light がある)
        cssRules: [
          {
            selectorText: ':root[data-theme="dark"]',
            style: {
              getPropertyValue: (k: string) => darkMap[k] ?? ''
            }
          },
          {
            selectorText: ':root',
            style: {
              getPropertyValue: (k: string) => lightMap[k] ?? ''
            }
          }
        ]
      }
    ];

    expect(readLightColors(sheets)).toEqual({
      surface: 'rgb(247, 251, 241)',
      onSurface: 'rgb(25, 29, 23)',
      onSurfaceVariant: 'rgb(66, 73, 64)',
      surfaceContainerHighest: 'rgb(224, 228, 219)',
      primaryContainer: 'rgb(188, 240, 180)',
      onPrimaryContainer: 'rgb(36, 80, 35)',
      tertiaryContainer: 'rgb(188, 235, 240)',
      onTertiaryContainer: 'rgb(30, 77, 82)',
      primary: 'rgb(60, 105, 57)',
      onPrimary: 'rgb(255, 255, 255)',
      tertiary: 'rgb(56, 101, 106)',
      onTertiary: 'rgb(255, 255, 255)',
      error: 'rgb(186, 26, 26)'
    });

    // フォールバック経路 (SecurityError のシートをスキップして getComputedStyle を呼ぶ)
    vi.stubGlobal('document', { documentElement: {} });
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: (k: string) => lightMap[k] ?? ''
    }));
    const throwingSheets = [
      {
        get cssRules(): undefined {
          throw new Error('SecurityError');
        }
      }
    ];
    expect(readLightColors(throwingSheets).primaryContainer).toBe(
      'rgb(188, 240, 180)'
    );
  });

  it('H2-AC14: detectShareSupport は canShare と ClipboardItem の有無を同期判定する', () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('ClipboardItem', undefined);
    expect(detectShareSupport()).toEqual({ share: false, copy: false });

    vi.stubGlobal('navigator', {
      canShare: () => false,
      clipboard: { write: vi.fn() }
    });
    vi.stubGlobal('ClipboardItem', class {});
    expect(detectShareSupport()).toEqual({ share: false, copy: true });

    vi.stubGlobal('navigator', {
      canShare: () => true,
      clipboard: {}
    });
    expect(detectShareSupport()).toEqual({ share: true, copy: false });

    vi.stubGlobal('navigator', {
      canShare: () => true,
      clipboard: { write: vi.fn() }
    });
    expect(detectShareSupport()).toEqual({ share: true, copy: true });
  });

  it('H2-AC14, H2-AC10: renderShareImage は背景→印→牌列→印の文字の順で描画し、QR は4モジュール以上のクワイエットゾーンを持つ', async () => {
    const hand: Tile[] = [
      { type: 'p', n: 2 },
      { type: 'p', n: 3 },
      { type: 'p', n: 4 },
      { type: 'p', n: 5, red: false },
      { type: 'p', n: 6 },
      { type: 'p', n: 7 },
      { type: 's', n: 3 },
      { type: 's', n: 4 },
      { type: 's', n: 6 },
      { type: 's', n: 7 },
      { type: 's', n: 8 },
      { type: 'p', n: 9 },
      { type: 'p', n: 9 },
      { type: 's', n: 2 }
    ];
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [{ type: 'p', n: 1 }], nuki: 1 },
      defaultOptions,
      DEFAULT_RULE
    );
    expect(res?.type).toBe('hora-shanten');
    if (res?.type !== 'hora-shanten' || res.info.type !== 'hora') return;
    const tsumo = res.info.hora.find(h => h.by === 'tsumo');
    expect(tsumo).toBeDefined();
    if (!tsumo) return;

    const data = buildShareData(
      tsumo,
      makeShareContext(hand, { dora: [{ type: 'p', n: 1 }], nuki: 1 })
    );
    const layout = layoutShareImage(data, SHARE_THEME_V1);

    const events: {
      op: string;
      style: string;
      x?: number;
      text?: string;
    }[] = [];
    const fillRectCalls: {
      x: number;
      y: number;
      w: number;
      h: number;
      style: string;
    }[] = [];
    const fillTextCalls: {
      text: string;
      x: number;
      y: number;
      style: string;
    }[] = [];
    const drawImageCalls: unknown[] = [];

    const mockCtx = {
      fillStyle: '',
      font: '',
      textAlign: 'left',
      textBaseline: 'top',
      globalAlpha: 1,
      save: vi.fn(),
      restore: vi.fn(),
      fillRect(x: number, y: number, w: number, h: number) {
        events.push({ op: 'fillRect', style: this.fillStyle, x });
        fillRectCalls.push({ x, y, w, h, style: this.fillStyle });
      },
      fillText(text: string, x: number, y: number) {
        events.push({ op: 'fillText', style: this.fillStyle, text, x });
        fillTextCalls.push({ text, x, y, style: this.fillStyle });
      },
      measureText(text: string) {
        return { width: text.length * 14 };
      },
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      arcTo: vi.fn(),
      closePath: vi.fn(),
      fill() {
        events.push({ op: 'fill', style: this.fillStyle });
      },
      drawImage(...args: unknown[]) {
        events.push({
          op: 'drawImage',
          style: this.fillStyle,
          x: args[1] as number
        });
        drawImageCalls.push(args);
      }
    };

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: () => mockCtx,
      toBlob: (cb: (b: Blob | null) => void, type?: string) => {
        cb(new Blob(['png'], { type: type ?? 'image/png' }));
      }
    };

    vi.stubGlobal('document', {
      createElement: () => mockCanvas
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () =>
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"></svg>'
      }))
    );
    vi.stubGlobal(
      'Image',
      class {
        src = '';
        decode = vi.fn(async () => {});
      }
    );
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn()
    });

    const colors: ShareColors = {
      surface: 'rgb(247, 251, 241)',
      onSurface: 'rgb(25, 29, 23)',
      onSurfaceVariant: 'rgb(66, 73, 64)',
      surfaceContainerHighest: 'rgb(224, 228, 219)',
      primaryContainer: 'rgb(188, 240, 180)',
      onPrimaryContainer: 'rgb(36, 80, 35)',
      tertiaryContainer: 'rgb(188, 235, 240)',
      onTertiaryContainer: 'rgb(30, 77, 82)',
      primary: 'rgb(60, 105, 57)',
      onPrimary: 'rgb(255, 255, 255)',
      tertiary: 'rgb(56, 101, 106)',
      onTertiary: 'rgb(255, 255, 255)',
      error: 'rgb(186, 26, 26)'
    };

    const blob = await renderShareImage(layout, SHARE_THEME_V1, colors);
    expect(blob.type).toBe('image/png');
    expect(mockCanvas.width).toBe(1080);
    expect(mockCanvas.height).toBe(1350);

    // ドラ表1(2) + ドラ裏4(4) + 裏ドラ裏5(5) + 手牌14(28) = 39回 drawImage
    expect(drawImageCalls).toHaveLength(39);

    // 描画順検証: 背景 -> 印(fill tertiaryContainer) -> 和了牌の drawImage -> 印の文字(fillText 'ツモ')
    const bgIndex = events.findIndex(
      e => e.op === 'fillRect' && e.style === colors.surface
    );
    const badgeFillIndex = events.findIndex(
      e => e.op === 'fill' && e.style === colors.tertiaryContainer
    );
    const horaTile = layout.handTiles[layout.handTiles.length - 1];
    const horaDrawIndex = events.findIndex(
      e => e.op === 'drawImage' && e.x === horaTile?.x
    );
    const badgeTextIndex = events.findIndex(
      e => e.op === 'fillText' && e.text === 'ツモ'
    );
    expect(bgIndex).toBeGreaterThanOrEqual(0);
    expect(badgeFillIndex).toBeGreaterThan(bgIndex);
    expect(horaDrawIndex).toBeGreaterThan(badgeFillIndex);
    expect(badgeTextIndex).toBeGreaterThan(horaDrawIndex);

    // 意図的アサーション: drawされた全テキスト集合の中に各要素の完全一致文字列が含まれるかを検証
    const texts = fillTextCalls.map(c => c.text);
    expect(texts).toContain('南場 1本場 供託0 南家');
    expect(texts).toContain('ドラ');
    expect(texts).toContain('裏ドラ');
    expect(texts).toContain('北×1');
    expect(texts).toContain('ツモ');
    expect(texts).toContain(data.rankText);
    expect(texts).toContain(data.declarationText);
    expect(texts).toContain(data.totalText);
    expect(texts).toContain('三麻点数計算機');
    expect(texts).toContain('bluekurage119.github.io/mj-3player-calc');

    // QR 領域の白地とモジュール内側のクワイエットゾーン(4モジュール分以上)を検証
    const qrMatrixData = qrMatrix(SHARE_URL as string, 'M');
    const qrBgRect = fillRectCalls.find(
      r => r.x === 848 && r.y === 1166 && r.w === 168 && r.h === 168
    );
    expect(qrBgRect?.style).toBe(colors.surface);

    const qrModules = fillRectCalls.filter(
      r =>
        r.x >= 848 && r.y >= 1166 && r.w < 168 && r.style === colors.onSurface
    );
    expect(qrModules.length).toBeGreaterThan(0);
    const modSize = qrModules[0]?.w ?? 0;
    expect(modSize).toBeGreaterThanOrEqual(3);
    const minX = Math.min(...qrModules.map(m => m.x));
    const maxX = Math.max(...qrModules.map(m => m.x + m.w));
    const minY = Math.min(...qrModules.map(m => m.y));
    const maxY = Math.max(...qrModules.map(m => m.y + m.h));
    expect(minX - 848).toBeGreaterThanOrEqual(modSize * 4);
    expect(848 + 168 - maxX).toBeGreaterThanOrEqual(modSize * 4);
    expect(minY - 1166).toBeGreaterThanOrEqual(modSize * 4);
    expect(1166 + 168 - maxY).toBeGreaterThanOrEqual(modSize * 4);
    expect(qrMatrixData.length).toBeGreaterThan(0);
  });
});
