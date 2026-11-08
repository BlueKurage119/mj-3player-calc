import { useEffect, useRef } from 'react';
import type React from 'react';
import type { Tile as CoreTile } from '../../core/tile';
import { IconButton } from '../md';
import {
  maxHandLength,
  splitWinningTile,
  useAppDispatch,
  useAppState
} from '../state';
import { Tile } from '../tile';

const getScrollBehavior = (): ScrollBehavior => {
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return 'auto';
  }
  return 'smooth';
};

const renderHandTile = (
  item: { tile: CoreTile; index: number },
  isWinning = false
): React.JSX.Element => {
  const { tile, index } = item;
  const key = `${tile.type}${tile.n}${
    tile.type !== 'z' && tile.n === 5 && tile.red ? 'r' : ''
  }-${index}`;
  if (isWinning) {
    return (
      <span key={key} className="hand-card__winning-tile">
        <Tile tile={tile} />
      </span>
    );
  }
  return <Tile key={key} tile={tile} />;
};

export function HandCard(): React.JSX.Element {
  const { input, inputFocus } = useAppState();
  const dispatch = useAppDispatch();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const isHandFocused = inputFocus?.type === 'hand';
  const isEmpty = input.hand.length === 0;
  const max = maxHandLength(input.melds);
  const { body, winning } = splitWinningTile(input.hand, max);
  const tilesStyle = { '--hand-max': max } as React.CSSProperties;

  useEffect(() => {
    if (!isHandFocused) return;

    const root = document.documentElement;
    let rafId: number | null = null;
    let lastSheetHeight = root.style.getPropertyValue('--sheet-height').trim();

    const triggerScroll = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        rafId = null;
        cardRef.current?.scrollIntoView({
          block: 'nearest',
          behavior: getScrollBehavior()
        });
      });
    };

    triggerScroll();

    const observer =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => {
            const nextHeight = root.style
              .getPropertyValue('--sheet-height')
              .trim();
            if (nextHeight !== lastSheetHeight) {
              lastSheetHeight = nextHeight;
              triggerScroll();
            }
          })
        : null;

    observer?.observe(root, {
      attributes: true,
      attributeFilter: ['style']
    });

    return () => {
      observer?.disconnect();
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isHandFocused]);

  return (
    <div ref={cardRef} className="hand-card">
      <div className="hand-card__top-row">
        <IconButton
          variant="standard"
          label="手牌をクリア"
          disabled={isEmpty}
          className="hand-card__clear-button"
          onClick={event => {
            event.stopPropagation();
            if (!isEmpty) {
              dispatch({ type: 'clear-hand' });
            }
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="1.5rem"
            height="1.5rem"
            aria-hidden="true"
          >
            <path
              d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
              fill="currentColor"
            />
          </svg>
        </IconButton>
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: 設計書2.9で role="button"・tabIndex=0 の指定があるため */}
      <div
        role="button"
        tabIndex={0}
        aria-label="手牌を入力"
        className="hand-card__body"
        onClick={() => {
          dispatch({ type: 'open-sheet', target: { type: 'hand' } });
        }}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            dispatch({ type: 'open-sheet', target: { type: 'hand' } });
          }
        }}
      >
        <div className="hand-card__tiles" style={tilesStyle}>
          {body.map(item => renderHandTile(item))}
          {winning ? renderHandTile(winning, true) : null}
        </div>
      </div>
    </div>
  );
}
