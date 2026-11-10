import { useCallback } from 'react';
import type { Rule } from '../../core/rule';
import { saveRule } from '../../core/rule-storage';
import { useAppDispatch, useAppState, useRuleLoadNotice } from '../state';
import { safeLocalStorage } from '../state/rule-persistence';
import { applyRuleChange } from './settings-logic';

export function useRuleSettings(): {
  rule: Rule;
  setRule: (next: Rule) => void;
  setRuleValue: <K extends keyof Rule>(key: K, value: Rule[K]) => void;
} {
  const { rule } = useAppState();
  const dispatch = useAppDispatch();
  const { dismiss } = useRuleLoadNotice();

  const setRule = useCallback(
    (next: Rule) => {
      dispatch({ type: 'set-rule', rule: next });
      const saved = saveRule(safeLocalStorage(), next);
      if (saved) {
        dismiss();
      }
    },
    [dispatch, dismiss]
  );

  const setRuleValue = useCallback(
    <K extends keyof Rule>(key: K, value: Rule[K]) => {
      const { rule: next, saved } = applyRuleChange(
        rule,
        key,
        value,
        safeLocalStorage()
      );
      dispatch({ type: 'set-rule', rule: next });
      if (saved) {
        dismiss();
      }
    },
    [rule, dispatch, dismiss]
  );

  return { rule, setRule, setRuleValue };
}
