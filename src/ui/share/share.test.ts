import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HandOptions, Meld } from '../../core/input';
import { generateResult } from '../../core/result';
import { DEFAULT_RULE, type Rule } from '../../core/rule';
import type { Table } from '../../core/table';
import type { Tile } from '../../core/tile';
import { CUSTOM_DEPOSIT_STICK, CUSTOM_HONBA_STICK } from '../icons';
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
    expect(nonRiichiData.situation).toBe('南場・南家');
    expect(nonRiichiData.continueCount).toBe(1);
    expect(nonRiichiData.deposit).toBe(2);
    expect(nonRiichiData.isYakuman).toBe(false);
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
    expect(ykData.isYakuman).toBe(true);
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
    expect(kzData.isYakuman).toBe(false);
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

  it('H2-AC14: layoutShareImage - 見出しピル・ドラチップ・役13個以上の安全策(先頭12個のみ)・副露4組でも左基準で余白内・URL無効時はnull', () => {
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
      isYakuman: false,
      yaku: Array.from({ length: 15 }, (_, i) => ({
        label: `テスト役${i + 1}`,
        han: '1飜'
      }))
    };

    const layout = layoutShareImage(manyYakuData, SHARE_THEME_V1);
    expect(layout.width).toBe(1080);
    expect(layout.height).toBe(1350);
    expect(layout.yakuMode).toBe('normal');
    // 13個以上は先頭12個のみ描き例外にしない
    expect(layout.yakuChips).toHaveLength(12);
    expect(layout.yakuChips[0]?.label).toBe('テスト役1');
    expect(layout.yakuChips[11]?.label).toBe('テスト役12');

    // 見出し: 左は「南場・南家」、右から 北 -> 供託 -> 本場 の順で右端1016
    expect(layout.header.text).toBe('南場・南家');
    expect(layout.header.baselineY).toBe(104);
    expect(layout.headerPills.map(p => p.text)).toEqual(['1', '0', '北 0']);
    expect(layout.headerPills[0]?.iconPath).toBe(CUSTOM_HONBA_STICK);
    expect(layout.headerPills[1]?.iconPath).toBe(CUSTOM_DEPOSIT_STICK);
    expect(layout.headerPills[2]?.iconPath).toBeNull();
    const lastPill = layout.headerPills[2];
    expect(lastPill ? lastPill.x + lastPill.width : 0).toBe(1016);
    expect(lastPill?.height).toBe(72);
    expect(lastPill?.cornerRadius).toBe(36);
    expect(lastPill?.bgOpacity).toBe(0.16);
    expect(
      (layout.headerPills[1]?.x ?? 0) -
        ((layout.headerPills[0]?.x ?? 0) + (layout.headerPills[0]?.width ?? 0))
    ).toBe(16);

    // 抜き北無効なら北ピルを出さず、右端は供託ピル
    const noNukiLayout = layoutShareImage(
      { ...baseData, nuki: null },
      SHARE_THEME_V1
    );
    expect(noNukiLayout.headerPills.map(p => p.text)).toEqual(['1', '0']);
    const noNukiLast = noNukiLayout.headerPills[1];
    expect(noNukiLast ? noNukiLast.x + noNukiLast.width : 0).toBe(1016);

    // ドラ・裏ドラは常に5枚ずつ = 計10枚、チップは 240x75、ラベルピルは「ドラ」「裏ドラ」
    expect(layout.doraTiles).toHaveLength(10);
    expect(layout.doraTiles[0]?.width).toBe(44);
    expect(layout.doraLabels.map(l => l.text)).toEqual(['ドラ', '裏ドラ']);
    expect(layout.doraLabels[0]?.height).toBe(52);
    expect(layout.doraChips).toHaveLength(2);
    expect(layout.doraChips[0]).toMatchObject({
      y: 150,
      width: 240,
      height: 75,
      cornerRadius: 14,
      borderWidth: 2
    });

    const lastYaku = layout.yakuChips[11];
    expect(lastYaku).toBeDefined();
    if (lastYaku) {
      expect(lastYaku.y + lastYaku.height).toBe(852);
      expect(lastYaku.y + lastYaku.height).toBeLessThan(layout.footer.band.y);
    }

    // 副露4組(槓4つ=16枚+雀頭2枚=18枚)が x=64 起点・y=293 ですべて左右余白内(右端 <= 1002)
    expect(layout.handTiles).toHaveLength(18);
    expect(layout.handTiles[0]?.x).toBe(64);
    expect(layout.handTiles[0]?.y).toBe(293);
    for (const tile of layout.handTiles) {
      expect(tile.x).toBeGreaterThanOrEqual(64);
      expect(tile.x + tile.width).toBeLessThanOrEqual(1002 + 1e-6);
    }
    expect(layout.byBadge.x + layout.byBadge.width).toBeLessThanOrEqual(
      1016 + 1e-6
    );

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
      continueCount: 0,
      deposit: 0,
      isYakuman: false,
      yaku: [{ label: '立直', han: '1飜' }],
      rankText: '30符 1飜',
      limitName: null,
      totalText: '1,100点',
      declarationText: '300・500',
      situation: '南場・南家',
      appName: APP_NAME,
      url: SHARE_URL,
      urlLabel: 'bluekurage119.github.io/mj-3player-calc'
    };

    // 1. 計測関数省略時も例外なく座標が返り、72px で 1 行に収まる
    const defaultLayout = layoutShareImage(base, SHARE_THEME_V1);
    expect(defaultLayout.rank?.fontPx).toBe(72);
    expect(defaultLayout.rank?.y).toBe(940);
    expect(defaultLayout.declaration?.fontPx).toBe(72);
    expect(defaultLayout.declaration?.y).toBe(940);
    expect(defaultLayout.score.baselineY).toBe(1068);
    expect(defaultLayout.yakuBottom).toBe(852);
    expect(defaultLayout.rankBlockHeight).toBe(72);

    // 2. 1文字 = fontPx の固定幅計測関数で、72px で 952 を超え 52px で収まる入力を検証
    const fixedMeasurer = (text: string, fontPx: number) =>
      text.length * fontPx;
    const shrinkCase: ShareData = {
      ...base,
      rankText: '30符 3飜', // 6文字
      declarationText: '1,000・2,000' // 11文字 -> 6 + 0.8 + 11 = 17.8em
    };
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
      isYakuman: true,
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
      isYakuman: true,
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
      text === 'ドラ' || text === '裏ドラ'
        ? text.length * fontPx * 4
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
      '--md-sys-color-surface-container': 'rgb(236, 239, 230)',
      '--md-sys-color-on-surface': 'rgb(25, 29, 23)',
      '--md-sys-color-on-surface-variant': 'rgb(66, 73, 64)',
      '--md-sys-color-surface-container-highest': 'rgb(224, 228, 219)',
      '--md-sys-color-outline-variant': 'rgb(194, 201, 189)',
      '--md-sys-color-on-secondary-container': 'rgb(59, 75, 56)',
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
      surfaceContainer: 'rgb(236, 239, 230)',
      onSurface: 'rgb(25, 29, 23)',
      onSurfaceVariant: 'rgb(66, 73, 64)',
      surfaceContainerHighest: 'rgb(224, 228, 219)',
      outlineVariant: 'rgb(194, 201, 189)',
      onSecondaryContainer: 'rgb(59, 75, 56)',
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
      alpha?: number;
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
    const strokeCalls: { style: string; lineWidth: number }[] = [];
    const pathFillCalls: string[] = [];
    const drawImageCalls: unknown[] = [];

    class MockPath2D {
      d: string;
      constructor(d: string) {
        this.d = d;
      }
    }
    vi.stubGlobal('Path2D', MockPath2D);

    const alphaStack: number[] = [];
    const mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: 'left',
      textBaseline: 'top',
      globalAlpha: 1,
      save: vi.fn(() => {
        alphaStack.push(mockCtx.globalAlpha);
      }),
      restore: vi.fn(() => {
        const prev = alphaStack.pop();
        if (prev !== undefined) {
          mockCtx.globalAlpha = prev;
        }
      }),
      translate: vi.fn(),
      scale: vi.fn(),
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
      fill(path?: unknown) {
        events.push({
          op: 'fill',
          style: this.fillStyle,
          alpha: this.globalAlpha
        });
        if (path instanceof MockPath2D) {
          pathFillCalls.push(path.d);
        }
      },
      stroke() {
        events.push({ op: 'stroke', style: this.strokeStyle });
        strokeCalls.push({
          style: this.strokeStyle,
          lineWidth: this.lineWidth
        });
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
      surfaceContainer: 'rgb(236, 239, 230)',
      onSurface: 'rgb(25, 29, 23)',
      onSurfaceVariant: 'rgb(66, 73, 64)',
      surfaceContainerHighest: 'rgb(224, 228, 219)',
      outlineVariant: 'rgb(194, 201, 189)',
      onSecondaryContainer: 'rgb(59, 75, 56)',
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

    // 見出しピル(点棒アイコン Path2D と 不透明度 0.16)・ドラチップ枠線(outlineVariant 2px)・役チップ塗りを検証
    expect(pathFillCalls).toEqual([CUSTOM_HONBA_STICK, CUSTOM_DEPOSIT_STICK]);
    expect(
      events.some(
        e =>
          e.op === 'fill' &&
          e.style === colors.onSecondaryContainer &&
          e.alpha === 0.16
      )
    ).toBe(true);
    expect(strokeCalls).toEqual([
      { style: colors.outlineVariant, lineWidth: 2 },
      { style: colors.outlineVariant, lineWidth: 2 }
    ]);
    expect(
      events.some(e => e.op === 'fill' && e.style === colors.surfaceContainer)
    ).toBe(true);
    expect(
      events.some(e => e.op === 'fill' && e.style === colors.primary)
    ).toBe(true);

    // 意図的アサーション: drawされた全テキスト集合の中に各要素の完全一致文字列が含まれるかを検証
    const texts = fillTextCalls.map(c => c.text);
    expect(texts).toContain('南場・南家');
    expect(texts).toContain('1');
    expect(texts).toContain('0');
    expect(texts).toContain('北 1');
    expect(texts).toContain('ドラ');
    expect(texts).toContain('裏ドラ');
    expect(texts).toContain('ツモ');
    expect(texts).toContain(data.rankText);
    expect(texts).toContain(data.declarationText);
    expect(texts).toContain(data.totalText);
    expect(texts).toContain('三麻点数計算機');
    expect(texts).toContain('bluekurage119.github.io/mj-3player-calc');
    expect(texts).not.toContain('北×1');
    expect(texts).not.toContain('南場 1本場 供託0 南家');

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

describe('H2-AC23: 役明細(2列×6行チップ・最長役名・真の役満1列・複合役満・数え役満)', () => {
  it('H2-AC23-1: 役が12個の通常手は2列×6行の縦読みでチップ(468×64)と飜数塗りバッジを配置する', () => {
    // 立直・一発・門前清自摸和・平和・断么九・二盃口・清一色・海底撈月・ドラ・裏ドラ・赤ドラ・抜きドラ (12個)
    const hand: Tile[] = [
      { type: 'p', n: 2 },
      { type: 'p', n: 2 },
      { type: 'p', n: 3 },
      { type: 'p', n: 3 },
      { type: 'p', n: 4 },
      { type: 'p', n: 4 },
      { type: 'p', n: 5, red: true },
      { type: 'p', n: 6 },
      { type: 'p', n: 7 },
      { type: 'p', n: 6 },
      { type: 'p', n: 7 },
      { type: 'p', n: 8 },
      { type: 'p', n: 8 },
      { type: 'p', n: 5, red: false }
    ];
    const options: HandOptions = {
      ...defaultOptions,
      riichi: 'riichi',
      ippatsu: true,
      haitei: true
    };
    const dora: Tile[] = [{ type: 'p', n: 1 }];
    const uradora: Tile[] = [{ type: 'p', n: 7 }];
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora, uradora, nuki: 1 },
      options,
      DEFAULT_RULE
    );
    expect(res?.type).toBe('hora-shanten');
    if (res?.type !== 'hora-shanten' || res.info.type !== 'hora') return;
    const tsumo = res.info.hora.find(h => h.by === 'tsumo');
    expect(tsumo).toBeDefined();
    if (!tsumo) return;
    expect(tsumo.yaku).toHaveLength(12);

    const data = buildShareData(
      tsumo,
      makeShareContext(hand, {
        dora,
        uradora,
        nuki: 1,
        riichi: 'riichi'
      })
    );
    const layout = layoutShareImage(data, SHARE_THEME_V1);
    expect(layout.yakuMode).toBe('normal');
    expect(layout.yakuTop).toBe(408);
    expect(layout.yakuBottom).toBeGreaterThanOrEqual(852);
    expect(layout.yakuChips).toHaveLength(12);

    // 縦読み: 0..5 が左列(x=64)、6..11 が右列(x=548)
    for (let i = 0; i < 6; i++) {
      const leftChip = layout.yakuChips[i];
      const rightChip = layout.yakuChips[i + 6];
      expect(leftChip).toBeDefined();
      expect(rightChip).toBeDefined();
      if (!leftChip || !rightChip) continue;
      expect(leftChip.x).toBe(64);
      expect(rightChip.x).toBe(548);
      expect(leftChip.y).toBe(rightChip.y);
      expect(leftChip.y).toBe(408 + i * (64 + 12));
      expect(leftChip.width).toBe(468);
      expect(leftChip.height).toBe(64);
      expect(leftChip.cornerRadius).toBe(16);
      expect(leftChip.bgColorRole).toBe('surfaceContainer');
      expect(leftChip.hanBadge).not.toBeNull();
      expect(leftChip.hanBadge?.bgColorRole).toBe('primary');
      expect(leftChip.hanBadge?.fgColorRole).toBe('onPrimary');
      expect(rightChip.hanBadge).not.toBeNull();
    }
    const lastChip = layout.yakuChips[11];
    expect(lastChip ? lastChip.y + lastChip.height : 0).toBe(852);
  });

  it('H2-AC23-2: オープンダブル立直・国士無双十三面待ち(各9文字)が計測関数差し替え時も最小26px以上で通常チップの役名領域に収まる', () => {
    // 1. 実和了データでオープンダブル立直を含む手を検証
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
    const openDoubleRule: Rule = { ...DEFAULT_RULE, openRiichi: true };
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      { ...defaultOptions, riichi: 'open-double-riichi' },
      openDoubleRule
    );
    expect(res?.type).toBe('hora-shanten');
    if (res?.type !== 'hora-shanten' || res.info.type !== 'hora') return;
    const ron = res.info.hora.find(h => h.by === 'ron');
    expect(ron).toBeDefined();
    if (!ron) return;

    const realData = buildShareData(
      ron,
      makeShareContext(hand, {
        rule: openDoubleRule,
        riichi: 'open-double-riichi'
      })
    );
    const realLayout = layoutShareImage(realData, SHARE_THEME_V1);
    const openDoubleChip = realLayout.yakuChips.find(
      c => c.label === 'オープンダブル立直'
    );
    expect(openDoubleChip).toBeDefined();
    expect(openDoubleChip?.labelFontSize).toBeGreaterThanOrEqual(26);

    // 2. measureTextWidth を差し替え (1文字=1.15*fontPx で 34px からは縮小されるが 26px 以上で省略されず収まる条件)
    const tightMeasurer = (text: string, fontPx: number) =>
      text.length * fontPx * 1.15;
    const syntheticNormalData: ShareData = {
      ...realData,
      isYakuman: false,
      yaku: [
        { label: 'オープンダブル立直', han: '3飜' },
        { label: '国士無双十三面待ち', han: '13飜' }
      ]
    };
    const tightLayout = layoutShareImage(
      syntheticNormalData,
      SHARE_THEME_V1,
      tightMeasurer
    );
    for (const chip of tightLayout.yakuChips) {
      expect(chip.label.endsWith('…')).toBe(false);
      expect(chip.labelFontSize).toBeGreaterThanOrEqual(26);
      expect(chip.labelFontSize).toBeLessThanOrEqual(34);
      expect(tightMeasurer(chip.label, chip.labelFontSize)).toBeLessThanOrEqual(
        chip.labelMaxWidth
      );
      expect(tightMeasurer(chip.label, 26)).toBeLessThanOrEqual(
        chip.labelMaxWidth
      );
    }

    // 1文字=fontPx でさらに確認: 「オープンダブル立直」「国士無双十三面待ち」が最小26px以下で確実に収まる
    const unitMeasurer = (text: string, fontPx: number) => text.length * fontPx;
    const unitLayout = layoutShareImage(
      syntheticNormalData,
      SHARE_THEME_V1,
      unitMeasurer
    );
    expect(unitLayout.yakuChips[0]?.label).toBe('オープンダブル立直');
    expect(unitLayout.yakuChips[1]?.label).toBe('国士無双十三面待ち');
    expect(unitMeasurer('オープンダブル立直', 26)).toBeLessThanOrEqual(
      unitLayout.yakuChips[0]?.labelMaxWidth ?? 0
    );
    expect(unitMeasurer('国士無双十三面待ち', 26)).toBeLessThanOrEqual(
      unitLayout.yakuChips[1]?.labelMaxWidth ?? 0
    );
  });

  it('H2-AC23-3: 国士無双十三面待ち(真の役満単独)は1列チップ(952×76)・飜数バッジなし・格が点数行に出る', () => {
    const hand: Tile[] = [
      { type: 'm', n: 1 },
      { type: 'm', n: 9 },
      { type: 'p', n: 1 },
      { type: 'p', n: 9 },
      { type: 's', n: 1 },
      { type: 's', n: 9 },
      { type: 'z', n: 1 },
      { type: 'z', n: 2 },
      { type: 'z', n: 3 },
      { type: 'z', n: 4 },
      { type: 'z', n: 5 },
      { type: 'z', n: 6 },
      { type: 'z', n: 7 },
      { type: 'm', n: 1 }
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
    const layout = layoutShareImage(data, SHARE_THEME_V1);

    expect(layout.yakuMode).toBe('yakuman');
    expect(layout.yakuChips).toHaveLength(1);
    expect(layout.yakuChips[0]).toMatchObject({
      x: 64,
      y: 408,
      width: 952,
      height: 76,
      cornerRadius: 20,
      label: '国士無双十三面待ち',
      hanBadge: null
    });
    expect(layout.yakuChips[0]?.labelFontSize).toBe(44);
    expect(layout.score.limitName).toBe('二倍役満');
    expect(layout.rank).toBeNull();
  });

  it('H2-AC23-4: 役満の複合(大三元+字一色)は複合あり・なしルールとも成立した役満すべてを1列チップ・バッジなしで表示する', () => {
    // 大三元 + 字一色 (東ポン + 白×3, 發×3, 中×3, 南×2)
    const hand: Tile[] = [
      { type: 'z', n: 5 },
      { type: 'z', n: 5 },
      { type: 'z', n: 5 },
      { type: 'z', n: 6 },
      { type: 'z', n: 6 },
      { type: 'z', n: 6 },
      { type: 'z', n: 7 },
      { type: 'z', n: 7 },
      { type: 'z', n: 7 },
      { type: 'z', n: 2 },
      { type: 'z', n: 2 }
    ];
    const melds: Meld[] = [{ type: 'pon', tile: { type: 'z', n: 1 } }];

    for (const multipleYakuman of [true, false]) {
      const rule: Rule = { ...DEFAULT_RULE, multipleYakuman };
      const res = generateResult(
        defaultTable,
        { hand, melds, dora: [], nuki: 0 },
        defaultOptions,
        rule
      );
      expect(res?.type).toBe('hora-shanten');
      if (res?.type !== 'hora-shanten' || res.info.type !== 'hora') continue;
      const ron = res.info.hora.find(h => h.by === 'ron');
      expect(ron).toBeDefined();
      if (!ron) continue;

      const data = buildShareData(ron, makeShareContext(hand, { melds, rule }));
      const layout = layoutShareImage(data, SHARE_THEME_V1);

      expect(layout.yakuMode).toBe('yakuman');
      expect(layout.yakuChips.map(c => c.label).sort()).toEqual([
        '大三元',
        '字一色'
      ]);
      for (const chip of layout.yakuChips) {
        expect(chip.width).toBe(952);
        expect(chip.height).toBe(76);
        expect(chip.hanBadge).toBeNull();
      }
      expect(layout.score.limitName).toBe(
        multipleYakuman ? '二倍役満' : '役満'
      );
    }
  });

  it('H2-AC23-5: 数え役満は2列レイアウト・飜数塗りバッジあり・符飜の行あり', () => {
    const hand: Tile[] = [
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
    const dora: Tile[] = [{ type: 'p', n: 3 }];
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora, nuki: 0 },
      { ...defaultOptions, riichi: 'riichi', ippatsu: true },
      DEFAULT_RULE
    );
    expect(res?.type).toBe('hora-shanten');
    if (res?.type !== 'hora-shanten' || res.info.type !== 'hora') return;
    const tsumo = res.info.hora.find(h => h.by === 'tsumo');
    expect(tsumo).toBeDefined();
    if (!tsumo) return;

    const data = buildShareData(
      tsumo,
      makeShareContext(hand, { dora, riichi: 'riichi' })
    );
    const layout = layoutShareImage(data, SHARE_THEME_V1);

    expect(layout.yakuMode).toBe('normal');
    expect(layout.score.limitName).toBe('数え役満');
    expect(layout.rank).not.toBeNull();
    expect(layout.yakuChips.length).toBeGreaterThan(0);
    for (const chip of layout.yakuChips) {
      expect(chip.width).toBe(468);
      expect(chip.height).toBe(64);
      expect(chip.hanBadge).not.toBeNull();
    }
  });

  it('H2-AC23-6: 真の役満5行の1列レイアウトで下端が852以下、6個以上は安全策で先頭5個のみ描く', () => {
    const baseYakuman: ShareData = {
      by: 'ron',
      bodyTiles: Array.from({ length: 13 }, () => ({ type: 'z', n: 1 })),
      meldTiles: [],
      horaTile: { type: 'z', n: 1 },
      dora: Array.from({ length: 5 }, () => BACK_TILE),
      uradora: Array.from({ length: 5 }, () => BACK_TILE),
      nuki: 0,
      continueCount: 0,
      deposit: 0,
      isYakuman: true,
      yaku: [
        { label: '天和', han: '役満' },
        { label: '四暗刻単騎', han: '二倍役満' },
        { label: '大四喜', han: '二倍役満' },
        { label: '字一色', han: '役満' },
        { label: '四槓子', han: '役満' }
      ],
      rankText: null,
      limitName: '八倍役満',
      totalText: '256,000点',
      declarationText: null,
      situation: '東場・東家',
      appName: APP_NAME,
      url: SHARE_URL,
      urlLabel: 'bluekurage119.github.io/mj-3player-calc'
    };

    const layout5 = layoutShareImage(baseYakuman, SHARE_THEME_V1);
    expect(layout5.yakuMode).toBe('yakuman');
    expect(layout5.yakuChips).toHaveLength(5);
    const fifthChip = layout5.yakuChips[4];
    expect(fifthChip).toBeDefined();
    if (fifthChip) {
      expect(fifthChip.y + fifthChip.height).toBe(836);
      expect(fifthChip.y + fifthChip.height).toBeLessThanOrEqual(852);
      expect(fifthChip.y + fifthChip.height).toBeLessThanOrEqual(
        layout5.yakuBottom
      );
    }

    const layout6 = layoutShareImage(
      {
        ...baseYakuman,
        yaku: [...baseYakuman.yaku, { label: '緑一色', han: '役満' }]
      },
      SHARE_THEME_V1
    );
    expect(layout6.yakuChips).toHaveLength(5);
    expect(layout6.yakuChips[4]?.label).toBe('四槓子');
  });
});
