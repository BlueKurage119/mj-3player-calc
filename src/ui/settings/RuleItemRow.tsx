import type React from 'react';
import type { Rule } from '../../core/rule';
import type { RuleItem } from '../../core/rule-items';
import { ConnectedButtonGroup } from '../expressive/ConnectedButtonGroup';
import { Switch } from '../md';
import { HelpTooltip } from './HelpTooltip';
import { PointField } from './PointField';
import { TsumoLossRow } from './TsumoLossRow';
import { RULE_HELP_TEXTS, ruleItemLabel } from './rule-help';
import { choiceOptions, choiceValue, resolveChoice } from './settings-logic';

export interface RuleItemRowProps {
  item: RuleItem;
  rule: Rule;
  onRuleValueChange: <K extends keyof Rule>(key: K, value: Rule[K]) => void;
}

export function RuleItemRow({
  item,
  rule,
  onRuleValueChange
}: RuleItemRowProps): React.JSX.Element {
  const helpText = RULE_HELP_TEXTS[item.key];
  const helpElement = helpText ? (
    <HelpTooltip
      id={`help-${item.key}`}
      label={ruleItemLabel(item)}
      text={helpText}
    />
  ) : null;

  if (item.kind === 'select') {
    if (item.key === 'tsumoLoss') {
      return (
        <TsumoLossRow
          item={item}
          rule={rule}
          onChange={value => {
            onRuleValueChange(item.key, value);
          }}
        />
      );
    }
    return (
      <div className="settings-row settings-row--choice">
        <div className="settings-row__label-group">
          <span className="settings-row__label">{ruleItemLabel(item)}</span>
          {helpElement}
        </div>
        <ConnectedButtonGroup<string>
          label={ruleItemLabel(item)}
          options={choiceOptions(item)}
          value={choiceValue(item, rule)}
          onValueChange={v => {
            const value = resolveChoice(item, v);
            if (value !== undefined) {
              onRuleValueChange(item.key, value as Rule[typeof item.key]);
            }
          }}
        />
      </div>
    );
  }

  if (item.kind === 'switch') {
    return (
      <div className="settings-row settings-row--switch">
        <div className="settings-row__label-group">
          <span className="settings-row__label">{ruleItemLabel(item)}</span>
          {helpElement}
        </div>
        <Switch
          label={ruleItemLabel(item)}
          selected={Boolean(rule[item.key])}
          onSelectedChange={checked => {
            onRuleValueChange(item.key, checked as Rule[typeof item.key]);
          }}
        />
      </div>
    );
  }

  return (
    <div className="settings-row settings-row--point">
      <div className="settings-row__label-group">
        <span className="settings-row__label">{ruleItemLabel(item)}</span>
        {helpElement}
      </div>
      <PointField
        item={item}
        value={Number(rule[item.key])}
        onCommit={val => {
          onRuleValueChange(item.key, val as Rule[typeof item.key]);
        }}
      />
    </div>
  );
}
