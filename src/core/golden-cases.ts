// ゴールデンテスト (Issue #9) のケースデータと型。テスト専用であり、アプリからは import しない。
//
// 設計: docs/design/issue-9-golden-tests.md §5.2・§7.1
// 出典: オーナー自作の和了形 (手計算と電脳麻将で検算済み)。
//   資料は ../../../doc/三麻テスト用牌譜.xlsx (1局1シート)。期待値は本ファイルに転記し、テストは xlsx を読まない。
// 期待値は実装と独立した出典の値を数値リテラルで直接書く。
// 実装の関数を呼んで期待値を作ってはならない (独立性が失われるため)。
// 出典の参照は相対パスのみとする。
//
// xlsx の行からの写し方 (1シート = 配列の1要素):
//   id          <- シート名の番号。ただし G27-1 は 'G27'、G27-2 は 'G28' とする
//   category    <- 設計書 §7.0.1 の一覧のカテゴリ
//   title       <- 項目名
//   hand        <- 手牌 (副露を除く13枚) の末尾に、和了の行の和了牌を足したMPSZ表記
//   by          <- 和了の行 (ロン -> 'ron'、ツモ -> 'tsumo')
//   melds       <- 副露の行。ポン -> pon、明槓 -> kan (closed: false)、暗槓 -> kan (closed: true)
//   riichi      <- 立直の行 (なし -> 'none'、立直 -> 'riichi')
//   dora        <- ドラ表示牌の行 (裏ドラ表示牌を含む)。無ければ ''
//   round/seat  <- 場風・自風の行 (東 -> 'east'、南 -> 'south')
//   expected    <- 役名 (yaku.ts の識別子。赤・ドラは red-dora・dora の飜数)・飜・符・基本点・区分
//                  役満は fu: null (xlsx の符は写さない)。満貫以上の基本点は区分に応じた値
//                  (満貫2000・跳満3000・倍満4000・三倍満6000・役満/数え役満8000)で、xlsx の2列目は写さない

export interface GoldenCase {
  /** 例: 'G01'。収集リスト (設計書 §7) の番号と一致させる */
  id: string;
  /** 設計書 §6 のカテゴリ */
  category:
    | 'C1'
    | 'C2'
    | 'C3'
    | 'C4'
    | 'C5'
    | 'C6'
    | 'C7'
    | 'C8'
    | 'C9'
    | 'C10'
    | 'C11';
  /** 日本語のテスト名。例: '平和ツモ 20符' */
  title: string;
  /** MPSZ表記。副露を除く手牌で、末尾の1枚が和了牌。赤5は 0p・0s */
  hand: string;
  /** 副露 (ポン・明槓・暗槓のみ)。tile は牌1枚のMPSZ表記 */
  melds?: { type: 'pon' | 'kan'; tile: string; closed?: boolean }[];
  /** ドラ表示牌 (MPSZ表記。裏ドラ表示牌を含む)。無ければ '' */
  dora: string;
  by: 'ron' | 'tsumo';
  /** HandOptions.riichi にそのまま渡す */
  riichi: 'none' | 'riichi' | 'double-riichi';
  seat: 'east' | 'south' | 'west';
  round: 'east' | 'south';
  expected: {
    /** 役名 (yaku.ts の name) -> 飜数 (役満は倍数)。裏ドラは表ドラと合算して dora に入れる */
    yaku: Record<string, number>;
    /** 通常役の飜合計 (役満のみのケースは 0) */
    han: number;
    /** 切り上げ後の符。役満は null (xlsx の符は写さない) */
    fu: number | null;
    /** 区分に応じた基本点 (満貫以上は 2000・3000・4000・6000・8000)。数値リテラルで直接書く */
    basePoint: number;
    tier: '通常' | '満貫' | '跳満' | '倍満' | '三倍満' | '役満';
  };
  source: {
    /** 役・飜・符の出典 (相対パスのみ) */
    yakuHanFu: string;
    /** 基本点の出典 */
    basePoint: string;
    /** 牌種置き換え等の補足 */
    note?: string;
  };
}

export const goldenCases: GoldenCase[] = [
  {
    id: 'G01',
    category: 'C1',
    title: '平和ツモ(20符)',
    hand: '12367p234067s33z8p',
    dora: '3z',
    by: 'tsumo',
    riichi: 'none',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { tsumo: 1, pinfu: 1, 'red-dora': 1 },
      han: 3,
      fu: 20,
      basePoint: 640,
      tier: '通常'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-01(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G02',
    category: 'C1',
    title: '平和ロン(30符)',
    hand: '12367p234067s33z8p',
    dora: '3z',
    by: 'ron',
    riichi: 'none',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { pinfu: 1, 'red-dora': 1 },
      han: 2,
      fu: 30,
      basePoint: 480,
      tier: '通常'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-02(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G03',
    category: 'C2',
    title: '七対子ロン',
    hand: '225577p2244668s8s',
    dora: '3z',
    by: 'ron',
    riichi: 'none',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { tanyao: 1, chitoitsu: 2 },
      han: 3,
      fu: 25,
      basePoint: 800,
      tier: '通常'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-03(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G04',
    category: 'C2',
    title: '七対子+混一色',
    hand: '112334455s2255z2s',
    dora: '3z',
    by: 'ron',
    riichi: 'none',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { chitoitsu: 2, honitsu: 3 },
      han: 5,
      fu: 25,
      basePoint: 2000,
      tier: '満貫'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-04(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G05',
    category: 'C3',
    title: '門前ロン、平和なし、40符',
    hand: '123067p34567s22z2s',
    dora: '9m3z',
    by: 'ron',
    riichi: 'riichi',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { riichi: 1, 'red-dora': 1 },
      han: 2,
      fu: 40,
      basePoint: 640,
      tier: '通常'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-05(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G06',
    category: 'C4',
    title: '嵌張待ちの和了',
    hand: '12346789p406s33z5p',
    dora: '3z',
    by: 'ron',
    riichi: 'none',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { ittsu: 2, 'red-dora': 1 },
      han: 3,
      fu: 40,
      basePoint: 1280,
      tier: '通常'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-06(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G07',
    category: 'C4',
    title: '辺張待ちの和了(筒・索)',
    hand: '99m12389p123789s7p',
    dora: '3z',
    by: 'ron',
    riichi: 'none',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { junchan: 3 },
      han: 3,
      fu: 40,
      basePoint: 1280,
      tier: '通常'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-07(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G08',
    category: 'C4',
    title: '単騎待ちの和了',
    hand: '223344678p3456s6s',
    dora: '3z',
    by: 'ron',
    riichi: 'none',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { tanyao: 1, iipeko: 1 },
      han: 2,
      fu: 40,
      basePoint: 640,
      tier: '通常'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-08(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G09',
    category: 'C5',
    title: '么九牌の暗刻と中張牌の暗刻を両方含む和了',
    hand: '111m234567p3055s3s',
    dora: '34z',
    by: 'ron',
    riichi: 'riichi',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { riichi: 1, 'red-dora': 1 },
      han: 2,
      fu: 50,
      basePoint: 800,
      tier: '通常'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-09(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G10',
    category: 'C5',
    title: '中張牌のシャンポン待ちのロン',
    hand: '406678p2245688s8s',
    dora: '3z',
    by: 'ron',
    riichi: 'none',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { tanyao: 1, 'red-dora': 1 },
      han: 2,
      fu: 40,
      basePoint: 640,
      tier: '通常'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-10(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G11',
    category: 'C5',
    title: '么九牌のポン(么九明刻4)と明槓を含む和了',
    hand: '234p2234s5s',
    melds: [
      { type: 'pon', tile: '2z' },
      { type: 'kan', tile: '1m', closed: false }
    ],
    dora: '3z',
    by: 'ron',
    riichi: 'none',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { 'seat-wind': 1 },
      han: 1,
      fu: 40,
      basePoint: 320,
      tier: '通常'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-11(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G12',
    category: 'C5',
    title: '暗槓を含む和了',
    hand: '23467p22234s8p',
    melds: [{ type: 'kan', tile: '0p', closed: true }],
    dora: '3z',
    by: 'ron',
    riichi: 'none',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { tanyao: 1, 'red-dora': 1 },
      han: 2,
      fu: 50,
      basePoint: 800,
      tier: '通常'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-12(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G13',
    category: 'C6',
    title: '中張牌のポン1つだけ',
    hand: '234678p2234s5s',
    melds: [{ type: 'pon', tile: '0p' }],
    dora: '3z',
    by: 'ron',
    riichi: 'none',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { tanyao: 1, 'red-dora': 1 },
      han: 2,
      fu: 30,
      basePoint: 480,
      tier: '通常'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-13(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G14',
    category: 'C7',
    title: '三元牌の刻子',
    hand: '234567p2345s5s',
    melds: [{ type: 'pon', tile: '7z' }],
    dora: '3z',
    by: 'ron',
    riichi: 'none',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { red: 1 },
      han: 1,
      fu: 30,
      basePoint: 240,
      tier: '通常'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-14(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G15',
    category: 'C7',
    title: '東場の東家で東の刻子(ダブ東)',
    hand: '234567p2345s5s',
    melds: [{ type: 'pon', tile: '1z' }],
    dora: '3z',
    by: 'ron',
    riichi: 'none',
    seat: 'east',
    round: 'east',
    expected: {
      yaku: { 'field-wind': 1, 'seat-wind': 1 },
      han: 2,
      fu: 30,
      basePoint: 480,
      tier: '通常'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-15(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G16',
    category: 'C8',
    title: '混一色(門前)',
    hand: '122334567p3377z3z',
    dora: '3z',
    by: 'ron',
    riichi: 'none',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { honitsu: 3 },
      han: 3,
      fu: 40,
      basePoint: 1280,
      tier: '通常'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-16(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G17',
    category: 'C8',
    title: '混一色(副露、食い下がり)',
    hand: '12367899s77z9s',
    melds: [{ type: 'pon', tile: '0s' }],
    dora: '3z',
    by: 'ron',
    riichi: 'none',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { honitsu: 2, 'red-dora': 1 },
      han: 3,
      fu: 30,
      basePoint: 960,
      tier: '通常'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-17(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G18',
    category: 'C8',
    title: '清一色(筒子)',
    hand: '1112333446789p5p',
    dora: '3z',
    by: 'ron',
    riichi: 'none',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { chinitsu: 6 },
      han: 6,
      fu: 40,
      basePoint: 3000,
      tier: '跳満'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-18(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G19',
    category: 'C8',
    title: '清一色(索子)',
    hand: '2334445678s1s',
    melds: [{ type: 'pon', tile: '7s' }],
    dora: '3z',
    by: 'ron',
    riichi: 'none',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { chinitsu: 5 },
      han: 5,
      fu: 30,
      basePoint: 2000,
      tier: '満貫'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-19(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G20',
    category: 'C9',
    title: '赤5p または赤5s を含む和了',
    hand: '67p33406s0p',
    melds: [
      { type: 'pon', tile: '5z' },
      { type: 'kan', tile: '8p', closed: true }
    ],
    dora: '3z',
    by: 'ron',
    riichi: 'none',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { white: 1, 'red-dora': 2 },
      han: 3,
      fu: 40,
      basePoint: 1280,
      tier: '通常'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-20(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G21',
    category: 'C9',
    title: 'ドラ表示牌 9m で 1m がドラになる和了',
    hand: '11m123678p34566s6s',
    dora: '9m4p',
    by: 'ron',
    riichi: 'riichi',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { riichi: 1, dora: 2 },
      han: 3,
      fu: 40,
      basePoint: 1280,
      tier: '通常'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-21(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G22',
    category: 'C10',
    title: '30符4飜',
    hand: '11m23456p334455s7p',
    dora: '1p',
    by: 'ron',
    riichi: 'riichi',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { riichi: 1, pinfu: 1, iipeko: 1, dora: 1 },
      han: 4,
      fu: 30,
      basePoint: 1920,
      tier: '通常'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-22(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G23',
    category: 'C10',
    title: '60符3飜',
    hand: '122334p67s33z8s',
    melds: [{ type: 'kan', tile: '9m', closed: true }],
    dora: '9p3z',
    by: 'tsumo',
    riichi: 'riichi',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { riichi: 1, tsumo: 1, dora: 1 },
      han: 3,
      fu: 60,
      basePoint: 1920,
      tier: '通常'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-23(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G24',
    category: 'C10',
    title: '跳満(6〜7飜)',
    hand: '1122334p778899s4p',
    dora: '9m1p',
    by: 'ron',
    riichi: 'riichi',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { riichi: 1, pinfu: 1, ryampeko: 3, dora: 2 },
      han: 7,
      fu: 30,
      basePoint: 3000,
      tier: '跳満'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-24(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G25',
    category: 'C10',
    title: '倍満(8〜10飜)',
    hand: '1233467788999p2p',
    dora: '9m9p',
    by: 'ron',
    riichi: 'riichi',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { riichi: 1, pinfu: 1, chinitsu: 6, dora: 1 },
      han: 9,
      fu: 30,
      basePoint: 4000,
      tier: '倍満'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-25(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G26',
    category: 'C10',
    title: '三倍満(11〜12飜)',
    hand: '1123306778999p2p',
    dora: '9m1p',
    by: 'ron',
    riichi: 'riichi',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { riichi: 1, iipeko: 1, chinitsu: 6, dora: 2, 'red-dora': 1 },
      han: 11,
      fu: 40,
      basePoint: 6000,
      tier: '三倍満'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-26(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G27',
    category: 'C10',
    title: '数え役満(13飜〜)',
    hand: '1122330677p4p',
    melds: [{ type: 'kan', tile: '6z', closed: true }],
    dora: '9m18p5z',
    by: 'ron',
    riichi: 'riichi',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: {
        riichi: 1,
        iipeko: 1,
        green: 1,
        honitsu: 3,
        dora: 6,
        'red-dora': 1
      },
      han: 13,
      fu: 70,
      basePoint: 8000,
      tier: '役満'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-27-1(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  },
  {
    id: 'G28',
    category: 'C11',
    title: '役満',
    hand: '111p99s55z5z',
    melds: [
      { type: 'pon', tile: '6z' },
      { type: 'pon', tile: '7z' }
    ],
    dora: '9m18p5z',
    by: 'ron',
    riichi: 'none',
    seat: 'south',
    round: 'east',
    expected: {
      yaku: { daisangen: 1 },
      han: 0,
      fu: null,
      basePoint: 8000,
      tier: '役満'
    },
    source: {
      yakuHanFu:
        'オーナー自作の和了形 ../../../doc/三麻テスト用牌譜.xlsx シート G-27-2(手計算と電脳麻将で検算)',
      basePoint:
        'Wikipedia「麻雀の得点計算」(基本点=符×2^(飜+2)、満貫以上の区分)'
    }
  }
];
