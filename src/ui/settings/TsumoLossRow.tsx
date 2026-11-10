import { useId, useState } from 'react';
import type React from 'react';
import type { Rule } from '../../core/rule';
import type { SelectRuleItem } from '../../core/rule-items';
import { SYMBOL_CHEVRON_RIGHT, SymbolIcon } from '../icons';
import { Dialog, FocusRing, Radio, Ripple } from '../md';
import { TSUMO_LOSS_DESCRIPTIONS } from './rule-help';
import {
  choiceValue,
  currentChoiceLabel,
  resolveChoice
} from './settings-logic';

export interface TsumoLossRowProps {
  item: SelectRuleItem;
  rule: Rule;
  onChange: (value: Rule['tsumoLoss']) => void;
}

export function TsumoLossRow({
  item,
  rule,
  onChange
}: TsumoLossRowProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const groupName = useId();
  const current = choiceValue(item, rule);

  const select = (key: string) => {
    const value = resolveChoice(item, key);
    if (value !== undefined && key !== current) {
      onChange(value as Rule['tsumoLoss']);
    }
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="settings-row settings-row--dialog"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <Ripple />
        <FocusRing />
        <span className="settings-row__label">{item.label}</span>
        <span className="settings-row__value">
          <span>{currentChoiceLabel(item, rule)}</span>
          <SymbolIcon d={SYMBOL_CHEVRON_RIGHT} size="1.5rem" />
        </span>
      </button>
      <Dialog open={open} headline={item.label} onClose={() => setOpen(false)}>
        <div
          role="radiogroup"
          aria-label={item.label}
          className="settings-dialog-options"
        >
          {item.options.map(opt => {
            const key = String(opt.value);
            const radioId = `${groupName}-${key}`;
            const descId = `${radioId}-desc`;
            return (
              <label
                key={key}
                htmlFor={radioId}
                className="settings-dialog-option"
              >
                <Radio
                  id={radioId}
                  name={groupName}
                  value={key}
                  checked={key === current}
                  label={opt.label}
                  describedBy={descId}
                  onCheckedChange={() => select(key)}
                />
                <span className="settings-dialog-option__text">
                  <span className="settings-dialog-option__label">
                    {opt.label}
                  </span>
                  <span id={descId} className="settings-dialog-option__desc">
                    {TSUMO_LOSS_DESCRIPTIONS[opt.value as Rule['tsumoLoss']]}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </Dialog>
    </>
  );
}
