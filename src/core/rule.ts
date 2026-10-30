/** 1本場あたりの点数の所定値(mahjong-rules.md §3.2) */
export const DEFAULT_HONBA_POINT = 200;

/** 北の扱いの所定値(mahjong-rules.md §2) */
export const DEFAULT_NORTH: Rule['north'] = 'nukidora';

/** ツモ損の所定値(mahjong-rules.md §3.1) */
export const DEFAULT_TSUMO_LOSS: Rule['tsumoLoss'] = 'loss';

/** ローカル役の所定値(mahjong-rules.md §4.2) */
export const DEFAULT_LOCAL_YAKU = false;
/** オープン立直の所定値(mahjong-rules.md §4.2) */
export const DEFAULT_OPEN_RIICHI = false;

export interface Rule {
  red: {
    m: 0 | 1 | 2 | 3 | 4;
    p: 0 | 1 | 2 | 3 | 4;
    s: 0 | 1 | 2 | 3 | 4;
  };
  honbaPoint: number;
  roundedMangan: boolean;
  doubleWindFu: 2 | 4;
  accumlatedYakuman: boolean;
  multipleYakuman: boolean;
  kokushi13DoubleYakuman: boolean;
  suankoTankiDoubleYakuman: boolean;
  daisushiDoubleYakuman: boolean;
  pureChurenDoubleYakuman: boolean;
  north: 'nukidora' | 'yakuhai';
  /** ツモ損: loss=ツモ損あり / north-split=北家分折半 / ron-split=ロン打点折半 */
  tsumoLoss: 'loss' | 'north-split' | 'ron-split';
  /** ローカル役(§4.2 の表、八連荘を除く)を一括で採用する */
  localYaku: boolean;
  /** オープン立直・オープンダブル立直を採用する */
  openRiichi: boolean;
}

export const compareRules = (a: Rule, b: Rule) =>
  a.red.m === b.red.m &&
  a.red.p === b.red.p &&
  a.red.s === b.red.s &&
  a.honbaPoint === b.honbaPoint &&
  a.roundedMangan === b.roundedMangan &&
  a.doubleWindFu === b.doubleWindFu &&
  a.accumlatedYakuman === b.accumlatedYakuman &&
  a.multipleYakuman === b.multipleYakuman &&
  a.kokushi13DoubleYakuman === b.kokushi13DoubleYakuman &&
  a.suankoTankiDoubleYakuman === b.suankoTankiDoubleYakuman &&
  a.daisushiDoubleYakuman === b.daisushiDoubleYakuman &&
  a.pureChurenDoubleYakuman === b.pureChurenDoubleYakuman &&
  a.north === b.north &&
  a.tsumoLoss === b.tsumoLoss &&
  a.localYaku === b.localYaku &&
  a.openRiichi === b.openRiichi;
