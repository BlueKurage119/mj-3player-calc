import { describe, expect, it } from 'vitest';
import { createDefaultRule } from '../../core/rule';
import { type NumberRuleItem, RULE_ITEMS } from '../../core/rule-items';
import {
  changedDetailLabels,
  commitPointValue,
  formatChangedSummary,
  sanitizeDigits
} from './settings-logic';

describe('D6-settings-logic (§4.3・§4.5)', () => {
  const honbaItem = RULE_ITEMS.find(
    i => i.key === 'honbaPoint'
  ) as NumberRuleItem;
  const depositItem = RULE_ITEMS.find(
    i => i.key === 'depositPoint'
  ) as NumberRuleItem;

  it('D6-logic-commitPointValue: 設計書 §4.5 の例および境界値どおりに切り捨て・clampされる', () => {
    // 本場: min=0, max=10000, step=200
    // 250 → 200 (下側の刻みへ切り捨て)
    expect(commitPointValue('250', honbaItem, 200)).toBe(200);
    // 10200 → 10000 (max で clamp)
    expect(commitPointValue('10200', honbaItem, 200)).toBe(10000);
    // 0 → 0
    expect(commitPointValue('0', honbaItem, 200)).toBe(0);
    // 空欄 → 元の値 (current)
    expect(commitPointValue('', honbaItem, 200)).toBe(200);
    // 負数 → min (0)
    expect(commitPointValue('-50', honbaItem, 200)).toBe(0);

    // 供託: min=0, max=10000, step=1000
    // 1050 → 1000 (下側の刻みへ切り捨て)
    expect(commitPointValue('1050', depositItem, 1000)).toBe(1000);
    // 50 → 0
    expect(commitPointValue('50', depositItem, 1000)).toBe(0);
    // 空欄 → 元の値 (current)
    expect(commitPointValue('', depositItem, 1000)).toBe(1000);
  });

  it('D6-logic-sanitizeDigits: 全角数字・英字・記号が除去され半角数字のみ残る', () => {
    expect(sanitizeDigits('2a5０')).toBe('25');
    expect(sanitizeDigits('abc123xyz')).toBe('123');
    expect(sanitizeDigits('10,000点')).toBe('10000');
    expect(sanitizeDigits('')).toBe('');
  });

  it('D6-logic-changedDetailLabels: 既定値と異なる詳細項目のラベルを DETAIL_RULE_KEYS 順で返す', () => {
    const defaultRule = createDefaultRule();

    // 変更なし
    expect(changedDetailLabels(defaultRule)).toEqual([]);

    // 本場(honbaPoint) と 数え役満(accumlatedYakuman) を変更
    const modifiedRule1 = {
      ...defaultRule,
      honbaPoint: 400,
      accumlatedYakuman: false
    };
    // DETAIL_RULE_KEYS では points グループの honbaPoint が先、yakuman グループの accumlatedYakuman が後
    expect(changedDetailLabels(modifiedRule1)).toEqual(['本場', '数え役満']);

    // 基本項目(赤ドラ)を変更しても詳細には影響しない
    const modifiedRule2 = {
      ...modifiedRule1,
      red: 0 as const
    };
    expect(changedDetailLabels(modifiedRule2)).toEqual(['本場', '数え役満']);
  });

  it('D6-logic-formatChangedSummary: 変更件数に応じたサマリー文字列を生成する (0/1/3/4/5件)', () => {
    // 0件 → null
    expect(formatChangedSummary([])).toBeNull();

    // 1件 → 単一ラベル
    expect(formatChangedSummary(['本場'])).toBe('本場');

    // 3件 → ・区切り
    expect(formatChangedSummary(['本場', '供託', '数え役満'])).toBe(
      '本場・供託・数え役満'
    );

    // 4件 → 先頭3件 + ほか1件
    expect(
      formatChangedSummary(['本場', '供託', '数え役満', '役満の複合'])
    ).toBe('本場・供託・数え役満ほか1件');

    // 5件 → 先頭3件 + ほか2件
    expect(
      formatChangedSummary([
        '本場',
        '供託',
        '数え役満',
        '役満の複合',
        'オープン立直'
      ])
    ).toBe('本場・供託・数え役満ほか2件');
  });
});
