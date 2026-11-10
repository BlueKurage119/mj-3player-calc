export type TooltipState = {
  openId: string | null;
  via: 'click' | 'hover' | 'focus' | null;
};

export type TooltipEvent =
  | { type: 'click'; id: string }
  | { type: 'hover-enter'; id: string }
  | { type: 'hover-leave'; id: string }
  | { type: 'focus-visible'; id: string }
  | { type: 'blur'; id: string }
  | { type: 'escape' }
  | { type: 'outside-pointerdown' };

export const INITIAL_TOOLTIP_STATE: TooltipState = {
  openId: null,
  via: null
};

export const reduceTooltip = (
  s: TooltipState,
  e: TooltipEvent
): TooltipState => {
  switch (e.type) {
    case 'click':
      if (s.openId === e.id) {
        return { openId: null, via: null };
      }
      return { openId: e.id, via: 'click' };

    case 'hover-enter':
      return { openId: e.id, via: 'hover' };

    case 'hover-leave':
      if (s.openId === e.id && (s.via === 'hover' || s.via === 'focus')) {
        return { openId: null, via: null };
      }
      return s;

    case 'focus-visible':
      return { openId: e.id, via: 'focus' };

    case 'blur':
      if (s.openId === e.id && (s.via === 'hover' || s.via === 'focus')) {
        return { openId: null, via: null };
      }
      return s;

    case 'escape':
    case 'outside-pointerdown':
      return { openId: null, via: null };
  }
};

/**
 * 吹き出しを表示幅の左右 margin 以内に収めるための水平補正量(px)を返す。
 * 基準は実際に見えている幅(clientWidth)。左端を優先して収める。
 */
export const computeTooltipShiftX = (
  rect: { left: number; right: number },
  viewportWidth: number,
  margin = 16
): number => {
  let shift = 0;
  if (rect.right > viewportWidth - margin) {
    shift = viewportWidth - margin - rect.right;
  }
  if (rect.left + shift < margin) {
    shift = margin - rect.left;
  }
  return shift;
};
