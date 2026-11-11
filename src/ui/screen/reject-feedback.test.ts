import { describe, expect, it } from 'vitest';
import {
  type RejectAnimatable,
  evaluateRejectFeedback,
  triggerRejectAnimation
} from './reject-feedback';

class MockElement implements RejectAnimatable {
  attributes = new Set<string>();
  listeners: Record<string, ((e: { target: unknown }) => void)[]> = {};
  offsetWidth = 100;
  reflowCount = 0;

  get width(): number {
    this.reflowCount++;
    return this.offsetWidth;
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  setAttribute(name: string, _value: string): void {
    this.attributes.add(name);
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  addEventListener(
    type: string,
    listener: (e: { target: unknown }) => void
  ): void {
    this.listeners[type] = this.listeners[type] ?? [];
    this.listeners[type]?.push(listener);
  }

  removeEventListener(
    type: string,
    listener: (e: { target: unknown }) => void
  ): void {
    const list = this.listeners[type] ?? [];
    this.listeners[type] = list.filter(l => l !== listener);
  }

  dispatchAnimationEnd(): void {
    const list = [...(this.listeners.animationend ?? [])];
    for (const fn of list) {
      fn({ target: this });
    }
  }
}

describe('D7-C8: reject-feedback ロジック (確定事項 K10)', () => {
  it('triggerRejectAnimation: data-reject を一度外して再付与し、animationend で外れる', () => {
    const el = new MockElement();
    el.setAttribute('data-reject', '');
    expect(el.hasAttribute('data-reject')).toBe(true);

    triggerRejectAnimation(el);
    // 外されてから再付与されていること
    expect(el.hasAttribute('data-reject')).toBe(true);

    // animationend で外れること
    el.dispatchAnimationEnd();
    expect(el.hasAttribute('data-reject')).toBe(false);
  });

  it('evaluateRejectFeedback: 初回マウントでは発火しない', () => {
    const el = new MockElement();
    const result = evaluateRejectFeedback({
      isInitialMount: true,
      rejectSeq: 0,
      prevSeq: 0,
      isTarget: true,
      element: el
    });
    expect(result.triggered).toBe(false);
    expect(result.nextPrevSeq).toBe(0);
    expect(el.hasAttribute('data-reject')).toBe(false);
  });

  it('evaluateRejectFeedback: rejectSeq 増加時に対象カードに付き、非対象カードには付かない', () => {
    const targetEl = new MockElement();
    const nonTargetEl = new MockElement();

    // 対象カード: 発火し data-reject が付く
    const targetResult = evaluateRejectFeedback({
      isInitialMount: false,
      rejectSeq: 1,
      prevSeq: 0,
      isTarget: true,
      element: targetEl
    });
    expect(targetResult.triggered).toBe(true);
    expect(targetResult.nextPrevSeq).toBe(1);
    expect(targetEl.hasAttribute('data-reject')).toBe(true);

    // 非対象カード: 発火せず data-reject が付かない
    const nonTargetResult = evaluateRejectFeedback({
      isInitialMount: false,
      rejectSeq: 1,
      prevSeq: 0,
      isTarget: false,
      element: nonTargetEl
    });
    expect(nonTargetResult.triggered).toBe(false);
    expect(nonTargetResult.nextPrevSeq).toBe(1);
    expect(nonTargetEl.hasAttribute('data-reject')).toBe(false);

    // rejectSeq が不変なら発火しない
    const unchangedResult = evaluateRejectFeedback({
      isInitialMount: false,
      rejectSeq: 1,
      prevSeq: 1,
      isTarget: true,
      element: targetEl
    });
    expect(unchangedResult.triggered).toBe(false);
  });
});
