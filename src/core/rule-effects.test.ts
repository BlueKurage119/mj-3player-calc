import { describe, expect, test } from 'vitest';
import { calculateTableBonus } from './bonus';
import type { HandOptions, Input } from './input';
import { calculatePayment } from './payment';
import { generateResult } from './result';
import { type Rule, createDefaultRule } from './rule';
import type { Table } from './table';
import { type Tile, isAvailableTiles, tileAvailableCount } from './tile';

/** MPSZ表記 ("19m19p19s1234567z"、赤5は 0p・0s) を Tile[] に変換する */
const parseTiles = (s: string): Tile[] => {
  const tiles: Tile[] = [];
  let digits: string[] = [];
  for (const ch of s) {
    if (ch >= '0' && ch <= '9') {
      digits.push(ch);
      continue;
    }
    if (ch !== 'm' && ch !== 'p' && ch !== 's' && ch !== 'z')
      throw new Error(`牌姿に不正な文字があります: "${s}"`);
    for (const d of digits) {
      const n = Number(d);
      if (ch === 'z') {
        if (n < 1 || n > 7) throw new Error(`字牌の数字が不正です: "${s}"`);
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
  if (digits.length > 0)
    throw new Error(`末尾に牌の種類 (m/p/s/z) がありません: "${s}"`);
  return tiles;
};

/** 副露の牌1枚 (MPSZ表記) を Tile にする */
const parseSingleTile = (s: string): Tile => {
  const tiles = parseTiles(s);
  const [tile] = tiles;
  if (tiles.length !== 1 || typeof tile === 'undefined')
    throw new Error(`副露の牌は1枚で指定してください: "${s}"`);
  return tile;
};

const defaultTable: Table = {
  round: 'east',
  seat: 'south',
  continue: 0,
  deposit: 0
};

const defaultHandOptions: HandOptions = {
  riichi: 'none',
  ippatsu: false,
  rinshan: false,
  chankan: false,
  haitei: false,
  tenho: false,
  tsubameGaeshi: false,
  kanFuri: false
};

const getHoraYakuMap = (
  input: Input,
  options: HandOptions,
  rule: Rule,
  by: 'ron' | 'tsumo'
): Record<string, number> => {
  const result = generateResult(defaultTable, input, options, rule);
  if (
    result === null ||
    result.type !== 'hora-shanten' ||
    result.info.type !== 'hora'
  ) {
    throw new Error('和了形が生成されませんでした');
  }
  const matching = result.info.hora.filter(h => h.by === by);
  const [h] = matching;
  if (typeof h === 'undefined') {
    throw new Error(`${by} に一致する和了がありません`);
  }
  return Object.fromEntries(
    h.yaku.map(y => [y.name, y.type === 'yakuman' ? y.point : y.han])
  );
};

describe('B1: ルール効果と計算結果の検証 (rule-effects)', () => {
  // 出典: 所定値側は既存 golden (G05) に riichi・ippatsu を加算 (mahjong-rules.md §4.1・§4.1.1【確定】)
  test('B1-Y01: 面子手 一発あり (所定値)', () => {
    const input: Input = {
      hand: parseTiles('123067p34567s22z2s'),
      melds: [],
      dora: [],
      nuki: 0
    };
    const options: HandOptions = {
      ...defaultHandOptions,
      riichi: 'riichi',
      ippatsu: true
    };
    const actual = getHoraYakuMap(input, options, createDefaultRule(), 'ron');
    expect(actual).toEqual({
      riichi: 1,
      ippatsu: 1,
      'red-dora': 1
    });
  });

  // 出典: ルールなし側は仕様から導出 (mahjong-rules.md §4.1 と Q1)
  test('B1-Y02: 面子手 一発なし', () => {
    const input: Input = {
      hand: parseTiles('123067p34567s22z2s'),
      melds: [],
      dora: [],
      nuki: 0
    };
    const options: HandOptions = {
      ...defaultHandOptions,
      riichi: 'riichi',
      ippatsu: true
    };
    const rule = { ...createDefaultRule(), ippatsu: false };
    const actual = getHoraYakuMap(input, options, rule, 'ron');
    expect(actual).toEqual({
      riichi: 1,
      'red-dora': 1
    });
  });

  // 出典: 所定値側は既存 golden (G03) に riichi・ippatsu を加算、ルールなし側は仕様から導出 (mahjong-rules.md §4.1 と Q1)
  test('B1-Y03: 七対子 一発あり／なし', () => {
    const input: Input = {
      hand: parseTiles('225577p2244668s8s'),
      melds: [],
      dora: [],
      nuki: 0
    };
    const options: HandOptions = {
      ...defaultHandOptions,
      riichi: 'riichi',
      ippatsu: true
    };

    // 所定値: 一発あり
    const actualDefault = getHoraYakuMap(
      input,
      options,
      createDefaultRule(),
      'ron'
    );
    expect(actualDefault).toEqual({
      riichi: 1,
      ippatsu: 1,
      tanyao: 1,
      chitoitsu: 2
    });

    // ルールなし: 一発なし
    const ruleNoIppatsu = { ...createDefaultRule(), ippatsu: false };
    const actualNoIppatsu = getHoraYakuMap(
      input,
      options,
      ruleNoIppatsu,
      'ron'
    );
    expect(actualNoIppatsu).toEqual({
      riichi: 1,
      tanyao: 1,
      chitoitsu: 2
    });
  });

  // 出典: 所定値側は既存 golden (G05) に open-riichi・ippatsu を加算、ルールなし側は仕様から導出 (mahjong-rules.md §4.1 と Q1)
  test('B1-Y04: オープン立直 一発あり／なし', () => {
    const input: Input = {
      hand: parseTiles('123067p34567s22z2s'),
      melds: [],
      dora: [],
      nuki: 0
    };
    const options: HandOptions = {
      ...defaultHandOptions,
      riichi: 'open-riichi',
      ippatsu: true
    };

    // openRiichi: true (一発あり)
    const ruleOpen = { ...createDefaultRule(), openRiichi: true };
    const actualOpen = getHoraYakuMap(input, options, ruleOpen, 'ron');
    expect(actualOpen).toEqual({
      'open-riichi': 2,
      ippatsu: 1,
      'red-dora': 1
    });

    // openRiichi: true かつ ippatsu: false
    const ruleOpenNoIppatsu = {
      ...createDefaultRule(),
      openRiichi: true,
      ippatsu: false
    };
    const actualOpenNoIppatsu = getHoraYakuMap(
      input,
      options,
      ruleOpenNoIppatsu,
      'ron'
    );
    expect(actualOpenNoIppatsu).toEqual({
      'open-riichi': 2,
      'red-dora': 1
    });
  });

  // 出典: 所定値側は既存 golden (G01) に double-riichi・ippatsu を加算 (mahjong-rules.md §4.1.1【確定】)
  test('B1-DR01: ダブル立直・一発・海底ツモ (所定値: 海底不成立)', () => {
    const input: Input = {
      hand: parseTiles('12367p234067s33z8p'),
      melds: [],
      dora: [],
      nuki: 0
    };
    const options: HandOptions = {
      ...defaultHandOptions,
      riichi: 'double-riichi',
      ippatsu: true,
      haitei: true
    };
    const actual = getHoraYakuMap(input, options, createDefaultRule(), 'tsumo');
    expect(actual).toEqual({
      'double-riichi': 2,
      ippatsu: 1,
      tsumo: 1,
      pinfu: 1,
      'red-dora': 1
    });
  });

  // 出典: ルールなし側は仕様から導出 (mahjong-rules.md §4.1.1【確定】、一発なしで海底が複合)
  test('B1-DR02: ダブル立直・一発入力・海底ツモ (一発なし: 海底成立)', () => {
    const input: Input = {
      hand: parseTiles('12367p234067s33z8p'),
      melds: [],
      dora: [],
      nuki: 0
    };
    const options: HandOptions = {
      ...defaultHandOptions,
      riichi: 'double-riichi',
      ippatsu: true,
      haitei: true
    };
    const rule = { ...createDefaultRule(), ippatsu: false };
    const actual = getHoraYakuMap(input, options, rule, 'tsumo');
    expect(actual).toEqual({
      'double-riichi': 2,
      tsumo: 1,
      pinfu: 1,
      haitei: 1,
      'red-dora': 1
    });
  });

  // 出典: 所定値側は既存 golden に double-riichi・ippatsu を加算、ルールなし側は仕様から導出 (mahjong-rules.md §4.1.1【確定】)
  test('B1-DR03: ダブル立直・一発入力・河底ロン (所定値／一発なし)', () => {
    const input: Input = {
      hand: parseTiles('12367p234067s33z8p'),
      melds: [],
      dora: [],
      nuki: 0
    };
    const options: HandOptions = {
      ...defaultHandOptions,
      riichi: 'double-riichi',
      ippatsu: true,
      haitei: true
    };

    // 所定値
    const actualDefault = getHoraYakuMap(
      input,
      options,
      createDefaultRule(),
      'ron'
    );
    expect(actualDefault).toEqual({
      'double-riichi': 2,
      ippatsu: 1,
      pinfu: 1,
      'red-dora': 1
    });

    // 一発なし: 河底が複合
    const ruleNoIppatsu = { ...createDefaultRule(), ippatsu: false };
    const actualNoIppatsu = getHoraYakuMap(
      input,
      options,
      ruleNoIppatsu,
      'ron'
    );
    expect(actualNoIppatsu).toEqual({
      'double-riichi': 2,
      pinfu: 1,
      hotei: 1,
      'red-dora': 1
    });
  });

  // 出典: 所定値側は既存 golden に double-riichi・ippatsu を加算、ルールなし側は仕様から導出 (mahjong-rules.md §4.1.1【確定】)
  test('B1-DR04: ダブル立直・一発入力・槍槓ロン (所定値／一発なし)', () => {
    const input: Input = {
      hand: parseTiles('12367p234067s33z8p'),
      melds: [],
      dora: [],
      nuki: 0
    };
    const options: HandOptions = {
      ...defaultHandOptions,
      riichi: 'double-riichi',
      ippatsu: true,
      chankan: true
    };

    // 所定値
    const actualDefault = getHoraYakuMap(
      input,
      options,
      createDefaultRule(),
      'ron'
    );
    expect(actualDefault).toEqual({
      'double-riichi': 2,
      ippatsu: 1,
      pinfu: 1,
      'red-dora': 1
    });

    // 一発なし: 槍槓が複合
    const ruleNoIppatsu = { ...createDefaultRule(), ippatsu: false };
    const actualNoIppatsu = getHoraYakuMap(
      input,
      options,
      ruleNoIppatsu,
      'ron'
    );
    expect(actualNoIppatsu).toEqual({
      'double-riichi': 2,
      pinfu: 1,
      chankan: 1,
      'red-dora': 1
    });
  });

  // 出典: 所定値側は既存 golden に double-riichi・ippatsu を加算、ルールなし側は仕様から導出 (mahjong-rules.md §4.1.1【確定】)
  test('B1-DR05: ローカル役あり ダブル立直・一発入力・海底ツモ (所定値／一発なし: 石の上にも三年)', () => {
    const input: Input = {
      hand: parseTiles('12367p234067s33z8p'),
      melds: [],
      dora: [],
      nuki: 0
    };
    const options: HandOptions = {
      ...defaultHandOptions,
      riichi: 'double-riichi',
      ippatsu: true,
      haitei: true
    };

    // 所定値 (localYaku: true, ippatsu: true)
    const ruleLocal = { ...createDefaultRule(), localYaku: true };
    const actualLocal = getHoraYakuMap(input, options, ruleLocal, 'tsumo');
    expect(actualLocal).toEqual({
      'double-riichi': 2,
      ippatsu: 1,
      tsumo: 1,
      pinfu: 1,
      'red-dora': 1
    });

    // localYaku: true かつ ippatsu: false -> 石の上にも三年のみ
    const ruleLocalNoIppatsu = {
      ...createDefaultRule(),
      localYaku: true,
      ippatsu: false
    };
    const actualIshinoUe = getHoraYakuMap(
      input,
      options,
      ruleLocalNoIppatsu,
      'tsumo'
    );
    expect(actualIshinoUe).toEqual({
      'ishino-ue': 1
    });
  });

  // 出典: 所定値側は副露断么九と対々和が成立 (Wikipedia「麻雀の役一覧」および mahjong-rules.md §4.1)
  test('B1-K01: 副露手 断么九・対々和 (所定値)', () => {
    const input: Input = {
      hand: parseTiles('444p777s8p8p'),
      melds: [
        { type: 'pon', tile: parseSingleTile('2p') },
        { type: 'pon', tile: parseSingleTile('6s') }
      ],
      dora: [],
      nuki: 0
    };
    const actual = getHoraYakuMap(
      input,
      defaultHandOptions,
      createDefaultRule(),
      'ron'
    );
    expect(actual).toEqual({
      tanyao: 1,
      toitoi: 2
    });
  });

  // 出典: ルールなし側は喰い断不成立のため対々和のみ残る (mahjong-rules.md §4.1 と Q2)
  test('B1-K02: 副露手 喰い断なし (対々和のみ残りhoraが1件)', () => {
    const input: Input = {
      hand: parseTiles('444p777s8p8p'),
      melds: [
        { type: 'pon', tile: parseSingleTile('2p') },
        { type: 'pon', tile: parseSingleTile('6s') }
      ],
      dora: [],
      nuki: 0
    };
    const rule = { ...createDefaultRule(), kuitan: false };
    const actual = getHoraYakuMap(input, defaultHandOptions, rule, 'ron');
    expect(actual).toEqual({
      toitoi: 2
    });
  });

  // 出典: 暗槓のみは門前扱いのため kuitan: false でも断么九が成立 (mahjong-rules.md §4.1, G12)
  test('B1-K03: 暗槓あり門前手 喰い断なしでも断么九成立', () => {
    const input: Input = {
      hand: parseTiles('23467p22234s8p'),
      melds: [{ type: 'kan', tile: parseSingleTile('0p'), closed: true }],
      dora: [],
      nuki: 0
    };
    const rule = { ...createDefaultRule(), kuitan: false };
    const actual = getHoraYakuMap(input, defaultHandOptions, rule, 'ron');
    expect(actual).toEqual({
      tanyao: 1,
      'red-dora': 1
    });
  });

  // 出典: 赤ドラの枚数仕様から導出 (mahjong-rules.md §1)
  test('B1-D01: 赤ドラ 2枚(所定値)／4枚(red: 2)', () => {
    const input: Input = {
      hand: parseTiles('234678p2234s5s'),
      melds: [{ type: 'pon', tile: parseSingleTile('0p') }],
      dora: [],
      nuki: 0
    };

    // 所定値: red: 1 (2枚)
    const actualDefault = getHoraYakuMap(
      input,
      defaultHandOptions,
      createDefaultRule(),
      'ron'
    );
    expect(actualDefault).toEqual({
      tanyao: 1,
      'red-dora': 1
    });

    // red: 2 (4枚)
    const ruleRed2: Rule = { ...createDefaultRule(), red: 2 };
    const actualRed2 = getHoraYakuMap(
      input,
      defaultHandOptions,
      ruleRed2,
      'ron'
    );
    expect(actualRed2).toEqual({
      tanyao: 1,
      'red-dora': 2
    });
  });

  // 出典: 赤ドラの枚数仕様から導出 (mahjong-rules.md §1: 2枚ルールでは赤5pは1枚、4枚ルールでは2枚)
  test('B1-D02: isAvailableTiles による赤牌枚数判定 (red: 1 / 2)', () => {
    const tiles0p0p = [
      { type: 'p' as const, n: 5 as const, red: true },
      { type: 'p' as const, n: 5 as const, red: true }
    ];
    expect(isAvailableTiles(1, [], tiles0p0p)).toBe(false);
    expect(isAvailableTiles(2, [], tiles0p0p)).toBe(true);
  });

  // 出典: 赤ドラの枚数仕様から導出 (mahjong-rules.md §1)
  test('B1-D03: tileAvailableCount による赤牌・通常牌残数判定 (red: 0 / 1 / 2)', () => {
    const tile0p: Tile = { type: 'p', n: 5, red: true };
    const tile5p: Tile = { type: 'p', n: 5, red: false };

    // t = 0p
    expect(tileAvailableCount(0, [], tile0p)).toBeNull();
    expect(tileAvailableCount(1, [], tile0p)).toBe(1);
    expect(tileAvailableCount(2, [], tile0p)).toBe(2);

    // t = 5p
    expect(tileAvailableCount(0, [], tile5p)).toBe(4);
    expect(tileAvailableCount(1, [], tile5p)).toBe(3);
    expect(tileAvailableCount(2, [], tile5p)).toBe(2);
  });

  // 出典: 供託点数の式 (mahjong-rules.md §3.2: 1本の点数×本数)
  test('B1-B01: calculateTableBonus 供託2本・depositPoint 300', () => {
    const table: Table = {
      round: 'east',
      seat: 'south',
      continue: 0,
      deposit: 2
    };
    const bonus = calculateTableBonus(table, 'ron', 200, 300);
    expect(bonus.deposit).toBe(600);
  });

  // 出典: 入口検証仕様 (mahjong-rules.md §3.2, 設計書 §4.4)
  test('B1-B02: calculatePayment depositPoint の不正値 (-100, 1.5) で例外', () => {
    expect(() =>
      calculatePayment(480, defaultTable, 'ron', {
        tsumoLoss: 'loss',
        honbaPoint: 200,
        depositPoint: -100
      })
    ).toThrow('供託1本あたりの点数は0以上の整数である必要があります');

    expect(() =>
      calculatePayment(480, defaultTable, 'ron', {
        tsumoLoss: 'loss',
        honbaPoint: 200,
        depositPoint: 1.5
      })
    ).toThrow('供託1本あたりの点数は0以上の整数である必要があります');
  });

  // 出典: 供託点数の式 (mahjong-rules.md §3.2: 1本の点数0点×1本 = 0点)
  test('B1-B03: calculatePayment depositPoint: 0・供託1本で供託加算0', () => {
    const table: Table = {
      round: 'east',
      seat: 'south',
      continue: 0,
      deposit: 1
    };
    const payment = calculatePayment(480, table, 'ron', {
      tsumoLoss: 'loss',
      honbaPoint: 200,
      depositPoint: 0
    });
    expect(payment.deposit).toBe(0);
    expect(payment.bonus).toBe(0);
  });
});
