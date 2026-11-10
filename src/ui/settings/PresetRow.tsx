import type React from 'react';
import { createDefaultRule, type Rule } from '../../core/rule';
import { RULE_PRESETS, findRulePreset } from '../../core/rule-preset';

export interface PresetRowProps {
  rule: Rule;
  onResetToRanked: (defaultRule: Rule) => void;
}

export function PresetRow({
  rule,
  onResetToRanked
}: PresetRowProps): React.JSX.Element {
  const presetId = findRulePreset(rule);
  const isRanked = presetId === 'ranked';
  const label = isRanked
    ? (RULE_PRESETS[0]?.name ?? '段位戦ルール')
    : 'カスタム';

  return (
    <div className="settings-preset-row">
      <span className="settings-preset-row__label">{label}</span>
      <button
        type="button"
        className="settings-preset-row__reset-btn"
        disabled={isRanked}
        onClick={() => onResetToRanked(createDefaultRule())}
      >
        段位戦ルールに戻す
      </button>
    </div>
  );
}
