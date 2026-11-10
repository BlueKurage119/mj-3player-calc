import { useRef } from 'react';
import type React from 'react';
import {
  handleSituationBodyKey,
  situationLabels,
  useAppDispatch,
  useAppState
} from '../state';

export interface SituationCardContentProps {
  labels: readonly string[];
  selected: boolean;
  onSelect: () => void;
}

export function SituationCardContent({
  labels,
  selected,
  onSelect
}: SituationCardContentProps): React.JSX.Element {
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const handleCardClick = () => {
    bodyRef.current?.focus({ preventScroll: true });
    onSelect();
  };

  const handleBodyKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const res = handleSituationBodyKey(event.key, selected);
    if (res.preventDefault) {
      event.preventDefault();
    }
    if (res.openSheet) {
      onSelect();
    }
  };

  const isEmpty = labels.length === 0;

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: キーボード操作は .situation-card__body(role=button)が担う
    <div
      className={`situation-card${selected ? ' situation-card--selected' : ''}`}
      onClick={handleCardClick}
    >
      <span className="situation-card__title">状況役</span>
      {/* biome-ignore lint/a11y/useSemanticElements: 設計書§6.2で role="button"・tabIndex=0 の指定があるため */}
      <div
        role="button"
        ref={bodyRef}
        tabIndex={0}
        aria-label="状況役を入力"
        className="situation-card__body"
        onKeyDown={handleBodyKeyDown}
      >
        {isEmpty ? (
          <span className="situation-card__empty">なし</span>
        ) : (
          <span>{labels.join('・')}</span>
        )}
      </div>
    </div>
  );
}

export function SituationCard(): React.JSX.Element {
  const { handOptions, table, rule, inputFocus } = useAppState();
  const dispatch = useAppDispatch();
  const selected = inputFocus?.type === 'situation';
  const labels = situationLabels(handOptions, table, rule);

  return (
    <SituationCardContent
      labels={labels}
      selected={selected}
      onSelect={() =>
        dispatch({ type: 'open-sheet', target: { type: 'situation' } })
      }
    />
  );
}
