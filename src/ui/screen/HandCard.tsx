import { Fragment, useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { Tile as CoreTile } from '../../core/tile';
import {
  maxHandLength,
  splitWinningTile,
  useAppDispatch,
  useAppState
} from '../state';
import { Tile, tileLabelOf } from '../tile';
import { CardClearButton } from './CardClearButton';
import {
  isHandTileTarget,
  isSelectionCancelKey,
  nextHandTap
} from './hand-selection';
import { useRejectFeedback } from './reject-feedback';

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
  selectedIndex: number | null,
  onTileClick: (index: number) => void,
  isWinning = false
): React.JSX.Element => {
  const { tile, index } = item;
  const key = `${tile.type}${tile.n}${
    tile.type !== 'z' && tile.n === 5 && tile.red ? 'r' : ''
  }-${index}`;
  const selected = selectedIndex === index;
  const label = tileLabelOf(tile);
  const tileEl = (
    <Tile
      tile={tile}
      selected={selected}
      onClick={() => onTileClick(index)}
      aria-label={selected ? `${label}、もう一度押すと削除` : label}
    />
  );
  if (isWinning) {
    return (
      <span key={key} className="hand-card__winning-tile">
        {tileEl}
      </span>
    );
  }
  return <Fragment key={key}>{tileEl}</Fragment>;
};

export interface HandCardProps {
  initialSelectedIndex?: number | undefined;
}

export function HandCard({
  initialSelectedIndex
}: HandCardProps = {}): React.JSX.Element {
  const { input, inputFocus, tenkeyBuffer } = useAppState();
  const dispatch = useAppDispatch();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLSpanElement | null>(null);
  const [selection, setSelection] = useState<{
    index: number;
    hand: CoreTile[];
  } | null>(() =>
    initialSelectedIndex !== undefined
      ? { index: initialSelectedIndex, hand: input.hand }
      : null
  );
  const isHandFocused = inputFocus?.type === 'hand';
  const isSelected = isHandFocused;
  const isEmpty = input.hand.length === 0;
  const max = maxHandLength(input.melds);
  const { body, winning } = splitWinningTile(input.hand, max);
  // 描画時に手牌の参照一致で有効性を判定し、手牌が変われば自動で解除する
  const selectedTileIndex =
    selection !== null && selection.hand === input.hand
      ? selection.index
      : null;

  useRejectFeedback(cardRef, isSelected);

  useEffect(() => {
    if (selectedTileIndex === null) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        !isHandTileTarget(
          event.target as { closest?(selector: string): unknown } | null
        )
      ) {
        setSelection(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isSelectionCancelKey(event.key)) {
        setSelection(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, {
      capture: true
    });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, {
        capture: true
      });
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedTileIndex]);

  useEffect(() => {
    if (!isHandFocused) return;

    const root = document.documentElement;
    let rafId: number | null = null;
    let lastSheetHeight = root.style.getPropertyValue('--sheet-height').trim();
    let lastBannerHeight = root.style
      .getPropertyValue('--result-banner-height')
      .trim();

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
            const nextSheetHeight = root.style
              .getPropertyValue('--sheet-height')
              .trim();
            const nextBannerHeight = root.style
              .getPropertyValue('--result-banner-height')
              .trim();
            if (
              nextSheetHeight !== lastSheetHeight ||
              nextBannerHeight !== lastBannerHeight
            ) {
              lastSheetHeight = nextSheetHeight;
              lastBannerHeight = nextBannerHeight;
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
    if (
      target?.closest('.card-clear-zone') ||
      target?.closest('.hand-card__tiles button.tile')
    ) {
      return;
    }
    openerRef.current?.focus({ preventScroll: true });
    dispatch({ type: 'open-sheet', target: { type: 'hand' } });
  };

  const handleClear = () => {
    setSelection(null);
    dispatch({ type: 'clear-hand' });
    openerRef.current?.focus({ preventScroll: true });
  };

  const handleOpenerKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) =>
    handleHandBodyKey(event, isSelected, () =>
      dispatch({ type: 'open-sheet', target: { type: 'hand' } })
    );

  const handleTileClick = (index: number) => {
    const next = nextHandTap(selectedTileIndex, index);
    if (next.remove !== null) {
      setSelection(null);
      dispatch({ type: 'remove-hand-tile', index: next.remove });
      return;
    }
    setSelection(
      next.selected !== null ? { index: next.selected, hand: input.hand } : null
    );
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: キーボード操作は .hand-card__opener(role=button)が担う。外枠のクリックはポインタの当たり判定拡張(設計書 issue-55 2.1・issue-89 2.3)
    <div
      ref={cardRef}
      className={`hand-card${isSelected ? ' hand-card--selected' : ''}`}
      onClick={handleCardClick}
    >
      <div className="hand-card__top-row">
        {/* biome-ignore lint/a11y/useSemanticElements: 設計書2.3により選択中の Space で合成 click を防ぐため span[role="button"] とする */}
        <span
          role="button"
          tabIndex={0}
          aria-label="手牌を入力"
          data-sheet-opener=""
          className="hand-card__title hand-card__opener"
          ref={openerRef}
          onKeyDown={handleOpenerKeyDown}
        >
          {formatHandCardTitle(input.hand.length, max)}
        </span>
        <CardClearButton
          variant="hand"
          aria-label="手牌をクリア"
          disabled={isEmpty}
          onClear={handleClear}
        />
      </div>
      <div
        className="hand-card__body"
        style={{ '--hand-max': max } as React.CSSProperties}
      >
        {/* biome-ignore lint/a11y/useSemanticElements: 設計書2.3で指定された div.hand-card__tiles(role="group") のため */}
        <div role="group" aria-label="手牌の牌" className="hand-card__tiles">
          {body.map(item =>
            renderHandTile(item, selectedTileIndex, handleTileClick)
          )}
          {winning
            ? renderHandTile(winning, selectedTileIndex, handleTileClick, true)
            : null}
          {isSelected && tenkeyBuffer.length > 0 ? (
            <span className="hand-card__buffer" aria-hidden="true">
              {tenkeyBuffer}‸
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** 本体の keydown: 選択中は Enter/Space を素通し(確定事項43)、非選択なら開く */
export function handleHandBodyKey(
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
