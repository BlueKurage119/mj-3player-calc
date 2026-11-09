import { useRef } from 'react';
import type React from 'react';
import type { Tile as CoreTile } from '../../core/tile';
import type { IndicatorTarget } from '../state';
import { useAppDispatch, useAppState } from '../state';
import { Tile } from '../tile';
import { CardClearButton } from './CardClearButton';

export interface IndicatorCardContentProps {
  target: IndicatorTarget;
  tiles: readonly CoreTile[];
  onSelect: () => void;
  onClear: () => void;
}

export function IndicatorCardContent({
  target,
  tiles,
  onSelect,
  onClear
}: IndicatorCardContentProps): React.JSX.Element {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const isDora = target === 'dora';
  const title = isDora ? 'ドラ' : '裏ドラ';
  const inputAriaLabel = isDora ? 'ドラ表示牌を入力' : '裏ドラ表示牌を入力';
  const clearAriaLabel = isDora ? 'ドラ表示牌をクリア' : '裏ドラ表示牌をクリア';

  const isEmpty = tiles.length === 0;

  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const el = event.target as Element | null;
    if (
      el?.closest('.card-clear-zone') ||
      el?.closest('.hand-card__clear-zone')
    ) {
      return;
    }
    bodyRef.current?.focus({ preventScroll: true });
    onSelect();
  };

  const handleClear = () => {
    onClear();
    bodyRef.current?.focus({ preventScroll: true });
  };

  const handleBodyKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: キーボード操作は .indicator-card__body(role=button)が担う
    <div ref={cardRef} className="indicator-card" onClick={handleCardClick}>
      <div className="indicator-card__top-row">
        <span className="indicator-card__title">{title}</span>
        <CardClearButton
          aria-label={clearAriaLabel}
          disabled={isEmpty}
          onClear={handleClear}
        />
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: 設計書2.4で role="button"・tabIndex=0 の指定があるため */}
      <div
        role="button"
        ref={bodyRef}
        tabIndex={0}
        aria-label={inputAriaLabel}
        className="indicator-card__body"
        onKeyDown={handleBodyKeyDown}
      >
        <div className="indicator-card__tiles">
          {tiles.map((tile, index) => {
            const key = `${tile.type}${tile.n}${
              tile.type !== 'z' && tile.n === 5 && tile.red ? 'r' : ''
            }-${index}`;
            return <Tile key={key} tile={tile} />;
          })}
        </div>
      </div>
    </div>
  );
}

export interface IndicatorCardProps {
  target: IndicatorTarget;
}

export function IndicatorCard({
  target
}: IndicatorCardProps): React.JSX.Element {
  const { input } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <IndicatorCardContent
      target={target}
      tiles={input[target]}
      onSelect={() =>
        dispatch({ type: 'open-sheet', target: { type: target } })
      }
      onClear={() => dispatch({ type: 'clear-indicators', target })}
    />
  );
}
