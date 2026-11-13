// Issue #82: 同点の和了分解の選択を決定的にするテスト
// 設計: docs/design/issue-82-hora-tiebreak.md

import { describe, expect, test } from 'vitest';
import { type Fu, sumOfFu } from './fu';
import { type Hora, uniqueHoras } from './hora';
import type { HandOptions } from './input';
import { type Result, type ScoredHora, generateResult } from './result';
import { DEFAULT_RULE, type Rule } from './rule';
import type { Table } from './table';
import type { Tile } from './tile';
import { sumBy } from './util';

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

/** MPSZ表記 ("444z123p456p789s99s"、赤5は 0p・0s) を Tile[] に変換する */
const parseTiles = (s: string): Tile[] => {
  const tiles: Tile[] = [];
  let digits: string[] = [];
  for (const ch of s) {
    if (ch >= '0' && ch <= '9') {
      digits.push(ch);
      continue;
    }
    if (ch !== 'm' && ch !== 'p' && ch !== 's' && ch !== 'z') {
      throw new Error(`牌姿に不正な文字があります: "${s}"`);
    }
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
  if (digits.length > 0) {
    throw new Error(`末尾に牌の種類 (m/p/s/z) がありません: "${s}"`);
  }
  return tiles;
};

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

const calcOtherHand = (): void => {
  // 設計書 4.1 の「別の手」: 234p567p34s678s55p + 2s
  generateResult(
    southTable,
    {
      hand: parseTiles('234p567p34s678s55p2s'),
      melds: [],
      dora: [],
      nuki: 0
    },
    defaultOptions,
    DEFAULT_RULE
  );
};

const canonicalKey = (h: Hora): string =>
  JSON.stringify([
    h.type,
    h.type === 'mentsu' ? h.melds : [],
    h.type === 'mentsu' ? h.fu : [],
    h.yaku
  ]);

const yakuhaiNorthRule: Rule = { ...DEFAULT_RULE, north: 'yakuhai' };
const r19Hand = parseTiles('444z123p456p789s99s');
const sanankoHand = parseTiles('1112223337899p6p');

describe('同点の和了分解の選択 (I82-01〜I82-06)', () => {
  test('I82-01: R19 ロンで単騎待ち・生の符 40 が選ばれる', () => {
    const res = generateResult(
      southTable,
      { hand: r19Hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      yakuhaiNorthRule
    );
    const ron = extractHora(res, 'ron');
    expect(ron.type).toBe('mentsu');
    if (ron.type !== 'mentsu') return;

    const waiting = ron.fu.find(f => f.type === 'waiting');
    expect(waiting?.waitingType).toBe('tanki');
    expect(sumOfFu(ron.fu)).toBe(40);
  });

  test('I82-02: 別の手の後に R19 を計算し、5回繰り返しても同じ結果になる', () => {
    calcOtherHand();

    for (let i = 0; i < 5; i += 1) {
      const res = generateResult(
        southTable,
        { hand: r19Hand, melds: [], dora: [], nuki: 0 },
        defaultOptions,
        yakuhaiNorthRule
      );
      const ron = extractHora(res, 'ron');
      expect(ron.type).toBe('mentsu');
      if (ron.type !== 'mentsu') return;

      const waiting = ron.fu.find(f => f.type === 'waiting');
      expect(waiting?.waitingType).toBe('tanki');
      expect(sumOfFu(ron.fu)).toBe(40);
    }
  });

  test('I82-03: 1112223337899p+6p は DEFAULT_RULE と localYaku:true の両方で三暗刻の形が選ばれる', () => {
    // (a) DEFAULT_RULE
    const resDefault = generateResult(
      southTable,
      { hand: sanankoHand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      DEFAULT_RULE
    );
    const ronDefault = extractHora(resDefault, 'ron');
    const tsumoDefault = extractHora(resDefault, 'tsumo');

    expect(ronDefault.type).toBe('mentsu');
    expect(tsumoDefault.type).toBe('mentsu');
    if (ronDefault.type !== 'mentsu' || tsumoDefault.type !== 'mentsu') return;

    const ronDefaultYaku = ronDefault.yaku.map(y => y.name);
    const tsumoDefaultYaku = tsumoDefault.yaku.map(y => y.name);
    // 設計書 4.1 I82-03(a) に従い、特定役の含有・非含有を検証する
    expect(ronDefaultYaku).toContain('sananko');
    expect(ronDefaultYaku).not.toContain('pinfu');
    expect(ronDefaultYaku).not.toContain('iipeko');
    expect(sumBy(ronDefault.yaku, y => (y.type === 'yaku' ? y.han : 0))).toBe(
      8
    );
    expect(sumOfFu(ronDefault.fu)).toBe(46);

    // 設計書 4.1 I82-03(a) に従い、特定役の含有・非含有を検証する
    expect(tsumoDefaultYaku).toContain('sananko');
    expect(tsumoDefaultYaku).not.toContain('pinfu');
    expect(tsumoDefaultYaku).not.toContain('iipeko');
    expect(sumBy(tsumoDefault.yaku, y => (y.type === 'yaku' ? y.han : 0))).toBe(
      9
    );
    expect(sumOfFu(tsumoDefault.fu)).toBe(38);

    // (b) localYaku: true
    const localRule: Rule = { ...DEFAULT_RULE, localYaku: true };
    const resLocal = generateResult(
      southTable,
      { hand: sanankoHand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      localRule
    );
    const ronLocal = extractHora(resLocal, 'ron');
    const tsumoLocal = extractHora(resLocal, 'tsumo');

    expect(ronLocal.type).toBe('mentsu');
    expect(tsumoLocal.type).toBe('mentsu');
    if (ronLocal.type !== 'mentsu' || tsumoLocal.type !== 'mentsu') return;

    const ronLocalYaku = ronLocal.yaku.map(y => y.name);
    const tsumoLocalYaku = tsumoLocal.yaku.map(y => y.name);
    // 設計書 4.1 I82-03(b) に従い、特定役の含有・非含有を検証する
    expect(ronLocalYaku).toContain('sananko');
    expect(ronLocalYaku).toContain('sanrenko');
    expect(ronLocalYaku).not.toContain('pinfu');
    expect(ronLocalYaku).not.toContain('isshoku-sanjun');
    expect(sumBy(ronLocal.yaku, y => (y.type === 'yaku' ? y.han : 0))).toBe(10);
    expect(sumOfFu(ronLocal.fu)).toBe(46);

    // 設計書 4.1 I82-03(b) に従い、特定役の含有・非含有を検証する
    expect(tsumoLocalYaku).toContain('sananko');
    expect(tsumoLocalYaku).toContain('sanrenko');
    expect(tsumoLocalYaku).not.toContain('pinfu');
    expect(tsumoLocalYaku).not.toContain('isshoku-sanjun');
    expect(sumBy(tsumoLocal.yaku, y => (y.type === 'yaku' ? y.han : 0))).toBe(
      11
    );
    expect(sumOfFu(tsumoLocal.fu)).toBe(38);
  });

  test('I82-04: 別の手の後に I82-03 の (a)(b) を計算しても同じ結果になる', () => {
    calcOtherHand();

    const resDefault = generateResult(
      southTable,
      { hand: sanankoHand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      DEFAULT_RULE
    );
    const ronDefault = extractHora(resDefault, 'ron');
    const tsumoDefault = extractHora(resDefault, 'tsumo');
    if (ronDefault.type !== 'mentsu' || tsumoDefault.type !== 'mentsu') return;

    // 設計書 4.1 I82-04 により I82-03(a) と同じ結果を検証する
    expect(ronDefault.yaku.map(y => y.name)).toContain('sananko');
    expect(sumBy(ronDefault.yaku, y => (y.type === 'yaku' ? y.han : 0))).toBe(
      8
    );
    expect(sumOfFu(ronDefault.fu)).toBe(46);
    // 設計書 4.1 I82-04 により I82-03(a) と同じ結果を検証する
    expect(tsumoDefault.yaku.map(y => y.name)).toContain('sananko');
    expect(sumBy(tsumoDefault.yaku, y => (y.type === 'yaku' ? y.han : 0))).toBe(
      9
    );
    expect(sumOfFu(tsumoDefault.fu)).toBe(38);

    const localRule: Rule = { ...DEFAULT_RULE, localYaku: true };
    const resLocal = generateResult(
      southTable,
      { hand: sanankoHand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      localRule
    );
    const ronLocal = extractHora(resLocal, 'ron');
    const tsumoLocal = extractHora(resLocal, 'tsumo');
    if (ronLocal.type !== 'mentsu' || tsumoLocal.type !== 'mentsu') return;

    // 設計書 4.1 I82-04 により I82-03(b) と同じ結果を検証する
    expect(ronLocal.yaku.map(y => y.name)).toContain('sananko');
    expect(ronLocal.yaku.map(y => y.name)).toContain('sanrenko');
    expect(sumBy(ronLocal.yaku, y => (y.type === 'yaku' ? y.han : 0))).toBe(10);
    expect(sumOfFu(ronLocal.fu)).toBe(46);
    // 設計書 4.1 I82-04 により I82-03(b) と同じ結果を検証する
    expect(tsumoLocal.yaku.map(y => y.name)).toContain('sananko');
    expect(tsumoLocal.yaku.map(y => y.name)).toContain('sanrenko');
    expect(sumBy(tsumoLocal.yaku, y => (y.type === 'yaku' ? y.han : 0))).toBe(
      11
    );
    expect(sumOfFu(tsumoLocal.fu)).toBe(38);
  });

  describe('I82-05: uniqueHoras 直接呼び出しによる段3〜段7bの単体テスト', () => {
    const horaTile: Tile = { type: 'p', n: 1 };

    const expectBothOrders = (
      a: Hora,
      b: Hora,
      expected: Hora,
      rule: Rule = DEFAULT_RULE
    ): void => {
      const ab = uniqueHoras([a, b], rule);
      const ba = uniqueHoras([b, a], rule);
      expect(ab).toEqual([expected]);
      expect(ba).toEqual([expected]);
    };

    test('I82-05(a): 6飜・同飜で生の符 32 と 40 なら 40 が残る', () => {
      const fu32: Fu[] = [
        { type: 'futei', fu: 20 },
        { type: 'kotsu', tile: 9, kotsuType: 'anko', fu: 8 },
        { type: 'head', tile: 27, fu: 2 },
        {
          type: 'waiting',
          waitingType: 'kanchan',
          block: { type: 'shuntsu', tile: 10, fu: 0 },
          fu: 2
        }
      ];
      const fu40: Fu[] = [
        { type: 'futei', fu: 20 },
        { type: 'kotsu', tile: 9, kotsuType: 'anko', fu: 8 },
        { type: 'menzen-ron', fu: 10 },
        {
          type: 'waiting',
          waitingType: 'tanki',
          block: { type: 'head', tile: 9, fu: 0 },
          fu: 2
        }
      ];
      const hora32: Hora = {
        type: 'mentsu',
        by: 'ron',
        horaTile,
        melds: [],
        fu: fu32,
        yaku: [{ type: 'yaku', name: 'chinitsu', han: 6 }]
      };
      const hora40: Hora = {
        type: 'mentsu',
        by: 'ron',
        horaTile,
        melds: [],
        fu: fu40,
        yaku: [{ type: 'yaku', name: 'chinitsu', han: 6 }]
      };
      expectBothOrders(hora32, hora40, hora40);
    });

    test('I82-05(b): 基本点同点(40符1飜)で生の符 38 と 40 なら 40 が残る', () => {
      const hora38: Hora = {
        type: 'mentsu',
        by: 'ron',
        horaTile,
        melds: [],
        fu: [
          { type: 'futei', fu: 20 },
          { type: 'kotsu', tile: 30, kotsuType: 'anko', fu: 8 },
          { type: 'menzen-ron', fu: 10 }
        ],
        yaku: [{ type: 'yaku', name: 'riichi', han: 1 }]
      };
      const hora40: Hora = {
        type: 'mentsu',
        by: 'ron',
        horaTile,
        melds: [],
        fu: [
          { type: 'futei', fu: 20 },
          { type: 'kotsu', tile: 30, kotsuType: 'anko', fu: 8 },
          { type: 'menzen-ron', fu: 10 },
          {
            type: 'waiting',
            waitingType: 'tanki',
            block: { type: 'head', tile: 9, fu: 0 },
            fu: 2
          }
        ],
        yaku: [{ type: 'yaku', name: 'riichi', han: 1 }]
      };
      expectBothOrders(hora38, hora40, hora40);
    });

    test('I82-05(c): 基本点同点(30符4飜=1920 と 60符3飜=1920、roundedMangan:false)なら 4飜側が残る', () => {
      const hora4Han30Fu: Hora = {
        type: 'mentsu',
        by: 'ron',
        horaTile,
        melds: [],
        fu: [
          { type: 'futei', fu: 20 },
          { type: 'menzen-ron', fu: 10 }
        ],
        yaku: [
          { type: 'yaku', name: 'riichi', han: 1 },
          { type: 'yaku', name: 'honitsu', han: 3 }
        ]
      };
      const hora3Han60Fu: Hora = {
        type: 'mentsu',
        by: 'ron',
        horaTile,
        melds: [],
        fu: [
          { type: 'futei', fu: 20 },
          { type: 'kotsu', tile: 9, kotsuType: 'anko', fu: 8 },
          { type: 'kotsu', tile: 17, kotsuType: 'ankan', fu: 32 }
        ],
        yaku: [{ type: 'yaku', name: 'honitsu', han: 3 }]
      };
      expectBothOrders(hora3Han60Fu, hora4Han30Fu, hora4Han30Fu, {
        ...DEFAULT_RULE,
        roundedMangan: false
      });
    });

    test('I82-05(d): 役満と非役満の混在は役満、役満の倍数違いは倍数の大きい方が残る', () => {
      const yakuman1: Hora = {
        type: 'kokushi',
        by: 'ron',
        horaTile,
        yaku: [{ type: 'yakuman', name: 'kokushi', point: 1 }]
      };
      const han13: Hora = {
        type: 'mentsu',
        by: 'ron',
        horaTile,
        melds: [],
        fu: [{ type: 'futei', fu: 20 }],
        yaku: [
          { type: 'yaku', name: 'chinitsu', han: 6 },
          { type: 'yaku', name: 'dora', han: 7 }
        ]
      };
      expectBothOrders(han13, yakuman1, yakuman1);

      const yakuman3Single: Hora = {
        type: 'kokushi',
        by: 'ron',
        horaTile,
        yaku: [
          { type: 'yakuman', name: 'daisangen', point: 1 },
          { type: 'yakuman', name: 'tsuiso', point: 1 },
          { type: 'yakuman', name: 'ryuiso', point: 1 }
        ]
      };
      const yakumanDouble: Hora = {
        type: 'kokushi',
        by: 'ron',
        horaTile,
        yaku: [{ type: 'yakuman', name: 'kokushi-13', point: 2 }]
      };
      expectBothOrders(yakumanDouble, yakuman3Single, yakuman3Single, {
        ...DEFAULT_RULE,
        multipleYakuman: true
      });
      expectBothOrders(yakuman3Single, yakumanDouble, yakumanDouble, {
        ...DEFAULT_RULE,
        multipleYakuman: false
      });
    });

    test('I82-05(e): 段7a 同じ飜・同じ生の符では 単騎 > 嵌張、双碰 > 両面 の順で残る', () => {
      const kanchan: Hora = {
        type: 'mentsu',
        by: 'ron',
        horaTile,
        melds: [],
        fu: [
          { type: 'futei', fu: 20 },
          { type: 'menzen-ron', fu: 10 },
          {
            type: 'waiting',
            waitingType: 'kanchan',
            block: { type: 'shuntsu', tile: 9, fu: 0 },
            fu: 2
          }
        ],
        yaku: [{ type: 'yaku', name: 'riichi', han: 1 }]
      };
      const tanki: Hora = {
        type: 'mentsu',
        by: 'ron',
        horaTile,
        melds: [],
        fu: [
          { type: 'futei', fu: 20 },
          { type: 'menzen-ron', fu: 10 },
          {
            type: 'waiting',
            waitingType: 'tanki',
            block: { type: 'head', tile: 9, fu: 0 },
            fu: 2
          }
        ],
        yaku: [{ type: 'yaku', name: 'riichi', han: 1 }]
      };
      expectBothOrders(kanchan, tanki, tanki);

      const ryammen: Hora = {
        type: 'mentsu',
        by: 'ron',
        horaTile,
        melds: [],
        fu: [
          { type: 'futei', fu: 20 },
          { type: 'menzen-ron', fu: 10 },
          { type: 'kotsu', tile: 12, kotsuType: 'minko', fu: 2 },
          {
            type: 'waiting',
            waitingType: 'ryammen',
            block: { type: 'shuntsu', tile: 9, fu: 0 },
            fu: 0
          }
        ],
        yaku: [{ type: 'yaku', name: 'riichi', han: 1 }]
      };
      const shampon: Hora = {
        type: 'mentsu',
        by: 'ron',
        horaTile,
        melds: [],
        fu: [
          { type: 'futei', fu: 20 },
          { type: 'menzen-ron', fu: 10 },
          {
            type: 'waiting',
            waitingType: 'shampon',
            block: { type: 'kotsu', tile: 12, kotsuType: 'minko', fu: 2 },
            fu: 0
          }
        ],
        yaku: [{ type: 'yaku', name: 'riichi', han: 1 }]
      };
      expectBothOrders(ryammen, shampon, shampon);
    });

    test('I82-05(f): 同じ倍数の役満どうしでは待ちを持たない和了(kokushi)より tanki 待ちの mentsu が残る', () => {
      const kokushi: Hora = {
        type: 'kokushi',
        by: 'ron',
        horaTile,
        yaku: [{ type: 'yakuman', name: 'kokushi', point: 1 }]
      };
      const mentsuTanki: Hora = {
        type: 'mentsu',
        by: 'ron',
        horaTile,
        melds: [],
        fu: [
          { type: 'futei', fu: 20 },
          { type: 'menzen-ron', fu: 10 },
          {
            type: 'waiting',
            waitingType: 'tanki',
            block: { type: 'head', tile: 9, fu: 0 },
            fu: 2
          }
        ],
        yaku: [{ type: 'yakuman', name: 'suanko-tanki', point: 1 }]
      };
      expectBothOrders(kokushi, mentsuTanki, mentsuTanki);
    });

    test('I82-05(g): 段7b 待ち・飜・生の符が同じで yaku の並びが違う2件は正準文字列が小さい方が残る', () => {
      const fuCommon: Fu[] = [
        { type: 'futei', fu: 20 },
        { type: 'menzen-ron', fu: 10 },
        {
          type: 'waiting',
          waitingType: 'ryammen',
          block: { type: 'shuntsu', tile: 9, fu: 0 },
          fu: 0
        }
      ];
      const horaA: Hora = {
        type: 'mentsu',
        by: 'ron',
        horaTile,
        melds: [],
        fu: fuCommon,
        yaku: [
          { type: 'yaku', name: 'pinfu', han: 1 },
          { type: 'yaku', name: 'tanyao', han: 1 }
        ]
      };
      const horaB: Hora = {
        type: 'mentsu',
        by: 'ron',
        horaTile,
        melds: [],
        fu: fuCommon,
        yaku: [
          { type: 'yaku', name: 'tanyao', han: 1 },
          { type: 'yaku', name: 'pinfu', han: 1 }
        ]
      };
      const keyA = canonicalKey(horaA);
      const keyB = canonicalKey(horaB);
      const expected = keyA < keyB ? horaA : horaB;
      expect(keyA === keyB).toBe(false);
      expectBothOrders(horaA, horaB, expected);
    });
  });

  test('I82-06: 678p777p22p67s888s+8s ツモで双碰待ちが選ばれ、別の手の後でも同じになる', () => {
    const hand = parseTiles('678p777p22p67s888s8s');
    const resSingle = generateResult(
      southTable,
      { hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      DEFAULT_RULE
    );
    const tsumoSingle = extractHora(resSingle, 'tsumo');
    expect(tsumoSingle.type).toBe('mentsu');
    if (tsumoSingle.type !== 'mentsu') return;
    expect(tsumoSingle.fu.find(f => f.type === 'waiting')?.waitingType).toBe(
      'shampon'
    );

    calcOtherHand();

    const resAfter = generateResult(
      southTable,
      { hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      DEFAULT_RULE
    );
    const tsumoAfter = extractHora(resAfter, 'tsumo');
    expect(tsumoAfter.type).toBe('mentsu');
    if (tsumoAfter.type !== 'mentsu') return;
    expect(tsumoAfter.fu.find(f => f.type === 'waiting')?.waitingType).toBe(
      'shampon'
    );
  });
});
