import { describe, expect, it } from 'vitest';
import { RULE_HELP_TEXTS } from './rule-help';

describe('D6-rule-help (§4.4)', () => {
  it('D6-rule-help-keys: help対象キーが設計書 §4.4 の8項目と完全に一致する', () => {
    const keys = Object.keys(RULE_HELP_TEXTS).sort();
    const expectedKeys = [
      'depositPoint',
      'doubleWindFu',
      'honbaPoint',
      'localYaku',
      'north',
      'openRiichi',
      'red',
      'tsumoLoss'
    ].sort();

    expect(keys).toEqual(expectedKeys);
  });

  it('D6-rule-help-excludes: roundedMangan・multipleYakuman を含まない', () => {
    expect('roundedMangan' in RULE_HELP_TEXTS).toBe(false);
    expect('multipleYakuman' in RULE_HELP_TEXTS).toBe(false);
  });
});
