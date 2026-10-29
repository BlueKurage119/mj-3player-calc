import { describe, expect, test } from 'vitest';
import type { HandOptions, Meld } from './input';
import { generateResult } from './result';
import type { Rule } from './rule';
import type { Table } from './table';
import type { Tile } from './tile';

// ---- 補助関数 (golden.test.ts より複製) ----

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
  north: 'nukidora'
};

const defaultTable: Table = {
  round: 'east',
  seat: 'east',
  continue: 0,
  deposit: 0
};

const defaultHandOptions: HandOptions = {
  riichi: 'none',
  ippatsu: false,
  rinshan: false,
  chankan: false,
  haitei: false,
  tenho: false
};

// ---- 注意事項 N11 ----
describe('A2-N11: A2-H2 parseTiles', () => {
  test('A2-H2: 1m999m11p22p33s444s は13枚・6種', () => {
    const tiles = parseTiles('1m999m11p22p33s444s');
    expect(tiles).toHaveLength(13);
    const unique = new Set(tiles.map(t => `${t.type}${t.n}`));
    expect(unique.size).toBe(6);
  });
});

// ---- 設計書 §5-6: 入力の検証 ----
describe('入力の検証 (A2-V1〜V6)', () => {
  test('A2-V1: 手牌に 2m〜8m が含まれる場合 (2m9m123456p789s12z: 13枚) -> null', () => {
    const res = generateResult(
      defaultTable,
      {
        hand: parseTiles('2m9m123456p789s12z'),
        melds: [],
        dora: [],
        nuki: 0
      },
      defaultHandOptions,
      rule
    );
    expect(res).toBeNull();
  });

  test('A2-V2: ドラ表示牌に 2m〜8m が含まれる場合 (手牌H1: 13枚, ドラ 5m) -> null', () => {
    const res = generateResult(
      defaultTable,
      {
        hand: parseTiles('19m123456p789s12z'),
        melds: [],
        dora: parseTiles('5m'),
        nuki: 0
      },
      defaultHandOptions,
      rule
    );
    expect(res).toBeNull();
  });

  test('A2-V3: 副露に 2m〜8m が含まれる場合 (手牌H4: 10枚 + ポン 3m) -> null', () => {
    const res = generateResult(
      defaultTable,
      {
        hand: parseTiles('19m123456p78s'),
        melds: [{ type: 'pon', tile: parseSingleTile('3m') }],
        dora: [],
        nuki: 0
      },
      defaultHandOptions,
      rule
    );
    expect(res).toBeNull();
  });

  test('A3: チーは Meld の型で表せない', () => {
    const m: Meld = {
      // @ts-expect-error チーは三麻に存在しない
      type: 'chii',
      tile: parseSingleTile('1m'),
      includeRed: false
    };
    expect(m).toBeDefined();
  });

  test('A2-V6: 手牌に 2m〜8m が5枚含まれる場合 (H6: 22222m9m123456p78s: 14枚) -> 例外を投げず null', () => {
    const res = generateResult(
      defaultTable,
      {
        hand: [
          ...Array(5).fill({ type: 'm', n: 2 }),
          ...parseTiles('9m123456p78s')
        ],
        melds: [],
        dora: [],
        nuki: 0
      },
      defaultHandOptions,
      rule
    );
    expect(res).toBeNull();
  });
});

// ---- 設計書 §5-7: 一覧に 2m〜8m が無い ----
describe('一覧に 2m〜8m が無い', () => {
  test('A2: 向聴形: H1 (19m123456p789s12z) で 2m〜8m が無く、1m・9m がある', () => {
    const res = generateResult(
      defaultTable,
      {
        hand: parseTiles('19m123456p789s12z'),
        melds: [],
        dora: [],
        nuki: 0
      },
      defaultHandOptions,
      rule
    );
    expect(res).not.toBeNull();
    expect(res?.type).toBe('hora-shanten');
    if (res?.type !== 'hora-shanten') return;
    expect(res.info.type).toBe('shanten');
    if (res.info.type !== 'shanten') return;

    const availabilities = res.info.tileAvailabilities;
    // 2m〜8m が一覧に存在しない
    const has2mTo8m = availabilities.some(
      a => a.tile.type === 'm' && a.tile.n >= 2 && a.tile.n <= 8
    );
    expect(has2mTo8m).toBe(false);

    // 1m・9m が一覧に含まれる
    const has1m = availabilities.some(
      a => a.tile.type === 'm' && a.tile.n === 1
    );
    const has9m = availabilities.some(
      a => a.tile.type === 'm' && a.tile.n === 9
    );
    expect(has1m).toBe(true);
    expect(has9m).toBe(true);
  });

  test('A2: 聴牌形: H3 (11m99m123p456s: 10枚) で牌が 1m・9m のみ', () => {
    const res = generateResult(
      defaultTable,
      {
        hand: parseTiles('11m99m123p456s'),
        melds: [],
        dora: [],
        nuki: 0
      },
      defaultHandOptions,
      rule
    );
    expect(res).not.toBeNull();
    expect(res?.type).toBe('tempai');
    if (res?.type !== 'tempai') return;

    const tiles = res.tileAvailabilities.map(a => `${a.tile.type}${a.tile.n}`);
    expect(tiles.sort()).toEqual(['m1', 'm9']);
  });
});

// ---- 設計書 §5-8: ドラ表示牌 1m ----
describe('ドラ表示牌 1m', () => {
  // 出典: 手計算、および Wikipedia「麻雀の役一覧」「麻雀の得点計算」
  // 手牌: 999m(暗刻), 123p(順子), 456p(順子), 789s(順子), 11z(東東・対子) の計14枚
  // ドラ表示牌 1m により、三麻では 1m の次の萬子として 9m がドラとなる。
  // 手牌に 9m が3枚あるため、ドラ3飜。立直1飜と合わせて計4飜。
  test('A2: ドラ表示牌 1m で 9m がドラになり、dora 3飜となる', () => {
    const res = generateResult(
      defaultTable,
      {
        hand: parseTiles('999m123p456p789s11z'),
        melds: [],
        dora: parseTiles('1m'),
        nuki: 0
      },
      {
        ...defaultHandOptions,
        riichi: 'riichi'
      },
      rule
    );
    expect(res).not.toBeNull();
    expect(res?.type).toBe('hora-shanten');
    if (res?.type !== 'hora-shanten') return;
    expect(res.info.type).toBe('hora');
    if (res.info.type !== 'hora') return;

    const [hora] = res.info.hora;
    expect(hora).toBeDefined();
    if (!hora) return;

    const doraYaku = hora.yaku.find(y => y.name === 'dora');
    expect(doraYaku).toEqual({ type: 'yaku', name: 'dora', han: 3 });

    const riichiYaku = hora.yaku.find(y => y.name === 'riichi');
    expect(riichiYaku).toEqual({ type: 'yaku', name: 'riichi', han: 1 });
  });
});

// ---- 設計書 §5-9: 残り枚数(108枚構成) ----
describe('残り枚数(108枚構成)', () => {
  test('A2-R1: 手牌 H1、ドラ表示牌 1m -> 1m残り2、9m残り3', () => {
    const res = generateResult(
      defaultTable,
      {
        hand: parseTiles('19m123456p789s12z'),
        melds: [],
        dora: parseTiles('1m'),
        nuki: 0
      },
      defaultHandOptions,
      rule
    );
    expect(res?.type).toBe('hora-shanten');
    if (res?.type !== 'hora-shanten' || res.info.type !== 'shanten') return;

    const availabilities = res.info.tileAvailabilities;
    // 2m〜8m が一覧に無い
    expect(
      availabilities.some(
        a => a.tile.type === 'm' && a.tile.n >= 2 && a.tile.n <= 8
      )
    ).toBe(false);

    const a1m = availabilities.find(a => a.tile.type === 'm' && a.tile.n === 1);
    const a9m = availabilities.find(a => a.tile.type === 'm' && a.tile.n === 9);
    // 1m: 4 - 手牌1 - 表示牌1 = 2
    expect(a1m?.count).toBe(2);
    // 9m: 4 - 手牌1 - 表示牌0 = 3
    expect(a9m?.count).toBe(3);
  });

  test('A2-R2: 手牌 H4 + 副露ポン 6s、ドラ表示牌 9m9s -> 6s残り1、9s残り3、9m残り2、1m残り3', () => {
    const res = generateResult(
      defaultTable,
      {
        hand: parseTiles('19m123456p78s'),
        melds: [{ type: 'pon', tile: parseSingleTile('6s') }],
        dora: parseTiles('9m9s'),
        nuki: 0
      },
      defaultHandOptions,
      rule
    );
    expect(res?.type).toBe('hora-shanten');
    if (res?.type !== 'hora-shanten' || res.info.type !== 'shanten') return;

    const availabilities = res.info.tileAvailabilities;
    // 2m〜8m が一覧に無い
    expect(
      availabilities.some(
        a => a.tile.type === 'm' && a.tile.n >= 2 && a.tile.n <= 8
      )
    ).toBe(false);

    const a6s = availabilities.find(a => a.tile.type === 's' && a.tile.n === 6);
    const a9s = availabilities.find(a => a.tile.type === 's' && a.tile.n === 9);
    const a9m = availabilities.find(a => a.tile.type === 'm' && a.tile.n === 9);
    const a1m = availabilities.find(a => a.tile.type === 'm' && a.tile.n === 1);

    // 6s: 4 - 副露3 = 1
    expect(a6s?.count).toBe(1);
    // 9s: 4 - 表示牌1 = 3
    expect(a9s?.count).toBe(3);
    // 9m: 4 - 手牌1 - 表示牌1 = 2
    expect(a9m?.count).toBe(2);
    // 1m: 4 - 手牌1 - 表示牌0 = 3
    expect(a1m?.count).toBe(3);
  });

  test('A2-R3: 手牌 H5、ドラ表示牌 0p(赤5p) -> 赤5p残り0、通常5p残り3、赤5s残り1、通常5s残り3', () => {
    const res = generateResult(
      defaultTable,
      {
        hand: parseTiles('19m46p46s123789p1z'),
        melds: [],
        dora: parseTiles('0p'),
        nuki: 0
      },
      defaultHandOptions,
      rule
    );
    expect(res?.type).toBe('hora-shanten');
    if (res?.type !== 'hora-shanten' || res.info.type !== 'shanten') return;

    const availabilities = res.info.tileAvailabilities;
    // 2m〜8m が一覧に無い
    expect(
      availabilities.some(
        a => a.tile.type === 'm' && a.tile.n >= 2 && a.tile.n <= 8
      )
    ).toBe(false);

    const aRed5p = availabilities.find(
      a => a.tile.type === 'p' && a.tile.n === 5 && a.tile.red
    );
    const aNormal5p = availabilities.find(
      a => a.tile.type === 'p' && a.tile.n === 5 && !a.tile.red
    );
    const aRed5s = availabilities.find(
      a => a.tile.type === 's' && a.tile.n === 5 && a.tile.red
    );
    const aNormal5s = availabilities.find(
      a => a.tile.type === 's' && a.tile.n === 5 && !a.tile.red
    );

    // 赤5p: 赤1 - 表示牌1 = 0
    expect(aRed5p?.count).toBe(0);
    // 通常5p: 3 - 表示牌0 = 3
    expect(aNormal5p?.count).toBe(3);
    // 赤5s: 赤1 - 表示牌0 = 1
    expect(aRed5s?.count).toBe(1);
    // 通常5s: 3 - 表示牌0 = 3
    expect(aNormal5s?.count).toBe(3);
  });
});

// ---- 設計書 §5-10: null 混入なし ----
describe('null 混入なし', () => {
  test('A2: §5-7・§5-9 の全ケースで tileAvailabilities の count がすべて number 型である', () => {
    const cases = [
      // H1 (向聴形)
      { hand: '19m123456p789s12z', melds: [], dora: '', nuki: 0 },
      // H3 (聴牌形)
      { hand: '11m99m123p456s', melds: [], dora: '', nuki: 0 },
      // R1
      { hand: '19m123456p789s12z', melds: [], dora: '1m', nuki: 0 },
      // R2
      {
        hand: '19m123456p78s',
        melds: [{ type: 'pon' as const, tile: parseSingleTile('6s') }],
        dora: '9m9s',
        nuki: 0
      },
      // R3
      { hand: '19m46p46s123789p1z', melds: [], dora: '0p', nuki: 0 }
    ];

    for (const c of cases) {
      const res = generateResult(
        defaultTable,
        {
          hand: parseTiles(c.hand),
          melds: c.melds,
          dora: parseTiles(c.dora),
          nuki: 0
        },
        defaultHandOptions,
        rule
      );
      expect(res).not.toBeNull();
      const availabilities =
        res?.type === 'tempai'
          ? res.tileAvailabilities
          : res?.type === 'hora-shanten' && res.info.type === 'shanten'
            ? res.info.tileAvailabilities
            : [];
      expect(availabilities.length).toBeGreaterThan(0);
      for (const a of availabilities) {
        expect(typeof a.count).toBe('number');
        expect(Number.isNaN(a.count)).toBe(false);
      }
    }
  });
});

// ---- 設計書 §5.2-3: 天和・地和 ----
describe('天和・地和 (A3-T1〜T3)', () => {
  // 出典: mahjong-rules.md §7【確定】(親は自風が東の者)
  const getHoraYakuNames = (seat: Table['seat'], handStr: string): string[] => {
    const res = generateResult(
      { round: 'east', seat, continue: 0, deposit: 0 },
      {
        hand: parseTiles(handStr),
        melds: [],
        dora: [],
        nuki: 0
      },
      {
        ...defaultHandOptions,
        tenho: true
      },
      rule
    );
    expect(res).not.toBeNull();
    expect(res?.type).toBe('hora-shanten');
    if (res?.type !== 'hora-shanten') return [];
    expect(res.info.type).toBe('hora');
    if (res.info.type !== 'hora') return [];
    return res.info.hora.flatMap(h => h.yaku).map(y => y.name);
  };

  test('A3-T1-親: 通常形 自風東で天和', () => {
    const yakuNames = getHoraYakuNames('east', '111m999m123p456p11z');
    expect(yakuNames).toContain('tenho');
    expect(yakuNames).not.toContain('chiho');
  });

  test('A3-T1-子: 通常形 自風南で地和', () => {
    const yakuNames = getHoraYakuNames('south', '111m999m123p456p11z');
    expect(yakuNames).toContain('chiho');
    expect(yakuNames).not.toContain('tenho');
  });

  test('A3-T2-親: 七対子 自風東で天和', () => {
    const yakuNames = getHoraYakuNames('east', '1199m11p22p33s44s11z');
    expect(yakuNames).toContain('tenho');
    expect(yakuNames).not.toContain('chiho');
  });

  test('A3-T2-子: 七対子 自風西で地和', () => {
    const yakuNames = getHoraYakuNames('west', '1199m11p22p33s44s11z');
    expect(yakuNames).toContain('chiho');
    expect(yakuNames).not.toContain('tenho');
  });

  test('A3-T3-親: 国士無双 自風東で天和', () => {
    const yakuNames = getHoraYakuNames('east', '19m19p19s12345677z');
    expect(yakuNames).toContain('tenho');
    expect(yakuNames).not.toContain('chiho');
  });

  test('A3-T3-子: 国士無双 自風南で地和', () => {
    const yakuNames = getHoraYakuNames('south', '19m19p19s12345677z');
    expect(yakuNames).toContain('chiho');
    expect(yakuNames).not.toContain('tenho');
  });
});
