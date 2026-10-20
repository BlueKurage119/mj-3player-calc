// ゴールデンテスト (Issue #9) のケースデータと型。テスト専用であり、アプリからは import しない。
//
// 設計: docs/design/issue-9-golden-tests.md §5.2
// 期待値は実装と独立した出典 (和了画面・手計算) から取った値を数値リテラルで直接書く。
// 実装の関数を呼んで期待値を作ってはならない (独立性が失われるため)。
// 出典の参照は相対パスのみとする。
//
// ケースの追加手順 (オーナーが用意した cases.csv の1行 = 配列の1要素):
//   id          <- ID 列 (例: 'G01')
//   category    <- 設計書 §7 の表のカテゴリ (C1〜C11)
//   title       <- 日本語のテスト名
//   hand        <- 手牌 (MPSZ表記)。副露を除く手牌で、末尾の1枚が和了牌
//   melds       <- 副露列。ポン・明槓・暗槓のみ
//   dora        <- ドラ表示牌 (裏ドラ表示牌を含む)。無ければ ''
//   by / riichi / seat / round <- ロン/ツモ・立直・自風・場風の各列
//   expected    <- 役と飜 (役名は yaku.ts の識別子)・飜合計・符 (切り上げ後)・基本点・区分
//   source      <- 出典メモ・検算手段 (verifiedBy は2つ以上)・差し引いた抜きドラ飜数

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
    /** 切り上げ後の符。役満・国士は null */
    fu: number | null;
    /** 基本点。出典の式で手計算した数値を直接書く */
    basePoint: number;
    tier: '通常' | '満貫' | '跳満' | '倍満' | '三倍満' | '役満';
  };
  source: {
    /** 役・飜・符の出典 (相対パスのみ) */
    yakuHanFu: string;
    /** 裏付けのスクリーンショット (任意。相対パスのみ) */
    screenshot?: string;
    /** 基本点の出典 */
    basePoint: string;
    /** 検算に使った手段。2つ以上 */
    verifiedBy: ('screenshot' | 'hand-calc' | 'kobalab')[];
    /** 画面の飜から差し引いた抜きドラの飜数。抜き北なしなら省略 */
    nukiDoraDeducted?: number;
    /** 牌種置き換え等の補足 */
    note?: string;
  };
}

// 期待値の投入待ち (G01〜G28)。投入するまで空配列とし、golden.test.ts の
// 集計検査 (件数・カテゴリ網羅など) はケースが空のあいだスキップされる。
export const goldenCases: GoldenCase[] = [];
