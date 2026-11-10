import type React from 'react';
import { SYMBOL_BACKSPACE, SYMBOL_KEYBOARD_RETURN, SymbolIcon } from '../icons';
import { FocusRing, Ripple } from '../md';
import { canAppendTenkeyDigitFor, useAppDispatch, useAppState } from '../state';
import { TENKEY_HONOR_HINTS, tenkeyActionKeysFor } from './tenkey-logic';
import './tenkey.css';

export function Tenkey(): React.JSX.Element {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const keys = tenkeyActionKeysFor(state);

  const renderDigitKey = (digit: string, sub?: string, extraClass = '') => {
    const disabled = !canAppendTenkeyDigitFor(state, digit);
    return (
      <button
        type="button"
        className={`tenkey__key tenkey__key--digit ${extraClass}`.trim()}
        aria-label={digit}
        disabled={disabled}
        onClick={() => dispatch({ type: 'tenkey-digit', digit })}
      >
        <Ripple disabled={disabled} />
        <FocusRing />
        <span className="tenkey__key-main">{digit}</span>
        {sub ? (
          <span className="tenkey__key-sub" aria-hidden="true">
            {sub}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <div className="tenkey">
      {/* 1 行目: m p s z */}
      <button
        type="button"
        className="tenkey__key tenkey__key--suit"
        aria-label="萬子"
        onClick={() => dispatch({ type: 'tenkey-commit', suit: 'm' })}
      >
        <Ripple />
        <FocusRing />
        <span className="tenkey__key-main">m</span>
        <span className="tenkey__key-sub" aria-hidden="true">
          萬子
        </span>
      </button>
      <button
        type="button"
        className="tenkey__key tenkey__key--suit"
        aria-label="筒子"
        onClick={() => dispatch({ type: 'tenkey-commit', suit: 'p' })}
      >
        <Ripple />
        <FocusRing />
        <span className="tenkey__key-main">p</span>
        <span className="tenkey__key-sub" aria-hidden="true">
          筒子
        </span>
      </button>
      <button
        type="button"
        className="tenkey__key tenkey__key--suit"
        aria-label="索子"
        onClick={() => dispatch({ type: 'tenkey-commit', suit: 's' })}
      >
        <Ripple />
        <FocusRing />
        <span className="tenkey__key-main">s</span>
        <span className="tenkey__key-sub" aria-hidden="true">
          索子
        </span>
      </button>
      <button
        type="button"
        className="tenkey__key tenkey__key--suit"
        aria-label="字牌"
        onClick={() => dispatch({ type: 'tenkey-commit', suit: 'z' })}
      >
        <Ripple />
        <FocusRing />
        <span className="tenkey__key-main">z</span>
        <span className="tenkey__key-sub" aria-hidden="true">
          字牌
        </span>
      </button>

      {/* 2 行目: 7 8 9 ⌫ */}
      {renderDigitKey('7', TENKEY_HONOR_HINTS['7'])}
      {renderDigitKey('8')}
      {renderDigitKey('9')}
      <button
        type="button"
        className="tenkey__key tenkey__key--action"
        aria-label="1 文字削除"
        disabled={keys.backspace.disabled}
        onClick={() => dispatch({ type: 'tenkey-backspace' })}
      >
        <Ripple disabled={keys.backspace.disabled} />
        <FocusRing />
        <SymbolIcon d={SYMBOL_BACKSPACE} />
      </button>

      {/* 3 行目: 4 5 6 AC */}
      {renderDigitKey('4', TENKEY_HONOR_HINTS['4'])}
      {renderDigitKey('5', TENKEY_HONOR_HINTS['5'])}
      {renderDigitKey('6', TENKEY_HONOR_HINTS['6'])}
      <button
        type="button"
        className="tenkey__key tenkey__key--action"
        aria-label={keys.clear.label}
        disabled={keys.clear.disabled}
        onClick={() => {
          if (keys.clear.action) dispatch(keys.clear.action);
        }}
      >
        <Ripple disabled={keys.clear.disabled} />
        <FocusRing />
        <span className="tenkey__key-main">AC</span>
      </button>

      {/* 4 行目: 1 2 3 Enter(4〜5行にまたがる) */}
      {renderDigitKey('1', TENKEY_HONOR_HINTS['1'])}
      {renderDigitKey('2', TENKEY_HONOR_HINTS['2'])}
      {renderDigitKey('3', TENKEY_HONOR_HINTS['3'])}
      <button
        type="button"
        className="tenkey__key tenkey__key--enter"
        aria-label="入力を終える"
        onClick={() => dispatch({ type: 'close-sheet' })}
      >
        <Ripple />
        <FocusRing />
        <SymbolIcon d={SYMBOL_KEYBOARD_RETURN} />
      </button>

      {/* 5 行目: 0(赤5, 2列目) */}
      {renderDigitKey('0', TENKEY_HONOR_HINTS['0'], 'tenkey__key--zero')}
    </div>
  );
}
