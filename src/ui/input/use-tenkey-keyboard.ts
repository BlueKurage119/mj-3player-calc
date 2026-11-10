import { useEffect } from 'react';
import type { AppAction, SheetMode, SheetTarget } from '../state';
import { useAppDispatch, useAppState } from '../state';
import {
  type TenkeyKeyCommand,
  mapTenkeyKey,
  shouldHandleKeyEvent
} from './tenkey-logic';

export const isSheetKeyboardTarget = (
  target: SheetTarget | null
): target is
  | { type: 'hand' }
  | { type: 'dora' }
  | { type: 'uradora' }
  | { type: 'meld'; i: number } => {
  if (!target) return false;
  return (
    target.type === 'hand' ||
    target.type === 'dora' ||
    target.type === 'uradora' ||
    target.type === 'meld'
  );
};

export const resolveKeyboardAction = (
  command: TenkeyKeyCommand | null,
  _sheetMode: SheetMode,
  inputFocus: SheetTarget | null
): AppAction | null => {
  if (command === null || !isSheetKeyboardTarget(inputFocus)) return null;

  switch (command.kind) {
    case 'digit':
      return { type: 'tenkey-digit', digit: command.digit };
    case 'suit':
      return { type: 'tenkey-commit', suit: command.suit };
    case 'backspace':
      return { type: 'tenkey-backspace' };
    case 'enter':
      return { type: 'close-sheet' };
  }
};

/**
 * シートが開いている間、物理キー入力をテンキー・パレット操作へ中継するフック。
 * 対象が hand・dora・uradora・meld 以外のとき、またはシート外の要素にフォーカスがあるときはキーを奪わない。
 */
export function useTenkeyKeyboard(): void {
  const { inputFocus, sheetMode } = useAppState();
  const dispatch = useAppDispatch();

  const isFocused = isSheetKeyboardTarget(inputFocus);

  useEffect(() => {
    if (!isFocused) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!shouldHandleKeyEvent(e)) return;

      const command = mapTenkeyKey(e, sheetMode);
      const action = resolveKeyboardAction(command, sheetMode, inputFocus);
      if (action !== null) {
        e.preventDefault();
        dispatch(action);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFocused, inputFocus, sheetMode, dispatch]);
}
