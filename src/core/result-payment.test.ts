// Issue #32 B4. 計算結果と支払いの接続のテスト
// 設計: docs/design/issue-32-result-payment.md

import { describe, expect, test } from 'vitest';
import { type GoldenCase, goldenCases } from './golden-cases';
import type { Hora } from './hora';
import { uniqueHoras } from './hora';
import type { HandOptions, Meld } from './input';
import { type Result, type ScoredHora, generateResult } from './result';
import type { Rule } from './rule';
import { RuleValidationError } from './rule-error';
import type { Table } from './table';
import type { Tile } from './tile';

// ---- 補助関数 (golden.test.ts より複製) ----

const extractHora = (result: Result, by: 'ron' | 'tsumo'): ScoredHora => {
  if (result?.type !== 'hora-shanten' || result.info.type !== 'hora') {
    throw new Error('和了結果が得られませんでした');
  }
  const hora = result.info.hora.find(h => h.by === by);
  if (!hora) {
    throw new Error(`by=${by} の和了候補が見つかりませんでした`);
  }
  return hora;
};

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

const parseSingleTile = (s: string): Tile => {
  const tiles = parseTiles(s);
  const [tile] = tiles;
  if (tiles.length !== 1 || typeof tile === 'undefined')
    throw new Error(`副露の牌は1枚で指定してください: "${s}"`);
  return tile;
};

const toMelds = (c: GoldenCase): Meld[] =>
  (c.melds ?? []).map(m =>
    m.type === 'pon'
      ? { type: 'pon', tile: parseSingleTile(m.tile) }
      : {
          type: 'kan',
          tile: parseSingleTile(m.tile),
          closed: m.closed ?? false
        }
  );

const baseRule: Rule = {
  red: 1,
  honbaPoint: 200,
  depositPoint: 1000,
  ippatsu: true,
  kuitan: true,
  roundedMangan: false,
  doubleWindFu: 4,
  accumlatedYakuman: true,
  multipleYakuman: true,
  kokushi13DoubleYakuman: true,
  suankoTankiDoubleYakuman: true,
  daisushiDoubleYakuman: true,
  pureChurenDoubleYakuman: true,
  north: 'nukidora',
  tsumoLoss: 'loss',
  localYaku: false,
  openRiichi: false
};

const tableOf = (c: GoldenCase): Table => ({
  round: c.round,
  seat: c.seat,
  continue: 0,
  deposit: 0
});

const handOptionsOf = (c: {
  riichi: 'none' | 'riichi' | 'double-riichi';
}): HandOptions => ({
  riichi: c.riichi,
  ippatsu: false,
  rinshan: false,
  chankan: false,
  haitei: false,
  tenho: false,
  tsubameGaeshi: false,
  kanFuri: false
});

const findCase = (id: string): GoldenCase => {
  const found = goldenCases.find(caseItem => caseItem.id === id);
  if (!found) throw new Error(`ケースが見つかりません: ${id}`);
  return found;
};

describe('B4: 計算結果と支払いの接続', () => {
  // 出典: golden-cases.ts (オーナー手計算・電脳麻将で検算済み)
  test.each(goldenCases)('B4-G01: golden $id ($title)', c => {
    const result = generateResult(
      tableOf(c),
      {
        hand: parseTiles(c.hand),
        melds: toMelds(c),
        dora: parseTiles(c.dora),
        nuki: 0
      },
      handOptionsOf(c),
      baseRule
    );

    expect(result).not.toBeNull();
    expect(result?.type).toBe('hora-shanten');
    if (result?.type !== 'hora-shanten' || result.info.type !== 'hora') return;

    const matched = result.info.hora.filter(h => h.by === c.by);
    expect(matched.length).toBe(1);
    const [hora] = matched;
    expect(hora).toBeDefined();

    expect(hora?.score.basePoint).toBe(c.expected.basePoint);
    expect(hora?.score.han).toBe(c.expected.han);
    if (c.expected.fu !== null) {
      expect(hora?.score.fu).toBe(c.expected.fu);
    }
  });

  // 出典: issue-13 §5.3 A5-P23
  test('B4-P01: G02(子・ロン・基本点480)を tsumoLoss 3方式で', () => {
    const c = findCase('G02');
    const tsumoLossModes: Rule['tsumoLoss'][] = [
      'loss',
      'north-split',
      'ron-split'
    ];

    for (const tsumoLoss of tsumoLossModes) {
      const result = generateResult(
        tableOf(c),
        {
          hand: parseTiles(c.hand),
          melds: toMelds(c),
          dora: parseTiles(c.dora),
          nuki: 0
        },
        handOptionsOf(c),
        { ...baseRule, tsumoLoss }
      );

      const hora = extractHora(result, c.by);
      expect(hora.score.payment.total).toBe(2000);
      expect(hora.score.payment.detail).toEqual({
        by: 'ron',
        discarder: { base: 2000, withHonba: 2000 }
      });
    }
  });

  // 出典: issue-13 §5.3 A5-P24
  test('B4-P02: G15(親・ロン・基本点480)', () => {
    const c = findCase('G15');
    const result = generateResult(
      tableOf(c),
      {
        hand: parseTiles(c.hand),
        melds: toMelds(c),
        dora: parseTiles(c.dora),
        nuki: 0
      },
      handOptionsOf(c),
      baseRule
    );

    const hora = extractHora(result, c.by);
    expect(hora.score.payment.total).toBe(2900);
  });

  // 出典: issue-13 §5.3 A5-P25
  test('B4-P03: G02 を tsumoLoss: "ron-split"、卓 2本場・供託1本で', () => {
    const c = findCase('G02');
    const result = generateResult(
      { ...tableOf(c), continue: 2, deposit: 1 },
      {
        hand: parseTiles(c.hand),
        melds: toMelds(c),
        dora: parseTiles(c.dora),
        nuki: 0
      },
      handOptionsOf(c),
      { ...baseRule, tsumoLoss: 'ron-split' }
    );

    const hora = extractHora(result, c.by);
    expect(hora.score.payment).toEqual({
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

  // 出典: issue-13 §5.3 A5-P30
  test('B4-P04: G28(子・役満ロン)を本場0で', () => {
    const c = findCase('G28');
    const result = generateResult(
      tableOf(c),
      {
        hand: parseTiles(c.hand),
        melds: toMelds(c),
        dora: parseTiles(c.dora),
        nuki: 0
      },
      handOptionsOf(c),
      baseRule
    );

    const hora = extractHora(result, c.by);
    expect(hora.score.basePoint).toBe(8000);
    expect(hora.score.payment.total).toBe(32000);
  });

  // 出典: 支払額: issue-13 §5.3 A5-P30(子ロン 4×8000)。数え役満の基本点 8000: A5-P31 の前提と mahjong-rules.md §3.3
  test('B4-P05: G27(子・数え役満ロン)', () => {
    const c = findCase('G27');
    const result = generateResult(
      tableOf(c),
      {
        hand: parseTiles(c.hand),
        melds: toMelds(c),
        dora: parseTiles(c.dora),
        nuki: 0
      },
      handOptionsOf(c),
      baseRule
    );

    const hora = extractHora(result, c.by);
    expect(hora.score.basePoint).toBe(8000);
    expect(hora.score.yakumanPoint).toBe(0);
    expect(hora.score.payment.total).toBe(32000);
  });

  // 出典: mahjong-rules.md §3.2【確定】から手計算
  test('B4-P06: G02 を honbaPoint: 400・depositPoint: 1500・1本場・供託2本で', () => {
    const c = findCase('G02');
    const result = generateResult(
      { ...tableOf(c), continue: 1, deposit: 2 },
      {
        hand: parseTiles(c.hand),
        melds: toMelds(c),
        dora: parseTiles(c.dora),
        nuki: 0
      },
      handOptionsOf(c),
      { ...baseRule, honbaPoint: 400, depositPoint: 1500 }
    );

    const hora = extractHora(result, c.by);
    expect(hora.score.payment.honba).toBe(400);
    expect(hora.score.payment.deposit).toBe(3000);
    expect(hora.score.payment.bonus).toBe(3400);
    if (hora.score.payment.detail.by === 'ron') {
      expect(hora.score.payment.detail.discarder.withHonba).toBe(2400);
    }
  });

  // 出典: mahjong-rules.md §3.1 ツモ損ありの式から手計算(640×2→1300、640→700)
  test('B4-P07: G01(子・平和ツモ・基本点640)を tsumoLoss: "loss"、卓 0本場で', () => {
    const c = findCase('G01');
    const result = generateResult(
      tableOf(c),
      {
        hand: parseTiles(c.hand),
        melds: toMelds(c),
        dora: parseTiles(c.dora),
        nuki: 0
      },
      handOptionsOf(c),
      { ...baseRule, tsumoLoss: 'loss' }
    );

    const hora = extractHora(result, c.by);
    expect(hora.score.payment.total).toBe(2000);
    expect(hora.score.payment.detail).toEqual({
      by: 'tsumo',
      winner: 'nonDealer',
      dealer: { base: 1300, withHonba: 1300 },
      nonDealer: { base: 700, withHonba: 700 }
    });
  });

  // 出典: mahjong-rules.md §3.3・§4 の役満定義、issue-13 §3 のロン式(4×基本点)から手計算
  test('B4-M01: 役満複合 (multipleYakuman: true)', () => {
    const hand = parseTiles('111z2z555z666z777z2z');
    const table: Table = {
      round: 'east',
      seat: 'south',
      continue: 0,
      deposit: 0
    };
    const options = handOptionsOf({ riichi: 'none' });
    const rule: Rule = {
      ...baseRule,
      multipleYakuman: true,
      suankoTankiDoubleYakuman: true
    };

    const result = generateResult(
      table,
      { hand, melds: [], dora: [], nuki: 0 },
      options,
      rule
    );

    if (result?.type !== 'hora-shanten' || result.info.type !== 'hora') {
      throw new Error('和了結果が得られませんでした');
    }
    expect(result.info.hora.length).toBe(2);

    const ronHora = extractHora(result, 'ron');

    // 役一覧に大三元・字一色・四暗刻単騎が含まれることを検証
    const yakuNames = ronHora.yaku.map(y => y.name);
    // 役一覧に3役満が含まれていることの確認のため includes を使用
    expect(yakuNames.includes('daisangen')).toBe(true);
    expect(yakuNames.includes('tsuiso')).toBe(true);
    expect(yakuNames.includes('suanko-tanki')).toBe(true);

    expect(ronHora.score.yakumanPoint).toBe(4);
    expect(ronHora.score.basePoint).toBe(32000);
    expect(ronHora.score.payment.total).toBe(128000);
  });

  // 出典: Q3 確定事項
  test('B4-M02: 役満複合 (multipleYakuman: false)', () => {
    const hand = parseTiles('111z2z555z666z777z2z');
    const table: Table = {
      round: 'east',
      seat: 'south',
      continue: 0,
      deposit: 0
    };
    const options = handOptionsOf({ riichi: 'none' });
    const rule: Rule = {
      ...baseRule,
      multipleYakuman: false,
      suankoTankiDoubleYakuman: true
    };

    const result = generateResult(
      table,
      { hand, melds: [], dora: [], nuki: 0 },
      options,
      rule
    );

    if (result?.type !== 'hora-shanten' || result.info.type !== 'hora') {
      throw new Error('和了結果が得られませんでした');
    }
    expect(result.info.hora.length).toBe(2);

    const ronHora = extractHora(result, 'ron');

    // 役一覧は B4-M01 と同じ3役満を残す
    const yakuNames = ronHora.yaku.map(y => y.name);
    // 役一覧に3役満が含まれていることの確認のため includes を使用
    expect(yakuNames.includes('daisangen')).toBe(true);
    expect(yakuNames.includes('tsuiso')).toBe(true);
    expect(yakuNames.includes('suanko-tanki')).toBe(true);

    expect(ronHora.score.yakumanPoint).toBe(2);
    expect(ronHora.score.basePoint).toBe(16000);
    expect(ronHora.score.payment.total).toBe(64000);
  });

  // 出典: Q3 確定事項
  test('B4-M03: uniqueHoras 直接 (multipleYakuman true/false)', () => {
    const horaTile: Tile = { type: 'z', n: 1 };
    const horaA: Hora = {
      type: 'kokushi',
      by: 'ron',
      horaTile,
      yaku: [
        { type: 'yakuman', name: 'daisangen', point: 1 },
        { type: 'yakuman', name: 'tsuiso', point: 1 },
        { type: 'yakuman', name: 'ryuiso', point: 1 }
      ]
    };
    const horaB: Hora = {
      type: 'kokushi',
      by: 'ron',
      horaTile,
      yaku: [{ type: 'yakuman', name: 'suanko-tanki', point: 2 }]
    };

    // multipleYakuman: true では A (合計3倍) が残る
    const resTrue = uniqueHoras([horaA, horaB], {
      ...baseRule,
      multipleYakuman: true
    });
    expect(resTrue.length).toBe(1);
    const firstTrue = resTrue[0];
    if (!firstTrue) throw new Error('結果が空です');
    expect(firstTrue.yaku.length).toBe(3);

    // multipleYakuman: false では B (最大値2倍) が残る
    const resFalse = uniqueHoras([horaA, horaB], {
      ...baseRule,
      multipleYakuman: false
    });
    expect(resFalse.length).toBe(1);
    const firstFalse = resFalse[0];
    if (!firstFalse) throw new Error('結果が空です');
    expect(firstFalse.yaku.length).toBe(1);
  });

  // 出典: Q1 確定事項(構造の確認。値は統括担当の実測)
  test('B4-D01: 14枚の何切るで next の全候補に score が付与される', () => {
    const hand = parseTiles('123456789p1122z3z');
    const table: Table = {
      round: 'east',
      seat: 'south',
      continue: 0,
      deposit: 0
    };
    const options = handOptionsOf({ riichi: 'none' });

    const result = generateResult(
      table,
      { hand, melds: [], dora: [], nuki: 0 },
      options,
      baseRule
    );

    expect(result).not.toBeNull();
    expect(result?.type).toBe('discard-shanten');
    if (result?.type !== 'discard-shanten') return;

    const discard3z = result.discards.find(
      d => d.tile.type === 'z' && d.tile.n === 3
    );
    expect(discard3z).toBeDefined();
    expect(discard3z?.next.type).toBe('hora-shanten');
    if (discard3z?.next.type !== 'hora-shanten') return;
    expect(discard3z.next.info.type).toBe('hora');
    if (discard3z.next.info.type !== 'hora') return;

    expect(discard3z.next.info.hora.length).toBe(4);
    for (const h of discard3z.next.info.hora) {
      expect(h.score.payment).toBeDefined();
      expect(h.score.basePoint).toBe(3000);
    }
  });

  // 出典: Q2・追加回答2
  test.each([
    {
      rulePatch: { honbaPoint: 300 },
      expectedKey: 'honbaPoint'
    },
    {
      rulePatch: { depositPoint: -100 },
      expectedKey: 'depositPoint'
    },
    {
      rulePatch: { tsumoLoss: 'none' as unknown as Rule['tsumoLoss'] },
      expectedKey: 'tsumoLoss'
    }
  ])(
    'B4-E01: 不正ルールで RuleValidationError ($expectedKey)',
    ({ rulePatch, expectedKey }) => {
      const c = findCase('G02');
      const invalidRule = {
        ...baseRule,
        ...rulePatch
      } as unknown as Rule;

      try {
        generateResult(
          tableOf(c),
          {
            hand: parseTiles(c.hand),
            melds: toMelds(c),
            dora: parseTiles(c.dora),
            nuki: 0
          },
          handOptionsOf(c),
          invalidRule
        );
        expect.unreachable('例外が発生しませんでした');
      } catch (e) {
        expect(e).toBeInstanceOf(RuleValidationError);
        const err = e as RuleValidationError;
        // message の接頭辞確認のため startsWith を使用
        expect(err.message.startsWith('ルールが不正です')).toBe(true);
        // issues 配列の中に該当キーが含まれているか検証
        const hasKey = err.issues.some(issue => issue.key === expectedKey);
        expect(hasKey).toBe(true);
      }
    }
  );

  // 出典: 追加回答1
  test.each([
    { tablePatch: { continue: -1 }, inputType: '和了形' },
    { tablePatch: { continue: 1.5 }, inputType: '和了形' },
    { tablePatch: { deposit: -1 }, inputType: '和了形' },
    { tablePatch: { continue: -1 }, inputType: '向聴形' },
    { tablePatch: { continue: 1.5 }, inputType: '向聴形' },
    { tablePatch: { deposit: -1 }, inputType: '向聴形' }
  ])(
    'B4-E02: 不正卓で Error ($inputType, continue: $tablePatch.continue, deposit: $tablePatch.deposit)',
    ({ tablePatch, inputType }) => {
      const c = findCase('G02');
      const table: Table = {
        ...tableOf(c),
        ...tablePatch
      };
      const hand =
        inputType === '和了形'
          ? parseTiles(c.hand)
          : parseTiles('1m9m1p3p5p7p1s3s5s7s1z3z5z');

      try {
        generateResult(
          table,
          { hand, melds: [], dora: [], nuki: 0 },
          handOptionsOf(c),
          baseRule
        );
        expect.unreachable('例外が発生しませんでした');
      } catch (e) {
        expect(e).not.toBeInstanceOf(RuleValidationError);
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toBe(
          '本場数および供託本数は0以上の整数である必要があります'
        );
      }
    }
  );

  // 出典: §4.4 の順序
  test('B4-E03: 不正ルールかつ不正卓かつ牌入力不正なら RuleValidationError が最優先', () => {
    const invalidRule = {
      ...baseRule,
      honbaPoint: 300
    };
    const invalidTable: Table = {
      round: 'east',
      seat: 'south',
      continue: -1,
      deposit: 0
    };
    const invalidHand = parseTiles('123m123p123s123z1z');

    expect(() =>
      generateResult(
        invalidTable,
        { hand: invalidHand, melds: [], dora: [], nuki: 0 },
        handOptionsOf({ riichi: 'none' }),
        invalidRule
      )
    ).toThrow(RuleValidationError);
  });

  // 出典: §4.4 の順序
  test('B4-E05: 正常ルール・不正卓・牌入力不正なら卓の例外を投げる', () => {
    const invalidTable: Table = {
      round: 'east',
      seat: 'south',
      continue: -1,
      deposit: 0
    };
    const invalidHand = parseTiles('123m123p123s123z1z');

    try {
      generateResult(
        invalidTable,
        { hand: invalidHand, melds: [], dora: [], nuki: 0 },
        handOptionsOf({ riichi: 'none' }),
        baseRule
      );
      expect.unreachable('例外が発生しませんでした');
    } catch (e) {
      expect(e).not.toBeInstanceOf(RuleValidationError);
      expect(e).toBeInstanceOf(Error);
      expect((e as Error).message).toBe(
        '本場数および供託本数は0以上の整数である必要があります'
      );
    }
  });

  // 出典: Q2(牌入力は従来どおり null)
  test('B4-E04: 正常ルールで牌入力が不正なら null を返す', () => {
    const validTable: Table = {
      round: 'east',
      seat: 'south',
      continue: 0,
      deposit: 0
    };
    const invalidHand = parseTiles('123m123p123s123z1z');

    const result = generateResult(
      validTable,
      { hand: invalidHand, melds: [], dora: [], nuki: 0 },
      handOptionsOf({ riichi: 'none' }),
      baseRule
    );

    expect(result).toBeNull();
  });
});
