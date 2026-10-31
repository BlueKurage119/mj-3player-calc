import { describe, expect, test } from 'vitest';
import {
  createDefaultRule,
  DEFAULT_ACCUMLATED_YAKUMAN,
  DEFAULT_DAISUSHI_DOUBLE_YAKUMAN,
  DEFAULT_DEPOSIT_POINT,
  DEFAULT_HONBA_POINT,
  DEFAULT_IPPATSU,
  DEFAULT_KOKUSHI13_DOUBLE_YAKUMAN,
  DEFAULT_KUITAN,
  DEFAULT_LOCAL_YAKU,
  DEFAULT_MULTIPLE_YAKUMAN,
  DEFAULT_OPEN_RIICHI,
  DEFAULT_PURE_CHUREN_DOUBLE_YAKUMAN,
  DEFAULT_ROUNDED_MANGAN,
  DEFAULT_RULE,
  DEFAULT_SUANKO_TANKI_DOUBLE_YAKUMAN,
  DEPOSIT_POINT_STEP,
  HONBA_POINT_STEP,
  type Rule
} from './rule';
import { findRulePreset, RULE_PRESETS } from './rule-preset';

describe('B3: ルールプリセット (B3-P01〜B3-P06)', () => {
  test('B3-P01: RULE_PRESETS の構成', () => {
    expect(RULE_PRESETS).toHaveLength(1);
    expect(RULE_PRESETS[0]?.id).toBe('ranked');
    expect(RULE_PRESETS[0]?.name).toBe('段位戦ルール');
  });

  test('B3-P02: 段位戦ルールが DEFAULT_RULE を参照', () => {
    expect(RULE_PRESETS[0]?.rule).toBe(DEFAULT_RULE);
  });

  test('B3-P03: 既定ルールの判定', () => {
    expect(findRulePreset(createDefaultRule())).toBe('ranked');
  });

  const cases: [keyof Rule, Rule][] = [
    ['red', { ...createDefaultRule(), red: 0 }],
    [
      'honbaPoint',
      {
        ...createDefaultRule(),
        honbaPoint: DEFAULT_HONBA_POINT + HONBA_POINT_STEP
      }
    ],
    [
      'depositPoint',
      {
        ...createDefaultRule(),
        depositPoint: DEFAULT_DEPOSIT_POINT + DEPOSIT_POINT_STEP
      }
    ],
    ['ippatsu', { ...createDefaultRule(), ippatsu: !DEFAULT_IPPATSU }],
    ['kuitan', { ...createDefaultRule(), kuitan: !DEFAULT_KUITAN }],
    [
      'roundedMangan',
      { ...createDefaultRule(), roundedMangan: !DEFAULT_ROUNDED_MANGAN }
    ],
    ['doubleWindFu', { ...createDefaultRule(), doubleWindFu: 2 }],
    [
      'accumlatedYakuman',
      {
        ...createDefaultRule(),
        accumlatedYakuman: !DEFAULT_ACCUMLATED_YAKUMAN
      }
    ],
    [
      'multipleYakuman',
      { ...createDefaultRule(), multipleYakuman: !DEFAULT_MULTIPLE_YAKUMAN }
    ],
    [
      'kokushi13DoubleYakuman',
      {
        ...createDefaultRule(),
        kokushi13DoubleYakuman: !DEFAULT_KOKUSHI13_DOUBLE_YAKUMAN
      }
    ],
    [
      'suankoTankiDoubleYakuman',
      {
        ...createDefaultRule(),
        suankoTankiDoubleYakuman: !DEFAULT_SUANKO_TANKI_DOUBLE_YAKUMAN
      }
    ],
    [
      'daisushiDoubleYakuman',
      {
        ...createDefaultRule(),
        daisushiDoubleYakuman: !DEFAULT_DAISUSHI_DOUBLE_YAKUMAN
      }
    ],
    [
      'pureChurenDoubleYakuman',
      {
        ...createDefaultRule(),
        pureChurenDoubleYakuman: !DEFAULT_PURE_CHUREN_DOUBLE_YAKUMAN
      }
    ],
    ['north', { ...createDefaultRule(), north: 'yakuhai' }],
    ['tsumoLoss', { ...createDefaultRule(), tsumoLoss: 'north-split' }],
    ['localYaku', { ...createDefaultRule(), localYaku: !DEFAULT_LOCAL_YAKU }],
    ['openRiichi', { ...createDefaultRule(), openRiichi: !DEFAULT_OPEN_RIICHI }]
  ];

  test.each(cases)('B3-P04: %s', (key, rule) => {
    const defaultKeys = Object.keys(DEFAULT_RULE);
    expect(defaultKeys).toHaveLength(17);
    expect(cases).toHaveLength(17);
    expect(cases.map(([k]) => k).sort()).toEqual([...defaultKeys].sort());
    expect(rule[key]).not.toEqual(DEFAULT_RULE[key]);
    expect(findRulePreset(rule)).toBe('custom');
  });

  test('B3-P05: 不変性', () => {
    expect(Object.isFrozen(RULE_PRESETS)).toBe(true);
    expect(Object.isFrozen(RULE_PRESETS[0])).toBe(true);
  });

  test('B3-P06: 引数を変更しない', () => {
    const original = createDefaultRule();
    const snapshot = { ...original };
    expect(findRulePreset(original)).toBe('ranked');
    expect(original).toEqual(snapshot);

    const frozen = Object.freeze(createDefaultRule());
    expect(() => findRulePreset(frozen)).not.toThrow();
    expect(findRulePreset(frozen)).toBe('ranked');
  });
});
