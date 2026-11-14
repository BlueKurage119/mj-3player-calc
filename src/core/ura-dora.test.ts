import { describe, expect, it } from 'vitest';
import type { HandOptions } from './input';
import { generateResult, type ScoredHora } from './result';
import { DEFAULT_RULE, type Rule } from './rule';
import type { Table } from './table';
import type { Tile } from './tile';

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

const ruleWithOpenRiichi: Rule = {
  ...DEFAULT_RULE,
  openRiichi: true
};

const southTable: Table = {
  round: 'east',
  seat: 'south',
  continue: 0,
  deposit: 0
};

const makeOptions = (riichi: HandOptions['riichi']): HandOptions => ({
  riichi,
  ippatsu: false,
  rinshan: false,
  chankan: false,
  haitei: false,
  tenho: false,
  tsubameGaeshi: false,
  kanFuri: false
});

const getHoraBy = (
  result: ReturnType<typeof generateResult>,
  by: 'ron' | 'tsumo'
): ScoredHora => {
  if (result?.type !== 'hora-shanten' || result.info.type !== 'hora') {
    throw new Error(`和了結果ではありません: ${JSON.stringify(result)}`);
  }
  const found = result.info.hora.find(h => h.by === by);
  if (!found) {
    throw new Error(`${by} の和了候補が見つかりません`);
  }
  return found;
};

// 平和形(赤5p含む14枚、和了牌 2s): 234p 067p 99p 34678s + 2s
// 表ドラ表示牌 1p -> 2p が1枚 (dora: 1)
// 裏ドラ表示牌 8p -> 9p が2枚 (ura-dora: 2)
// 赤5p が1枚 (red-dora: 1)
const pinfuHand = parseTiles('23406799p346782s');
const pinfuDora = parseTiles('1p');
const pinfuUraDora = parseTiles('8p');

// 七対子形(14枚、和了牌 1z): 1199m 2288p 3377s 1z + 1z
// 表ドラ表示牌 1p -> 2p が2枚 (dora: 2)
// 裏ドラ表示牌 7p -> 8p が2枚 (ura-dora: 2)
const chitoitsuHand = parseTiles('1199m2288p3377s11z');
const chitoitsuDora = parseTiles('1p');
const chitoitsuUraDora = parseTiles('7p');

const riichiVariants: {
  riichi: Exclude<HandOptions['riichi'], 'none'>;
  han: number;
  pinfuTotalHan: number;
  chitoitsuTotalHan: number;
}[] = [
  { riichi: 'riichi', han: 1, pinfuTotalHan: 6, chitoitsuTotalHan: 7 },
  { riichi: 'double-riichi', han: 2, pinfuTotalHan: 7, chitoitsuTotalHan: 8 },
  { riichi: 'open-riichi', han: 2, pinfuTotalHan: 7, chitoitsuTotalHan: 8 },
  {
    riichi: 'open-double-riichi',
    han: 3,
    pinfuTotalHan: 8,
    chitoitsuTotalHan: 9
  }
];

describe('Issue #96: 裏ドラの立直条件と ura-dora 役', () => {
  it('I96-1: 立直なし(riichi: none)では裏ドラ表示牌があっても ura-dora が出ない', () => {
    const result = generateResult(
      southTable,
      {
        hand: pinfuHand,
        melds: [],
        dora: pinfuDora,
        uradora: pinfuUraDora,
        nuki: 0
      },
      makeOptions('none'),
      ruleWithOpenRiichi
    );

    const ron = getHoraBy(result, 'ron');
    expect(ron.yaku).toEqual([
      { type: 'yaku', name: 'pinfu', han: 1 },
      { type: 'yaku', name: 'dora', han: 1 },
      { type: 'yaku', name: 'red-dora', han: 1 }
    ]);
    expect(ron.score.han).toBe(3);

    const tsumo = getHoraBy(result, 'tsumo');
    expect(tsumo.yaku).toEqual([
      { type: 'yaku', name: 'tsumo', han: 1 },
      { type: 'yaku', name: 'pinfu', han: 1 },
      { type: 'yaku', name: 'dora', han: 1 },
      { type: 'yaku', name: 'red-dora', han: 1 }
    ]);
    expect(tsumo.score.han).toBe(4);
  });

  it.each(riichiVariants)(
    'I96-2: $riichi のときは ura-dora が dora の直後かつ red-dora の直前に積まれる',
    ({ riichi, han, pinfuTotalHan }) => {
      const result = generateResult(
        southTable,
        {
          hand: pinfuHand,
          melds: [],
          dora: pinfuDora,
          uradora: pinfuUraDora,
          nuki: 0
        },
        makeOptions(riichi),
        ruleWithOpenRiichi
      );

      const ron = getHoraBy(result, 'ron');
      expect(ron.yaku).toEqual([
        { type: 'yaku', name: riichi, han },
        { type: 'yaku', name: 'pinfu', han: 1 },
        { type: 'yaku', name: 'dora', han: 1 },
        { type: 'yaku', name: 'ura-dora', han: 2 },
        { type: 'yaku', name: 'red-dora', han: 1 }
      ]);
      expect(ron.score.han).toBe(pinfuTotalHan);
    }
  );

  it('I96-3a: 七対子(generateChitoitsuHora)でも立直なしでは ura-dora が出ない', () => {
    const result = generateResult(
      southTable,
      {
        hand: chitoitsuHand,
        melds: [],
        dora: chitoitsuDora,
        uradora: chitoitsuUraDora,
        nuki: 0
      },
      makeOptions('none'),
      ruleWithOpenRiichi
    );

    const ron = getHoraBy(result, 'ron');
    expect(ron.type).toBe('chitoitsu');
    expect(ron.yaku).toEqual([
      { type: 'yaku', name: 'chitoitsu', han: 2 },
      { type: 'yaku', name: 'dora', han: 2 }
    ]);
    expect(ron.score.han).toBe(4);
  });

  it.each(riichiVariants)(
    'I96-3b: 七対子(generateChitoitsuHora)で $riichi のときは ura-dora が dora の直後に積まれる',
    ({ riichi, han, chitoitsuTotalHan }) => {
      const result = generateResult(
        southTable,
        {
          hand: chitoitsuHand,
          melds: [],
          dora: chitoitsuDora,
          uradora: chitoitsuUraDora,
          nuki: 0
        },
        makeOptions(riichi),
        ruleWithOpenRiichi
      );

      const ron = getHoraBy(result, 'ron');
      expect(ron.type).toBe('chitoitsu');
      expect(ron.yaku).toEqual([
        { type: 'yaku', name: riichi, han },
        { type: 'yaku', name: 'chitoitsu', han: 2 },
        { type: 'yaku', name: 'dora', han: 2 },
        { type: 'yaku', name: 'ura-dora', han: 2 }
      ]);
      expect(ron.score.han).toBe(chitoitsuTotalHan);
    }
  );

  it('I96-4: uradora を省略した Input は uradora: [] と同じ結果になる', () => {
    const omitted = generateResult(
      southTable,
      {
        hand: pinfuHand,
        melds: [],
        dora: pinfuDora,
        nuki: 0
      },
      makeOptions('riichi'),
      ruleWithOpenRiichi
    );
    const empty = generateResult(
      southTable,
      {
        hand: pinfuHand,
        melds: [],
        dora: pinfuDora,
        uradora: [],
        nuki: 0
      },
      makeOptions('riichi'),
      ruleWithOpenRiichi
    );

    const ronOmitted = getHoraBy(omitted, 'ron');
    const ronEmpty = getHoraBy(empty, 'ron');
    expect(ronOmitted.yaku).toEqual([
      { type: 'yaku', name: 'riichi', han: 1 },
      { type: 'yaku', name: 'pinfu', han: 1 },
      { type: 'yaku', name: 'dora', han: 1 },
      { type: 'yaku', name: 'red-dora', han: 1 }
    ]);
    expect(ronOmitted).toEqual(ronEmpty);
  });

  it('I96-5: 抜き北×西×裏ドラは立直時のみ ura-dora 2飜・nuki-dora 2飜となり、立直なしでは ura-dora が出ない', () => {
    // 234p 567p 99p 34678s + 2s (北なし・赤5なし)
    // 表ドラ表示牌 5z(白) -> ドラは 6z(發) で手牌に 0枚 (dora なし)
    // 裏ドラ表示牌 3z(西) -> ドラは 4z(北) で抜き北 2枚により ura-dora 2飜、nuki-dora 2飜
    const handNoRed = parseTiles('23456799p346782s');
    const input = {
      hand: handNoRed,
      melds: [],
      dora: parseTiles('5z'),
      uradora: parseTiles('3z'),
      nuki: 2
    };

    const withRiichi = generateResult(
      southTable,
      input,
      makeOptions('riichi'),
      ruleWithOpenRiichi
    );
    const ronRiichi = getHoraBy(withRiichi, 'ron');
    expect(ronRiichi.yaku).toEqual([
      { type: 'yaku', name: 'riichi', han: 1 },
      { type: 'yaku', name: 'pinfu', han: 1 },
      { type: 'yaku', name: 'ura-dora', han: 2 },
      { type: 'yaku', name: 'nuki-dora', han: 2 }
    ]);
    expect(ronRiichi.score.han).toBe(6);

    const withoutRiichi = generateResult(
      southTable,
      input,
      makeOptions('none'),
      ruleWithOpenRiichi
    );
    const ronNoRiichi = getHoraBy(withoutRiichi, 'ron');
    expect(ronNoRiichi.yaku).toEqual([
      { type: 'yaku', name: 'pinfu', han: 1 },
      { type: 'yaku', name: 'nuki-dora', han: 2 }
    ]);
    expect(ronNoRiichi.score.han).toBe(3);
  });
});
