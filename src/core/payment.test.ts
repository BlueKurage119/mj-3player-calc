import { describe, expect, test } from 'vitest';
import { calculatePayment } from './payment';
import { DEFAULT_TSUMO_LOSS, type Rule, compareRules } from './rule';
import { calculateBasePoint } from './score';
import type { Table } from './table';

const tableOf = (
  seat: 'east' | 'south' | 'west',
  continueCount = 0,
  depositCount = 0
): Table => ({
  round: 'east',
  seat,
  continue: continueCount,
  deposit: depositCount
});

const defaultRule = {
  tsumoLoss: 'loss' as const,
  honbaPoint: 200
};

const fullRule: Rule = {
  red: { m: 0, p: 1, s: 1 },
  honbaPoint: 200,
  roundedMangan: false,
  doubleWindFu: 4,
  accumlatedYakuman: true,
  multipleYakuman: true,
  kokushi13DoubleYakuman: true,
  suankoTankiDoubleYakuman: true,
  daisushiDoubleYakuman: true,
  pureChurenDoubleYakuman: true,
  north: 'nukidora',
  tsumoLoss: 'loss'
};

describe('A5: 支払い計算', () => {
  describe('実機画面の実例 (A5-P01〜P07)', () => {
    // 出典: 雀魂・一番街の実機画面(ユーザー採取、2026-10-30)
    test('A5-P01: ロン打点折半 子20符2飜ツモ 南・3本場', () => {
      const actual = calculatePayment(320, tableOf('south', 3, 0), 'tsumo', {
        tsumoLoss: 'ron-split',
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'tsumo',
          winner: 'nonDealer',
          dealer: { base: 700, withHonba: 1000 },
          nonDealer: { base: 700, withHonba: 1000 }
        },
        total: 1400,
        honba: 600,
        deposit: 0,
        bonus: 600
      });
    });

    // 出典: 雀魂・一番街の実機画面(ユーザー採取、2026-10-30)
    test('A5-P02: ロン打点折半 子20符4飜ツモ 南・0本場', () => {
      const actual = calculatePayment(1280, tableOf('south', 0, 0), 'tsumo', {
        tsumoLoss: 'ron-split',
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'tsumo',
          winner: 'nonDealer',
          dealer: { base: 2600, withHonba: 2600 },
          nonDealer: { base: 2600, withHonba: 2600 }
        },
        total: 5200,
        honba: 0,
        deposit: 0,
        bonus: 0
      });
    });

    // 出典: 雀魂・一番街の実機画面(ユーザー採取、2026-10-30)
    test('A5-P03: ロン打点折半 子30符3飜ツモ 南・1本場', () => {
      const actual = calculatePayment(960, tableOf('south', 1, 0), 'tsumo', {
        tsumoLoss: 'ron-split',
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'tsumo',
          winner: 'nonDealer',
          dealer: { base: 2000, withHonba: 2100 },
          nonDealer: { base: 2000, withHonba: 2100 }
        },
        total: 4000,
        honba: 200,
        deposit: 0,
        bonus: 200
      });
    });

    // 出典: 雀魂・一番街の実機画面(ユーザー採取、2026-10-30)
    test('A5-P04: ロン打点折半 子30符4飜ツモ 南・0本場', () => {
      const actual = calculatePayment(1920, tableOf('south', 0, 0), 'tsumo', {
        tsumoLoss: 'ron-split',
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'tsumo',
          winner: 'nonDealer',
          dealer: { base: 3900, withHonba: 3900 },
          nonDealer: { base: 3900, withHonba: 3900 }
        },
        total: 7800,
        honba: 0,
        deposit: 0,
        bonus: 0
      });
    });

    // 出典: 雀魂・一番街の実機画面(ユーザー採取、2026-10-30)
    test('A5-P05: ロン打点折半 親25符4飜ツモ 東・0本場', () => {
      const actual = calculatePayment(1600, tableOf('east', 0, 0), 'tsumo', {
        tsumoLoss: 'ron-split',
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'tsumo',
          winner: 'dealer',
          eachNonDealer: { base: 4800, withHonba: 4800 }
        },
        total: 9600,
        honba: 0,
        deposit: 0,
        bonus: 0
      });
    });

    // 出典: 雀魂・一番街の実機画面(ユーザー採取、2026-10-30)
    test('A5-P06: 北家分折半 子30符2飜ツモ 南・0本場', () => {
      const actual = calculatePayment(480, tableOf('south', 0, 0), 'tsumo', {
        tsumoLoss: 'north-split',
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'tsumo',
          winner: 'nonDealer',
          dealer: { base: 1300, withHonba: 1300 },
          nonDealer: { base: 800, withHonba: 800 }
        },
        total: 2100,
        honba: 0,
        deposit: 0,
        bonus: 0
      });
    });

    // 出典: 雀魂・一番街の実機画面(ユーザー採取、2026-10-30)
    test('A5-P07: 北家分折半 親40符2飜ツモ 東・1本場', () => {
      const actual = calculatePayment(640, tableOf('east', 1, 0), 'tsumo', {
        tsumoLoss: 'north-split',
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'tsumo',
          winner: 'dealer',
          eachNonDealer: { base: 2000, withHonba: 2100 }
        },
        total: 4000,
        honba: 200,
        deposit: 0,
        bonus: 200
      });
    });
  });

  describe('仕様の満貫ツモ例 (A5-P11〜P16)', () => {
    // 出典: mahjong-rules.md §3.1 の表(基本点 2000、0本場)
    test('A5-P11: ツモ損あり 親 満貫ツモ', () => {
      const actual = calculatePayment(2000, tableOf('east', 0, 0), 'tsumo', {
        tsumoLoss: 'loss',
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'tsumo',
          winner: 'dealer',
          eachNonDealer: { base: 4000, withHonba: 4000 }
        },
        total: 8000,
        honba: 0,
        deposit: 0,
        bonus: 0
      });
    });

    // 出典: mahjong-rules.md §3.1 の表(基本点 2000、0本場)
    test('A5-P12: ツモ損あり 子 満貫ツモ', () => {
      const actual = calculatePayment(2000, tableOf('south', 0, 0), 'tsumo', {
        tsumoLoss: 'loss',
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'tsumo',
          winner: 'nonDealer',
          dealer: { base: 4000, withHonba: 4000 },
          nonDealer: { base: 2000, withHonba: 2000 }
        },
        total: 6000,
        honba: 0,
        deposit: 0,
        bonus: 0
      });
    });

    // 出典: mahjong-rules.md §3.1 の表(基本点 2000、0本場)
    test('A5-P13: 北家分折半 親 満貫ツモ', () => {
      const actual = calculatePayment(2000, tableOf('east', 0, 0), 'tsumo', {
        tsumoLoss: 'north-split',
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'tsumo',
          winner: 'dealer',
          eachNonDealer: { base: 6000, withHonba: 6000 }
        },
        total: 12000,
        honba: 0,
        deposit: 0,
        bonus: 0
      });
    });

    // 出典: mahjong-rules.md §3.1 の表(基本点 2000、0本場)
    test('A5-P14: 北家分折半 子 満貫ツモ', () => {
      const actual = calculatePayment(2000, tableOf('south', 0, 0), 'tsumo', {
        tsumoLoss: 'north-split',
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'tsumo',
          winner: 'nonDealer',
          dealer: { base: 5000, withHonba: 5000 },
          nonDealer: { base: 3000, withHonba: 3000 }
        },
        total: 8000,
        honba: 0,
        deposit: 0,
        bonus: 0
      });
    });

    // 出典: mahjong-rules.md §3.1 の表(基本点 2000、0本場)
    test('A5-P15: ロン打点折半 親 満貫ツモ', () => {
      const actual = calculatePayment(2000, tableOf('east', 0, 0), 'tsumo', {
        tsumoLoss: 'ron-split',
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'tsumo',
          winner: 'dealer',
          eachNonDealer: { base: 6000, withHonba: 6000 }
        },
        total: 12000,
        honba: 0,
        deposit: 0,
        bonus: 0
      });
    });

    // 出典: mahjong-rules.md §3.1 の表(基本点 2000、0本場)
    test('A5-P16: ロン打点折半 子 満貫ツモ', () => {
      const actual = calculatePayment(2000, tableOf('south', 0, 0), 'tsumo', {
        tsumoLoss: 'ron-split',
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'tsumo',
          winner: 'nonDealer',
          dealer: { base: 4000, withHonba: 4000 },
          nonDealer: { base: 4000, withHonba: 4000 }
        },
        total: 8000,
        honba: 0,
        deposit: 0,
        bonus: 0
      });
    });
  });

  describe('§3 の式からの導出 (A5-P21〜P37, P39)', () => {
    // 出典: mahjong-rules.md §3.1・§3.2【確定】から手計算
    test('A5-P21: ツモ損あり 子30符2飜ツモ 南・0本場', () => {
      const actual = calculatePayment(480, tableOf('south', 0, 0), 'tsumo', {
        tsumoLoss: 'loss',
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'tsumo',
          winner: 'nonDealer',
          dealer: { base: 1000, withHonba: 1000 },
          nonDealer: { base: 500, withHonba: 500 }
        },
        total: 1500,
        honba: 0,
        deposit: 0,
        bonus: 0
      });
    });

    // 出典: mahjong-rules.md §3.1・§3.2【確定】から手計算
    test('A5-P22: ツモ損あり 親40符2飜ツモ 東・0本場', () => {
      const actual = calculatePayment(640, tableOf('east', 0, 0), 'tsumo', {
        tsumoLoss: 'loss',
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'tsumo',
          winner: 'dealer',
          eachNonDealer: { base: 1300, withHonba: 1300 }
        },
        total: 2600,
        honba: 0,
        deposit: 0,
        bonus: 0
      });
    });

    // 出典: mahjong-rules.md §3.1・§3.2【確定】から手計算
    test.each([
      ['loss' as const],
      ['north-split' as const],
      ['ron-split' as const]
    ])('A5-P23: 子30符2飜ロン (%s)', tsumoLoss => {
      const actual = calculatePayment(480, tableOf('south', 0, 0), 'ron', {
        tsumoLoss,
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'ron',
          discarder: { base: 2000, withHonba: 2000 }
        },
        total: 2000,
        honba: 0,
        deposit: 0,
        bonus: 0
      });
    });

    // 出典: mahjong-rules.md §3.1・§3.2【確定】から手計算
    test.each([
      ['loss' as const],
      ['north-split' as const],
      ['ron-split' as const]
    ])('A5-P24: 親30符2飜ロン (%s)', tsumoLoss => {
      const actual = calculatePayment(480, tableOf('east', 0, 0), 'ron', {
        tsumoLoss,
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'ron',
          discarder: { base: 2900, withHonba: 2900 }
        },
        total: 2900,
        honba: 0,
        deposit: 0,
        bonus: 0
      });
    });

    // 出典: mahjong-rules.md §3.1・§3.2【確定】から手計算
    test('A5-P25: ロン打点折半 子30符2飜ロン 南・2本場・供託1本', () => {
      const actual = calculatePayment(480, tableOf('south', 2, 1), 'ron', {
        tsumoLoss: 'ron-split',
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'ron',
          discarder: { base: 2000, withHonba: 2400 }
        },
        total: 2000,
        honba: 400,
        deposit: 1000,
        bonus: 1400
      });
    });

    // 出典: mahjong-rules.md §3.1・§3.2【確定】から手計算
    test('A5-P26: ツモ損あり 子満貫ツモ 南・1本場・供託2本', () => {
      const actual = calculatePayment(2000, tableOf('south', 1, 2), 'tsumo', {
        tsumoLoss: 'loss',
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'tsumo',
          winner: 'nonDealer',
          dealer: { base: 4000, withHonba: 4100 },
          nonDealer: { base: 2000, withHonba: 2100 }
        },
        total: 6000,
        honba: 200,
        deposit: 2000,
        bonus: 2200
      });
    });

    // 出典: mahjong-rules.md §3.1・§3.2【確定】から手計算
    test.each([
      [
        'loss' as const,
        {
          detail: {
            by: 'tsumo' as const,
            winner: 'nonDealer' as const,
            dealer: { base: 16000, withHonba: 16000 },
            nonDealer: { base: 8000, withHonba: 8000 }
          },
          total: 24000,
          honba: 0,
          deposit: 0,
          bonus: 0
        }
      ],
      [
        'north-split' as const,
        {
          detail: {
            by: 'tsumo' as const,
            winner: 'nonDealer' as const,
            dealer: { base: 20000, withHonba: 20000 },
            nonDealer: { base: 12000, withHonba: 12000 }
          },
          total: 32000,
          honba: 0,
          deposit: 0,
          bonus: 0
        }
      ],
      [
        'ron-split' as const,
        {
          detail: {
            by: 'tsumo' as const,
            winner: 'nonDealer' as const,
            dealer: { base: 16000, withHonba: 16000 },
            nonDealer: { base: 16000, withHonba: 16000 }
          },
          total: 32000,
          honba: 0,
          deposit: 0,
          bonus: 0
        }
      ]
    ])('A5-P27: 子役満ツモ (%s)', (tsumoLoss, expected) => {
      const actual = calculatePayment(8000, tableOf('south', 0, 0), 'tsumo', {
        tsumoLoss,
        honbaPoint: 200
      });
      expect(actual).toEqual(expected);
    });

    // 出典: mahjong-rules.md §3.1・§3.2【確定】から手計算
    test.each([
      [
        'loss' as const,
        {
          detail: {
            by: 'tsumo' as const,
            winner: 'dealer' as const,
            eachNonDealer: { base: 16000, withHonba: 16000 }
          },
          total: 32000,
          honba: 0,
          deposit: 0,
          bonus: 0
        }
      ],
      [
        'north-split' as const,
        {
          detail: {
            by: 'tsumo' as const,
            winner: 'dealer' as const,
            eachNonDealer: { base: 24000, withHonba: 24000 }
          },
          total: 48000,
          honba: 0,
          deposit: 0,
          bonus: 0
        }
      ],
      [
        'ron-split' as const,
        {
          detail: {
            by: 'tsumo' as const,
            winner: 'dealer' as const,
            eachNonDealer: { base: 24000, withHonba: 24000 }
          },
          total: 48000,
          honba: 0,
          deposit: 0,
          bonus: 0
        }
      ]
    ])('A5-P28: 親役満ツモ (%s)', (tsumoLoss, expected) => {
      const actual = calculatePayment(8000, tableOf('east', 0, 0), 'tsumo', {
        tsumoLoss,
        honbaPoint: 200
      });
      expect(actual).toEqual(expected);
    });

    // 出典: mahjong-rules.md §3.1・§3.2【確定】から手計算
    test.each([
      [
        'loss' as const,
        {
          detail: {
            by: 'tsumo' as const,
            winner: 'nonDealer' as const,
            dealer: { base: 32000, withHonba: 32000 },
            nonDealer: { base: 16000, withHonba: 16000 }
          },
          total: 48000,
          honba: 0,
          deposit: 0,
          bonus: 0
        }
      ],
      [
        'north-split' as const,
        {
          detail: {
            by: 'tsumo' as const,
            winner: 'nonDealer' as const,
            dealer: { base: 40000, withHonba: 40000 },
            nonDealer: { base: 24000, withHonba: 24000 }
          },
          total: 64000,
          honba: 0,
          deposit: 0,
          bonus: 0
        }
      ],
      [
        'ron-split' as const,
        {
          detail: {
            by: 'tsumo' as const,
            winner: 'nonDealer' as const,
            dealer: { base: 32000, withHonba: 32000 },
            nonDealer: { base: 32000, withHonba: 32000 }
          },
          total: 64000,
          honba: 0,
          deposit: 0,
          bonus: 0
        }
      ]
    ])('A5-P29: 子ダブル役満(複合)ツモ (%s)', (tsumoLoss, expected) => {
      // 役満の基本点は呼び出し側が渡す(A5-P29 は 16000)
      const actual = calculatePayment(16000, tableOf('south', 0, 0), 'tsumo', {
        tsumoLoss,
        honbaPoint: 200
      });
      expect(actual).toEqual(expected);
    });

    // 出典: mahjong-rules.md §3.1・§3.2【確定】から手計算
    test.each([
      ['loss' as const],
      ['north-split' as const],
      ['ron-split' as const]
    ])('A5-P30: 子役満ロン (%s)', tsumoLoss => {
      const actual = calculatePayment(8000, tableOf('south', 0, 0), 'ron', {
        tsumoLoss,
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'ron',
          discarder: { base: 32000, withHonba: 32000 }
        },
        total: 32000,
        honba: 0,
        deposit: 0,
        bonus: 0
      });
    });

    // 出典: mahjong-rules.md §3.1・§3.2【確定】から手計算
    test.each([
      ['loss' as const],
      ['north-split' as const],
      ['ron-split' as const]
    ])('A5-P31: 親数え役満ロン (%s)', tsumoLoss => {
      // A5-P31 は calculateBasePoint(30, 13, false, true)(=8000)の結果を渡す
      const basePoint = calculateBasePoint(30, 13, false, true);
      const actual = calculatePayment(basePoint, tableOf('east', 0, 0), 'ron', {
        tsumoLoss,
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'ron',
          discarder: { base: 48000, withHonba: 48000 }
        },
        total: 48000,
        honba: 0,
        deposit: 0,
        bonus: 0
      });
    });

    // 出典: mahjong-rules.md §3.1・§3.2【確定】から手計算
    test('A5-P32: ツモ損あり 子30符2飜ツモ(供託のみ) 南・0本場・供託1本', () => {
      const actual = calculatePayment(480, tableOf('south', 0, 1), 'tsumo', {
        tsumoLoss: 'loss',
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'tsumo',
          winner: 'nonDealer',
          dealer: { base: 1000, withHonba: 1000 },
          nonDealer: { base: 500, withHonba: 500 }
        },
        total: 1500,
        honba: 0,
        deposit: 1000,
        bonus: 1000
      });
    });

    // 出典: mahjong-rules.md §3.1・§3.2【確定】から手計算
    test('A5-P33: ツモ損あり 親40符2飜ツモ 東・2本場', () => {
      const actual = calculatePayment(640, tableOf('east', 2, 0), 'tsumo', {
        tsumoLoss: 'loss',
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'tsumo',
          winner: 'dealer',
          eachNonDealer: { base: 1300, withHonba: 1500 }
        },
        total: 2600,
        honba: 400,
        deposit: 0,
        bonus: 400
      });
    });

    // 出典: mahjong-rules.md §3.1・§3.2【確定】から手計算
    test('A5-P34: 北家分折半 子30符2飜ツモ 南・1本場・供託1本', () => {
      const actual = calculatePayment(480, tableOf('south', 1, 1), 'tsumo', {
        tsumoLoss: 'north-split',
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'tsumo',
          winner: 'nonDealer',
          dealer: { base: 1300, withHonba: 1400 },
          nonDealer: { base: 800, withHonba: 900 }
        },
        total: 2100,
        honba: 200,
        deposit: 1000,
        bonus: 1200
      });
    });

    // 出典: mahjong-rules.md §3.1・§3.2【確定】から手計算
    test('A5-P35: 北家分折半 親30符2飜ロン 東・2本場・供託1本', () => {
      const actual = calculatePayment(480, tableOf('east', 2, 1), 'ron', {
        tsumoLoss: 'north-split',
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'ron',
          discarder: { base: 2900, withHonba: 3300 }
        },
        total: 2900,
        honba: 400,
        deposit: 1000,
        bonus: 1400
      });
    });

    // 出典: mahjong-rules.md §3.1・§3.2【確定】から手計算
    test('A5-P36: ロン打点折半 子役満ツモ 南・1本場', () => {
      const actual = calculatePayment(8000, tableOf('south', 1, 0), 'tsumo', {
        tsumoLoss: 'ron-split',
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'tsumo',
          winner: 'nonDealer',
          dealer: { base: 16000, withHonba: 16100 },
          nonDealer: { base: 16000, withHonba: 16100 }
        },
        total: 32000,
        honba: 200,
        deposit: 0,
        bonus: 200
      });
    });

    // 出典: mahjong-rules.md §3.1・§3.2【確定】から手計算
    test('A5-P37: ツモ損あり honbaPoint 300 子30符2飜ツモ 南・0本場', () => {
      const actual = calculatePayment(480, tableOf('south', 0, 0), 'tsumo', {
        tsumoLoss: 'loss',
        honbaPoint: 300
      });
      expect(actual).toEqual({
        detail: {
          by: 'tsumo',
          winner: 'nonDealer',
          dealer: { base: 1000, withHonba: 1000 },
          nonDealer: { base: 500, withHonba: 500 }
        },
        total: 1500,
        honba: 0,
        deposit: 0,
        bonus: 0
      });
    });

    // 出典: mahjong-rules.md §3.1・§3.2【確定】から手計算
    test('A5-P39: 北家分折半 親30符2飜ツモ 東・0本場', () => {
      const actual = calculatePayment(480, tableOf('east', 0, 0), 'tsumo', {
        tsumoLoss: 'north-split',
        honbaPoint: 200
      });
      expect(actual).toEqual({
        detail: {
          by: 'tsumo',
          winner: 'dealer',
          eachNonDealer: { base: 1500, withHonba: 1500 }
        },
        total: 3000,
        honba: 0,
        deposit: 0,
        bonus: 0
      });
    });
  });

  describe('例外・ルール (A5-P38, P40〜P46, A5-R01, R02)', () => {
    // 出典: calculateTableBonus (bonus.ts) の卓情報検証仕様
    test.each([
      ['供託 -1', tableOf('south', 0, -1)],
      ['供託 1.5', tableOf('south', 0, 1.5)],
      ['本場 1.5', tableOf('south', 1.5, 0)]
    ])('A5-P38: 卓情報の不正値 (%s)', (_label, table) => {
      expect(() => calculatePayment(480, table, 'tsumo', defaultRule)).toThrow(
        '本場数および供託本数は0以上の整数である必要があります'
      );
    });

    // 出典: 設計書 §4.3 手順0 の入口検証順序
    test.each([
      [
        '基本点0 + tsumoLoss不正',
        0,
        { tsumoLoss: 'invalid' as Rule['tsumoLoss'], honbaPoint: 200 },
        tableOf('south', 0, 0),
        '基本点は正の整数である必要があります'
      ],
      [
        'tsumoLoss不正 + honbaPoint -100',
        480,
        { tsumoLoss: 'invalid' as Rule['tsumoLoss'], honbaPoint: -100 },
        tableOf('south', 0, 0),
        'ツモ損の設定が不正です'
      ],
      [
        'honbaPoint -100 + 本場 -1',
        480,
        { tsumoLoss: 'loss' as const, honbaPoint: -100 },
        tableOf('south', -1, 0),
        '1本場あたりの点数は0以上の整数である必要があります'
      ]
    ])(
      'A5-P40: 入口検証順序 (%s)',
      (_label, basePoint, rule, table, message) => {
        expect(() => calculatePayment(basePoint, table, 'tsumo', rule)).toThrow(
          message
        );
      }
    );

    // 出典: calculateTableBonus (bonus.ts) の卓情報検証仕様
    test('A5-P41: 本場-1', () => {
      expect(() =>
        calculatePayment(480, tableOf('south', -1, 0), 'tsumo', defaultRule)
      ).toThrow('本場数および供託本数は0以上の整数である必要があります');
    });

    // 出典: calculateTableBonus (bonus.ts) のツモ折半端数検証仕様
    test('A5-P42: 1本場ツモでツモ折半が100の倍数にならない', () => {
      expect(() =>
        calculatePayment(480, tableOf('south', 1, 0), 'tsumo', {
          tsumoLoss: 'loss',
          honbaPoint: 300
        })
      ).toThrow('ツモ折半の額が100の倍数ではありません');
    });

    // 出典: mahjong-rules.md §3.2 (ロンは折半不要のため端数例外なし)
    test('A5-P43: honbaPoint 300・1本場のロン', () => {
      const actual = calculatePayment(480, tableOf('south', 1, 0), 'ron', {
        tsumoLoss: 'loss',
        honbaPoint: 300
      });
      expect(actual).toEqual({
        detail: {
          by: 'ron',
          discarder: { base: 2000, withHonba: 2300 }
        },
        total: 2000,
        honba: 300,
        deposit: 0,
        bonus: 300
      });
    });

    // 出典: 設計書 §4.3 手順0-a (基本点は正の整数)
    test.each([
      [0, 'ron' as const],
      [0, 'tsumo' as const],
      [-100, 'ron' as const],
      [-100, 'tsumo' as const],
      [480.5, 'ron' as const],
      [480.5, 'tsumo' as const],
      [Number.NaN, 'ron' as const],
      [Number.NaN, 'tsumo' as const],
      [Number.POSITIVE_INFINITY, 'ron' as const],
      [Number.POSITIVE_INFINITY, 'tsumo' as const]
    ])('A5-P44: 不正な基本点 (%s, %s)', (basePoint, by) => {
      expect(() =>
        calculatePayment(basePoint, tableOf('south', 0, 0), by, defaultRule)
      ).toThrow('基本点は正の整数である必要があります');
    });

    // 出典: 設計書 §4.3 手順0-c (honbaPointは0以上の整数)
    test.each([
      [-100, 'ron' as const],
      [-100, 'tsumo' as const],
      [Number.NaN, 'ron' as const],
      [Number.NaN, 'tsumo' as const],
      [150.5, 'ron' as const],
      [150.5, 'tsumo' as const]
    ])('A5-P45: 不正なhonbaPoint (%s, %s)', (honbaPoint, by) => {
      expect(() =>
        calculatePayment(480, tableOf('south', 1, 0), by, {
          tsumoLoss: 'loss',
          honbaPoint
        })
      ).toThrow('1本場あたりの点数は0以上の整数である必要があります');
    });

    // 出典: 設計書 §4.3 手順0-b (tsumoLoss設定値の検証)
    test.each([['ron' as const], ['tsumo' as const]])(
      'A5-P46: 不正なtsumoLoss (%s)',
      by => {
        expect(() =>
          calculatePayment(480, tableOf('south', 0, 0), by, {
            tsumoLoss: 'none' as Rule['tsumoLoss'],
            honbaPoint: 200
          })
        ).toThrow('ツモ損の設定が不正です');
      }
    );

    // 出典: 設計書 §4.1 (compareRulesの検証)
    test('A5-R01: compareRulesがtsumoLossの差異を検知する', () => {
      const ruleA: Rule = { ...fullRule, tsumoLoss: 'loss' };
      const ruleB: Rule = { ...fullRule, tsumoLoss: 'north-split' };
      const ruleSame: Rule = { ...fullRule, tsumoLoss: 'loss' };

      expect(compareRules(ruleA, ruleB)).toBe(false);
      expect(compareRules(ruleA, ruleSame)).toBe(true);
    });

    // 出典: mahjong-rules.md §3.1 (所定値)
    test('A5-R02: DEFAULT_TSUMO_LOSSの所定値', () => {
      expect(DEFAULT_TSUMO_LOSS).toBe('loss');
    });
  });
});
