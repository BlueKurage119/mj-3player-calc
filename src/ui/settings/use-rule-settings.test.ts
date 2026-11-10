import { describe, expect, it } from 'vitest';
import { createDefaultRule } from '../../core/rule';
import {
  RULE_STORAGE_KEY,
  type RuleStorage,
  restoreRule
} from '../../core/rule-storage';
import { applyRuleChange } from './settings-logic';

const createMockStorage = (): {
  storage: RuleStorage;
  data: Map<string, string>;
} => {
  const data = new Map<string, string>();
  const storage: RuleStorage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    }
  };
  return { storage, data };
};

const createThrowingStorage = (): RuleStorage => ({
  getItem: () => {
    throw new Error('QuotaExceeded');
  },
  setItem: () => {
    throw new Error('QuotaExceeded');
  }
});

describe('D6-use-rule-settings / applyRuleChange (§5.1)', () => {
  it('D6-applyRuleChange-success: ルール値が更新され、storage に保存される', () => {
    const defaultRule = createDefaultRule();
    const { storage, data } = createMockStorage();

    const result = applyRuleChange(defaultRule, 'kuitan', false, storage);

    // 新しい rule が返される
    expect(result.rule.kuitan).toBe(false);
    expect(result.saved).toBe(true);

    // storage に正しくシリアライズされて保存されている
    const raw = data.get(RULE_STORAGE_KEY);
    expect(raw).toBeDefined();
    const restored = restoreRule(raw ?? null);
    expect(restored.rule.kuitan).toBe(false);
    expect(restored.found).toBe(true);
  });

  it('D6-applyRuleChange-error: storage 例外発生時でも例外を投げず saved: false を返す', () => {
    const defaultRule = createDefaultRule();
    const throwingStorage = createThrowingStorage();

    // 例外がスローされず saved: false が返ること
    const result = applyRuleChange(
      defaultRule,
      'ippatsu',
      false,
      throwingStorage
    );

    expect(result.rule.ippatsu).toBe(false);
    expect(result.saved).toBe(false);
  });

  it('D6-applyRuleChange-nullStorage: storage が null の場合でも saved: false を返す', () => {
    const defaultRule = createDefaultRule();
    const result = applyRuleChange(defaultRule, 'red', 0, null);

    expect(result.rule.red).toBe(0);
    expect(result.saved).toBe(false);
  });
});
