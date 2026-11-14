export interface HandTapResult {
  selected: number | null;
  remove: number | null;
}

/** 手牌の牌タップ時の選択・削除遷移 */
export const nextHandTap = (
  selected: number | null,
  tapped: number
): HandTapResult => {
  if (selected === tapped) {
    return { selected: null, remove: tapped };
  }
  return { selected: tapped, remove: null };
};

/** ターゲットが手牌の牌ボタン(.hand-card__tiles button.tile)の内側か */
export const isHandTileTarget = (
  target: { closest?(selector: string): unknown } | null
): boolean => target?.closest?.('.hand-card__tiles button.tile') != null;

/** 選択解除のキーか('Escape' のみ真) */
export const isSelectionCancelKey = (key: string): boolean => key === 'Escape';
