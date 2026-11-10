import { describe, expect, it } from 'vitest';
import { createDefaultRule } from '../../core/rule';
import {
  RULE_STORAGE_KEY,
  type RuleStorage,
  serializeRule
} from '../../core/rule-storage';
import {
  createInitialStateFromStorage,
  needsLoadNotice
} from './rule-persistence';

const createMockStorage = (
  initialData: Record<string, string> = {}
): RuleStorage => {
  const map = new Map<string, string>(Object.entries(initialData));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    }
  };
};

describe('D6-rule-persistence (§5.2・§5.3)', () => {
  it('D6-A20-notice: needsLoadNotice の判定条件 (found+reset, found+issues, 未保存, 正常)', () => {
    const defaultRule = createDefaultRule();

    // 1. found + reset (例: JSON破損やバージョン不一致でリセットされた場合)
    expect(
      needsLoadNotice({
        rule: defaultRule,
        issues: [],
        reset: true,
        resetReason: 'parse',
        found: true
      })
    ).toBe(true);

    // 2. found + issues (例: 不正な値があり個別項目が補完された場合)
    expect(
      needsLoadNotice({
        rule: defaultRule,
        issues: [{ key: 'red', message: '赤ドラの枚数は0/1/2のいずれかです' }],
        reset: false,
        resetReason: null,
        found: true
      })
    ).toBe(true);

    // 3. 未保存 (保存データが存在しない場合: found = false)
    expect(
      needsLoadNotice({
        rule: defaultRule,
        issues: [],
        reset: false,
        resetReason: null,
        found: false
      })
    ).toBe(false);

    // 4. 正常 (保存データが存在し、reset も issues もない場合)
    expect(
      needsLoadNotice({
        rule: defaultRule,
        issues: [],
        reset: false,
        resetReason: null,
        found: true
      })
    ).toBe(false);
  });

  it('D6-A20-openRiichi: createInitialStateFromStorage で openRiichi の保存値が初期 rule に反映される (6404a90 revert 担保)', () => {
    const defaultRule = createDefaultRule();

    // openRiichi: false の保存
    const ruleWithOpenFalse = { ...defaultRule, openRiichi: false };
    const storageFalse = createMockStorage({
      [RULE_STORAGE_KEY]: serializeRule(ruleWithOpenFalse)
    });
    const resultFalse = createInitialStateFromStorage(storageFalse);
    expect(resultFalse.state.rule.openRiichi).toBe(false);
    expect(resultFalse.loadNotice).toBe(false);

    // openRiichi: true の保存
    const ruleWithOpenTrue = { ...defaultRule, openRiichi: true };
    const storageTrue = createMockStorage({
      [RULE_STORAGE_KEY]: serializeRule(ruleWithOpenTrue)
    });
    const resultTrue = createInitialStateFromStorage(storageTrue);
    expect(resultTrue.state.rule.openRiichi).toBe(true);
    expect(resultTrue.loadNotice).toBe(false);
  });

  it('D6-A20-localYaku: createInitialStateFromStorage で localYaku の保存値が初期 rule に反映される (6404a90 revert 担保)', () => {
    const defaultRule = createDefaultRule();

    // localYaku: false の保存
    const ruleWithLocalFalse = { ...defaultRule, localYaku: false };
    const storageFalse = createMockStorage({
      [RULE_STORAGE_KEY]: serializeRule(ruleWithLocalFalse)
    });
    const resultFalse = createInitialStateFromStorage(storageFalse);
    expect(resultFalse.state.rule.localYaku).toBe(false);

    // localYaku: true の保存
    const ruleWithLocalTrue = { ...defaultRule, localYaku: true };
    const storageTrue = createMockStorage({
      [RULE_STORAGE_KEY]: serializeRule(ruleWithLocalTrue)
    });
    const resultTrue = createInitialStateFromStorage(storageTrue);
    expect(resultTrue.state.rule.localYaku).toBe(true);
  });

  it('D6-A20-fallback: createInitialStateFromStorage で破損・補完時に loadNotice が true になる', () => {
    // 破損データ (not json)
    const brokenStorage = createMockStorage({
      [RULE_STORAGE_KEY]: 'not json'
    });
    const brokenResult = createInitialStateFromStorage(brokenStorage);
    expect(brokenResult.loadNotice).toBe(true);
    expect(brokenResult.state.rule.openRiichi).toBe(false); // 既定値

    // 個別項目補完 (red: 9)
    const invalidStorage = createMockStorage({
      [RULE_STORAGE_KEY]: JSON.stringify({
        version: 1,
        rule: { ...createDefaultRule(), red: 9 }
      })
    });
    const invalidResult = createInitialStateFromStorage(invalidStorage);
    expect(invalidResult.loadNotice).toBe(true);
    expect(invalidResult.state.rule.red).toBe(createDefaultRule().red);

    // 未保存 (null storage またはキーなし)
    const emptyStorage = createMockStorage();
    const emptyResult = createInitialStateFromStorage(emptyStorage);
    expect(emptyResult.loadNotice).toBe(false);

    const nullResult = createInitialStateFromStorage(null);
    expect(nullResult.loadNotice).toBe(false);
  });
});
