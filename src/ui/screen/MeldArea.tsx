import { useRef } from 'react';
import type React from 'react';
import type { Meld } from '../../core/input';
import type { TileOrBack } from '../../core/tile';
import { SYMBOL_ADD, SymbolIcon } from '../icons';
import { FocusRing, Ripple } from '../md';
import { useAppDispatch, useAppState } from '../state';
import { Tile } from '../tile';
import { CardClearButton } from './CardClearButton';

export const meldTiles = (meld: Meld): TileOrBack[] => {
  if (meld.tile === null) return [];
  if (meld.type === 'pon') {
    return [meld.tile, meld.tile, meld.tile];
  }
  if (meld.closed) {
    return [{ type: 'back' }, meld.tile, meld.tile, { type: 'back' }];
  }
  return [meld.tile, meld.tile, meld.tile, meld.tile];
};

export interface MeldAreaContentProps {
  melds: Meld[];
  onSelectMeld: (i: number) => void;
  onRemoveMeld: (i: number) => void;
  onAddMeld: () => void;
}

export function MeldAreaContent({
  melds,
  onSelectMeld,
  onRemoveMeld,
  onAddMeld
}: MeldAreaContentProps): React.JSX.Element {
  const bodyRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleCardClick = (
    i: number,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    const el = event.target as Element | null;
    if (
      el?.closest('.card-clear-zone') ||
      el?.closest('.hand-card__clear-zone')
    ) {
      return;
    }
    bodyRefs.current[i]?.focus({ preventScroll: true });
    onSelectMeld(i);
  };

  const handleBodyKeyDown = (
    i: number,
    event: React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectMeld(i);
    }
  };

  return (
    <div className="meld-area">
      {melds.map((meld, i) => {
        const tiles = meldTiles(meld);
        return (
          // biome-ignore lint/a11y/useKeyWithClickEvents: キーボード操作は .meld-card__body(role=button)が担う
          <div
            key={i}
            className="meld-card"
            onClick={e => handleCardClick(i, e)}
          >
            <div className="meld-card__top-row">
              <span className="meld-card__spacer" aria-hidden="true" />
              <CardClearButton
                aria-label={`副露${i + 1}を削除`}
                disabled={false}
                onClear={() => onRemoveMeld(i)}
              />
            </div>
            {/* biome-ignore lint/a11y/useSemanticElements: 設計書2.5で role="button"・tabIndex=0 の指定があるため */}
            <div
              role="button"
              ref={el => {
                bodyRefs.current[i] = el;
              }}
              tabIndex={0}
              aria-label={`副露${i + 1}を入力`}
              className="meld-card__body"
              onKeyDown={e => handleBodyKeyDown(i, e)}
            >
              {meld.tile === null ? (
                <div className="meld-card__empty" aria-hidden="true" />
              ) : (
                <div className="meld-card__tiles">
                  {tiles.map((t, idx) => (
                    <Tile key={idx} tile={t} />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {melds.length < 4 ? (
        <button
          type="button"
          aria-label="副露を追加"
          className="meld-add"
          onClick={onAddMeld}
        >
          <Ripple />
          <FocusRing />
          <SymbolIcon d={SYMBOL_ADD} />
        </button>
      ) : null}
    </div>
  );
}

export function MeldArea(): React.JSX.Element {
  const { input } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <MeldAreaContent
      melds={input.melds}
      onSelectMeld={i =>
        dispatch({ type: 'open-sheet', target: { type: 'meld', i } })
      }
      onRemoveMeld={i => dispatch({ type: 'remove-meld', i })}
      onAddMeld={() => dispatch({ type: 'add-meld' })}
    />
  );
}
