/**
 * ルールプリセット定義と一致判定
 *
 * 出典: docs/mahjong-rules.md 冒頭 (段位戦ルールの値は所定値)
 */

import { compareRules, DEFAULT_RULE, type Rule } from './rule';

export type RulePresetId = 'ranked';

export interface RulePreset {
  id: RulePresetId;
  /** UI 表示名 */
  name: string;
  rule: Readonly<Rule>;
}

export const RULE_PRESETS: readonly Readonly<RulePreset>[] = Object.freeze([
  Object.freeze({
    id: 'ranked',
    name: '段位戦ルール',
    rule: DEFAULT_RULE
  })
]);

export const findRulePreset = (
  rule: Readonly<Rule>
): RulePresetId | 'custom' => {
  for (const preset of RULE_PRESETS) {
    if (compareRules(rule, preset.rule)) {
      return preset.id;
    }
  }
  return 'custom';
};
