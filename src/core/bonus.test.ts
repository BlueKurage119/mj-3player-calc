import { describe, expect, test } from 'vitest';
import { calculateTableBonus } from './bonus';
import { DEFAULT_DEPOSIT_POINT, DEFAULT_HONBA_POINT } from './rule';
import type { Table } from './table';

describe('calculateTableBonus (A3-TB1〜TB15)', () => {
  // 出典: mahjong-rules.md §3.2 の式「1本場あたりの点数×本場数(ロンは全額)」「供託は本数×1000」から導出
  test('A3-TB1: ロン 0本場 供託0本', () => {
    const table: Table = {
      round: 'east',
      seat: 'east',
      continue: 0,
      deposit: 0
    };
    const bonus = calculateTableBonus(table, 'ron', 200, 1000);
    expect(bonus).toEqual({
      ronFromDiscarder: 0,
      tsumoFromEach: 0,
      deposit: 0
    });
  });

  // 出典: mahjong-rules.md §3.2 が直接裏づけ(ロンは放銃者が全額、所定値200)
  test('A3-TB2: ロン 1本場 供託0本', () => {
    const table: Table = {
      round: 'east',
      seat: 'east',
      continue: 1,
      deposit: 0
    };
    const bonus = calculateTableBonus(table, 'ron', 200, 1000);
    expect(bonus).toEqual({
      ronFromDiscarder: 200,
      tsumoFromEach: 0,
      deposit: 0
    });
  });

  // 出典: mahjong-rules.md §3.2 の式「1本場あたりの点数×本場数(ロンは全額)」「供託は本数×1000」から導出
  test('A3-TB3: ロン 3本場 供託2本', () => {
    const table: Table = {
      round: 'east',
      seat: 'east',
      continue: 3,
      deposit: 2
    };
    const bonus = calculateTableBonus(table, 'ron', 200, 1000);
    expect(bonus).toEqual({
      ronFromDiscarder: 600,
      tsumoFromEach: 0,
      deposit: 2000
    });
  });

  // 出典: mahjong-rules.md §3.2 が直接裏づけ(所定値で100オール)
  test('A3-TB4: ツモ 1本場 供託0本', () => {
    const table: Table = {
      round: 'east',
      seat: 'east',
      continue: 1,
      deposit: 0
    };
    const bonus = calculateTableBonus(table, 'tsumo', 200, 1000);
    expect(bonus).toEqual({
      ronFromDiscarder: 0,
      tsumoFromEach: 100,
      deposit: 0
    });
  });

  // 出典: mahjong-rules.md §3.2 の式「1本場あたりの点数×本場数(ツモは2人で折半)」「供託は本数×1000」から導出
  test('A3-TB5: ツモ 2本場 供託1本', () => {
    const table: Table = {
      round: 'east',
      seat: 'east',
      continue: 2,
      deposit: 1
    };
    const bonus = calculateTableBonus(table, 'tsumo', 200, 1000);
    expect(bonus).toEqual({
      ronFromDiscarder: 0,
      tsumoFromEach: 200,
      deposit: 1000
    });
  });

  // 出典: mahjong-rules.md §3.2 の式「供託は本数×1000」から導出
  test('A3-TB6: ツモ 0本場 供託3本', () => {
    const table: Table = {
      round: 'east',
      seat: 'east',
      continue: 0,
      deposit: 3
    };
    const bonus = calculateTableBonus(table, 'tsumo', 200, 1000);
    expect(bonus).toEqual({
      ronFromDiscarder: 0,
      tsumoFromEach: 0,
      deposit: 3000
    });
  });

  // 出典: mahjong-rules.md §3.2 の式「1本場あたりの点数×本場数(ロンは全額)」から導出 (200決め打ちの検知用)
  test('A3-TB7: ロン 300点 2本場 供託0本', () => {
    const table: Table = {
      round: 'east',
      seat: 'east',
      continue: 2,
      deposit: 0
    };
    const bonus = calculateTableBonus(table, 'ron', 300, 1000);
    expect(bonus).toEqual({
      ronFromDiscarder: 600,
      tsumoFromEach: 0,
      deposit: 0
    });
  });

  // 出典: mahjong-rules.md §3.2 の式「1本場あたりの点数×本場数(ツモは2人で折半)」から導出 (200決め打ちの検知用)
  test('A3-TB8: ツモ 400点 1本場 供託0本', () => {
    const table: Table = {
      round: 'east',
      seat: 'east',
      continue: 1,
      deposit: 0
    };
    const bonus = calculateTableBonus(table, 'tsumo', 400, 1000);
    expect(bonus).toEqual({
      ronFromDiscarder: 0,
      tsumoFromEach: 200,
      deposit: 0
    });
  });

  // 出典: オーナー回答Q1 (折半150が100の倍数でない)
  test('A3-TB9: ツモ 折半が100の倍数でない場合例外', () => {
    const table: Table = {
      round: 'east',
      seat: 'east',
      continue: 1,
      deposit: 0
    };
    expect(() => calculateTableBonus(table, 'tsumo', 300, 1000)).toThrow();
  });

  // 出典: オーナー回答Q2 (本場数が負)
  test('A3-TB10: ロン 本場数が負の場合例外', () => {
    const table: Table = {
      round: 'east',
      seat: 'east',
      continue: -1,
      deposit: 0
    };
    expect(() => calculateTableBonus(table, 'ron', 200, 1000)).toThrow();
  });

  // 出典: オーナー回答Q2 (本場数が整数でない)
  test('A3-TB11: ロン 本場数が整数でない場合例外', () => {
    const table: Table = {
      round: 'east',
      seat: 'east',
      continue: 1.5,
      deposit: 0
    };
    expect(() => calculateTableBonus(table, 'ron', 200, 1000)).toThrow();
  });

  // 出典: オーナー回答Q2 (供託本数が負)
  test('A3-TB12: ロン 供託本数が負の場合例外', () => {
    const table: Table = {
      round: 'east',
      seat: 'east',
      continue: 0,
      deposit: -1
    };
    expect(() => calculateTableBonus(table, 'ron', 200, 1000)).toThrow();
  });

  // 出典: オーナー回答Q2 (供託本数が整数でない)
  test('A3-TB13: ツモ 供託本数が整数でない場合例外', () => {
    const table: Table = {
      round: 'east',
      seat: 'east',
      continue: 0,
      deposit: 0.5
    };
    expect(() => calculateTableBonus(table, 'tsumo', 200, 1000)).toThrow();
  });

  // 出典: mahjong-rules.md §3.2 (所定値の定義)
  test('A3-TB14: 所定値定数の確認', () => {
    expect(DEFAULT_HONBA_POINT).toBe(200);
    expect(DEFAULT_DEPOSIT_POINT).toBe(1000);
  });

  // 出典: mahjong-rules.md §3.2 の式「1本場あたりの点数×本場数(ロンは全額)」から導出 (ロンでは100の倍数の検査をせず、例外を投げないことの検知用)
  test('A3-TB15: ロン 折半が100の倍数でない設定でも例外を投げない', () => {
    const table: Table = {
      round: 'east',
      seat: 'east',
      continue: 1,
      deposit: 0
    };
    const bonus = calculateTableBonus(table, 'ron', 300, 1000);
    expect(bonus).toEqual({
      ronFromDiscarder: 300,
      tsumoFromEach: 0,
      deposit: 0
    });
  });
});
