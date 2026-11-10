import type React from 'react';
import { instantiateMeld } from '../../core/input';
import type { Tile as CoreTile } from '../../core/tile';
import { Button, IconButton } from '../md';
import {
  canAddHandTile,
  canAddIndicatorTile,
  kindOfMeld,
  meldRedToggle,
  meldTileForKey,
  useAppDispatch,
  useAppState
} from '../state';
import { Tile, tileLabelOf } from '../tile';
import './tile-palette.css';

const ROW_1_SOU: readonly CoreTile[] = [
  { type: 's', n: 1 },
  { type: 's', n: 2 },
  { type: 's', n: 3 },
  { type: 's', n: 4 },
  { type: 's', n: 5, red: false },
  { type: 's', n: 6 },
  { type: 's', n: 7 },
  { type: 's', n: 8 },
  { type: 's', n: 9 }
] as const;

const ROW_2_PIN: readonly CoreTile[] = [
  { type: 'p', n: 1 },
  { type: 'p', n: 2 },
  { type: 'p', n: 3 },
  { type: 'p', n: 4 },
  { type: 'p', n: 5, red: false },
  { type: 'p', n: 6 },
  { type: 'p', n: 7 },
  { type: 'p', n: 8 },
  { type: 'p', n: 9 }
] as const;

const ROW_3_MAN_HONOR: readonly CoreTile[] = [
  { type: 'm', n: 1 },
  { type: 'm', n: 9 },
  { type: 'z', n: 1 },
  { type: 'z', n: 2 },
  { type: 'z', n: 3 },
  { type: 'z', n: 4 },
  { type: 'z', n: 5 },
  { type: 'z', n: 6 },
  { type: 'z', n: 7 }
] as const;

const RED_TILES: readonly CoreTile[] = [
  { type: 'p', n: 5, red: true },
  { type: 's', n: 5, red: true }
] as const;

const BASE_ROWS: readonly CoreTile[] = [
  ...ROW_1_SOU,
  ...ROW_2_PIN,
  ...ROW_3_MAN_HONOR
] as const;

const tileKeyOf = (tile: CoreTile): string =>
  `${tile.type}${tile.n}${tile.type !== 'z' && tile.n === 5 && tile.red ? 'r' : ''}`;

export function TilePalette(): React.JSX.Element {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const hasRed = state.rule.red > 0;
  const focus = state.inputFocus;

  const renderTileKey = (tile: CoreTile) => {
    let disabled = true;
    let onTileClick = () => {};

    if (focus?.type === 'hand') {
      disabled = !canAddHandTile(state, tile);
      onTileClick = () => dispatch({ type: 'add-hand-tile', tile });
    } else if (focus?.type === 'dora' || focus?.type === 'uradora') {
      const target = focus.type;
      disabled = !canAddIndicatorTile(state, target, tile);
      onTileClick = () =>
        dispatch({ type: 'add-indicator-tile', target, tile });
    } else if (focus?.type === 'meld') {
      const meldIndex = focus.i;
      const currentMeld = state.input.melds[meldIndex];
      if (currentMeld) {
        const placed = meldTileForKey(
          state,
          meldIndex,
          kindOfMeld(currentMeld),
          tile
        );
        disabled = placed === null;
        onTileClick = () => {
          if (placed !== null) {
            dispatch({ type: 'set-meld-tile', i: meldIndex, tile: placed });
          }
        };
      }
    }

    return (
      <button
        key={tileKeyOf(tile)}
        type="button"
        className="tile-palette__key"
        aria-label={tileLabelOf(tile)}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            onTileClick();
          }
        }}
      >
        <Tile tile={tile} />
      </button>
    );
  };

  const renderRedToggle = (meldIndex: number) => {
    const meld = state.input.melds[meldIndex];
    const { disabled, next } = meldRedToggle(state, meldIndex);
    const redCount = meld
      ? instantiateMeld(meld, state.rule.red).filter(
          t => t.type !== 'z' && t.n === 5 && t.red === true
        ).length
      : 0;
    const mt = meld?.tile ?? null;
    const suit = mt?.type === 's' ? 's' : 'p';
    const pressed = mt !== null && 'red' in mt && mt.red === true;
    return (
      <button
        key="red-toggle"
        type="button"
        className="tile-palette__key tile-palette__red-toggle tile-palette__action--span-2"
        aria-label="赤牌"
        aria-pressed={pressed}
        disabled={disabled}
        onClick={() => {
          if (!disabled && next !== null) {
            dispatch({ type: 'set-meld-tile', i: meldIndex, tile: next });
          }
        }}
      >
        <Tile tile={{ type: suit, n: 5, red: true }} />
        <span className="tile-palette__red-count">×{redCount}</span>
      </button>
    );
  };

  let backspaceDisabled = true;
  let onBackspaceClick = () => {};
  let acDisabled = true;
  let onAcClick = () => {};
  let acAriaLabel = '手牌をクリア';

  if (focus?.type === 'hand') {
    backspaceDisabled = state.input.hand.length === 0;
    onBackspaceClick = () => dispatch({ type: 'remove-last-hand-tile' });
    acDisabled = state.input.hand.length === 0;
    onAcClick = () => dispatch({ type: 'clear-hand' });
    acAriaLabel = '手牌をクリア';
  } else if (focus?.type === 'dora') {
    backspaceDisabled = state.input.dora.length === 0;
    onBackspaceClick = () =>
      dispatch({ type: 'remove-last-indicator-tile', target: 'dora' });
    acDisabled = state.input.dora.length === 0;
    onAcClick = () => dispatch({ type: 'clear-indicators', target: 'dora' });
    acAriaLabel = 'ドラ表示牌をクリア';
  } else if (focus?.type === 'uradora') {
    backspaceDisabled = state.input.uradora.length === 0;
    onBackspaceClick = () =>
      dispatch({ type: 'remove-last-indicator-tile', target: 'uradora' });
    acDisabled = state.input.uradora.length === 0;
    onAcClick = () => dispatch({ type: 'clear-indicators', target: 'uradora' });
    acAriaLabel = '裏ドラ表示牌をクリア';
  } else if (focus?.type === 'meld') {
    backspaceDisabled = true;
    acDisabled = true;
    acAriaLabel = '副露をクリア';
  }

  const backspaceSpanClass = hasRed
    ? 'tile-palette__action--span-2'
    : 'tile-palette__action--span-3';
  const enterSpanClass = hasRed
    ? 'tile-palette__action--span-3'
    : 'tile-palette__action--span-4';

  return (
    <div className="tile-palette">
      {BASE_ROWS.map(renderTileKey)}
      {hasRed
        ? focus?.type === 'meld'
          ? renderRedToggle(focus.i)
          : RED_TILES.map(renderTileKey)
        : null}
      <IconButton
        variant="tonal"
        label="1 枚削除"
        disabled={backspaceDisabled}
        className={`tile-palette__action ${backspaceSpanClass}`}
        onClick={onBackspaceClick}
      >
        <svg
          viewBox="0 0 24 24"
          width="1.5rem"
          height="1.5rem"
          aria-hidden="true"
        >
          <path
            d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-3 12.59L17.59 17 14 13.41 10.41 17 9 15.59 12.59 12 9 8.41 10.41 7 14 10.59 17.59 7 19 8.41 15.41 12 19 15.59z"
            fill="currentColor"
          />
        </svg>
      </IconButton>
      <Button
        variant="tonal"
        aria-label={acAriaLabel}
        disabled={acDisabled}
        className="tile-palette__action tile-palette__action--span-2"
        onClick={onAcClick}
      >
        AC
      </Button>
      <IconButton
        variant="filled"
        label="入力を終える"
        className={`tile-palette__action ${enterSpanClass}`}
        onClick={() => dispatch({ type: 'close-sheet' })}
      >
        <svg
          viewBox="0 0 24 24"
          width="1.5rem"
          height="1.5rem"
          aria-hidden="true"
        >
          <path
            d="M19 7v4H5.83l3.58-3.59L8 6l-6 6 6 6 1.41-1.41L5.83 13H21V7h-2z"
            fill="currentColor"
          />
        </svg>
      </IconButton>
    </div>
  );
}
