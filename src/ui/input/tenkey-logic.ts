import type { AppAction, AppState, SheetMode, TenkeySuit } from '../state';

export type TenkeyKeyCommand =
  | { kind: 'digit'; digit: string }
  | { kind: 'suit'; suit: TenkeySuit }
  | { kind: 'backspace' }
  | { kind: 'enter' };

export const TENKEY_HONOR_HINTS: Readonly<Record<string, string>> =
  Object.freeze({
    '1': '東',
    '2': '南',
    '3': '西',
    '4': '北',
    '5': '白',
    '6': '發',
    '7': '中',
    '0': '赤5'
  });

/**
 * キーボードイベントと入力方式からテンキーのコマンドへ写像する。
 * 修飾キー(Ctrl/Meta/Alt)付きまたはIME変換中ならnull。
 * Backspace/Enterは両方式で有効。
 * 数字・スート(m/p/s/z)はテンキー方式のみ有効。
 */
export const mapTenkeyKey = (
  e: Pick<
    KeyboardEvent,
    'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'isComposing'
  >,
  mode: SheetMode
): TenkeyKeyCommand | null => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) {
    return null;
  }

  if (e.key === 'Backspace') {
    return { kind: 'backspace' };
  }
  if (e.key === 'Enter') {
    return { kind: 'enter' };
  }

  if (mode === 'tenkey') {
    if (/^[0-9]$/.test(e.key)) {
      return { kind: 'digit', digit: e.key };
    }
    const lower = e.key.toLowerCase();
    if (lower === 'm' || lower === 'p' || lower === 's' || lower === 'z') {
      return { kind: 'suit', suit: lower };
    }
  }

  return null;
};

/**
 * キー入力の対象要素を判定する。
 * null、document.body、document.documentElement、または.bottom-sheet内の要素なら真。
 * シート外の要素(ステッパーボタン等)は偽。
 */
export const shouldHandleKeyTarget = (target: EventTarget | null): boolean => {
  if (target === null) return true;
  if (typeof document !== 'undefined') {
    if (target === document.body || target === document.documentElement) {
      return true;
    }
  }
  if (
    typeof (target as { closest?: unknown }).closest === 'function' &&
    (target as Element).closest('.bottom-sheet') !== null
  ) {
    return true;
  }
  return false;
};

export interface TenkeyActionKeys {
  backspace: { disabled: boolean };
  clear: { action: AppAction | null; label: string; disabled: boolean };
}

/**
 * テンキーの「1 文字削除」・ACの対象別の状態(設計書2.3のテンキー表)。
 */
export const tenkeyActionKeysFor = (
  state: Pick<AppState, 'input' | 'tenkeyBuffer' | 'inputFocus'>
): TenkeyActionKeys => {
  const bufferEmpty = state.tenkeyBuffer.length === 0;
  const focus = state.inputFocus;
  if (focus?.type === 'dora' || focus?.type === 'uradora') {
    const target = focus.type;
    const empty = state.input[target].length === 0;
    return {
      backspace: { disabled: bufferEmpty && empty },
      clear: {
        action: { type: 'clear-indicators', target },
        label:
          target === 'dora' ? 'ドラ表示牌をクリア' : '裏ドラ表示牌をクリア',
        disabled: empty && bufferEmpty
      }
    };
  }
  if (focus?.type === 'meld') {
    return {
      backspace: { disabled: bufferEmpty },
      clear: { action: null, label: '副露をクリア', disabled: true }
    };
  }
  return {
    backspace: { disabled: bufferEmpty && state.input.hand.length === 0 },
    clear: {
      action: { type: 'clear-hand' },
      label: '手牌をクリア',
      disabled: false
    }
  };
};
