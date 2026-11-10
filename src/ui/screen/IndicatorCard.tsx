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
  selected: boolean;
  buffer: string;
  onSelect: () => void;
  onClear: () => void;
}

export function IndicatorCardContent({
  target,
  tiles,
  selected,
  buffer,
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

  const handleBodyKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) =>
    handleIndicatorBodyKey(event, selected, onSelect);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: キーボード操作は .indicator-card__body(role=button)が担う
    <div
      ref={cardRef}
      className={`indicator-card${selected ? ' indicator-card--selected' : ''}`}
      onClick={handleCardClick}
    >
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
        data-sheet-opener=""
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
          {selected && buffer.length > 0 ? (
            <span className="card-buffer" aria-hidden="true">
              {buffer}‸
            </span>
          ) : null}
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
  const { input, inputFocus, tenkeyBuffer } = useAppState();
  const dispatch = useAppDispatch();
  const selected = inputFocus?.type === target;
  const buffer = selected ? tenkeyBuffer : '';

  return (
    <IndicatorCardContent
      target={target}
      tiles={input[target]}
      selected={selected}
      buffer={buffer}
      onSelect={() =>
        dispatch({ type: 'open-sheet', target: { type: target } })
      }
      onClear={() => dispatch({ type: 'clear-indicators', target })}
    />
  );
}

/** 本体の keydown: 選択中は Enter/Space を素通し(確定事項43)、非選択なら開く */
export function handleIndicatorBodyKey(
  event: { key: string; preventDefault(): void },
  selected: boolean,
  open: () => void
): void {
  if (event.key === 'Enter' || event.key === ' ') {
    if (selected) {
      return;
    }
    event.preventDefault();
    open();
  }
}
