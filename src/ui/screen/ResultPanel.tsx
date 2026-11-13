import { type MutableRefObject, useEffect, useLayoutEffect } from 'react';
import type React from 'react';
import type { ResultState } from '../calc/result-state';
import type { ResultContext } from '../result/hora/HoraDetail';
import { ResultBody } from '../result/ResultBody';
import { classifyResult } from '../result/classify';
import { preloadHoraDetail } from '../result/slots';

export interface ResultPanelProps {
  resultState: ResultState;
  dispatchTimestampRef?: MutableRefObject<number | null> | undefined;
  context?: ResultContext | undefined;
  ref?: React.Ref<HTMLElement> | undefined;
}

export function ResultPanel(props: ResultPanelProps): React.JSX.Element {
  const { resultState, dispatchTimestampRef, context, ref } = props;

  useEffect(() => {
    preloadHoraDetail().catch(() => {});
  }, []);

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
      className={
        view.kind === 'hora' && view.hora.length > 0
          ? 'result-panel result-panel--flat'
          : 'result-panel'
      }
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
          <ResultBody view={view} context={context} />
        )}
      </div>
    </section>
  );
}
