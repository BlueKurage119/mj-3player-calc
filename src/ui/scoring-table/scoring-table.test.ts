import { describe, expect, it } from 'vitest';
import type { HandOptions } from '../../core/input';
import { generateResult } from '../../core/result';
import { createDefaultRule } from '../../core/rule';
import type { Tile } from '../../core/tile';
import {
  type Cell,
  FU_LIST,
  HAN_LIST,
  type ScoringRule,
  buildFuHanTable,
  buildLimitTable,
  cellExists
} from './scoring-table';

const defaultScoringRule = (): ScoringRule => {
  const rule = createDefaultRule();
  return {
    tsumoLoss: rule.tsumoLoss,
    roundedMangan: rule.roundedMangan,
    accumlatedYakuman: rule.accumlatedYakuman,
    doubleWindFu: rule.doubleWindFu
  };
};

const findCell = (
  table: ReturnType<typeof buildFuHanTable>,
  fu: number,
  han: number
) => {
  const fuIndex = FU_LIST.indexOf(fu as (typeof FU_LIST)[number]);
  const hanIndex = HAN_LIST.indexOf(han as (typeof HAN_LIST)[number]);
  const cell = table[fuIndex]?.[hanIndex];
  if (!cell) throw new Error(`Cell not found: ${fu}fu ${han}han`);
  return cell;
};

const expectValueText = (cell: Cell | undefined, expectedText: string) => {
  expect(cell?.kind).toBe('value');
  if (cell?.kind === 'value') {
    expect(cell.text).toBe(expectedText);
  }
};

describe('H1: 点数計算表 純関数 (scoring-table.ts)', () => {
  it('H1-01: cellExists の全組合せ(11符×4飜×2)が期待どおり判定される', () => {
    for (const doubleWindFu of [4, 2] as const) {
      for (const fu of FU_LIST) {
        for (const han of HAN_LIST) {
          for (const by of ['ron', 'tsumo'] as const) {
            const actual = cellExists(fu, han, by, doubleWindFu);
            let expected: 'absent' | 'na' | 'ok' = 'ok';
            if (fu < 30 && han === 1) {
              expected = 'absent';
            } else if (fu === 110 && han === 1) {
              expected =
                doubleWindFu === 2 ? 'absent' : by === 'tsumo' ? 'na' : 'ok';
            } else if (fu === 20 && by === 'ron') {
              expected = 'na';
            } else if (fu === 25 && han === 2 && by === 'tsumo') {
              expected = 'na';
            }
            expect(actual).toBe(expected);
          }
        }
      }
    }
  });

  it('H1-02: 子・ツモ損あり・本場0の代表的な符飜が四麻表と一致する', () => {
    // 出典: 四麻の点数早見表(Wikipedia「麻雀の得点計算」)
    const table = buildFuHanTable(defaultScoringRule(), { dealer: false });

    const c30_1 = findCell(table, 30, 1);
    expectValueText(c30_1.ron, '1,000');
    expectValueText(c30_1.tsumo, '300・500');

    const c30_4 = findCell(table, 30, 4);
    expectValueText(c30_4.ron, '7,700');
    expectValueText(c30_4.tsumo, '2,000・3,900');

    const c40_3 = findCell(table, 40, 3);
    expectValueText(c40_3.ron, '5,200');
    expectValueText(c40_3.tsumo, '1,300・2,600');
  });

  it('H1-03: 親・ツモ損あり・本場0の代表的な符飜が四麻表と一致する', () => {
    // 出典: 四麻の点数早見表(Wikipedia「麻雀の得点計算」)
    const table = buildFuHanTable(defaultScoringRule(), { dealer: true });

    const c30_1 = findCell(table, 30, 1);
    expectValueText(c30_1.ron, '1,500');
    expectValueText(c30_1.tsumo, '500オール');

    const c30_4 = findCell(table, 30, 4);
    expectValueText(c30_4.ron, '11,600');
    expectValueText(c30_4.tsumo, '3,900オール');
  });

  it('H1-04: 子・北家分折半の30符2飜ツモが 800・1,300 になる', () => {
    // 出典: docs/mahjong-rules.md §3.1
    const rule: ScoringRule = {
      ...defaultScoringRule(),
      tsumoLoss: 'north-split'
    };
    const table = buildFuHanTable(rule, { dealer: false });
    const c30_2 = findCell(table, 30, 2);
    expectValueText(c30_2.tsumo, '800・1,300');
  });

  it('H1-05: 子・ロン打点折半の30符4飜ツモが 3,900オール になる', () => {
    // 出典: docs/mahjong-rules.md §3.1
    const rule: ScoringRule = {
      ...defaultScoringRule(),
      tsumoLoss: 'ron-split'
    };
    const table = buildFuHanTable(rule, { dealer: false });
    const c30_4 = findCell(table, 30, 4);
    expectValueText(c30_4.tsumo, '3,900オール');
  });

  it('H1-06: 満貫表・3方式×親子の5飜ツモ・ロンが出典どおりになる', () => {
    // 出典: docs/mahjong-rules.md §3.1
    const baseRule = defaultScoringRule();

    const lossChild = buildLimitTable(
      { ...baseRule, tsumoLoss: 'loss' },
      { dealer: false }
    );
    const lossDealer = buildLimitTable(
      { ...baseRule, tsumoLoss: 'loss' },
      { dealer: true }
    );
    expect(lossChild[0]?.label).toBe('5飜');
    expectValueText(lossChild[0]?.ron, '8,000');
    expectValueText(lossChild[0]?.tsumo, '2,000・4,000');
    expectValueText(lossDealer[0]?.ron, '12,000');
    expectValueText(lossDealer[0]?.tsumo, '4,000オール');

    const northSplitChild = buildLimitTable(
      { ...baseRule, tsumoLoss: 'north-split' },
      { dealer: false }
    );
    const northSplitDealer = buildLimitTable(
      { ...baseRule, tsumoLoss: 'north-split' },
      { dealer: true }
    );
    expectValueText(northSplitChild[0]?.ron, '8,000');
    expectValueText(northSplitChild[0]?.tsumo, '3,000・5,000');
    expectValueText(northSplitDealer[0]?.ron, '12,000');
    expectValueText(northSplitDealer[0]?.tsumo, '6,000オール');

    const ronSplitChild = buildLimitTable(
      { ...baseRule, tsumoLoss: 'ron-split' },
      { dealer: false }
    );
    const ronSplitDealer = buildLimitTable(
      { ...baseRule, tsumoLoss: 'ron-split' },
      { dealer: true }
    );
    expectValueText(ronSplitChild[0]?.ron, '8,000');
    expectValueText(ronSplitChild[0]?.tsumo, '4,000オール');
    expectValueText(ronSplitDealer[0]?.ron, '12,000');
    expectValueText(ronSplitDealer[0]?.tsumo, '6,000オール');
  });

  it('H1-10: accumlatedYakuman true/false で満貫表の行数・最下行ラベル・子ロンが変わる', () => {
    // 出典: docs/mahjong-rules.md §3.3
    const baseRule = defaultScoringRule();

    const withYakuman = buildLimitTable(
      { ...baseRule, accumlatedYakuman: true },
      { dealer: false }
    );
    expect(withYakuman).toHaveLength(5);
    expect(withYakuman[4]?.label).toBe('13飜以上');
    expectValueText(withYakuman[4]?.ron, '32,000');

    const withoutYakuman = buildLimitTable(
      { ...baseRule, accumlatedYakuman: false },
      { dealer: false }
    );
    expect(withoutYakuman).toHaveLength(4);
    expect(withoutYakuman[3]?.label).toBe('11飜以上');
    expectValueText(withoutYakuman[3]?.ron, '24,000');
  });

  it('H1-11: roundedMangan true で 30符4飜・60符3飜が満貫表示・ロン8,000になる', () => {
    // 出典: docs/mahjong-rules.md §3.3
    const rule: ScoringRule = {
      ...defaultScoringRule(),
      roundedMangan: true
    };
    const table = buildFuHanTable(rule, { dealer: false });

    const c30_4 = findCell(table, 30, 4);
    expect(c30_4.limit).toBe('mangan');
    expectValueText(c30_4.ron, '8,000');

    const c60_3 = findCell(table, 60, 3);
    expect(c60_3.limit).toBe('mangan');
    expectValueText(c60_3.ron, '8,000');
  });

  it('H1-12: 20符2飜(子)はロン na、ツモ 400・700 になる', () => {
    // 出典: 四麻の点数早見表(Wikipedia「麻雀の得点計算」)
    const table = buildFuHanTable(defaultScoringRule(), { dealer: false });
    const c20_2 = findCell(table, 20, 2);
    expect(c20_2.ron).toEqual({ kind: 'na' });
    expectValueText(c20_2.tsumo, '400・700');
  });

  it('H1-13: 110符1飜の成立例をコアの generateResult で確認する', () => {
    // 出典: 設計書 8章 J4 の手牌(東場東家・暗槓 1111m・9999m、234p、11z 雀頭、55z・5z 双碰で 5z ロン)
    const hand: Tile[] = [
      { type: 'p', n: 2 },
      { type: 'p', n: 3 },
      { type: 'p', n: 4 },
      { type: 'z', n: 1 },
      { type: 'z', n: 1 },
      { type: 'z', n: 5 },
      { type: 'z', n: 5 },
      { type: 'z', n: 5 }
    ];
    const input = {
      hand,
      melds: [
        {
          type: 'kan' as const,
          tile: { type: 'm' as const, n: 1 as const },
          closed: true
        },
        {
          type: 'kan' as const,
          tile: { type: 'm' as const, n: 9 as const },
          closed: true
        }
      ],
      dora: [],
      nuki: 0
    };
    const handOptions: HandOptions = {
      riichi: 'none',
      ippatsu: false,
      rinshan: false,
      chankan: false,
      haitei: false,
      tenho: false,
      tsubameGaeshi: false,
      kanFuri: false
    };
    const table = {
      round: 'east' as const,
      seat: 'east' as const,
      continue: 0,
      deposit: 0
    };

    const res4 = generateResult(table, input, handOptions, {
      ...createDefaultRule(),
      doubleWindFu: 4
    });
    expect(res4?.type).toBe('hora-shanten');
    if (res4?.type !== 'hora-shanten' || res4.info.type !== 'hora') {
      throw new Error('Expected hora result');
    }
    const ron4 = res4.info.hora.find(h => h.by === 'ron');
    expect(ron4).toBeDefined();
    expect(ron4?.score.fu).toBe(110);
    expect(ron4?.score.han).toBe(1);
    expect(ron4?.score.payment.total).toBe(5300);

    const res2 = generateResult(table, input, handOptions, {
      ...createDefaultRule(),
      doubleWindFu: 2
    });
    expect(res2?.type).toBe('hora-shanten');
    if (res2?.type !== 'hora-shanten' || res2.info.type !== 'hora') {
      throw new Error('Expected hora result');
    }
    const ron2 = res2.info.hora.find(h => h.by === 'ron');
    expect(ron2).toBeDefined();
    expect(ron2?.score.fu).toBe(100);
  });
});
