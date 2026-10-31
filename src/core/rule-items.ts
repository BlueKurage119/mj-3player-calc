import {
  DEPOSIT_POINT_MAX,
  DEPOSIT_POINT_MIN,
  DEPOSIT_POINT_STEP,
  DEFAULT_RULE,
  HONBA_POINT_MAX,
  HONBA_POINT_MIN,
  HONBA_POINT_STEP,
  type Rule
} from './rule';

export type SelectRuleKey = 'red' | 'doubleWindFu' | 'north' | 'tsumoLoss';
export type NumberRuleKey = 'honbaPoint' | 'depositPoint';
/** 残り11項目(すべて boolean) */
export type SwitchRuleKey = Exclude<keyof Rule, SelectRuleKey | NumberRuleKey>;

/** K ごとに options[].value と defaultValue を Rule[K] に結びつける写像型 */
export type SelectRuleItem = {
  [K in SelectRuleKey]: {
    key: K;
    kind: 'select';
    label: string;
    options: readonly { value: Rule[K]; label: string }[];
    defaultValue: Rule[K];
  };
}[SelectRuleKey];

export interface SwitchRuleItem {
  key: SwitchRuleKey;
  kind: 'switch';
  label: string;
  defaultValue: boolean;
}

export interface NumberRuleItem {
  key: NumberRuleKey;
  kind: 'number';
  label: string;
  min: number;
  max: number;
  step: number;
  unit: '点';
  defaultValue: number;
}

export type RuleItem = SelectRuleItem | SwitchRuleItem | NumberRuleItem;

export const RULE_ITEMS: readonly RuleItem[] = [
  {
    key: 'red',
    kind: 'select',
    label: '赤ドラ',
    options: [
      { value: 0, label: '赤なし' },
      { value: 1, label: '2枚' },
      { value: 2, label: '4枚' }
    ],
    defaultValue: DEFAULT_RULE.red
  },
  {
    key: 'doubleWindFu',
    kind: 'select',
    label: '連風牌の雀頭',
    options: [
      { value: 4, label: '4符' },
      { value: 2, label: '2符' }
    ],
    defaultValue: DEFAULT_RULE.doubleWindFu
  },
  {
    key: 'north',
    kind: 'select',
    label: '北の扱い',
    options: [
      { value: 'nukidora', label: '抜きドラ' },
      { value: 'yakuhai', label: '共通役牌' }
    ],
    defaultValue: DEFAULT_RULE.north
  },
  {
    key: 'tsumoLoss',
    kind: 'select',
    label: 'ツモ損',
    options: [
      { value: 'loss', label: 'ツモ損あり' },
      { value: 'north-split', label: '北家分折半' },
      { value: 'ron-split', label: 'ロン打点折半' }
    ],
    defaultValue: DEFAULT_RULE.tsumoLoss
  },
  {
    key: 'honbaPoint',
    kind: 'number',
    label: '本場',
    min: HONBA_POINT_MIN,
    max: HONBA_POINT_MAX,
    step: HONBA_POINT_STEP,
    unit: '点',
    defaultValue: DEFAULT_RULE.honbaPoint
  },
  {
    key: 'depositPoint',
    kind: 'number',
    label: '供託',
    min: DEPOSIT_POINT_MIN,
    max: DEPOSIT_POINT_MAX,
    step: DEPOSIT_POINT_STEP,
    unit: '点',
    defaultValue: DEFAULT_RULE.depositPoint
  },
  {
    key: 'ippatsu',
    kind: 'switch',
    label: '一発',
    defaultValue: DEFAULT_RULE.ippatsu
  },
  {
    key: 'kuitan',
    kind: 'switch',
    label: '喰い断',
    defaultValue: DEFAULT_RULE.kuitan
  },
  {
    key: 'roundedMangan',
    kind: 'switch',
    label: '切り上げ満貫',
    defaultValue: DEFAULT_RULE.roundedMangan
  },
  {
    key: 'accumlatedYakuman',
    kind: 'switch',
    label: '数え役満',
    defaultValue: DEFAULT_RULE.accumlatedYakuman
  },
  {
    key: 'multipleYakuman',
    kind: 'switch',
    label: '役満の複合',
    defaultValue: DEFAULT_RULE.multipleYakuman
  },
  {
    key: 'kokushi13DoubleYakuman',
    kind: 'switch',
    label: '国士無双十三面待ち',
    defaultValue: DEFAULT_RULE.kokushi13DoubleYakuman
  },
  {
    key: 'suankoTankiDoubleYakuman',
    kind: 'switch',
    label: '四暗刻単騎',
    defaultValue: DEFAULT_RULE.suankoTankiDoubleYakuman
  },
  {
    key: 'daisushiDoubleYakuman',
    kind: 'switch',
    label: '大四喜',
    defaultValue: DEFAULT_RULE.daisushiDoubleYakuman
  },
  {
    key: 'pureChurenDoubleYakuman',
    kind: 'switch',
    label: '純正九蓮宝燈',
    defaultValue: DEFAULT_RULE.pureChurenDoubleYakuman
  },
  {
    key: 'localYaku',
    kind: 'switch',
    label: 'ローカル役',
    defaultValue: DEFAULT_RULE.localYaku
  },
  {
    key: 'openRiichi',
    kind: 'switch',
    label: 'オープン立直',
    defaultValue: DEFAULT_RULE.openRiichi
  }
];
