/** 赤5の枚数(5p・5s それぞれ)。0=赤なし / 1=2枚 / 2=4枚 */
export type RedDora = 0 | 1 | 2;

/** 赤ドラの所定値(mahjong-rules.md §1) */
export const DEFAULT_RED: RedDora = 1;

/** 1本場あたりの点数の所定値(mahjong-rules.md §3.2) */
export const DEFAULT_HONBA_POINT = 200;

/** 供託1本あたりの点数の所定値(mahjong-rules.md §3.2) */
export const DEFAULT_DEPOSIT_POINT = 1000;

/** 一発の所定値(mahjong-rules.md §4.1) */
export const DEFAULT_IPPATSU = true;

/** 喰い断の所定値(mahjong-rules.md §4.1) */
export const DEFAULT_KUITAN = true;

/** 切り上げ満貫の所定値(mahjong-rules.md §3.3) */
export const DEFAULT_ROUNDED_MANGAN = false;

/** 連風牌の雀頭の符の所定値(mahjong-rules.md §4.1) */
export const DEFAULT_DOUBLE_WIND_FU: Rule['doubleWindFu'] = 4;

/** 数え役満の所定値(mahjong-rules.md §3.3) */
export const DEFAULT_ACCUMLATED_YAKUMAN = true;

/** 役満の複合の所定値(mahjong-rules.md §3.3) */
export const DEFAULT_MULTIPLE_YAKUMAN = true;

/** 国士無双十三面待ちダブル役満の所定値(mahjong-rules.md §3.3) */
export const DEFAULT_KOKUSHI13_DOUBLE_YAKUMAN = true;

/** 四暗刻単騎ダブル役満の所定値(mahjong-rules.md §3.3) */
export const DEFAULT_SUANKO_TANKI_DOUBLE_YAKUMAN = true;

/** 大四喜ダブル役満の所定値(mahjong-rules.md §3.3) */
export const DEFAULT_DAISUSHI_DOUBLE_YAKUMAN = true;

/** 純正九蓮宝燈ダブル役満の所定値(mahjong-rules.md §3.3) */
export const DEFAULT_PURE_CHUREN_DOUBLE_YAKUMAN = true;

/** 北の扱いの所定値(mahjong-rules.md §2) */
export const DEFAULT_NORTH: Rule['north'] = 'nukidora';

/** ツモ損の所定値(mahjong-rules.md §3.1) */
export const DEFAULT_TSUMO_LOSS: Rule['tsumoLoss'] = 'loss';

/** ローカル役の所定値(mahjong-rules.md §4.2) */
export const DEFAULT_LOCAL_YAKU = false;

/** オープン立直の所定値(mahjong-rules.md §4.2) */
export const DEFAULT_OPEN_RIICHI = false;

/** 本場の設定範囲(mahjong-rules.md §3.2) */
export const HONBA_POINT_MIN = 0;
export const HONBA_POINT_MAX = 10000;
export const HONBA_POINT_STEP = 200;

/** 供託の設定範囲(mahjong-rules.md §3.2) */
export const DEPOSIT_POINT_MIN = 0;
export const DEPOSIT_POINT_MAX = 10000;
export const DEPOSIT_POINT_STEP = 100;

export interface Rule {
  red: RedDora;
  honbaPoint: number;
  depositPoint: number;
  ippatsu: boolean;
  kuitan: boolean;
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

/** 牌の種類ごとの赤5の枚数。萬子・字牌は常に 0(5m は三麻に存在しない) */
export const redCountOf = (
  red: RedDora,
  type: 'm' | 'p' | 's' | 'z'
): number => {
  if (type === 'p' || type === 's') {
    return red;
  }
  return 0;
};

export const DEFAULT_RULE: Readonly<Rule> = Object.freeze({
  red: DEFAULT_RED,
  honbaPoint: DEFAULT_HONBA_POINT,
  depositPoint: DEFAULT_DEPOSIT_POINT,
  ippatsu: DEFAULT_IPPATSU,
  kuitan: DEFAULT_KUITAN,
  roundedMangan: DEFAULT_ROUNDED_MANGAN,
  doubleWindFu: DEFAULT_DOUBLE_WIND_FU,
  accumlatedYakuman: DEFAULT_ACCUMLATED_YAKUMAN,
  multipleYakuman: DEFAULT_MULTIPLE_YAKUMAN,
  kokushi13DoubleYakuman: DEFAULT_KOKUSHI13_DOUBLE_YAKUMAN,
  suankoTankiDoubleYakuman: DEFAULT_SUANKO_TANKI_DOUBLE_YAKUMAN,
  daisushiDoubleYakuman: DEFAULT_DAISUSHI_DOUBLE_YAKUMAN,
  pureChurenDoubleYakuman: DEFAULT_PURE_CHUREN_DOUBLE_YAKUMAN,
  north: DEFAULT_NORTH,
  tsumoLoss: DEFAULT_TSUMO_LOSS,
  localYaku: DEFAULT_LOCAL_YAKU,
  openRiichi: DEFAULT_OPEN_RIICHI
});

export const createDefaultRule = (): Rule => ({ ...DEFAULT_RULE });

export const compareRules = (a: Rule, b: Rule) =>
  a.red === b.red &&
  a.honbaPoint === b.honbaPoint &&
  a.depositPoint === b.depositPoint &&
  a.ippatsu === b.ippatsu &&
  a.kuitan === b.kuitan &&
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

export type RuleIssueKey = keyof Rule;

export interface RuleIssue {
  key: RuleIssueKey;
  message: string;
}

const RULE_KEYS: readonly RuleIssueKey[] = [
  'red',
  'honbaPoint',
  'depositPoint',
  'ippatsu',
  'kuitan',
  'roundedMangan',
  'doubleWindFu',
  'accumlatedYakuman',
  'multipleYakuman',
  'kokushi13DoubleYakuman',
  'suankoTankiDoubleYakuman',
  'daisushiDoubleYakuman',
  'pureChurenDoubleYakuman',
  'north',
  'tsumoLoss',
  'localYaku',
  'openRiichi'
] as const;

/** 検査を通れば空配列。値を書き換えない */
export const validateRule = (rule: unknown): RuleIssue[] => {
  if (typeof rule !== 'object' || rule === null || Array.isArray(rule)) {
    return RULE_KEYS.map(key => ({
      key,
      message: `ルールオブジェクトが不正です(${key}が指定されていません)`
    }));
  }

  const r = rule as Record<string, unknown>;
  const issues: RuleIssue[] = [];

  // red
  if (r.red !== 0 && r.red !== 1 && r.red !== 2) {
    issues.push({
      key: 'red',
      message: '赤ドラは0(なし)、1(2枚)、2(4枚)のいずれかを指定してください'
    });
  }

  // honbaPoint
  if (
    typeof r.honbaPoint !== 'number' ||
    !Number.isInteger(r.honbaPoint) ||
    r.honbaPoint < HONBA_POINT_MIN ||
    r.honbaPoint > HONBA_POINT_MAX ||
    r.honbaPoint % HONBA_POINT_STEP !== 0
  ) {
    issues.push({
      key: 'honbaPoint',
      message: `${HONBA_POINT_MIN}〜${HONBA_POINT_MAX}の範囲内で${HONBA_POINT_STEP}点単位の整数を指定してください`
    });
  }

  // depositPoint
  if (
    typeof r.depositPoint !== 'number' ||
    !Number.isInteger(r.depositPoint) ||
    r.depositPoint < DEPOSIT_POINT_MIN ||
    r.depositPoint > DEPOSIT_POINT_MAX ||
    r.depositPoint % DEPOSIT_POINT_STEP !== 0
  ) {
    issues.push({
      key: 'depositPoint',
      message: `${DEPOSIT_POINT_MIN}〜${DEPOSIT_POINT_MAX}の範囲内で${DEPOSIT_POINT_STEP}点単位の整数を指定してください`
    });
  }

  // ippatsu
  if (typeof r.ippatsu !== 'boolean') {
    issues.push({
      key: 'ippatsu',
      message: '一発の有無を真偽値で指定してください'
    });
  }

  // kuitan
  if (typeof r.kuitan !== 'boolean') {
    issues.push({
      key: 'kuitan',
      message: '喰い断の有無を真偽値で指定してください'
    });
  }

  // roundedMangan
  if (typeof r.roundedMangan !== 'boolean') {
    issues.push({
      key: 'roundedMangan',
      message: '切り上げ満貫の有無を真偽値で指定してください'
    });
  }

  // doubleWindFu
  if (r.doubleWindFu !== 2 && r.doubleWindFu !== 4) {
    issues.push({
      key: 'doubleWindFu',
      message: '連風牌の雀頭は2符または4符を指定してください'
    });
  }

  // accumlatedYakuman
  if (typeof r.accumlatedYakuman !== 'boolean') {
    issues.push({
      key: 'accumlatedYakuman',
      message: '数え役満の有無を真偽値で指定してください'
    });
  }

  // multipleYakuman
  if (typeof r.multipleYakuman !== 'boolean') {
    issues.push({
      key: 'multipleYakuman',
      message: '役満の複合の有無を真偽値で指定してください'
    });
  }

  // kokushi13DoubleYakuman
  if (typeof r.kokushi13DoubleYakuman !== 'boolean') {
    issues.push({
      key: 'kokushi13DoubleYakuman',
      message: '国士無双十三面待ちダブル役満の有無を真偽値で指定してください'
    });
  }

  // suankoTankiDoubleYakuman
  if (typeof r.suankoTankiDoubleYakuman !== 'boolean') {
    issues.push({
      key: 'suankoTankiDoubleYakuman',
      message: '四暗刻単騎ダブル役満の有無を真偽値で指定してください'
    });
  }

  // daisushiDoubleYakuman
  if (typeof r.daisushiDoubleYakuman !== 'boolean') {
    issues.push({
      key: 'daisushiDoubleYakuman',
      message: '大四喜ダブル役満の有無を真偽値で指定してください'
    });
  }

  // pureChurenDoubleYakuman
  if (typeof r.pureChurenDoubleYakuman !== 'boolean') {
    issues.push({
      key: 'pureChurenDoubleYakuman',
      message: '純正九蓮宝燈ダブル役満の有無を真偽値で指定してください'
    });
  }

  // north
  if (r.north !== 'nukidora' && r.north !== 'yakuhai') {
    issues.push({
      key: 'north',
      message: '北の扱いは「nukidora」または「yakuhai」を指定してください'
    });
  }

  // tsumoLoss
  if (
    r.tsumoLoss !== 'loss' &&
    r.tsumoLoss !== 'north-split' &&
    r.tsumoLoss !== 'ron-split'
  ) {
    issues.push({
      key: 'tsumoLoss',
      message:
        'ツモ損は「loss」「north-split」「ron-split」のいずれかを指定してください'
    });
  }

  // localYaku
  if (typeof r.localYaku !== 'boolean') {
    issues.push({
      key: 'localYaku',
      message: 'ローカル役の有無を真偽値で指定してください'
    });
  }

  // openRiichi
  if (typeof r.openRiichi !== 'boolean') {
    issues.push({
      key: 'openRiichi',
      message: 'オープン立直の有無を真偽値で指定してください'
    });
  }

  return issues;
};

export const isValidRule = (rule: unknown): rule is Rule =>
  validateRule(rule).length === 0;
