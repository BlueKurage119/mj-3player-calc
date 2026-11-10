import type { RuleItem } from '../../core/rule-items';

type RuleKey = RuleItem['key'];

export const BASIC_RULE_KEYS: readonly RuleKey[] = [
  'red',
  'kuitan',
  'ippatsu',
  'north',
  'tsumoLoss'
];

export interface DetailRuleSubgroup {
  id: string;
  title: string;
  note?: string;
  keys: readonly RuleKey[];
}

export interface DetailRuleGroup {
  id: string;
  title: string;
  keys: readonly RuleKey[];
  subgroups?: readonly DetailRuleSubgroup[]; // keys の後に描画
}

/** 【仮】グループ分けは後日ユーザーが決める。差し替えはこの配列だけで済むこと */
export const DETAIL_RULE_GROUPS: readonly DetailRuleGroup[] = [
  {
    id: 'points',
    title: '点数',
    keys: ['honbaPoint', 'depositPoint', 'roundedMangan', 'doubleWindFu']
  },
  {
    id: 'yakuman',
    title: '役満',
    keys: ['accumlatedYakuman', 'multipleYakuman'],
    subgroups: [
      {
        id: 'double-yakuman',
        title: 'ダブル役満',
        note: 'オフのときは役満',
        keys: [
          'kokushi13DoubleYakuman',
          'suankoTankiDoubleYakuman',
          'daisushiDoubleYakuman',
          'pureChurenDoubleYakuman'
        ]
      }
    ]
  },
  { id: 'local', title: 'ローカル', keys: ['openRiichi', 'localYaku'] }
];

export const DETAIL_RULE_KEYS: readonly RuleKey[] = DETAIL_RULE_GROUPS.flatMap(
  g => [...g.keys, ...(g.subgroups ?? []).flatMap(s => s.keys)]
);
