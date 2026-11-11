import { type RefObject, useEffect, useRef } from 'react';
import { useRejectSeq } from '../state';

export interface RejectAnimatable {
  offsetWidth: number;
  removeAttribute(name: string): void;
  setAttribute(name: string, value: string): void;
  addEventListener(
    type: string,
    listener: (e: { target: unknown }) => void
  ): void;
  removeEventListener(
    type: string,
    listener: (e: { target: unknown }) => void
  ): void;
}

export function triggerRejectAnimation(el: RejectAnimatable): void {
  el.removeAttribute('data-reject');
  void el.offsetWidth;
  el.setAttribute('data-reject', '');

  const handleAnimationEnd = (e: { target: unknown }) => {
    if (e.target === el) {
      el.removeAttribute('data-reject');
      el.removeEventListener('animationend', handleAnimationEnd);
    }
  };
  el.addEventListener('animationend', handleAnimationEnd);
}

export function evaluateRejectFeedback(params: {
  isInitialMount: boolean;
  rejectSeq: number;
  prevSeq: number;
  isTarget: boolean;
  element: RejectAnimatable | null;
}): { nextPrevSeq: number; triggered: boolean } {
  const { isInitialMount, rejectSeq, prevSeq, isTarget, element } = params;
  if (isInitialMount) {
    return { nextPrevSeq: rejectSeq, triggered: false };
  }
  if (rejectSeq !== prevSeq) {
    if (isTarget && element) {
      triggerRejectAnimation(element);
      return { nextPrevSeq: rejectSeq, triggered: true };
    }
    return { nextPrevSeq: rejectSeq, triggered: false };
  }
  return { nextPrevSeq: prevSeq, triggered: false };
}

export function useRejectFeedback(
  ref: RefObject<HTMLElement | null>,
  isTarget: boolean
): void {
  const rejectSeq = useRejectSeq();
  const prevSeqRef = useRef<number>(rejectSeq);
  const isInitialMount = useRef<boolean>(true);

  useEffect(() => {
    const result = evaluateRejectFeedback({
      isInitialMount: isInitialMount.current,
      rejectSeq,
      prevSeq: prevSeqRef.current,
      isTarget,
      element: ref.current
    });
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
    prevSeqRef.current = result.nextPrevSeq;
  }, [rejectSeq, isTarget, ref]);
}
