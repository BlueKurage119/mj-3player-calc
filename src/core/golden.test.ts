// 点数計算のゴールデンテスト (Issue #9)。設計: docs/design/issue-9-golden-tests.md
//
// 役・飜・符・基本点を、実装と独立した出典付きの期待値で固定する。
// 三麻化 (A2 以降) で意図しない変化があれば検知する安全網とする。
//
// 出典の扱い (業務標準07「点数の期待値」)
// - 牌姿: オーナーが自作した和了形。実際の対局の和了画面は使わない。
// - 役・飜・符・基本点・区分: 手計算 (Wikipedia「麻雀の得点計算」「麻雀の役一覧」) と
//   電脳麻将 (kobalab) の両方で一致を確かめたものを期待値とする。
//   実装の取り込み元や本リポジトリのアプリ画面は検算に使わない。
//   全ケースを手計算 (Excel の計算式) と電脳麻将の両方で検算した。
// - 資料: ../../../doc/三麻テスト用牌譜.xlsx (1局1シート)。期待値は golden-cases.ts に転記し、テストは xlsx を読まない。
// - 基本点: Wikipedia「麻雀の得点計算」の式 (基本点 = 符 x 2^(飜+2)、満貫以上の区分)
//   で手計算した数値を、golden-cases.ts に数値リテラルで直接書く。
//   期待値を実装の関数で作らない (独立性のため)。
// - 抜き北: 自作の和了形には含めない (抜きドラの飜の差し引きは行わない)。
// - 裏ドラ: コアに専用の役名が無いため、表ドラと合算して dora の飜に入れる。
//   裏ドラ表示牌は dora 表示牌の文字列に加える。
//
// 検証しないもの: 支払い (親子配分・本場・供託・ツモ損)、偶然役 (一発・嶺上・槍槓・海底・天和など)。

import { describe, expect, test } from 'vitest';
import { sumOfFu } from './fu';
import { type GoldenCase, goldenCases } from './golden-cases';
import type { HandOptions, Meld } from './input';
import type { Hora } from './hora';
import { generateResult } from './result';
import type { Rule } from './rule';
import { calculateBasePoint, ceil10 } from './score';
import type { Table } from './table';
import { type Tile, tilesToMpsz } from './tile';

// ---- 補助関数 ----

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

// ---- 固定する条件 (設計書 §3.1) ----

const rule: Rule = {
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

const tableOf = (c: GoldenCase): Table => ({
  round: c.round,
  seat: c.seat,
  continue: 0,
  deposit: 0
});

const handOptionsOf = (c: GoldenCase): HandOptions => ({
  riichi: c.riichi,
  ippatsu: false,
  rinshan: false,
  chankan: false,
  haitei: false,
  tenho: false
});

// ---- 計算結果の取り出し ----

type Tier = GoldenCase['expected']['tier'];

interface Actual {
  yaku: [string, number][];
  han: number;
  fu: number | null;
  /** 切り上げ前の符 (mentsu のみ) */
  rawFu: number | null;
  basePoint: number;
  tier: Tier;
}

const tierOf = (basePoint: number, hasYakuman: boolean): Tier => {
  if (hasYakuman || basePoint >= 8000) return '役満';
  if (basePoint >= 6000) return '三倍満';
  if (basePoint >= 4000) return '倍満';
  if (basePoint >= 3000) return '跳満';
  if (basePoint >= 2000) return '満貫';
  return '通常';
};

const byName = (a: [string, number], b: [string, number]) =>
  a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;

const findHora = (c: GoldenCase): Hora => {
  const melds = toMelds(c);
  const result = generateResult(
    tableOf(c),
    { hand: parseTiles(c.hand), melds, dora: parseTiles(c.dora), nuki: 0 },
    handOptionsOf(c),
    rule
  );
  if (
    result === null ||
    result.type !== 'hora-shanten' ||
    result.info.type !== 'hora'
  )
    throw new Error(
      `${c.id}: 和了として扱われませんでした (type: ${result?.type})`
    );
  const horas = result.info.hora.filter(h => h.by === c.by);
  const [hora] = horas;
  if (horas.length !== 1 || typeof hora === 'undefined')
    throw new Error(`${c.id}: by=${c.by} の和了が ${horas.length} 件でした`);
  return hora;
};

const actualOf = (c: GoldenCase): Actual => {
  const hora = findHora(c);
  const yaku: [string, number][] = hora.yaku.map(y => [
    y.name,
    y.type === 'yakuman' ? y.point : y.han
  ]);
  yaku.sort(byName);
  const han = hora.yaku.reduce(
    (s, y) => s + (y.type === 'yaku' ? y.han : 0),
    0
  );
  const yakumanPoint = hora.yaku.reduce(
    (s, y) => s + (y.type === 'yakuman' ? y.point : 0),
    0
  );
  const hasYakuman = yakumanPoint > 0;
  const rawFu = hora.type === 'mentsu' ? sumOfFu(hora.fu) : null;
  const fu = hasYakuman
    ? null
    : hora.type === 'mentsu'
      ? ceil10(sumOfFu(hora.fu))
      : hora.type === 'chitoitsu'
        ? 25
        : null;
  const basePoint = hasYakuman
    ? 8000 * yakumanPoint
    : calculateBasePoint(
        fu ?? 0,
        han,
        rule.roundedMangan,
        rule.accumlatedYakuman
      );
  return {
    yaku,
    han,
    fu,
    rawFu,
    basePoint,
    tier: tierOf(basePoint, hasYakuman)
  };
};

const actualCache = new Map<string, Actual>();
const actual = (c: GoldenCase): Actual => {
  const cached = actualCache.get(c.id);
  if (typeof cached !== 'undefined') return cached;
  const a = actualOf(c);
  actualCache.set(c.id, a);
  return a;
};

// ---- 補助関数の自己検査 ----

describe('牌姿の変換', () => {
  test('MPSZ表記と相互変換できる', () => {
    expect(tilesToMpsz(parseTiles('19m19p19s1234567z'))).toBe(
      '19m19p19s1234567z'
    );
    expect(tilesToMpsz(parseTiles('123p0s5s'))).toBe('123p05s');
  });
  test('赤5は red: true、通常の5は red: false になる', () => {
    expect(parseTiles('0p5p')).toEqual([
      { type: 'p', n: 5, red: true },
      { type: 'p', n: 5, red: false }
    ]);
  });
  test('不正な表記は例外になる', () => {
    expect(() => parseTiles('12')).toThrow();
    expect(() => parseTiles('8z')).toThrow();
    expect(() => parseTiles('1x')).toThrow();
  });
});

// ---- ケースごとの検証 (設計書 §3) ----

describe.each(goldenCases)('$id $title', c => {
  test('役', () => {
    expect(actual(c).yaku).toEqual(
      Object.entries(c.expected.yaku).sort(byName)
    );
  });
  test('飜', () => {
    expect(actual(c).han).toBe(c.expected.han);
  });
  test('符', () => {
    expect(actual(c).fu).toBe(c.expected.fu);
  });
  test('基本点', () => {
    expect(actual(c).basePoint).toBe(c.expected.basePoint);
  });
  test('区分', () => {
    expect(actual(c).tier).toBe(c.expected.tier);
  });
  // C6 は切り上げ前の符の合計が 22 であること (設計書 §6)
  test.skipIf(c.category !== 'C6')('C6: 切り上げ前の符が 22', () => {
    expect(actual(c).rawFu).toBe(22);
  });
});

// ---- ケースごとのデータ検査 (設計書 §5.3 の 1〜6, 9) ----

const dataTiles = (c: GoldenCase): Tile[] => [
  ...parseTiles(c.hand),
  ...(c.melds ?? []).map(m => parseSingleTile(m.tile)),
  ...parseTiles(c.dora)
];

const isMiddleManzu = (t: Tile) => t.type === 'm' && t.n >= 2 && t.n <= 8;

const countOf = (tiles: Tile[], type: Tile['type'], n: number) =>
  tiles.filter(t => t.type === type && t.n === n).length;

/** 七対子形か (雀頭の検査の対象外。国士は北を含むため北禁止の検査で除外される) */
const isChitoitsuShape = (c: GoldenCase): boolean => {
  if ((c.melds ?? []).length > 0) return false;
  const hand = parseTiles(c.hand);
  const keys = new Set(hand.map(t => `${t.n}${t.type}`));
  const isChitoitsu =
    keys.size === 7 &&
    [...keys].every(
      k => hand.filter(t => `${t.n}${t.type}` === k).length === 2
    );
  return isChitoitsu;
};

const northYakuman = [
  'kokushi',
  'kokushi-13',
  'tsuiso',
  'shosushi',
  'daisushi'
];
const windNumber = { east: 1, south: 2, west: 3 } as const;
const absolutePath = /\/Users\/|\/home\/|~\//;

describe.each(goldenCases)('データ検査 $id', c => {
  test('手牌・副露・ドラ表示牌に 2m〜8m が無い', () => {
    expect(dataTiles(c).filter(isMiddleManzu)).toEqual([]);
  });
  test('ドラ表示牌に 1m が無い', () => {
    expect(parseTiles(c.dora).filter(t => t.type === 'm' && t.n === 1)).toEqual(
      []
    );
  });
  test('北 (4z) が手牌・副露に無い (北を含む役満は例外)', () => {
    // 国士無双・字一色・小四喜・大四喜は北を含んでよい (設計書 §5.3-3)
    if (Object.keys(c.expected.yaku).some(y => northYakuman.includes(y)))
      return;
    const tiles = [
      ...parseTiles(c.hand),
      ...(c.melds ?? []).map(m => parseSingleTile(m.tile))
    ];
    expect(countOf(tiles, 'z', 4)).toBe(0);
  });
  test('副露にチーが無く、赤5m が無い', () => {
    for (const m of c.melds ?? []) expect(m.type as string).not.toBe('chii');
    expect(dataTiles(c).filter(t => t.type === 'm' && t.n === 5)).toEqual([]);
  });
  test('seat / round に north が無い', () => {
    expect(c.seat as string).not.toBe('north');
    expect(c.round as string).not.toBe('north');
  });
  test('連風牌の雀頭を含まない', () => {
    if (c.round !== c.seat || isChitoitsuShape(c)) return;
    // 手牌 (副露を除く) に連風牌がちょうど2枚あれば雀頭とみなす
    expect(countOf(parseTiles(c.hand), 'z', windNumber[c.round])).not.toBe(2);
  });
  test('出典 (yakuHanFu・basePoint) が空でなく、絶対パスを含まない', () => {
    expect(c.source.yakuHanFu.trim()).not.toBe('');
    expect(c.source.basePoint.trim()).not.toBe('');
    for (const s of [
      c.source.yakuHanFu,
      c.source.basePoint,
      c.source.note ?? ''
    ])
      expect(s).not.toMatch(absolutePath);
  });
});

// ---- ケース全体の検査 (設計書 §5.3 の 7, 8 と §8 受け入れ条件 4) ----
// ケース配列が誤って空になった場合にテスト全体が成功しないよう、スキップはしない
// (空のときはケース数・カテゴリ網羅・C10 境界の検査が失敗する)。

describe('ケース全体の検査', () => {
  test('id が重複しない', () => {
    const ids = goldenCases.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  test('ケース数が 20 以上 30 以下', () => {
    expect(goldenCases.length).toBeGreaterThanOrEqual(20);
    expect(goldenCases.length).toBeLessThanOrEqual(30);
  });
  test('カテゴリ C1〜C11 がすべて1件以上ある', () => {
    const present = new Set(goldenCases.map(c => c.category));
    for (let i = 1; i <= 11; i++) expect(present).toContain(`C${i}`);
  });
  test('C10 に 30符4飜 と 60符3飜 があり、基本点 1920・区分 通常 である', () => {
    const c10 = goldenCases.filter(c => c.category === 'C10');
    for (const [fu, han] of [
      [30, 4],
      [60, 3]
    ] as const) {
      const hit = c10.filter(
        c => c.expected.fu === fu && c.expected.han === han
      );
      expect(hit.length).toBeGreaterThanOrEqual(1);
      for (const c of hit) {
        expect(c.expected.basePoint).toBe(1920);
        expect(c.expected.tier).toBe('通常');
      }
    }
  });
});
