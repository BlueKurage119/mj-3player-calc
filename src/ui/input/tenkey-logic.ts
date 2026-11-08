import type { SheetMode, TenkeySuit } from '../state';

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
