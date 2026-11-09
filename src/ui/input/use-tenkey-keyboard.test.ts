import { describe, expect, it } from 'vitest';
import type { TenkeyKeyCommand } from './tenkey-logic';
import {
  isSheetKeyboardTarget,
  resolveKeyboardAction
} from './use-tenkey-keyboard';

describe('D4: 物理キーボード連携の一般化 (C8)', () => {
  it('D4-K1: isSheetKeyboardTarget は hand・dora・uradora・meld で真、それ以外で偽', () => {
    expect(isSheetKeyboardTarget({ type: 'hand' })).toBe(true);
    expect(isSheetKeyboardTarget({ type: 'dora' })).toBe(true);
    expect(isSheetKeyboardTarget({ type: 'uradora' })).toBe(true);
    expect(isSheetKeyboardTarget({ type: 'meld', i: 0 })).toBe(true);

    expect(isSheetKeyboardTarget({ type: 'situation' })).toBe(false);
    expect(isSheetKeyboardTarget(null)).toBe(false);
  });

  it('D4-K2: パレットモードの Backspace は対象別にアクションを解決する', () => {
    const backspaceCmd: TenkeyKeyCommand = { kind: 'backspace' };

    // hand: remove-last-hand-tile
    expect(
      resolveKeyboardAction(backspaceCmd, 'palette', { type: 'hand' })
    ).toEqual({ type: 'remove-last-hand-tile' });

    // dora: remove-last-indicator-tile { target: 'dora' }
    expect(
      resolveKeyboardAction(backspaceCmd, 'palette', { type: 'dora' })
    ).toEqual({ type: 'remove-last-indicator-tile', target: 'dora' });

    // uradora: remove-last-indicator-tile { target: 'uradora' }
    expect(
      resolveKeyboardAction(backspaceCmd, 'palette', { type: 'uradora' })
    ).toEqual({ type: 'remove-last-indicator-tile', target: 'uradora' });

    // meld: null (何もしない)
    expect(
      resolveKeyboardAction(backspaceCmd, 'palette', { type: 'meld', i: 0 })
    ).toBeNull();

    // situation または null: null
    expect(
      resolveKeyboardAction(backspaceCmd, 'palette', { type: 'situation' })
    ).toBeNull();
    expect(resolveKeyboardAction(backspaceCmd, 'palette', null)).toBeNull();
  });

  it('D4-K3: テンキーモードのキー操作 (digit, suit, backspace, enter)', () => {
    // digit
    const digitCmd: TenkeyKeyCommand = { kind: 'digit', digit: '1' };
    expect(resolveKeyboardAction(digitCmd, 'tenkey', { type: 'dora' })).toEqual(
      { type: 'tenkey-digit', digit: '1' }
    );
    expect(
      resolveKeyboardAction(digitCmd, 'tenkey', { type: 'meld', i: 0 })
    ).toEqual({ type: 'tenkey-digit', digit: '1' });

    // suit
    const suitCmd: TenkeyKeyCommand = { kind: 'suit', suit: 'p' };
    expect(resolveKeyboardAction(suitCmd, 'tenkey', { type: 'dora' })).toEqual({
      type: 'tenkey-commit',
      suit: 'p'
    });

    // backspace: tenkey-backspace
    const bsCmd: TenkeyKeyCommand = { kind: 'backspace' };
    expect(resolveKeyboardAction(bsCmd, 'tenkey', { type: 'dora' })).toEqual({
      type: 'tenkey-backspace'
    });
    expect(
      resolveKeyboardAction(bsCmd, 'tenkey', { type: 'meld', i: 0 })
    ).toEqual({ type: 'tenkey-backspace' });

    // enter: close-sheet
    const enterCmd: TenkeyKeyCommand = { kind: 'enter' };
    expect(
      resolveKeyboardAction(enterCmd, 'tenkey', { type: 'meld', i: 0 })
    ).toEqual({ type: 'close-sheet' });
  });
});
