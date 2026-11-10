import type React from 'react';
import type { Rule } from '../../core/rule';
import type { RuleItem } from '../../core/rule-items';
import { Select, SelectOption, Switch } from '../md';
import { HelpTooltip } from './HelpTooltip';
import { PointField } from './PointField';
import { RULE_HELP_TEXTS } from './rule-help';

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
    <HelpTooltip id={`help-${item.key}`} label={item.label} text={helpText} />
  ) : null;

  if (item.kind === 'select') {
    return (
      <div className="settings-row settings-row--select">
        <div className="settings-row__select-wrapper">
          <Select
            label={item.label}
            value={String(rule[item.key])}
            onValueChange={v => {
              const opt = item.options.find(o => String(o.value) === v);
              if (opt) {
                onRuleValueChange(item.key, opt.value);
              }
            }}
            className="settings-row__select"
          >
            {item.options.map(opt => (
              <SelectOption key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </SelectOption>
            ))}
          </Select>
        </div>
        {helpElement && <div className="settings-row__help">{helpElement}</div>}
      </div>
    );
  }

  if (item.kind === 'switch') {
    return (
      <div className="settings-row settings-row--switch">
        <div className="settings-row__label-group">
          <span className="settings-row__label">{item.label}</span>
          {helpElement}
        </div>
        <Switch
          label={item.label}
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
        <span className="settings-row__label">{item.label}</span>
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
