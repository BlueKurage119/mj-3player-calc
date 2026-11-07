import { useRef } from 'react';
import type React from 'react';
import type { Result } from '../../core/result';
import { useInView } from './use-in-view';

export type ResultViewState =
  | { status: 'loading' }
  | { status: 'ok'; result: Result }
  | { status: 'error'; error: unknown };

export interface ResultPanelProps {
  resultState: ResultViewState;
}

export function ResultPanel(props: ResultPanelProps): React.JSX.Element {
  const { resultState } = props;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);

  const isExpanded = useInView(
    sentinelRef,
    { rootMargin: '0px 0px -30% 0px' },
    false
  );
  const viewMode = isExpanded ? 'expanded' : 'banner';

  const contentState =
    resultState.status === 'loading'
      ? 'loading'
      : resultState.status === 'error'
        ? 'error'
        : resultState.result === null
          ? 'empty'
          : 'ok';

  const handleBannerClick = () => {
    if (!isExpanded && sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section
      ref={sectionRef}
      aria-label="計算結果"
      data-view={viewMode}
      data-state={contentState}
      className={`result-panel result-panel--${viewMode}`}
      onClick={!isExpanded ? handleBannerClick : undefined}
      onKeyDown={
        !isExpanded
          ? event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleBannerClick();
              }
            }
          : undefined
      }
      tabIndex={!isExpanded ? 0 : undefined}
    >
      <div
        ref={sentinelRef}
        className="result-panel__sentinel"
        aria-hidden="true"
      />
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
          <div className="result-panel__result">{resultState.result.type}</div>
        )}
      </div>
    </section>
  );
}
