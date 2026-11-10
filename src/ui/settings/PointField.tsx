import { useEffect, useState } from 'react';
import type React from 'react';
import type { NumberRuleItem } from '../../core/rule-items';
import { ruleItemLabel } from './rule-help';
import { commitPointValue, sanitizeDigits } from './settings-logic';

export interface PointFieldProps {
  item: NumberRuleItem;
  value: number;
  onCommit: (value: number) => void;
}

export function PointField({
  item,
  value,
  onCommit
}: PointFieldProps): React.JSX.Element {
  const [draft, setDraft] = useState(String(value));

  // 外部からの value 変更 (± やプリセット戻し) に draft を同期
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const handleCommit = (raw: string) => {
    const next = commitPointValue(raw, item, value);
    onCommit(next);
    // 確定のたびに必ず draft を確定値の文字列表現へ同期
    setDraft(String(next));
  };

  const handleMinus = () => {
    const next = Math.max(item.min, value - item.step);
    onCommit(next);
    setDraft(String(next));
  };

  const handlePlus = () => {
    const next = Math.min(item.max, value + item.step);
    onCommit(next);
    setDraft(String(next));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(sanitizeDigits(e.target.value));
  };

  const handleBlur = () => {
    handleCommit(draft);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const isMin = value <= item.min;
  const isMax = value >= item.max;

  return (
    /* biome-ignore lint/a11y/useSemanticElements: 設計書 §4.5 で指定された WAI-ARIA group パターンのため */
    <div
      role="group"
      aria-label={ruleItemLabel(item)}
      className="settings-point-field"
    >
      <button
        type="button"
        className="settings-point-field__btn"
        aria-label={`${ruleItemLabel(item)}を減らす`}
        disabled={isMin}
        onClick={handleMinus}
      >
        −
      </button>
      <div className="settings-point-field__input-wrapper">
        <input
          type="text"
          inputMode="numeric"
          aria-label={ruleItemLabel(item)}
          maxLength={5}
          className="settings-point-field__input tabular-nums"
          value={draft}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
        <span
          className="settings-point-field__unit tabular-nums"
          aria-hidden="true"
        >
          {item.unit}
        </span>
      </div>
      <button
        type="button"
        className="settings-point-field__btn"
        aria-label={`${ruleItemLabel(item)}を増やす`}
        disabled={isMax}
        onClick={handlePlus}
      >
        +
      </button>
    </div>
  );
}
