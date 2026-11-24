import type { Meld } from '../../src/core/input';
import type { Tile } from '../../src/core/tile';

export interface BenchHandSpec {
  id: string;
  shanten: 1 | 2 | 3;
  handStr: string;
  melds: Meld[];
  nuki: number;
  doraStr: string[];
}

export function parseTiles(str: string): Tile[] {
  const tiles: Tile[] = [];
  let buf: number[] = [];
  for (const ch of str) {
    if (ch >= '0' && ch <= '9') {
      buf.push(Number(ch));
    } else if (ch === 'm' || ch === 'p' || ch === 's' || ch === 'z') {
      for (const n of buf) {
        if (ch === 'm' && n >= 2 && n <= 8) {
          throw new Error(`三麻に存在しない牌: ${n}m`);
        }
        if (n === 0) {
          if (ch !== 'p' && ch !== 's') {
            throw new Error(`赤5は p/s のみ: 0${ch}`);
          }
          tiles.push({ type: ch, n: 5, red: true });
        } else if (n === 5 && ch !== 'z') {
          tiles.push({ type: ch, n: 5, red: false });
        } else {
          tiles.push({ type: ch, n } as Tile);
        }
      }
      buf = [];
    }
  }
  return tiles;
}

const pon = (str: string): Meld => {
  const ts = parseTiles(str);
  return { type: 'pon', tile: ts[0] ?? null };
};

export const BENCH_HANDS: readonly BenchHandSpec[] = [
  // 1向聴 (S1-01 .. S1-10)
  {
    id: 'S1-01',
    shanten: 1,
    handStr: '9m123p456p78s99s11z',
    melds: [],
    nuki: 0,
    doraStr: []
  },
  {
    id: 'S1-02',
    shanten: 1,
    handStr: '11m234p067p3478s1z',
    melds: [],
    nuki: 0,
    doraStr: ['9s']
  },
  {
    id: 'S1-03',
    shanten: 1,
    handStr: '99m13p456p789s557z',
    melds: [],
    nuki: 1,
    doraStr: []
  },
  {
    id: 'S1-04',
    shanten: 1,
    handStr: '1199m226p3388s15z',
    melds: [],
    nuki: 0,
    doraStr: ['1p']
  },
  {
    id: 'S1-05',
    shanten: 1,
    handStr: '11m345678p2468s9s',
    melds: [],
    nuki: 2,
    doraStr: []
  },
  {
    id: 'S1-06',
    shanten: 1,
    handStr: '123p456p78s44z11z9m',
    melds: [],
    nuki: 0,
    doraStr: ['3z']
  },
  {
    id: 'S1-07',
    shanten: 1,
    handStr: '23p067p34567s',
    melds: [pon('7z')],
    nuki: 0,
    doraStr: []
  },
  {
    id: 'S1-08',
    shanten: 1,
    handStr: '11m345p68p24s1z',
    melds: [pon('6z')],
    nuki: 1,
    doraStr: ['5p']
  },
  {
    id: 'S1-09',
    shanten: 1,
    handStr: '123p4p77z9m',
    melds: [pon('5z'), pon('1s')],
    nuki: 0,
    doraStr: []
  },
  {
    id: 'S1-10',
    shanten: 1,
    handStr: '11m24p78p2s',
    melds: [pon('6z'), pon('9p')],
    nuki: 1,
    doraStr: ['1s']
  },

  // 2向聴 (S2-01 .. S2-10)
  {
    id: 'S2-01',
    shanten: 2,
    handStr: '19m22p345p678s468s',
    melds: [],
    nuki: 0,
    doraStr: []
  },
  {
    id: 'S2-02',
    shanten: 2,
    handStr: '199m24p055p67s11z7z',
    melds: [],
    nuki: 1,
    doraStr: ['4p']
  },
  {
    id: 'S2-03',
    shanten: 2,
    handStr: '345p799p23s567s7z9m',
    melds: [],
    nuki: 0,
    doraStr: []
  },
  {
    id: 'S2-04',
    shanten: 2,
    handStr: '123p456p78s99s1m5z9m',
    melds: [],
    nuki: 2,
    doraStr: ['7s']
  },
  {
    id: 'S2-05',
    shanten: 2,
    handStr: '19m1188p2299s135z',
    melds: [],
    nuki: 0,
    doraStr: []
  },
  {
    id: 'S2-06',
    shanten: 2,
    handStr: '1m134p067p2479s99m',
    melds: [],
    nuki: 0,
    doraStr: ['9p']
  },
  {
    id: 'S2-07',
    shanten: 2,
    handStr: '0p78p13s79s',
    melds: [pon('5z'), pon('6z')],
    nuki: 0,
    doraStr: []
  },
  {
    id: 'S2-08',
    shanten: 2,
    handStr: '1m24p0678s99s1z',
    melds: [pon('7z')],
    nuki: 1,
    doraStr: []
  },
  {
    id: 'S2-09',
    shanten: 2,
    handStr: '123p6p24s99s15z',
    melds: [pon('5z')],
    nuki: 0,
    doraStr: ['2s']
  },
  {
    id: 'S2-10',
    shanten: 2,
    handStr: '9m345p2469s44z',
    melds: [pon('6z')],
    nuki: 0,
    doraStr: []
  },

  // 3向聴 (S3-01 .. S3-10)
  {
    id: 'S3-01',
    shanten: 3,
    handStr: '1m134p067p2479s15z',
    melds: [],
    nuki: 0,
    doraStr: []
  },
  {
    id: 'S3-02',
    shanten: 3,
    handStr: '11m24p68p13579s11z',
    melds: [],
    nuki: 1,
    doraStr: []
  },
  {
    id: 'S3-03',
    shanten: 3,
    handStr: '2368p1124s579s5z9m',
    melds: [],
    nuki: 0,
    doraStr: ['8s']
  },
  {
    id: 'S3-04',
    shanten: 3,
    handStr: '19m13579p1357s11z',
    melds: [],
    nuki: 0,
    doraStr: []
  },
  {
    id: 'S3-05',
    shanten: 3,
    handStr: '11m24p68p13579s44z',
    melds: [],
    nuki: 2,
    doraStr: ['1m']
  },
  {
    id: 'S3-06',
    shanten: 3,
    handStr: '1m35p2479s123z',
    melds: [pon('7z')],
    nuki: 0,
    doraStr: []
  },
  {
    id: 'S3-07',
    shanten: 3,
    handStr: '1m246p13s68s14z',
    melds: [pon('5z')],
    nuki: 1,
    doraStr: []
  },
  {
    id: 'S3-08',
    shanten: 3,
    handStr: '1m0p78p13s79s4z9m',
    melds: [pon('6z')],
    nuki: 0,
    doraStr: ['6p']
  },
  {
    id: 'S3-09',
    shanten: 3,
    handStr: '158p247s9m',
    melds: [pon('5z'), pon('9s')],
    nuki: 0,
    doraStr: []
  },
  {
    id: 'S3-10',
    shanten: 3,
    handStr: '1p6p247s9m1z',
    melds: [pon('7z'), pon('9p')],
    nuki: 1,
    doraStr: []
  }
];

/**
 * D-1a(c) 用の14枚入力(打牌前の手)。#137 の30手には打牌前の入力が無いので、
 * 製造担当が牌姿を選んで固定した。`shanten` は14枚の最小向聴 s0。
 * 候補ごとの打牌後の向聴(製造時に `computeEngine` を T=0 で実行して確認。赤・ドラ表示牌・副露・抜き北を含む):
 * - C-01: s0=1。向聴1: 9m 5s 8s 9s / 向聴2: 1p 2p 3p 4p 5p 6p 7s 1z
 * - C-02: s0=1。向聴1: 9m 3p 6p / 向聴2: 1p 2p 4p 5p 7s 8s 1z 4z
 * - C-03: s0=1(ポン7z)。向聴1: 2p 3p 3s 4s 6s 7s 1z / 向聴2: 5p 6p 7p 5s
 * - C-04: s0=1(ポン6z)。向聴1: 2s 6s 1z / 向聴2: 1m 3p 4p 5p 6p 8p 4s
 * - C-05: s0=2。向聴2: 1m 9m 4s 8s 4z / 向聴3: 2p 3p 4p 5p 6s 7s
 * - C-06: s0=2。向聴2: 1m 9m 1z 3z 4z 5z / 向聴3: 1p 8p 2s 9s
 * - C-07: s0=2(ポン7z)。向聴2: 1m 5s 8s 9s 1z 3z / 向聴3: 2p 4p 6s 7s
 * - C-08: s0=2。向聴2: 1m 4z 7z / 向聴3: 9m 2p 4p 5p 6s 7s 1z
 * - C-09: s0=3(対照。4向聴の候補は計算対象外なので、全候補が向聴3で共通 s_ref と対案S が同じ結果になるはず)。向聴3: 全候補
 */
export const BENCH_HANDS_14: readonly BenchHandSpec[] = [
  {
    id: 'C-01',
    shanten: 1,
    handStr: '9m123p406p5s78s99s11z',
    melds: [],
    nuki: 0,
    doraStr: ['2s']
  },
  {
    id: 'C-02',
    shanten: 1,
    handStr: '123p456p78s44z11z9m3p',
    melds: [],
    nuki: 1,
    doraStr: ['3z']
  },
  {
    id: 'C-03',
    shanten: 1,
    handStr: '23p067p34567s1z',
    melds: [pon('7z')],
    nuki: 0,
    doraStr: ['2s']
  },
  {
    id: 'C-04',
    shanten: 1,
    handStr: '11m345p68p24s1z6s',
    melds: [pon('6z')],
    nuki: 1,
    doraStr: ['5p']
  },
  {
    id: 'C-05',
    shanten: 2,
    handStr: '19m22p345p678s468s4z',
    melds: [],
    nuki: 0,
    doraStr: ['2s']
  },
  {
    id: 'C-06',
    shanten: 2,
    handStr: '19m1188p2299s135z4z',
    melds: [],
    nuki: 2,
    doraStr: ['7p']
  },
  {
    id: 'C-07',
    shanten: 2,
    handStr: '1m24p0678s99s1z3z',
    melds: [pon('7z')],
    nuki: 0,
    doraStr: ['2s']
  },
  {
    id: 'C-08',
    shanten: 2,
    handStr: '199m24p055p67s11z7z4z',
    melds: [],
    nuki: 1,
    doraStr: ['4p']
  },
  {
    id: 'C-09',
    shanten: 3,
    handStr: '1m134p067p2479s15z3z',
    melds: [],
    nuki: 0,
    doraStr: ['2s']
  }
];
