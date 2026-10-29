/** 1本場あたりの点数の所定値(mahjong-rules.md §3.2) */
export const DEFAULT_HONBA_POINT = 200;

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
  a.pureChurenDoubleYakuman === b.pureChurenDoubleYakuman;
