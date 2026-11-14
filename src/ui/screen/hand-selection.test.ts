import { describe, expect, it } from 'vitest';
import {
  isHandTileTarget,
  isSelectionCancelKey,
  nextHandTap
} from './hand-selection';

describe('F1-1: 手牌選択の純関数 (hand-selection)', () => {
  it('F1-1: nextHandTap は未選択→選択、同牌→削除、別牌→選択移動を返す', () => {
    // なし -> 牌 i をタップ -> i を選択
    expect(nextHandTap(null, 0)).toEqual({ selected: 0, remove: null });
    expect(nextHandTap(null, 5)).toEqual({ selected: 5, remove: null });

    // i -> 牌 i をタップ -> 削除 i・選択なし
    expect(nextHandTap(0, 0)).toEqual({ selected: null, remove: 0 });
    expect(nextHandTap(5, 5)).toEqual({ selected: null, remove: 5 });

    // i -> 牌 j (≠ i) をタップ -> j を選択
    expect(nextHandTap(2, 7)).toEqual({ selected: 7, remove: null });
    expect(nextHandTap(7, 2)).toEqual({ selected: 2, remove: null });
  });

  it('F1-1: isHandTileTarget は .hand-card__tiles button.tile 内なら真、それ以外と null は偽を返す', () => {
    const tileButton = {
      closest: (sel: string) =>
        sel === '.hand-card__tiles button.tile' ? {} : null
    };
    const cardBody = {
      closest: (sel: string) => (sel === '.hand-card' ? {} : null)
    };
    const clearButton = {
      closest: (sel: string) => (sel === '.card-clear-zone' ? {} : null)
    };
    const noClosest = {};

    expect(isHandTileTarget(tileButton)).toBe(true);
    expect(isHandTileTarget(cardBody)).toBe(false);
    expect(isHandTileTarget(clearButton)).toBe(false);
    expect(isHandTileTarget(noClosest)).toBe(false);
    expect(isHandTileTarget(null)).toBe(false);
  });

  it('F1-1: isSelectionCancelKey は Escape のみ真を返す', () => {
    expect(isSelectionCancelKey('Escape')).toBe(true);
    expect(isSelectionCancelKey('Enter')).toBe(false);
    expect(isSelectionCancelKey(' ')).toBe(false);
    expect(isSelectionCancelKey('Backspace')).toBe(false);
    expect(isSelectionCancelKey('a')).toBe(false);
  });
});
