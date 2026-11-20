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
  cellExists,
  formatCellDiff
} from './scoring-table';

const defaultScoringRule = (): ScoringRule => {
  const rule = createDefaultRule();
  return {
    tsumoLoss: rule.tsumoLoss,
    honbaPoint: rule.honbaPoint,
    depositPoint: rule.depositPoint,
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

const expectValueDiffText = (
  cell: Cell | undefined,
  expectedDiffText: string
) => {
  expect(cell?.kind).toBe('value');
  if (cell?.kind === 'value') {
    expect(cell.diffText).toBe(expectedDiffText);
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
    const table = buildFuHanTable(defaultScoringRule(), {
      dealer: false,
      honba: 0,
      deposit: 0
    });

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
    const table = buildFuHanTable(defaultScoringRule(), {
      dealer: true,
      honba: 0,
      deposit: 0
    });

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
    const table = buildFuHanTable(rule, {
      dealer: false,
      honba: 0,
      deposit: 0
    });
    const c30_2 = findCell(table, 30, 2);
    expectValueText(c30_2.tsumo, '800・1,300');
  });

  it('H1-05: 子・ロン打点折半の30符4飜ツモが 3,900オール になる', () => {
    // 出典: docs/mahjong-rules.md §3.1
    const rule: ScoringRule = {
      ...defaultScoringRule(),
      tsumoLoss: 'ron-split'
    };
    const table = buildFuHanTable(rule, {
      dealer: false,
      honba: 0,
      deposit: 0
    });
    const c30_4 = findCell(table, 30, 4);
    expectValueText(c30_4.tsumo, '3,900オール');
  });

  it('H1-06: 満貫表・3方式×親子の5飜ツモ・ロンが出典どおりになる', () => {
    // 出典: docs/mahjong-rules.md §3.1
    const baseRule = defaultScoringRule();

    const lossChild = buildLimitTable(
      { ...baseRule, tsumoLoss: 'loss' },
      { dealer: false, honba: 0, deposit: 0 }
    );
    const lossDealer = buildLimitTable(
      { ...baseRule, tsumoLoss: 'loss' },
      { dealer: true, honba: 0, deposit: 0 }
    );
    expect(lossChild[0]?.label).toBe('5飜');
    expectValueText(lossChild[0]?.ron, '8,000');
    expectValueText(lossChild[0]?.tsumo, '2,000・4,000');
    expectValueText(lossDealer[0]?.ron, '12,000');
    expectValueText(lossDealer[0]?.tsumo, '4,000オール');

    const northSplitChild = buildLimitTable(
      { ...baseRule, tsumoLoss: 'north-split' },
      { dealer: false, honba: 0, deposit: 0 }
    );
    const northSplitDealer = buildLimitTable(
      { ...baseRule, tsumoLoss: 'north-split' },
      { dealer: true, honba: 0, deposit: 0 }
    );
    expectValueText(northSplitChild[0]?.ron, '8,000');
    expectValueText(northSplitChild[0]?.tsumo, '3,000・5,000');
    expectValueText(northSplitDealer[0]?.ron, '12,000');
    expectValueText(northSplitDealer[0]?.tsumo, '6,000オール');

    const ronSplitChild = buildLimitTable(
      { ...baseRule, tsumoLoss: 'ron-split' },
      { dealer: false, honba: 0, deposit: 0 }
    );
    const ronSplitDealer = buildLimitTable(
      { ...baseRule, tsumoLoss: 'ron-split' },
      { dealer: true, honba: 0, deposit: 0 }
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
      { dealer: false, honba: 0, deposit: 0 }
    );
    expect(withYakuman).toHaveLength(5);
    expect(withYakuman[4]?.label).toBe('13飜以上');
    expectValueText(withYakuman[4]?.ron, '32,000');

    const withoutYakuman = buildLimitTable(
      { ...baseRule, accumlatedYakuman: false },
      { dealer: false, honba: 0, deposit: 0 }
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
    const table = buildFuHanTable(rule, {
      dealer: false,
      honba: 0,
      deposit: 0
    });

    const c30_4 = findCell(table, 30, 4);
    expect(c30_4.limit).toBe('mangan');
    expectValueText(c30_4.ron, '8,000');

    const c60_3 = findCell(table, 60, 3);
    expect(c60_3.limit).toBe('mangan');
    expectValueText(c60_3.ron, '8,000');
  });

  it('H1-12: 20符2飜(子)はロン na、ツモ 400・700 になる', () => {
    // 出典: 四麻の点数早見表(Wikipedia「麻雀の得点計算」)
    const table = buildFuHanTable(defaultScoringRule(), {
      dealer: false,
      honba: 0,
      deposit: 0
    });
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

  it('H1-1-01: 子・ツモ損あり・1本場(honbaPoint=200)が「は」併記で出力される', () => {
    // 出典: 四麻の点数早見表(Wikipedia「麻雀の得点計算」)および docs/mahjong-rules.md §3.2(1本場200点・ロン全額/ツモ折半)
    const table = buildFuHanTable(
      { ...defaultScoringRule(), tsumoLoss: 'loss', honbaPoint: 200 },
      { dealer: false, honba: 1, deposit: 0 }
    );

    const c30_1 = findCell(table, 30, 1);
    expectValueText(c30_1.ron, '1,000 は 1,200');
    expectValueText(c30_1.tsumo, '300・500 は 400・600');

    const c30_4 = findCell(table, 30, 4);
    expectValueText(c30_4.ron, '7,700 は 7,900');
    expectValueText(c30_4.tsumo, '2,000・3,900 は 2,100・4,000');

    const c20_2 = findCell(table, 20, 2);
    expect(c20_2.ron).toEqual({ kind: 'na' });
    expectValueText(c20_2.tsumo, '400・700 は 500・800');

    const c20_1 = findCell(table, 20, 1);
    expect(c20_1.ron).toEqual({ kind: 'absent' });
    expect(c20_1.tsumo).toEqual({ kind: 'absent' });
  });

  it('H1-1-02: 親・ツモ損あり・1本場(honbaPoint=200)が「オール」1回表記で出力される', () => {
    // 出典: 四麻の点数早見表(Wikipedia「麻雀の得点計算」)および docs/mahjong-rules.md §3.2
    const table = buildFuHanTable(
      { ...defaultScoringRule(), tsumoLoss: 'loss', honbaPoint: 200 },
      { dealer: true, honba: 1, deposit: 0 }
    );

    const c30_1 = findCell(table, 30, 1);
    expectValueText(c30_1.ron, '1,500 は 1,700');
    expectValueText(c30_1.tsumo, '500 は 600オール');

    const c30_4 = findCell(table, 30, 4);
    expectValueText(c30_4.ron, '11,600 は 11,800');
    expectValueText(c30_4.tsumo, '3,900 は 4,000オール');
  });

  it('H1-1-03: 子・北家分折半とロン打点折半・1本場(honbaPoint=200)が期待どおりになる', () => {
    // 出典: docs/mahjong-rules.md §3.1(北家分折半 800・1,300、ロン打点折半 3,900オール)および §3.2(+100ずつ)
    const northSplitTable = buildFuHanTable(
      { ...defaultScoringRule(), tsumoLoss: 'north-split', honbaPoint: 200 },
      { dealer: false, honba: 1, deposit: 0 }
    );
    const c30_2 = findCell(northSplitTable, 30, 2);
    expectValueText(c30_2.tsumo, '800・1,300 は 900・1,400');

    const ronSplitTable = buildFuHanTable(
      { ...defaultScoringRule(), tsumoLoss: 'ron-split', honbaPoint: 200 },
      { dealer: false, honba: 1, deposit: 0 }
    );
    const c30_4 = findCell(ronSplitTable, 30, 4);
    expectValueText(c30_4.tsumo, '3,900 は 4,000オール');
  });

  it('H1-1-04: 満貫表・3方式×親子・2本場(honbaPoint=200)が出典どおりになる', () => {
    // 出典: docs/mahjong-rules.md §3.1(満貫ツモ3方式)・§3.3(13飜以上)および §3.2(2本場ロン+400・ツモ+200)
    const baseRule = { ...defaultScoringRule(), honbaPoint: 200 };

    const lossChild = buildLimitTable(
      { ...baseRule, tsumoLoss: 'loss' },
      { dealer: false, honba: 2, deposit: 0 }
    );
    const lossDealer = buildLimitTable(
      { ...baseRule, tsumoLoss: 'loss' },
      { dealer: true, honba: 2, deposit: 0 }
    );
    expectValueText(lossChild[0]?.ron, '8,000 は 8,400');
    expectValueText(lossChild[0]?.tsumo, '2,000・4,000 は 2,200・4,200');
    expectValueText(lossDealer[0]?.ron, '12,000 は 12,400');
    expectValueText(lossDealer[0]?.tsumo, '4,000 は 4,200オール');
    expectValueText(lossChild[4]?.ron, '32,000 は 32,400');
    expectValueText(lossChild[4]?.tsumo, '8,000・16,000 は 8,200・16,200');

    const northSplitChild = buildLimitTable(
      { ...baseRule, tsumoLoss: 'north-split' },
      { dealer: false, honba: 2, deposit: 0 }
    );
    const northSplitDealer = buildLimitTable(
      { ...baseRule, tsumoLoss: 'north-split' },
      { dealer: true, honba: 2, deposit: 0 }
    );
    expectValueText(northSplitChild[0]?.tsumo, '3,000・5,000 は 3,200・5,200');
    expectValueText(northSplitDealer[0]?.tsumo, '6,000 は 6,200オール');

    const ronSplitChild = buildLimitTable(
      { ...baseRule, tsumoLoss: 'ron-split' },
      { dealer: false, honba: 2, deposit: 0 }
    );
    const ronSplitDealer = buildLimitTable(
      { ...baseRule, tsumoLoss: 'ron-split' },
      { dealer: true, honba: 2, deposit: 0 }
    );
    expectValueText(ronSplitChild[0]?.tsumo, '4,000 は 4,200オール');
    expectValueText(ronSplitDealer[0]?.tsumo, '6,000 は 6,200オール');
  });

  it('H1-1-05: honbaPoint ルール連動(400点で加算反映、0点で「は」併記なし)', () => {
    // 出典: docs/mahjong-rules.md §3.2(本場点数はルール設定に連動、加算0のときは併記なし)
    const table400 = buildFuHanTable(
      { ...defaultScoringRule(), honbaPoint: 400 },
      { dealer: false, honba: 1, deposit: 0 }
    );
    const c30_1_400 = findCell(table400, 30, 1);
    expectValueText(c30_1_400.ron, '1,000 は 1,400');
    expectValueText(c30_1_400.tsumo, '300・500 は 500・700');

    const table0 = buildFuHanTable(
      { ...defaultScoringRule(), honbaPoint: 0 },
      { dealer: false, honba: 2, deposit: 0 }
    );
    const c30_1_0 = findCell(table0, 30, 1);
    expectValueText(c30_1_0.ron, '1,000');
    expectValueText(c30_1_0.tsumo, '300・500');
  });

  it('H1-1-06: calculateTableBonus 例外防御(異常入力時は表全体を本場0へフォールバック)', () => {
    // 出典: docs/mahjong-rules.md §3.2(ツモ折半100点単位制約)および設計書 §8 J1 案C(本場0フォールバック)
    const baseRule = defaultScoringRule();

    // honbaPoint=300・1本場はツモ折半150で例外対象のため、ロン・ツモとも表全体を本場0へフォールバック
    const oddHonba1Fu = buildFuHanTable(
      { ...baseRule, honbaPoint: 300 },
      { dealer: false, honba: 1, deposit: 0 }
    );
    const oddHonba1Limit = buildLimitTable(
      { ...baseRule, honbaPoint: 300 },
      { dealer: false, honba: 1, deposit: 0 }
    );
    expectValueText(findCell(oddHonba1Fu, 30, 1).ron, '1,000');
    expectValueText(findCell(oddHonba1Fu, 30, 1).tsumo, '300・500');
    expectValueText(oddHonba1Limit[0]?.ron, '8,000');
    expectValueText(oddHonba1Limit[0]?.tsumo, '2,000・4,000');

    // honbaPoint=300・2本場はツモ折半300で100点単位を満たすため正常に本場込みになる
    const oddHonba2Fu = buildFuHanTable(
      { ...baseRule, honbaPoint: 300 },
      { dealer: false, honba: 2, deposit: 0 }
    );
    expectValueText(findCell(oddHonba2Fu, 30, 1).ron, '1,000 は 1,600');
    expectValueText(findCell(oddHonba2Fu, 30, 1).tsumo, '300・500 は 600・800');

    // 負数・非整数の本場数や負数の honbaPoint も例外を投げず本場0へフォールバック
    for (const [ruleOverride, honba] of [
      [{}, -1],
      [{}, 1.5],
      [{ honbaPoint: -200 }, 1]
    ] as const) {
      const rule = { ...baseRule, ...ruleOverride };
      const fuTable = buildFuHanTable(rule, {
        dealer: false,
        honba,
        deposit: 0
      });
      const limitTable = buildLimitTable(rule, {
        dealer: false,
        honba,
        deposit: 0
      });
      expectValueText(findCell(fuTable, 30, 1).ron, '1,000');
      expectValueText(findCell(fuTable, 30, 1).tsumo, '300・500');
      expectValueText(limitTable[0]?.ron, '8,000');
      expectValueText(limitTable[0]?.tsumo, '2,000・4,000');
    }
  });

  it('H1-1-07: roundedMangan false で30符4飜・60符3飜のみ near-mangan になり、true で mangan になる', () => {
    // 出典: docs/mahjong-rules.md §3.3(切り上げ満貫の対象である基本点1,920の30符4飜・60符3飜)
    const withoutRounded = buildFuHanTable(
      { ...defaultScoringRule(), roundedMangan: false },
      { dealer: false, honba: 0, deposit: 0 }
    );
    expect(findCell(withoutRounded, 30, 4).limit).toBe('near-mangan');
    expect(findCell(withoutRounded, 60, 3).limit).toBe('near-mangan');
    expect(findCell(withoutRounded, 40, 3).limit).toBeNull();
    expect(findCell(withoutRounded, 40, 4).limit).toBe('mangan');

    const withRounded = buildFuHanTable(
      { ...defaultScoringRule(), roundedMangan: true },
      { dealer: false, honba: 0, deposit: 0 }
    );
    expect(findCell(withRounded, 30, 4).limit).toBe('mangan');
    expect(findCell(withRounded, 60, 3).limit).toBe('mangan');
  });

  it('H1-1-08: buildLimitTable の各行に満貫以上の名称(name)と飜数ラベル(label)が付く', () => {
    // 出典: docs/mahjong-rules.md §3.3(満貫・跳満・倍満・三倍満・役満の区分)
    const baseRule = defaultScoringRule();

    const withYakuman = buildLimitTable(
      { ...baseRule, accumlatedYakuman: true },
      { dealer: false, honba: 0, deposit: 0 }
    );
    expect(withYakuman.map(r => ({ name: r.name, label: r.label }))).toEqual([
      { name: '満貫', label: '5飜' },
      { name: '跳満', label: '6〜7飜' },
      { name: '倍満', label: '8〜10飜' },
      { name: '三倍満', label: '11〜12飜' },
      { name: '役満', label: '13飜以上' }
    ]);

    const withoutYakuman = buildLimitTable(
      { ...baseRule, accumlatedYakuman: false },
      { dealer: false, honba: 0, deposit: 0 }
    );
    expect(withoutYakuman.map(r => ({ name: r.name, label: r.label }))).toEqual(
      [
        { name: '満貫', label: '5飜' },
        { name: '跳満', label: '6〜7飜' },
        { name: '倍満', label: '8〜10飜' },
        { name: '三倍満', label: '11飜以上' }
      ]
    );
  });

  it('H1-2-01: 子・ツモ損あり・0本場・供託0の点差が算出される', () => {
    // 出典: 四麻の点数早見表(Wikipedia「麻雀の得点計算」)・docs/mahjong-rules.md §3.1 および Q1 確定式(自分の増分+対象の減分)
    const table = buildFuHanTable(defaultScoringRule(), {
      dealer: false,
      honba: 0,
      deposit: 0
    });

    const c30_1 = findCell(table, 30, 1);
    expectValueDiffText(c30_1.ron, '-2,000');
    expectValueDiffText(c30_1.tsumo, '-1,100 / -1,300');

    const c30_4 = findCell(table, 30, 4);
    expectValueDiffText(c30_4.ron, '-15,400');
    expectValueDiffText(c30_4.tsumo, '-7,900 / -9,800');

    const c20_2 = findCell(table, 20, 2);
    expect(c20_2.ron).toEqual({ kind: 'na' });
    expectValueDiffText(c20_2.tsumo, '-1,500 / -1,800');

    const c20_1 = findCell(table, 20, 1);
    expect(c20_1.ron).toEqual({ kind: 'absent' });
    expect(c20_1.tsumo).toEqual({ kind: 'absent' });
  });

  it('H1-2-02: 親・ツモ損あり・0本場・供託0の点差が算出される', () => {
    // 出典: 四麻の点数早見表(Wikipedia「麻雀の得点計算」)・docs/mahjong-rules.md §3.1 および Q1 確定式
    const table = buildFuHanTable(defaultScoringRule(), {
      dealer: true,
      honba: 0,
      deposit: 0
    });

    const c30_1 = findCell(table, 30, 1);
    expectValueDiffText(c30_1.ron, '-3,000');
    expectValueDiffText(c30_1.tsumo, '-1,500');

    const c30_4 = findCell(table, 30, 4);
    expectValueDiffText(c30_4.ron, '-23,200');
    expectValueDiffText(c30_4.tsumo, '-11,700');
  });

  it('H1-2-03: ツモ損3方式×親子・0本場・供託0の点差が算出され、親子同額時は1値のみになる', () => {
    // 出典: docs/mahjong-rules.md §3.1(満貫ツモ3方式・北家分折半 800・1,300・ロン打点折半 3,900オール)および Q1 確定式
    const baseRule = defaultScoringRule();

    const lossChildLimit = buildLimitTable(
      { ...baseRule, tsumoLoss: 'loss' },
      { dealer: false, honba: 0, deposit: 0 }
    );
    const lossDealerLimit = buildLimitTable(
      { ...baseRule, tsumoLoss: 'loss' },
      { dealer: true, honba: 0, deposit: 0 }
    );
    expectValueDiffText(lossChildLimit[0]?.ron, '-16,000');
    expectValueDiffText(lossChildLimit[0]?.tsumo, '-8,000 / -10,000');
    expectValueDiffText(lossDealerLimit[0]?.ron, '-24,000');
    expectValueDiffText(lossDealerLimit[0]?.tsumo, '-12,000');

    const northSplitFu = buildFuHanTable(
      { ...baseRule, tsumoLoss: 'north-split' },
      { dealer: false, honba: 0, deposit: 0 }
    );
    const northSplitChildLimit = buildLimitTable(
      { ...baseRule, tsumoLoss: 'north-split' },
      { dealer: false, honba: 0, deposit: 0 }
    );
    const northSplitDealerLimit = buildLimitTable(
      { ...baseRule, tsumoLoss: 'north-split' },
      { dealer: true, honba: 0, deposit: 0 }
    );
    expectValueDiffText(findCell(northSplitFu, 30, 2).tsumo, '-2,900 / -3,400');
    expectValueDiffText(northSplitChildLimit[0]?.tsumo, '-11,000 / -13,000');
    expectValueDiffText(northSplitDealerLimit[0]?.tsumo, '-18,000');

    const ronSplitFu = buildFuHanTable(
      { ...baseRule, tsumoLoss: 'ron-split' },
      { dealer: false, honba: 0, deposit: 0 }
    );
    const ronSplitChildLimit = buildLimitTable(
      { ...baseRule, tsumoLoss: 'ron-split' },
      { dealer: false, honba: 0, deposit: 0 }
    );
    const ronSplitDealerLimit = buildLimitTable(
      { ...baseRule, tsumoLoss: 'ron-split' },
      { dealer: true, honba: 0, deposit: 0 }
    );
    expectValueDiffText(findCell(ronSplitFu, 30, 4).tsumo, '-11,700');
    expectValueDiffText(ronSplitChildLimit[0]?.tsumo, '-12,000');
    expectValueDiffText(ronSplitDealerLimit[0]?.tsumo, '-18,000');
  });

  it('H1-2-04: 本場・供託ありで点差に反映され、得点表記(text)には供託が干渉しない', () => {
    // 出典: docs/mahjong-rules.md §3.1・§3.2(本場200点・供託1,000点)および Q1・Q3 確定式
    const rule = {
      ...defaultScoringRule(),
      tsumoLoss: 'loss' as const,
      honbaPoint: 200,
      depositPoint: 1000
    };

    const childH1D0Fu = buildFuHanTable(rule, {
      dealer: false,
      honba: 1,
      deposit: 0
    });
    const childH1D0Limit = buildLimitTable(rule, {
      dealer: false,
      honba: 1,
      deposit: 0
    });
    expectValueDiffText(findCell(childH1D0Fu, 30, 1).ron, '-2,400');
    expectValueDiffText(findCell(childH1D0Fu, 30, 1).tsumo, '-1,400 / -1,600');
    expectValueDiffText(childH1D0Limit[0]?.ron, '-16,400');
    expectValueDiffText(childH1D0Limit[0]?.tsumo, '-8,300 / -10,300');

    const childH0D1Fu = buildFuHanTable(rule, {
      dealer: false,
      honba: 0,
      deposit: 1
    });
    const childH0D1Limit = buildLimitTable(rule, {
      dealer: false,
      honba: 0,
      deposit: 1
    });
    expectValueDiffText(findCell(childH0D1Fu, 30, 1).ron, '-3,000');
    expectValueDiffText(findCell(childH0D1Fu, 30, 1).tsumo, '-2,100 / -2,300');
    expectValueDiffText(childH0D1Limit[0]?.ron, '-17,000');
    expectValueDiffText(childH0D1Limit[0]?.tsumo, '-9,000 / -11,000');

    const childH2D3Fu = buildFuHanTable(rule, {
      dealer: false,
      honba: 2,
      deposit: 3
    });
    const c30_1 = findCell(childH2D3Fu, 30, 1);
    expectValueText(c30_1.ron, '1,000 は 1,400');
    expectValueDiffText(c30_1.ron, '-5,800');
    expectValueText(c30_1.tsumo, '300・500 は 500・700');
    expectValueDiffText(c30_1.tsumo, '-4,700 / -4,900');

    const dealerH2D3Fu = buildFuHanTable(rule, {
      dealer: true,
      honba: 2,
      deposit: 3
    });
    const dealerH2D3Limit = buildLimitTable(rule, {
      dealer: true,
      honba: 2,
      deposit: 3
    });
    expectValueDiffText(findCell(dealerH2D3Fu, 30, 1).ron, '-6,800');
    expectValueDiffText(findCell(dealerH2D3Fu, 30, 1).tsumo, '-5,100');
    expectValueDiffText(dealerH2D3Limit[0]?.ron, '-27,800');
    expectValueDiffText(dealerH2D3Limit[0]?.tsumo, '-15,600');
  });

  it('H1-2-05: depositPoint ルール連動(500点反映・0点時は加算なし)', () => {
    // 出典: docs/mahjong-rules.md §3.2(供託点数はルール設定に連動)および Q1 確定式
    const fu500 = buildFuHanTable(
      { ...defaultScoringRule(), depositPoint: 500 },
      { dealer: false, honba: 0, deposit: 2 }
    );
    expectValueDiffText(findCell(fu500, 30, 1).ron, '-3,000');
    expectValueDiffText(findCell(fu500, 30, 1).tsumo, '-2,100 / -2,300');

    const fu0 = buildFuHanTable(
      { ...defaultScoringRule(), depositPoint: 0 },
      { dealer: false, honba: 0, deposit: 3 }
    );
    expectValueDiffText(findCell(fu0, 30, 1).ron, '-2,000');
    expectValueDiffText(findCell(fu0, 30, 1).tsumo, '-1,100 / -1,300');
  });

  it('H1-2-06: resolveSafeInput の供託系異常入力防御と本場系との独立性', () => {
    // 出典: docs/mahjong-rules.md §3.2 および 設計書 §8 D1(供託系・本場系の独立フォールバック)
    const baseRule = {
      ...defaultScoringRule(),
      honbaPoint: 200,
      depositPoint: 1000
    };

    for (const [ruleOverride, deposit] of [
      [{}, -1],
      [{}, 1.5],
      [{ depositPoint: -100 }, 1]
    ] as const) {
      const rule = { ...baseRule, ...ruleOverride };
      const fuTable = buildFuHanTable(rule, {
        dealer: false,
        honba: 1,
        deposit
      });
      const limitTable = buildLimitTable(rule, {
        dealer: false,
        honba: 1,
        deposit
      });
      expectValueText(findCell(fuTable, 30, 1).ron, '1,000 は 1,200');
      expectValueDiffText(findCell(fuTable, 30, 1).ron, '-2,400');
      expectValueDiffText(findCell(fuTable, 30, 1).tsumo, '-1,400 / -1,600');
      expectValueDiffText(limitTable[0]?.ron, '-16,400');
      expectValueDiffText(limitTable[0]?.tsumo, '-8,300 / -10,300');
    }

    const honbaErrFu = buildFuHanTable(
      { ...baseRule, honbaPoint: 300 },
      { dealer: false, honba: 1, deposit: 1 }
    );
    const honbaErrLimit = buildLimitTable(
      { ...baseRule, honbaPoint: 300 },
      { dealer: false, honba: 1, deposit: 1 }
    );
    expectValueText(findCell(honbaErrFu, 30, 1).ron, '1,000');
    expectValueDiffText(findCell(honbaErrFu, 30, 1).ron, '-3,000');
    expectValueDiffText(findCell(honbaErrFu, 30, 1).tsumo, '-2,100 / -2,300');
    expectValueDiffText(honbaErrLimit[0]?.ron, '-17,000');
    expectValueDiffText(honbaErrLimit[0]?.tsumo, '-9,000 / -11,000');

    const bothErrFu = buildFuHanTable(baseRule, {
      dealer: false,
      honba: -1,
      deposit: -1
    });
    const bothErrLimit = buildLimitTable(baseRule, {
      dealer: false,
      honba: -1,
      deposit: -1
    });
    expectValueText(findCell(bothErrFu, 30, 1).ron, '1,000');
    expectValueDiffText(findCell(bothErrFu, 30, 1).ron, '-2,000');
    expectValueDiffText(findCell(bothErrFu, 30, 1).tsumo, '-1,100 / -1,300');
    expectValueDiffText(bothErrLimit[0]?.ron, '-16,000');
    expectValueDiffText(bothErrLimit[0]?.tsumo, '-8,000 / -10,000');
  });

  it('H1-2: formatCellDiff がエクスポートされ payment から点差を直接フォーマットできる', () => {
    // 出典: docs/mahjong-rules.md §3.1 および Q1 確定式
    const table = buildFuHanTable(defaultScoringRule(), {
      dealer: false,
      honba: 0,
      deposit: 1
    });
    const ronCell = findCell(table, 30, 1).ron;
    expect(ronCell.kind).toBe('value');
    if (ronCell.kind === 'value') {
      expect(formatCellDiff(ronCell.payment)).toBe('-3,000');
    }
  });
});
