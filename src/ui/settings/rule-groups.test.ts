import { describe, expect, it } from 'vitest';
import { RULE_ITEMS } from '../../core/rule-items';
import {
  BASIC_RULE_KEYS,
  DETAIL_RULE_GROUPS,
  DETAIL_RULE_KEYS
} from './rule-groups';

describe('D6-rule-groups (§4.3)', () => {
  it('D6-rule-groups-coverage: 基本項目と詳細項目の和が RULE_ITEMS と過不足なく一致し重複がない', () => {
    const allRuleItemKeys = RULE_ITEMS.map(item => item.key);
    const combinedKeys = [...BASIC_RULE_KEYS, ...DETAIL_RULE_KEYS];

    // 重複がないこと (Setのサイズと配列の長さが一致)
    const uniqueKeys = new Set(combinedKeys);
    expect(uniqueKeys.size).toBe(combinedKeys.length);

    // RULE_ITEMS のキー総数と一致すること
    expect(uniqueKeys.size).toBe(allRuleItemKeys.length);

    // すべてのキーが含まれていること
    for (const key of allRuleItemKeys) {
      expect(uniqueKeys.has(key)).toBe(true);
    }
  });

  it('D6-rule-groups-basic: 基本項目が設計書 §4.3 (確定3) の5項目である', () => {
    expect(BASIC_RULE_KEYS).toEqual([
      'red',
      'kuitan',
      'ippatsu',
      'north',
      'tsumoLoss'
    ]);
  });

  it('D6-rule-groups-subgroup: 役満グループ内にダブル役満の子セクションが定義されている', () => {
    const yakumanGroup = DETAIL_RULE_GROUPS.find(g => g.id === 'yakuman');
    expect(yakumanGroup).toBeDefined();
    expect(yakumanGroup?.subgroups).toHaveLength(1);

    const doubleYakumanSubgroup = yakumanGroup?.subgroups?.[0];
    expect(doubleYakumanSubgroup?.id).toBe('double-yakuman');
    expect(doubleYakumanSubgroup?.title).toBe('ダブル役満');
    expect(doubleYakumanSubgroup?.note).toBe('オフのときはシングル役満');
    expect(doubleYakumanSubgroup?.keys).toEqual([
      'kokushi13DoubleYakuman',
      'suankoTankiDoubleYakuman',
      'daisushiDoubleYakuman',
      'pureChurenDoubleYakuman'
    ]);
  });
});
