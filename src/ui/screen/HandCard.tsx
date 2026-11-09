import { useEffect, useRef } from 'react';
import type React from 'react';
import type { Tile as CoreTile } from '../../core/tile';
import { SYMBOL_DISABLED_BY_DEFAULT, SymbolIcon } from '../icons';
import { FocusRing, Ripple } from '../md';
import {
  maxHandLength,
  splitWinningTile,
  useAppDispatch,
  useAppState
} from '../state';
import { Tile } from '../tile';

export function formatHandCardTitle(handLength: number, max: number): string {
  return `手牌 (${handLength}/${max})`;
}

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
  const { input, inputFocus, tenkeyBuffer } = useAppState();
  const dispatch = useAppDispatch();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const isHandFocused = inputFocus?.type === 'hand';
  const isEmpty = input.hand.length === 0;
  const max = maxHandLength(input.melds);
  const { body, winning } = splitWinningTile(input.hand, max);

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

  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as Element | null;
    if (target?.closest('.hand-card__clear-zone')) {
      return;
    }
    bodyRef.current?.focus({ preventScroll: true });
    dispatch({ type: 'open-sheet', target: { type: 'hand' } });
  };

  const handleClearClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!isEmpty) {
      dispatch({ type: 'clear-hand' });
      bodyRef.current?.focus({ preventScroll: true });
    }
  };

  const handleBodyKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      dispatch({ type: 'open-sheet', target: { type: 'hand' } });
    }
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: キーボード操作は .hand-card__body(role=button)が担う。外枠のクリックはポインタの当たり判定拡張(設計書 issue-55 2.1)
    <div ref={cardRef} className="hand-card" onClick={handleCardClick}>
      <div className="hand-card__top-row">
        <span className="hand-card__title">
          {formatHandCardTitle(input.hand.length, max)}
        </span>
        <div className="hand-card__clear-zone">
          <button
            type="button"
            aria-label="手牌をクリア"
            disabled={isEmpty}
            className="hand-card__clear-button"
            onClick={handleClearClick}
          >
            <Ripple disabled={isEmpty} />
            <FocusRing />
            <SymbolIcon d={SYMBOL_DISABLED_BY_DEFAULT} size="1.25rem" />
          </button>
        </div>
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: 設計書2.1で role="button"・tabIndex=0 の指定があるため */}
      <div
        role="button"
        ref={bodyRef}
        tabIndex={0}
        aria-label="手牌を入力"
        className="hand-card__body"
        style={{ '--hand-max': max } as React.CSSProperties}
        onKeyDown={handleBodyKeyDown}
      >
        <div className="hand-card__tiles">
          {body.map(item => renderHandTile(item))}
          {winning ? renderHandTile(winning, true) : null}
          {tenkeyBuffer.length > 0 ? (
            <span className="hand-card__buffer" aria-hidden="true">
              {tenkeyBuffer}‸
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
