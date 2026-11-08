import { useEffect } from 'react';
import { useAppDispatch, useAppState } from '../state';
import { mapTenkeyKey, shouldHandleKeyTarget } from './tenkey-logic';

/**
 * 手牌入力シートが開いている間、物理キー入力をテンキー・パレット操作へ中継するフック。
 * 対象が hand 以外のとき、またはシート外の要素にフォーカスがあるときはキーを奪わない。
 */
export function useTenkeyKeyboard(): void {
  const { inputFocus, sheetMode } = useAppState();
  const dispatch = useAppDispatch();

  const isHandFocused = inputFocus?.type === 'hand';

  useEffect(() => {
    if (!isHandFocused) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!shouldHandleKeyTarget(e.target)) return;

      const command = mapTenkeyKey(e, sheetMode);
      if (command === null) return;

      e.preventDefault();
      switch (command.kind) {
        case 'digit':
          dispatch({ type: 'tenkey-digit', digit: command.digit });
          break;
        case 'suit':
          dispatch({ type: 'tenkey-commit', suit: command.suit });
          break;
        case 'backspace':
          if (sheetMode === 'tenkey') {
            dispatch({ type: 'tenkey-backspace' });
          } else {
            dispatch({ type: 'remove-last-hand-tile' });
          }
          break;
        case 'enter':
          dispatch({ type: 'close-sheet' });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isHandFocused, sheetMode, dispatch]);
}
