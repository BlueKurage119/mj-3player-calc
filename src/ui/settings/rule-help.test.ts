import { describe, expect, it } from 'vitest';
import {
  RULE_HELP_TEXTS,
  TSUMO_LOSS_DESCRIPTIONS,
  ruleItemLabel
} from './rule-help';

describe('D6-rule-help (§4.4)', () => {
  it('D6-rule-help-keys: help対象キーが8項目と完全に一致する', () => {
    const keys = Object.keys(RULE_HELP_TEXTS).sort();
    const expectedKeys = [
      'depositPoint',
      'honbaPoint',
      'localYaku',
      'multipleYakuman',
      'north',
      'openRiichi',
      'red',
      'roundedMangan'
    ].sort();

    expect(keys).toEqual(expectedKeys);
  });

  it('D6-rule-help-excludes: 連風牌の雀頭・ツモ損を含まない', () => {
    expect('doubleWindFu' in RULE_HELP_TEXTS).toBe(false);
    expect('tsumoLoss' in RULE_HELP_TEXTS).toBe(false);
  });

  it('D6-rule-help-texts: 監修で確定した文言と、積み棒の表示名', () => {
    expect(RULE_HELP_TEXTS.red).toBe(
      '2枚では各1枚、4枚では各2枚の5筒・5索を赤ドラにします。'
    );
    expect(RULE_HELP_TEXTS.honbaPoint).toBe(
      '0〜10,000点の範囲内で、200の整数倍になるように指定してください。'
    );
    expect(RULE_HELP_TEXTS.depositPoint).toBe(
      '0〜10,000点の範囲内で、100の整数倍になるように指定してください。'
    );
    expect(RULE_HELP_TEXTS.roundedMangan).toBe(
      '基本点1,920点（子のロン7,700点）を満貫にできます。'
    );
    expect(RULE_HELP_TEXTS.multipleYakuman).toBe(
      'オフにすると、点数の高い役満で計算されます。'
    );
    expect(RULE_HELP_TEXTS.north?.split('\n')).toHaveLength(2);
    expect(ruleItemLabel({ key: 'honbaPoint', label: '本場' })).toBe('積み棒');
    expect(ruleItemLabel({ key: 'depositPoint', label: '供託' })).toBe('供託');
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
