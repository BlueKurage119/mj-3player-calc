import { describe, expect, test } from 'vitest';
import {
  DEPOSIT_POINT_MAX,
  DEPOSIT_POINT_MIN,
  DEPOSIT_POINT_STEP,
  DEFAULT_ACCUMLATED_YAKUMAN,
  DEFAULT_DAISUSHI_DOUBLE_YAKUMAN,
  DEFAULT_DEPOSIT_POINT,
  DEFAULT_DOUBLE_WIND_FU,
  DEFAULT_HONBA_POINT,
  DEFAULT_IPPATSU,
  DEFAULT_KOKUSHI13_DOUBLE_YAKUMAN,
  DEFAULT_KUITAN,
  DEFAULT_LOCAL_YAKU,
  DEFAULT_MULTIPLE_YAKUMAN,
  DEFAULT_NORTH,
  DEFAULT_OPEN_RIICHI,
  DEFAULT_PURE_CHUREN_DOUBLE_YAKUMAN,
  DEFAULT_RED,
  DEFAULT_ROUNDED_MANGAN,
  DEFAULT_RULE,
  DEFAULT_SUANKO_TANKI_DOUBLE_YAKUMAN,
  DEFAULT_TSUMO_LOSS,
  HONBA_POINT_MAX,
  HONBA_POINT_MIN,
  HONBA_POINT_STEP,
  type Rule,
  type RuleIssueKey,
  compareRules,
  createDefaultRule,
  isValidRule,
  redCountOf,
  validateRule
} from './rule';
import { RULE_ITEMS } from './rule-items';

const ALL_RULE_KEYS: readonly RuleIssueKey[] = [
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
];

describe('B1: ルール項目の拡張 (B1-R01〜B1-R09)', () => {
  // 出典: mahjong-rules.md の各節の太字(所定値)
  test('B1-R01: DEFAULT_RULE の全17項目が仕様の所定値と一致する', () => {
    expect(DEFAULT_RULE.red).toBe(DEFAULT_RED);
    expect(DEFAULT_RULE.red).toBe(1);
    expect(DEFAULT_RULE.honbaPoint).toBe(DEFAULT_HONBA_POINT);
    expect(DEFAULT_RULE.honbaPoint).toBe(200);
    expect(DEFAULT_RULE.depositPoint).toBe(DEFAULT_DEPOSIT_POINT);
    expect(DEFAULT_RULE.depositPoint).toBe(1000);
    expect(DEFAULT_RULE.ippatsu).toBe(DEFAULT_IPPATSU);
    expect(DEFAULT_RULE.ippatsu).toBe(true);
    expect(DEFAULT_RULE.kuitan).toBe(DEFAULT_KUITAN);
    expect(DEFAULT_RULE.kuitan).toBe(true);
    expect(DEFAULT_RULE.roundedMangan).toBe(DEFAULT_ROUNDED_MANGAN);
    expect(DEFAULT_RULE.roundedMangan).toBe(false);
    expect(DEFAULT_RULE.doubleWindFu).toBe(DEFAULT_DOUBLE_WIND_FU);
    expect(DEFAULT_RULE.doubleWindFu).toBe(4);
    expect(DEFAULT_RULE.accumlatedYakuman).toBe(DEFAULT_ACCUMLATED_YAKUMAN);
    expect(DEFAULT_RULE.accumlatedYakuman).toBe(true);
    expect(DEFAULT_RULE.multipleYakuman).toBe(DEFAULT_MULTIPLE_YAKUMAN);
    expect(DEFAULT_RULE.multipleYakuman).toBe(true);
    expect(DEFAULT_RULE.kokushi13DoubleYakuman).toBe(
      DEFAULT_KOKUSHI13_DOUBLE_YAKUMAN
    );
    expect(DEFAULT_RULE.kokushi13DoubleYakuman).toBe(true);
    expect(DEFAULT_RULE.suankoTankiDoubleYakuman).toBe(
      DEFAULT_SUANKO_TANKI_DOUBLE_YAKUMAN
    );
    expect(DEFAULT_RULE.suankoTankiDoubleYakuman).toBe(true);
    expect(DEFAULT_RULE.daisushiDoubleYakuman).toBe(
      DEFAULT_DAISUSHI_DOUBLE_YAKUMAN
    );
    expect(DEFAULT_RULE.daisushiDoubleYakuman).toBe(true);
    expect(DEFAULT_RULE.pureChurenDoubleYakuman).toBe(
      DEFAULT_PURE_CHUREN_DOUBLE_YAKUMAN
    );
    expect(DEFAULT_RULE.pureChurenDoubleYakuman).toBe(true);
    expect(DEFAULT_RULE.north).toBe(DEFAULT_NORTH);
    expect(DEFAULT_RULE.north).toBe('nukidora');
    expect(DEFAULT_RULE.tsumoLoss).toBe(DEFAULT_TSUMO_LOSS);
    expect(DEFAULT_RULE.tsumoLoss).toBe('loss');
    expect(DEFAULT_RULE.localYaku).toBe(DEFAULT_LOCAL_YAKU);
    expect(DEFAULT_RULE.localYaku).toBe(false);
    expect(DEFAULT_RULE.openRiichi).toBe(DEFAULT_OPEN_RIICHI);
    expect(DEFAULT_RULE.openRiichi).toBe(false);
    expect(Object.keys(DEFAULT_RULE).length).toBe(17);
  });

  // 出典: 設計書 §4.1
  test('B1-R02: createDefaultRule() が DEFAULT_RULE と compareRules で true、かつ別オブジェクト', () => {
    const created = createDefaultRule();
    expect(compareRules(created, DEFAULT_RULE)).toBe(true);
    expect(created).not.toBe(DEFAULT_RULE);
  });

  // 出典: 設計書 §4.1・§5.1
  test('B1-R03: compareRules: DEFAULT_RULE から1項目だけ変えた17通りがすべて false、同値なら true', () => {
    expect(compareRules(DEFAULT_RULE, { ...DEFAULT_RULE })).toBe(true);

    const mutations: Record<keyof Rule, Rule> = {
      red: { ...DEFAULT_RULE, red: 0 },
      honbaPoint: { ...DEFAULT_RULE, honbaPoint: 0 },
      depositPoint: { ...DEFAULT_RULE, depositPoint: 0 },
      ippatsu: { ...DEFAULT_RULE, ippatsu: false },
      kuitan: { ...DEFAULT_RULE, kuitan: false },
      roundedMangan: { ...DEFAULT_RULE, roundedMangan: true },
      doubleWindFu: { ...DEFAULT_RULE, doubleWindFu: 2 },
      accumlatedYakuman: { ...DEFAULT_RULE, accumlatedYakuman: false },
      multipleYakuman: { ...DEFAULT_RULE, multipleYakuman: false },
      kokushi13DoubleYakuman: {
        ...DEFAULT_RULE,
        kokushi13DoubleYakuman: false
      },
      suankoTankiDoubleYakuman: {
        ...DEFAULT_RULE,
        suankoTankiDoubleYakuman: false
      },
      daisushiDoubleYakuman: {
        ...DEFAULT_RULE,
        daisushiDoubleYakuman: false
      },
      pureChurenDoubleYakuman: {
        ...DEFAULT_RULE,
        pureChurenDoubleYakuman: false
      },
      north: { ...DEFAULT_RULE, north: 'yakuhai' },
      tsumoLoss: { ...DEFAULT_RULE, tsumoLoss: 'north-split' },
      localYaku: { ...DEFAULT_RULE, localYaku: true },
      openRiichi: { ...DEFAULT_RULE, openRiichi: true }
    };

    for (const key of ALL_RULE_KEYS) {
      expect(compareRules(DEFAULT_RULE, mutations[key])).toBe(false);
    }
  });

  // 出典: 設計書 §4.3
  test('B1-R04: validateRule(DEFAULT_RULE) が空', () => {
    expect(validateRule(DEFAULT_RULE)).toEqual([]);
    expect(isValidRule(DEFAULT_RULE)).toBe(true);
  });

  // 出典: mahjong-rules.md §3.2 (本場: 0〜10000の200点単位)
  test('B1-R05: 本場: 0・200・10000 は通過、-200・100・10200・200.5・"200" は honbaPoint の issue', () => {
    expect(validateRule({ ...DEFAULT_RULE, honbaPoint: 0 })).toEqual([]);
    expect(validateRule({ ...DEFAULT_RULE, honbaPoint: 200 })).toEqual([]);
    expect(validateRule({ ...DEFAULT_RULE, honbaPoint: 10000 })).toEqual([]);

    const invalidCases = [-200, 100, 10200, 200.5, '200'];
    for (const invalid of invalidCases) {
      const issues = validateRule({
        ...DEFAULT_RULE,
        honbaPoint: invalid as unknown as number
      });
      expect(issues.length).toBe(1);
      expect(issues[0]?.key).toBe('honbaPoint');
    }
  });

  // 出典: mahjong-rules.md §3.2 (供託: 0〜10000の100点単位)
  test('B1-R06: 供託: 0・100・10000 は通過、-100・50・10100・100.5 は depositPoint の issue', () => {
    expect(validateRule({ ...DEFAULT_RULE, depositPoint: 0 })).toEqual([]);
    expect(validateRule({ ...DEFAULT_RULE, depositPoint: 100 })).toEqual([]);
    expect(validateRule({ ...DEFAULT_RULE, depositPoint: 10000 })).toEqual([]);

    const invalidCases = [-100, 50, 10100, 100.5];
    for (const invalid of invalidCases) {
      const issues = validateRule({
        ...DEFAULT_RULE,
        depositPoint: invalid as unknown as number
      });
      expect(issues.length).toBe(1);
      expect(issues[0]?.key).toBe('depositPoint');
    }
  });

  // 出典: 設計書 §4.3・§5.1
  test('B1-R07: 不正な値および欠落の検証', () => {
    // 個別項目の不正値
    const singleInvalidCases: {
      key: RuleIssueKey;
      rule: Record<string, unknown>;
    }[] = [
      { key: 'red', rule: { ...DEFAULT_RULE, red: 3 } },
      {
        key: 'red',
        rule: { ...DEFAULT_RULE, red: { m: 0, p: 1, s: 1 } }
      },
      { key: 'tsumoLoss', rule: { ...DEFAULT_RULE, tsumoLoss: 'x' } },
      { key: 'doubleWindFu', rule: { ...DEFAULT_RULE, doubleWindFu: 3 } },
      { key: 'north', rule: { ...DEFAULT_RULE, north: 'x' } },
      { key: 'ippatsu', rule: { ...DEFAULT_RULE, ippatsu: 1 } }
    ];

    for (const { key, rule } of singleInvalidCases) {
      const issues = validateRule(rule);
      expect(issues.length).toBe(1);
      expect(issues[0]?.key).toBe(key);
    }

    // 項目欠落: 17項目それぞれ欠落させた場合に該当keyのissueが1件
    for (const key of ALL_RULE_KEYS) {
      const copy = { ...DEFAULT_RULE } as Record<string, unknown>;
      delete copy[key];
      const issues = validateRule(copy);
      expect(issues.length).toBe(1);
      expect(issues[0]?.key).toBe(key);
    }

    // オブジェクト以外
    const nonObjectCases = [null, [], 42, 'x'];
    for (const invalid of nonObjectCases) {
      const issues = validateRule(invalid);
      expect(issues.length).toBe(17);
      const keys = issues.map(i => i.key).sort();
      expect(keys).toEqual([...ALL_RULE_KEYS].sort());
    }
  });

  // 出典: 設計書 §4.7・§5.1
  test('B1-R08: RULE_ITEMS の全17キー一致・defaultValue一致・範囲定数一致', () => {
    const itemKeys = RULE_ITEMS.map(i => i.key);
    expect(itemKeys.length).toBe(17);
    expect(new Set(itemKeys).size).toBe(17);
    expect(itemKeys.slice().sort()).toEqual([...ALL_RULE_KEYS].sort());

    for (const item of RULE_ITEMS) {
      expect(item.defaultValue).toBe(DEFAULT_RULE[item.key]);
      if (item.key === 'honbaPoint' && item.kind === 'number') {
        expect(item.min).toBe(HONBA_POINT_MIN);
        expect(item.max).toBe(HONBA_POINT_MAX);
        expect(item.step).toBe(HONBA_POINT_STEP);
        expect(item.unit).toBe('点');
      }
      if (item.key === 'depositPoint' && item.kind === 'number') {
        expect(item.min).toBe(DEPOSIT_POINT_MIN);
        expect(item.max).toBe(DEPOSIT_POINT_MAX);
        expect(item.step).toBe(DEPOSIT_POINT_STEP);
        expect(item.unit).toBe('点');
      }
    }
  });

  // 出典: mahjong-rules.md §1 (赤ドラ: 5p・5sのみ。萬子は存在しない)
  test('B1-R09: redCountOf の動作確認', () => {
    expect(redCountOf(0, 'p')).toBe(0);
    expect(redCountOf(1, 'p')).toBe(1);
    expect(redCountOf(2, 's')).toBe(2);
    expect(redCountOf(2, 'm')).toBe(0);
    expect(redCountOf(2, 'z')).toBe(0);
  });
});
