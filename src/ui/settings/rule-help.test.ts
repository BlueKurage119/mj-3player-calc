import { describe, expect, it } from 'vitest';
import { RULE_HELP_TEXTS, TSUMO_LOSS_DESCRIPTIONS } from './rule-help';

describe('D6-rule-help (§4.4)', () => {
  it('D6-rule-help-keys: help対象キーがツモ損を除く7項目と完全に一致する', () => {
    const keys = Object.keys(RULE_HELP_TEXTS).sort();
    const expectedKeys = [
      'depositPoint',
      'doubleWindFu',
      'honbaPoint',
      'localYaku',
      'north',
      'openRiichi',
      'red'
    ].sort();

    expect(keys).toEqual(expectedKeys);
  });

  it('D6-rule-help-excludes: roundedMangan・multipleYakuman を含まない', () => {
    expect('roundedMangan' in RULE_HELP_TEXTS).toBe(false);
    expect('multipleYakuman' in RULE_HELP_TEXTS).toBe(false);
  });

  it('D6-rule-help-tsumoloss: ツモ損は help 対象外で、説明は3選択肢ぶん docs 確定文言で用意される', () => {
    expect('tsumoLoss' in RULE_HELP_TEXTS).toBe(false);
    expect(TSUMO_LOSS_DESCRIPTIONS).toEqual({
      loss: '通常どおり計算し、北家の負担分は誰も払わない',
      'north-split': '北家の負担額を、ツモられた2人で折半して上乗せする',
      'ron-split': 'ロンの打点を、親子に関わらず2人で折半して支払う'
    });
  });
});
