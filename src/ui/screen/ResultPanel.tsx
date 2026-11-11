import { type MutableRefObject, useLayoutEffect } from 'react';
import type React from 'react';
import type { ResultState } from '../calc/result-state';
import { ResultBody } from '../result/ResultBody';
import { classifyResult } from '../result/classify';

export interface ResultPanelProps {
  resultState: ResultState;
  dispatchTimestampRef?: MutableRefObject<number | null> | undefined;
  ref?: React.Ref<HTMLElement> | undefined;
}

export function ResultPanel(props: ResultPanelProps): React.JSX.Element {
  const { resultState, dispatchTimestampRef, ref } = props;

  useLayoutEffect(() => {
    if (import.meta.env.DEV && dispatchTimestampRef) {
      const t0 = dispatchTimestampRef.current;
      if (t0 !== null) {
        dispatchTimestampRef.current = null;
        const ms = performance.now() - t0;
        console.debug('[d1-latency]', ms);
      }
    }
  });

  const contentState =
    resultState.status === 'loading'
      ? 'loading'
      : resultState.status === 'error'
        ? 'error'
        : resultState.result === null
          ? 'empty'
          : 'ok';

  const view = classifyResult(
    resultState.status === 'ok' ? resultState.result : null
  );

  return (
    <section
      ref={ref}
      id="result-panel"
      aria-label="計算結果"
      data-state={contentState}
      className="result-panel"
      style={
        {
          scrollMarginTop: 'calc(var(--app-header-height, 0px) + 0.5rem)'
        } as React.CSSProperties
      }
    >
      <div className="result-panel__body">
        {resultState.status === 'loading' ? (
          <output
            aria-label="読み込み中"
            className="result-panel__loading"
            data-state="loading"
          />
        ) : resultState.status === 'error' ? (
          <p className="result-panel__error">計算できません</p>
        ) : resultState.result === null ? (
          <div className="result-panel__empty" data-state="empty" />
        ) : (
          <ResultBody view={view} />
        )}
      </div>
    </section>
  );
}
