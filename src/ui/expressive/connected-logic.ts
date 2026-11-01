export interface ConnectedOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean | undefined;
}

/**
 * キー操作に応じた次のインデックスを計算する純関数
 * - ArrowRight / ArrowDown: 次の有効な項目へ移動（末尾なら先頭へ巡回）
 * - ArrowLeft / ArrowUp: 前の有効な項目へ移動（先頭なら末尾へ巡回）
 * - Home: 最初の有効な項目へ移動
 * - End: 最後の有効な項目へ移動
 * - 無関係なキー: 現在のインデックスを維持
 */
export function nextIndex<T extends object>(
  options: readonly T[],
  current: number,
  key: string
): number {
  const len = options.length;
  if (len === 0) {
    return current;
  }

  const isDisabled = (item: T | undefined): boolean => {
    return Boolean((item as { disabled?: boolean | undefined })?.disabled);
  };

  // 有効な選択肢が存在するか確認
  const hasEnabled = options.some(opt => !isDisabled(opt));
  if (!hasEnabled) {
    return current;
  }

  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown': {
      for (let i = 1; i <= len; i++) {
        const idx = (current + i) % len;
        if (!isDisabled(options[idx])) {
          return idx;
        }
      }
      return current;
    }
    case 'ArrowLeft':
    case 'ArrowUp': {
      for (let i = 1; i <= len; i++) {
        const idx = (current - i + len) % len;
        if (!isDisabled(options[idx])) {
          return idx;
        }
      }
      return current;
    }
    case 'Home': {
      for (let i = 0; i < len; i++) {
        if (!isDisabled(options[i])) {
          return i;
        }
      }
      return current;
    }
    case 'End': {
      for (let i = len - 1; i >= 0; i--) {
        if (!isDisabled(options[i])) {
          return i;
        }
      }
      return current;
    }
    default:
      return current;
  }
}
