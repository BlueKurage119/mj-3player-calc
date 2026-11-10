import { describe, expect, it } from 'vitest';
import {
  INITIAL_TOOLTIP_STATE,
  type TooltipState,
  computeTooltipShiftX,
  reduceTooltip
} from './tooltip-logic';

describe('D6-tooltip-logic (§4.4)', () => {
  it('D6-tooltip-click: click で開閉トグルおよび別 id への切替 (同時1つ)', () => {
    // 1. 初期状態から click で開く
    const s1 = reduceTooltip(INITIAL_TOOLTIP_STATE, {
      type: 'click',
      id: 'tip1'
    });
    expect(s1).toEqual({ openId: 'tip1', via: 'click' });

    // 2. 同じ id を click すると閉じる
    const s2 = reduceTooltip(s1, { type: 'click', id: 'tip1' });
    expect(s2).toEqual({ openId: null, via: null });

    // 3. 別の id を click するとその id に切り替わる (同時1つ)
    const s3 = reduceTooltip(s1, { type: 'click', id: 'tip2' });
    expect(s3).toEqual({ openId: 'tip2', via: 'click' });
  });

  it('D6-tooltip-hover-focus: hover-enter/focus-visible で開き、hover-leave/blur で閉じる', () => {
    // hover-enter
    const sHover = reduceTooltip(INITIAL_TOOLTIP_STATE, {
      type: 'hover-enter',
      id: 'tip1'
    });
    expect(sHover).toEqual({ openId: 'tip1', via: 'hover' });

    // hover-leave (該当 id かつ via hover) で閉じる
    const sLeave = reduceTooltip(sHover, {
      type: 'hover-leave',
      id: 'tip1'
    });
    expect(sLeave).toEqual({ openId: null, via: null });

    // focus-visible
    const sFocus = reduceTooltip(INITIAL_TOOLTIP_STATE, {
      type: 'focus-visible',
      id: 'tip2'
    });
    expect(sFocus).toEqual({ openId: 'tip2', via: 'focus' });

    // blur (該当 id かつ via focus) で閉じる
    const sBlur = reduceTooltip(sFocus, { type: 'blur', id: 'tip2' });
    expect(sBlur).toEqual({ openId: null, via: null });
  });

  it('D6-tooltip-click-persist: hover-leave/blur は click で開いたものを閉じない', () => {
    const sClick: TooltipState = { openId: 'tip1', via: 'click' };

    // hover-leave でも閉じない
    const sAfterLeave = reduceTooltip(sClick, {
      type: 'hover-leave',
      id: 'tip1'
    });
    expect(sAfterLeave).toEqual(sClick);

    // blur でも閉じない
    const sAfterBlur = reduceTooltip(sClick, { type: 'blur', id: 'tip1' });
    expect(sAfterBlur).toEqual(sClick);

    // 異なる id に対する hover-leave/blur は何の影響も与えない
    const sHover: TooltipState = { openId: 'tip1', via: 'hover' };
    const sDiffLeave = reduceTooltip(sHover, {
      type: 'hover-leave',
      id: 'tip2'
    });
    expect(sDiffLeave).toEqual(sHover);
  });

  it('D6-tooltip-dismiss: escape・outside-pointerdown で閉じる', () => {
    const sClick: TooltipState = { openId: 'tip1', via: 'click' };
    expect(reduceTooltip(sClick, { type: 'escape' })).toEqual({
      openId: null,
      via: null
    });
    expect(reduceTooltip(sClick, { type: 'outside-pointerdown' })).toEqual({
      openId: null,
      via: null
    });

    const sHover: TooltipState = { openId: 'tip2', via: 'hover' };
    expect(reduceTooltip(sHover, { type: 'escape' })).toEqual({
      openId: null,
      via: null
    });
    expect(reduceTooltip(sHover, { type: 'outside-pointerdown' })).toEqual({
      openId: null,
      via: null
    });
  });
});

describe('computeTooltipShiftX', () => {
  it('D6-収まっていれば補正しない', () => {
    expect(computeTooltipShiftX({ left: 50, right: 300 }, 375)).toBe(0);
  });
  it('D6-右にはみ出すと左へ寄せ right が幅-16 になる', () => {
    expect(computeTooltipShiftX({ left: 175, right: 455 }, 375)).toBe(-96);
  });
  it('D6-左にはみ出すと右へ寄せ left が16 になる', () => {
    expect(computeTooltipShiftX({ left: -10, right: 200 }, 375)).toBe(26);
  });
  it('D6-狭い幅でも左端 16px を優先する', () => {
    expect(computeTooltipShiftX({ left: 10, right: 330 }, 320)).toBe(6);
  });
});
