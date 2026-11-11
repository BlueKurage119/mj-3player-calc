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
import { useRejectFeedback } from './reject-feedback';

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

interface MeldCardItemProps {
  meld: Meld;
  index: number;
  isSelected: boolean;
  buffer: string;
  red: Rule['red'];
  onSelect: () => void;
  onRemove: () => void;
  bodyRef: (el: HTMLDivElement | null) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}

function MeldCardItem({
  meld,
  index,
  isSelected,
  buffer,
  red,
  onSelect,
  onRemove,
  bodyRef,
  onKeyDown
}: MeldCardItemProps): React.JSX.Element {
  const cardRef = useRef<HTMLDivElement | null>(null);
  useRejectFeedback(cardRef, isSelected);

  const tiles = meldTiles(meld, red);
  const hasBuffer = isSelected && buffer.length > 0;

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const el = event.target as Element | null;
    if (el?.closest('.card-clear-zone')) {
      return;
    }
    onSelect();
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: キーボード操作は .meld-card__body(role=button)が担う
    <div
      ref={cardRef}
      className={`meld-card${isSelected ? ' meld-card--selected' : ''}`}
      onClick={handleClick}
    >
      <div className="meld-card__row">
        {/* biome-ignore lint/a11y/useSemanticElements: 設計書2.5で role="button"・tabIndex=0 の指定があるため */}
        <div
          role="button"
          ref={bodyRef}
          tabIndex={0}
          aria-label={`副露${index + 1}を入力`}
          data-sheet-opener=""
          className="meld-card__body"
          onKeyDown={onKeyDown}
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
          aria-label={`副露${index + 1}を削除`}
          disabled={false}
          onClear={onRemove}
        />
      </div>
    </div>
  );
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

  const handleBodyKeyDown = (
    i: number,
    event: React.KeyboardEvent<HTMLDivElement>
  ) => handleMeldBodyKey(event, i === selectedIndex, () => onSelectMeld(i));

  return (
    <div className="meld-area">
      {melds.map((meld, i) => (
        <MeldCardItem
          key={i}
          meld={meld}
          index={i}
          isSelected={i === selectedIndex}
          buffer={buffer}
          red={red}
          onSelect={() => {
            bodyRefs.current[i]?.focus({ preventScroll: true });
            onSelectMeld(i);
          }}
          onRemove={() => onRemoveMeld(i)}
          bodyRef={el => {
            bodyRefs.current[i] = el;
          }}
          onKeyDown={e => handleBodyKeyDown(i, e)}
        />
      ))}
      {melds.length < 4 ? (
        <button
          type="button"
          aria-label="副露を追加"
          className="meld-add"
          data-sheet-opener=""
          onClick={onAddMeld}
          onKeyDown={e => handleMeldAddKey(e, onAddMeld)}
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

/** 本体の keydown: 選択中は Enter/Space を素通し(確定事項43)、非選択なら開く */
export function handleMeldBodyKey(
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

/** 追加ボタンの keydown: Enter で追加する(確定事項45)。Space はボタン標準の click に任せる */
export function handleMeldAddKey(
  event: { key: string; preventDefault(): void },
  add: () => void
): void {
  if (event.key === 'Enter') {
    event.preventDefault();
    add();
  }
}
