import { describe, expect, test } from 'vitest';
import { sumOfFu } from './fu';
import type { HandOptions, Meld } from './input';
import type { Hora } from './hora';
import { judgeMentsuLocalYaku } from './local-yaku';
import { generateResult } from './result';
import { type Rule, compareRules } from './rule';
import { calculateBasePoint, ceil10 } from './score';
import type { Table } from './table';
import { type Tile, tileToCountsIndex, tilesToCounts } from './tile';
import { sumBy } from './util';

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

const defaultRule: Rule = {
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

const localYakuNames = new Set([
  'tsubame-gaeshi',
  'kan-furi',
  'toiputao',
  'shiiaru-raotai',
  'uumensai',
  'sanrenko',
  'isshoku-sanjun',
  'renho',
  'surenko',
  'isshoku-yonjun',
  'beni-kujaku',
  'koitten',
  'kokuiso',
  'daisharin',
  'daichikurin',
  'ishino-ue',
  'shisanputa',
  'kinmonkyo',
  'tohoku-shinkansen',
  'junsei-ryuiso',
  'daichisei'
]);

describe('A6: ローカル役とオープンリーチ', () => {
  // ---- A6-L01〜L30: ローカル役の判定 ----

  test('A6-L01: 燕返しの判定 (ロンのみ1飜、ツモは門前清自摸和)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('234p567p345s678s9s');
    const horaTile = parseSingleTile('9s');
    const options: HandOptions = {
      ...defaultOptions,
      tsubameGaeshi: true
    };
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      options,
      defaultRule
    );

    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yaku', name: 'tsubame-gaeshi', han: 1 }
    ]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(320); // 単騎待ち 40符1飜 = 40 * 2^3 = 320

    const tsumoHora = getHoraBy(res, horaTile, 'tsumo');
    expect(tsumoHora.yaku).toEqual([{ type: 'yaku', name: 'tsumo', han: 1 }]);
    expect(computeBasePoint(tsumoHora, defaultRule)).toBe(240);
  });

  test('A6-L02: 槓振りの判定 (ロンのみ1飜、ツモに槓振りなし)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('234p567p345s678s9s');
    const horaTile = parseSingleTile('9s');
    const options: HandOptions = {
      ...defaultOptions,
      kanFuri: true
    };
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      options,
      defaultRule
    );

    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([{ type: 'yaku', name: 'kan-furi', han: 1 }]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(320);

    const tsumoHora = getHoraBy(res, horaTile, 'tsumo');
    expect(tsumoHora.yaku).toEqual([{ type: 'yaku', name: 'tsumo', han: 1 }]);
  });

  test('A6-L03: 人和の判定 (子のロンで役満1、ツモは地和、親ロンはなし)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('234p567p345s678s9s');
    const horaTile = parseSingleTile('9s');
    const options: HandOptions = {
      ...defaultOptions,
      tenho: true
    };

    // 子(自風南)
    const childRes = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      options,
      defaultRule
    );
    const childRon = getHoraBy(childRes, horaTile, 'ron');
    expect(childRon.yaku).toEqual([
      { type: 'yakuman', name: 'renho', point: 1 }
    ]);
    expect(computeBasePoint(childRon, defaultRule)).toBe(8000);

    const childTsumo = getHoraBy(childRes, horaTile, 'tsumo');
    expect(childTsumo.yaku).toEqual([
      { type: 'yakuman', name: 'chiho', point: 1 }
    ]);
    expect(computeBasePoint(childTsumo, defaultRule)).toBe(8000);

    // 親(自風東)
    const parentTable: Table = { ...defaultTable, seat: 'east' };
    const parentRes = generateResult(
      parentTable,
      { hand, melds: [], dora: [], nuki: 0 },
      options,
      defaultRule
    );
    if (parentRes?.type === 'hora-shanten' && parentRes.info.type === 'hora') {
      const ronMatch = parentRes.info.hora.find(h => h.by === 'ron');
      expect(ronMatch).toBeUndefined();
    }
    const parentTsumo = getHoraBy(parentRes, horaTile, 'tsumo');
    expect(parentTsumo.yaku).toEqual([
      { type: 'yakuman', name: 'tenho', point: 1 }
    ]);
    expect(computeBasePoint(parentTsumo, defaultRule)).toBe(8000);
  });

  test('A6-L04: 推不倒の判定 (123p345p456s白白白9p+9p で推不倒1+白1=2飜)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('123p345p456s555z9p');
    const horaTile = parseSingleTile('9p');
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yaku', name: 'white', han: 1 },
      { type: 'yaku', name: 'toiputao', han: 1 }
    ]);
    // 符: 20(副底)+10(門前ロン)+8(白暗刻)+2(9p単騎)=40符。2飜40符 = 40 * 2^4 = 640
    expect(computeBasePoint(ronHora, defaultRule)).toBe(640);
  });

  test('A6-L05: 十二落抬の判定 (裸単騎で十二落抬1+対々和2+白1=4飜、暗槓なら不成立)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('5p');
    const horaTile = parseSingleTile('5p');
    const melds: Meld[] = [
      { type: 'pon', tile: parseSingleTile('1m') },
      { type: 'pon', tile: parseSingleTile('9m') },
      { type: 'pon', tile: parseSingleTile('3z') }, // 西
      { type: 'pon', tile: parseSingleTile('5z') } // 白
    ];
    const res = generateResult(
      defaultTable,
      { hand, melds, dora: [], nuki: 0 },
      defaultOptions,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yaku', name: 'white', han: 1 },
      { type: 'yaku', name: 'toitoi', han: 2 },
      { type: 'yaku', name: 'shiiaru-raotai', han: 1 }
    ]);
    // 40符4飜 = 2560 -> 満貫2000
    expect(computeBasePoint(ronHora, defaultRule)).toBe(2000);

    const tsumoHora = getHoraBy(res, horaTile, 'tsumo');
    expect(tsumoHora.yaku).toEqual([
      { type: 'yaku', name: 'white', han: 1 },
      { type: 'yaku', name: 'toitoi', han: 2 },
      { type: 'yaku', name: 'shiiaru-raotai', han: 1 }
    ]);
    expect(computeBasePoint(tsumoHora, defaultRule)).toBe(2000);

    // 西を暗槓に替えると十二落抬は不成立
    const meldsWithClosedKan: Meld[] = [
      { type: 'pon', tile: parseSingleTile('1m') },
      { type: 'pon', tile: parseSingleTile('9m') },
      { type: 'kan', tile: parseSingleTile('3z'), closed: true },
      { type: 'pon', tile: parseSingleTile('5z') }
    ];
    const resClosed = generateResult(
      defaultTable,
      { hand, melds: meldsWithClosedKan, dora: [], nuki: 0 },
      defaultOptions,
      defaultRule
    );
    const ronClosed = getHoraBy(resClosed, horaTile, 'ron');
    expect(ronClosed.yaku.some(y => y.name === 'shiiaru-raotai')).toBe(false);
  });

  test('A6-L06: 五門斉の判定 (111m234p456s西西西白+白 で五門斉2飜)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('111m234p456s333z5z');
    const horaTile = parseSingleTile('5z');
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([{ type: 'yaku', name: 'uumensai', han: 2 }]);
  });

  test('A6-L07: 五門斉の七対子での判定 (七対子2+五門斉2=4飜)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('11m22p33s11z55z55p6s');
    const horaTile = parseSingleTile('6s');
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yaku', name: 'chitoitsu', han: 2 },
      { type: 'yaku', name: 'uumensai', han: 2 }
    ]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(1600); // 25符4飜 = 25 * 2^6 = 1600
  });

  test('A6-L08: 三連刻の判定 (789p刻子で三連刻2飜)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('888p999p345s1m');
    const horaTile = parseSingleTile('1m');
    const melds: Meld[] = [{ type: 'pon', tile: parseSingleTile('7p') }];
    const res = generateResult(
      defaultTable,
      { hand, melds, dora: [], nuki: 0 },
      defaultOptions,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([{ type: 'yaku', name: 'sanrenko', han: 2 }]);
  });

  test('A6-L09: 一色三順と三連刻の読み分け (門前ロンで一色三順+平和4飜30符1920)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('222p333p44p567s99s');
    const horaTile = parseSingleTile('4p');
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yaku', name: 'pinfu', han: 1 },
      { type: 'yaku', name: 'isshoku-sanjun', han: 3 }
    ]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(1920); // 30符4飜 = 30 * 2^6 = 1920
  });

  test('A6-L10: 一色三順と三連刻の同点ツモ (門前ツモで5飜満貫2000)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('222p333p44p567s99s');
    const horaTile = parseSingleTile('4p');
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      defaultRule
    );
    const tsumoHora = getHoraBy(res, horaTile, 'tsumo');
    const totalHan = sumBy(tsumoHora.yaku, y =>
      y.type === 'yaku' ? y.han : 0
    );
    expect(totalHan).toBe(5);
    expect(computeBasePoint(tsumoHora, defaultRule)).toBe(2000);
  });

  test('A6-L11: 三暗刻+三連刻の読み分け (単騎待ちロンで4飜50符満貫2000)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('111p222p333p567s9s');
    const horaTile = parseSingleTile('9s');
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yaku', name: 'sananko', han: 2 },
      { type: 'yaku', name: 'sanrenko', han: 2 }
    ]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(2000);
  });

  test('A6-L12: 副露手では三連刻+対々和が一色三順に勝つ (7飜跳満3000)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('111s222s33s33z');
    const horaTile = parseSingleTile('3s');
    const melds: Meld[] = [{ type: 'pon', tile: parseSingleTile('7z') }]; // 中ポン
    const res = generateResult(
      defaultTable,
      { hand, melds, dora: [], nuki: 0 },
      defaultOptions,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    const totalHan = sumBy(ronHora.yaku, y => (y.type === 'yaku' ? y.han : 0));
    // 三連刻2+対々和2+混一色2+中1 = 7飜(一色三順の読みは 一色三順2+混一色2+中1 = 5飜)
    expect(totalHan).toBe(7);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(3000);
  });

  test('A6-L13: 四連刻の判定 (2345s刻子で役満1)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('3z');
    const horaTile = parseSingleTile('3z');
    const melds: Meld[] = [
      { type: 'pon', tile: parseSingleTile('2s') },
      { type: 'pon', tile: parseSingleTile('3s') },
      { type: 'pon', tile: parseSingleTile('4s') },
      { type: 'kan', tile: parseSingleTile('5s'), closed: false }
    ];
    const res = generateResult(
      defaultTable,
      { hand, melds, dora: [], nuki: 0 },
      defaultOptions,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yakuman', name: 'surenko', point: 1 }
    ]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(8000);
  });

  test('A6-L14: 一色四順の判定 (234pが4組で役満1)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('2222p3333p444p99s');
    const horaTile = parseSingleTile('4p');
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yakuman', name: 'isshoku-yonjun', point: 1 }
    ]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(8000);
  });

  test('A6-L15: 紅孔雀の判定 (1579sと中で役満1)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('777s999s7z');
    const horaTile = parseSingleTile('7z');
    const melds: Meld[] = [
      { type: 'pon', tile: parseSingleTile('1s') },
      { type: 'pon', tile: parseSingleTile('5s') }
    ];
    const res = generateResult(
      defaultTable,
      { hand, melds, dora: [], nuki: 0 },
      defaultOptions,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yakuman', name: 'beni-kujaku', point: 1 }
    ]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(8000);
  });

  test('A6-L16: 紅一点の判定 (23468sと中で役満1)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('234s234s666s777z8s');
    const horaTile = parseSingleTile('8s');
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yakuman', name: 'koitten', point: 1 }
    ]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(8000);
  });

  test('A6-L17: 純正緑一色の判定 (發なし緑一色で役満2、localYaku=falseなら通常緑一色役満1)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('234s234s666s888s4s');
    const horaTile = parseSingleTile('4s');
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yakuman', name: 'junsei-ryuiso', point: 2 }
    ]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(16000);

    // localYaku = false のときは通常の緑一色 (役満1)
    const ruleOff: Rule = { ...defaultRule, localYaku: false };
    const resOff = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      ruleOff
    );
    const ronOff = getHoraBy(resOff, horaTile, 'ron');
    expect(ronOff.yaku).toEqual([
      { type: 'yakuman', name: 'ryuiso', point: 1 }
    ]);
    expect(computeBasePoint(ronOff, ruleOff)).toBe(8000);
  });

  test('A6-L18: 黒一色の判定 (248pと東南西北の七対子で役満1)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('22p44p88p11z22z33z4z');
    const horaTile = parseSingleTile('4z');
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yakuman', name: 'kokuiso', point: 1 }
    ]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(8000);
  });

  test('A6-L19: 大車輪の判定 (2〜8p各2枚で大車輪役満1を含む)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('2233445566778p');
    const horaTile = parseSingleTile('8p');
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    // 設計書 §5: 役満合計1で大車輪を含む
    const totalPoint = sumBy(ronHora.yaku, y =>
      y.type === 'yakuman' ? y.point : 0
    );
    expect(totalPoint).toBe(1);
    // 大車輪が含まれることを確認 (面子手または七対子として解釈され大車輪が付く)
    expect(ronHora.yaku.some(y => y.name === 'daisharin')).toBe(true);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(8000);
  });

  test('A6-L20: 大竹林の判定 (2〜8s各2枚で大竹林役満1を含む)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('2233445566778s');
    const horaTile = parseSingleTile('8s');
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    const totalPoint = sumBy(ronHora.yaku, y =>
      y.type === 'yakuman' ? y.point : 0
    );
    expect(totalPoint).toBe(1);
    // 大竹林が含まれることを確認
    expect(ronHora.yaku.some(y => y.name === 'daichikurin')).toBe(true);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(8000);
  });

  test('A6-L21: 石の上にも三年の判定 (ダブル立直+海底で役満1、通常立直では不成立)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('234p567p345s678s9s');
    const horaTile = parseSingleTile('9s');
    const options: HandOptions = {
      ...defaultOptions,
      riichi: 'double-riichi',
      haitei: true
    };
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      options,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yakuman', name: 'ishino-ue', point: 1 }
    ]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(8000);

    const tsumoHora = getHoraBy(res, horaTile, 'tsumo');
    expect(tsumoHora.yaku).toEqual([
      { type: 'yakuman', name: 'ishino-ue', point: 1 }
    ]);
    expect(computeBasePoint(tsumoHora, defaultRule)).toBe(8000);

    // 通常立直では石の上にも三年は付かない
    const normalRiichiOptions: HandOptions = {
      ...defaultOptions,
      riichi: 'riichi',
      haitei: true
    };
    const resNormal = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      normalRiichiOptions,
      defaultRule
    );
    const ronNormal = getHoraBy(resNormal, horaTile, 'ron');
    expect(ronNormal.yaku.some(y => y.name === 'ishino-ue')).toBe(false);
  });

  test('A6-L22: 石の上にも三年のオープンダブル立直での判定 (役満1)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('234p567p345s678s9s');
    const horaTile = parseSingleTile('9s');
    const options: HandOptions = {
      ...defaultOptions,
      riichi: 'open-double-riichi',
      haitei: true
    };
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      options,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yakuman', name: 'ishino-ue', point: 1 }
    ]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(8000);

    const tsumoHora = getHoraBy(res, horaTile, 'tsumo');
    expect(tsumoHora.yaku).toEqual([
      { type: 'yakuman', name: 'ishino-ue', point: 1 }
    ]);
    expect(computeBasePoint(tsumoHora, defaultRule)).toBe(8000);
  });

  test('A6-L23: 十三不搭の判定 (13種各1枚+白で十三不搭役満1、全13種・14件が和了牌)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('19m147p258s12345z');
    const options: HandOptions = {
      ...defaultOptions,
      tenho: true
    };
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      options,
      defaultRule
    );
    expect(res).not.toBeNull();
    expect(res?.type).toBe('hora-shanten');
    if (res?.type !== 'hora-shanten' || res.info.type !== 'hora')
      throw new Error();

    // 手牌の13種それぞれでツモ和了がある。5s は赤・赤なしの2通り (全14件)
    expect(res.info.hora.length).toBe(14);
    expect(res.info.hora.every(h => h.by === 'tsumo')).toBe(true);
    for (const h of res.info.hora) {
      expect(h.yaku).toEqual([
        { type: 'yakuman', name: 'shisanputa', point: 1 }
      ]);
      expect(computeBasePoint(h, defaultRule)).toBe(8000);
    }

    // 14枚入力 (+白) でも同じ和了が返る
    const hand14 = parseTiles('19m147p258s123455z');
    const res14 = generateResult(
      defaultTable,
      { hand: hand14, melds: [], dora: [], nuki: 0 },
      options,
      defaultRule
    );
    expect(res14).not.toBeNull();
    expect(res14?.type).toBe('hora-shanten');
    if (res14?.type !== 'hora-shanten' || res14.info.type !== 'hora')
      throw new Error();
    expect(res14.info.hora.length).toBe(1);
    expect(res14.info.hora[0]?.yaku).toEqual([
      { type: 'yakuman', name: 'shisanputa', point: 1 }
    ]);
  });

  test('A6-L23-赤: 赤5で完成する十三不搭も和了になる (PR #24 のレビュー指摘)', () => {
    // 出典: 役の成否は mahjong-rules.md §4.2.1(十三不搭)。赤5は通常の5と同じ牌種として扱う
    const options: HandOptions = { ...defaultOptions, tenho: true };
    const hand14 = parseTiles('19m147p28s123455z0s');
    const res14 = generateResult(
      defaultTable,
      { hand: hand14, melds: [], dora: [], nuki: 0 },
      options,
      defaultRule
    );
    if (res14?.type !== 'hora-shanten' || res14.info.type !== 'hora')
      throw new Error();
    expect(res14.info.hora.length).toBe(1);
    expect(res14.info.hora[0]?.horaTile).toEqual({
      type: 's',
      n: 5,
      red: true
    });
    expect(res14.info.hora[0]?.yaku).toEqual([
      { type: 'yakuman', name: 'shisanputa', point: 1 }
    ]);
  });

  test('A6-L24: 十三不搭形での天和off時の判定 (和了ではなく向聴数)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('19m147p258s12345z');
    const options: HandOptions = {
      ...defaultOptions,
      tenho: false
    };
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      options,
      defaultRule
    );
    expect(res).not.toBeNull();
    expect(res?.type).toBe('hora-shanten');
    if (res?.type !== 'hora-shanten') throw new Error();
    expect(res.info.type).toBe('shanten');
  });

  test('A6-L25: 国士無双形の優先 (十三不搭は付かず国士+天和)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('19m19p19s1234567z');
    const horaTile = parseSingleTile('7z');
    const parentTable: Table = { ...defaultTable, seat: 'east' };
    const options: HandOptions = {
      ...defaultOptions,
      tenho: true
    };
    const res = generateResult(
      parentTable,
      { hand, melds: [], dora: [], nuki: 0 },
      options,
      defaultRule
    );
    const tsumoHora = getHoraBy(res, horaTile, 'tsumo');
    expect(tsumoHora.yaku).toEqual([
      { type: 'yakuman', name: 'kokushi-13', point: 2 },
      { type: 'yakuman', name: 'tenho', point: 1 }
    ]);
    expect(tsumoHora.yaku.some(y => y.name === 'shisanputa')).toBe(false);
  });

  test('A6-L26: 金門橋の判定 (123・345・567・789p+99sで役満1)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('123p345p567p78p99s');
    const horaTile = parseSingleTile('9p');
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yakuman', name: 'kinmonkyo', point: 1 }
    ]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(8000);

    const tsumoHora = getHoraBy(res, horaTile, 'tsumo');
    expect(tsumoHora.yaku).toEqual([
      { type: 'yakuman', name: 'kinmonkyo', point: 1 }
    ]);
    expect(computeBasePoint(tsumoHora, defaultRule)).toBe(8000);
  });

  test('A6-L27: 東北新幹線の判定 (東刻子・北雀頭で役満1)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('123s456s789s111z4z');
    const horaTile = parseSingleTile('4z');
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yakuman', name: 'tohoku-shinkansen', point: 1 }
    ]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(8000);
  });

  test('A6-L28: 東北新幹線の判定 (北刻子・東雀頭で役満1)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('123s456s789s444z1z');
    const horaTile = parseSingleTile('1z');
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yakuman', name: 'tohoku-shinkansen', point: 1 }
    ]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(8000);
  });

  test('A6-L29: 大七星の判定 (字牌7種の七対子で役満2、字一色なし)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('1122334455667z');
    const horaTile = parseSingleTile('7z');
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yakuman', name: 'daichisei', point: 2 }
    ]);
    expect(ronHora.yaku.some(y => y.name === 'tsuiso')).toBe(false);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(16000);
  });

  test('A6-L30: judgeMentsuLocalYaku 直接呼び出し (一色三順の喰い下がり2飜・門前3飜の検査)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    // 11122233s西西 + 3s、中ポンの一色三順の読み (123s x 3, 西西雀頭, 中ポン)
    const s1 = tileToCountsIndex(parseSingleTile('1s'));
    const z3 = tileToCountsIndex(parseSingleTile('3z')); // 西
    const z7 = tileToCountsIndex(parseSingleTile('7z')); // 中
    const meldChun: Meld = { type: 'pon', tile: parseSingleTile('7z') };

    const ctxMeld = {
      allMentsu: [
        { type: 'shuntsu' as const, tile: s1 },
        { type: 'shuntsu' as const, tile: s1 },
        { type: 'shuntsu' as const, tile: s1 },
        { type: 'kotsu' as const, tile: z7 }
      ],
      head: z3,
      allTiles: parseTiles('111222333s33777z'),
      allTilesCounts: tilesToCounts(parseTiles('111222333s33777z')),
      horaTile: parseSingleTile('3s'),
      melds: [meldChun],
      menzen: false,
      table: defaultTable,
      options: defaultOptions,
      rule: defaultRule
    };

    const meldRes = judgeMentsuLocalYaku(ctxMeld);
    expect(meldRes.removeIipeko).toBe(true);
    expect(meldRes.yaku).toEqual([
      {
        yaku: { type: 'yaku', name: 'isshoku-sanjun', han: 2 },
        ron: true,
        tsumo: true
      }
    ]);

    // 門前 (副露なし)
    const ctxMenzen = {
      ...ctxMeld,
      allMentsu: [
        { type: 'shuntsu' as const, tile: s1 },
        { type: 'shuntsu' as const, tile: s1 },
        { type: 'shuntsu' as const, tile: s1 },
        { type: 'kotsu' as const, tile: z7 }
      ],
      melds: [],
      menzen: true
    };
    const menzenRes = judgeMentsuLocalYaku(ctxMenzen);
    expect(menzenRes.yaku).toEqual([
      {
        yaku: { type: 'yaku', name: 'isshoku-sanjun', han: 3 },
        ron: true,
        tsumo: true
      }
    ]);
  });

  // ---- A6-T01〜T05: 天和の待ちの扱いの修正 ----

  test('A6-T01: 親天和での国士無双 (待ちによらず常にkokushi-13、pointは設定依存)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('19m19p19s1234556z');
    const horaTile = parseSingleTile('7z');
    const parentTable: Table = { ...defaultTable, seat: 'east' };
    const options: HandOptions = { ...defaultOptions, tenho: true };

    // kokushi13DoubleYakuman = true
    const ruleDouble = { ...defaultRule, kokushi13DoubleYakuman: true };
    const resDouble = generateResult(
      parentTable,
      { hand, melds: [], dora: [], nuki: 0 },
      options,
      ruleDouble
    );
    const horaDouble = getHoraBy(resDouble, horaTile, 'tsumo');
    expect(horaDouble.yaku).toEqual([
      { type: 'yakuman', name: 'kokushi-13', point: 2 },
      { type: 'yakuman', name: 'tenho', point: 1 }
    ]);

    // kokushi13DoubleYakuman = false
    const ruleSingle = { ...defaultRule, kokushi13DoubleYakuman: false };
    const resSingle = generateResult(
      parentTable,
      { hand, melds: [], dora: [], nuki: 0 },
      options,
      ruleSingle
    );
    const horaSingle = getHoraBy(resSingle, horaTile, 'tsumo');
    expect(horaSingle.yaku).toEqual([
      { type: 'yakuman', name: 'kokushi-13', point: 1 },
      { type: 'yakuman', name: 'tenho', point: 1 }
    ]);
  });

  test('A6-T02: 親天和での九蓮宝燈 (双碰待ちでも純正九蓮宝燈pure-churen、point設定依存)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('1112345567899p');
    const horaTile = parseSingleTile('9p');
    const parentTable: Table = { ...defaultTable, seat: 'east' };
    const options: HandOptions = { ...defaultOptions, tenho: true };

    const ruleDouble = { ...defaultRule, pureChurenDoubleYakuman: true };
    const resDouble = generateResult(
      parentTable,
      { hand, melds: [], dora: [], nuki: 0 },
      options,
      ruleDouble
    );
    const horaDouble = getHoraBy(resDouble, horaTile, 'tsumo');
    expect(horaDouble.yaku).toEqual([
      { type: 'yakuman', name: 'pure-churen', point: 2 },
      { type: 'yakuman', name: 'tenho', point: 1 }
    ]);

    const ruleSingle = { ...defaultRule, pureChurenDoubleYakuman: false };
    const resSingle = generateResult(
      parentTable,
      { hand, melds: [], dora: [], nuki: 0 },
      options,
      ruleSingle
    );
    const horaSingle = getHoraBy(resSingle, horaTile, 'tsumo');
    expect(horaSingle.yaku).toEqual([
      { type: 'yakuman', name: 'pure-churen', point: 1 },
      { type: 'yakuman', name: 'tenho', point: 1 }
    ]);
  });

  test('A6-T03: 親天和での四暗刻 (双碰待ちでも四暗刻単騎suanko-tanki、point設定依存)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('111p222p333s1133z');
    const horaTile = parseSingleTile('1z');
    const parentTable: Table = { ...defaultTable, seat: 'east' };
    const options: HandOptions = { ...defaultOptions, tenho: true };

    const ruleDouble = { ...defaultRule, suankoTankiDoubleYakuman: true };
    const resDouble = generateResult(
      parentTable,
      { hand, melds: [], dora: [], nuki: 0 },
      options,
      ruleDouble
    );
    const horaDouble = getHoraBy(resDouble, horaTile, 'tsumo');
    expect(horaDouble.yaku).toEqual([
      { type: 'yakuman', name: 'suanko-tanki', point: 2 },
      { type: 'yakuman', name: 'tenho', point: 1 }
    ]);

    const ruleSingle = { ...defaultRule, suankoTankiDoubleYakuman: false };
    const resSingle = generateResult(
      parentTable,
      { hand, melds: [], dora: [], nuki: 0 },
      options,
      ruleSingle
    );
    const horaSingle = getHoraBy(resSingle, horaTile, 'tsumo');
    expect(horaSingle.yaku).toEqual([
      { type: 'yakuman', name: 'suanko-tanki', point: 1 },
      { type: 'yakuman', name: 'tenho', point: 1 }
    ]);
  });

  test('A6-T04: 子地和での天和修正対象外の確認 (和了牌どおりの通常役満)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const options: HandOptions = { ...defaultOptions, tenho: true };

    // 国士単騎
    const resKokushi = generateResult(
      defaultTable,
      { hand: parseTiles('19m19p19s1234556z'), melds: [], dora: [], nuki: 0 },
      options,
      defaultRule
    );
    const horaKokushi = getHoraBy(resKokushi, parseSingleTile('7z'), 'tsumo');
    expect(horaKokushi.yaku).toEqual([
      { type: 'yakuman', name: 'kokushi', point: 1 },
      { type: 'yakuman', name: 'chiho', point: 1 }
    ]);

    // 九蓮双碰
    const resChuren = generateResult(
      defaultTable,
      { hand: parseTiles('1112345567899p'), melds: [], dora: [], nuki: 0 },
      options,
      defaultRule
    );
    const horaChuren = getHoraBy(resChuren, parseSingleTile('9p'), 'tsumo');
    expect(horaChuren.yaku).toEqual([
      { type: 'yakuman', name: 'churen', point: 1 },
      { type: 'yakuman', name: 'chiho', point: 1 }
    ]);

    // 四暗刻双碰
    const resSuanko = generateResult(
      defaultTable,
      { hand: parseTiles('111p222p333s1133z'), melds: [], dora: [], nuki: 0 },
      options,
      defaultRule
    );
    const horaSuanko = getHoraBy(resSuanko, parseSingleTile('1z'), 'tsumo');
    expect(horaSuanko.yaku).toEqual([
      { type: 'yakuman', name: 'suanko', point: 1 },
      { type: 'yakuman', name: 'chiho', point: 1 }
    ]);
  });

  test('A6-T05: 天和off時の確認 (従来どおりの通常役満、localYakuによらない)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const parentTable: Table = { ...defaultTable, seat: 'east' };

    for (const localYaku of [true, false]) {
      const rule = { ...defaultRule, localYaku };

      // 国士単騎
      const resK = generateResult(
        parentTable,
        {
          hand: parseTiles('19m19p19s1234556z'),
          melds: [],
          dora: [],
          nuki: 0
        },
        defaultOptions,
        rule
      );
      const hK = getHoraBy(resK, parseSingleTile('7z'), 'tsumo');
      expect(hK.yaku).toEqual([{ type: 'yakuman', name: 'kokushi', point: 1 }]);

      // 九蓮双碰
      const resC = generateResult(
        parentTable,
        { hand: parseTiles('1112345567899p'), melds: [], dora: [], nuki: 0 },
        defaultOptions,
        rule
      );
      const hC = getHoraBy(resC, parseSingleTile('9p'), 'tsumo');
      expect(hC.yaku).toEqual([{ type: 'yakuman', name: 'churen', point: 1 }]);

      // 四暗刻双碰
      const resS = generateResult(
        parentTable,
        { hand: parseTiles('111p222p333s1133z'), melds: [], dora: [], nuki: 0 },
        defaultOptions,
        rule
      );
      const hS = getHoraBy(resS, parseSingleTile('1z'), 'tsumo');
      expect(hS.yaku).toEqual([{ type: 'yakuman', name: 'suanko', point: 1 }]);
    }
  });

  // ---- A6-O01〜O03: オープン立直 ----

  test('A6-O01: オープン立直の判定 (2飜40符640)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('234p567p345s678s9s');
    const horaTile = parseSingleTile('9s');
    const options: HandOptions = {
      ...defaultOptions,
      riichi: 'open-riichi'
    };
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      options,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yaku', name: 'open-riichi', han: 2 }
    ]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(640);
  });

  test('A6-O02: オープンダブル立直の判定 (3飜40符1280)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('234p567p345s678s9s');
    const horaTile = parseSingleTile('9s');
    const options: HandOptions = {
      ...defaultOptions,
      riichi: 'open-double-riichi'
    };
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      options,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yaku', name: 'open-double-riichi', han: 3 }
    ]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(1280);
  });

  test('A6-O03: openRiichi有効・localYaku無効でのオープン立直 (ローカル役設定と独立)', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('234p567p345s678s9s');
    const horaTile = parseSingleTile('9s');
    const options: HandOptions = {
      ...defaultOptions,
      riichi: 'open-riichi'
    };
    const rule: Rule = {
      ...defaultRule,
      localYaku: false,
      openRiichi: true
    };
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      options,
      rule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yaku', name: 'open-riichi', han: 2 }
    ]);
    expect(computeBasePoint(ronHora, rule)).toBe(640);
  });

  // ---- A6-R01〜R04: ルール・例外・無効時の検証 ----

  test('A6-R01: openRiichi=false でオープン立直を指定すると例外を投げる', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const hand = parseTiles('234p567p345s678s9s');
    const rule: Rule = { ...defaultRule, openRiichi: false };

    expect(() =>
      generateResult(
        defaultTable,
        { hand, melds: [], dora: [], nuki: 0 },
        { ...defaultOptions, riichi: 'open-riichi' },
        rule
      )
    ).toThrow();

    expect(() =>
      generateResult(
        defaultTable,
        { hand, melds: [], dora: [], nuki: 0 },
        { ...defaultOptions, riichi: 'open-double-riichi' },
        rule
      )
    ).toThrow();
  });

  interface TestCase {
    id: string;
    hand: string;
    melds: Meld[];
    options: HandOptions;
  }

  const testCasesL01toL29: TestCase[] = [
    {
      id: 'L01',
      hand: '234p567p345s678s9s',
      melds: [] as Meld[],
      options: { ...defaultOptions, tsubameGaeshi: true }
    },
    {
      id: 'L02',
      hand: '234p567p345s678s9s',
      melds: [] as Meld[],
      options: { ...defaultOptions, kanFuri: true }
    },
    {
      id: 'L03',
      hand: '234p567p345s678s9s',
      melds: [] as Meld[],
      options: { ...defaultOptions, tenho: true }
    },
    {
      id: 'L04',
      hand: '123p345p456s555z9p',
      melds: [] as Meld[],
      options: defaultOptions
    },
    {
      id: 'L05',
      hand: '5p',
      melds: [
        { type: 'pon' as const, tile: parseSingleTile('1m') },
        { type: 'pon' as const, tile: parseSingleTile('9m') },
        { type: 'pon' as const, tile: parseSingleTile('3z') },
        { type: 'pon' as const, tile: parseSingleTile('5z') }
      ],
      options: defaultOptions
    },
    {
      id: 'L06',
      hand: '111m234p456s333z5z',
      melds: [] as Meld[],
      options: defaultOptions
    },
    {
      id: 'L07',
      hand: '11m22p33s11z55z55p6s',
      melds: [] as Meld[],
      options: defaultOptions
    },
    {
      id: 'L08',
      hand: '888p999p345s1m',
      melds: [{ type: 'pon' as const, tile: parseSingleTile('7p') }],
      options: defaultOptions
    },
    {
      id: 'L09',
      hand: '222p333p44p567s99s',
      melds: [] as Meld[],
      options: defaultOptions
    },
    {
      id: 'L10',
      hand: '222p333p44p567s99s',
      melds: [] as Meld[],
      options: defaultOptions
    },
    {
      id: 'L11',
      hand: '111p222p333p567s9s',
      melds: [] as Meld[],
      options: defaultOptions
    },
    {
      id: 'L12',
      hand: '111s222s33s33z',
      melds: [{ type: 'pon' as const, tile: parseSingleTile('7z') }],
      options: defaultOptions
    },
    {
      id: 'L13',
      hand: '3z',
      melds: [
        { type: 'pon' as const, tile: parseSingleTile('2s') },
        { type: 'pon' as const, tile: parseSingleTile('3s') },
        { type: 'pon' as const, tile: parseSingleTile('4s') },
        { type: 'kan' as const, tile: parseSingleTile('5s'), closed: false }
      ],
      options: defaultOptions
    },
    {
      id: 'L14',
      hand: '2222p3333p444p99s',
      melds: [] as Meld[],
      options: defaultOptions
    },
    {
      id: 'L15',
      hand: '777s999s7z',
      melds: [
        { type: 'pon' as const, tile: parseSingleTile('1s') },
        { type: 'pon' as const, tile: parseSingleTile('5s') }
      ],
      options: defaultOptions
    },
    {
      id: 'L16',
      hand: '234s234s666s777z8s',
      melds: [] as Meld[],
      options: defaultOptions
    },
    {
      id: 'L17',
      hand: '234s234s666s888s4s',
      melds: [] as Meld[],
      options: defaultOptions
    },
    {
      id: 'L18',
      hand: '22p44p88p11z22z33z4z',
      melds: [] as Meld[],
      options: defaultOptions
    },
    {
      id: 'L19',
      hand: '2233445566778p',
      melds: [] as Meld[],
      options: defaultOptions
    },
    {
      id: 'L20',
      hand: '2233445566778s',
      melds: [] as Meld[],
      options: defaultOptions
    },
    {
      id: 'L21',
      hand: '234p567p345s678s9s',
      melds: [] as Meld[],
      options: { ...defaultOptions, riichi: 'double-riichi', haitei: true }
    },
    {
      id: 'L22',
      hand: '234p567p345s678s9s',
      melds: [] as Meld[],
      options: { ...defaultOptions, riichi: 'open-double-riichi', haitei: true }
    },
    {
      id: 'L23',
      hand: '19m147p258s12345z',
      melds: [] as Meld[],
      options: { ...defaultOptions, tenho: true }
    },
    {
      id: 'L24',
      hand: '19m147p258s12345z',
      melds: [] as Meld[],
      options: defaultOptions
    },
    {
      id: 'L25',
      hand: '19m19p19s1234567z',
      melds: [] as Meld[],
      options: { ...defaultOptions, tenho: true }
    },
    {
      id: 'L26',
      hand: '123p345p567p78p99s',
      melds: [] as Meld[],
      options: defaultOptions
    },
    {
      id: 'L27',
      hand: '123s456s789s111z4z',
      melds: [] as Meld[],
      options: defaultOptions
    },
    {
      id: 'L28',
      hand: '123s456s789s444z1z',
      melds: [] as Meld[],
      options: defaultOptions
    },
    {
      id: 'L29',
      hand: '1122334455667z',
      melds: [] as Meld[],
      options: defaultOptions
    }
  ];

  test.each(testCasesL01toL29)(
    'A6-R02: localYaku=false 時にローカル役が現れない ($id)',
    ({ hand, melds, options }) => {
      // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
      const ruleOff: Rule = { ...defaultRule, localYaku: false };
      const res = generateResult(
        defaultTable,
        { hand: parseTiles(hand), melds, dora: [], nuki: 0 },
        options,
        ruleOff
      );
      if (res?.type === 'hora-shanten' && res.info.type === 'hora') {
        for (const h of res.info.hora) {
          for (const y of h.yaku) {
            expect(localYakuNames.has(y.name)).toBe(false);
          }
        }
      }
    }
  );

  test.each(testCasesL01toL29)(
    'A6-R03: localYaku=false 時に状況入力(tsubameGaeshi/kanFuri)が無視される ($id)',
    ({ hand, melds, options }) => {
      // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
      const ruleOff: Rule = { ...defaultRule, localYaku: false };
      const resWithOptions = generateResult(
        defaultTable,
        { hand: parseTiles(hand), melds, dora: [], nuki: 0 },
        options,
        ruleOff
      );
      const resWithoutOptions = generateResult(
        defaultTable,
        { hand: parseTiles(hand), melds, dora: [], nuki: 0 },
        { ...options, tsubameGaeshi: false, kanFuri: false },
        ruleOff
      );
      expect(resWithOptions).toEqual(resWithoutOptions);
    }
  );

  test('A6-R04: compareRules が localYaku と openRiichi を区別する', () => {
    // 出典: 役の成否・飜数は mahjong-rules.md §4.2・§4.2.1、符・基本点は手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)
    const base = defaultRule;
    expect(compareRules(base, { ...base, localYaku: !base.localYaku })).toBe(
      false
    );
    expect(compareRules(base, { ...base, openRiichi: !base.openRiichi })).toBe(
      false
    );
    expect(compareRules(base, { ...base })).toBe(true);
  });
});

describe('A7: オープンダブル立直+一発時の槍槓・海底', () => {
  test('A7-C01: オープンダブル立直+一発時に面子手で槍槓が付かない (ロン)', () => {
    // 出典: 役の付与条件は mahjong-rules.md §4.2(オープンダブル立直はダブル立直の上位として置き換える)と設計書 issue-14 §4.4、符・基本点は手計算(mahjong-rules.md §6)
    const hand = parseTiles('234p567p345s67s99s');
    const horaTile = parseSingleTile('8s');
    const options: HandOptions = {
      ...defaultOptions,
      riichi: 'open-double-riichi',
      ippatsu: true,
      chankan: true
    };
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      options,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yaku', name: 'open-double-riichi', han: 3 },
      { type: 'yaku', name: 'ippatsu', han: 1 },
      { type: 'yaku', name: 'pinfu', han: 1 }
    ]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(2000);
  });

  test('A7-H01: オープンダブル立直+一発時に面子手で海底・河底が付かない (ロン・ツモ)', () => {
    // 出典: 役の付与条件は mahjong-rules.md §4.2(オープンダブル立直はダブル立直の上位として置き換える)と設計書 issue-14 §4.4、符・基本点は手計算(mahjong-rules.md §6)
    const hand = parseTiles('234p567p345s678s9s');
    const horaTile = parseSingleTile('9s');
    const options: HandOptions = {
      ...defaultOptions,
      riichi: 'open-double-riichi',
      ippatsu: true,
      haitei: true
    };
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      options,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yaku', name: 'open-double-riichi', han: 3 },
      { type: 'yaku', name: 'ippatsu', han: 1 }
    ]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(2000);

    const tsumoHora = getHoraBy(res, horaTile, 'tsumo');
    expect(tsumoHora.yaku).toEqual([
      { type: 'yaku', name: 'open-double-riichi', han: 3 },
      { type: 'yaku', name: 'ippatsu', han: 1 },
      { type: 'yaku', name: 'tsumo', han: 1 }
    ]);
    expect(computeBasePoint(tsumoHora, defaultRule)).toBe(2000);
  });

  test('A7-H02: オープンダブル立直+一発時に七対子で海底・河底が付かない (ロン・ツモ)', () => {
    // 出典: 役の付与条件は mahjong-rules.md §4.2(オープンダブル立直はダブル立直の上位として置き換える)と設計書 issue-14 §4.4、符・基本点は手計算(mahjong-rules.md §6)
    const hand = parseTiles('1199p11335577s9s');
    const horaTile = parseSingleTile('9s');
    const options: HandOptions = {
      ...defaultOptions,
      riichi: 'open-double-riichi',
      ippatsu: true,
      haitei: true
    };
    const res = generateResult(
      defaultTable,
      { hand, melds: [], dora: [], nuki: 0 },
      options,
      defaultRule
    );
    const ronHora = getHoraBy(res, horaTile, 'ron');
    expect(ronHora.yaku).toEqual([
      { type: 'yaku', name: 'open-double-riichi', han: 3 },
      { type: 'yaku', name: 'ippatsu', han: 1 },
      { type: 'yaku', name: 'chitoitsu', han: 2 }
    ]);
    expect(computeBasePoint(ronHora, defaultRule)).toBe(3000);

    const tsumoHora = getHoraBy(res, horaTile, 'tsumo');
    expect(tsumoHora.yaku).toEqual([
      { type: 'yaku', name: 'open-double-riichi', han: 3 },
      { type: 'yaku', name: 'ippatsu', han: 1 },
      { type: 'yaku', name: 'tsumo', han: 1 },
      { type: 'yaku', name: 'chitoitsu', han: 2 }
    ]);
    expect(computeBasePoint(tsumoHora, defaultRule)).toBe(3000);
  });
});
