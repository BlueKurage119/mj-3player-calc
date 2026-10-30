import { describe, expect, test } from 'vitest';
import { sumOfFu } from './fu';
import type { Hora } from './hora';
import type { HandOptions } from './input';
import { generateResult } from './result';
import type { Rule } from './rule';
import { calculateBasePoint, ceil10 } from './score';
import type { Table } from './table';
import type { Tile } from './tile';
import { sumBy } from './util';

// ---- 補助関数 (local-yaku.test.ts から複製) ----

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

const defaultRule: Rule = {
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
  tsumoLoss: 'loss',
  localYaku: true,
  openRiichi: true
};

const defaultTable: Table = {
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

const getHoraBy = (
  res: ReturnType<typeof generateResult>,
  tile: Tile,
  by: 'ron' | 'tsumo'
): Hora => {
  expect(res).not.toBeNull();
  expect(res?.type).toBe('hora-shanten');
  if (res?.type !== 'hora-shanten') throw new Error('not hora-shanten');
  expect(res.info.type).toBe('hora');
  if (res.info.type !== 'hora') throw new Error('not hora');
  const matched = res.info.hora.find(
    h => h.horaTile.type === tile.type && h.horaTile.n === tile.n && h.by === by
  );
  expect(matched).toBeDefined();
  if (!matched) throw new Error(`no hora for ${tile.type}${tile.n} by=${by}`);
  return matched;
};

const computeBasePoint = (hora: Hora, rule: Rule): number => {
  const yakumanPoint = sumBy(hora.yaku, y =>
    y.type === 'yakuman' ? y.point : 0
  );
  if (yakumanPoint > 0) {
    return 8000 * yakumanPoint;
  }
  const han = sumBy(hora.yaku, y => (y.type === 'yaku' ? y.han : 0));
  const fuVal =
    hora.type === 'mentsu'
      ? ceil10(sumOfFu(hora.fu))
      : hora.type === 'chitoitsu'
        ? 25
        : 0;
  return calculateBasePoint(fuVal, han, rule.roundedMangan, false);
};

describe('A8: ダブル立直系と槍槓の複合', () => {
  const hand = parseTiles('234p567p345s67s99s');
  const horaTile = parseSingleTile('8s');
  const run = (overrides: Partial<HandOptions>) =>
    generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      { ...defaultOptions, chankan: true, ...overrides },
      defaultRule
    );

  test('A8-C01: ダブル立直+一発なしで槍槓が複合する (ロン)', () => {
    // 出典: 役の成否は mahjong-rules.md §4.1.1(確定事項1)、符・基本点は手計算(30符4飜: 30×2^6=1920、mahjong-rules.md §6)
    const ronHora = getHoraBy(
      run({ riichi: 'double-riichi' }),
      horaTile,
      'ron'
    );
    expect(ronHora.yaku).toEqual([
      { type: 'yaku', name: 'double-riichi', han: 2 },
      { type: 'yaku', name: 'pinfu', han: 1 },
      { type: 'yaku', name: 'chankan', han: 1 }
    ]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(1920);
  });

  test('A8-C02: オープンダブル立直+一発なしで槍槓が複合する (ロン)', () => {
    // 出典: 役の成否は mahjong-rules.md §4.1.1(確定事項1)、オープンダブル立直3飜は §4.2、符・基本点は手計算(5飜で満貫2000、§6)
    const ronHora = getHoraBy(
      run({ riichi: 'open-double-riichi' }),
      horaTile,
      'ron'
    );
    expect(ronHora.yaku).toEqual([
      { type: 'yaku', name: 'open-double-riichi', han: 3 },
      { type: 'yaku', name: 'pinfu', han: 1 },
      { type: 'yaku', name: 'chankan', han: 1 }
    ]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(2000);
  });

  test('A8-C03: ダブル立直+一発なしの槍槓ロンではツモのHoraが生成されない', () => {
    // 出典: 役の成否は mahjong-rules.md §4.1.1(確定事項1)、ロンに槍槓が付くとツモを生成しない既存仕様(hora.ts の chankan 分岐)
    const res = run({ riichi: 'double-riichi' });
    expect(res?.type).toBe('hora-shanten');
    if (res?.type !== 'hora-shanten' || res.info.type !== 'hora')
      throw new Error('not hora');
    expect(res.info.hora.some(h => h.by === 'tsumo')).toBe(false);
    expect(res.info.hora.some(h => h.by === 'ron')).toBe(true);
  });

  test('A8-C04: ダブル立直+一発ありでは槍槓が付かない (ロン)', () => {
    // 出典: 役の成否は mahjong-rules.md §4.1.1(確定事項2、A7-C01 のダブル立直版)、符・基本点は手計算(30符4飜: 1920、§6)
    const ronHora = getHoraBy(
      run({ riichi: 'double-riichi', ippatsu: true }),
      horaTile,
      'ron'
    );
    expect(ronHora.yaku).toEqual([
      { type: 'yaku', name: 'double-riichi', han: 2 },
      { type: 'yaku', name: 'ippatsu', han: 1 },
      { type: 'yaku', name: 'pinfu', han: 1 }
    ]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(1920);
  });

  test('A8-C05: 通常の立直では槍槓が複合する (回帰確認)', () => {
    // 出典: 槍槓の通常動作(従来仕様の維持)、符・基本点は手計算(30符3飜: 30×2^5=960、mahjong-rules.md §6)
    const ronHora = getHoraBy(run({ riichi: 'riichi' }), horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yaku', name: 'riichi', han: 1 },
      { type: 'yaku', name: 'pinfu', han: 1 },
      { type: 'yaku', name: 'chankan', han: 1 }
    ]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(960);
  });
});
