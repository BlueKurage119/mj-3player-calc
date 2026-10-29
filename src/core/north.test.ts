import { describe, expect, test } from 'vitest';
import type { HandOptions } from './input';
import { generateResult } from './result';
import { type Rule, compareRules } from './rule';
import { calculateBasePoint, ceil10 } from './score';
import type { Table } from './table';
import type { Tile } from './tile';
import { sumOfFu } from './fu';
import type { Hora } from './hora';
import { sumBy } from './util';

// ---- 補助関数 (result.test.ts より複製) ----

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

// ---- 固定する条件 (設計書 §5) ----
const baseRule: Rule = {
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
  north: 'nukidora'
};

const defaultTable: Table = {
  round: 'east',
  seat: 'south',
  continue: 0,
  deposit: 0
};

const defaultOptions: HandOptions = {
  riichi: 'riichi',
  ippatsu: false,
  rinshan: false,
  chankan: false,
  haitei: false,
  tenho: false
};

// 牌姿定義 (設計書 §5.1)
const P = '99m123p45p123s789s6p';
const C = '11m99m11p22p33p44s77z';
const K = '444z111m123p456p9s9s';
const H = '44z123p45p123s789s6p';
const T = '123p456p123s789s4z4z';
const S = '234p567p234s88s67s8s';
const X = '19m19p19s1234566z7z';
const A = '111m4z';

type Result = ReturnType<typeof generateResult>;

const getHora = (res: Result, by: 'ron' | 'tsumo'): Hora => {
  expect(res).not.toBeNull();
  expect(res?.type).toBe('hora-shanten');
  if (res?.type !== 'hora-shanten') throw new Error('not hora-shanten');
  expect(res.info.type).toBe('hora');
  if (res.info.type !== 'hora') throw new Error('not hora');
  const hora = res.info.hora.find(h => h.by === by);
  expect(hora).toBeDefined();
  if (!hora) throw new Error(`no hora for ${by}`);
  return hora;
};

const toYakuTuples = (hora: Hora): [string, number][] => {
  return hora.yaku
    .map(y => [y.name, y.type === 'yaku' ? y.han : y.point] as [string, number])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]));
};

describe('Issue #12: 北の扱い (A4)', () => {
  describe('抜きドラ (A4-N01〜N11)', () => {
    test('A4-N01: P、抜、nuki 2、dora []、ロン -> 役 = riichi1・pinfu1・nuki-dora2', () => {
      const res = generateResult(
        defaultTable,
        { hand: parseTiles(P), melds: [], dora: [], nuki: 2 },
        defaultOptions,
        baseRule
      );
      const hora = getHora(res, 'ron');
      expect(toYakuTuples(hora)).toEqual([
        ['nuki-dora', 2],
        ['pinfu', 1],
        ['riichi', 1]
      ]);
    });

    test('A4-N02: P、抜、nuki 2、dora 3z、ロン -> 役 = riichi1・pinfu1・nuki-dora2・dora2', () => {
      const res = generateResult(
        defaultTable,
        { hand: parseTiles(P), melds: [], dora: parseTiles('3z'), nuki: 2 },
        defaultOptions,
        baseRule
      );
      const hora = getHora(res, 'ron');
      expect(toYakuTuples(hora)).toEqual([
        ['dora', 2],
        ['nuki-dora', 2],
        ['pinfu', 1],
        ['riichi', 1]
      ]);
    });

    test('A4-N03: P、抜、nuki 0、dora 3z、ロン -> 役 = riichi1・pinfu1(nuki-dora・dora なし)', () => {
      const res = generateResult(
        defaultTable,
        { hand: parseTiles(P), melds: [], dora: parseTiles('3z'), nuki: 0 },
        defaultOptions,
        baseRule
      );
      const hora = getHora(res, 'ron');
      expect(toYakuTuples(hora)).toEqual([
        ['pinfu', 1],
        ['riichi', 1]
      ]);
    });

    test('A4-N04: P、抜、nuki 2、ツモ -> 役に tsumo1・pinfu1 がある(門前が保たれる)', () => {
      const res = generateResult(
        defaultTable,
        { hand: parseTiles(P), melds: [], dora: [], nuki: 2 },
        defaultOptions,
        baseRule
      );
      const hora = getHora(res, 'tsumo');
      const tuples = toYakuTuples(hora);
      expect(tuples).toContainEqual(['tsumo', 1]);
      expect(tuples).toContainEqual(['pinfu', 1]);
    });

    test('A4-N05: P、抜、nuki 2、ロン -> 符の内訳に menzen-ron(10符)がある', () => {
      const res = generateResult(
        defaultTable,
        { hand: parseTiles(P), melds: [], dora: [], nuki: 2 },
        defaultOptions,
        baseRule
      );
      const hora = getHora(res, 'ron');
      expect(hora.type).toBe('mentsu');
      if (hora.type === 'mentsu') {
        expect(hora.fu).toContainEqual({ type: 'menzen-ron', fu: 10 });
      }
    });

    test('A4-N06: C、抜、nuki 4、dora 3z,3z、ロン -> 役 = riichi1・chitoitsu2・nuki-dora4・dora8、飜の合計15', () => {
      const res = generateResult(
        defaultTable,
        { hand: parseTiles(C), melds: [], dora: parseTiles('3z3z'), nuki: 4 },
        defaultOptions,
        baseRule
      );
      const hora = getHora(res, 'ron');
      expect(toYakuTuples(hora)).toEqual([
        ['chitoitsu', 2],
        ['dora', 8],
        ['nuki-dora', 4],
        ['riichi', 1]
      ]);
      const hanSum = sumBy(
        hora.yaku.filter(y => y.type === 'yaku'),
        y => y.han
      );
      expect(hanSum).toBe(15);
      expect(calculateBasePoint(25, hanSum, false, true)).toBe(8000);
    });

    test('A4-N07: P、抜、nuki 1、rinshan: true、ツモ -> 和了は tsumo のみ1件、役に rinshan1', () => {
      const res = generateResult(
        defaultTable,
        { hand: parseTiles(P), melds: [], dora: [], nuki: 1 },
        { ...defaultOptions, rinshan: true },
        baseRule
      );
      expect(res?.type).toBe('hora-shanten');
      if (res?.type === 'hora-shanten' && res.info.type === 'hora') {
        expect(res.info.hora).toHaveLength(1);
        const [hora] = res.info.hora;
        expect(hora).toBeDefined();
        if (!hora) return;
        expect(hora.by).toBe('tsumo');
        expect(toYakuTuples(hora)).toContainEqual(['rinshan', 1]);
      }
    });

    test('A4-N08: P、抜、nuki 0、rinshan: true -> 役に rinshan が無い', () => {
      const res = generateResult(
        defaultTable,
        { hand: parseTiles(P), melds: [], dora: [], nuki: 0 },
        { ...defaultOptions, rinshan: true },
        baseRule
      );
      expect(res?.type).toBe('hora-shanten');
      if (res?.type === 'hora-shanten' && res.info.type === 'hora') {
        for (const hora of res.info.hora) {
          expect(hora.yaku.some(y => y.name === 'rinshan')).toBe(false);
        }
      }
    });

    test('A4-N09: C、抜、nuki 1、rinshan: true、ツモ -> 和了は tsumo のみ1件、役に rinshan1・nuki-dora1', () => {
      const res = generateResult(
        defaultTable,
        { hand: parseTiles(C), melds: [], dora: [], nuki: 1 },
        { ...defaultOptions, rinshan: true },
        baseRule
      );
      expect(res?.type).toBe('hora-shanten');
      if (res?.type === 'hora-shanten' && res.info.type === 'hora') {
        expect(res.info.hora).toHaveLength(1);
        const [hora] = res.info.hora;
        expect(hora).toBeDefined();
        if (!hora) return;
        expect(hora.by).toBe('tsumo');
        const tuples = toYakuTuples(hora);
        expect(tuples).toContainEqual(['rinshan', 1]);
        expect(tuples).toContainEqual(['nuki-dora', 1]);
      }
    });

    test('A4-N10: S、抜、nuki 1、ロン -> 役に tanyao1・nuki-dora1 がある', () => {
      const res = generateResult(
        defaultTable,
        { hand: parseTiles(S), melds: [], dora: [], nuki: 1 },
        defaultOptions,
        baseRule
      );
      const hora = getHora(res, 'ron');
      const tuples = toYakuTuples(hora);
      expect(tuples).toContainEqual(['tanyao', 1]);
      expect(tuples).toContainEqual(['nuki-dora', 1]);
    });

    test('A4-N11: X、抜、nuki 2、ロン -> 役 = 役満 kokushi(point 1)のみ(nuki-dora は無い)', () => {
      const res = generateResult(
        defaultTable,
        { hand: parseTiles(X), melds: [], dora: [], nuki: 2 },
        defaultOptions,
        baseRule
      );
      const hora = getHora(res, 'ron');
      expect(hora.yaku).toEqual([
        { type: 'yakuman', name: 'kokushi', point: 1 }
      ]);
    });
  });

  describe('共通役牌 (A4-Y01〜Y14)', () => {
    const yakuhaiRule: Rule = { ...baseRule, north: 'yakuhai' };

    test('A4-Y01: K、共、nuki 0、ロン -> 役に north1', () => {
      const res = generateResult(
        defaultTable,
        { hand: parseTiles(K), melds: [], dora: [], nuki: 0 },
        defaultOptions,
        yakuhaiRule
      );
      const hora = getHora(res, 'ron');
      expect(toYakuTuples(hora)).toContainEqual(['north', 1]);
    });

    test('A4-Y02: K、抜、nuki 0、ロン -> 役に north が無い', () => {
      const res = generateResult(
        defaultTable,
        { hand: parseTiles(K), melds: [], dora: [], nuki: 0 },
        defaultOptions,
        baseRule
      );
      const hora = getHora(res, 'ron');
      expect(hora.yaku.some(y => y.name === 'north')).toBe(false);
    });

    test('A4-Y03: H、共、ロン -> 役に pinfu が無い。符の合計 32(切り上げ後40)', () => {
      const res = generateResult(
        defaultTable,
        { hand: parseTiles(H), melds: [], dora: [], nuki: 0 },
        defaultOptions,
        yakuhaiRule
      );
      const hora = getHora(res, 'ron');
      expect(hora.yaku.some(y => y.name === 'pinfu')).toBe(false);
      expect(hora.type).toBe('mentsu');
      if (hora.type === 'mentsu') {
        const rawFu = sumOfFu(hora.fu);
        expect(rawFu).toBe(32);
        expect(ceil10(rawFu)).toBe(40);
      }
    });

    test('A4-Y04: H、抜、ロン -> 役に pinfu。符30', () => {
      const res = generateResult(
        defaultTable,
        { hand: parseTiles(H), melds: [], dora: [], nuki: 0 },
        defaultOptions,
        baseRule
      );
      const hora = getHora(res, 'ron');
      expect(hora.yaku.some(y => y.name === 'pinfu')).toBe(true);
      expect(hora.type).toBe('mentsu');
      if (hora.type === 'mentsu') {
        const rawFu = sumOfFu(hora.fu);
        expect(rawFu).toBe(30);
        expect(ceil10(rawFu)).toBe(30);
      }
    });

    test('A4-Y05: H、共、ツモ -> 符の内訳に pinfu-tsumo が無く tsumo(2符)がある。符の合計24(切り上げ後30)', () => {
      const res = generateResult(
        defaultTable,
        { hand: parseTiles(H), melds: [], dora: [], nuki: 0 },
        defaultOptions,
        yakuhaiRule
      );
      const hora = getHora(res, 'tsumo');
      expect(hora.type).toBe('mentsu');
      if (hora.type === 'mentsu') {
        expect(hora.fu.some(f => f.type === 'pinfu-tsumo')).toBe(false);
        expect(hora.fu).toContainEqual({ type: 'tsumo', fu: 2 });
        const rawFu = sumOfFu(hora.fu);
        expect(rawFu).toBe(24);
        expect(ceil10(rawFu)).toBe(30);
      }
    });

    test('A4-Y06: H、抜、ツモ -> 符の内訳に pinfu-tsumo がある(20符)', () => {
      const res = generateResult(
        defaultTable,
        { hand: parseTiles(H), melds: [], dora: [], nuki: 0 },
        defaultOptions,
        baseRule
      );
      const hora = getHora(res, 'tsumo');
      expect(hora.type).toBe('mentsu');
      if (hora.type === 'mentsu') {
        expect(hora.fu).toContainEqual({ type: 'pinfu-tsumo', fu: 0 });
        const rawFu = sumOfFu(hora.fu);
        expect(rawFu).toBe(20);
        expect(ceil10(rawFu)).toBe(20);
      }
    });

    test('A4-Y07: T、共、ロン -> 待ちの block.fu が2、符の合計34', () => {
      const res = generateResult(
        defaultTable,
        { hand: parseTiles(T), melds: [], dora: [], nuki: 0 },
        defaultOptions,
        yakuhaiRule
      );
      const hora = getHora(res, 'ron');
      expect(hora.type).toBe('mentsu');
      if (hora.type === 'mentsu') {
        const waiting = hora.fu.find(f => f.type === 'waiting');
        expect(waiting?.block.fu).toBe(2);
        expect(sumOfFu(hora.fu)).toBe(34);
      }
    });

    test('A4-Y08: T、抜、ロン -> 待ちの block.fu が0、符の合計32', () => {
      const res = generateResult(
        defaultTable,
        { hand: parseTiles(T), melds: [], dora: [], nuki: 0 },
        defaultOptions,
        baseRule
      );
      const hora = getHora(res, 'ron');
      expect(hora.type).toBe('mentsu');
      if (hora.type === 'mentsu') {
        const waiting = hora.fu.find(f => f.type === 'waiting');
        expect(waiting?.block.fu).toBe(0);
        expect(sumOfFu(hora.fu)).toBe(32);
      }
    });

    test('A4-Y09: T、共、ツモ -> 待ちの block.fu が2、符の合計26', () => {
      const res = generateResult(
        defaultTable,
        { hand: parseTiles(T), melds: [], dora: [], nuki: 0 },
        defaultOptions,
        yakuhaiRule
      );
      const hora = getHora(res, 'tsumo');
      expect(hora.type).toBe('mentsu');
      if (hora.type === 'mentsu') {
        const waiting = hora.fu.find(f => f.type === 'waiting');
        expect(waiting?.block.fu).toBe(2);
        expect(sumOfFu(hora.fu)).toBe(26);
      }
    });

    test('A4-Y10: T、抜、ツモ -> 待ちの block.fu が0、符の合計24', () => {
      const res = generateResult(
        defaultTable,
        { hand: parseTiles(T), melds: [], dora: [], nuki: 0 },
        defaultOptions,
        baseRule
      );
      const hora = getHora(res, 'tsumo');
      expect(hora.type).toBe('mentsu');
      if (hora.type === 'mentsu') {
        const waiting = hora.fu.find(f => f.type === 'waiting');
        expect(waiting?.block.fu).toBe(0);
        expect(sumOfFu(hora.fu)).toBe(24);
      }
    });

    test('A4-Y11: M、共、ロン -> 役に north1', () => {
      const res = generateResult(
        defaultTable,
        {
          hand: parseTiles('123p456p123s9m9m'),
          melds: [{ type: 'pon', tile: parseSingleTile('4z') }],
          dora: [],
          nuki: 0
        },
        { ...defaultOptions, riichi: 'none' },
        yakuhaiRule
      );
      const hora = getHora(res, 'ron');
      expect(toYakuTuples(hora)).toContainEqual(['north', 1]);
    });

    test('A4-Y12: M(明槓)、共、ロン -> 役に north1', () => {
      const res = generateResult(
        defaultTable,
        {
          hand: parseTiles('123p456p123s9m9m'),
          melds: [{ type: 'kan', tile: parseSingleTile('4z'), closed: false }],
          dora: [],
          nuki: 0
        },
        { ...defaultOptions, riichi: 'none' },
        yakuhaiRule
      );
      const hora = getHora(res, 'ron');
      expect(toYakuTuples(hora)).toContainEqual(['north', 1]);
    });

    test('A4-Y13: M、抜、ロン -> 役に north が無い', () => {
      const res = generateResult(
        defaultTable,
        {
          hand: parseTiles('123p456p123s9m9m'),
          melds: [{ type: 'pon', tile: parseSingleTile('4z') }],
          dora: [],
          nuki: 0
        },
        { ...defaultOptions, riichi: 'none' },
        baseRule
      );
      const hora = getHora(res, 'ron');
      expect(hora.yaku.some(y => y.name === 'north')).toBe(false);
    });

    test('A4-Y14: K、共、nuki 0、dora 3z、ロン -> 役に north1・dora3', () => {
      const res = generateResult(
        defaultTable,
        {
          hand: parseTiles(K),
          melds: [],
          dora: parseTiles('3z'),
          nuki: 0
        },
        defaultOptions,
        yakuhaiRule
      );
      const hora = getHora(res, 'ron');
      const tuples = toYakuTuples(hora);
      expect(tuples).toContainEqual(['north', 1]);
      expect(tuples).toContainEqual(['dora', 3]);
    });
  });

  describe('入力の検証 (A4-V01〜V06)', () => {
    test('A4-V01: P、共、nuki 1 -> null。同じ牌姿で nuki 0 なら null でない', () => {
      const resInvalid = generateResult(
        defaultTable,
        { hand: parseTiles(P), melds: [], dora: [], nuki: 1 },
        defaultOptions,
        { ...baseRule, north: 'yakuhai' }
      );
      expect(resInvalid).toBeNull();

      const resValid = generateResult(
        defaultTable,
        { hand: parseTiles(P), melds: [], dora: [], nuki: 0 },
        defaultOptions,
        { ...baseRule, north: 'yakuhai' }
      );
      expect(resValid).not.toBeNull();
    });

    test('A4-V02: P、抜、nuki -1・1.5・5 -> いずれも null', () => {
      for (const nuki of [-1, 1.5, 5]) {
        const res = generateResult(
          defaultTable,
          { hand: parseTiles(P), melds: [], dora: [], nuki },
          defaultOptions,
          baseRule
        );
        expect(res).toBeNull();
      }
    });

    test('A4-V03: K(北3枚)、抜、nuki 2 -> null(3+2=5)。nuki 1 なら null でない', () => {
      const resInvalid = generateResult(
        defaultTable,
        { hand: parseTiles(K), melds: [], dora: [], nuki: 2 },
        defaultOptions,
        baseRule
      );
      expect(resInvalid).toBeNull();

      const resValid = generateResult(
        defaultTable,
        { hand: parseTiles(K), melds: [], dora: [], nuki: 1 },
        defaultOptions,
        baseRule
      );
      expect(resValid).not.toBeNull();
    });

    test('A4-V04: P、抜、nuki 4、dora 4z -> null(4+1=5)', () => {
      const res = generateResult(
        defaultTable,
        { hand: parseTiles(P), melds: [], dora: parseTiles('4z'), nuki: 4 },
        defaultOptions,
        baseRule
      );
      expect(res).toBeNull();
    });

    test('A4-V05: P、抜、nuki 4、dora [] -> type: hora-shanten かつ info.type === hora(4枚ちょうどは許す)', () => {
      const res = generateResult(
        defaultTable,
        { hand: parseTiles(P), melds: [], dora: [], nuki: 4 },
        defaultOptions,
        baseRule
      );
      expect(res?.type).toBe('hora-shanten');
      if (res?.type === 'hora-shanten') {
        expect(res.info.type).toBe('hora');
      }
    });

    test('A4-V06: M(北のポン)、抜、nuki 2 -> null(副露3+2=5)。nuki 1 なら null でない', () => {
      const resInvalid = generateResult(
        defaultTable,
        {
          hand: parseTiles('123p456p123s9m9m'),
          melds: [{ type: 'pon', tile: parseSingleTile('4z') }],
          dora: [],
          nuki: 2
        },
        { ...defaultOptions, riichi: 'none' },
        baseRule
      );
      expect(resInvalid).toBeNull();

      const resValid = generateResult(
        defaultTable,
        {
          hand: parseTiles('123p456p123s9m9m'),
          melds: [{ type: 'pon', tile: parseSingleTile('4z') }],
          dora: [],
          nuki: 1
        },
        { ...defaultOptions, riichi: 'none' },
        baseRule
      );
      expect(resValid).not.toBeNull();
    });
  });

  describe('残り枚数とルール比較 (A4-A01, A4-R01)', () => {
    test('A4-A01: A、抜、nuki 0 / 2 / 3 -> type: tempai、待ちに 4z があり、残り枚数がそれぞれ 3 / 1 / 0', () => {
      for (const [nuki, expectedCount] of [
        [0, 3],
        [2, 1],
        [3, 0]
      ] as const) {
        const res = generateResult(
          defaultTable,
          { hand: parseTiles(A), melds: [], dora: [], nuki },
          defaultOptions,
          baseRule
        );
        expect(res?.type).toBe('tempai');
        if (res?.type === 'tempai') {
          const a4z = res.tileAvailabilities.find(
            a => a.tile.type === 'z' && a.tile.n === 4
          );
          expect(a4z).toBeDefined();
          expect(a4z?.count).toBe(expectedCount);
        }
      }
    });

    test('A4-R01: compareRules -> north だけが異なる2つの Rule で false、同じなら true', () => {
      const r1: Rule = { ...baseRule, north: 'nukidora' };
      const r2: Rule = { ...baseRule, north: 'yakuhai' };
      expect(compareRules(r1, r2)).toBe(false);
      expect(compareRules(r1, { ...r1 })).toBe(true);
    });
  });
});
