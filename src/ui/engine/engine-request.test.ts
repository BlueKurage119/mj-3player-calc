import { describe, expect, it } from 'vitest';
import { createDefaultRule } from '../../core/rule';
import { createInitialState } from '../state';
import { isSlowRun } from './engine-estimate';
import { ENGINE_DRAWS, buildEngineRequest, engineKey } from './engine-request';

const base = () => {
  const s = createInitialState(createDefaultRule());
  return {
    ...s,
    input: { ...s.input, hand: [{ type: 'z' as const, n: 1 as const }] }
  };
};

describe('U-4: buildEngineRequest', () => {
  it('概算(M=0): options は {tegawari:true, backtrack:true, diffSlack:0, oneShantenSlack:true}、remainingDraws は 18', () => {
    const req = buildEngineRequest(7, base(), {
      detailed: false,
      draws: ENGINE_DRAWS
    });
    expect(req.id).toBe(7);
    expect(req.remainingDraws).toBe(18);
    expect(req.options).toEqual({
      tegawari: true,
      backtrack: true,
      diffSlack: 0,
      oneShantenSlack: true
    });
  });

  it('手替わりを詳しく(M=1): diffSlack が 1、そのほかは同じ', () => {
    const req = buildEngineRequest(1, base(), {
      detailed: true,
      draws: ENGINE_DRAWS
    });
    expect(req.options).toEqual({
      tegawari: true,
      backtrack: true,
      diffSlack: 1,
      oneShantenSlack: true
    });
  });

  it('入力・ルール・状況は AppState のものをそのまま渡す', () => {
    const s = base();
    const req = buildEngineRequest(1, s, { detailed: false, draws: 18 });
    expect(req.input).toBe(s.input);
    expect(req.rule).toBe(s.rule);
    expect(req.table).toBe(s.table);
  });
});

describe('engineKey', () => {
  const c = { detailed: false, draws: 18 };
  it('同じ入力・条件では一致し、手牌・状況・ルール・計算方法が違えば不一致', () => {
    const s = base();
    expect(engineKey(s, c)).toBe(engineKey({ ...s }, { ...c }));
    expect(
      engineKey({ ...s, input: { ...s.input, hand: [{ type: 'z', n: 2 }] } }, c)
    ).not.toBe(engineKey(s, c));
    expect(engineKey({ ...s, table: { ...s.table, continue: 1 } }, c)).not.toBe(
      engineKey(s, c)
    );
    expect(
      engineKey({ ...s, rule: { ...s.rule, kuitan: !s.rule.kuitan } }, c)
    ).not.toBe(engineKey(s, c));
    expect(engineKey(s, { ...c, detailed: true })).not.toBe(engineKey(s, c));
  });
});

describe('U-9: isSlowRun(t3-静的。実測 E-1・E-1b と Issue 138 の製造記録 §2・§3 に基づく表)', () => {
  it('13枚: 概算は常に非該当、詳しくは3向聴だけ該当(2向聴は約2秒で非該当)', () => {
    for (let s = 0; s <= 3; s++) {
      expect(isSlowRun({ detailed: false, size: 13, startShanten: s })).toBe(
        false
      );
    }
    expect(isSlowRun({ detailed: true, size: 13, startShanten: 2 })).toBe(
      false
    );
    expect(isSlowRun({ detailed: true, size: 13, startShanten: 3 })).toBe(true);
  });

  it('14枚: 詳しくは開始向聴1〜3で該当、概算は開始向聴2だけ該当', () => {
    expect(isSlowRun({ detailed: true, size: 14, startShanten: 1 })).toBe(true);
    expect(isSlowRun({ detailed: true, size: 14, startShanten: 3 })).toBe(true);
    expect(isSlowRun({ detailed: false, size: 14, startShanten: 2 })).toBe(
      true
    );
    expect(isSlowRun({ detailed: false, size: 14, startShanten: 1 })).toBe(
      false
    );
  });
});
