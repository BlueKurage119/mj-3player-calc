import { useRef } from 'react';
import type React from 'react';
import { instantiateMeld, type Meld } from '../../core/input';
import type { Rule } from '../../core/rule';
import type { TileOrBack } from '../../core/tile';
import { SYMBOL_ADD, SymbolIcon } from '../icons';
import { FocusRing, Ripple } from '../md';
import { useAppDispatch, useAppState } from '../state';
import { Tile } from '../tile';
import { CardClearButton } from './CardClearButton';

export const meldTiles = (meld: Meld, red: Rule['red']): TileOrBack[] => {
  if (meld.tile === null) return [];
  const xs = instantiateMeld(meld, red);
  if (meld.type === 'kan' && meld.closed) {
    const [, , third, fourth] = xs;
    if (third === undefined || fourth === undefined) return xs;
    return [{ type: 'back' }, third, fourth, { type: 'back' }];
  }
  return xs;
};

export interface MeldAreaContentProps {
  melds: Meld[];
  red: Rule['red'];
  selectedIndex: number | null;
  buffer: string;
  onSelectMeld: (i: number) => void;
  onRemoveMeld: (i: number) => void;
  onAddMeld: () => void;
}

export function MeldAreaContent({
  melds,
  red,
  selectedIndex,
  buffer,
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
      if (i === selectedIndex) {
        return;
      }
      event.preventDefault();
      onSelectMeld(i);
    }
  };

  return (
    <div className="meld-area">
      {melds.map((meld, i) => {
        const tiles = meldTiles(meld, red);
        const isCardSelected = i === selectedIndex;
        const hasBuffer = isCardSelected && buffer.length > 0;
        return (
          // biome-ignore lint/a11y/useKeyWithClickEvents: キーボード操作は .meld-card__body(role=button)が担う
          <div
            key={i}
            className={`meld-card${isCardSelected ? ' meld-card--selected' : ''}`}
            onClick={e => handleCardClick(i, e)}
          >
            <div className="meld-card__row">
              {/* biome-ignore lint/a11y/useSemanticElements: 設計書2.5で role="button"・tabIndex=0 の指定があるため */}
              <div
                role="button"
                ref={el => {
                  bodyRefs.current[i] = el;
                }}
                tabIndex={0}
                aria-label={`副露${i + 1}を入力`}
                data-sheet-opener=""
                className="meld-card__body"
                onKeyDown={e => handleBodyKeyDown(i, e)}
              >
                {hasBuffer ? (
                  <span className="card-buffer" aria-hidden="true">
                    {buffer}‸
                  </span>
                ) : meld.tile === null ? (
                  <div className="meld-card__empty" aria-hidden="true" />
                ) : (
                  <div className="meld-card__tiles">
                    {tiles.map((t, idx) => (
                      <Tile key={idx} tile={t} />
                    ))}
                  </div>
                )}
              </div>
              <CardClearButton
                aria-label={`副露${i + 1}を削除`}
                disabled={false}
                onClear={() => onRemoveMeld(i)}
              />
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
  const { input, rule, inputFocus, tenkeyBuffer } = useAppState();
  const dispatch = useAppDispatch();
  const selectedIndex = inputFocus?.type === 'meld' ? inputFocus.i : null;
  const buffer = selectedIndex !== null ? tenkeyBuffer : '';

  return (
    <MeldAreaContent
      melds={input.melds}
      red={rule.red}
      selectedIndex={selectedIndex}
      buffer={buffer}
      onSelectMeld={i =>
        dispatch({ type: 'open-sheet', target: { type: 'meld', i } })
      }
      onRemoveMeld={i => dispatch({ type: 'remove-meld', i })}
      onAddMeld={() => dispatch({ type: 'add-meld' })}
    />
  );
}
